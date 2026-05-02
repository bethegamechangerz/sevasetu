"use client";

import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { BookingModal } from "@/components/booking-modal";

export type BookingProviderInfo = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  hourlyRateMin: number;
  hourlyRateMax: number;
  defaultAddress: string;
};

export type BookingService = {
  id: string;
  title: string;
  price: number;
  priceUnit: "per_visit" | "per_hour" | "per_day" | "fixed";
};

type Ctx = {
  open: (service?: BookingService | null) => void;
};

const BookingCtx = React.createContext<Ctx | null>(null);

export function BookingProvider({
  provider,
  signedIn,
  children,
}: {
  provider: BookingProviderInfo;
  signedIn: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [service, setService] = React.useState<BookingService | null>(null);

  const ctx = React.useMemo<Ctx>(
    () => ({
      open: (svc) => {
        setService(svc ?? null);
        setOpen(true);
      },
    }),
    [],
  );

  return (
    <BookingCtx.Provider value={ctx}>
      {children}
      <BookingModal
        open={open}
        onOpenChange={setOpen}
        provider={provider}
        service={service}
        signedIn={signedIn}
      />
    </BookingCtx.Provider>
  );
}

export function BookNowButton({
  service,
  children,
  ...rest
}: Omit<ButtonProps, "onClick"> & { service?: BookingService | null }) {
  const ctx = React.useContext(BookingCtx);
  return (
    <Button
      type="button"
      onClick={() => ctx?.open(service ?? null)}
      {...rest}
    >
      {children}
    </Button>
  );
}
