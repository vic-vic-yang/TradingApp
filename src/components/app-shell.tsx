"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  FolderOpen,
  Layers,
  LayoutDashboard,
  ScrollText,
  Settings,
} from "lucide-react";
import { tickerCodeForUrl } from "@/lib/exports-utils";
import { NewAnalysisTrigger } from "@/components/new-analysis-dialog";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const nav = [
  { href: "/", label: "概览", icon: LayoutDashboard },
  { href: "/jobs", label: "分析任务", icon: Brain },
  { href: "/results", label: "分析报告", icon: FolderOpen },
  { href: "/memory", label: "决策记忆", icon: ScrollText },
  { href: "/settings", label: "设置", icon: Settings },
];

function pageTitleFromPath(pathname: string): string {
  if (pathname === "/") return "概览";
  if (pathname.startsWith("/jobs")) return "分析任务";
  if (pathname.startsWith("/results/exports/")) return "导出报告";
  if (pathname.startsWith("/results/")) {
    const rest = pathname.slice("/results/".length);
    const first = rest.split("/")[0];
    if (first) return tickerCodeForUrl(decodeURIComponent(first));
  }
  if (pathname.startsWith("/results")) return "分析报告";
  if (pathname.startsWith("/memory")) return "决策记忆";
  if (pathname.startsWith("/settings")) return "设置";
  if (pathname.startsWith("/analyze")) return "新建分析";
  return "TradingAgents";
}

function NavLinks() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton
              isActive={active}
              tooltip={label}
              render={<Link href={href} />}
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
            >
              <Icon className="opacity-80" />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageTitle = pageTitleFromPath(pathname);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip="TradingAgents"
                render={<Link href="/" />}
              >
                <Layers className="size-4 opacity-90" />
                <span className="font-semibold tracking-tight">TradingAgents</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <NavLinks />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-4">
          <SidebarTrigger className="shrink-0" />
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight sm:text-lg">
            {pageTitle}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeSwitcher />
            <NewAnalysisTrigger size="sm" className="whitespace-nowrap">
              新建分析
            </NewAnalysisTrigger>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-4 lg:px-8">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
