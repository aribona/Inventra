"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mx-auto">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Page failed to load</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {error.message || "An unexpected error occurred on this page."}
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" onClick={() => router.push("/overview")}>
            Go to overview
          </Button>
          <Button size="sm" className="gap-1.5" onClick={reset}>
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
