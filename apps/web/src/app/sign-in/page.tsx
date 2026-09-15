"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Ticket } from "@/components/ticket";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { usePostAuthSignIn } from "@/lib/api/generated/client";
import { ApiError } from "@/lib/api/problem-details";
import { useAuthStore } from "@/lib/auth/auth-store";
import type { AuthResponse } from "@/lib/types";

export default function SignInPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const signIn = usePostAuthSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Ticket className="w-full max-w-md">
        <Logo className="h-9" priority />
        <h1 className="font-heading mt-6 text-4xl tracking-tight">Sign in</h1>
        <p className="mt-2 text-muted-foreground">
          Work moves through teams. IDs stay with the files.
        </p>
        <form
          className="mt-8"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              const result = (await signIn.mutateAsync({
                data: { email, password },
              })) as unknown as AuthResponse;
              setSession(result);
              router.replace("/dashboard");
            } catch (error) {
              toast.error(
                error instanceof ApiError
                  ? error.message
                  : "Could not sign in.",
              );
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                required
              />
            </Field>
            <Button type="submit" disabled={signIn.isPending}>
              {signIn.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </FieldGroup>
        </form>
      </Ticket>
    </main>
  );
}
