"use client";

import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { initials, timeAgo } from "@/lib/utils";

export type ReviewListItem = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  reviewerName: string;
  reviewerImage: string | null;
};

const PAGE = 5;

export function ReviewList({ reviews }: { reviews: ReviewListItem[] }) {
  const [shown, setShown] = React.useState(PAGE);
  const visible = reviews.slice(0, shown);

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No reviews yet. Be the first to leave one after your booking.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((r) => (
        <Card key={r.id}>
          <CardContent className="flex gap-3 p-4">
            <Avatar className="h-10 w-10">
              {r.reviewerImage ? (
                <AvatarImage src={r.reviewerImage} alt={r.reviewerName} />
              ) : null}
              <AvatarFallback>{initials(r.reviewerName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{r.reviewerName}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                </div>
                <StarRating value={r.rating} size={14} />
              </div>
              <p className="whitespace-pre-line text-sm text-foreground/90">{r.comment}</p>
            </div>
          </CardContent>
        </Card>
      ))}
      {shown < reviews.length ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setShown((n) => n + PAGE)}>
            Show more reviews ({reviews.length - shown} remaining)
          </Button>
        </div>
      ) : null}
    </div>
  );
}
