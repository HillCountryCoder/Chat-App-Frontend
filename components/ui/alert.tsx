import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive bg-destructive/10 dark:bg-destructive/20 *:data-[slot=alert-description]:text-destructive/90",
        success:
          "border-green-500/50 text-green-700 dark:border-green-600 dark:text-green-300 [&>svg]:text-green-600 bg-green-100 dark:bg-green-950/50 *:data-[slot=alert-description]:text-green-700/90 dark:*:data-[slot=alert-description]:text-green-300/90",
        warning:
          "border-yellow-500/50 text-yellow-700 dark:border-yellow-600 dark:text-yellow-300 [&>svg]:text-yellow-600 bg-yellow-100 dark:bg-yellow-950/50 *:data-[slot=alert-description]:text-yellow-700/90 dark:*:data-[slot=alert-description]:text-yellow-300/90",
        info: "border-blue-500/50 text-blue-700 dark:border-blue-600 dark:text-blue-300 [&>svg]:text-blue-600 bg-blue-100 dark:bg-blue-950/50 *:data-[slot=alert-description]:text-blue-700/90 dark:*:data-[slot=alert-description]:text-blue-300/90",
        neutral:
          "border-gray-200 text-gray-800 dark:border-gray-700 dark:text-gray-300 [&>svg]:text-gray-500 bg-gray-100 dark:bg-gray-800/50 *:data-[slot=alert-description]:text-gray-600 dark:*:data-[slot=alert-description]:text-gray-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
