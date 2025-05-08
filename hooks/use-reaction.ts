import { ReactionContext } from "@/contexts/ReactionContext";
import { useContext } from "react";

export function useReaction() {
  const context = useContext(ReactionContext);

  if (context === undefined) {
    throw new Error("useReaction must be used within a ReactionProvider");
  }

  return context;
}
