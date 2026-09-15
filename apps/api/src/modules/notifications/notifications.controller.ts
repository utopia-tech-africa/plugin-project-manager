import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  NotificationDto,
  NotificationListDto,
  PatchNotificationDto,
} from "./dto/notification.dto";
import { NotificationsService } from "./notifications.service";

@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("bearer")
@ApiTags("Notifications")
@ApiExtraModels(NotificationDto, NotificationListDto, PatchNotificationDto)
export class NotificationsController {
  public constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get("notifications")
  @ApiOperation({
    summary: "List notices",
    description:
      "Returns the signed-in person's recent notices and how many are still unread. Waiting work, send-backs, and closed jobs appear here.",
  })
  @ApiOkResponse({
    description: "Notices for the signed-in person.",
    type: NotificationListDto,
  })
  public getNotifications(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.notificationsService.list(currentUser);
  }

  @Post("notifications/read")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Mark all notices read",
    description: "Marks every unread notice for the signed-in person as read.",
  })
  @ApiNoContentResponse({ description: "All notices marked read." })
  public async postNotificationsRead(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<void> {
    await this.notificationsService.markAllRead(currentUser);
  }

  @Patch("notifications/:id")
  @ApiParam({ name: "id", description: "Notice id" })
  @ApiBody({ type: PatchNotificationDto })
  @ApiOperation({
    summary: "Mark a notice read",
    description: "Marks one notice as read for the signed-in person.",
  })
  @ApiOkResponse({
    description: "Notice updated.",
    type: NotificationDto,
  })
  public patchNotifications(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: PatchNotificationDto,
  ) {
    return this.notificationsService.markRead(currentUser, id, body);
  }
}
