import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateSubTeamDto {
  @ApiProperty({ type: String, example: "Design" })
  @IsString()
  @MinLength(2)
  public name!: string;

  @ApiPropertyOptional({ type: String, example: "design" })
  @IsOptional()
  @IsString()
  public slug?: string;
}
