"use client";

import { Suspense, use, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TickerSavedReportsDetail } from "@/components/ticker-saved-reports-detail";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { tickerCodeForUrl } from "@/lib/exports-utils";

export default function ResultTickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker: tickerParam } = use(params);
  const router = useRouter();
  const raw = decodeURIComponent(tickerParam);
  const ticker = tickerCodeForUrl(raw);

  useEffect(() => {
    if (!ticker || raw === ticker) return;
    const q = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`/results/${encodeURIComponent(ticker)}${q}`);
  }, [raw, ticker, router]);

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/results"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2 h-8 px-2",
          })}
        >
          ← 返回分析报告
        </Link>
        <h1 className="sr-only">
          {ticker} 报告详情
        </h1>
      </div>

      <Suspense fallback={<Skeleton className="h-[min(70vh,560px)] w-full" />}>
        <TickerSavedReportsDetail ticker={ticker} />
      </Suspense>
    </div>
  );
}
