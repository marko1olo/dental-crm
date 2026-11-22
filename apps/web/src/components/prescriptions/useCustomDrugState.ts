/**
 * useCustomDrugState.ts — Custom Drug Form Input State Hook
 */

import { useState } from "react";
import { showToast } from "../GlobalToast";
import type { PrescriptionDrugItem } from "./PrescriptionPrintModal";

export function useCustomDrugState(
	onAddDrugSuccess: (item: PrescriptionDrugItem) => void,
) {
	const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
	const [customTradeName, setCustomTradeName] = useState<string>("");
	const [customLatinRp, setCustomLatinRp] = useState<string>("");
	const [customDispense, setCustomDispense] = useState<string>("");
	const [customSigna, setCustomSigna] = useState<string>("");

	const handleAddCustomDrug = () => {
		if (!customTradeName.trim()) {
			showToast("Укажите наименование препарата", "warning");
			return;
		}
		const customId = `custom-${Date.now()}`;
		const newCustom: PrescriptionDrugItem = {
			id: customId,
			tradeName: customTradeName.trim(),
			latinName: customLatinRp.trim() || `Rp.: ${customTradeName.trim()}`,
			activeSubstanceRu: customTradeName.trim(),
			category: "other",
			categoryLabelRu: "Прочие",
			formRu: "таблетки",
			dosageRu: "стандартная",
			quantityLabel: "N. 10",
			form: "таблетки",
			dosage: "стандартная",
			quantity: "N. 10",
			dispenseLatin: customDispense.trim() || "D.t.d. N 10",
			signaRussian: customSigna.trim() || "S. По назначению врача",
			memoInstruction: customSigna.trim() || "S. По назначению врача",
		};
		onAddDrugSuccess(newCustom);
		setCustomTradeName("");
		setCustomLatinRp("");
		setCustomDispense("");
		setCustomSigna("");
		setIsAddingCustom(false);
		showToast("Препарат добавлен в рецепт", "success");
	};

	return {
		isAddingCustom,
		setIsAddingCustom,
		customTradeName,
		setCustomTradeName,
		customLatinRp,
		setCustomLatinRp,
		customDispense,
		setCustomDispense,
		customSigna,
		setCustomSigna,
		handleAddCustomDrug,
	};
}
