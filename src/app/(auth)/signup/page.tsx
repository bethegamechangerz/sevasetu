"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Briefcase, Eye, EyeOff, HandHeart, Loader2 } from "lucide-react";

import { signUp } from "@/lib/auth-client";
import { SignupSchema } from "@/lib/validators";
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
import { RolePillCard } from "@/components/auth/role-pill-card";

type SignupValues = z.infer<typeof SignupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole: SignupValues["role"] =
    params.get("role") === "provider" ? "provider" : "customer";

  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(SignupSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      role: initialRole,
    },
  });

  React.useEffect(() => {
    register("role");
  }, [register]);

  const role = watch("role");

  const onSubmit = async (values: SignupValues) => {
    const callbackURL =
      values.role === "provider" ? "/provider/onboarding" : "/dashboard";
    try {
      const result = await signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
        callbackURL,
        // Better-Auth additional fields are typed permissively at the client
        // call site; the server-side `additionalFields` config validates them.
        ...({ role: values.role, phone: values.phone } as Record<string, unknown>),
      });
      const err = (result as { error?: { message?: string } } | undefined)?.error;
      if (err) {
        const msg = err.message ?? "Could not create account. Please try again.";
        toast.error(msg);
        setError("root", { message: msg });
        return;
      }
      router.push(callbackURL);
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
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Trusted local services. Verified. Nearby.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              I am here to
            </Label>
            <div
              role="radiogroup"
              aria-label="Account type"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              <RolePillCard
                value="customer"
                selected={role === "customer"}
                title="I need services"
                description="Find verified providers near me."
                icon={HandHeart}
                onClick={() =>
                  setValue("role", "customer", { shouldValidate: true })
                }
              />
              <RolePillCard
                value="provider"
                selected={role === "provider"}
                title="I provide services"
                description="Get bookings from your area."
                icon={Briefcase}
                onClick={() =>
                  setValue("role", "provider", { shouldValidate: true })
                }
              />
            </div>
            {errors.role ? (
              <p role="alert" className="text-xs text-destructive">
                {errors.role.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="Aarav Sharma"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
            {errors.name ? (
              <p id="name-error" role="alert" className="text-xs text-destructive">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
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
            <Label htmlFor="phone">Phone</Label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
              >
                +91
              </span>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                placeholder="98765 43210"
                className="pl-12"
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                {...register("phone")}
              />
            </div>
            {errors.phone ? (
              <p id="phone-error" role="alert" className="text-xs text-destructive">
                {errors.phone.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="pr-10"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-1 flex items-center rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
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
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            By creating an account, you agree to SevaSetu&apos;s Terms of Service
            and acknowledge the Privacy Policy.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
