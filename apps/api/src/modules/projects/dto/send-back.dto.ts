import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class SendBackDto {
  @ApiProperty({ type: String, description: "Project phase id to reopen." })
  @IsString()
  public targetPhaseId!: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MinLength(2)
  public reason?: string;
}
