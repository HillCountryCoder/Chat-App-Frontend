"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Subscribe to hydration events
    const unsubHydrate = useAuthStore.persist.onHydrate(() => setHydrated(false));
    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => setHydrated(true));

    // Check current hydration status
    setHydrated(useAuthStore.persist.hasHydrated());

    return () => {
      unsubHydrate();
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
}