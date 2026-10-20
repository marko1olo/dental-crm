/**
 * usePrescriptionActions.ts — Printing, Copying & Diary Export Actions Hook
 * Decomposed coordinator <= 120 lines (Mandate 8b).
 */

import { useState } from "react";
import { showToast } from "../GlobalToast";
import type { PrescriptionDrugItem } from "./PrescriptionPrintModal";
import type { DentalFastPrescriptionSet } from "./prescriptionDataSets";
import {
	type PrescriptionPrintActionsParams,
	usePrescriptionPrintActions,
} from "./usePrescriptionPrintActions";

export interface PrescriptionActionsParams
	extends PrescriptionPrintActionsParams {
	readonly setSelectedDrugIds: (ids: string[]) => void;
	readonly setValidityDays: (days: "15" | "30" | "60" | "365") => void;
	readonly setActivePresetId: (id: string | undefined) => void;
}

export function usePrescriptionActions(p: PrescriptionActionsParams) {
	const [mobileTab, setMobileTab] = useState<"catalog" | "preview">("catalog");
	const printActions = usePrescriptionPrintActions(p);

	const handleSelectExpressPreset = (preset: DentalFastPrescriptionSet) => {
		p.setSelectedDrugIds([...preset.drugIds]);
		p.setValidityDays("60");
		p.setActivePresetId(preset.id);
		showToast(`Курс ${preset.label} применён`, "info", 2000);
	};

	const handleApplyAndPrint = (preset: DentalFastPrescriptionSet) => {
		handleSelectExpressPreset(preset);
		printActions.handlePrint();
	};

	const handleApplyAndInsertToDiary = (preset: DentalFastPrescriptionSet) => {
		p.setSelectedDrugIds([...preset.drugIds]);
		p.setActivePresetId(preset.id);
		printActions.handleInsertToDiary();
	};

	return {
		...printActions,
		mobileTab,
		setMobileTab,
		handleSelectExpressPreset,
		handleApplyAndPrint,
		handleApplyAndInsertToDiary,
	};
}
