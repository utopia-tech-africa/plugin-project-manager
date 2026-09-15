import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";

export class CreateInviteDto {
  @ApiProperty({ type: String, example: "ama@plugin.local" })
  @IsEmail()
  public email!: string;

  @ApiProperty({ type: String })
  @IsString()
  public teamId!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  public subTeamId?: string;

  @ApiPropertyOptional({
    type: String,
    enum: ["lead", "member"],
    default: "member",
  })
  @IsOptional()
  @IsIn(["lead", "member"])
  public teamRole?: "lead" | "member";
}
