import { Suspense } from "react";
import { AnalyzeForm } from "./analyze-form";
import { Skeleton } from "@/components/ui/skeleton";

function AnalyzeFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<AnalyzeFallback />}>
      <AnalyzeForm />
    </Suspense>
  );
}
