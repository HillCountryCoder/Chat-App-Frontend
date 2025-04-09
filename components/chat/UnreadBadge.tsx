import React from "react";

interface UnreadBadgeProps {
  count: number;
  maxCount?: number;
  className?: string;
}

export default function UnreadBadge({
  count,
  maxCount = 99,
  className,
}: UnreadBadgeProps) {
  if (!count || count <= 0) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <div
      className={`
        bg-primary text-primary-foreground 
        flex items-center justify-center 
        rounded-full font-medium
        min-w-5 h-5 px-1.5 text-xs
        ${className || ""}
      `}
    >
      {count > 1 ? displayCount : null}
    </div>
  );
}
