"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function HistoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-2xl tracking-tight">
        History could not open
      </h2>
      <p className="text-sm text-muted-foreground">
        Something broke while loading this page. Try again.
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
