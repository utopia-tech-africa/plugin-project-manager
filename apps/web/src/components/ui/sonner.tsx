"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast: "cn-toast",
      },
    }}
    {...props}
  />
);
