import React from "react";
import type {
	DecontaminationMethodType,
	MedicalWasteClassId,
	MedicalWastePackagingTypeId,
	WasteStorageLocationId,
} from "./medicalWastePresets.js";
import { MedicalWasteClassSelectorGrid } from "./MedicalWasteClassSelectorGrid.js";
import { MedicalWastePackagingAndScaleForm } from "./MedicalWastePackagingAndScaleForm.js";
import { MedicalWasteQuickShiftBanner } from "./MedicalWasteQuickShiftBanner.js";
import { MedicalWasteStorageAndSealForm } from "./MedicalWasteStorageAndSealForm.js";

export interface MedicalWasteAccumulateTabProps {
	readonly selectedClass: MedicalWasteClassId;
	readonly handleClassChange: (c: MedicalWasteClassId) => void;
	readonly selectedPackaging: MedicalWastePackagingTypeId;
	readonly setSelectedPackaging: (p: MedicalWastePackagingTypeId) => void;
	readonly packageCount: number;
	readonly setPackageCount: (cnt: number) => void;
	readonly grossWeightInput: number;
	readonly setGrossWeightInput: (w: number) => void;
	readonly currentWeights: { grossKg: number; tareKg: number; netKg: number };
	readonly decontamMethod: DecontaminationMethodType;
	readonly setDecontamMethod: (m: DecontaminationMethodType) => void;
	readonly storageLocation: WasteStorageLocationId;
	readonly setStorageLocation: (loc: WasteStorageLocationId) => void;
	readonly sealNumber: string;
	readonly setSealNumber: (s: string) => void;
	readonly barcode: string;
	readonly handleAddRecord: () => void;
	readonly handleQuickShiftWaste: () => void;
	readonly isSubmittingQuickShift: boolean;
}

export function MedicalWasteAccumulateTab(props: MedicalWasteAccumulateTabProps) {
	return (
		<div className="flex flex-col gap-4">
			<MedicalWasteQuickShiftBanner
				onQuickShiftWaste={props.handleQuickShiftWaste}
				isSubmittingQuickShift={props.isSubmittingQuickShift}
			/>
			<MedicalWasteClassSelectorGrid
				selectedClass={props.selectedClass}
				onClassChange={props.handleClassChange}
			/>
			<MedicalWastePackagingAndScaleForm
				selectedClass={props.selectedClass}
				selectedPackaging={props.selectedPackaging}
				setSelectedPackaging={props.setSelectedPackaging}
				packageCount={props.packageCount}
				setPackageCount={props.setPackageCount}
				grossWeightInput={props.grossWeightInput}
				setGrossWeightInput={props.setGrossWeightInput}
				currentWeights={props.currentWeights}
			/>
			<MedicalWasteStorageAndSealForm
				decontamMethod={props.decontamMethod}
				setDecontamMethod={props.setDecontamMethod}
				storageLocation={props.storageLocation}
				setStorageLocation={props.setStorageLocation}
				sealNumber={props.sealNumber}
				setSealNumber={props.setSealNumber}
				barcode={props.barcode}
				onAddRecord={props.handleAddRecord}
			/>
		</div>
	);
}
