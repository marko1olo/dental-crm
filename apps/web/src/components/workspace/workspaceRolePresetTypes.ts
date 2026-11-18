/**
 * workspaceRolePresetTypes.ts
 * Type definitions for clinical role presets.
 */

import type { WorkspaceFeatureFlags } from "../../hooks/useWorkspaceProfile";
import type { DoctorSpecialtyKey } from "../../store/doctorPreferencesStore";

export interface ClinicalRolePreset {
	readonly key: DoctorSpecialtyKey;
	readonly title: string;
	readonly shortTitle: string;
	readonly badge: string;
	readonly description: string;
	readonly clinicalFocus: string;
	readonly color: string;
	readonly priorityToggleKeys: ReadonlyArray<
		| "hasClinicalRules"
		| "aiEnableTreatmentPlan"
		| "aiEnableRecommendations"
		| "aiEnableDocuments"
		| "hasDentalLab"
		| "hasOrthodontics"
		| "hasGnathology"
		| "hasTasks"
		| "hasReclamations"
		| "hasPediatricMode"
		| "hasInstallments"
		| "hasInsuranceCoPay"
	>;
	readonly presetFlags: Partial<WorkspaceFeatureFlags>;
}
