import type {
	ClinicPublicLookupResponse,
	SmartImportPreviewResponse,
} from "@dental/shared";
import { clinicPublicLookupFieldLabels } from "../constants";

export interface UseClinicProfileDraftLogicParams {
	clinicProfileDraft?: any;
	clinicProfileSaveState?: string;
	updateClinicProfileDraft?: (key: string, value: string) => void;
	clinicPublicLookup?: any;
	smartImportPreview?: any;
}

export function useClinicProfileDraftLogic(params: UseClinicProfileDraftLogicParams) {
	const {
		clinicProfileDraft,
		clinicProfileSaveState,
		updateClinicProfileDraft,
		clinicPublicLookup,
		smartImportPreview,
	} = params;

	const typedClinicPublicLookup =
		clinicPublicLookup as ClinicPublicLookupResponse | null;
	const typedSmartImportPreview =
		smartImportPreview as SmartImportPreviewResponse | null;

	const clinicLookupSuggestionFieldEntries = (
		fields: Record<string, unknown>,
	) =>
		Object.entries(fields).filter(([key, value]) => {
			if (!Object.hasOwn(clinicPublicLookupFieldLabels, key)) return false;
			if (value === null || typeof value === "undefined") return false;
			return String(value).trim().length > 0;
		});

	const clinicLookupSuggestionApplySummary = (
		fields: Record<string, unknown>,
	) => {
		const entries = clinicLookupSuggestionFieldEntries(fields);
		if (!entries.length) return "Нет применимых полей для профиля.";

		const currentProfile = (clinicProfileDraft ?? {}) as Record<string, unknown>;
		let emptyCount = 0;
		let replaceCount = 0;
		let unchangedCount = 0;
		entries.forEach(([key, value]) => {
			const currentValue = String(currentProfile[key] ?? "").trim();
			const suggestedValue = String(value).trim();
			if (!currentValue) emptyCount += 1;
			else if (currentValue === suggestedValue) unchangedCount += 1;
			else replaceCount += 1;
		});
		return `Будет подставлено полей: ${entries.length}. Новых: ${emptyCount}. Заменит текущих: ${replaceCount}. Совпадает: ${unchangedCount}.`;
	};

	const applyClinicLookupSuggestion = (fields: Record<string, unknown>) => {
		if (!updateClinicProfileDraft) return;
		clinicLookupSuggestionFieldEntries(fields).forEach(([key, value]) => {
			updateClinicProfileDraft(key, String(value).trim());
		});
	};

	const clinicProfileSaveButtonText =
		clinicProfileSaveState === "saving"
			? "Сохраняю профиль"
			: clinicProfileSaveState === "saved"
				? "Профиль сохранен"
				: "Сохранить профиль";

	const typedClinicPublicLookupSuggestions =
		typedClinicPublicLookup?.suggestions ?? [];
	const typedClinicPublicLookupTargets =
		typedClinicPublicLookup?.publicLookupTargets ?? [];

	const migrationClinicLookupFieldCount = typedClinicPublicLookup
		? Object.keys(
				typedClinicPublicLookup.suggestions[0]?.fields ?? {},
			).length
		: 0;

	const migrationSmartClinicFieldCount = typedSmartImportPreview?.clinicSuggestion
		? Object.keys(
				typedSmartImportPreview.clinicSuggestion.fields ?? {},
			).length
		: 0;

	const migrationClinicFieldsFound = Math.max(
		migrationClinicLookupFieldCount,
		migrationSmartClinicFieldCount,
	);

	return {
		typedClinicPublicLookup,
		typedClinicPublicLookupSuggestions,
		typedClinicPublicLookupTargets,
		clinicLookupSuggestionFieldEntries,
		clinicLookupSuggestionApplySummary,
		applyClinicLookupSuggestion,
		clinicProfileSaveButtonText,
		migrationClinicLookupFieldCount,
		migrationSmartClinicFieldCount,
		migrationClinicFieldsFound,
	};
}
