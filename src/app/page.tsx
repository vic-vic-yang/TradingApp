"use client";

import { useEffect, useState } from "react";
import { Server } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { CliExportSummary, PublicConfig } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const [health, setHealth] = useState<"ok" | "err" | "loading">("loading");
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [tickers, setTickers] = useState<string[] | null>(null);
  const [exportsList, setExportsList] = useState<CliExportSummary[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await apiGet<{ status: string }>("/health");
        if (cancelled) return;
        setHealth("ok");
        const [cfg, t, ex] = await Promise.all([
          apiGet<PublicConfig>("/api/config"),
          apiGet<string[]>("/api/results/tickers"),
          apiGet<CliExportSummary[]>("/api/reports/exports"),
        ]);
        if (cancelled) return;
        setConfig(cfg);
        setTickers(t);
        setExportsList(ex);
      } catch (e) {
        if (cancelled) return;
        setHealth("err");
        setErr(e instanceof Error ? e.message : "无法连接 API");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cliCount = exportsList?.length ?? 0;
  const jsonTickerCount = tickers?.length ?? 0;

  return (
    <div className="space-y-8">
      <p className="text-muted-foreground">
        管理 TradingAgents 分析任务、报告与记忆日志。
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API 状态</CardTitle>
            <Server className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {health === "loading" && <Skeleton className="h-7 w-24" />}
            {health === "ok" && (
              <Badge variant="default" className="mt-1">
                已连接
              </Badge>
            )}
            {health === "err" && (
              <div className="space-y-2">
                <Badge variant="destructive">未连接</Badge>
                <p className="text-xs text-muted-foreground break-all">{err}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">已保存的报告</CardTitle>
            <CardDescription>本地保存的完整报告份数、有运行记录的标的数</CardDescription>
          </CardHeader>
          <CardContent>
            {health === "ok" && exportsList == null && tickers == null ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-3xl font-semibold tabular-nums">{cliCount}</p>
                  <p className="text-xs text-muted-foreground">已保存报告</p>
                </div>
                <div>
                  <p className="text-3xl font-semibold tabular-nums">{jsonTickerCount}</p>
                  <p className="text-xs text-muted-foreground">有记录的标的</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">默认模型</CardTitle>
            <CardDescription>来自后端配置（需在环境中设置 API Key）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {config ? (
              <>
                <p>
                  <span className="text-muted-foreground">Provider:</span>{" "}
                  {config.default_llm_provider}
                </p>
                <p className="truncate" title={config.default_deep_think_llm}>
                  <span className="text-muted-foreground">Deep:</span>{" "}
                  {config.default_deep_think_llm}
                </p>
                <p className="truncate" title={config.default_quick_think_llm}>
                  <span className="text-muted-foreground">Quick:</span>{" "}
                  {config.default_quick_think_llm}
                </p>
              </>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
