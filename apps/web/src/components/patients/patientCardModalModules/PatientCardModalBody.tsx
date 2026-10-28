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
import { PatientHistoryTab, DEFAULT_CLINICAL_VISITS } from "../PatientHistoryTab";
import { SomaticAnamnesisCard } from "../../clinical/SomaticAnamnesisCard";
import { PatientFamilyAndInsuranceWidget } from "../PatientFamilyAndInsuranceWidget";

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
	readonly dashboard?: any | undefined;
	readonly visits?: any[] | undefined;
}

export const PatientCardModalBody: React.FC<PatientCardModalBodyProps> = ({
	activeTab, patientData, safetyProfile, disabled,
	onUpdatePatientField, onUpdateSafetyProfile, onApplyNorm, onPrint,
	onNavigateToVisit, onNewAppointment, onOpenDmsLetters, onOpenTaxCertificate,
	dashboard, visits,
}) => {
	return (
		<div className="p-3 sm:p-5 pb-[calc(100px+env(safe-area-inset-bottom,0px))] sm:pb-5 overflow-y-auto flex-1">
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
				<PeriodontogramChart patientId={patientData.id ?? undefined} patientName={patientData.fullName ?? undefined} />
			) : activeTab === "formula" ? (
				<PatientDentalFormulaTab patientId={patientData.id || ""} patientBirthDate={patientData.birthDate ?? undefined} patientName={patientData.fullName ?? undefined} />
			) : activeTab === "radiology" ? (
				<PatientRadiologyTab patientId={patientData.id ?? undefined} patientName={patientData.fullName ?? undefined} patientBirthDate={patientData.birthDate ?? undefined} />
			) : activeTab === "anamnesis" ? (
				<div className="p-1 sm:p-2">
					<SomaticAnamnesisCard
						initialProfile={safetyProfile}
						patientId={patientData.id}
						patientName={patientData.fullName}
						onSave={(newProfile) => onUpdateSafetyProfile(newProfile)}
						onApplyNorm={(normProfile) => {
							onUpdateSafetyProfile(normProfile);
							onApplyNorm();
						}}
					/>
				</div>
			) : activeTab === "visits" ? (
				<PatientHistoryTab
					patientId={patientData.id}
					patientName={patientData.fullName}
					visits={visits || DEFAULT_CLINICAL_VISITS}
					dashboard={dashboard}
					onNavigateToVisit={onNavigateToVisit}
					onNewAppointment={onNewAppointment}
				/>
			) : activeTab === "family" ? (
				<div className="p-2 sm:p-3">
					<PatientFamilyAndInsuranceWidget
						patient={patientData as any}
						patientBalance={Number(patientData.patientBalanceRub ?? 0) || 0}
						insurancePolicyNumber={patientData.omsPolicyNumber || undefined}
						onUpdateInsurancePolicy={(p) => onUpdatePatientField("omsPolicyNumber", p)}
					/>
				</div>
			) : (
				<PatientGeneralInfoTab
					patient={patientData}
					safetyProfile={safetyProfile}
					onUpdatePatient={onUpdatePatientField}
					onUpdateSafetyProfile={onUpdateSafetyProfile}
					onApplySomaticNorm={onApplyNorm}
					disabled={disabled}
					activeSection={activeTab as any}
					onNavigateToVisit={onNavigateToVisit}
					onNewAppointment={onNewAppointment}
					onOpenDmsLetters={onOpenDmsLetters}
					onOpenTaxCertificate={onOpenTaxCertificate}
				/>
			)}
		</div>
	);
};
