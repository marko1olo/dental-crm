/**
 * useWorkspaceProfile — Feature Toggle Engine
 * Reads flags from the server once, stores in Zustand + localStorage,
 * provides typed selectors for all UI consumers.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
export interface WorkspaceFeatureFlags {
  hasAssistants: boolean;
  hasMultipleChairs: boolean;
  hasDentalLab: boolean;
  hasInsuranceCoPay: boolean;
  hasInstallments: boolean;
  workspacePreset: string;
  onboardingCompleted: boolean;
  hasPediatricMode: boolean;
  isOmniRole: boolean;
}

interface WorkspaceProfileStore extends WorkspaceFeatureFlags {
  loaded: boolean;
  hydrate: (flags: WorkspaceFeatureFlags) => void;
  setFlag: (key: keyof WorkspaceFeatureFlags, value: boolean | string) => void;
  reset: () => void;
}

const DEFAULT_FLAGS: WorkspaceFeatureFlags = {
  hasAssistants: true,
  hasMultipleChairs: true,
  hasDentalLab: true,
  hasInsuranceCoPay: true,
  hasInstallments: true,
  workspacePreset: "enterprise",
  onboardingCompleted: false,
  hasPediatricMode: false,
  isOmniRole: false,
};

// ──────────────────────────────────────────────────────────────────────────────
// Zustand store with localStorage persistence
// ──────────────────────────────────────────────────────────────────────────────
export const useWorkspaceProfileStore = create<WorkspaceProfileStore>()(
  persist(
    (set) => ({
      ...DEFAULT_FLAGS,
      loaded: false,

      hydrate: (flags) =>
        set({
          ...flags,
          loaded: true,
        }),

      setFlag: (key, value) =>
        set((s) => ({ ...s, [key]: value })),

      reset: () => set({ ...DEFAULT_FLAGS, loaded: false }),
    }),
    {
      name: "dente-workspace-profile",
      partialize: (s) => ({
        hasAssistants: s.hasAssistants,
        hasMultipleChairs: s.hasMultipleChairs,
        hasDentalLab: s.hasDentalLab,
        hasInsuranceCoPay: s.hasInsuranceCoPay,
        hasInstallments: s.hasInstallments,
        workspacePreset: s.workspacePreset,
        onboardingCompleted: s.onboardingCompleted,
      }),
    }
  )
);

// ──────────────────────────────────────────────────────────────────────────────
// Hook — call once on app mount to pull flags from server
// ──────────────────────────────────────────────────────────────────────────────
export function useWorkspaceProfile() {
  const store = useWorkspaceProfileStore();
  return store;
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility: apply a named preset to the server and update local store
// ──────────────────────────────────────────────────────────────────────────────
export async function applyWorkspacePreset(presetName: string, extraData?: { numberOfChairs?: number, hasPediatricMode?: boolean }): Promise<WorkspaceFeatureFlags> {
  const res = await fetch(`/api/workspace/preset/${presetName}`, { 
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(extraData || {})
  });
  if (!res.ok) throw new Error(`Failed to apply preset: ${presetName}`);
  const body = await res.json();
  const flags = body.flags as WorkspaceFeatureFlags;
  
  if (extraData?.hasPediatricMode !== undefined) {
      flags.hasPediatricMode = extraData.hasPediatricMode;
  }
  
  useWorkspaceProfileStore.getState().hydrate(flags);
  return flags;
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility: save individual flag toggles to server
// ──────────────────────────────────────────────────────────────────────────────
export async function saveWorkspaceFlags(partial: Partial<WorkspaceFeatureFlags>): Promise<void> {
  await fetch("/api/workspace/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  // Update local store
  const store = useWorkspaceProfileStore.getState();
  for (const [k, v] of Object.entries(partial)) {
    store.setFlag(k as keyof WorkspaceFeatureFlags, v as boolean | string);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility: load from server (used in App startup)
// ──────────────────────────────────────────────────────────────────────────────
export async function loadWorkspaceProfile(): Promise<void> {
  try {
    const res = await fetch("/api/workspace/profile");
    if (!res.ok) return;
    const flags = (await res.json()) as WorkspaceFeatureFlags;
    useWorkspaceProfileStore.getState().hydrate(flags);
  } catch {
    // Network offline – keep persisted values
  }
}
