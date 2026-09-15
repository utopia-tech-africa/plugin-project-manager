import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type { NotificationKind } from "../../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsRepository {
  public constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  public async listForUser(userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      this.prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);
    return { items, unreadCount };
  }

  public async markRead(params: { userId: string; id: string }) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: params.id, userId: params.userId },
    });
    if (existing === null) {
      throw new NotFoundException("Notice was not found.");
    }
    if (existing.readAt !== null) {
      return existing;
    }
    return this.prisma.notification.update({
      where: { id: existing.id },
      data: { readAt: new Date() },
    });
  }

  public async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  public async createMany(
    rows: Array<{
      userId: string;
      projectId: string;
      kind: NotificationKind;
      title: string;
      body: string;
    }>,
  ) {
    if (rows.length === 0) {
      return;
    }
    await this.prisma.notification.createMany({ data: rows });
  }

  public async listSubTeamUserIds(subTeamIds: string[]) {
    if (subTeamIds.length === 0) {
      return [];
    }
    const memberships = await this.prisma.subTeamMembership.findMany({
      where: { subTeamId: { in: subTeamIds } },
      select: { userId: true, subTeamId: true },
    });
    return memberships;
  }

  public async listTeamLeadIds(teamId: string) {
    const memberships = await this.prisma.teamMembership.findMany({
      where: { teamId, role: "lead" },
      select: { userId: true },
    });
    return memberships.map((item) => item.userId);
  }

  public async listUsersByIds(userIds: string[]) {
    if (userIds.length === 0) {
      return [];
    }
    return this.prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true, email: true, fullName: true },
    });
  }
}
