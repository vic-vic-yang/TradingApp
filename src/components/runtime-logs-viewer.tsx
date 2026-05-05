"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReportViewer } from "@/components/report-viewer";
import { getTickerLog, listTickerLogs, type RuntimeLogMeta } from "@/service/trading-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type RuntimeLogsViewerProps = {
  ticker: string;
  /** Optional ?date=YYYY-MM-DD from URL */
  useUrlDate?: boolean;
};

export function RuntimeLogsViewer({ ticker, useUrlDate = false }: RuntimeLogsViewerProps) {
  const searchParams = useSearchParams();
  const initialDate = useUrlDate ? searchParams.get("date") : null;

  const [logs, setLogs] = useState<LogMeta[] | null>(null);
  const [selected, setSelected] = useState<string | null>(initialDate);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLog, setLoadingLog] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setErr(null);
    setSelected(null);
    listTickerLogs(ticker)
      .then((list) => {
        if (cancelled) return;
        setLogs(list);
        const pick =
          (initialDate && list.find((l) => l.trade_date === initialDate)?.trade_date) ??
          (list.length ? list[list.length - 1].trade_date : null);
        setSelected(pick);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, initialDate]);

  useEffect(() => {
    if (!selected || !ticker) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoadingLog(true);
    const name = `full_states_log_${selected}.json`;
    getTickerLog(ticker, name)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "读取日志失败");
      })
      .finally(() => {
        if (!cancelled) setLoadingLog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, selected]);

  return (
    <div className="space-y-4">
      {err && (
        <p className="text-sm text-destructive break-all" role="alert">
          {err}
        </p>
      )}

      {loadingList && <Skeleton className="h-64 w-full" />}

      {!loadingList && logs?.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>无运行快照</CardTitle>
            <CardDescription>该标的下尚未生成 TradingAgentsStrategy_logs</CardDescription>
          </CardHeader>
        </Card>
      )}

      {logs && logs.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <label className="mb-1 block text-xs text-muted-foreground">交易日期</label>
            <Select value={selected ?? undefined} onValueChange={(v) => setSelected(v)}>
              <SelectTrigger>
                <SelectValue placeholder="选择日期" />
              </SelectTrigger>
              <SelectContent>
                {logs.map((l) => (
                  <SelectItem key={l.trade_date} value={l.trade_date}>
                    {l.trade_date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {selected && logs && logs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">分析详情</CardTitle>
            <CardDescription>分析日：{selected}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLog && <Skeleton className="h-48 w-full" />}
            {!loadingLog && data && <ReportViewer data={data} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
