/**
 * apps/web/src/components/patients/PatientCard.tsx
 *
 * DENTE Dental CRM — Каноническая карточка пациента и ЭМК (Apple Health Records HIG).
 * Layer 5 Facade: компактный координатор <= 250 строк.
 */

import React, { useCallback, useMemo, useState } from "react";
import { showToast } from "../GlobalToast";
import {
	type PatientClinicalSafetyProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
} from "./safetyMath";
import { PatientHistoryTab, DEFAULT_CLINICAL_VISITS } from "./PatientHistoryTab";
import { PatientDentalFormulaTab } from "./formula/PatientDentalFormulaTab";
import { SomaticAnamnesisCard } from "../clinical/SomaticAnamnesisCard";
import type { PatientGeneralInfo } from "./tabs/PatientGeneralInfoTab";
import { PatientDocumentsTab } from "./tabs/PatientDocumentsTab";
import {
	type PatientCardActiveTab,
	type PatientCardProps,
	type PatientLegalStatuses,
	DEMO_PATIENT_CARD_DATA,
} from "./patientCardModules/patientCardTypes";
import { PatientCardHeader } from "./patientCardModules/PatientCardHeader";
import { PatientCardActions } from "./patientCardModules/PatientCardActions";
import "./PatientHistoryTab.css";

// Re-export PatientCardModal and types for backwards compatibility
export { PatientCardModal } from "./PatientCardModal";
export type { PatientCardModalProps } from "./PatientCardModal";
export type { PatientCardActiveTab, PatientCardProps, PatientLegalStatuses };
export { DEMO_PATIENT_CARD_DATA };

export const PatientCard: React.FC<PatientCardProps> = React.memo(
	function PatientCard({
		patient: propPatient,
		patientId,
		safetyProfile: propSafetyProfile,
		dashboard,
		initialTab = "timeline",
		visits = DEFAULT_CLINICAL_VISITS,
		onNavigateToVisit,
		onNewAppointment,
		onEditPatient,
		onPrintCard043,
		className = "",
	}) {
		const [activeTab, setActiveTab] = useState<PatientCardActiveTab>(initialTab);

		const patientData = useMemo<PatientGeneralInfo>(() => {
			if (propPatient) return propPatient;
			if (patientId && dashboard?.patients) {
				const match = dashboard.patients.find((p) => p.id === patientId);
				if (match) {
					return {
						id: match.id,
						fullName: match.fullName,
						phone: match.phone,
						birthDate: match.birthDate,
						notes: match.notes,
						cardNumber: (match as { cardNumber?: string }).cardNumber || undefined,
					};
				}
			}
			return DEMO_PATIENT_CARD_DATA;
		}, [propPatient, patientId, dashboard]);

		const [safetyProfile, setSafetyProfile] = useState<PatientClinicalSafetyProfile>(() => {
			return propSafetyProfile || DEFAULT_SOMATIC_HEALTHY_NORM;
		});

		const safetyEvaluation = useMemo(() => {
			return evaluatePatientSafetyFlags(safetyProfile);
		}, [safetyProfile]);

		const handleApplyNorm = useCallback(() => {
			const clean = createHealthySomaticNormProfile();
			setSafetyProfile(clean);
			showToast("Применена физиологическая норма: соматически здоров", "success");
		}, []);

		const handlePrint = useCallback(() => {
			if (onPrintCard043) {
				onPrintCard043();
			} else if (typeof window !== "undefined") {
				window.print();
				showToast("Печать медицинской карты", "info");
			}
		}, [onPrintCard043]);

		const ageString = useMemo(() => {
			if (!patientData.birthDate) return "";
			const d = new Date(patientData.birthDate);
			if (Number.isNaN(d.getTime())) return "";
			const today = new Date();
			let age = today.getFullYear() - d.getFullYear();
			const m = today.getMonth() - d.getMonth();
			if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
				age--;
			}
			let word = "лет";
			const last = age % 10;
			const lastTwo = age % 100;
			if (lastTwo >= 11 && lastTwo <= 14) word = "лет";
			else if (last === 1) word = "год";
			else if (last >= 2 && last <= 4) word = "года";
			return `${age} ${word}`;
		}, [patientData.birthDate]);

		const initials = useMemo(() => {
			const name = patientData.fullName || "Пациент";
			return name
				.split(" ")
				.map((n) => n[0])
				.filter(Boolean)
				.slice(0, 2)
				.join("")
				.toUpperCase();
		}, [patientData.fullName]);

		const { contractStatus, consentStatus } = useMemo(() => {
			if (!patientData?.id)
				return { contractStatus: "none" as const, consentStatus: "none" as const };
			// biome-ignore lint/suspicious/noExplicitAny: generated docs
			const allDocs: any[] = (dashboard?.documents ?? []) as any[];
			// biome-ignore lint/suspicious/noExplicitAny: patient docs
			const patientDocs = allDocs.filter(
				(doc: any) => doc && doc.patientId === patientData.id,
			);

			const contractDoc = patientDocs.find(
				(d) => d.kind === "paid_medical_services_contract" && d.status !== "voided",
			);
			let cStatus: "issued" | "draft" | "none" = "none";
			if (contractDoc) {
				cStatus = contractDoc.status === "issued" ? "issued" : "draft";
			} else if (
				(patientData as any).hasSignedContract ||
				(patientData as any).contractStatus === "issued"
			) {
				cStatus = "issued";
			} else if ((patientData as any).contractStatus === "draft") {
				cStatus = "draft";
			}

			const consentDoc = patientDocs.find(
				(d) =>
					(d.kind === "informed_consent" ||
						d.kind === "procedure_specific_consent_packet") &&
					d.status !== "voided",
			);
			let iStatus: "issued" | "draft" | "none" = "none";
			if (consentDoc) {
				iStatus = consentDoc.status === "issued" ? "issued" : "draft";
			} else if (
				(patientData as any).hasSignedConsent ||
				(patientData as any).consentStatus === "issued"
			) {
				iStatus = "issued";
			} else if ((patientData as any).consentStatus === "draft") {
				iStatus = "draft";
			}

			return { contractStatus: cStatus, consentStatus: iStatus };
		}, [patientData, dashboard?.documents]);

		return (
			<div
				className={`patient-card-root flex flex-col gap-4 w-full box-border text-[var(--ink)] ${className}`}
				data-testid="patient-card-component"
			>
				{/* 1. PATIENT PROFILE HEADER CARD (Apple Health Inset Style) */}
				<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-sm flex flex-col gap-3.5">
					<PatientCardHeader
						patientData={patientData}
						initials={initials}
						ageString={ageString}
						contractStatus={contractStatus}
						consentStatus={consentStatus}
						safetyEvaluation={safetyEvaluation}
						onApplyNorm={handleApplyNorm}
						onPrint={handlePrint}
						onEditPatient={onEditPatient}
						onSelectTab={setActiveTab}
					/>
					<PatientCardActions activeTab={activeTab} onTabChange={setActiveTab} />
				</div>

				{/* 2. TAB CONTENT */}
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
								onSave={(newProfile) => setSafetyProfile(newProfile)}
								onApplyNorm={(normProfile) => setSafetyProfile(normProfile)}
							/>
						</div>
					)}

					{activeTab === "documents" && (
						<PatientDocumentsTab
							patient={patientData as any}
							onPrintOutpatientCard={handlePrint}
						/>
					)}
				</div>
			</div>
		);
	},
);

PatientCard.displayName = "PatientCard";
export default PatientCard;
