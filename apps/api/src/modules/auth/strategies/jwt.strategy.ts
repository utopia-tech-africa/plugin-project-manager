import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AuthenticatedUser } from "../../../common/types/authenticated-user.type";
import type { EnvironmentVariables } from "../../../config/environment";
import { AuthService } from "../auth.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  public constructor(
    @Inject(ConfigService)
    configService: ConfigService<EnvironmentVariables, true>,
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_ACCESS_SECRET", { infer: true }),
    });
  }

  public async validate(payload: {
    sub: string;
    sessionId: string;
  }): Promise<AuthenticatedUser> {
    return this.authService.validateJwtUser(payload);
  }
}
