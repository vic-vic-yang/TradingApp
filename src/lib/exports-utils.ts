import type { CliExportSummary } from "@/lib/types";

/** 从批次文件夹名解析代码：与后端一致 `{代码}_{8位日期}_{6位时间}` */
export function inferTickerFromExportId(exportId: string): string | null {
  const m = exportId.match(/^(.+)_(\d{8})_(\d{6})$/);
  return m?.[1]?.trim() || null;
}

/**
 * 路由、分组、行情 API：去掉「代码（中文名）」等展示后缀，只保留标的代码。
 * 例如 `601800（中国交建）` → `601800`。
 */
export function tickerCodeForUrl(raw: string): string {
  let s = raw.trim();
  if (!s) return "";
  for (let i = 0; i < 4; i++) {
    const next = s
      .replace(/（[^）]*）\s*$/u, "")
      .replace(/\([^)]*\)\s*$/u, "")
      .trim();
    if (next === s) break;
    s = next;
  }
  const head = s.split(/[\s\u3000]+/u)[0]?.trim() ?? s;
  return head;
}

export function tickerForExport(ex: { id: string; ticker: string }): string {
  const t = ex.ticker?.trim();
  const raw = (t || inferTickerFromExportId(ex.id) || "").trim();
  return tickerCodeForUrl(raw);
}

/** 宽松匹配：大小写、可选 .SS/.SZ/.BJ 后缀；会先规范化展示用后缀 */
export function tickersMatch(pageTicker: string, exportTicker: string): boolean {
  const strip = (s: string) =>
    tickerCodeForUrl(s)
      .toUpperCase()
      .replace(/\.(SS|SZ|BJ)$/i, "");
  const a = strip(pageTicker);
  const b = strip(exportTicker);
  if (!a || !b) return false;
  return a === b;
}

export function filterExportsForTicker(
  all: CliExportSummary[],
  pageTicker: string,
): CliExportSummary[] {
  const rows = all.filter((ex) => tickersMatch(pageTicker, tickerForExport(ex)));
  rows.sort((a, b) => b.modified_at.localeCompare(a.modified_at));
  return rows;
}

export function formatExportListTime(iso: string | undefined): string {
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
