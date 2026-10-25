import React from "react";
import { PatientDemographicsBasicCard } from "./generalInfo/PatientDemographicsBasicCard";
import { PatientIdentitySection } from "./generalInfo/PatientIdentitySection";
import { PatientInsuranceSection } from "./generalInfo/PatientInsuranceSection";
import { PatientTagsMarketingSection } from "./generalInfo/PatientTagsMarketingSection";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import type { PatientGeneralInfo } from "./generalInfo/types";

interface PatientGeneralAccordionsGroupProps {
	patient?: PatientGeneralInfo | null;
	currentProfile: PatientClinicalSafetyProfile;
	disabled?: boolean;
	accordionsOpen: { passport: boolean; insurance: boolean; notes: boolean };
	toggleAccordion: (key: "passport" | "insurance" | "notes") => void;
	passportSummary: string;
	insuranceSummary: string;
	notesSummary: string;
	addressesMatchState: boolean;
	setAddressesMatchState: React.Dispatch<React.SetStateAction<boolean>>;
	onUpdatePatient?: (field: keyof PatientGeneralInfo, value: any) => void;
	onToggleAllergy: (field: "hasPenicillinAllergy" | "hasNsaidAllergy" | "hasLatexAllergy") => void;
	onApplySomaticNorm?: () => void;
	onUpdateSafetyProfile?: (profile: PatientClinicalSafetyProfile) => void;
	onOpenDmsLetters?: () => void;
	onOpenTaxCertificate?: () => void;
	onToggleServiceTag: (tag: string) => void;
	onAppendDoctorTag: (tag: string) => void;
}

export const PatientGeneralAccordionsGroup: React.FC<PatientGeneralAccordionsGroupProps> = ({
	patient,
	currentProfile,
	disabled = false,
	accordionsOpen,
	toggleAccordion,
	passportSummary,
	insuranceSummary,
	notesSummary,
	addressesMatchState,
	setAddressesMatchState,
	onUpdatePatient,
	onToggleAllergy,
	onApplySomaticNorm,
	onUpdateSafetyProfile,
	onOpenDmsLetters,
	onOpenTaxCertificate,
	onToggleServiceTag,
	onAppendDoctorTag,
}) => {
	return (
		<div className="flex flex-col gap-4">
			<PatientDemographicsBasicCard
				patient={patient}
				currentProfile={currentProfile}
				disabled={disabled}
				onUpdatePatient={onUpdatePatient}
				onToggleAllergy={onToggleAllergy}
				onApplySomaticNorm={onApplySomaticNorm}
				onUpdateSafetyProfile={onUpdateSafetyProfile}
			/>

			<PatientIdentitySection
				patient={patient}
				onUpdatePatient={onUpdatePatient}
				disabled={disabled}
				isOpen={accordionsOpen.passport}
				onToggle={() => toggleAccordion("passport")}
				summary={passportSummary}
				addressesMatchState={addressesMatchState}
				setAddressesMatchState={setAddressesMatchState}
			/>

			<PatientInsuranceSection
				patient={patient}
				onUpdatePatient={onUpdatePatient}
				disabled={disabled}
				isOpen={accordionsOpen.insurance}
				onToggle={() => toggleAccordion("insurance")}
				summary={insuranceSummary}
				onOpenDmsLetters={onOpenDmsLetters}
				onOpenTaxCertificate={onOpenTaxCertificate}
			/>

			<PatientTagsMarketingSection
				patient={patient}
				onUpdatePatient={onUpdatePatient}
				disabled={disabled}
				isOpen={accordionsOpen.notes}
				onToggle={() => toggleAccordion("notes")}
				summary={notesSummary}
				onToggleServiceTag={onToggleServiceTag}
				onAppendDoctorTag={onAppendDoctorTag}
			/>
		</div>
	);
};
