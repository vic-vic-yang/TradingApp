"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const options = [
  { value: "light" as const, label: "浅色", icon: Sun },
  { value: "dark" as const, label: "深色", icon: Moon },
  { value: "system" as const, label: "跟随系统", icon: Monitor },
];

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "shrink-0",
        )}
        aria-label="切换主题"
        disabled={!mounted}
      >
        {mounted ? <Icon className="size-4" /> : <Sun className="size-4 opacity-50" />}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1" sideOffset={8}>
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">外观</p>
        <div className="flex flex-col gap-0.5">
          {options.map(({ value, label, icon: OptIcon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                theme === value && "bg-muted font-medium",
              )}
            >
              <OptIcon className="size-4 opacity-80" />
              {label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
