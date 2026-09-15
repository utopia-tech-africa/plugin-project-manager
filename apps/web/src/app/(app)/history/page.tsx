"use client";

import { useMemo, useState } from "react";

import { DocketId } from "@/components/docket-id";
import { PageHeader } from "@/components/page-header";
import { Ticket } from "@/components/ticket";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useGetHistory } from "@/lib/api/generated/client";
import type { HistoryItem, PhaseStatus } from "@/lib/types";

const ALL = "all";

type HistoryRow = {
  id: string;
  publicId: string;
  name: string;
  status: PhaseStatus;
  documentCount: number;
  subTeam: { id: string; name: string };
  project: {
    id: string;
    publicId: string;
    name: string;
    team?: { id: string; name: string };
  };
};

const STATUS_OPTIONS: Array<{ value: typeof ALL | PhaseStatus; label: string }> =
  [
    { value: ALL, label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "returned", label: "Returned" },
  ];

const normalizeHistory = (data: unknown): HistoryRow[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  const rows: HistoryRow[] = [];
  for (const entry of data) {
    if (entry === null || typeof entry !== "object") {
      continue;
    }
    const item = entry as Record<string, unknown>;
    const project = item["project"];
    const subTeam = item["subTeam"];
    if (
      typeof item["id"] !== "string" ||
      typeof item["publicId"] !== "string" ||
      typeof item["name"] !== "string" ||
      typeof item["status"] !== "string" ||
      project === null ||
      typeof project !== "object" ||
      subTeam === null ||
      typeof subTeam !== "object"
    ) {
      continue;
    }

    const projectRecord = project as Record<string, unknown>;
    const subTeamRecord = subTeam as Record<string, unknown>;
    if (
      typeof projectRecord["id"] !== "string" ||
      typeof projectRecord["publicId"] !== "string" ||
      typeof projectRecord["name"] !== "string" ||
      typeof subTeamRecord["id"] !== "string" ||
      typeof subTeamRecord["name"] !== "string"
    ) {
      continue;
    }

    const teamValue = projectRecord["team"];
    let team: { id: string; name: string } | undefined;
    if (teamValue !== null && typeof teamValue === "object") {
      const teamRecord = teamValue as Record<string, unknown>;
      if (
        typeof teamRecord["id"] === "string" &&
        typeof teamRecord["name"] === "string"
      ) {
        team = { id: teamRecord["id"], name: teamRecord["name"] };
      }
    }

    let documentCount = 0;
    if (typeof item["documentCount"] === "number") {
      documentCount = item["documentCount"];
    } else if (Array.isArray(item["documents"])) {
      documentCount = item["documents"].length;
    }

    rows.push({
      id: item["id"],
      publicId: item["publicId"],
      name: item["name"],
      status: item["status"] as PhaseStatus,
      documentCount,
      subTeam: {
        id: subTeamRecord["id"],
        name: subTeamRecord["name"],
      },
      project: {
        id: projectRecord["id"],
        publicId: projectRecord["publicId"],
        name: projectRecord["name"],
        team,
      },
    });
  }
  return rows;
};

export default function HistoryPage() {
  const query = useGetHistory();
  const items = useMemo(
    () => normalizeHistory(query.data as HistoryItem[] | undefined),
    [query.data],
  );
  const [filterQuery, setFilterQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<typeof ALL | PhaseStatus>(
    ALL,
  );
  const [filterTeamId, setFilterTeamId] = useState(ALL);
  const [filterSubTeamId, setFilterSubTeamId] = useState(ALL);

  const teamOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of items) {
      if (item.project.team === undefined) {
        continue;
      }
      byId.set(item.project.team.id, item.project.team.name);
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [items]);

  const subTeamOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const item of items) {
      if (
        filterTeamId !== ALL &&
        item.project.team?.id !== filterTeamId
      ) {
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
      if (filterStatus !== ALL && item.status !== filterStatus) {
        return false;
      }
      if (
        filterTeamId !== ALL &&
        item.project.team?.id !== filterTeamId
      ) {
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
        item.project.team?.name ?? "",
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
            <select
              id="history-status"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              value={filterStatus}
              onChange={(event) =>
                setFilterStatus(event.target.value as typeof ALL | PhaseStatus)
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="history-team">Team</FieldLabel>
            <select
              id="history-team"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              value={filterTeamId}
              onChange={(event) => {
                setFilterTeamId(event.target.value);
                setFilterSubTeamId(ALL);
              }}
            >
              <option value={ALL}>All teams</option>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="history-subteam">Sub-team</FieldLabel>
            <select
              id="history-subteam"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
              value={filterSubTeamId}
              onChange={(event) => setFilterSubTeamId(event.target.value)}
            >
              <option value={ALL}>All sub-teams</option>
              {subTeamOptions.map((subTeam) => (
                <option key={subTeam.id} value={subTeam.id}>
                  {subTeam.name}
                </option>
              ))}
            </select>
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
          {filteredItems.map((item) => (
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
                  {item.project.team !== undefined
                    ? `${item.project.team.name} · `
                    : ""}
                  {item.subTeam.name} · {item.documentCount} file
                  {item.documentCount === 1 ? "" : "s"}
                </p>
              </Ticket>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
