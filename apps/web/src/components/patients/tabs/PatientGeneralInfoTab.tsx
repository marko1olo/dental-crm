import React, { useMemo } from "react";
import { VisitProtocolView } from "../VisitProtocolView";
import { DEFAULT_SOMATIC_HEALTHY_NORM } from "../safetyMath";
import type { PatientGeneralInfoTabProps } from "./generalInfoTabTypes";
import { PatientSafetyBanner } from "./generalInfo/PatientSafetyBanner";
import { PatientVisitsOverviewSection } from "./generalInfo/PatientVisitsOverviewSection";
import { usePatientGeneralInfoTabLogic } from "./generalInfo/usePatientGeneralInfoTabLogic";
import { adaptPatientVisitsToClinicalTimeline } from "./generalInfo/patientClinicalVisitsAdapter";
import { PatientGeneralAccordionsGroup } from "./PatientGeneralAccordionsGroup";
import { PatientFamilyCard } from "../PatientFamilyCard";
import { PatientRepresentativesSection } from "./generalInfo/PatientRepresentativesSection";

export * from "./generalInfoTabTypes";

// Соматический анамнез: клиническая норма и аллергоанамнез без латинских архаизмов
// Family hooks: usePatientFamilyLoader delegated to usePatientGeneralInfoTabLogic
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
			onNavigateToVisit,
			onNewAppointment,
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

		const clinicalVisits = useMemo(
			() => adaptPatientVisitsToClinicalTimeline(patient?.visitsHistory),
			[patient?.visitsHistory],
		);

		return (
			<div className="patient-general-info-tab flex flex-col gap-6 text-[var(--ink)]">
				{(activeSection === "all" || activeSection === "general") && (
					<PatientGeneralAccordionsGroup
						patient={patient} disabled={disabled} currentProfile={logic.currentProfile}
						accordionsOpen={logic.accordionsOpen} toggleAccordion={logic.toggleAccordion}
						passportSummary={logic.passportSummary} insuranceSummary={logic.insuranceSummary}
						notesSummary={logic.notesSummary} addressesMatchState={logic.addressesMatchState}
						setAddressesMatchState={logic.setAddressesMatchState} onUpdatePatient={onUpdatePatient}
						onToggleAllergy={logic.handleToggleAllergy} onApplySomaticNorm={onApplySomaticNorm}
						onUpdateSafetyProfile={onUpdateSafetyProfile} onOpenDmsLetters={onOpenDmsLetters}
						onOpenTaxCertificate={onOpenTaxCertificate} onToggleServiceTag={logic.handleToggleServiceTag}
						onAppendDoctorTag={logic.handleAppendDoctorTag}
					/>
				)}

				{(activeSection === "all" || activeSection === "somatic") && (
					<PatientSafetyBanner
						currentProfile={logic.currentProfile} disabled={disabled} mode="full"
						patientId={patient?.id} patientName={patient?.fullName}
						onToggleAllergy={logic.handleToggleAllergy} onApplySomaticNorm={onApplySomaticNorm}
						onUpdateSafetyProfile={onUpdateSafetyProfile}
					/>
				)}

				{(activeSection === "all" || activeSection === "visits") && (
					<PatientVisitsOverviewSection
						patient={patient} disabled={disabled} clinicalTimelineVisits={clinicalVisits}
						onUpdatePatient={onUpdatePatient} onNavigateToVisit={onNavigateToVisit}
						onNewAppointment={onNewAppointment} onOpenTaxCertificate={onOpenTaxCertificate}
					/>
				)}

				{(activeSection === "all" || activeSection === "family") && (
					<div className="flex flex-col gap-4">
						<PatientFamilyCard
							patientId={patient?.id || null} patientName={patient?.fullName || null}
							familyData={logic.familyData} loadFailure={logic.familyLoadFailure}
							onRetryLoad={logic.loadFamily} onFamilyDataChanged={logic.loadFamily}
						/>
						<PatientRepresentativesSection
							patient={patient} onUpdatePatient={onUpdatePatient}
							disabled={disabled} mode="full"
						/>
					</div>
				)}

				{logic.viewingProtocolVisit && (
					<VisitProtocolView
						isOpen={true} onClose={() => logic.setViewingProtocolVisit(null)}
						visitId={logic.viewingProtocolVisit.id} patientId={patient?.id}
						patientName={patient?.fullName} doctorName={logic.viewingProtocolVisit.doctorName}
						initialTooth={logic.viewingProtocolVisit.toothNumber} initialDate={logic.viewingProtocolVisit.date}
						initialDiagnosis={logic.viewingProtocolVisit.services}
					/>
				)}
			</div>
		);
	},
);

export default PatientGeneralInfoTab;
