import { useMemo } from "react";
import type React from "react";
import type { DiaryState } from "../../useVisitDiaryLogic";
import { ICD10_DICTIONARY } from "../../../lib/icd10";
import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService";

export interface UseVisitDiarySectionIcdParams {
	readonly icdSearch: string;
	readonly setIcdSearch: (code: string) => void;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly setShowIcdDropdown: (show: boolean) => void;
	readonly ensureRevisingIfLocked: () => void;
	readonly scheduleDebouncedSave: () => void;
}

export function useVisitDiarySectionIcd({
	icdSearch,
	setIcdSearch,
	setDiary,
	setShowIcdDropdown,
	ensureRevisingIfLocked,
	scheduleDebouncedSave,
}: UseVisitDiarySectionIcdParams) {
	const handleIcdSelect = (code: string) => {
		ensureRevisingIfLocked();
		setDiary((prev) => {
			if (prev.diagnosisIcd10 !== code) {
				StaffActionAuditService.logDiagnosisChange({
					patientId: (prev as any).patientId || "current_patient",
					oldDiagnosis: { icdCode: prev.diagnosisIcd10 },
					newDiagnosis: { icdCode: code },
					reason: "Выбор диагноза по МКБ-10 в дневнике приёма",
				});
			}
			return { ...prev, diagnosisIcd10: code };
		});
		setIcdSearch(code);
		setShowIcdDropdown(false);
		scheduleDebouncedSave();
	};

	const filteredIcd = useMemo(() => {
		const normalizeRu = (str: string) =>
			(str ?? "").toLowerCase().replace(/ё/g, "е").trim();
		const searchNormalized = normalizeRu(icdSearch ?? "");
		const searchTokens = searchNormalized.split(/\s+/).filter(Boolean);

		return (ICD10_DICTIONARY ?? [])
			.filter((i) => {
				if (!i) return false;
				if (searchTokens.length === 0) return true;
				const codeNorm = normalizeRu(i.code);
				const labelNorm = normalizeRu(i.label);
				const groupNorm = normalizeRu(i.group);
				return searchTokens.every(
					(token) =>
						codeNorm.includes(token) ||
						labelNorm.includes(token) ||
						groupNorm.includes(token),
				);
			})
			.slice(0, 12);
	}, [icdSearch]);

	const commitIcdInput = () => {
		ensureRevisingIfLocked();
		const typed = (icdSearch ?? "").trim();
		if (!typed) return;
		const normalized = typed.toUpperCase();
		const exact = (ICD10_DICTIONARY ?? []).find(
			(item) => (item?.code ?? "").toUpperCase() === normalized,
		);
		const candidate = exact ?? filteredIcd?.[0];
		if (candidate?.code) handleIcdSelect(candidate.code);
	};

	return {
		filteredIcd,
		handleIcdSelect,
		commitIcdInput,
	};
}
