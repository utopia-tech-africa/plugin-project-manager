"use client";

import { DocketId } from "@/components/docket-id";
import { PageHeader } from "@/components/page-header";
import { Ticket } from "@/components/ticket";
import { useGetHistory } from "@/lib/api/generated/client";
import type { HistoryItem } from "@/lib/types";

export default function HistoryPage() {
  const query = useGetHistory();
  const items = (query.data as HistoryItem[] | undefined) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Archive" title="History" />
      {items.length === 0 ? (
        <Ticket>
          <p className="font-heading text-xl">No work recorded yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Phases your sub-team has touched will show up here.
          </p>
        </Ticket>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
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
                  {item.subTeam.name} · {item.documents.length} file
                  {item.documents.length === 1 ? "" : "s"}
                </p>
              </Ticket>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
