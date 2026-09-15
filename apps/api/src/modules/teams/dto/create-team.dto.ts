import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateTeamDto {
  @ApiProperty({ type: String, example: "Production" })
  @IsString()
  @MinLength(2)
  public name!: string;

  @ApiPropertyOptional({ type: String, example: "production" })
  @IsOptional()
  @IsString()
  public slug?: string;
}
