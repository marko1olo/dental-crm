import type React from "react";
import type { DiaryState } from "../../useVisitDiaryLogic";
import type { PerioPathologyPreset } from "../../../lib/clinicalProtocols";
import { showToast } from "../../GlobalToast";
import { buildPerioStatusText, buildPediatricStatusText } from "./perioDiaryTemplates";

export interface UseVisitDiarySectionPerioParams {
	readonly ensureRevisingIfLocked: () => void;
	readonly setDiary: React.Dispatch<React.SetStateAction<DiaryState>>;
	readonly scheduleDebouncedSave: () => void;
	readonly setIcdSearch: (code: string) => void;
	readonly diary: DiaryState;
	readonly doctorName: string;
	readonly patientBirthDate?: string | null;
	readonly activeTeeth: readonly any[];
	readonly setShowPerioPathologyMenu: (show: boolean) => void;
	readonly ctxToast?: (msg: string, variant?: "info" | "success" | "warn" | "error") => void;
}

export function useVisitDiarySectionPerio(params: UseVisitDiarySectionPerioParams) {
	const {
		ensureRevisingIfLocked,
		setDiary,
		scheduleDebouncedSave,
		setIcdSearch,
		diary,
		doctorName,
		patientBirthDate,
		activeTeeth,
		setShowPerioPathologyMenu,
		ctxToast,
	} = params;

	const handleInsertPerioStatus = () => {
		ensureRevisingIfLocked();
		const perioText = buildPerioStatusText(doctorName);
		const icd10Code = "K05.0";

		setDiary((prev) => ({
			...prev,
			diagnosisIcd10: prev.diagnosisIcd10 || icd10Code,
			statusLocalis: prev.statusLocalis ? `${prev.statusLocalis}\n\n${perioText}` : perioText,
			treatmentDescription: prev.treatmentDescription
				? `${prev.treatmentDescription}\n\n• Профилактический осмотр через 6 месяцев.`
				: "• Контролируемая индивидуальная гигиена полости рта.\n• Профилактический осмотр через 6 месяцев.",
		}));

		if (!diary.diagnosisIcd10 && icd10Code) {
			setIcdSearch(icd10Code);
		}
		scheduleDebouncedSave();
	};

	const handleApplyPerioPathology = (preset: PerioPathologyPreset) => {
		ensureRevisingIfLocked();
		setDiary((prev) => ({
			...prev,
			diagnosisIcd10: prev.diagnosisIcd10 || preset.defaultIcd10,
			statusLocalis: prev.statusLocalis
				? `${prev.statusLocalis}\n\n[ПАРОДОНТОЛОГИЧЕСКИЙ СТАТУС: ${preset.badge}]\n${preset.statusLocalis}`
				: `[ПАРОДОНТОЛОГИЧЕСКИЙ СТАТУС: ${preset.badge}]\n${preset.statusLocalis}`,
			treatmentDescription: prev.treatmentDescription
				? `${prev.treatmentDescription}\n\n${preset.treatmentDescription}`
				: preset.treatmentDescription,
		}));

		if (!diary.diagnosisIcd10 && preset.defaultIcd10) {
			setIcdSearch(preset.defaultIcd10);
		}
		setShowPerioPathologyMenu(false);
		scheduleDebouncedSave();
		ctxToast?.(`Применён протокол: ${preset.label}`, "info");
	};

	const handleInsertPediatricStatus = () => {
		ensureRevisingIfLocked();
		const pediatricText = buildPediatricStatusText(patientBirthDate, activeTeeth);

		setDiary((prev) => ({
			...prev,
			diagnosisIcd10: prev.diagnosisIcd10 || "Z01.2",
			statusLocalis: prev.statusLocalis ? `${prev.statusLocalis}\n\n${pediatricText}` : pediatricText,
			treatmentDescription: prev.treatmentDescription
				? `${prev.treatmentDescription}\n\n• Комплексная детская профгигиена и ремотерапия (GC Tooth Mousse).\n• Неинвазивная герметизация фиссур постоянных моляров (16, 26, 36, 46).`
				: "• Комплексная детская профгигиена и ремотерапия (GC Tooth Mousse).\n• Неинвазивная герметизация фиссур первых постоянных моляров (16, 26, 36, 46).\n• Обучение гигиене и подбор детской фторсодержащей пасты (1000 ppm F-).",
		}));

		if (!diary.diagnosisIcd10) {
			setIcdSearch("Z01.2");
		}
		scheduleDebouncedSave();
	};

	const handleAddComplaintChip = (chipText: string) => {
		ensureRevisingIfLocked();
		setDiary((prev) => {
			const cur = (prev.anamnesis ?? "").trim();
			if (!cur) return { ...prev, anamnesis: `${chipText}.` };
			if (cur.includes(chipText)) return prev;
			const separator = cur.endsWith(".") || cur.endsWith(";") || cur.endsWith("!") ? " " : ". ";
			return { ...prev, anamnesis: `${cur}${separator}${chipText}.` };
		});
		scheduleDebouncedSave();
		showToast(`Добавлена жалоба: «${chipText}»`, "info", 2000);
	};

	return {
		handleInsertPerioStatus,
		handleApplyPerioPathology,
		handleInsertPediatricStatus,
		handleAddComplaintChip,
	};
}
