"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { usePostAuthSignOut } from "@/lib/api/generated/client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Floor" },
  { href: "/work", label: "Work" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clear = useAuthStore((state) => state.clear);
  const signOut = usePostAuthSignOut();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && user === null) {
      router.replace("/sign-in");
    }
  }, [hydrated, router, user]);

  if (!hydrated || user === null) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-ink px-4 py-3 text-ticket md:h-screen md:w-52 md:flex-col md:items-stretch md:px-5 md:py-7">
        <div className="flex items-center gap-3 md:w-full md:flex-col md:items-stretch md:gap-8">
          <Link href="/dashboard" className="inline-flex items-center">
            <Logo className="h-5 md:h-7" />
          </Link>
          <nav className="flex items-center gap-1 md:w-full md:flex-col md:items-stretch md:gap-1">
            {links.map((link) => {
              const active =
                link.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm md:w-full md:px-3",
                    active
                      ? "bg-cobalt text-primary-foreground"
                      : "text-ticket/70 hover:bg-white/5 hover:text-ticket",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2 md:mt-auto md:w-full md:flex-col md:items-stretch md:gap-3">
          <div className="flex items-center gap-2 md:w-full md:justify-between">
            <p className="hidden text-sm text-ticket/70 md:block">
              {user.fullName}
            </p>
            <NotificationBell />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-ticket/80 hover:bg-white/10 hover:text-ticket md:w-full md:justify-start"
            onClick={() => {
              if (refreshToken !== null) {
                signOut.mutate({ data: { refreshToken } });
              }
              clear();
              router.replace("/sign-in");
            }}
          >
            Sign out
          </Button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:px-10 md:py-10">
        {children}
      </main>
    </div>
  );
};
