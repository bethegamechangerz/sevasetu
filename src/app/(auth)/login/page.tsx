"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { signIn } from "@/lib/auth-client";
import { LoginSchema } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginValues = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/dashboard";

  const signupHref = nextParam
    ? `/signup?next=${encodeURIComponent(nextParam)}`
    : "/signup";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      const result = await signIn.email({
        email: values.email,
        password: values.password,
        callbackURL: next,
      });
      const err = (result as { error?: { message?: string } } | undefined)?.error;
      if (err) {
        const msg = err.message ?? "Could not sign in. Check your details and try again.";
        toast.error(msg);
        setError("root", { message: msg });
        return;
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Try again.";
      toast.error(msg);
      setError("root", { message: msg });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          SevaSetu
        </p>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to manage your bookings.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              inputMode="email"
              placeholder="you@example.com"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email ? (
              <p id="email-error" role="alert" className="text-xs text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password ? (
              <p id="password-error" role="alert" className="text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          {errors.root ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.root.message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to SevaSetu?{" "}
          <Link
            href={signupHref}
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>

        {process.env.NODE_ENV !== "production" ? (
          <p className="mt-6 border-t pt-4 text-center text-[11px] text-muted-foreground/80">
            Demo:{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              demo@sevasetu.in
            </code>
            {" / "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
              password123
            </code>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
