import type { ReactNode } from "react";

export const PageHeader = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="font-mono text-[0.68rem] tracking-[0.22em] text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h1 className="font-heading mt-1 text-4xl tracking-tight text-balance">
        {title}
      </h1>
    </div>
    {children}
  </div>
);
