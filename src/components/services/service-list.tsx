"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Power, Trash2 } from "lucide-react";

import { ServiceForm } from "@/components/services/service-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CATEGORY_BY_SLUG } from "@/lib/categories";
import { formatINR } from "@/lib/utils";

const PRICE_UNIT_LABEL: Record<string, string> = {
  per_visit: "per visit",
  per_hour: "per hour",
  per_day: "per day",
  fixed: "fixed",
};

export interface ServiceListItem {
  id: string;
  title: string;
  description: string;
  categorySlug: string;
  price: number;
  priceUnit: "per_visit" | "per_hour" | "per_day" | "fixed";
  durationMinutes: number | null;
  isActive: boolean;
}

export function ServiceList({ services }: { services: ServiceListItem[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ServiceListItem | null>(null);
  const [deleting, setDeleting] = React.useState<ServiceListItem | null>(null);
  const [pending, startTransition] = React.useTransition();

  const remove = (svc: ServiceListItem) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/services/${svc.id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null;
          throw new Error(data?.error?.message ?? `Delete failed (${res.status})`);
        }
        toast.success("Service deleted");
        setDeleting(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    });
  };

  const toggleActive = (svc: ServiceListItem) => {
    startTransition(async () => {
      const next = !svc.isActive;
      try {
        const res = await fetch(`/api/services/${svc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...svc, isActive: next }),
        });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        toast.success(next ? "Service enabled" : "Service disabled");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {services.length} service{services.length === 1 ? "" : "s"}
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" aria-hidden="true" />
              New service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add a service</DialogTitle>
              <DialogDescription>
                Customers will see this on your profile and in search results.
              </DialogDescription>
            </DialogHeader>
            <ServiceForm mode="create" onDone={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium">No services yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Add at least one service so customers can book you. You can list
              fixed-price jobs or hourly rates.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add your first service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3" role="list">
          {services.map((svc) => {
            const cat = CATEGORY_BY_SLUG.get(svc.categorySlug);
            return (
              <li key={svc.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                          {svc.title}
                        </h3>
                        {cat ? (
                          <Badge variant="outline">{cat.nameEn}</Badge>
                        ) : null}
                        {svc.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {svc.description}
                      </p>
                      <p className="mt-2 text-sm">
                        <span className="font-semibold tabular-nums">
                          {formatINR(svc.price)}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {PRICE_UNIT_LABEL[svc.priceUnit] ?? svc.priceUnit}
                        </span>
                        {svc.durationMinutes ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {svc.durationMinutes} min
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(svc)}
                        disabled={pending}
                        aria-label={svc.isActive ? "Disable" : "Enable"}
                      >
                        <Power className="size-3.5" aria-hidden="true" />
                        {svc.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(svc)}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleting(svc)}
                        aria-label={`Delete ${svc.title}`}
                      >
                        <Trash2 className="size-3.5 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit service</DialogTitle>
          </DialogHeader>
          {editing ? (
            <ServiceForm
              mode="edit"
              initial={{
                id: editing.id,
                title: editing.title,
                description: editing.description,
                categorySlug: editing.categorySlug,
                price: editing.price,
                priceUnit: editing.priceUnit,
                durationMinutes: editing.durationMinutes ?? undefined,
                isActive: editing.isActive,
              }}
              onDone={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &quot;{deleting?.title}&quot;?</DialogTitle>
            <DialogDescription>
              Customers won&apos;t be able to book this service. Existing bookings
              are preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleting(null)}
              disabled={pending}
            >
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleting && remove(deleting)}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
