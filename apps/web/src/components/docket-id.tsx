"use client";

import { useState } from "react";

export const DocketId = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className="stamp"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1200);
      }}
      title="Copy ID"
    >
      {copied ? "Copied" : value}
    </button>
  );
};
