/**
 * workspaceFlagStorageHelpers.ts — Layer 2: Pure Storage Normalization & Serialization Helpers.
 *
 * Normalizes JSONB records from the database into complete, type-safe WorkspaceFeatureFlags.
 */

import type { WorkspaceFeatureFlags } from "./types.js";
import { DEFAULT_WORKSPACE_FEATURE_FLAGS } from "./workspaceFlagDefaults.js";

/**
 * Привести запись из базы к полному набору признаков.
 *
 * Набор растёт вместе с продуктом: за одну ночь в него добавляли
 * hasBpmWorkflows, hasClinicalRules, hasReferralModule. Поэтому старая запись
 * обязана читаться без ошибки — отсутствующие признаки берутся из умолчаний, а
 * неизвестные ключи отбрасываются, чтобы в ответ не просочилось то, чего в
 * контракте нет.
 *
 * Типы проверяются по значению, а не по вере: в jsonb может лежать что угодно,
 * включая результат ручной правки базы.
 */
export function workspaceFlagsFromStorage(
	stored: unknown,
): WorkspaceFeatureFlags {
	const source =
		stored && typeof stored === "object"
			? (stored as Record<string, unknown>)
			: {};

	const getBool = (
		key: keyof WorkspaceFeatureFlags,
		fallback: boolean,
	): boolean => {
		const val = source[key];
		return typeof val === "boolean" ? val : fallback;
	};

	const getString = (
		key: keyof WorkspaceFeatureFlags,
		fallback: string,
	): string => {
		const val = source[key];
		return typeof val === "string" && val ? val : fallback;
	};

	const getNumber = (
		key: keyof WorkspaceFeatureFlags,
		fallback: number,
	): number => {
		const val = source[key];
		return typeof val === "number" && Number.isFinite(val) ? val : fallback;
	};

	return {
		hasAssistants: getBool("hasAssistants", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasAssistants),
		hasMultipleChairs: getBool("hasMultipleChairs", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasMultipleChairs),
		hasDentalLab: getBool("hasDentalLab", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasDentalLab),
		hasInsuranceCoPay: getBool("hasInsuranceCoPay", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasInsuranceCoPay),
		hasInstallments: getBool("hasInstallments", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasInstallments),
		hasOrthodontics: getBool("hasOrthodontics", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasOrthodontics),
		hasTasks: getBool("hasTasks", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasTasks),
		hasReclamations: getBool("hasReclamations", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasReclamations),
		hasPediatricMode: getBool("hasPediatricMode", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasPediatricMode),
		isOmniRole: getBool("isOmniRole", DEFAULT_WORKSPACE_FEATURE_FLAGS.isOmniRole),
		workspacePreset: getString("workspacePreset", DEFAULT_WORKSPACE_FEATURE_FLAGS.workspacePreset),
		onboardingCompleted: getBool("onboardingCompleted", DEFAULT_WORKSPACE_FEATURE_FLAGS.onboardingCompleted),
		hasPayrollModule: getBool("hasPayrollModule", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasPayrollModule),
		hasMarketingModule: getBool("hasMarketingModule", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasMarketingModule),
		hasAnalyticsModule: getBool("hasAnalyticsModule", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasAnalyticsModule),
		hasInventoryModule: getBool("hasInventoryModule", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasInventoryModule),
		aiEnableTreatmentPlan: getBool("aiEnableTreatmentPlan", DEFAULT_WORKSPACE_FEATURE_FLAGS.aiEnableTreatmentPlan),
		aiEnableRecommendations: getBool("aiEnableRecommendations", DEFAULT_WORKSPACE_FEATURE_FLAGS.aiEnableRecommendations),
		aiEnableDocuments: getBool("aiEnableDocuments", DEFAULT_WORKSPACE_FEATURE_FLAGS.aiEnableDocuments),
		hasGnathology: getBool("hasGnathology", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasGnathology),
		hasCsoScanner: getBool("hasCsoScanner", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasCsoScanner),
		hasLeadsKanban: getBool("hasLeadsKanban", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasLeadsKanban),
		hasOmnichannel: getBool("hasOmnichannel", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasOmnichannel),
		hasEngineeringStatus: getBool("hasEngineeringStatus", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasEngineeringStatus),
		hasClinicalRules: getBool("hasClinicalRules", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasClinicalRules),
		hasReferralModule: getBool("hasReferralModule", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasReferralModule),
		hasBpmWorkflows: getBool("hasBpmWorkflows", DEFAULT_WORKSPACE_FEATURE_FLAGS.hasBpmWorkflows),
		numberOfDoctors: getNumber("numberOfDoctors", DEFAULT_WORKSPACE_FEATURE_FLAGS.numberOfDoctors),
	};
}
