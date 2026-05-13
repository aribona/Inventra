import Link from "next/link";
import { PackageSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-background p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto">
          <PackageSearch className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Page not found</h1>
          <p className="text-sm text-muted-foreground mt-1">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link
          href="/overview"
          className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Go to overview
        </Link>
      </div>
    </div>
  );
}
