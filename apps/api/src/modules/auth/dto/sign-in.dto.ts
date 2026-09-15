import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class SignInDto {
  @ApiProperty({ type: String, example: "admin@plugin.local" })
  @IsEmail()
  public email!: string;

  @ApiProperty({ type: String, example: "plugin-admin-change-me" })
  @IsString()
  @MinLength(8)
  public password!: string;
}
