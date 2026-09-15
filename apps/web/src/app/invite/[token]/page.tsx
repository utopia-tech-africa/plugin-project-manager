"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Ticket } from "@/components/ticket";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { usePostAuthAcceptInvite } from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import type { AuthResponse } from "@/lib/types";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const acceptInvite = usePostAuthAcceptInvite();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Ticket className="w-full max-w-md">
        <Logo className="h-9" priority />
        <h1 className="font-heading mt-6 text-4xl tracking-tight">
          Join your team
        </h1>
        <p className="mt-2 text-muted-foreground">
          Set your name and a password to accept the invite.
        </p>
        <form
          className="mt-8"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              const result = (await acceptInvite.mutateAsync({
                data: { token: params.token, fullName, password },
              })) as unknown as AuthResponse;
              setSession(result);
              router.replace("/dashboard");
            } catch (error) {
              toast.error(
                error instanceof ApiError
                  ? error.message
                  : "This invite could not be used.",
              );
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full name</FieldLabel>
              <Input
                id="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </Field>
            <Button type="submit" disabled={acceptInvite.isPending}>
              {acceptInvite.isPending ? "Joining…" : "Join team"}
            </Button>
          </FieldGroup>
        </form>
      </Ticket>
    </main>
  );
}
