/**
 * DENTE CRM — Dedicated Mobile Patient Profile Workspace & HUD (Apple HIG, 390x844).
 */

import React from "react";
import { TaxDeductionCertificateModal } from "../finance/TaxDeductionCertificateModal";
import {
	MobilePatientDocumentsTab,
	MobilePatientFinanceTab,
	MobilePatientHeaderCard,
	MobilePatientHistoryTab,
	MobilePatientInfoTab,
	MobilePatientPlansTab,
	MobilePatientScansTab,
	MobilePatientTabsBar,
	MobileProfileFloatingBar,
	type MobilePatientProfileWorkspaceProps,
	type MobilePatientTab,
	formatPatientBirthAndAge,
	useMobilePatientProfile,
} from "./mobileProfile";

export type { MobilePatientTab, MobilePatientProfileWorkspaceProps };
export { formatPatientBirthAndAge };

export const MobilePatientProfileWorkspace: React.FC<MobilePatientProfileWorkspaceProps> = ({
	patient,
	dashboard: propDashboard,
	onBack,
	onSelectPatient,
	onOpenVisit,
	onNewAppointment,
	money,
	patientCoreDraft,
	updatePatientCoreDraft,
	savePatientCore,
	patientCoreDirty = false,
	patientCoreSaveState = "idle",
	className = "",
}) => {
	const {
		dashboard,
		activeTab,
		setActiveTab,
		isTaxModalOpen,
		setIsTaxModalOpen,
		balanceRub,
		patientAppointments,
		patientStudies,
		patientInvoices,
		handleStartVisit,
		handleBookAppointment,
		handleApplySomaticNorm,
	} = useMobilePatientProfile({ patient, propDashboard, onNewAppointment, updatePatientCoreDraft });

	return (
		<div className={`mobile-patient-profile-container ${className}`} data-testid="mobile-patient-profile-workspace">
			<MobilePatientHeaderCard
				patient={patient}
				dashboard={dashboard}
				onBack={onBack}
				onSelectPatient={onSelectPatient}
				money={money}
				patientCoreDraft={patientCoreDraft}
				updatePatientCoreDraft={updatePatientCoreDraft}
				savePatientCore={savePatientCore}
				patientCoreDirty={patientCoreDirty}
				patientCoreSaveState={patientCoreSaveState}
				onStartVisit={handleStartVisit}
				onOpenCardTab={() => setActiveTab("card")}
			/>
			<MobilePatientTabsBar
				activeTab={activeTab}
				onTabChange={setActiveTab}
				visitsCount={patientAppointments.length}
				scansCount={patientStudies.length}
			/>
			<main className="px-3.5 flex flex-col gap-3 pb-24" data-testid="mobile-tab-content-panel">
				{activeTab === "card" && (
					<MobilePatientInfoTab
						patient={patient}
						patientCoreDraft={patientCoreDraft}
						updatePatientCoreDraft={updatePatientCoreDraft}
						onApplySomaticNorm={handleApplySomaticNorm}
					/>
				)}
				{activeTab === "visits" && (
					<MobilePatientHistoryTab
						patientAppointments={patientAppointments}
						onBookAppointment={handleBookAppointment}
						onOpenVisit={onOpenVisit}
						onStartVisit={handleStartVisit}
					/>
				)}
				{activeTab === "plans" && <MobilePatientPlansTab patient={patient} dashboard={dashboard} money={money} />}
				{activeTab === "finance" && (
					<MobilePatientFinanceTab patient={patient} patientInvoices={patientInvoices} balanceRub={balanceRub} money={money} />
				)}
				{activeTab === "documents" && (
					<MobilePatientDocumentsTab patient={patient} onOpenTaxModal={() => setIsTaxModalOpen(true)} />
				)}
				{activeTab === "scans" && <MobilePatientScansTab patientStudies={patientStudies} />}
			</main>
			<MobileProfileFloatingBar onStartVisit={handleStartVisit} onBookAppointment={handleBookAppointment} />
			{isTaxModalOpen && (
				<TaxDeductionCertificateModal
					isOpen={isTaxModalOpen}
					onClose={() => setIsTaxModalOpen(false)}
					patientId={patient.id}
					patientName={patient.fullName}
					patientBirthDate={patient.birthDate ?? undefined}
				/>
			)}
		</div>
	);
};

export default MobilePatientProfileWorkspace;
