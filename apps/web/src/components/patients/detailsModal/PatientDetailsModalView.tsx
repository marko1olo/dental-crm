import React from "react";
import { createPortal } from "react-dom";
import { PatientAnamnesisTab } from "../PatientAnamnesisTab";
import { PatientDetailsFooter } from "./PatientDetailsFooter";
import { PatientFamilyWalletSection } from "./PatientFamilyWalletSection";
import { PatientFinancialSummary } from "./PatientFinancialSummary";
import { PatientGeneralSection } from "./PatientGeneralSection";
import { PatientHeaderSection } from "./PatientHeaderSection";
import { PatientSafetyAlertBanner } from "./PatientSafetyAlertBanner";
import { PatientTabsSection } from "./PatientTabsSection";
import type { PatientDetailsModalProps } from "./patientDetailsTypes";
import { usePatientDetailsLogic } from "./usePatientDetailsLogic";

export const PatientDetailsModalView: React.FC<PatientDetailsModalProps> = React.memo(
	function PatientDetailsModalView(props) {
		const { isOpen, onClose, className = "", onNavigateToVisit, onNewAppointment } = props;
		const {
			activeTab,
			setActiveTab,
			isSaving,
			patientData,
			safety,
			setSafety,
			familyData,
			effectivePatientId,
			safetyEvaluation,
			loadFamily,
			handleApplyNorm,
			handleUpdateField,
			handleSave,
			handlePrint,
		} = usePatientDetailsLogic(props);

		if (!isOpen) return null;

		const modalContent = (
			<div
				className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs print:p-0 print:bg-white print:static"
				role="dialog"
				aria-modal="true"
				aria-labelledby="patient-details-modal-title"
				onClick={(e) => {
					if (e.target === e.currentTarget) onClose();
				}}
				data-testid="patient-details-modal-backdrop"
			>
				<div
					data-testid="patient-details-modal"
					className={`bg-[var(--paper-strong)] border border-[var(--glass-border)] rounded-t-[24px] sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-[var(--ink)] print:border-none print:shadow-none print:max-h-none print:rounded-none ${className}`}
					onClick={(e) => e.stopPropagation()}
				>
					<PatientHeaderSection
						patientData={patientData}
						onApplyNorm={handleApplyNorm}
						onPrint={handlePrint}
						onClose={onClose}
					/>

					<PatientSafetyAlertBanner
						evaluation={safetyEvaluation}
						onGoToAnamnesis={() => setActiveTab("anamnesis")}
					/>

					<PatientTabsSection activeTab={activeTab} onSelectTab={setActiveTab} />

					<div className="p-4 sm:p-5 overflow-y-auto flex-1">
						{activeTab === "general" && (
							<PatientGeneralSection patientData={patientData} onUpdateField={handleUpdateField} />
						)}
						{activeTab === "anamnesis" && (
							<PatientAnamnesisTab
								patientId={effectivePatientId}
								patientName={patientData.fullName}
								initialProfile={safety}
								onSaveProfile={(updated) => setSafety(updated)}
								onApplySomaticNorm={handleApplyNorm}
							/>
						)}
						{activeTab === "family" && (
							<PatientFamilyWalletSection
								patientId={effectivePatientId}
								patientName={patientData.fullName}
								familyData={familyData}
								onFamilyDataChanged={loadFamily}
							/>
						)}
						{activeTab === "finance" && (
							<PatientFinancialSummary
								patient={patientData}
								onUpdateBalance={(bal) => handleUpdateField("patientBalanceRub", bal)}
								onNavigateToVisit={onNavigateToVisit}
								onNewAppointment={onNewAppointment}
							/>
						)}
					</div>

					<PatientDetailsFooter isSaving={isSaving} onSave={handleSave} onClose={onClose} />
				</div>
			</div>
		);

		return typeof document !== "undefined" && document.body
			? createPortal(modalContent, document.body)
			: modalContent;
	},
);

export default PatientDetailsModalView;
