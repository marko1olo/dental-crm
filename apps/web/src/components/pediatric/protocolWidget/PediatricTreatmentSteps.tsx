import React from "react";
import type { SomaticRiskProfile } from "../../visit/anesthesiaCalculatorEngine";
import {
	PediatricSomaticAndLegalRep,
	type LegalRepresentativeData,
	type PediatricSomaticStatus,
} from "../PediatricSomaticAndLegalRep";
import {
	PediatricAnesthesiaCalculator,
	type PediatricAnesthesiaCalculationResult,
} from "../PediatricAnesthesiaCalculator";
import { PediatricTreatmentPresetsGrid } from "./PediatricTreatmentPresetsGrid";
import { PediatricToothSurfacesCard } from "./PediatricToothSurfacesCard";
import { PediatricMaterialsCard } from "./PediatricMaterialsCard";
import type {
	PediatricProtocolDefinition,
	PediatricProtocolId,
} from "./types";

export interface PediatricTreatmentStepsProps {
	readonly activePreset: PediatricProtocolDefinition;
	readonly activePresetId: PediatricProtocolId;
	readonly onSelectPreset: (preset: PediatricProtocolDefinition) => void;
	readonly isInvasiveProtocol: boolean;
	readonly representative: LegalRepresentativeData;
	readonly onSignConsent323Fz: () => void;
	readonly selectedSurfaces: readonly string[];
	readonly onToggleSurface: (surf: string) => void;
	readonly onApplySurfacePreset: (surfs: readonly string[]) => void;
	readonly selectedMaterial: string;
	readonly onSelectMaterial: (mat: string) => void;
	readonly representativeFullName?: string | undefined;
	readonly representativePhone?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly representativeRole?: string | undefined;
	readonly patientAgeYears: number;
	readonly patientWeightKg: number;
	readonly somaticProfile?: SomaticRiskProfile | undefined;
	readonly allergies?: string | undefined;
	readonly onSomaticChange: (status: PediatricSomaticStatus, text: string) => void;
	readonly onRepresentativeChange: (rep: LegalRepresentativeData, text: string) => void;
	readonly onAnesthesiaCalculationChange: (res: PediatricAnesthesiaCalculationResult | null) => void;
	readonly onApplyAnesthesiaText: (text: string) => void;
}

export const PediatricTreatmentSteps: React.FC<PediatricTreatmentStepsProps> = ({
	activePreset,
	activePresetId,
	onSelectPreset,
	isInvasiveProtocol,
	representative,
	onSignConsent323Fz,
	selectedSurfaces,
	onToggleSurface,
	onApplySurfacePreset,
	selectedMaterial,
	onSelectMaterial,
	representativeFullName,
	representativePhone,
	patientPhone,
	representativeRole,
	patientAgeYears,
	patientWeightKg,
	somaticProfile,
	allergies,
	onSomaticChange,
	onRepresentativeChange,
	onAnesthesiaCalculationChange,
	onApplyAnesthesiaText,
}) => {
	return (
		<div className="space-y-4">
			<PediatricTreatmentPresetsGrid
				activePresetId={activePresetId}
				onSelectPreset={onSelectPreset}
				isInvasiveProtocol={isInvasiveProtocol}
				consentSigned={representative.consentSigned}
				onSignConsent323Fz={onSignConsent323Fz}
			/>

			<div>
				<PediatricAnesthesiaCalculator
					initialWeightKg={patientWeightKg || 20}
					patientAgeYears={patientAgeYears}
					somaticProfile={somaticProfile}
					allergies={allergies}
					onCalculationChange={onAnesthesiaCalculationChange}
					onApplyToProtocol={onApplyAnesthesiaText}
				/>
			</div>

			<div>
				<PediatricSomaticAndLegalRep
					defaultRepresentativeFullName={representativeFullName}
					defaultRepresentativePhone={representativePhone || patientPhone}
					defaultRepresentativeRole={representativeRole}
					patientAge={patientAgeYears}
					onSomaticChange={onSomaticChange}
					onRepresentativeChange={onRepresentativeChange}
				/>
			</div>

			{activePreset.allowsSurfaces && (
				<PediatricToothSurfacesCard
					selectedSurfaces={selectedSurfaces}
					onToggleSurface={onToggleSurface}
					onApplySurfacePreset={onApplySurfacePreset}
				/>
			)}

			<PediatricMaterialsCard
				activePreset={activePreset}
				selectedMaterial={selectedMaterial}
				onSelectMaterial={onSelectMaterial}
			/>
		</div>
	);
};
