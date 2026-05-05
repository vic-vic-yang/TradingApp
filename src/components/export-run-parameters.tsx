"use client";

import { Info } from "lucide-react";
import type { AnalysisPayload } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ANALYST_LABELS: Record<string, string> = {
  market: "市场与技术",
  social: "社交媒体",
  news: "新闻与内幕",
  fundamentals: "基本面",
};

const PROVIDER_LABELS: Record<string, string> = {
  deepseek: "DeepSeek",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google (Gemini)",
  xai: "xAI (Grok)",
  qwen: "Qwen (DashScope)",
  glm: "GLM (智谱)",
  mimo: "Xiaomi MiMo",
  openrouter: "OpenRouter",
  ollama: "Ollama",
  azure: "Azure OpenAI",
};

function formatAnalysts(keys: string[] | undefined): string {
  if (!keys?.length) return "—";
  return keys.map((k) => ANALYST_LABELS[k] ?? k).join("、");
}

function providerLabel(id: string | null | undefined): string {
  if (!id?.trim()) return "—";
  const k = id.toLowerCase();
  return PROVIDER_LABELS[k] ?? id;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-left">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="wrap-break-word text-[11px] font-medium leading-snug">{value}</dd>
    </div>
  );
}

function RunParametersBody({ runParameters }: { runParameters: AnalysisPayload }) {
  const rounds =
    runParameters.max_debate_rounds != null && Number.isFinite(runParameters.max_debate_rounds)
      ? String(runParameters.max_debate_rounds)
      : "—";
  const riskRounds =
    runParameters.max_risk_discuss_rounds != null &&
    Number.isFinite(runParameters.max_risk_discuss_rounds)
      ? String(runParameters.max_risk_discuss_rounds)
      : rounds;

  const checkpoint =
    runParameters.checkpoint_enabled === true
      ? "开启"
      : runParameters.checkpoint_enabled === false
        ? "关闭"
        : "—";

  return (
    <div className="space-y-2">
      <p className="border-b border-border pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        运行参数
      </p>
      <dl className="space-y-1.5">
        <DetailRow label="分析日" value={runParameters.trade_date?.trim() || "—"} />
        <DetailRow label="标的" value={runParameters.ticker?.trim().toUpperCase() || "—"} />
        <DetailRow label="LLM 厂商" value={providerLabel(runParameters.llm_provider)} />
        <DetailRow label="深度模型" value={runParameters.deep_think_llm?.trim() || "—"} />
        <DetailRow label="快速模型" value={runParameters.quick_think_llm?.trim() || "—"} />
        <DetailRow label="分析师" value={formatAnalysts(runParameters.analysts)} />
        <DetailRow label="辩论轮数" value={rounds} />
        <DetailRow label="风控轮数" value={riskRounds} />
        <DetailRow label="检查点" value={checkpoint} />
        <DetailRow label="输出语言" value={runParameters.output_language?.trim() || "—"} />
        {runParameters.google_thinking_level?.trim() ? (
          <DetailRow label="Gemini 思考" value={runParameters.google_thinking_level.trim()} />
        ) : null}
        {runParameters.openai_reasoning_effort?.trim() ? (
          <DetailRow label="OpenAI 推理" value={runParameters.openai_reasoning_effort.trim()} />
        ) : null}
        {runParameters.anthropic_effort?.trim() ? (
          <DetailRow label="Claude effort" value={runParameters.anthropic_effort.trim()} />
        ) : null}
        {runParameters.backend_url?.trim() ? (
          <DetailRow label="API 基址" value={runParameters.backend_url.trim()} />
        ) : null}
      </dl>
    </div>
  );
}

export type ExportRunParametersPanelProps = {
  runParameters: AnalysisPayload | null | undefined;
};

export function ExportRunParametersPanel({ runParameters }: ExportRunParametersPanelProps) {
  const hasParams = runParameters != null;

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors",
          "hover:border-border hover:bg-muted hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          !hasParams && "opacity-60",
        )}
        aria-label={hasParams ? "点击查看运行参数" : "无运行参数记录"}
      >
        <Info className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className={cn(
          "block max-h-[min(70vh,24rem)] max-w-md overflow-x-hidden overflow-y-auto p-3 text-left",
          "data-[side=bottom]:slide-in-from-top-2",
        )}
      >
        {hasParams ? (
          <RunParametersBody runParameters={runParameters} />
        ) : (
          <p className="max-w-xs text-left text-[11px] leading-relaxed text-muted-foreground">
            此批次未记录运行参数（例如由 CLI 生成，或保存于该功能上线前的报告）。
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
