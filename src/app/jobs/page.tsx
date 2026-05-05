import { Suspense } from "react";
import { JobsContent } from "./jobs-content";
import { Skeleton } from "@/components/ui/skeleton";

function JobsFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<JobsFallback />}>
      <JobsContent />
    </Suspense>
  );
}
