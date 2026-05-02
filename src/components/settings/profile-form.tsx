"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LOCALE_COOKIE = "sevasetu_locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

const ProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is too short")
    .max(120, "Name is too long"),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/\D/g, "").replace(/^91/, "").slice(-10))
    .refine((s) => s === "" || /^[6-9]\d{9}$/.test(s), {
      message: "Enter a valid 10-digit Indian mobile number",
    }),
  locale: z.enum(["en", "hi"]),
});

type ProfileValues = z.infer<typeof ProfileSchema>;

export type ProfileFormProps = {
  defaultValues: ProfileValues;
};

function setLocaleCookie(locale: "en" | "hi") {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<ProfileValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues,
  });

  const localeValue = watch("locale");

  async function onSubmit(values: ProfileValues) {
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data: { error?: { message?: string } } = await res.json().catch(() => ({}));
        throw new Error(data.error?.message ?? "Could not save changes");
      }
      setLocaleCookie(values.locale);
      toast.success("Profile saved");
      reset(values);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-1.5">
        <Label htmlFor="profile-name">Full name</Label>
        <Input
          id="profile-name"
          autoComplete="name"
          {...register("name")}
          aria-invalid={errors.name ? "true" : "false"}
          aria-describedby={errors.name ? "profile-name-error" : undefined}
        />
        <FormMessage id="profile-name-error">{errors.name?.message}</FormMessage>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="profile-phone">Phone</Label>
        <Input
          id="profile-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="98765 43210"
          {...register("phone")}
          aria-invalid={errors.phone ? "true" : "false"}
          aria-describedby={errors.phone ? "profile-phone-error" : "profile-phone-hint"}
        />
        {errors.phone ? (
          <FormMessage id="profile-phone-error">{errors.phone.message}</FormMessage>
        ) : (
          <p id="profile-phone-hint" className="text-xs text-muted-foreground">
            10-digit Indian mobile. We&apos;ll send booking updates here.
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="profile-locale">Language</Label>
        <Select
          value={localeValue}
          onValueChange={(v) => setValue("locale", v as "en" | "hi", { shouldDirty: true })}
        >
          <SelectTrigger id="profile-locale" aria-label="Preferred language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Used for the app interface and any booking notifications.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => reset(defaultValues)}
          disabled={!isDirty || isSubmitting}
        >
          Reset
        </Button>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}
