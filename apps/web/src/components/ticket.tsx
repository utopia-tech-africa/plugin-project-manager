import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type TicketTone = "default" | "live" | "waiting" | "returned" | "quiet";

export const Ticket = ({
  children,
  className,
  href,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  tone?: TicketTone;
}) => {
  const classes = cn(
    "ticket",
    href !== undefined && "ticket-lift",
    tone === "live" && "ticket-live",
    tone === "waiting" && "ticket-waiting",
    tone === "returned" && "ticket-returned",
    tone === "quiet" && "ticket-quiet",
    className,
  );

  if (href !== undefined) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
};
