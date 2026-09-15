import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

export class PhaseItemDto {
  @ApiProperty({ type: String, example: "Design" })
  @IsString()
  @MinLength(2)
  public name!: string;

  @ApiPropertyOptional({
    type: String,
    example: "design",
    description: "Generated from the phase name if omitted.",
  })
  @IsOptional()
  @IsString()
  public slug?: string;

  @ApiProperty({
    type: Number,
    example: 1,
    description:
      "Phases that share a step run in parallel. The next step starts when every phase on this step is done.",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public step!: number;

  @ApiProperty({ type: String })
  @IsString()
  public subTeamId!: string;
}

export class ReplacePhasesDto {
  @ApiProperty({ type: [PhaseItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PhaseItemDto)
  public phases!: PhaseItemDto[];
}
