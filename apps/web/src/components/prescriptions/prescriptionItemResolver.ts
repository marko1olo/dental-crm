/**
 * prescriptionItemResolver.ts — Pure helper to resolve active prescription items
 */

import { calculatePediatricIbuprofenDose } from "./generator";
import type { PrescriptionDrugItem } from "./PrescriptionPrintModal";
import type { DentalOutpatientDrug } from "./prescriptionDataSets";

export function resolveActivePrescriptionItems(
	selectedDrugIds: readonly string[],
	customDrugsList: readonly PrescriptionDrugItem[],
	fullCatalog: readonly DentalOutpatientDrug[],
	patientWeightKg?: number | undefined,
): PrescriptionDrugItem[] {
	const items: PrescriptionDrugItem[] = [];
	for (const id of selectedDrugIds) {
		const custom = customDrugsList.find((c) => c.id === id);
		if (custom) {
			items.push(custom);
			continue;
		}
		const found = fullCatalog.find((d) => d.id === id);
		if (found) {
			let signa = found.signaRu;
			if (
				found.id === "ibuprofen_suspension_100_5ml" &&
				patientWeightKg &&
				patientWeightKg > 0
			) {
				signa = calculatePediatricIbuprofenDose(patientWeightKg).signaRu;
			}
			items.push({
				id: found.id,
				latinName: found.latinRp,
				tradeName: found.tradeNameRu,
				form: found.formRu,
				dosage: found.dosageRu,
				quantity: found.quantityLabel,
				dispenseLatin: found.dispenseLatin,
				signaRussian: signa,
				category: found.category,
			});
		}
	}
	return items;
}
