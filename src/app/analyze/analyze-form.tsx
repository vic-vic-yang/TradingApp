"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { type FieldPath, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { AnalysisPayload, PublicConfig } from "@/lib/types";
import { analyzeFormSchema, type AnalyzeFormValues } from "@/app/analyze/analyze-form-schema";
import { getPublicConfig, startAnalysis } from "@/service/trading-api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ANALYST_LABELS: Record<string, string> = {
  market: "市场与技术",
  social: "社交媒体",
  news: "新闻与内幕",
  fundamentals: "基本面",
};

const FIXED_OUTPUT_LANGUAGE = "Chinese";

function todayLocalISODate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type AnalyzeFormProps = {
  variant?: "page" | "embedded";
  onSubmitted?: (jobId: string) => void;
  initialTicker?: string;
};

function pickModelsForProvider(
  provider: string,
  cfg: PublicConfig,
  preferDeep?: string | null,
  preferQuick?: string | null,
): { deep: string; quick: string } | null {
  const cat = cfg.model_catalog?.[provider];
  if (!cat?.deep?.length || !cat?.quick?.length) return null;
  const deepIds = cat.deep.map((o) => o.id);
  const quickIds = cat.quick.map((o) => o.id);

  const deep =
    (preferDeep && deepIds.includes(preferDeep) ? preferDeep : null) ??
    (cfg.default_llm_provider === provider &&
    cfg.default_deep_think_llm &&
    deepIds.includes(cfg.default_deep_think_llm)
      ? cfg.default_deep_think_llm
      : null) ??
    deepIds[0]!;
  const quick =
    (preferQuick && quickIds.includes(preferQuick) ? preferQuick : null) ??
    (cfg.default_llm_provider === provider &&
    cfg.default_quick_think_llm &&
    quickIds.includes(cfg.default_quick_think_llm)
      ? cfg.default_quick_think_llm
      : null) ??
    quickIds[0]!;
  return { deep, quick };
}

