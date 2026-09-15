import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class SignOutDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(20)
  public refreshToken!: string;
}
