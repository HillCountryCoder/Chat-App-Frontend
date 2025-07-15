"use client";

import { StatusSelector } from "./StatusSelector";

export function UserActivityStatus() {
  return (
    <StatusSelector
      variant="compact"
      showLabel={true}
      className="bg-muted/50 hover:bg-muted/70"
    />
  );
}