export function AnalyzeForm({ variant = "page", onSubmitted, initialTicker }: AnalyzeFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<PublicConfig | null>(null);

  const tickerPrefill = useMemo(() => {
    return (initialTicker?.trim() || searchParams.get("ticker")?.trim() || "").toUpperCase();
  }, [initialTicker, searchParams]);

  const form = useForm<AnalyzeFormValues>({
    resolver: zodResolver(analyzeFormSchema),
    defaultValues: {
      ticker: "",
      llmProvider: "deepseek",
      deepModelId: "",
      quickModelId: "",
      customDeep: "",
      customQuick: "",
      researchDepth: "1",
      checkpoint: false,
      analysts: {},
    },
    mode: "onSubmit",
  });

  const applyConfigToForm = useCallback(
    (c: PublicConfig) => {
      const analysts: Record<string, boolean> = {};
      for (const a of c.analyst_order) analysts[a] = true;
      const p = c.default_llm_provider || "deepseek";
      const picked = pickModelsForProvider(p, c, c.default_deep_think_llm, c.default_quick_think_llm);
      form.reset({
        ticker: tickerPrefill || form.getValues("ticker") || "",
        llmProvider: p,
        deepModelId: picked?.deep ?? "",
        quickModelId: picked?.quick ?? "",
        customDeep: "",
        customQuick: "",
        researchDepth: form.getValues("researchDepth"),
        checkpoint: !!c.default_checkpoint_enabled,
        analysts,
      });
    },
    [form, tickerPrefill],
  );

  useEffect(() => {
    let cancelled = false;
    getPublicConfig()
      .then((c) => {
        if (cancelled) return;
        setConfig(c);
      })
      .catch(() => {
        if (!cancelled) toast.error("无法加载配置，请确认后端已启动");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!config) return;
    applyConfigToForm(config);
  }, [config, applyConfigToForm]);

  const onProviderChange = (p: string) => {
    form.setValue("customDeep", "");
    form.setValue("customQuick", "");
    if (config?.model_catalog?.[p]) {
      const picked = pickModelsForProvider(p, config, null, null);
      if (picked) {
        form.setValue("deepModelId", picked.deep);
        form.setValue("quickModelId", picked.quick);
      }
    }
  };

  const onValid = async (values: AnalyzeFormValues) => {
    const analysts = Object.entries(values.analysts)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const deepResolved =
      values.deepModelId === "custom" ? values.customDeep.trim() : values.deepModelId.trim();
    const quickResolved =
      values.quickModelId === "custom" ? values.customQuick.trim() : values.quickModelId.trim();
    const rounds = Number.parseInt(values.researchDepth, 10);
    const tradeDate = todayLocalISODate();

    const body: AnalysisPayload = {
      ticker: values.ticker.trim().toUpperCase(),
      trade_date: tradeDate,
      analysts,
      max_debate_rounds: Number.isFinite(rounds) ? rounds : 1,
      max_risk_discuss_rounds: Number.isFinite(rounds) ? rounds : 1,
      checkpoint_enabled: values.checkpoint,
      debug: true,
      llm_provider: values.llmProvider,
      deep_think_llm: deepResolved,
      quick_think_llm: quickResolved,
      output_language: FIXED_OUTPUT_LANGUAGE,
    };

    try {
      const res = await startAnalysis(body);
      toast.success("任务已排队");
      if (onSubmitted) {
        onSubmitted(res.job_id);
      } else {
        router.push(`/jobs?highlight=${res.job_id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提交失败");
    }
  };

  const llmProvider = useWatch({ control: form.control, name: "llmProvider" }) ?? "";
  const deepModelId = useWatch({ control: form.control, name: "deepModelId" }) ?? "";
  const quickModelId = useWatch({ control: form.control, name: "quickModelId" }) ?? "";
  const cat = config?.model_catalog?.[llmProvider];
  const fromHistory = Boolean(tickerPrefill);
  const embedded = variant === "embedded";
  const analystOrder = config?.analyst_order ?? ["market", "social", "news", "fundamentals"];
  const analystsErr = form.formState.errors.analysts;

  return (
    <div className={embedded ? "space-y-4" : "space-y-6"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">新建分析</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            任务在后台线程执行。默认厂商为 DeepSeek；切换厂商时请确保{" "}
            <code className="rounded bg-muted px-1 text-xs">.env</code>{" "}
            中已配置对应 API Key。
            {fromHistory && (
              <span className="mt-1 block text-primary">已从分析报告带入标的。</span>
            )}
          </p>
        </div>
      )}
      {embedded && fromHistory ? (
        <p className="text-sm text-primary">已从分析报告带入标的。</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>参数</CardTitle>
          <CardDescription>模型、标的与分析师；分析日为提交当日，报告固定中文输出。</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onValid)} className="space-y-6">
              <FormField
                control={form.control}
                name="llmProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LLM 厂商</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        if (v == null) return;
                        field.onChange(v);
                        onProviderChange(v);
                      }}
                      disabled={!config}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="加载中…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(config?.llm_providers ?? [{ id: "deepseek", label: "DeepSeek" }]).map(
                          (p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="deepModelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>深度推理模型</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                        disabled={!cat?.deep?.length}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择模型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cat?.deep.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              <span className="line-clamp-2 text-left">{opt.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quickModelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>快速模型</FormLabel>
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                        disabled={!cat?.quick?.length}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择模型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cat?.quick.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              <span className="line-clamp-2 text-left">{opt.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {deepModelId === "custom" && (
                <FormField
                  control={form.control}
                  name="customDeep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>自定义深度模型 ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="例如 my-model" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {quickModelId === "custom" && (
                <FormField
                  control={form.control}
                  name="customQuick"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>自定义快速模型 ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="自定义模型 ID" autoComplete="off" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="ticker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标的代码（全球）</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Yahoo Finance 代码，如 NVDA、AAPL、SAP.DE、BP.L、7203.T、0700.HK"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormDescription className="text-xs leading-relaxed">
                      行情与历史数据走 Yahoo Finance（yfinance），支持美股、欧股、日股、港股等主要市场；请按该数据源使用的代码填写（含交易所后缀，如{" "}
                      <code className="rounded bg-muted px-1 text-[11px]">.L</code> /{" "}
                      <code className="rounded bg-muted px-1 text-[11px]">.T</code>{" "}
                      等）。仅填中国大陆 A 股 6 位数字时，后端会按规则尝试补{" "}
                      <code className="rounded bg-muted px-1 text-[11px]">.SS</code> /{" "}
                      <code className="rounded bg-muted px-1 text-[11px]">.SZ</code> /{" "}
                      <code className="rounded bg-muted px-1 text-[11px]">.BJ</code>。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <p className="text-sm font-medium leading-none">分析师</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {analystOrder.map((key) => (
                    <FormField
                      key={key}
                      control={form.control}
                      name={`analysts.${key}` as FieldPath<AnalyzeFormValues>}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted/50">
                          <FormControl>
                            <Checkbox
                              checked={!!field.value}
                              onCheckedChange={(c) => field.onChange(c === true)}
                            />
                          </FormControl>
                          <FormLabel className="mt-0! cursor-pointer font-normal">
                            {ANALYST_LABELS[key] ?? key}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                {analystsErr && typeof analystsErr.message === "string" ? (
                  <p className="text-sm font-medium text-destructive">{analystsErr.message}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="researchDepth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>研究深度</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">浅（1 轮，与 CLI 默认一致）</SelectItem>
                          <SelectItem value="3">中（3 轮）</SelectItem>
                          <SelectItem value="5">深（5 轮）</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        同时作用于辩论与风控讨论轮数（与 CLI 快捷选项一致）。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="checkpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>检查点恢复</FormLabel>
                      <Select
                        value={field.value ? "on" : "off"}
                        onValueChange={(v) => field.onChange(v === "on")}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="off">关闭</SelectItem>
                          <SelectItem value="on">开启（崩溃后可恢复）</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "提交中…" : "开始分析"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
