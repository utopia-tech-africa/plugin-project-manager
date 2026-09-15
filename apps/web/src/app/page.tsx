"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/lib/auth/auth-store";

export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    router.replace(user === null ? "/sign-in" : "/dashboard");
  }, [router, user]);

  return null;
}
