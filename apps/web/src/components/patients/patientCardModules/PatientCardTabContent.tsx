import React from "react";
import { SomaticAnamnesisCard } from "../../clinical/SomaticAnamnesisCard";
import { PatientDentalFormulaTab } from "../formula/PatientDentalFormulaTab";
import { DEFAULT_CLINICAL_VISITS, PatientHistoryTab } from "../PatientHistoryTab";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import { PatientDocumentsTab } from "../tabs/PatientDocumentsTab";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import type { PatientCardActiveTab, PatientCardProps } from "./patientCardTypes";

interface PatientCardTabContentProps {
	readonly activeTab: PatientCardActiveTab;
	readonly patientData: PatientGeneralInfo;
	readonly safetyProfile: PatientClinicalSafetyProfile;
	readonly visits?: PatientCardProps["visits"];
	readonly dashboard?: PatientCardProps["dashboard"];
	readonly onNavigateToVisit?: PatientCardProps["onNavigateToVisit"];
	readonly onNewAppointment?: PatientCardProps["onNewAppointment"];
	readonly onPrintOutpatientCard?: () => void;
	readonly onUpdateSafetyProfile: (profile: PatientClinicalSafetyProfile) => void;
}

export function PatientCardTabContent({
	activeTab,
	patientData,
	safetyProfile,
	visits = DEFAULT_CLINICAL_VISITS,
	dashboard,
	onNavigateToVisit,
	onNewAppointment,
	onPrintOutpatientCard,
	onUpdateSafetyProfile,
}: PatientCardTabContentProps) {
	return (
		<div className="patient-card-tab-content">
			{activeTab === "timeline" && (
				<PatientHistoryTab
					patientId={patientData.id}
					patientName={patientData.fullName}
					visits={visits}
					dashboard={dashboard}
					onNavigateToVisit={onNavigateToVisit}
					onNewAppointment={onNewAppointment}
				/>
			)}

			{activeTab === "formula" && (
				<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
					<PatientDentalFormulaTab
						patientId={patientData.id || ""}
						patientBirthDate={patientData.birthDate}
						patientName={patientData.fullName}
					/>
				</div>
			)}

			{activeTab === "anamnesis" && (
				<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm">
					<SomaticAnamnesisCard
						initialProfile={safetyProfile}
						patientId={patientData.id}
						patientName={patientData.fullName}
						onSave={onUpdateSafetyProfile}
						onApplyNorm={onUpdateSafetyProfile}
					/>
				</div>
			)}

			{activeTab === "documents" && (
				<PatientDocumentsTab
					patient={patientData as any}
					onPrintOutpatientCard={onPrintOutpatientCard}
				/>
			)}
		</div>
	);
}
