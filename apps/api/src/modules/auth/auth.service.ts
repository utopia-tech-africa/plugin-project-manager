import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import type { EnvironmentVariables } from "../../config/environment";
import { MailService } from "../mail/mail.service";
import {
  AuthRepository,
  hashInviteToken,
  type UserWithMemberships,
} from "./auth.repository";
import type { AcceptInviteDto } from "./dto/accept-invite.dto";
import type { RefreshTokenDto } from "./dto/refresh-token.dto";
import type { SignInDto } from "./dto/sign-in.dto";
import type { SignOutDto } from "./dto/sign-out.dto";

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type AuthResponse = TokenPair & {
  user: AuthenticatedUser;
};

@Injectable()
export class AuthService {
  public constructor(
    @Inject(AuthRepository)
    private readonly authRepository: AuthRepository,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService<EnvironmentVariables, true>,
    @Inject(MailService)
    private readonly mailService: MailService,
  ) {}

  public async signIn(
    body: SignInDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponse> {
    const user = await this.authRepository.findUserByEmail(body.email);
    if (user === null || !user.isActive) {
      throw new UnauthorizedException("Email or password is incorrect.");
    }

    const passwordOk = await argon2.verify(user.passwordHash, body.password);
    if (!passwordOk) {
      throw new UnauthorizedException("Email or password is incorrect.");
    }

    return this.issueSession(user, userAgent, ipAddress);
  }

  public async refresh(body: RefreshTokenDto): Promise<TokenPair> {
    const parsed = this.parseRefreshToken(body.refreshToken);
    const session = await this.authRepository.findSessionById(parsed.sessionId);
    if (
      session === null ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException("Session is no longer valid.");
    }

    const expected = Buffer.from(session.refreshTokenHash, "hex");
    const received = Buffer.from(this.hashRefreshSecret(parsed.secret), "hex");
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException("Session is no longer valid.");
    }

    const user = await this.authRepository.findUserById(session.userId);
    if (user === null || !user.isActive) {
      throw new UnauthorizedException("Session is no longer valid.");
    }

    const accessTtl = this.configService.get("JWT_ACCESS_TTL_SECONDS", {
      infer: true,
    });
    return {
      accessToken: await this.signAccessToken(user, session.id),
      refreshToken: body.refreshToken,
      expiresIn: accessTtl,
    };
  }

  public async signOut(body: SignOutDto): Promise<void> {
    const parsed = this.parseRefreshToken(body.refreshToken);
    const session = await this.authRepository.findSessionById(parsed.sessionId);
    if (session !== null && session.revokedAt === null) {
      await this.authRepository.revokeSession(session.id);
    }
  }

  public async acceptInvite(
    body: AcceptInviteDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponse> {
    const invite = await this.authRepository.findInviteByTokenHash(
      hashInviteToken(body.token),
    );
    if (
      invite === null ||
      invite.acceptedAt !== null ||
      invite.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException("This invite is invalid or has expired.");
    }

    const passwordHash = await argon2.hash(body.password);
    const fullName = body.fullName.trim();
    const user = await this.authRepository.acceptInvite({
      inviteId: invite.id,
      email: invite.email,
      fullName,
      passwordHash,
      orgRole: "member",
      teamId: invite.teamId,
      teamRole: invite.teamRole,
      subTeamId: invite.subTeamId,
    });

    const roleLabel = invite.teamRole === "lead" ? "team lead" : "member";
    void this.mailService.sendWelcome(invite.email, {
      fullName,
      teamName: invite.team.name,
      roleLabel,
      ...(invite.subTeam !== null ? { subTeamName: invite.subTeam.name } : {}),
    });
    void this.mailService.sendInviteAccepted(invite.invitedBy.email, {
      inviterName: invite.invitedBy.fullName,
      memberName: fullName,
      memberEmail: invite.email,
      teamName: invite.team.name,
    });

    return this.issueSession(user, userAgent, ipAddress);
  }

  public async validateJwtUser(payload: {
    sub: string;
    sessionId: string;
  }): Promise<AuthenticatedUser> {
    const user = await this.authRepository.findUserById(payload.sub);
    if (user === null || !user.isActive) {
      throw new UnauthorizedException("Session is no longer valid.");
    }

    const session = await this.authRepository.findSessionById(
      payload.sessionId,
    );
    if (session === null || session.revokedAt !== null) {
      throw new UnauthorizedException("Session is no longer valid.");
    }

    return this.toAuthenticatedUser(user, payload.sessionId);
  }

  public toAuthenticatedUser(
    user: UserWithMemberships,
    sessionId: string,
  ): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      orgRole: user.orgRole,
      sessionId,
      teamRoles: user.teamMemberships.map((membership) => ({
        teamId: membership.teamId,
        role: membership.role,
        subTeamIds: membership.team.subTeams
          .filter((subTeam) =>
            subTeam.memberships.some((item) => item.userId === user.id),
          )
          .map((subTeam) => subTeam.id),
      })),
    };
  }

  private async issueSession(
    user: UserWithMemberships,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResponse> {
    const refreshTtlDays = this.configService.get("JWT_REFRESH_TTL_DAYS", {
      infer: true,
    });
    const secret = randomBytes(32).toString("hex");
    const session = await this.authRepository.createSession({
      userId: user.id,
      refreshTokenHash: this.hashRefreshSecret(secret),
      expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
      userAgent,
      ipAddress,
    });

    const accessTtl = this.configService.get("JWT_ACCESS_TTL_SECONDS", {
      infer: true,
    });
    const authenticated = this.toAuthenticatedUser(user, session.id);

    return {
      user: authenticated,
      accessToken: await this.signAccessToken(user, session.id),
      refreshToken: `${session.id}.${secret}`,
      expiresIn: accessTtl,
    };
  }

  private async signAccessToken(
    user: UserWithMemberships,
    sessionId: string,
  ): Promise<string> {
    const accessTtl = this.configService.get("JWT_ACCESS_TTL_SECONDS", {
      infer: true,
    });
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        orgRole: user.orgRole,
        sessionId,
      },
      {
        secret: this.configService.get("JWT_ACCESS_SECRET", { infer: true }),
        expiresIn: accessTtl,
      },
    );
  }

  private parseRefreshToken(token: string): {
    sessionId: string;
    secret: string;
  } {
    const [sessionId, secret] = token.split(".");
    if (sessionId === undefined || secret === undefined) {
      throw new UnauthorizedException("Session is no longer valid.");
    }
    return { sessionId, secret };
  }

  private hashRefreshSecret(secret: string): string {
    return createHash("sha256").update(secret).digest("hex");
  }
}
