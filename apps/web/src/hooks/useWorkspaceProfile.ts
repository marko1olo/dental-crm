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
	hasOrthodontics: boolean;
	hasTasks: boolean;
	hasReclamations: boolean;
	workspacePreset: string;
	onboardingCompleted: boolean;
	hasPediatricMode: boolean;
	isOmniRole: boolean;
	numberOfDoctors: number;
	hasPayrollModule: boolean;
	hasMarketingModule: boolean;
	hasAnalyticsModule: boolean;
	hasInventoryModule: boolean;
	aiEnableTreatmentPlan: boolean;
	aiEnableRecommendations: boolean;
	aiEnableDocuments: boolean;
}

interface WorkspaceProfileStore extends WorkspaceFeatureFlags {
	loaded: boolean;
	hydrate: (flags: WorkspaceFeatureFlags) => void;
	setFlag: (
		key: keyof WorkspaceFeatureFlags,
		value: boolean | string | number,
	) => void;
	reset: () => void;
}

const DEFAULT_FLAGS: WorkspaceFeatureFlags = {
	hasAssistants: true,
	hasMultipleChairs: true,
	hasDentalLab: true,
	hasInsuranceCoPay: true,
	hasInstallments: true,
	hasOrthodontics: true,
	hasTasks: true,
	hasReclamations: true,
	workspacePreset: "enterprise",
	onboardingCompleted: false,
	hasPediatricMode: false,
	isOmniRole: false,
	numberOfDoctors: 4,
	hasPayrollModule: true,
	hasMarketingModule: true,
	hasAnalyticsModule: true,
	hasInventoryModule: true,
	aiEnableTreatmentPlan: true,
	aiEnableRecommendations: true,
	aiEnableDocuments: true,
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

			setFlag: (key, value) => set((s) => ({ ...s, [key]: value })),

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
				hasOrthodontics: s.hasOrthodontics,
				hasTasks: s.hasTasks,
				hasReclamations: s.hasReclamations,
				workspacePreset: s.workspacePreset,
				onboardingCompleted: s.onboardingCompleted,
				numberOfDoctors: s.numberOfDoctors,
				hasPayrollModule: s.hasPayrollModule,
				hasMarketingModule: s.hasMarketingModule,
				hasAnalyticsModule: s.hasAnalyticsModule,
				hasInventoryModule: s.hasInventoryModule,
				aiEnableTreatmentPlan: s.aiEnableTreatmentPlan,
				aiEnableRecommendations: s.aiEnableRecommendations,
				aiEnableDocuments: s.aiEnableDocuments,
			}),
		},
	),
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
export async function applyWorkspacePreset(
	presetName: string,
	extraData?: {
		numberOfChairs?: number;
		numberOfDoctors?: number;
		hasPediatricMode?: boolean;
	},
): Promise<WorkspaceFeatureFlags> {
	const res = await fetch(`/api/workspace/preset/${presetName}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(extraData || {}),
	});
	if (!res.ok) throw new Error(`Failed to apply preset: ${presetName}`);
	const body = await res.json();
	const flags = body.flags as WorkspaceFeatureFlags;

	if (extraData?.hasPediatricMode !== undefined) {
		flags.hasPediatricMode = extraData.hasPediatricMode;
	}
	if (extraData?.numberOfDoctors !== undefined) {
		flags.numberOfDoctors = extraData.numberOfDoctors;
	}
	if (extraData?.numberOfChairs !== undefined) {
		// In case server didn't set it from extraData or we want local override
		flags.hasMultipleChairs = extraData.numberOfChairs > 1;
	}

	useWorkspaceProfileStore.getState().hydrate(flags);
	return flags;
}

// ──────────────────────────────────────────────────────────────────────────────
// Utility: save individual flag toggles to server
// ──────────────────────────────────────────────────────────────────────────────
export async function saveWorkspaceFlags(
	partial: Partial<WorkspaceFeatureFlags>,
): Promise<void> {
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
