"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/star-rating";
import { ReviewSchema } from "@/lib/validators";

type FormValues = z.infer<typeof ReviewSchema>;

export function ReviewForm({ providerId }: { providerId: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(ReviewSchema),
    defaultValues: { providerId, rating: 0, comment: "" },
  });

  const rating = watch("rating");

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data: { error?: { message?: string } } = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? "Could not post review");
      }
      toast.success("Review posted. Thank you.");
      reset({ providerId, rating: 0, comment: "" });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Share your experience</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("providerId")} value={providerId} />
          <div className="space-y-2">
            <Label htmlFor="rating">Your rating</Label>
            <StarRating
              interactive
              value={rating}
              size={20}
              onChange={(n) => setValue("rating", n, { shouldValidate: true })}
            />
            {errors.rating ? (
              <p className="text-sm text-destructive">{errors.rating.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Your review</Label>
            <Textarea
              id="comment"
              rows={4}
              placeholder="What stood out about this provider?"
              aria-invalid={!!errors.comment}
              {...register("comment")}
            />
            {errors.comment ? (
              <p className="text-sm text-destructive">{errors.comment.message}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Posting…" : "Post review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
