/**
 * PrescriptionDrugCatalogSelector.tsx — Left panel of Prescription Cockpit
 * Decomposed coordinator <= 120 lines (Mandate 8b).
 */

import type React from "react";
import { PrescriptionCatalogList } from "./PrescriptionCatalogList";
import { PrescriptionCustomDrugForm } from "./PrescriptionCustomDrugForm";
import { PrescriptionExpressPills } from "./PrescriptionExpressPills";
import { PrescriptionPediatricCalculator } from "./PrescriptionPediatricCalculator";
import { PrescriptionValidityDetails } from "./PrescriptionValidityDetails";
import type { PrescriptionDrugCatalogSelectorProps } from "./prescriptionCatalogTypes";

export type { PrescriptionDrugCatalogSelectorProps } from "./prescriptionCatalogTypes";

export const PrescriptionDrugCatalogSelector: React.FC<
	PrescriptionDrugCatalogSelectorProps
> = (props) => {
	const isPediatric =
		props.selectedDrugIds.includes("ibuprofen_suspension_100_5ml") ||
		(props.patientWeightKg !== undefined &&
			props.patientWeightKg > 0 &&
			props.patientWeightKg <= 40);

	return (
		<div
			className={`w-full lg:w-1/2 p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 ${props.className || ""}`}
		>
			{isPediatric && (
				<PrescriptionPediatricCalculator
					patientWeightKg={props.patientWeightKg}
					onPatientWeightKgChange={props.onPatientWeightKgChange}
				/>
			)}

			<PrescriptionExpressPills
				presets={props.fastPresets}
				activePresetId={props.activePresetId}
				onSelectPreset={(p) =>
					props.onSelectPreset
						? props.onSelectPreset(p)
						: props.onApplyAndInsertToDiary(p)
				}
				onApplyAndPrint={props.onApplyAndPrint}
				onApplyAndInsertToDiary={props.onApplyAndInsertToDiary}
				patientAllergies={props.patientAllergies}
				catalogDrugs={props.filteredCatalog}
				selectedDrugIds={props.selectedDrugIds}
				onToggleDrug={props.onToggleDrug}
			/>

			<PrescriptionCatalogList
				searchQuery={props.searchQuery}
				onSearchQueryChange={props.onSearchQueryChange}
				filteredCatalog={props.filteredCatalog}
				selectedDrugIds={props.selectedDrugIds}
				onToggleDrug={props.onToggleDrug}
				onToggleAddingCustom={props.onToggleAddingCustom}
				patientAllergies={props.patientAllergies}
			/>

			<PrescriptionCustomDrugForm
				isAddingCustom={props.isAddingCustom}
				customTradeName={props.customTradeName}
				onCustomTradeNameChange={props.onCustomTradeNameChange}
				customLatinRp={props.customLatinRp}
				onCustomLatinRpChange={props.onCustomLatinRpChange}
				customDispense={props.customDispense}
				onCustomDispenseChange={props.onCustomDispenseChange}
				customSigna={props.customSigna}
				onCustomSignaChange={props.onCustomSignaChange}
				onAddCustomDrug={props.onAddCustomDrug}
			/>

			<PrescriptionValidityDetails
				customSeriesNumber={props.customSeriesNumber}
				onCustomSeriesNumberChange={props.onCustomSeriesNumberChange}
				validityDays={props.validityDays}
				onValidityDaysChange={props.onValidityDaysChange}
				isChronicSpecialCare={props.isChronicSpecialCare}
				onToggleChronicSpecialCare={props.onToggleChronicSpecialCare}
				chronicPeriodicity={props.chronicPeriodicity}
				onChronicPeriodicityChange={props.onChronicPeriodicityChange}
				patientAddress={props.patientAddress}
				onPatientAddressChange={props.onPatientAddressChange}
				activeForm={props.activeForm}
			/>
		</div>
	);
};
