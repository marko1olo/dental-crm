/**
 * useCopilotStudioLifecycle.ts — Runtime auto-detection, WakeLock, Escape handler,
 * external prompt fill event, and thread hydration effects for CopilotStudioModal.
 */

import { useEffect } from "react";
import { clientLogger } from "../../../services/logging/clientLogger";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { safeLocalStorageSetItem } from "../../../lib/safeLocalStorage";
import { detectRuntimeEnvironment, type CopilotRuntimeEnvironment } from "../../../store/copilotStore";
import { SHOWCASE_INITIAL_MESSAGES } from "../../../store/copilotShowcaseData";
import { parseChatMsgs, type CopilotChatMessage } from "./copilotStudioHelpers";

export function useCopilotStudioLifecycle(params: {
  isOpen: boolean;
  isSettingsOpen: boolean;
  isHistoryOpen: boolean;
  runtimeMode: CopilotRuntimeEnvironment;
  setRuntimeMode: (mode: CopilotRuntimeEnvironment) => void;
  threadKey: string;
  patientId?: string | null | undefined;
  threadMessages: Record<string, unknown[]>;
  suppressNextHydrateThreadRef: React.MutableRefObject<string | null>;
  hydrateSession: (sId: string) => Promise<boolean>;
  setAndTrackMessages: (
    updater: CopilotChatMessage[] | ((prev: CopilotChatMessage[]) => CopilotChatMessage[]),
  ) => void;
  onPromptFill: (prompt: string) => void;
  onClose: () => void;
}): void {
  const {
    isOpen,
    isSettingsOpen,
    isHistoryOpen,
    runtimeMode,
    setRuntimeMode,
    threadKey,
    patientId,
    threadMessages,
    suppressNextHydrateThreadRef,
    hydrateSession,
    setAndTrackMessages,
    onPromptFill,
    onClose,
  } = params;

  useEffect(() => {
    if (suppressNextHydrateThreadRef.current === threadKey) {
      suppressNextHydrateThreadRef.current = null;
      return;
    }
    setAndTrackMessages([]);
    const saved = threadMessages[threadKey];
    if (saved && saved.length > 0) {
      setAndTrackMessages(parseChatMsgs(saved as Array<Record<string, unknown>>));
    } else if (threadKey && threadKey !== "default-thread") {
      void hydrateSession(threadKey).then((ok) => {
        if (!ok && !isDemoShowcaseMode()) setAndTrackMessages([]);
      });
    } else if (isDemoShowcaseMode()) {
      setAndTrackMessages(SHOWCASE_INITIAL_MESSAGES as CopilotChatMessage[]);
    }
  }, [threadKey, patientId, hydrateSession, setAndTrackMessages, suppressNextHydrateThreadRef]);

  useEffect(() => {
    const handleFill = (e: Event) => {
      const prompt = (e as CustomEvent<{ prompt?: string }> | undefined)?.detail?.prompt;
      if (typeof prompt === "string" && prompt.trim()) {
        const cleaned = prompt.trim();
        onPromptFill(cleaned);
        safeLocalStorageSetItem("dente_copilot_draft_text", cleaned);
      }
    };
    window.addEventListener("dente:fill-copilot-input", handleFill);
    return () => window.removeEventListener("dente:fill-copilot-input", handleFill);
  }, [onPromptFill]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const detected = detectRuntimeEnvironment();
    if (detected === "desktop_native" && runtimeMode !== "desktop_native") {
      setRuntimeMode("desktop_native");
    } else if (
      (detected === "chairside_tablet" || detected === "mobile_tablet") &&
      runtimeMode !== detected
    ) {
      setRuntimeMode(detected);
    }
  }, [runtimeMode, setRuntimeMode]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof document !== "undefined") {
      document.body.classList.add("copilot-open", "copilot-studio-open");
    }
    let sentinel: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator && typeof navigator.wakeLock?.request === "function") {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          sentinel = lock;
        })
        .catch((err) => {
          clientLogger.debug("[CopilotStudioModal] WakeLock unavailable:", err);
        });
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSettingsOpen && !isHistoryOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (typeof document !== "undefined") {
        document.body.classList.remove("copilot-open", "copilot-studio-open");
      }
      sentinel?.release().catch((err) => {
        clientLogger.debug("[CopilotStudioModal] WakeLock release skipped:", err);
      });
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSettingsOpen, isHistoryOpen, onClose]);
}
