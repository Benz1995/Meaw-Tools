"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button aria-label="สลับโหมดสี" variant="ghost" size="icon" onClick={() => setTheme(isDark ? "light" : "dark")}>
          <Sun className="size-4 scale-100 dark:scale-0" aria-hidden="true" />
          <Moon className="absolute size-4 scale-0 dark:scale-100" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isDark ? "โหมดสว่าง" : "โหมดมืด"}</TooltipContent>
    </Tooltip>
  );
}
