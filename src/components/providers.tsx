"use client";

import { ThemeProvider } from "next-themes";
import { GlobalDialogProvider } from "@/components/global-dialog-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <GlobalDialogProvider>{children}</GlobalDialogProvider>
      </TooltipProvider>
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  );
}
