import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class NotificationDto {
  @ApiProperty({ type: String })
  public id!: string;

  @ApiProperty({
    type: String,
    enum: ["waiting", "sent_back", "closed"],
    description: "Why this notice was created.",
  })
  public kind!: "waiting" | "sent_back" | "closed";

  @ApiProperty({ type: String })
  public title!: string;

  @ApiProperty({ type: String })
  public body!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  public projectId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  public readAt!: string | null;

  @ApiProperty({ type: String })
  public createdAt!: string;
}

export class NotificationListDto {
  @ApiProperty({ type: Number })
  public unreadCount!: number;

  @ApiProperty({ type: [NotificationDto] })
  public items!: NotificationDto[];
}

export class PatchNotificationDto {
  @ApiProperty({
    type: Boolean,
    description: "Set true to mark the notice as read.",
  })
  @IsBoolean()
  public read!: boolean;
}
