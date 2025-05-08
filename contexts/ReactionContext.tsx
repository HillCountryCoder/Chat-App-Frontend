'use client'
import React, { createContext, useState, useEffect, useCallback } from "react";

type ReactionContextType = {
  activeMessageId: string | null;
  setActiveMessageId: (id: string | null) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (isOpen: boolean) => void;
  closeAllMenus: () => void;
};

export const ReactionContext = createContext<ReactionContextType | undefined>(
  undefined,
);

export function ReactionProvider({ children }: { children: React.ReactNode }) {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeAllMenus = useCallback(() => {
    setActiveMessageId(null);
    setIsMenuOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only run this if a menu is open
      if (isMenuOpen) {
        // Find if we clicked on a reaction menu or its children
        const target = event.target as HTMLElement;
        const isReactionMenu = target.closest("[data-reaction-menu]");
        const isReactionTrigger = target.closest("[data-reaction-trigger]");

        // If we didn't click on a menu or trigger, close all menus
        if (!isReactionMenu && !isReactionTrigger) {
          closeAllMenus();
        }
      }
    };

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen, closeAllMenus]);

  return (
    <ReactionContext.Provider
      value={{
        activeMessageId,
        setActiveMessageId,
        isMenuOpen,
        setIsMenuOpen,
        closeAllMenus,
      }}
    >
      {children}
    </ReactionContext.Provider>
  );
}
