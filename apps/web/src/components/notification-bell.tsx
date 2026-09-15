"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getGetNotificationsQueryKey,
  useGetNotifications,
  usePatchNotifications,
  usePostNotificationsRead,
} from "@/lib/api/generated/client";
import type { NotificationListDto } from "@/lib/api/generated/model";
import { formatHandoffTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const kindLabel = (kind: string): string => {
  if (kind === "sent_back") {
    return "Sent back";
  }
  if (kind === "closed") {
    return "Closed";
  }
  return "Waiting";
};

export const NotificationBell = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const query = useGetNotifications({
    query: {
      refetchInterval: 20_000,
      refetchOnWindowFocus: true,
    },
  });
  const markOne = usePatchNotifications();
  const markAll = usePostNotificationsRead();
  const data = query.data as NotificationListDto | undefined;
  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];
  const label =
    unreadCount > 0
      ? `Notices, ${String(unreadCount)} unread`
      : "Notices, none unread";

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: getGetNotificationsQueryKey(),
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-sm" }),
          "overflow-visible text-ticket/80 hover:bg-white/10 hover:text-ticket aria-expanded:bg-white/10 aria-expanded:text-ticket",
        )}
      >
        <span className="relative inline-flex">
          <Bell aria-hidden />
          {unreadCount > 0 ? (
            <span
              aria-hidden
              className="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-cobalt px-0.5 font-mono text-[0.6rem] leading-none text-primary-foreground ring-2 ring-ink"
            >
              {unreadCount > 9 ? "9+" : String(unreadCount)}
            </span>
          ) : null}
        </span>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="right"
        className="flex w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden p-0"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div>
            <PopoverTitle>For you</PopoverTitle>
            <PopoverDescription className="mt-0.5">
              {unreadCount > 0
                ? `${String(unreadCount)} waiting to be read`
                : "You’re caught up"}
            </PopoverDescription>
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={() => {
                markAll.mutate(undefined, { onSuccess: refresh });
              }}
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        {query.isLoading ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Checking the floor…
          </p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Nothing for you right now. New work and send-backs show up here.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {items.map((item) => {
              const unread = item.readAt == null;
              return (
                <li
                  key={item.id}
                  className="border-b border-border/60 last:border-b-0"
                >
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col items-start gap-1 px-4 py-3 text-left hover:bg-floor/40",
                      unread && "bg-cobalt/5",
                    )}
                    onClick={() => {
                      if (unread) {
                        markOne.mutate(
                          { id: item.id, data: { read: true } },
                          { onSuccess: refresh },
                        );
                      }
                      setOpen(false);
                      if (item.projectId != null && item.projectId.length > 0) {
                        router.push(`/work/${item.projectId}`);
                      }
                    }}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span
                        className={cn(
                          "font-mono text-[0.68rem] tracking-[0.12em] uppercase",
                          item.kind === "sent_back"
                            ? "text-oxide"
                            : item.kind === "closed"
                              ? "text-muted-foreground"
                              : "text-waiting",
                        )}
                      >
                        {kindLabel(item.kind)}
                      </span>
                      <span className="text-[0.7rem] text-muted-foreground">
                        {formatHandoffTime(item.createdAt)}
                      </span>
                    </span>
                    <span className="font-heading text-sm tracking-tight">
                      {item.title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {item.body}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};
