"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, MapPin, Navigation } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DynamicMap } from "@/components/map/dynamic-map";
import { BookingSchema } from "@/lib/validators";
import { formatINR } from "@/lib/utils";

type Provider = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  hourlyRateMin: number;
  hourlyRateMax: number;
  defaultAddress: string;
};

type ServiceLite = {
  id: string;
  title: string;
  price: number;
  priceUnit: "per_visit" | "per_hour" | "per_day" | "fixed";
};

type Confirmation = {
  bookingId: string;
  scheduledAt: string;
  total: number;
  upiIntent: string | null;
};

type FormValues = z.infer<typeof BookingSchema>;

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatLocalDateTime(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultScheduledAt() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return formatLocalDateTime(d);
}

function minScheduledAt() {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  return formatLocalDateTime(d);
}

export type BookingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: Provider;
  service?: ServiceLite | null;
  signedIn: boolean;
};

export function BookingModal({ open, onOpenChange, provider, service, signedIn }: BookingModalProps) {
  const router = useRouter();
  const [confirmation, setConfirmation] = React.useState<Confirmation | null>(null);
  const [locating, setLocating] = React.useState(false);

  const median = Math.round((provider.hourlyRateMin + provider.hourlyRateMax) / 2);
  const initialPrice = service ? service.price : median;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(BookingSchema),
    defaultValues: {
      providerId: provider.id,
      serviceId: service?.id,
      scheduledAt: new Date(defaultScheduledAt()),
      address: provider.defaultAddress,
      lat: provider.lat,
      lng: provider.lng,
      notes: "",
      priceQuoted: initialPrice,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    setConfirmation(null);
    reset({
      providerId: provider.id,
      serviceId: service?.id,
      scheduledAt: new Date(defaultScheduledAt()),
      address: provider.defaultAddress,
      lat: provider.lat,
      lng: provider.lng,
      notes: "",
      priceQuoted: initialPrice,
    });
  }, [open, provider, service, initialPrice, reset]);

  const lat = watch("lat");
  const lng = watch("lng");
  const priceQuoted = watch("priceQuoted");

  const onLocate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not available on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("lat", pos.coords.latitude, { shouldValidate: true });
        setValue("lng", pos.coords.longitude, { shouldValidate: true });
        toast.success("Using your current location");
        setLocating(false);
      },
      (err) => {
        toast.error(err.message || "Could not get your location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const onSubmit = async (values: FormValues) => {
    if (!signedIn) {
      router.push(`/login?next=/providers/${provider.id}`);
      return;
    }
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          scheduledAt: values.scheduledAt instanceof Date ? values.scheduledAt.toISOString() : values.scheduledAt,
        }),
      });
      const data: { booking?: { id: string; scheduledAt: string; priceQuoted: number }; upiIntent?: string; error?: { message?: string } } =
        await res.json();
      if (!res.ok || !data.booking) {
        throw new Error(data?.error?.message ?? "Could not create booking");
      }
      setConfirmation({
        bookingId: data.booking.id,
        scheduledAt: data.booking.scheduledAt,
        total: data.booking.priceQuoted,
        upiIntent: data.upiIntent ?? null,
      });
      toast.success("Booking confirmed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const scheduledAtRegister = register("scheduledAt", { valueAsDate: true });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        {confirmation ? (
          <ConfirmationPanel
            confirmation={confirmation}
            providerName={provider.name}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Book {provider.name}</DialogTitle>
              <DialogDescription>
                {service ? (
                  <>
                    Booking <span className="font-medium text-foreground">{service.title}</span>
                  </>
                ) : (
                  "Choose a time, share your address, and confirm. You will pay via UPI when the work is done."
                )}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" aria-hidden /> When do you need this?
                </Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  min={minScheduledAt()}
                  defaultValue={defaultScheduledAt()}
                  aria-invalid={!!errors.scheduledAt}
                  {...scheduledAtRegister}
                />
                {errors.scheduledAt ? (
                  <p className="text-sm text-destructive">
                    {errors.scheduledAt.message?.toString()}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  rows={2}
                  placeholder="House / flat number, street, area, landmark"
                  aria-invalid={!!errors.address}
                  {...register("address")}
                />
                {errors.address ? (
                  <p className="text-sm text-destructive">{errors.address.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" aria-hidden /> Pinned location
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={onLocate} disabled={locating}>
                    {locating ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Navigation className="h-4 w-4" aria-hidden />
                    )}
                    Use my location
                  </Button>
                </div>
                <div className="overflow-hidden rounded-md border">
                  <DynamicMap
                    center={{ lat, lng }}
                    markers={[
                      {
                        id: "pinned",
                        lat,
                        lng,
                        name: "Service location",
                        ratingAvg: 0,
                        href: "#",
                      },
                    ]}
                    height={180}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="Anything the provider should know in advance"
                  {...register("notes")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                <div>
                  <div className="text-xs text-muted-foreground">Estimated total</div>
                  <div className="text-base font-semibold">{formatINR(priceQuoted ?? 0)}</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  Final amount confirmed on completion.
                  <br />
                  Pay via UPI directly to provider.
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Booking…" : signedIn ? "Confirm booking" : "Sign in to book"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmationPanel({
  confirmation,
  providerName,
  onClose,
}: {
  confirmation: Confirmation;
  providerName: string;
  onClose: () => void;
}) {
  const onPayUpi = () => {
    if (!confirmation.upiIntent || typeof window === "undefined") return;
    window.location.href = confirmation.upiIntent;
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Booking confirmed</DialogTitle>
        <DialogDescription>
          {providerName} will see your booking and accept it shortly. You can pay via UPI now or
          after the work is done.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3 rounded-md border bg-muted/30 p-4 text-sm">
        <Row label="Booking ID" value={<span className="font-mono text-xs">{confirmation.bookingId}</span>} />
        <Row
          label="Scheduled for"
          value={new Date(confirmation.scheduledAt).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        />
        <Row
          label="Total"
          value={<span className="font-semibold">{formatINR(confirmation.total)}</span>}
        />
      </div>
      <DialogFooter className="gap-2">
        <Button asChild variant="outline">
          <Link href="/dashboard/bookings" onClick={onClose}>
            View bookings
          </Link>
        </Button>
        {confirmation.upiIntent ? (
          <Button type="button" onClick={onPayUpi}>
            Pay via UPI
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
