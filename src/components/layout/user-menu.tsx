"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "customer" | "provider" | "admin";
    image: string | null;
  };
};

export function UserMenu({ user }: Props) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleSignOut() {
    if (pending) return;
    setPending(true);
    try {
      await authClient.signOut();
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  const isProvider = user.role === "provider";
  const isAdmin = user.role === "admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 rounded-full pl-1 pr-2.5"
          aria-label={`Open account menu for ${user.name}`}
        >
          <Avatar className="size-7">
            {user.image ? <AvatarImage src={user.image} alt="" /> : null}
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials(user.name) || <UserCircle className="size-4" />}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-sm font-medium sm:inline">
            {user.name.split(" ")[0]}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">{user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <LayoutDashboard className="mr-2 size-4" aria-hidden="true" />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/bookings" className="cursor-pointer">
            <CalendarCheck className="mr-2 size-4" aria-hidden="true" />
            Bookings
          </Link>
        </DropdownMenuItem>
        {isProvider ? (
          <DropdownMenuItem asChild>
            <Link href="/provider" className="cursor-pointer">
              <ShieldCheck className="mr-2 size-4" aria-hidden="true" />
              Provider workspace
            </Link>
          </DropdownMenuItem>
        ) : null}
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="cursor-pointer">
              <ShieldCheck className="mr-2 size-4" aria-hidden="true" />
              Admin
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 size-4" aria-hidden="true" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleSignOut();
          }}
          disabled={pending}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 size-4" aria-hidden="true" />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
