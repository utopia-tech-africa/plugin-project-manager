"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DashboardStats } from "@/lib/types";
import { cn } from "@/lib/utils";

const mixConfig = {
  count: { label: "Phases" },
  active: { label: "Waiting", color: "var(--cobalt)" },
  pending: { label: "Queued", color: "var(--floor-line)" },
  returned: { label: "Sent back", color: "var(--oxide)" },
  completed: { label: "Handed off", color: "var(--waiting)" },
} satisfies ChartConfig;

const handoffConfig = {
  count: { label: "Handoffs", color: "var(--cobalt)" },
} satisfies ChartConfig;

const pipelineConfig = {
  projectCount: { label: "Jobs", color: "var(--cobalt)" },
} satisfies ChartConfig;

const loadConfig = {
  activeCount: { label: "Waiting", color: "var(--oxide)" },
} satisfies ChartConfig;

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduced;
};

const ChartEmpty = ({ message }: { message: string }) => (
  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
    {message}
  </div>
);

export const OverviewKpis = ({ stats }: { stats: DashboardStats }) => {
  const items = [
    {
      value: stats.waitingOnYou,
      label: "Waiting",
      hint: "Active phases on your plate",
      tone: "bg-cobalt",
    },
    {
      value: stats.activeProjects,
      label: "Live jobs",
      hint: "Projects still open",
      tone: "bg-ink",
    },
    {
      value: stats.returnedPhases,
      label: "Sent back",
      hint: "Returned for another pass",
      tone: "bg-oxide",
    },
    {
      value: stats.completedThisWeek,
      label: "Closed this week",
      hint: "Jobs finished in the last 7 days",
      tone: "bg-waiting",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="gap-3 py-4">
          <CardHeader className="gap-3">
            <span className={cn("h-1.5 w-8 rounded-full", item.tone)} />
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="font-heading text-4xl tracking-tight tabular-nums">
              {item.value}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            {item.hint}
          </CardContent>
        </Card>
      ))}
    </section>
  );
};

const PHASE_META: Record<string, { label: string; color: string }> = {
  active: { label: "Waiting", color: "var(--cobalt)" },
  pending: { label: "Queued", color: "var(--floor-line)" },
  returned: { label: "Sent back", color: "var(--oxide)" },
  completed: { label: "Handed off", color: "var(--waiting)" },
};

export const PhaseMixChart = ({ stats }: { stats: DashboardStats }) => {
  const reducedMotion = usePrefersReducedMotion();
  const data = stats.phaseMix
    .filter((item) => item.count > 0)
    .map((item) => ({
      ...item,
      fill: `var(--color-${item.status})`,
    }));
  const total = stats.phaseMix.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>On the board</CardTitle>
        <CardDescription>Current phase mix across live work</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <ChartEmpty message="No phases to chart yet." />
        ) : (
          <ChartContainer
            config={mixConfig}
            className="mx-auto aspect-square max-h-[260px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey="status" />}
              />
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                innerRadius={68}
                strokeWidth={4}
                isAnimationActive={!reducedMotion}
              >
                {data.map((item) => (
                  <Cell key={item.status} fill={item.fill} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (
                      viewBox === undefined ||
                      !("cx" in viewBox) ||
                      !("cy" in viewBox)
                    ) {
                      return null;
                    }
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground font-heading text-3xl"
                        >
                          {stats.waitingOnYou}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 22}
                          className="fill-muted-foreground text-xs"
                        >
                          waiting
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
        <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {stats.phaseMix.map((item) => (
            <li
              key={item.status}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-[2px]"
                  style={{
                    background:
                      PHASE_META[item.status]?.color ?? "var(--floor-line)",
                  }}
                />
                {PHASE_META[item.status]?.label ?? item.status}
              </span>
              <span className="font-mono tabular-nums">{item.count}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export const HandoffsWeekChart = ({ stats }: { stats: DashboardStats }) => {
  const reducedMotion = usePrefersReducedMotion();
  const total = stats.handoffsByDay.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Handoffs this week</CardTitle>
        <CardDescription>
          Files moved on, last 7 days · {total} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stats.handoffsByDay.length === 0 ? (
          <ChartEmpty message="No handoff history yet." />
        ) : (
          <ChartContainer config={handoffConfig} className="h-[260px] w-full">
            <AreaChart
              accessibilityLayer
              data={stats.handoffsByDay}
              margin={{ left: 8, right: 8, top: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Area
                dataKey="count"
                type="monotone"
                fill="var(--color-count)"
                fillOpacity={0.28}
                stroke="var(--color-count)"
                strokeWidth={2}
                isAnimationActive={!reducedMotion}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export const PipelineChart = ({ stats }: { stats: DashboardStats }) => {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Jobs by step</CardTitle>
        <CardDescription>
          Where live projects sit in the pipeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stats.pipeline.length === 0 ? (
          <ChartEmpty message="No live pipeline to chart." />
        ) : (
          <ChartContainer config={pipelineConfig} className="h-[240px] w-full">
            <BarChart
              accessibilityLayer
              data={stats.pipeline}
              margin={{ left: 4, right: 8, top: 8 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="projectCount"
                fill="var(--color-projectCount)"
                radius={6}
                isAnimationActive={!reducedMotion}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export const SubTeamLoadChart = ({ stats }: { stats: DashboardStats }) => {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Waiting by sub-team</CardTitle>
        <CardDescription>Active phases sitting with each desk</CardDescription>
      </CardHeader>
      <CardContent>
        {stats.bySubTeam.length === 0 ? (
          <ChartEmpty message="No sub-team load yet." />
        ) : (
          <ChartContainer config={loadConfig} className="h-[240px] w-full">
            <BarChart
              accessibilityLayer
              data={stats.bySubTeam}
              layout="vertical"
              margin={{ left: 8, right: 12, top: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                width={92}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Bar
                dataKey="activeCount"
                fill="var(--color-activeCount)"
                radius={5}
                isAnimationActive={!reducedMotion}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};
