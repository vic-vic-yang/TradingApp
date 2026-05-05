import { apiGet, apiGetText, apiPost, getApiBase } from "@/lib/api";
import type {
  AnalysisPayload,
  CliExportFilesResponse,
  CliExportSummary,
  JobRecord,
  MemoryEntry,
  PublicConfig,
  QuoteSnapshot,
} from "@/lib/types";

export type RuntimeLogMeta = { name: string; trade_date: string; path: string };

export function getApiDocsUrl(docsPath = "/docs"): string {
  return `${getApiBase()}${docsPath}`;
}

export function getHealth() {
  return apiGet<{ status: string }>("/health");
}

export function getPublicConfig() {
  return apiGet<PublicConfig>("/api/config");
}

export function clearCheckpoints() {
  return apiPost<{ removed: number }>("/api/checkpoints/clear", {});
}

export function startAnalysis(body: AnalysisPayload) {
  return apiPost<{ job_id: string }, AnalysisPayload>("/api/analyses", body);
}

export function listJobs() {
  return apiGet<JobRecord[]>("/api/analyses");
}

export function listTickers() {
  return apiGet<string[]>("/api/results/tickers");
}

export function listTickerLogs(ticker: string) {
  return apiGet<RuntimeLogMeta[]>(`/api/results/tickers/${encodeURIComponent(ticker)}/logs`);
}

export function getTickerLog(ticker: string, logName: string) {
  return apiGet<Record<string, unknown>>(
    `/api/results/tickers/${encodeURIComponent(ticker)}/logs/${encodeURIComponent(logName)}`,
  );
}

export function listExports() {
  return apiGet<CliExportSummary[]>("/api/reports/exports");
}

export function getExportFiles(exportId: string) {
  return apiGet<CliExportFilesResponse>(
    `/api/reports/exports/${encodeURIComponent(exportId)}/files`,
  );
}

export function getExportContent(exportId: string, path: string) {
  const q = new URLSearchParams({ path });
  return apiGetText(`/api/reports/exports/${encodeURIComponent(exportId)}/content?${q.toString()}`);
}

export function getQuote(ticker: string) {
  return apiGet<QuoteSnapshot>(`/api/quotes/${encodeURIComponent(ticker)}`);
}

export function listMemoryEntries() {
  return apiGet<MemoryEntry[]>("/api/memory/entries");
}
