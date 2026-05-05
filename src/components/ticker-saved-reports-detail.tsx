"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiGetText } from "@/lib/api";
import {
  filterExportsForTicker,
  formatExportListTime,
} from "@/lib/exports-utils";
import type { CliExportFilesResponse, CliExportSummary, QuoteSnapshot } from "@/lib/types";
import { ExportRunParametersPanel } from "@/components/export-run-parameters";
import { MarkdownBody } from "@/components/markdown-body";
import { useOpenNewAnalysis } from "@/components/new-analysis-dialog";
import { RatingBadge } from "@/components/rating-badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const TAB_KEYS = [
  "analysts",
  "research",
  "trading",
  "risk",
  "portfolio",
  "complete",
] as const;

export type ReportTabKey = (typeof TAB_KEYS)[number];

const DEFAULT_REPORT_TAB: ReportTabKey = "portfolio";

const TAB_SPECS: { key: ReportTabKey; label: string; dir?: string; file?: string }[] = [
  { key: "analysts", label: "数据", dir: "1_analysts" },
  { key: "research", label: "辩论", dir: "2_research" },
  { key: "trading", label: "交易", dir: "3_trading" },
  { key: "risk", label: "风险", dir: "4_risk" },
  { key: "portfolio", label: "决策", dir: "5_portfolio" },
  { key: "complete", label: "完整报告", file: "complete_report.md" },
];

type TickerSavedReportsDetailProps = {
  ticker: string;
};

function mergeQuery(
  pathname: string,
  current: URLSearchParams,
  updates: Record<string, string | null>,
): string {
  const params = new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(updates)) {
    if (v == null || v === "") params.delete(k);
    else params.set(k, v);
  }
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}

function pathsForTab(files: { path: string }[], spec: (typeof TAB_SPECS)[number]): string[] {
  if (spec.file) {
    const hit = files.find((f) => f.path === spec.file);
    return hit ? [hit.path] : [];
  }
  if (spec.dir) {
    const prefix = `${spec.dir}/`;
    return files
      .filter((f) => f.path.startsWith(prefix) && f.path.toLowerCase().endsWith(".md"))
      .map((f) => f.path)
      .sort((a, b) => a.localeCompare(b));
  }
  return [];
}

