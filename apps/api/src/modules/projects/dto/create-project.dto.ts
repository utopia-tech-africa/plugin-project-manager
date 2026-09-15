import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class CreateProjectDto {
  @ApiProperty({ type: String })
  @IsString()
  public teamId!: string;

  @ApiProperty({ type: String, example: "Nestle Q4 activation" })
  @IsString()
  @MinLength(2)
  public name!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  public description?: string;
}
