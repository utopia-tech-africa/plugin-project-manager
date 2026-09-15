"use client";

import { useMemo, useState } from "react";

import { DocketId } from "@/components/docket-id";
import { PageHeader } from "@/components/page-header";
import { Ticket } from "@/components/ticket";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetHistory } from "@/lib/api/generated/client";
import type { HistoryItem, PhaseStatus } from "@/lib/types";

const ALL = "all";

const STATUS_OPTIONS: Array<{ value: typeof ALL | PhaseStatus; label: string }> =
  [
    { value: ALL, label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "returned", label: "Returned" },
  ];

const teamOf = (item: HistoryItem) => item.project.team;

export default function HistoryPage() {
  const query = useGetHistory();
  const items = (query.data as HistoryItem[] | undefined) ?? [];
  const [filterQuery, setFilterQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<typeof ALL | PhaseStatus>(
    ALL,
  );
  const [filterTeamId, setFilterTeamId] = useState(ALL);
  const [filterSubTeamId, setFilterSubTeamId] = useState(ALL);

  const teamOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of items) {
      const team = teamOf(item);
      if (team === undefined) {
        continue;
      }
      byId.set(team.id, team.name);
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [items]);

  const subTeamOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of items) {
      const team = teamOf(item);
      if (filterTeamId !== ALL && team?.id !== filterTeamId) {
        continue;
      }
      byId.set(item.subTeam.id, item.subTeam.name);
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [filterTeamId, items]);

  const filteredItems = useMemo(() => {
    const needle = filterQuery.trim().toLowerCase();
    return items.filter((item) => {
      const team = teamOf(item);
      if (filterStatus !== ALL && item.status !== filterStatus) {
        return false;
      }
      if (filterTeamId !== ALL && team?.id !== filterTeamId) {
        return false;
      }
      if (filterSubTeamId !== ALL && item.subTeam.id !== filterSubTeamId) {
        return false;
      }
      if (needle.length === 0) {
        return true;
      }
      const haystack = [
        item.publicId,
        item.name,
        item.project.name,
        item.project.publicId,
        team?.name ?? "",
        item.subTeam.name,
        item.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [filterQuery, filterStatus, filterSubTeamId, filterTeamId, items]);

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow="Archive" title="History" />
        <p className="text-muted-foreground">Loading history…</p>
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow="Archive" title="History" />
        <Ticket>
          <p className="font-heading text-xl">Could not load history</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try refreshing the page in a moment.
          </p>
        </Ticket>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Archive" title="History" />

      {items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_10rem_12rem_12rem]">
          <Field>
            <FieldLabel htmlFor="history-search">Search</FieldLabel>
            <Input
              id="history-search"
              value={filterQuery}
              placeholder="Project, docket, team, or sub-team"
              onChange={(event) => setFilterQuery(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="history-status">Status</FieldLabel>
            <Select
              value={filterStatus}
              items={Object.fromEntries(
                STATUS_OPTIONS.map((option) => [option.value, option.label]),
              )}
              onValueChange={(value) => {
                if (value === null) {
                  return;
                }
                setFilterStatus(value as typeof ALL | PhaseStatus);
              }}
            >
              <SelectTrigger id="history-status" className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="history-team">Team</FieldLabel>
            <Select
              value={filterTeamId}
              items={{
                [ALL]: "All teams",
                ...Object.fromEntries(
                  teamOptions.map((team) => [team.id, team.name]),
                ),
              }}
              onValueChange={(value) => {
                if (value === null) {
                  return;
                }
                setFilterTeamId(value);
                setFilterSubTeamId(ALL);
              }}
            >
              <SelectTrigger id="history-team" className="w-full">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ALL}>All teams</SelectItem>
                  {teamOptions.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="history-subteam">Sub-team</FieldLabel>
            <Select
              value={filterSubTeamId}
              items={{
                [ALL]: "All sub-teams",
                ...Object.fromEntries(
                  subTeamOptions.map((subTeam) => [subTeam.id, subTeam.name]),
                ),
              }}
              onValueChange={(value) => {
                if (value === null) {
                  return;
                }
                setFilterSubTeamId(value);
              }}
            >
              <SelectTrigger id="history-subteam" className="w-full">
                <SelectValue placeholder="All sub-teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ALL}>All sub-teams</SelectItem>
                  {subTeamOptions.map((subTeam) => (
                    <SelectItem key={subTeam.id} value={subTeam.id}>
                      {subTeam.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : null}

      {items.length === 0 ? (
        <Ticket>
          <p className="font-heading text-xl">No work recorded yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Phases your sub-team has touched will show up here.
          </p>
        </Ticket>
      ) : filteredItems.length === 0 ? (
        <Ticket>
          <p className="font-heading text-xl">No matching history</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different search, status, team, or sub-team.
          </p>
        </Ticket>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {filteredItems.map((item) => {
            const team = teamOf(item);
            const fileCount =
              "documentCount" in item && typeof item.documentCount === "number"
                ? item.documentCount
                : 0;
            return (
              <li key={item.id}>
                <Ticket
                  href={`/work/${item.project.id}`}
                  tone={
                    item.status === "returned"
                      ? "returned"
                      : item.status === "active"
                        ? "live"
                        : "default"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <DocketId value={item.publicId} />
                    <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">
                      {item.status}
                    </p>
                  </div>
                  <p className="font-heading mt-3 text-xl tracking-tight">
                    {item.project.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {team !== undefined ? `${team.name} · ` : null}
                    {item.subTeam.name} · {fileCount} file
                    {fileCount === 1 ? "" : "s"}
                  </p>
                </Ticket>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
