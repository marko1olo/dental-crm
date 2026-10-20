import React from "react";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import type { PatientCardTab } from "./patientCardModalTypes";
import { PatientGeneralInfoTab } from "../tabs/PatientGeneralInfoTab";
import { PatientFinanceTab } from "../tabs/PatientFinanceTab";
import { PatientRadiologyTab } from "../tabs/PatientRadiologyTab";
import { PatientDentalFormulaTab } from "../formula/PatientDentalFormulaTab";
import { PatientDocumentsTab } from "../tabs/PatientDocumentsTab";
import { PeriodontogramChart } from "../../perio/PeriodontogramChart";

interface PatientCardModalBodyProps {
	readonly activeTab: PatientCardTab;
	readonly patientData: PatientGeneralInfo;
	readonly safetyProfile: PatientClinicalSafetyProfile;
	readonly disabled: boolean;
	readonly onUpdatePatientField: (field: keyof PatientGeneralInfo, value: any) => void;
	readonly onUpdateSafetyProfile: (s: PatientClinicalSafetyProfile) => void;
	readonly onApplyNorm: () => void;
	readonly onPrint: () => void;
	readonly onNavigateToVisit?: ((visitId: string) => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
	readonly onOpenDmsLetters: () => void;
	readonly onOpenTaxCertificate: () => void;
}

export const PatientCardModalBody: React.FC<PatientCardModalBodyProps> = ({
	activeTab,
	patientData,
	safetyProfile,
	disabled,
	onUpdatePatientField,
	onUpdateSafetyProfile,
	onApplyNorm,
	onPrint,
	onNavigateToVisit,
	onNewAppointment,
	onOpenDmsLetters,
	onOpenTaxCertificate,
}) => {
	return (
		<div className="p-3 sm:p-5 overflow-y-auto flex-1">
			{activeTab === "finance" ? (
				<PatientFinanceTab
					patient={patientData}
					onUpdateBalance={(newBal) => onUpdatePatientField("patientBalanceRub", newBal)}
					onNavigateToVisit={onNavigateToVisit}
					onNewAppointment={onNewAppointment}
					onOpenTaxCertificate={onOpenTaxCertificate}
					disabled={disabled}
				/>
			) : activeTab === "documents" ? (
				<PatientDocumentsTab patient={patientData as any} onPrintOutpatientCard={onPrint} />
			) : activeTab === "perio" ? (
				<PeriodontogramChart
					patientId={patientData.id}
					patientName={patientData.fullName}
				/>
			) : activeTab === "formula" ? (
				<PatientDentalFormulaTab
					patientId={patientData.id || ""}
					patientBirthDate={patientData.birthDate}
					patientName={patientData.fullName}
				/>
			) : activeTab === "radiology" ? (
				<PatientRadiologyTab
					patientId={patientData.id}
					patientName={patientData.fullName}
					patientBirthDate={patientData.birthDate}
				/>
			) : (
				<PatientGeneralInfoTab
					patient={patientData}
					safetyProfile={safetyProfile}
					onUpdatePatient={onUpdatePatientField}
					onUpdateSafetyProfile={onUpdateSafetyProfile}
					onApplySomaticNorm={onApplyNorm}
					disabled={disabled}
					activeSection={activeTab === "anamnesis" ? "somatic" : (activeTab as any)}
					onNavigateToVisit={onNavigateToVisit}
					onNewAppointment={onNewAppointment}
					onOpenDmsLetters={onOpenDmsLetters}
					onOpenTaxCertificate={onOpenTaxCertificate}
				/>
			)}
		</div>
	);
};
