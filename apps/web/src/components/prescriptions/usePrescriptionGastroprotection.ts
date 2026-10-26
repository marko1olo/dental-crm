/**
 * usePrescriptionGastroprotection.ts — Quick Gastroprotection Addition Hook
 * Mandate 8b: <= 120 lines.
 */

import { useCallback } from "react";
import { showToast } from "../GlobalToast";
import type { PrescriptionFormType } from "./PrescriptionPrintModal";

export interface GastroprotectionParams {
	readonly selectedDrugIds: readonly string[];
	readonly setSelectedDrugIds: (ids: string[]) => void;
	readonly activeForm: PrescriptionFormType;
}

export function usePrescriptionGastroprotection(p: GastroprotectionParams) {
	const handleAddOmeprazoleGastroprotection = useCallback(() => {
		if (p.selectedDrugIds.includes("omeprazole_20")) {
			showToast("Омепразол 20 мг уже добавлен в назначения", "info", 2500);
			return;
		}
		if (p.selectedDrugIds.length >= 3 && (p.activeForm === "standard" || p.activeForm === "107-1u")) {
			showToast(
				"На одном рецептурном бланке допускается не более 3 препаратов.",
				"warning",
				4000,
			);
			return;
		}
		p.setSelectedDrugIds([...p.selectedDrugIds, "omeprazole_20"]);
		showToast(
			"Омепразол 20 мг добавлен для гастропротекции ЖКТ",
			"success",
			3000,
		);
	}, [p.selectedDrugIds, p.setSelectedDrugIds, p.activeForm]);

	return { handleAddOmeprazoleGastroprotection };
}
