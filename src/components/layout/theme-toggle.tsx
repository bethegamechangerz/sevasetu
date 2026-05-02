"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className="h-9 w-9"
        >
          <Sun
            aria-hidden="true"
            className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          />
          <Moon
            aria-hidden="true"
            className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        <DropdownMenuItem
          onSelect={() => setTheme("light")}
          aria-current={mounted && theme === "light" ? "true" : undefined}
        >
          <Sun className="mr-2 size-4" aria-hidden="true" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setTheme("dark")}
          aria-current={mounted && theme === "dark" ? "true" : undefined}
        >
          <Moon className="mr-2 size-4" aria-hidden="true" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setTheme("system")}
          aria-current={mounted && theme === "system" ? "true" : undefined}
        >
          <Monitor className="mr-2 size-4" aria-hidden="true" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
