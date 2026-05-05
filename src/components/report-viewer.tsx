"use client";

import { MarkdownBody } from "@/components/markdown-body";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

type LogJson = Record<string, unknown>;

/** Report fields are Markdown strings; debate state objects render as fenced JSON. */
function sectionMarkdown(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  return "```json\n" + JSON.stringify(raw, null, 2) + "\n```";
}

const SECTIONS: { key: keyof LogJson | string; label: string }[] = [
  { key: "market_report", label: "市场" },
  { key: "sentiment_report", label: "情绪" },
  { key: "news_report", label: "新闻" },
  { key: "fundamentals_report", label: "基本面" },
  { key: "investment_debate_state", label: "多空辩论" },
  { key: "risk_debate_state", label: "风险辩论" },
  { key: "trader_investment_decision", label: "交易员" },
  { key: "investment_plan", label: "投资计划" },
  { key: "final_trade_decision", label: "最终决策" },
];

export function ReportViewer({ data }: { data: LogJson }) {
  const company = String(data.company_of_interest ?? "");
  const date = String(data.trade_date ?? "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{company || "—"}</span>
        <span>·</span>
        <span>{date || "—"}</span>
      </div>
      <Tabs defaultValue={SECTIONS[0]?.key} className="w-full">
        <ScrollArea className="w-full pb-2">
          <TabsList className="inline-flex h-auto w-max min-w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
            {SECTIONS.map(({ key, label }) => {
              const has = key in data && data[key as string] != null;
              if (!has) return null;
              return (
                <TabsTrigger
                  key={String(key)}
                  value={String(key)}
                  className="text-xs sm:text-sm"
                >
                  {label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>
        {SECTIONS.map(({ key, label }) => {
          if (!(key in data) || data[key as string] == null) return null;
          return (
            <TabsContent key={String(key)} value={String(key)} className="mt-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto pr-1">
                  <MarkdownBody content={sectionMarkdown(data[key as string])} />
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
