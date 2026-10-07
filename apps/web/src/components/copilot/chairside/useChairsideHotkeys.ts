/**
 * useChairsideHotkeys.ts — Chairside Copilot Hotkeys & Custom Event Listeners Hook.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 500 lines.
 * - Mandate 8e: Doctor Autonomy (instant hotkey dispatch).
 * - Mandate 8l: Fast chairside HUD shortcuts.
 */

import { useEffect, type RefObject } from "react";
import type { ChairsideToothProposal } from "./chairsideTypes";

export interface UseChairsideHotkeysOptions {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsMinimized: React.Dispatch<React.SetStateAction<boolean>>;
  inputRef: RefObject<HTMLInputElement | null>;
  toothProposal: ChairsideToothProposal;
  handleApplyTooth: () => void;
  handleApplyAll: () => void;
  handleToggleVoice?: (() => void) | undefined;
}

export function useChairsideHotkeys({
  setIsOpen,
  setIsMinimized,
  inputRef,
  toothProposal,
  handleApplyTooth,
  handleApplyAll,
  handleToggleVoice,
}: UseChairsideHotkeysOptions) {
  useEffect(() => {
    const handleToggleEvent = () => {
      setIsOpen((prev) => !prev);
      setIsMinimized(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") || (e.altKey && e.key.toLowerCase() === "c")) {
        e.preventDefault();
        handleToggleEvent();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsMinimized((prev) => !prev);
        return;
      }
      if (e.code === "Space" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const isEditingText =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable;
        if (!isEditingText && handleToggleVoice) {
          e.preventDefault();
          handleToggleVoice();
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleApplyAll();
        } else if (
          document.activeElement === inputRef.current ||
          (e.target as HTMLElement)?.closest?.(".chairside-copilot-hud")
        ) {
          if (toothProposal.toothNumber && toothProposal.state && !toothProposal.applied) {
            e.preventDefault();
            handleApplyTooth();
          }
        }
      }
    };

    window.addEventListener("dente:toggle-chairside-hud", handleToggleEvent);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("dente:toggle-chairside-hud", handleToggleEvent);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setIsOpen, setIsMinimized, inputRef, toothProposal, handleApplyTooth, handleApplyAll, handleToggleVoice]);
}
