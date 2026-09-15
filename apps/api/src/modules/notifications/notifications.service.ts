import { Inject, Injectable } from "@nestjs/common";

import type { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import type { NotificationKind } from "../../generated/prisma/client";
import { MailService } from "../mail/mail.service";
import type { PatchNotificationDto } from "./dto/notification.dto";
import { NotificationsRepository } from "./notifications.repository";

type NoticeProject = {
  id: string;
  publicId: string;
  name: string;
  teamId: string;
};

type ActivePhaseNotice = {
  subTeamId: string;
  subTeamName: string;
};

type NoticeRow = {
  userId: string;
  projectId: string;
  kind: NotificationKind;
  title: string;
  body: string;
};

const toDto = (item: {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  projectId: string | null;
  readAt: Date | null;
  createdAt: Date;
}) => ({
  id: item.id,
  kind: item.kind,
  title: item.title,
  body: item.body,
  projectId: item.projectId,
  readAt: item.readAt?.toISOString() ?? null,
  createdAt: item.createdAt.toISOString(),
});

@Injectable()
export class NotificationsService {
  public constructor(
    @Inject(NotificationsRepository)
    private readonly notificationsRepository: NotificationsRepository,
    @Inject(MailService)
    private readonly mailService: MailService,
  ) {}

  public async list(currentUser: AuthenticatedUser) {
    const result = await this.notificationsRepository.listForUser(
      currentUser.id,
    );
    return {
      unreadCount: result.unreadCount,
      items: result.items.map(toDto),
    };
  }

  public async markRead(
    currentUser: AuthenticatedUser,
    id: string,
    _body: PatchNotificationDto,
  ) {
    const updated = await this.notificationsRepository.markRead({
      userId: currentUser.id,
      id,
    });
    return toDto(updated);
  }

  public async markAllRead(currentUser: AuthenticatedUser) {
    await this.notificationsRepository.markAllRead(currentUser.id);
  }

  public async notifyWorkWaiting(params: {
    actorId: string;
    project: NoticeProject;
    phases: ActivePhaseNotice[];
    kind: Extract<NotificationKind, "waiting" | "sent_back">;
  }) {
    const memberships = await this.notificationsRepository.listSubTeamUserIds(
      params.phases.map((phase) => phase.subTeamId),
    );
    const phaseBySubTeam = new Map(
      params.phases.map((phase) => [phase.subTeamId, phase]),
    );
    const rows: NoticeRow[] = [];
    const seen = new Set<string>();
    for (const membership of memberships) {
      if (
        membership.userId === params.actorId ||
        seen.has(`${membership.userId}:${membership.subTeamId}`)
      ) {
        continue;
      }
      seen.add(`${membership.userId}:${membership.subTeamId}`);
      const phase = phaseBySubTeam.get(membership.subTeamId);
      if (phase === undefined) {
        continue;
      }
      rows.push({
        userId: membership.userId,
        projectId: params.project.id,
        kind: params.kind,
        title:
          params.kind === "sent_back"
            ? `${params.project.publicId} was sent back`
            : `${params.project.publicId} is waiting`,
        body:
          params.kind === "sent_back"
            ? `${params.project.name} needs ${phase.subTeamName} again.`
            : `${params.project.name} is on ${phase.subTeamName}.`,
      });
    }
    await this.notificationsRepository.createMany(rows);
    await this.emailNotices(rows, params.project.publicId);
  }

  public async notifyProjectClosed(params: {
    actorId: string;
    project: NoticeProject;
  }) {
    const leadIds = await this.notificationsRepository.listTeamLeadIds(
      params.project.teamId,
    );
    const rows: NoticeRow[] = [...new Set(leadIds)]
      .filter((userId) => userId !== params.actorId)
      .map((userId) => ({
        userId,
        projectId: params.project.id,
        kind: "closed" as const,
        title: `${params.project.publicId} closed`,
        body: `${params.project.name} is off the floor.`,
      }));
    await this.notificationsRepository.createMany(rows);
    await this.emailNotices(rows, params.project.publicId);
  }

  private async emailNotices(rows: NoticeRow[], projectPublicId: string) {
    if (rows.length === 0) {
      return;
    }
    const users = await this.notificationsRepository.listUsersByIds([
      ...new Set(rows.map((row) => row.userId)),
    ]);
    const emailById = new Map(users.map((user) => [user.id, user.email]));
    await Promise.all(
      rows.map(async (row) => {
        const email = emailById.get(row.userId);
        if (email === undefined) {
          return;
        }
        await this.mailService.sendWorkNotice(email, {
          kind: row.kind,
          title: row.title,
          body: row.body,
          projectId: row.projectId,
          projectPublicId,
        });
      }),
    );
  }
}
