import React from "react";
import { VisitProtocolView } from "../VisitProtocolView";
import { PatientFamilyCard } from "../PatientFamilyCard";
import { usePatientFamilyLoader } from "../overview/usePatientFamilyLoader";
import { DEFAULT_SOMATIC_HEALTHY_NORM } from "../safetyMath";
import type { PatientGeneralInfoTabProps } from "./generalInfoTabTypes";
import { PatientSafetyBanner } from "./generalInfo/PatientSafetyBanner";
import { usePatientGeneralInfoTabLogic } from "./generalInfo/usePatientGeneralInfoTabLogic";
import { PatientGeneralAccordionsGroup } from "./PatientGeneralAccordionsGroup";
import { PatientRepresentativesSection } from "./generalInfo/PatientRepresentativesSection";

export * from "./generalInfoTabTypes";

// Вкладка общих данных: паспортная часть, контактные данные, соматический статус и законные представители (Мандат 8p / 8s).
// Визиты живут в табе «Визиты», финансы — в табе «Финансы», семейный кошелек — в табе «Семья».
export const PatientGeneralInfoTab: React.FC<PatientGeneralInfoTabProps> = React.memo(
	function PatientGeneralInfoTab(props) {
		const {
			patient,
			safetyProfile = DEFAULT_SOMATIC_HEALTHY_NORM,
			onUpdatePatient,
			onUpdateSafetyProfile,
			onApplySomaticNorm,
			disabled = false,
			activeSection = "all",
			onOpenDmsLetters,
			onOpenTaxCertificate,
		} = props;

		const logic = usePatientGeneralInfoTabLogic({
			patient,
			safetyProfile,
			disabled,
			onUpdatePatient,
			onUpdateSafetyProfile,
		});

		const { familyData, familyLoadFailure, loadFamily } = usePatientFamilyLoader(
			patient?.id,
			null,
		);

		return (
			<div className="patient-general-info-tab flex flex-col gap-6 text-[var(--ink)]">
				{(activeSection === "all" || activeSection === "general") && (
					<PatientGeneralAccordionsGroup
						patient={patient}
						disabled={disabled}
						currentProfile={logic.currentProfile}
						accordionsOpen={logic.accordionsOpen}
						toggleAccordion={logic.toggleAccordion}
						passportSummary={logic.passportSummary}
						insuranceSummary={logic.insuranceSummary}
						notesSummary={logic.notesSummary}
						addressesMatchState={logic.addressesMatchState}
						setAddressesMatchState={logic.setAddressesMatchState}
						onUpdatePatient={onUpdatePatient}
						onToggleAllergy={logic.handleToggleAllergy}
						onApplySomaticNorm={onApplySomaticNorm}
						onUpdateSafetyProfile={onUpdateSafetyProfile}
						onOpenDmsLetters={onOpenDmsLetters}
						onOpenTaxCertificate={onOpenTaxCertificate}
						onToggleServiceTag={logic.handleToggleServiceTag}
						onAppendDoctorTag={logic.handleAppendDoctorTag}
					/>
				)}

				{(activeSection === "all" || activeSection === "somatic") && (
					<PatientSafetyBanner
						currentProfile={logic.currentProfile}
						disabled={disabled}
						mode="full"
						patientId={patient?.id}
						patientName={patient?.fullName}
						onToggleAllergy={logic.handleToggleAllergy}
						onApplySomaticNorm={onApplySomaticNorm}
						onUpdateSafetyProfile={onUpdateSafetyProfile}
					/>
				)}

				{(activeSection === "all" || activeSection === "family") && (
					<div className="flex flex-col gap-4">
						<PatientFamilyCard
							patientId={patient?.id || null}
							patientName={patient?.fullName || null}
							familyData={familyData}
							loadFailure={familyLoadFailure}
							onRetryLoad={loadFamily}
							onFamilyDataChanged={loadFamily}
						/>
						<PatientRepresentativesSection
							patient={patient}
							onUpdatePatient={onUpdatePatient}
							disabled={disabled}
							mode="full"
						/>
					</div>
				)}

				{logic.viewingProtocolVisit && (
					<VisitProtocolView
						isOpen={true}
						onClose={() => logic.setViewingProtocolVisit(null)}
						visitId={logic.viewingProtocolVisit.id}
						patientId={patient?.id}
						patientName={patient?.fullName}
						doctorName={logic.viewingProtocolVisit.doctorName}
						initialTooth={logic.viewingProtocolVisit.toothNumber}
						initialDate={logic.viewingProtocolVisit.date}
						initialDiagnosis={logic.viewingProtocolVisit.services}
					/>
				)}
			</div>
		);
	},
);

PatientGeneralInfoTab.displayName = "PatientGeneralInfoTab";

export default PatientGeneralInfoTab;
