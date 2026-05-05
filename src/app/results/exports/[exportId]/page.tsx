"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { apiGet, apiGetText } from "@/lib/api";
import { tickerCodeForUrl } from "@/lib/exports-utils";
import { splitMarkdownByH2 } from "@/lib/markdown-tabs";
import type { CliExportFilesResponse } from "@/lib/types";
import { ExportRunParametersPanel } from "@/components/export-run-parameters";
import { MarkdownBody } from "@/components/markdown-body";
import { RatingBadge } from "@/components/rating-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COMPLETE_PATH = "complete_report.md";

export default function CliExportDetailPage({
  params,
}: {
  params: Promise<{ exportId: string }>;
}) {
  const { exportId: rawId } = use(params);
  const exportId = decodeURIComponent(rawId);
  const [filesRes, setFilesRes] = useState<CliExportFilesResponse | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setLoadingFiles(true);
    setErr(null);
    setContent(null);
    setActiveTab("");
    apiGet<CliExportFilesResponse>(`/api/reports/exports/${encodeURIComponent(exportId)}/files`)
      .then((r) => {
        if (cancelled) return;
        setFilesRes(r);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoadingFiles(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exportId]);

  const hasComplete = useMemo(
    () => filesRes?.files.some((f) => f.path === COMPLETE_PATH) ?? false,
    [filesRes],
  );

  useEffect(() => {
    if (!filesRes || !hasComplete) {
      setContent(null);
      return;
    }
    let cancelled = false;
    setLoadingContent(true);
    const q = new URLSearchParams({ path: COMPLETE_PATH });
    apiGetText(`/api/reports/exports/${encodeURIComponent(exportId)}/content?${q.toString()}`)
      .then((t) => {
        if (!cancelled) setContent(t);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "读取失败");
      })
      .finally(() => {
        if (!cancelled) setLoadingContent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exportId, filesRes, hasComplete]);

  const sections = useMemo(
    () => (content != null ? splitMarkdownByH2(content) : []),
    [content],
  );

  useEffect(() => {
    if (sections.length && !sections.some((s) => s.id === activeTab)) {
      setActiveTab(sections[0]!.id);
    }
  }, [sections, activeTab]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/results"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "mb-2 -ml-2 h-8 px-2",
          })}
        >
          ← 返回分析报告
        </Link>
        <h1 className="break-all font-mono text-base font-semibold tracking-tight sm:text-2xl">
          {exportId}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          完整报告按章节分为多个标签页（来源：{COMPLETE_PATH}）。
        </p>
        {filesRes && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span>
              <span className="text-muted-foreground">标的：</span>
              <span className="font-semibold tabular-nums">{filesRes.ticker || "—"}</span>
            </span>
            <span>
              <span className="text-muted-foreground">日期：</span>
              <span className="tabular-nums">{filesRes.analysis_date || "—"}</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-muted-foreground">决策：</span>
              <RatingBadge rating={filesRes.decision || null} />
            </span>
            {filesRes.ticker ? (
              <Link
                href={`/analyze?ticker=${encodeURIComponent(tickerCodeForUrl(filesRes.ticker ?? ""))}`}
                className={buttonVariants({
                  size: "sm",
                  className: "inline-flex gap-1.5",
                })}
              >
                <RefreshCw className="size-3.5" />
                再分析
              </Link>
            ) : null}
            <ExportRunParametersPanel runParameters={filesRes.run_parameters ?? null} />
          </div>
        )}
      </div>

      {err && (
        <p className="text-sm text-destructive break-all" role="alert">
          {err}
        </p>
      )}

      {loadingFiles && <Skeleton className="h-48 w-full" />}

      {!loadingFiles && filesRes && filesRes.files.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>无 Markdown 文件</CardTitle>
          </CardHeader>
        </Card>
      )}

      {!loadingFiles && filesRes && filesRes.files.length > 0 && !hasComplete && (
        <Card>
          <CardHeader>
            <CardTitle>未找到完整报告</CardTitle>
            <CardDescription>该批次目录中没有 {COMPLETE_PATH}。</CardDescription>
          </CardHeader>
        </Card>
      )}

      {hasComplete && (
        <Card>
          <CardHeader>
            <CardTitle>报告正文</CardTitle>
            <CardDescription>章节标签来自 {COMPLETE_PATH} 中的二级标题（##）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingContent && <Skeleton className="h-40 w-full" />}
            {!loadingContent && content != null && sections.length > 0 && activeTab && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <ScrollArea className="w-full pb-2">
                  <TabsList
                    variant="line"
                    className="h-auto min-h-8 w-max max-w-full flex-wrap justify-start gap-1"
                  >
                    {sections.map((s) => (
                      <TabsTrigger key={s.id} value={s.id} className="shrink-0 text-xs sm:text-sm">
                        {s.title}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>
                {sections.map((s) => (
                  <TabsContent key={s.id} value={s.id} className="mt-4 outline-none">
                    <ScrollArea className="h-[min(70vh,560px)] rounded-lg border border-border">
                      <div className="p-4 sm:p-6">
                        <MarkdownBody content={s.body} />
                      </div>
                    </ScrollArea>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
