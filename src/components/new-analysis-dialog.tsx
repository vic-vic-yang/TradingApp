"use client";

import type { ReactElement, ReactNode } from "react";
import { Suspense, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnalyzeForm } from "@/app/analyze/analyze-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { useGlobalDialog } from "@/components/global-dialog-provider";
import { Skeleton } from "@/components/ui/skeleton";
import type { VariantProps } from "class-variance-authority";

function FormFallback() {
  return (
    <div className="space-y-3 py-2">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

type BtnVariants = VariantProps<typeof buttonVariants>;

const DEFAULT_NEW_ANALYSIS_DESCRIPTION: ReactElement = (
  <>
    任务在后台执行；默认厂商为 DeepSeek，切换厂商前请在{" "}
    <code className="rounded bg-muted px-1 text-xs">.env</code> 中配置对应 API Key。
  </>
);

export type OpenNewAnalysisOptions = {
  ticker?: string;
  title?: ReactNode;
  description?: ReactNode;
};

/** 任意客户端组件内调用，打开「新建分析」弹层（需已在布局中挂载 GlobalDialogProvider） */
export function useOpenNewAnalysis() {
  const { open, close } = useGlobalDialog();
  const router = useRouter();
  const sessionKey = useRef(0);

  return useCallback(
    (opts?: OpenNewAnalysisOptions) => {
      sessionKey.current += 1;
      const initialTicker = opts?.ticker?.trim();
      open({
        contentKey: sessionKey.current,
        contentClassName:
          "max-h-[min(90vh,880px)] w-full max-w-2xl gap-0 overflow-y-auto p-4 sm:max-w-2xl",
        title: opts?.title ?? "新建分析",
        description: opts?.description ?? DEFAULT_NEW_ANALYSIS_DESCRIPTION,
        headerClassName: "pb-3",
        content: (
          <Suspense fallback={<FormFallback />}>
            <AnalyzeForm
              variant="embedded"
              initialTicker={initialTicker}
              onSubmitted={(jobId) => {
                close();
                router.push(`/jobs?highlight=${encodeURIComponent(jobId)}`);
              }}
            />
          </Suspense>
        ),
      });
    },
    [open, close, router],
  );
}

type NewAnalysisTriggerProps = {
  variant?: BtnVariants["variant"];
  size?: BtnVariants["size"];
  className?: string;
  children?: ReactNode;
  ticker?: string;
};

export function NewAnalysisTrigger({
  variant = "default",
  size = "default",
  className,
  children,
  ticker,
}: NewAnalysisTriggerProps) {
  const openNewAnalysis = useOpenNewAnalysis();
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => openNewAnalysis(ticker ? { ticker } : undefined)}
    >
      {children ?? "新建分析"}
    </Button>
  );
}
