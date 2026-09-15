"use client";

import Link from "next/link";

import { DocketId } from "@/components/docket-id";
import {
  HandoffsWeekChart,
  OverviewKpis,
  PhaseMixChart,
  PipelineChart,
  SubTeamLoadChart,
} from "@/components/floor-charts";
import { PageHeader } from "@/components/page-header";
import { Ticket } from "@/components/ticket";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGetStats } from "@/lib/api/generated/client";
import { formatDaysOnFloor, formatHandoffTime } from "@/lib/format";
import type { DashboardStats } from "@/lib/types";

export default function DashboardPage() {
  const query = useGetStats();
  const stats = query.data as DashboardStats | undefined;

  if (query.isLoading) {
    return <p className="text-muted-foreground">Reading the floor…</p>;
  }

  if (stats === undefined) {
    return (
      <p className="text-muted-foreground">
        Could not load the floor. Try again in a moment.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Live board" title="What’s on the floor">
        <Link
          href="/work"
          className="text-sm text-cobalt underline-offset-4 hover:underline"
        >
          Open work
        </Link>
      </PageHeader>

      <OverviewKpis stats={stats} />

      <section className="grid gap-4 xl:grid-cols-2">
        <PhaseMixChart stats={stats} />
        <HandoffsWeekChart stats={stats} />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <PipelineChart stats={stats} />
        <SubTeamLoadChart stats={stats} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-2xl tracking-tight">Waiting now</h2>
          {stats.waiting.length === 0 ? (
            <Ticket>
              <p className="font-heading text-xl">Nothing on the floor</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A team lead can open a project from Work.
              </p>
            </Ticket>
          ) : (
            <div className="flex flex-col gap-3">
              {stats.waiting.map((item) => (
                <Ticket
                  key={item.phasePublicId}
                  href={`/work/${item.projectId}`}
                  tone={item.daysWaiting >= 3 ? "waiting" : "live"}
                >
                  <div className="flex items-start justify-between gap-3">
                    <DocketId value={item.projectPublicId} />
                    <p className="font-mono text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">
                      {formatDaysOnFloor(item.daysWaiting)}
                    </p>
                  </div>
                  <p className="font-heading mt-3 text-xl tracking-tight">
                    {item.projectName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.phaseName} · {item.subTeamName}
                  </p>
                </Ticket>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {stats.oldestJob !== null ? (
            <Ticket
              href={`/work/${stats.oldestJob.projectId}`}
              tone={stats.oldestJob.daysWaiting >= 2 ? "returned" : "waiting"}
            >
              <p className="counter-label text-oxide">Longest wait</p>
              <p className="font-heading mt-2 text-2xl tracking-tight">
                {stats.oldestJob.name}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats.oldestJob.phaseName} · {stats.oldestJob.subTeamName} ·{" "}
                {formatDaysOnFloor(stats.oldestJob.daysWaiting)}
              </p>
              <div className="mt-3">
                <DocketId value={stats.oldestJob.publicId} />
              </div>
            </Ticket>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recent handoffs</CardTitle>
              <CardDescription>
                {stats.filesUploaded} files on record ·{" "}
                {stats.completedProjects} closed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentHandoffs.length === 0 ? (
                <p className="text-muted-foreground">
                  No files have moved yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {stats.recentHandoffs.map((item) => (
                    <li key={`${item.phasePublicId}-${item.completedAt}`}>
                      <Link
                        href={`/work/${item.projectId}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate">{item.projectName}</p>
                          <p className="text-muted-foreground truncate">
                            {item.phaseName} · {item.subTeamName}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-xs text-muted-foreground">
                          {formatHandoffTime(item.completedAt)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
