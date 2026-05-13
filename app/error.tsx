"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex h-screen items-center justify-center bg-background p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Something went wrong</h1>
              <p className="text-sm text-muted-foreground mt-1">
                An unexpected error occurred. Our team has been notified.
              </p>
            </div>
            <Button onClick={reset} className="w-full">Try again</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
