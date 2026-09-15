import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { AuthService } from "./auth.service";
import { AcceptInviteDto } from "./dto/accept-invite.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { SignOutDto } from "./dto/sign-out.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
@ApiTags("Auth")
export class AuthController {
  public constructor(
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Post("sign-in")
  @ApiBody({ type: SignInDto })
  @ApiOperation({
    summary: "Sign in with email and password",
    description:
      "Authenticates a Plugin user and returns a token pair plus their team memberships.",
  })
  @ApiOkResponse({ description: "Sign-in successful." })
  @ApiUnauthorizedResponse({ description: "Email or password is incorrect." })
  @ApiBadRequestResponse({ description: "Validation failed." })
  public postAuthSignIn(
    @Body() body: SignInDto,
    @Req() request: {
      headers: Record<string, string | string[] | undefined>;
      ip?: string;
    },
  ) {
    const userAgent =
      typeof request.headers["user-agent"] === "string"
        ? request.headers["user-agent"]
        : undefined;
    return this.authService.signIn(body, userAgent, request.ip);
  }

  @Post("refresh")
  @ApiBody({ type: RefreshTokenDto })
  @ApiOperation({
    summary: "Refresh access token",
    description: "Issues a new access token from a valid refresh token.",
  })
  @ApiOkResponse({ description: "Token refresh successful." })
  @ApiUnauthorizedResponse({ description: "Refresh token is invalid." })
  public postAuthRefresh(@Body() body: RefreshTokenDto) {
    return this.authService.refresh(body);
  }

  @Post("sign-out")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBody({ type: SignOutDto })
  @ApiOperation({
    summary: "Sign out",
    description: "Revokes the refresh token session.",
  })
  public async postAuthSignOut(@Body() body: SignOutDto): Promise<void> {
    await this.authService.signOut(body);
  }

  @Post("accept-invite")
  @ApiBody({ type: AcceptInviteDto })
  @ApiOperation({
    summary: "Accept a team invite",
    description:
      "Creates or updates the invited user, joins them to the team, and signs them in.",
  })
  @ApiOkResponse({ description: "Invite accepted." })
  @ApiUnauthorizedResponse({ description: "Invite is invalid or expired." })
  public postAuthAcceptInvite(
    @Body() body: AcceptInviteDto,
    @Req() request: {
      headers: Record<string, string | string[] | undefined>;
      ip?: string;
    },
  ) {
    const userAgent =
      typeof request.headers["user-agent"] === "string"
        ? request.headers["user-agent"]
        : undefined;
    return this.authService.acceptInvite(body, userAgent, request.ip);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("bearer")
  @ApiOperation({
    summary: "Get the signed-in user",
    description: "Returns the current user, org role, and team memberships.",
  })
  @ApiOkResponse({ description: "Current user." })
  public getAuthMe(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): AuthenticatedUser {
    return currentUser;
  }
}
