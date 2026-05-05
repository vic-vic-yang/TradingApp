export type JobStatus = "queued" | "running" | "completed" | "failed";

export type JobRecord = {
  job_id: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  ticker: string | null;
  trade_date: string | null;
  rating: string | null;
  log_path: string | null;
  report_dir: string | null;
  complete_report_path: string | null;
  report_save_error: string | null;
  error: string | null;
};

export type ModelOption = { label: string; id: string };

export type ProviderModels = { quick: ModelOption[]; deep: ModelOption[] };

export type LlmProviderOption = { id: string; label: string };

export type PublicConfig = {
  analyst_order: string[];
  default_analysts: string[];
  results_dir: string;
  data_cache_dir: string;
  memory_log_path?: string;
  memory_log_max_entries?: number;
  default_llm_provider: string;
  default_deep_think_llm: string;
  default_quick_think_llm: string;
  default_output_language?: string;
  default_checkpoint_enabled?: boolean;
  checkpoint_backend_available?: boolean;
  data_vendors?: Record<string, string>;
  tool_vendors?: Record<string, string>;
  llm_providers?: LlmProviderOption[];
  model_catalog?: Record<string, ProviderModels>;
  cli_reports_dir?: string;
  api_keys_configured?: Record<string, boolean>;
  checkpoint_dir?: string;
  checkpoint_db_count?: number;
  docs_url?: string;
};

/**
 * Per-ticker quote from GET /api/quotes/{ticker}.
 * Price: Yahoo Finance (yfinance) when available; bare 6-digit A-shares fall back to Eastmoney push2.
 */
export type QuoteSnapshot = {
  symbol: string;
  ticker: string;
  name: string;
  /** Chinese short/long name from yfinance when available (6-digit A-share). */
  name_zh: string | null;
  price: number | null;
  change_pct: number | null;
  currency: string | null;
  as_of: string | null;
  /** `yahoo` | `eastmoney` | `none` — which source supplied `price`. */
  quote_source?: string;
  error: string | null;
};

/** One saved batch under reports/ from GET /api/reports/exports; ticker from folder name or report text. */
export type CliExportSummary = {
  id: string;
  modified_at: string;
  has_complete_report: boolean;
  ticker: string;
  analysis_date: string;
  decision: string;
  /** Optional Chinese name parsed from that batch's markdown H1 (no per-symbol map in code). */
  display_name_zh?: string;
};

export type AnalysisPayload = {
  ticker: string;
  trade_date: string;
  analysts: string[];
  max_debate_rounds?: number | null;
  max_risk_discuss_rounds?: number | null;
  checkpoint_enabled?: boolean;
  debug?: boolean;
  llm_provider?: string | null;
  deep_think_llm?: string | null;
  quick_think_llm?: string | null;
  output_language?: string | null;
  backend_url?: string | null;
  google_thinking_level?: string | null;
  openai_reasoning_effort?: string | null;
  anthropic_effort?: string | null;
};

export type CliExportFilesResponse = {
  export_id: string;
  files: { path: string; name: string }[];
  ticker: string;
  analysis_date: string;
  decision: string;
  /** Parsed from batch markdown H1 when available (same as export list row). */
  display_name_zh?: string;
  /** Present when the batch was saved from the web API (run_parameters.json on disk). */
  run_parameters?: AnalysisPayload | null;
};

export type MemoryEntry = {
  date: string;
  ticker: string;
  rating: string;
  pending: boolean;
  raw: string | null;
  alpha: string | null;
  holding: string | null;
  decision: string;
  reflection: string;
};
