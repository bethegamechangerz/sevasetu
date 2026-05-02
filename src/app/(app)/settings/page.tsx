import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Download, KeyRound, ShieldCheck, UserCog } from "lucide-react";

import { ProfileForm } from "@/components/settings/profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/auth-helpers";

export const metadata = {
  title: "Settings",
  description: "Manage your profile, language, and account preferences.",
};

export default async function SettingsPage() {
  const user = await requireUser();
  if (user.role === "admin") redirect("/admin");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:py-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Update your profile, language, and account preferences.
        </p>
      </header>

      <TooltipProvider delayDuration={150}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="size-4" aria-hidden="true" />
              Profile
            </CardTitle>
            <CardDescription>
              Your name, phone, and preferred language. Used across the app and on bookings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaultValues={{
                name: user.name,
                phone: user.phone ?? "",
                locale: user.locale,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Account
            </CardTitle>
            <CardDescription>Sign-in details. Email cannot be changed here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                type="email"
                value={user.email}
                readOnly
                aria-readonly="true"
                className="bg-muted/50"
              />
            </div>
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Password</p>
                <p className="text-xs text-muted-foreground">
                  Change your password using the secure reset flow.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/forgot-password">
                  <KeyRound className="size-4" aria-hidden="true" />
                  Change password
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="size-4" aria-hidden="true" />
              Privacy
            </CardTitle>
            <CardDescription>
              Under the DPDP Act, you can request a copy of your data at any time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Download my data</p>
                <p className="text-xs text-muted-foreground">
                  Bookings, reviews, and profile, exported as JSON.
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-disabled="true"
                      className="pointer-events-none opacity-60"
                    >
                      <Download className="size-4" aria-hidden="true" />
                      Request export
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="size-4" aria-hidden="true" />
              Danger zone
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Delete account</p>
                <p className="text-xs text-muted-foreground">
                  This action cannot be undone. KYC records must be reset first.
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      aria-disabled="true"
                      className="pointer-events-none opacity-60"
                    >
                      Delete account
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Available after KYC reset</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
}
