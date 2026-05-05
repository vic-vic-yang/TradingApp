"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { MemoryEntry, PublicConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getPublicConfig, listMemoryEntries } from "@/service/trading-api";
import { RatingBadge } from "@/components/rating-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[] | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async (opts?: { reset?: boolean }) => {
    const reset = opts?.reset ?? true;
    if (reset) {
      setErr(null);
      setLoading(true);
      setEntries(null);
    }
    try {
      const [cfg, list] = await Promise.all([getPublicConfig(), listMemoryEntries()]);
      setConfig(cfg);
      setEntries(list);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "加载失败");
      setConfig(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load({ reset: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            后端 Markdown 记忆日志解析结果，用于跨运行上下文（与 CLI 共用同一文件）。每次分析
            <strong className="font-medium text-foreground">成功结束</strong>
            后追加一条；下次对同一标的再跑分析时会尝试回填收益并生成反思。
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load({ reset: true })}
          disabled={loading}
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>条目</CardTitle>
          <CardDescription>
            pending 表示等待后续价格回填与反思。环境变量{" "}
            <code className="rounded bg-muted px-1 text-xs">TRADINGAGENTS_MEMORY_LOG_PATH</code>{" "}
            可覆盖默认日志路径。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {err && <p className="mb-4 text-sm text-destructive">{err}</p>}
          {loading && entries == null && !err && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {entries !== null && entries.length === 0 && !err && (
            <div className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              <p>
                当前没有可展示的条目。常见原因：尚未有一次<strong className="font-medium text-foreground">跑完全程</strong>
                的分析（任务失败不会写入），或日志文件仍是空的。
              </p>
              {config?.memory_log_path ? (
                <p className="font-mono text-xs break-all text-foreground/90">
                  后端使用的日志路径：<span className="text-foreground">{config.memory_log_path}</span>
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href="/analyze"
                  className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                >
                  去新建分析
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void load({ reset: true })}
                >
                  重新加载
                </Button>
              </div>
            </div>
          )}
          {entries && entries.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>标的</TableHead>
                    <TableHead>评级</TableHead>
                    <TableHead className="hidden sm:table-cell">收益</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e, i) => {
                    const key = `${e.date}-${e.ticker}-${i}`;
                    const open = expanded === key;
                    return (
                      <Fragment key={key}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => setExpanded(open ? null : key)}
                        >
                          <TableCell className="whitespace-nowrap">{e.date}</TableCell>
                          <TableCell className="font-medium">{e.ticker}</TableCell>
                          <TableCell>
                            <RatingBadge rating={e.rating} />
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">
                            {e.raw ?? "—"} {e.alpha ? `/ ${e.alpha}` : ""}
                          </TableCell>
                          <TableCell>
                            {e.pending ? (
                              <Badge variant="outline">pending</Badge>
                            ) : (
                              <Badge variant="secondary">已闭环</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                        {open && (
                          <TableRow>
                            <TableCell colSpan={5} className="bg-muted/30 p-0">
                              <ScrollArea className="max-h-72">
                                <div className="space-y-3 p-4 text-sm">
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                                      决策摘录
                                    </p>
                                    <pre className="whitespace-pre-wrap wrap-break-word font-mono text-xs">
                                      {e.decision || "—"}
                                    </pre>
                                  </div>
                                  {e.reflection ? (
                                    <div>
                                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                                        反思
                                      </p>
                                      <pre className="whitespace-pre-wrap wrap-break-word font-mono text-xs">
                                        {e.reflection}
                                      </pre>
                                    </div>
                                  ) : null}
                                </div>
                              </ScrollArea>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
