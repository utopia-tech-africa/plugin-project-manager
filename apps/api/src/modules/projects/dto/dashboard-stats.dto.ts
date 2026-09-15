import { ApiProperty } from "@nestjs/swagger";

export class DashboardWaitingItemDto {
  @ApiProperty({ type: String })
  public projectId!: string;

  @ApiProperty({ type: String })
  public projectPublicId!: string;

  @ApiProperty({ type: String })
  public projectName!: string;

  @ApiProperty({ type: String })
  public phasePublicId!: string;

  @ApiProperty({ type: String })
  public phaseName!: string;

  @ApiProperty({ type: String })
  public subTeamName!: string;

  @ApiProperty({ type: String })
  public teamName!: string;

  @ApiProperty({ type: Number })
  public daysWaiting!: number;
}

export class DashboardSubTeamLoadDto {
  @ApiProperty({ type: String })
  public subTeamId!: string;

  @ApiProperty({ type: String })
  public name!: string;

  @ApiProperty({ type: String })
  public teamName!: string;

  @ApiProperty({ type: Number })
  public activeCount!: number;
}

export class DashboardPipelineStepDto {
  @ApiProperty({ type: Number })
  public step!: number;

  @ApiProperty({ type: String })
  public label!: string;

  @ApiProperty({ type: Number })
  public projectCount!: number;
}

export class DashboardHandoffDto {
  @ApiProperty({ type: String })
  public projectId!: string;

  @ApiProperty({ type: String })
  public projectPublicId!: string;

  @ApiProperty({ type: String })
  public projectName!: string;

  @ApiProperty({ type: String })
  public phasePublicId!: string;

  @ApiProperty({ type: String })
  public phaseName!: string;

  @ApiProperty({ type: String })
  public subTeamName!: string;

  @ApiProperty({ type: String })
  public completedAt!: string;
}

export class DashboardPhaseMixDto {
  @ApiProperty({ type: String, example: "active" })
  public status!: string;

  @ApiProperty({ type: Number })
  public count!: number;
}

export class DashboardDayCountDto {
  @ApiProperty({ type: String, example: "2026-09-10" })
  public day!: string;

  @ApiProperty({ type: String, example: "Wed" })
  public label!: string;

  @ApiProperty({ type: Number })
  public count!: number;
}

export class DashboardOldestJobDto {
  @ApiProperty({ type: String })
  public projectId!: string;

  @ApiProperty({ type: String })
  public publicId!: string;

  @ApiProperty({ type: String })
  public name!: string;

  @ApiProperty({ type: String })
  public phaseName!: string;

  @ApiProperty({ type: String })
  public subTeamName!: string;

  @ApiProperty({ type: Number })
  public daysWaiting!: number;
}

export class DashboardStatsDto {
  @ApiProperty({ type: Number })
  public activeProjects!: number;

  @ApiProperty({ type: Number })
  public completedProjects!: number;

  @ApiProperty({ type: Number })
  public completedThisWeek!: number;

  @ApiProperty({ type: Number })
  public waitingOnYou!: number;

  @ApiProperty({ type: Number })
  public returnedPhases!: number;

  @ApiProperty({ type: Number })
  public filesUploaded!: number;

  @ApiProperty({ type: DashboardOldestJobDto, nullable: true })
  public oldestJob!: DashboardOldestJobDto | null;

  @ApiProperty({ type: [DashboardWaitingItemDto] })
  public waiting!: DashboardWaitingItemDto[];

  @ApiProperty({ type: [DashboardSubTeamLoadDto] })
  public bySubTeam!: DashboardSubTeamLoadDto[];

  @ApiProperty({ type: [DashboardPipelineStepDto] })
  public pipeline!: DashboardPipelineStepDto[];

  @ApiProperty({ type: [DashboardHandoffDto] })
  public recentHandoffs!: DashboardHandoffDto[];

  @ApiProperty({ type: [DashboardPhaseMixDto] })
  public phaseMix!: DashboardPhaseMixDto[];

  @ApiProperty({ type: [DashboardDayCountDto] })
  public handoffsByDay!: DashboardDayCountDto[];
}
