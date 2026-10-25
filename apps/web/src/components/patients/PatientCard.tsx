/**
 * apps/web/src/components/patients/PatientCard.tsx
 * DENTE Dental CRM — Каноническая карточка пациента и ЭМК (Apple Health Records HIG).
 * Decomposed facade strictly <= 80 lines following Mandate 8b.
 */

import React from "react";
import {
	type PatientCardActiveTab,
	type PatientCardProps,
	type PatientLegalStatuses,
	DEMO_PATIENT_CARD_DATA,
} from "./patientCardModules/patientCardTypes";
import { PatientCardHeader } from "./patientCardModules/PatientCardHeader";
import { PatientCardActions } from "./patientCardModules/PatientCardActions";
import { PatientCardTabContent } from "./patientCardModules/PatientCardTabContent";
import { usePatientCardState } from "./patientCardModules/usePatientCardState";
import "./PatientHistoryTab.css";

export { PatientCardModal } from "./PatientCardModal";
export type { PatientCardModalProps } from "./PatientCardModal";
export type { PatientCardActiveTab, PatientCardProps, PatientLegalStatuses };
export { DEMO_PATIENT_CARD_DATA };

export const PatientCard: React.FC<PatientCardProps> = React.memo(
	function PatientCard(props) {
		const { onEditPatient, className = "", visits, dashboard, onNavigateToVisit, onNewAppointment } = props;
		const state = usePatientCardState(props);

		return (
			<div
				className={`patient-card-root flex flex-col gap-4 w-full box-border text-[var(--ink)] ${className}`}
				data-testid="patient-card-component"
			>
				<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col gap-3.5">
					<PatientCardHeader
						patientData={state.patientData}
						initials={state.initials}
						ageString={state.ageString}
						contractStatus={state.contractStatus}
						consentStatus={state.consentStatus}
						safetyEvaluation={state.safetyEvaluation}
						onApplyNorm={state.handleApplyNorm}
						onPrint={state.handlePrint}
						onEditPatient={onEditPatient}
						onSelectTab={state.setActiveTab}
					/>
					<PatientCardActions activeTab={state.activeTab} onTabChange={state.setActiveTab} />
				</div>

				<PatientCardTabContent
					activeTab={state.activeTab}
					patientData={state.patientData}
					safetyProfile={state.safetyProfile}
					visits={visits}
					dashboard={dashboard}
					onNavigateToVisit={onNavigateToVisit}
					onNewAppointment={onNewAppointment}
					onPrintOutpatientCard={state.handlePrint}
					onUpdateSafetyProfile={state.setSafetyProfile}
				/>
			</div>
		);
	},
);

PatientCard.displayName = "PatientCard";
export default PatientCard;
