"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NotFoundError } from "@/lib/errors";
import { Home, ArrowLeftCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ApiErrorDisplay } from "@/components/api-error";

export default function NotFound() {
  const router = useRouter();
  const pathName = usePathname();
  const notFoundError = new NotFoundError("page", {
    path: pathName,
  });
  const getErrorActions = () => {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button variant="default" asChild className="gap-2">
          <Link href="/chat">
            <Home className="h-4 w-4" />
            <span>Go home</span>
          </Link>
        </Button>

        <Button
          variant="outline"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeftCircle className="h-4 w-4" />
          <span>Go back</span>
        </Button>
      </div>
    );
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Page not found</h2>
          <p className="text-muted-foreground">
            We couldn&apos;t find the page at {pathName} you&apos;re looking
            for.
          </p>
        </div>

        <ApiErrorDisplay error={notFoundError} actions={getErrorActions()} />
      </div>
    </div>
  );
}
