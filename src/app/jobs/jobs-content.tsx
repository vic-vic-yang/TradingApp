"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { tickerCodeForUrl } from "@/lib/exports-utils";
import type { JobRecord } from "@/lib/types";
import { listJobs } from "@/service/trading-api";
import { RatingBadge } from "@/components/rating-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function statusVariant(s: JobRecord["status"]) {
  switch (s) {
    case "completed":
      return "default" as const;
    case "failed":
      return "destructive" as const;
    case "running":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export function JobsContent() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight");
  const [jobs, setJobs] = useState<JobRecord[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const hasActive = useMemo(
    () => jobs?.some((j) => j.status === "queued" || j.status === "running"),
    [jobs],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await listJobs();
        if (!cancelled) {
          setJobs(data);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "加载失败");
      }
    };
    load();
    const t = setInterval(() => {
      load();
    }, hasActive ? 2500 : 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [hasActive]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        分析在服务端后台执行；进行中任务会自动刷新。
      </p>

      <Card>
        <CardHeader>
          <CardTitle>最近任务</CardTitle>
          <CardDescription>仅保存在当前 API 进程内存中，重启后清空</CardDescription>
        </CardHeader>
        <CardContent>
          {err && <p className="mb-4 text-sm text-destructive">{err}</p>}
          {jobs == null ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无任务，去「新建分析」发起一次。</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>状态</TableHead>
                    <TableHead>标的</TableHead>
                    <TableHead>日期</TableHead>
                    <TableHead>评级</TableHead>
                    <TableHead className="hidden lg:table-cell">报告目录</TableHead>
                    <TableHead className="hidden md:table-cell">更新</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => {
                    const isHi = highlight === j.job_id;
                    return (
                      <TableRow
                        key={j.job_id}
                        className={isHi ? "bg-muted/60" : undefined}
                      >
                        <TableCell>
                          <Badge variant={statusVariant(j.status)}>{j.status}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{j.ticker ?? "—"}</TableCell>
                        <TableCell>{j.trade_date ?? "—"}</TableCell>
                        <TableCell>
                          <RatingBadge rating={j.rating} />
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] lg:table-cell">
                          {j.status === "completed" && j.report_dir ? (
                            <span
                              className="block truncate text-xs text-muted-foreground"
                              title={j.complete_report_path ?? j.report_dir}
                            >
                              {j.report_dir}
                            </span>
                          ) : j.status === "completed" && j.report_save_error ? (
                            <span
                              className="text-xs text-destructive"
                              title={j.report_save_error}
                            >
                              保存失败
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden max-w-[200px] truncate text-muted-foreground md:table-cell">
                          {j.updated_at}
                        </TableCell>
                        <TableCell className="text-right">
                          {j.status === "completed" && j.ticker && j.trade_date ? (
                            <Link
                              href={`/results/${encodeURIComponent(tickerCodeForUrl(j.ticker ?? ""))}?date=${encodeURIComponent(j.trade_date)}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              报告
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {jobs?.some((j) => j.status === "failed" && j.error) && (
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-medium text-destructive">失败详情</p>
              {jobs
                .filter((j) => j.status === "failed" && j.error)
                .map((j) => (
                  <pre
                    key={j.job_id}
                    className="overflow-x-auto rounded-md bg-muted p-3 text-xs"
                  >
                    {j.error}
                  </pre>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
