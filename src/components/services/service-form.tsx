"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { ServiceSchema } from "@/lib/validators";

type FormValues = z.infer<typeof ServiceSchema>;

const PRICE_UNITS: { value: FormValues["priceUnit"]; label: string }[] = [
  { value: "per_visit", label: "Per visit" },
  { value: "per_hour", label: "Per hour" },
  { value: "per_day", label: "Per day" },
  { value: "fixed", label: "Fixed" },
];

export interface ServiceFormProps {
  mode: "create" | "edit";
  initial?: Partial<FormValues> & { id?: string };
  onDone?: () => void;
}

export function ServiceForm({ mode, initial, onDone }: ServiceFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(ServiceSchema),
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      categorySlug: initial?.categorySlug ?? CATEGORIES[0]!.slug,
      price: initial?.price ?? 500,
      priceUnit: initial?.priceUnit ?? "per_visit",
      durationMinutes: initial?.durationMinutes ?? undefined,
      isActive: initial?.isActive ?? true,
    },
  });

  const categorySlug = watch("categorySlug");
  const priceUnit = watch("priceUnit");

  const onSubmit = async (values: FormValues) => {
    try {
      const url =
        mode === "create" ? "/api/services" : `/api/services/${initial?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        const msg = data?.error?.message ?? `Save failed (${res.status})`;
        toast.error(msg);
        return;
      }
      toast.success(mode === "create" ? "Service added" : "Service updated");
      router.refresh();
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="title">Service title</Label>
        <Input
          id="title"
          autoFocus
          placeholder="e.g. Ceiling fan installation"
          aria-invalid={errors.title ? true : undefined}
          {...register("title")}
        />
        {errors.title ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          placeholder="Tell customers what's included, materials, callout fee, etc."
          aria-invalid={errors.description ? true : undefined}
          {...register("description")}
        />
        {errors.description ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.description.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="categorySlug">Category</Label>
          <Select
            value={categorySlug}
            onValueChange={(v) =>
              setValue("categorySlug", v as FormValues["categorySlug"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="categorySlug" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="priceUnit">Price unit</Label>
          <Select
            value={priceUnit}
            onValueChange={(v) =>
              setValue("priceUnit", v as FormValues["priceUnit"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="priceUnit" aria-label="Price unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRICE_UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="price">Price (INR)</Label>
          <Input
            id="price"
            type="number"
            inputMode="numeric"
            min={50}
            step={10}
            aria-invalid={errors.price ? true : undefined}
            {...register("price")}
          />
          {errors.price ? (
            <p role="alert" className="text-xs text-destructive">
              {errors.price.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="durationMinutes">Duration (mins, optional)</Label>
          <Input
            id="durationMinutes"
            type="number"
            inputMode="numeric"
            min={15}
            step={15}
            placeholder="e.g. 60"
            {...register("durationMinutes")}
          />
          {errors.durationMinutes ? (
            <p role="alert" className="text-xs text-destructive">
              {errors.durationMinutes.message}
            </p>
          ) : null}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border-input"
          {...register("isActive")}
        />
        Active and visible to customers
      </label>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onDone?.()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : mode === "create" ? (
            "Add service"
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
