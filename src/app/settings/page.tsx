"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PublicConfig } from "@/lib/types";
import {
  clearCheckpoints,
  getApiDocsUrl,
  getPublicConfig,
} from "@/service/trading-api";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ConfigTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-xs">
        <tbody>
          {rows.map(({ label, value }) => (
            <tr key={label} className="border-b border-border last:border-b-0">
              <th
                scope="row"
                className="w-[40%] max-w-52 whitespace-normal py-2.5 pl-3 pr-3 align-top text-xs font-medium leading-snug text-muted-foreground md:w-44 md:max-w-none md:whitespace-nowrap md:py-2 md:pl-4 md:pr-4 md:text-right"
              >
                {label}
              </th>
              <td className="py-2.5 pr-3 align-top font-mono text-xs leading-snug text-foreground md:py-2 md:pr-4">
                {value?.trim() ? value : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getPublicConfig()
      .then(setConfig)
      .catch(() => toast.error("无法加载配置，请确认后端已启动"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onClearCheckpoints = async () => {
    if (
      !window.confirm(
        "将删除所有 LangGraph 检查点数据库（与 CLI --clear-checkpoints 相同）。确定继续？",
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      const res = await clearCheckpoints();
      toast.success(`已删除 ${res.removed} 个检查点文件`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "清空失败");
    } finally {
      setClearing(false);
    }
  };

  const docsHref = getApiDocsUrl(config?.docs_url ?? "/docs");
  const keys = config?.api_keys_configured
    ? Object.entries(config.api_keys_configured).sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            与 README / 默认配置对齐的只读信息；API Key 仅显示是否已配置，不展示密钥。
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API</CardTitle>
          <CardDescription>交互式接口文档</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={docsHref}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex gap-1.5")}
          >
            <ExternalLink className="size-4" />
            打开 Swagger /docs
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>路径与默认值</CardTitle>
          <CardDescription>
            与{" "}
            <code className="rounded bg-muted px-1">default_config</code>{" "}
            一致；报告目录为{" "}
            <code className="rounded bg-muted px-1">save_report_to_disk</code> / 分析报告批次根路径（未设{" "}
            <code className="rounded bg-muted px-1">TRADINGAGENTS_CLI_REPORTS_DIR</code>{" "}
            时为当前后端进程的 <code className="rounded bg-muted px-1">cwd/reports</code>
            ）。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !config ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : config ? (
            <ConfigTable
              rows={[
                {
                  label: "结果目录",
                  value: config.results_dir,
                },
                {
                  label: "报告目录",
                  value: config.cli_reports_dir ?? "",
                },
                {
                  label: "数据缓存",
                  value: config.data_cache_dir,
                },
                {
                  label: "决策记忆日志",
                  value: config.memory_log_path ?? "",
                },
                {
                  label: "记忆条数上限",
                  value:
                    config.memory_log_max_entries != null
                      ? String(config.memory_log_max_entries)
                      : "未限制",
                },
                {
                  label: "默认输出语言",
                  value: config.default_output_language ?? "",
                },
                {
                  label: "默认开启检查点",
                  value: config.default_checkpoint_enabled ? "是" : "否",
                },
              ]}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>数据源与工具</CardTitle>
          <CardDescription>data_vendors / tool_vendors（来自 default_config）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!config ? null : (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">数据 vendor</p>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                  {Object.keys(config.data_vendors ?? {}).length === 0 ? (
                    <span className="text-muted-foreground">（空）</span>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border/60">
                      {Object.entries(config.data_vendors ?? {}).map(([k, v]) => (
                        <li
                          key={k}
                          className="grid grid-cols-1 gap-0.5 py-2 first:pt-0 last:pb-0 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-baseline sm:gap-x-4"
                        >
                          <span className="shrink-0 font-mono font-medium text-foreground sm:text-right">
                            {k}
                          </span>
                          <span className="min-w-0 break-all font-mono text-muted-foreground">{v}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">工具 vendor</p>
                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                  {Object.keys(config.tool_vendors ?? {}).length === 0 ? (
                    <span className="text-muted-foreground">（空）</span>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border/60">
                      {Object.entries(config.tool_vendors ?? {}).map(([k, v]) => (
                        <li
                          key={k}
                          className="grid grid-cols-1 gap-0.5 py-2 first:pt-0 last:pb-0 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-baseline sm:gap-x-4"
                        >
                          <span className="shrink-0 font-mono font-medium text-foreground sm:text-right">
                            {k}
                          </span>
                          <span className="min-w-0 break-all font-mono text-muted-foreground">{v}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Key 状态</CardTitle>
          <CardDescription>环境变量是否已设置（不读取具体值）</CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <span className="text-sm text-muted-foreground">加载后显示</span>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {keys.map(([id, ok]) => (
                <li
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
                >
                  <span className="font-mono font-medium text-foreground">{id}</span>
                  <Badge variant={ok ? "default" : "secondary"} className="shrink-0 font-normal">
                    {ok ? "已配置" : "未配置"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>检查点</CardTitle>
          <CardDescription>LangGraph 恢复用 SQLite 数据库</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config ? (
            <>
              <ConfigTable
                rows={[
                  { label: "目录", value: config.checkpoint_dir ?? "" },
                  {
                    label: "数据库文件数",
                    value:
                      config.checkpoint_db_count != null
                        ? String(config.checkpoint_db_count)
                        : "—",
                  },
                ]}
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={clearing}
                onClick={onClearCheckpoints}
              >
                {clearing ? "清空中…" : "清空所有检查点"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">加载中…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
