"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LocateFixed,
  MapPin,
  ShieldCheck,
  User2,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AadhaarFlow } from "@/components/kyc/aadhaar-flow";
import { PanFlow } from "@/components/kyc/pan-flow";
import { GstFlow } from "@/components/kyc/gst-flow";
import { DynamicMap } from "@/components/map/dynamic-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/lib/categories";
import { isValidVpa } from "@/lib/payments/upi";
import { PincodeSchema } from "@/lib/validators";
import { cn } from "@/lib/utils";

type StepId = "profile" | "location" | "kyc" | "payouts";

interface StepDef {
  id: StepId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

const STEPS: StepDef[] = [
  { id: "profile", title: "Profile", subtitle: "How you appear to customers", icon: User2 },
  { id: "location", title: "Location", subtitle: "Where you serve", icon: MapPin },
  { id: "kyc", title: "Verification", subtitle: "Aadhaar · PAN · GST", icon: ShieldCheck },
  { id: "payouts", title: "Payouts", subtitle: "UPI & consent", icon: Wallet },
];

const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;

interface ProfileState {
  headline: string;
  bio: string;
  experienceYears: string;
  hourlyRateMin: string;
  hourlyRateMax: string;
  categories: string[];
  photoUrl: string;
}

interface LocationState {
  address: string;
  city: string;
  state: string;
  pincode: string;
  lat: number;
  lng: number;
}

interface KycState {
  aadhaarVerified: boolean;
  aadhaarLast4: string | null;
  panVerified: boolean;
  pan: string | null;
  gstinVerified: boolean;
  gstin: string | null;
}

interface PayoutsState {
  upiVpa: string;
  agreeTerms: boolean;
  agreeDpdp: boolean;
}

export interface OnboardingWizardProps {
  initialUser: {
    id: string;
    name: string;
    email: string;
  };
}

export function OnboardingWizard({ initialUser }: OnboardingWizardProps) {
  const router = useRouter();
  const [stepIdx, setStepIdx] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  const [profile, setProfile] = React.useState<ProfileState>({
    headline: "",
    bio: "",
    experienceYears: "1",
    hourlyRateMin: "200",
    hourlyRateMax: "800",
    categories: [],
    photoUrl: "",
  });

  const [location, setLocation] = React.useState<LocationState>({
    address: "",
    city: "",
    state: "",
    pincode: "",
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });

  const [kyc, setKyc] = React.useState<KycState>({
    aadhaarVerified: false,
    aadhaarLast4: null,
    panVerified: false,
    pan: null,
    gstinVerified: false,
    gstin: null,
  });

  const [payouts, setPayouts] = React.useState<PayoutsState>({
    upiVpa: "",
    agreeTerms: false,
    agreeDpdp: false,
  });

  const [geoPending, setGeoPending] = React.useState(false);

  const profileValid = React.useMemo(() => {
    const min = Number(profile.hourlyRateMin);
    const max = Number(profile.hourlyRateMax);
    const exp = Number(profile.experienceYears);
    return (
      profile.headline.trim().length >= 5 &&
      profile.headline.trim().length <= 120 &&
      profile.bio.trim().length >= 20 &&
      profile.categories.length >= 1 &&
      profile.categories.length <= 5 &&
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      Number.isFinite(exp) &&
      exp >= 0 &&
      exp <= 60 &&
      min >= 50 &&
      max >= min &&
      max <= 100000
    );
  }, [profile]);

  const locationValid = React.useMemo(() => {
    const pinOk = PincodeSchema.safeParse(location.pincode).success;
    return (
      location.address.trim().length >= 5 &&
      location.city.trim().length >= 2 &&
      location.state.trim().length >= 2 &&
      pinOk &&
      Math.abs(location.lat) <= 90 &&
      Math.abs(location.lng) <= 180
    );
  }, [location]);

  const kycValid = kyc.aadhaarVerified && kyc.panVerified;

  const payoutsValid = React.useMemo(() => {
    const vpaOk = payouts.upiVpa.trim().length === 0 || isValidVpa(payouts.upiVpa.trim());
    return vpaOk && payouts.agreeTerms && payouts.agreeDpdp;
  }, [payouts]);

  const stepValid = (idx: number): boolean => {
    if (idx === 0) return profileValid;
    if (idx === 1) return locationValid;
    if (idx === 2) return kycValid;
    if (idx === 3) return payoutsValid;
    return false;
  };

  const goNext = () => {
    if (!stepValid(stepIdx)) return;
    setStepIdx((i) => Math.min(STEPS.length - 1, i + 1));
  };
  const goPrev = () => setStepIdx((i) => Math.max(0, i - 1));

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not available on this device");
      return;
    }
    setGeoPending(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation((s) => ({
          ...s,
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        }));
        setGeoPending(false);
        toast.success("Location set");
      },
      (err) => {
        setGeoPending(false);
        toast.error(err.message ?? "Could not access location");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const submit = async () => {
    if (!profileValid || !locationValid || !kycValid || !payoutsValid) {
      toast.error("Please complete all steps before submitting");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        headline: profile.headline.trim(),
        bio: profile.bio.trim(),
        experienceYears: Number(profile.experienceYears),
        hourlyRateMin: Number(profile.hourlyRateMin),
        hourlyRateMax: Number(profile.hourlyRateMax),
        address: location.address.trim(),
        city: location.city.trim(),
        state: location.state.trim(),
        pincode: location.pincode.trim(),
        lat: location.lat,
        lng: location.lng,
        upiVpa: payouts.upiVpa.trim() || undefined,
        categories: profile.categories,
      };
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 409) {
        toast.message("Your provider profile already exists. Redirecting…");
        router.push("/provider/dashboard");
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(data?.error?.message ?? `Submission failed (${res.status})`);
      }
      toast.success("Welcome to SevaSetu! Your profile is live.");
      router.push("/provider/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCategory = (slug: string) => {
    setProfile((s) => {
      if (s.categories.includes(slug)) {
        return { ...s, categories: s.categories.filter((c) => c !== slug) };
      }
      if (s.categories.length >= 5) {
        toast.error("You can pick up to 5 categories");
        return s;
      }
      return { ...s, categories: [...s.categories, slug] };
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Stepper */}
      <aside className="lg:sticky lg:top-6 lg:self-start" aria-label="Onboarding progress">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Set up your profile
            </p>
            <p className="mt-1 text-sm text-foreground">Hi {initialUser.name.split(" ")[0]}, this takes ~5 minutes.</p>
            <ol className="mt-4 space-y-2" role="list">
              {STEPS.map((step, idx) => {
                const Icon = step.icon;
                const done = idx < stepIdx && stepValid(idx);
                const current = idx === stepIdx;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => idx <= stepIdx || stepValid(stepIdx) ? setStepIdx(idx) : null}
                      aria-current={current ? "step" : undefined}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                        current
                          ? "border-primary bg-primary/5"
                          : done
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-input hover:bg-muted/50",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                          current
                            ? "bg-primary text-primary-foreground"
                            : done
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground",
                        )}
                        aria-hidden="true"
                      >
                        {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium leading-tight">
                          {idx + 1}. {step.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {step.subtitle}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </aside>

      {/* Step content */}
      <section aria-live="polite">
        <Card>
          <CardContent className="space-y-6 p-6">
            {stepIdx === 0 ? (
              <ProfileStep
                profile={profile}
                onChange={setProfile}
                onToggleCategory={toggleCategory}
              />
            ) : null}
            {stepIdx === 1 ? (
              <LocationStep
                location={location}
                onChange={setLocation}
                geoPending={geoPending}
                onUseMyLocation={useMyLocation}
              />
            ) : null}
            {stepIdx === 2 ? (
              <KycStep kyc={kyc} onChange={setKyc} />
            ) : null}
            {stepIdx === 3 ? (
              <PayoutsStep payouts={payouts} onChange={setPayouts} />
            ) : null}

            <div className="flex flex-col-reverse items-stretch gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={goPrev}
                disabled={stepIdx === 0 || submitting}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Back
              </Button>

              {stepIdx < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={goNext}
                  disabled={!stepValid(stepIdx)}
                >
                  Continue
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={submit}
                  disabled={!payoutsValid || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Submitting…
                    </>
                  ) : (
                    "Submit & go live"
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ---------- Step 1: Profile ----------
function ProfileStep({
  profile,
  onChange,
  onToggleCategory,
}: {
  profile: ProfileState;
  onChange: React.Dispatch<React.SetStateAction<ProfileState>>;
  onToggleCategory: (slug: string) => void;
}) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Tell customers who you are</h2>
        <p className="text-sm text-muted-foreground">
          A clear headline and a short bio go a long way.
        </p>
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          maxLength={120}
          placeholder="e.g. Certified electrician — 8 yrs in Delhi NCR"
          value={profile.headline}
          onChange={(e) => onChange((s) => ({ ...s, headline: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">
          {profile.headline.length}/120
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bio">Short bio</Label>
        <Textarea
          id="bio"
          rows={4}
          maxLength={2000}
          placeholder="Briefly describe your experience, specialities, and the kind of jobs you take."
          value={profile.bio}
          onChange={(e) => onChange((s) => ({ ...s, bio: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">{profile.bio.length}/2000</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="experienceYears">Experience (years)</Label>
          <Input
            id="experienceYears"
            type="number"
            min={0}
            max={60}
            value={profile.experienceYears}
            onChange={(e) =>
              onChange((s) => ({ ...s, experienceYears: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hourlyRateMin">Hourly rate min (₹)</Label>
          <Input
            id="hourlyRateMin"
            type="number"
            min={50}
            step={10}
            value={profile.hourlyRateMin}
            onChange={(e) =>
              onChange((s) => ({ ...s, hourlyRateMin: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="hourlyRateMax">Hourly rate max (₹)</Label>
          <Input
            id="hourlyRateMax"
            type="number"
            min={50}
            step={10}
            value={profile.hourlyRateMax}
            onChange={(e) =>
              onChange((s) => ({ ...s, hourlyRateMax: e.target.value }))
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="photoUrl">Profile photo URL (optional)</Label>
        <Input
          id="photoUrl"
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={profile.photoUrl}
          onChange={(e) => onChange((s) => ({ ...s, photoUrl: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">
          Paste a public image link. You can upload later from your dashboard.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <Label>Categories you serve</Label>
          <span className="text-xs text-muted-foreground">
            {profile.categories.length}/5
          </span>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Service categories"
        >
          {CATEGORIES.map((c) => {
            const active = profile.categories.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => onToggleCategory(c.slug)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                {c.nameEn}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------- Step 2: Location ----------
function LocationStep({
  location,
  onChange,
  geoPending,
  onUseMyLocation,
}: {
  location: LocationState;
  onChange: React.Dispatch<React.SetStateAction<LocationState>>;
  geoPending: boolean;
  onUseMyLocation: () => void;
}) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Where do you serve?</h2>
        <p className="text-sm text-muted-foreground">
          We use this to show you to nearby customers.
        </p>
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="address">Street address</Label>
        <Textarea
          id="address"
          rows={2}
          maxLength={300}
          placeholder="House / shop, street, area"
          value={location.address}
          onChange={(e) => onChange((s) => ({ ...s, address: e.target.value }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            maxLength={80}
            value={location.city}
            onChange={(e) => onChange((s) => ({ ...s, city: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            maxLength={80}
            value={location.state}
            onChange={(e) => onChange((s) => ({ ...s, state: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pincode">Pincode</Label>
          <Input
            id="pincode"
            inputMode="numeric"
            maxLength={6}
            value={location.pincode}
            onChange={(e) =>
              onChange((s) => ({
                ...s,
                pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
              }))
            }
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lat">Latitude</Label>
          <Input
            id="lat"
            type="number"
            step="any"
            inputMode="decimal"
            value={location.lat}
            onChange={(e) =>
              onChange((s) => ({ ...s, lat: Number(e.target.value) }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lng">Longitude</Label>
          <Input
            id="lng"
            type="number"
            step="any"
            inputMode="decimal"
            value={location.lng}
            onChange={(e) =>
              onChange((s) => ({ ...s, lng: Number(e.target.value) }))
            }
          />
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onUseMyLocation}
        disabled={geoPending}
      >
        {geoPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LocateFixed className="size-4" aria-hidden="true" />
        )}
        Use my location
      </Button>

      <div className="overflow-hidden rounded-xl border">
        <DynamicMap
          center={{ lat: location.lat, lng: location.lng }}
          markers={[
            {
              id: "self",
              lat: location.lat,
              lng: location.lng,
              name: "Your location",
              ratingAvg: 0,
              href: "#",
            },
          ]}
          height={260}
          zoom={14}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Drag the map markers later from the dashboard if needed.
      </p>
    </div>
  );
}

// ---------- Step 3: KYC ----------
function KycStep({
  kyc,
  onChange,
}: {
  kyc: KycState;
  onChange: React.Dispatch<React.SetStateAction<KycState>>;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">Verify your identity</h2>
        <p className="text-sm text-muted-foreground">
          Verified providers earn 3× more bookings. We never share full IDs with customers.
        </p>
      </header>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Aadhaar</h3>
        <AadhaarFlow
          initial={{
            status: kyc.aadhaarVerified ? "verified" : "unverified",
            last4: kyc.aadhaarLast4,
          }}
          onVerified={({ last4 }) =>
            onChange((s) => ({ ...s, aadhaarVerified: true, aadhaarLast4: last4 }))
          }
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">PAN</h3>
        <PanFlow
          initial={{
            status: kyc.panVerified ? "verified" : "unverified",
            pan: kyc.pan,
          }}
          onVerified={({ pan }) =>
            onChange((s) => ({ ...s, panVerified: true, pan }))
          }
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">
          GSTIN <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </h3>
        <GstFlow
          initial={{
            status: kyc.gstinVerified ? "verified" : "unverified",
            gstin: kyc.gstin,
          }}
          onVerified={({ gstin }) =>
            onChange((s) => ({ ...s, gstinVerified: true, gstin }))
          }
        />
      </section>
    </div>
  );
}

// ---------- Step 4: Payouts ----------
function PayoutsStep({
  payouts,
  onChange,
}: {
  payouts: PayoutsState;
  onChange: React.Dispatch<React.SetStateAction<PayoutsState>>;
}) {
  const vpaError =
    payouts.upiVpa.trim().length > 0 && !isValidVpa(payouts.upiVpa.trim());

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold">Payouts & consent</h2>
        <p className="text-sm text-muted-foreground">
          You&apos;ll get paid directly via UPI. Customers see this VPA after they book.
        </p>
      </header>

      <div className="space-y-1.5">
        <Label htmlFor="upiVpa">UPI ID (VPA)</Label>
        <Input
          id="upiVpa"
          inputMode="email"
          autoComplete="off"
          placeholder="yourname@bankupi"
          value={payouts.upiVpa}
          onChange={(e) => onChange((s) => ({ ...s, upiVpa: e.target.value }))}
          aria-invalid={vpaError ? true : undefined}
        />
        {vpaError ? (
          <p role="alert" className="text-xs text-destructive">
            Enter a valid UPI ID like name@bank.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Optional now. You can add it later from your dashboard.
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
        <label className="flex items-start gap-3">
          <Checkbox
            checked={payouts.agreeTerms}
            onCheckedChange={(v) =>
              onChange((s) => ({ ...s, agreeTerms: v === true }))
            }
            aria-label="Agree to provider terms"
            className="mt-0.5"
          />
          <span className="text-sm leading-tight">
            I agree to SevaSetu&apos;s{" "}
            <a
              href="/legal/provider-terms"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Provider Terms
            </a>
            , including reasonable cancellation, fair pricing, and respectful conduct.
          </span>
        </label>

        <label className="flex items-start gap-3">
          <Checkbox
            checked={payouts.agreeDpdp}
            onCheckedChange={(v) =>
              onChange((s) => ({ ...s, agreeDpdp: v === true }))
            }
            aria-label="DPDP consent"
            className="mt-0.5"
          />
          <span className="text-sm leading-tight">
            I consent under the Digital Personal Data Protection Act, 2023 to
            SevaSetu processing my profile and verification data for matching me
            with customers and meeting legal obligations. I can withdraw consent
            anytime from settings.
          </span>
        </label>
      </div>
    </div>
  );
}
