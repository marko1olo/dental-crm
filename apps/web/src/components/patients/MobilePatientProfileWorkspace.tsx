/**
 * DENTE CRM — Dedicated Mobile Patient Profile Workspace & HUD
 * (Apple HIG & Anti-Desktop-Squeeze Mandate, 390x844 Screen Ergonomics)
 *
 * Layer 5: Canonical Ultra-Thin UI Facade (<= 150 lines, 100% backwards compatible).
 */

import { Calendar, Stethoscope } from "lucide-react";
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
			<div className="mobile-profile-floating-bar" data-testid="mobile-profile-floating-bar">
				<button
					type="button"
					onClick={handleStartVisit}
					className="flex-1 min-h-[48px] h-12 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-md active:scale-98 transition-all cursor-pointer"
					data-testid="mobile-floating-start-visit-btn"
				>
					<Stethoscope size={18} />
					<span>Начать приём</span>
				</button>
				<button
					type="button"
					onClick={handleBookAppointment}
					className="min-h-[48px] h-12 px-4 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)] font-bold text-sm inline-flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
					data-testid="mobile-floating-book-btn"
				>
					<Calendar size={18} className="text-teal-600 dark:text-teal-400" />
					<span>Запись</span>
				</button>
			</div>
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
