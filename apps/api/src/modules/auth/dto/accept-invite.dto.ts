import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class AcceptInviteDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(20)
  public token!: string;

  @ApiProperty({ type: String, example: "Ama Mensah" })
  @IsString()
  @MinLength(2)
  public fullName!: string;

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(8)
  public password!: string;
}
