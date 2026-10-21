/**
 * PrescriptionWorkbenchBody.tsx — Split Two-Column Workbench Body
 */

import type React from "react";
import { PrescriptionDrugCatalogSelector } from "./PrescriptionDrugCatalogSelector";
import { PrescriptionSheetPreview } from "./PrescriptionSheetPreview";
import { DENTAL_FAST_PRESCRIPTION_SETS } from "./prescriptionDataSets";
import type { usePrescriptionCockpit } from "./usePrescriptionCockpit";

export interface PrescriptionWorkbenchBodyProps {
	readonly c: ReturnType<typeof usePrescriptionCockpit>;
	readonly diaryIcd10?: string | null | undefined;
}

export const PrescriptionWorkbenchBody: React.FC<
	PrescriptionWorkbenchBodyProps
> = ({ c, diaryIcd10 }) => {
	return (
		<div className="flex flex-col lg:flex-row flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-[var(--line)]">
			<PrescriptionDrugCatalogSelector
				className={c.mobileTab === "catalog" ? "flex" : "hidden lg:flex"}
				fastPresets={DENTAL_FAST_PRESCRIPTION_SETS}
				activePresetId={c.activePresetId}
				onSelectPreset={c.handleSelectExpressPreset}
				onApplyAndInsertToDiary={c.handleApplyAndInsertToDiary}
				onApplyAndPrint={c.handleApplyAndPrint}
				searchQuery={c.searchQuery}
				onSearchQueryChange={c.setSearchQuery}
				filteredCatalog={c.filteredCatalog}
				selectedDrugIds={c.selectedDrugIds}
				onToggleDrug={c.toggleDrug}
				isAddingCustom={c.isAddingCustom}
				onToggleAddingCustom={() => c.setIsAddingCustom(!c.isAddingCustom)}
				customTradeName={c.customTradeName}
				onCustomTradeNameChange={c.setCustomTradeName}
				customLatinRp={c.customLatinRp}
				onCustomLatinRpChange={c.setCustomLatinRp}
				customDispense={c.customDispense}
				onCustomDispenseChange={c.setCustomDispense}
				customSigna={c.customSigna}
				onCustomSignaChange={c.setCustomSigna}
				onAddCustomDrug={c.handleAddCustomDrug}
				customSeriesNumber={c.customSeriesNumber}
				onCustomSeriesNumberChange={c.setCustomSeriesNumber}
				validityDays={c.validityDays}
				onValidityDaysChange={(d) => {
					c.setValidityDays(d);
					c.setIsChronicSpecialCare(d === "365");
				}}
				isChronicSpecialCare={c.isChronicSpecialCare}
				onToggleChronicSpecialCare={() =>
					c.setIsChronicSpecialCare(!c.isChronicSpecialCare)
				}
				chronicPeriodicity={c.chronicPeriodicity}
				onChronicPeriodicityChange={c.setChronicPeriodicity}
				patientAddress={c.patientAddress}
				onPatientAddressChange={c.setPatientAddress}
				activeForm={c.activeForm}
				patientAllergies={c.resolvedPatientAllergies}
				patientWeightKg={c.patientWeightKg}
				onPatientWeightKgChange={c.setPatientWeightKg}
			/>
			<PrescriptionSheetPreview
				className={c.mobileTab === "preview" ? "flex" : "hidden lg:flex"}
				customSeriesNumber={c.customSeriesNumber}
				withStampAndSignature={c.withStampAndSignature}
				penicillinConflict={c.allergyConflicts.some(
					(x) => x.type === "penicillin",
				)}
				nsaidConflict={c.allergyConflicts.some((x) => x.type === "nsaid")}
				anestheticConflict={c.allergyConflicts.some(
					(x) => x.type === "anesthetic",
				)}
				ddiSafetyAudit={c.ddiSafetyAudit}
				clinic={c.clinic}
				address={c.address}
				phone={c.phone}
				ogrn={c.ogrn}
				inn={c.inn}
				licNum={c.licNum || ""}
				activeForm={c.activeForm}
				prescriptionDate={c.prescriptionDate}
				patientName={c.patientName}
				patientBirth={c.patientBirth}
				patientCard={c.patientCard}
				patientAddress={c.patientAddress}
				docName={c.docName}
				docSpecialty={c.docSpecialty}
				diary={diaryIcd10 ? { diagnosisIcd10: diaryIcd10 } : null}
				activeItems={c.activeItems}
				validityDays={c.validityDays}
				isChronicSpecialCare={c.isChronicSpecialCare}
				chronicPeriodicity={c.chronicPeriodicity}
				isUkepSigned={c.isUkepSigned}
				ukepSignature={c.ukepSignature}
			/>
		</div>
	);
};