function formatQuotePrice(n: number | null | undefined, currency: string | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return (
    new Intl.NumberFormat("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n) + (currency ? ` ${currency}` : "")
  );
}

function formatQuoteChangePct(p: number | null | undefined): string {
  if (p == null || Number.isNaN(p)) return "—";
  const pct = p * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function TickerSavedReportsDetail({ ticker }: TickerSavedReportsDetailProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const openAnalysisDialog = useOpenNewAnalysis();

  const [allExports, setAllExports] = useState<CliExportSummary[] | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);

  const forTicker = useMemo(
    () => (allExports ? filterExportsForTicker(allExports, ticker) : []),
    [allExports, ticker],
  );

  const exportFromUrl = searchParams.get("export")?.trim() ?? "";
  const tabFromUrl = searchParams.get("tab")?.trim() ?? "";

  const selectedExportId = useMemo(() => {
    if (!forTicker.length) return "";
    if (exportFromUrl && forTicker.some((e) => e.id === exportFromUrl)) return exportFromUrl;
    return forTicker[0]!.id;
  }, [forTicker, exportFromUrl]);

  const activeTab: ReportTabKey = useMemo(() => {
    if (tabFromUrl && TAB_KEYS.includes(tabFromUrl as ReportTabKey)) return tabFromUrl as ReportTabKey;
    return DEFAULT_REPORT_TAB;
  }, [tabFromUrl]);

  const [filesRes, setFilesRes] = useState<CliExportFilesResponse | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesErr, setFilesErr] = useState<string | null>(null);

  const [tabBodies, setTabBodies] = useState<Partial<Record<ReportTabKey, string>>>({});
  const [tabLoading, setTabLoading] = useState(false);
  const [tabErr, setTabErr] = useState<string | null>(null);
  const contentCache = useRef<Map<string, string>>(new Map());
  const [quote, setQuote] = useState<QuoteSnapshot | null>(null);
  const [quoteReady, setQuoteReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<CliExportSummary[]>("/api/reports/exports")
      .then((rows) => {
        if (!cancelled) {
          setAllExports(rows);
          setListErr(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setListErr(e instanceof Error ? e.message : "加载报告列表失败");
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      setQuoteReady(false);
      setQuote(null);
    });
    apiGet<QuoteSnapshot>(`/api/quotes/${encodeURIComponent(ticker)}`)
      .then((q) => {
        if (!cancelled) {
          setQuote(q);
          setQuoteReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQuote(null);
          setQuoteReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const selectedExportSummary = useMemo(
    () => forTicker.find((e) => e.id === selectedExportId),
    [forTicker, selectedExportId],
  );

  const displayNameZh = useMemo(() => {
    const fromFiles = filesRes?.display_name_zh?.trim();
    if (fromFiles) return fromFiles;
    const fromList = selectedExportSummary?.display_name_zh?.trim();
    if (fromList) return fromList;
    return quote?.name_zh?.trim() || "";
  }, [filesRes?.display_name_zh, quote?.name_zh, selectedExportSummary?.display_name_zh]);

  const changePctClass = useMemo(() => {
    const change = quote?.change_pct;
    if (change == null || Number.isNaN(change)) return "text-muted-foreground";
    if (change > 0) return "text-emerald-600 dark:text-emerald-400";
    if (change < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  }, [quote?.change_pct]);

  // Default export in URL (newest first = selectedExportId when URL missing / invalid)
  useEffect(() => {
    if (!forTicker.length || !selectedExportId) return;
    if (exportFromUrl === selectedExportId) return;
    router.replace(
      mergeQuery(pathname, searchParams, {
        export: selectedExportId,
        tab: tabFromUrl && TAB_KEYS.includes(tabFromUrl as ReportTabKey) ? tabFromUrl : null,
      }),
    );
  }, [exportFromUrl, forTicker.length, pathname, router, searchParams, selectedExportId, tabFromUrl]);

  useEffect(() => {
    if (!selectedExportId) {
      void Promise.resolve().then(() => {
        setFilesRes(null);
        setFilesErr(null);
      });
      return;
    }
    contentCache.current = new Map();
    let cancelled = false;
    startTransition(() => {
      setTabBodies({});
      setFilesLoading(true);
      setFilesErr(null);
    });
    apiGet<CliExportFilesResponse>(
      `/api/reports/exports/${encodeURIComponent(selectedExportId)}/files`,
    )
      .then((r) => {
        if (!cancelled) setFilesRes(r);
      })
      .catch((e) => {
        if (!cancelled) setFilesErr(e instanceof Error ? e.message : "加载文件列表失败");
      })
      .finally(() => {
        if (!cancelled) setFilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedExportId]);

  const loadTabMarkdown = useCallback(async (exportId: string, tab: ReportTabKey, paths: string[]) => {
    const cacheKey = `${exportId}::${tab}`;
    const hit = contentCache.current.get(cacheKey);
    if (hit !== undefined) {
      setTabBodies((prev) => ({ ...prev, [tab]: hit }));
      return;
    }
    if (!paths.length) {
      contentCache.current.set(cacheKey, "");
      setTabBodies((prev) => ({ ...prev, [tab]: "" }));
      return;
    }
    setTabLoading(true);
    setTabErr(null);
    try {
      const parts: string[] = [];
      for (const rel of paths) {
        const q = new URLSearchParams({ path: rel });
        const text = await apiGetText(
          `/api/reports/exports/${encodeURIComponent(exportId)}/content?${q}`,
        );
        const title =
          paths.length > 1
            ? `### ${rel.includes("/") ? rel.split("/").pop() : rel}\n\n`
            : "";
        parts.push(title + text);
      }
      const merged = parts.join("\n\n---\n\n");
      contentCache.current.set(cacheKey, merged);
      setTabBodies((prev) => ({ ...prev, [tab]: merged }));
    } catch (e) {
      setTabErr(e instanceof Error ? e.message : "读取失败");
    } finally {
      setTabLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedExportId || !filesRes?.files.length) return;
    const spec = TAB_SPECS.find((s) => s.key === activeTab);
    if (!spec) return;
    const paths = pathsForTab(filesRes.files, spec);
    void loadTabMarkdown(selectedExportId, activeTab, paths);
  }, [activeTab, filesRes, loadTabMarkdown, selectedExportId]);

  const onPickExport = (id: string) => {
    contentCache.current = new Map();
    setTabBodies({});
    router.replace(
      mergeQuery(pathname, searchParams, {
        export: id,
        tab: activeTab === DEFAULT_REPORT_TAB ? null : activeTab,
      }),
    );
  };

  const onTabChange = (v: string) => {
    const key = v as ReportTabKey;
    if (!TAB_KEYS.includes(key)) return;
    router.replace(
      mergeQuery(pathname, searchParams, {
        export: selectedExportId || null,
        tab: key === DEFAULT_REPORT_TAB ? null : key,
      }),
    );
  };

  if (listErr) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {listErr}
      </p>
    );
  }

  if (allExports === null) {
    return <Skeleton className="h-[min(70vh,560px)] w-full" />;
  }

  if (forTicker.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>暂无已保存报告</CardTitle>
          <CardDescription>
            在{" "}
            <code className="rounded bg-muted px-1 text-xs">reports/</code>{" "}
            下未找到该标的的批次目录。完成分析并保存报告后将显示在此处。
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            <span className="tabular-nums">{ticker}</span>
            {displayNameZh ? (
              <span className="text-foreground/90"> · {displayNameZh}</span>
            ) : null}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() =>
              openAnalysisDialog({
                ticker: ticker.trim().toUpperCase(),
                title: "更新报告",
                description: (
                  <>
                    与顶部「新建分析」使用同一套表单，标的已预填。确认模型与分析师等参数后提交，即可重新跑分析并生成新的报告批次。
                  </>
                ),
              })
            }
          >
            更新报告
          </Button>
        </div>
        {!displayNameZh && !filesLoading && forTicker.length > 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            未从报告标题解析到中文简称；已尝试行情接口。
          </p>
        ) : null}
        {!quoteReady ? (
          <div className="mt-3 flex items-center gap-3 overflow-x-auto pb-1">
            <Skeleton className="h-7 w-24 shrink-0" />
            <Skeleton className="h-7 w-24 shrink-0" />
            <Skeleton className="h-7 w-20 shrink-0" />
            <Skeleton className="h-7 w-24 shrink-0" />
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-4 overflow-x-auto pb-1 text-sm whitespace-nowrap">
            <span>
              <span className="text-muted-foreground">价格：</span>
              <span className="font-medium tabular-nums">
                {formatQuotePrice(quote?.price ?? null, quote?.currency ?? null)}
              </span>
            </span>
            <span>
              <span className="text-muted-foreground">涨跌：</span>
              <span className={cn("font-medium tabular-nums", changePctClass)}>
                {formatQuoteChangePct(quote?.change_pct ?? null)}
              </span>
            </span>
            {filesRes ? (
              <>
                <span>
                  <span className="text-muted-foreground">决策：</span>
                  <RatingBadge rating={filesRes.decision || null} />
                </span>
                {filesRes.analysis_date ? (
                  <span>
                    <span className="text-muted-foreground">分析日：</span>
                    <span className="tabular-nums">{filesRes.analysis_date}</span>
                  </span>
                ) : null}
                <ExportRunParametersPanel runParameters={filesRes.run_parameters ?? null} />
              </>
            ) : null}
          </div>
        )}
        {quote?.error ? (
          <p className="mt-1 text-xs text-muted-foreground">{quote.error}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="lg:hidden">
        <Select value={selectedExportId} onValueChange={(v) => v && onPickExport(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="选择报告批次" />
          </SelectTrigger>
          <SelectContent>
            {forTicker.map((ex) => (
              <SelectItem key={ex.id} value={ex.id}>
                {formatExportListTime(ex.modified_at)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <aside className="hidden w-full shrink-0 lg:block lg:w-56 xl:w-64">
        <ScrollArea className="h-[min(55vh,420px)] rounded-lg border border-border lg:h-[min(70vh,560px)]">
          <div className="flex flex-col gap-1 p-2">
            {forTicker.map((ex) => {
              const active = ex.id === selectedExportId;
              return (
                <Button
                  key={ex.id}
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "h-auto w-full justify-start whitespace-normal px-3 py-2 text-left font-normal",
                    active && "ring-1 ring-border",
                  )}
                  onClick={() => onPickExport(ex.id)}
                >
                  <span className="block w-full text-xs leading-snug">
             
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {formatExportListTime(ex.modified_at)}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      <div className="min-w-0 flex-1 space-y-3">
        {filesErr && (
          <p className="text-sm text-destructive break-all" role="alert">
            {filesErr}
          </p>
        )}

        {filesLoading && <Skeleton className="h-64 w-full" />}

        {!filesLoading && filesRes && (
          <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList
                variant="line"
                className="h-auto min-h-9 w-max max-w-full flex-wrap justify-start gap-1"
              >
                {TAB_SPECS.map((spec) => (
                  <TabsTrigger key={spec.key} value={spec.key} className="shrink-0 text-xs sm:text-sm">
                    {spec.label}
                  </TabsTrigger>
                ))}
              </TabsList>

            {TAB_SPECS.map((spec) => {
              const paths = pathsForTab(filesRes.files, spec);
              const body = tabBodies[spec.key];
              const empty = paths.length === 0;
              const isActive = activeTab === spec.key;

              return (
                <TabsContent key={spec.key} value={spec.key} className="mt-4 outline-none">
                  {tabErr && isActive && (
                    <p className="mb-2 text-sm text-destructive">{tabErr}</p>
                  )}
                  {isActive && tabLoading && <Skeleton className="h-64 w-full" />}
                  {!empty && body !== undefined && !(isActive && tabLoading) && (
                    <ScrollArea className="h-[min(70vh,560px)] rounded-lg border border-border">
                      <div className="p-4 sm:p-6">
                        {body.trim() ? (
                          <MarkdownBody content={body} />
                        ) : (
                          <p className="text-sm text-muted-foreground">该部分暂无内容</p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                  {empty && !(isActive && tabLoading) && (
                    <p className="text-sm text-muted-foreground">该部分暂无文件</p>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>
      </div>
    </div>
  );
}
