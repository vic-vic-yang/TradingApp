"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { CliExportSummary, QuoteSnapshot } from "@/lib/types";
import { tickerForExport } from "@/lib/exports-utils";
import { RatingBadge } from "@/components/rating-badge";
import { cn } from "@/lib/utils";
import { getQuote, listExports } from "@/service/trading-api";

const ORDER_KEY = "trading-web:analysis-board-order";

function mergeOrder(allTickers: string[], saved: string[] | null): string[] {
  if (!saved?.length) return [...allTickers].sort();
  const set = new Set(allTickers);
  const ordered = saved.filter((t) => set.has(t));
  for (const t of allTickers) {
    if (!ordered.includes(t)) ordered.push(t);
  }
  return ordered;
}

function formatAnalysisTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(n: number | null | undefined, currency: string | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + (currency ? ` ${currency}` : "");
}

function formatChangePct(p: number | null | undefined): string {
  if (p == null || Number.isNaN(p)) return "—";
  const pct = p * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strip ``601800 (中国交建)`` down to ``中国交建`` so the card title is not duplicated. */
function normalizeCardZhLabel(label: string, ticker: string): string {
  const raw = label.trim();
  const t = ticker.trim();
  if (!raw) return "";
  const m = raw.match(new RegExp(`^${escapeRegExp(t)}\\s*[(（]\\s*([^）)]+)\\s*[)）]\\s*$`));
  if (m) return (m[1] ?? "").trim();
  return raw;
}

type SortableStockCardProps = {
  ticker: string;
  quote: QuoteSnapshot | undefined;
  displayNameZh: string | null;
  decision: string | null;
  analysisTimeLabel: string;
  detailHref: string;
};

function SortableStockCard({
  ticker,
  quote,
  displayNameZh,
  decision,
  analysisTimeLabel,
  detailHref,
}: SortableStockCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ticker,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };
  const change = quote?.change_pct;
  const changeColor =
    change == null || Number.isNaN(change)
      ? "text-muted-foreground"
      : change > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : change < 0
          ? "text-red-600 dark:text-red-400"
          : "text-muted-foreground";

  const zhMerged = (quote?.name_zh || displayNameZh || "").trim();
  const zhNorm = zhMerged ? normalizeCardZhLabel(zhMerged, ticker) || zhMerged : "";
  const zhLabel = zhNorm && zhNorm !== ticker ? zhNorm : null;
  const titleLine = zhLabel ? `${ticker}（${zhLabel}）` : ticker;
  const showEnglishSub =
    !zhLabel &&
    quote?.name &&
    quote.name !== quote.symbol &&
    quote.name.toUpperCase() !== ticker.toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        isDragging && "opacity-90 ring-2 ring-ring",
      )}
    >
      <button
        type="button"
        className="absolute left-2 top-2.5 z-10 flex size-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label="拖动排序"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <Link
        href={detailHref}
        className="block p-3.5 pl-11 pb-3.5 outline-none transition-colors hover:bg-muted/40"
      >
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 truncate text-base font-semibold leading-tight">{titleLine}</p>
            <RatingBadge rating={decision} className="shrink-0 text-xs" />
          </div>
          {showEnglishSub ? (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{quote.name}</p>
          ) : null}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">价格</p>
            <p className="font-medium tabular-nums">{formatPrice(quote?.price ?? null, quote?.currency ?? null)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">涨跌</p>
            <p className={cn("font-medium tabular-nums", changeColor)}>{formatChangePct(change ?? null)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">上次分析</p>
            <p className="text-xs text-foreground/90">{analysisTimeLabel}</p>
          </div>
        </div>
      </Link>
    </div>
  );
}

export default function ResultsIndexPage() {
  const [exports, setExports] = useState<CliExportSummary[] | null>(null);
  const [errExports, setErrExports] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Record<string, QuoteSnapshot>>({});
  const [orderedTickers, setOrderedTickers] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  useEffect(() => {
    listExports()
      .then(setExports)
      .catch((e) => setErrExports(e instanceof Error ? e.message : "导出列表加载失败"));
  }, []);

  /** 仅来自 reports 下已保存批次（文件夹命名含股票代码与日期时间） */
  const exportsByTicker = useMemo(() => {
    const m = new Map<string, CliExportSummary[]>();
    for (const ex of exports ?? []) {
      const t = tickerForExport(ex);
      if (!t) continue;
      const arr = m.get(t) ?? [];
      arr.push(ex);
      m.set(t, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => b.modified_at.localeCompare(a.modified_at));
    }
    return m;
  }, [exports]);

  const tickersMerged = useMemo(() => [...exportsByTicker.keys()].sort(), [exportsByTicker]);

  const mergedKey = useMemo(() => [...tickersMerged].sort().join("\0"), [tickersMerged]);

  useEffect(() => {
    if (tickersMerged.length === 0) {
      setTimeout(() => {
        setOrderedTickers([]);
      }, 0);
      return;
    }
    let saved: string[] | null = null;
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(ORDER_KEY) : null;
      if (raw) saved = JSON.parse(raw) as string[];
    } catch {
      saved = null;
    }
    setTimeout(() => {
      setOrderedTickers(mergeOrder(tickersMerged, saved));
    }, 0);
  }, [mergedKey, tickersMerged]);

  useEffect(() => {
    if (tickersMerged.length === 0) {
      setTimeout(() => {
        setQuotes({});
      }, 0);
      return;
    }
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        tickersMerged.map((t) => getQuote(t).catch(() => null)),
      );
      if (cancelled) return;
      const next: Record<string, QuoteSnapshot> = {};
      tickersMerged.forEach((t, i) => {
        const q = results[i];
        if (q) next[t] = q;
      });
      setQuotes(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [mergedKey, tickersMerged]);

  const mergedReady = exports !== null || errExports !== null;

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrderedTickers((items) => {
      const oldIndex = items.indexOf(String(active.id));
      const newIndex = items.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return items;
      const next = arrayMove(items, oldIndex, newIndex);
      try {
        window.localStorage.setItem(ORDER_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {mergedReady && orderedTickers.length > 0 ? (
        <p className="text-sm font-medium text-foreground">
          共 {orderedTickers.length} 只股票
        </p>
      ) : null}

      {errExports && (
        <p className="text-sm text-destructive" role="alert">
          {errExports}
        </p>
      )}

      {!mergedReady && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {mergedReady && orderedTickers.length === 0 && (
        <p className="text-sm text-muted-foreground">
          暂无标的。请在分析结束后将报告保存到{" "}
          <code className="rounded bg-muted px-1 text-xs">reports/</code>（批次文件夹名将用于识别股票代码）。
        </p>
      )}

      {mergedReady && orderedTickers.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={orderedTickers} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {orderedTickers.map((t) => {
                const exList = exportsByTicker.get(t) ?? [];
                const latestSaved =
                  exList.find((e) => e.has_complete_report) ?? exList[0] ?? null;
                const decision = latestSaved?.decision ?? null;
                const analysisTimeLabel = latestSaved ? formatAnalysisTime(latestSaved.modified_at) : "—";
                const detailHref = latestSaved
                  ? `/results/${encodeURIComponent(t)}`
                  : `/analyze?ticker=${encodeURIComponent(t)}`;
                const displayNameZh = latestSaved?.display_name_zh?.trim() || null;
                return (
                  <SortableStockCard
                    key={t}
                    ticker={t}
                    quote={quotes[t]}
                    displayNameZh={displayNameZh}
                    decision={decision}
                    analysisTimeLabel={analysisTimeLabel}
                    detailHref={detailHref}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

    </div>
  );
}
