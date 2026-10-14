/**
 * DENTE CRM — Patient Header Card Component (Compact Facade <= 250 lines)
 * (DOMAIN: macOS/iOS Clinical HIG, Patient Profile Header, Sentiment & Loyalty)
 */

import React, { useMemo, useState, useEffect } from "react";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { evaluatePatientSafetyFlags, isNegativeAllergyStatement } from "./safetyMath";
import { FamilyWalletModal } from "../patient/FamilyWalletModal";

import {
	type PatientHeaderCardProps,
	type SomaticFlagItem,
	formatPatientBirthAndAge,
} from "./headerModules/patientHeaderTypes";
import { PatientHeaderIdentity } from "./headerModules/PatientHeaderIdentity";
import { PatientHeaderQuickActions } from "./headerModules/PatientHeaderQuickActions";
import { PatientHeaderAllergiesAlert } from "./headerModules/PatientHeaderAllergiesAlert";
import { PatientHeaderBalanceBadge } from "./headerModules/PatientHeaderBalanceBadge";

export type { PatientHeaderCardProps };
export { formatPatientBirthAndAge };

export const PatientHeaderCard: React.FC<PatientHeaderCardProps> = ({
	patientId,
	patient: propPatient,
	onEditPatient,
	onOpenAnamnesis,
	className = "",
}) => {
	const { dashboard, selectedPatient: ctxPatient } = useAppLogicContext();
	const [isFamilyWalletOpen, setIsFamilyWalletOpen] = useState(false);

	const resolvedPatient = useMemo(() => {
		if (propPatient) return propPatient;
		if (patientId && dashboard?.patients) {
			return dashboard.patients.find((p) => p.id === patientId) || null;
		}
		return ctxPatient || null;
	}, [propPatient, patientId, dashboard?.patients, ctxPatient]);

	useEffect(() => {
		const handleOpenFamily = (e?: Event) => {
			const customEvt = e as CustomEvent<{ patientId?: string }>;
			if (!customEvt?.detail?.patientId || customEvt.detail.patientId === resolvedPatient?.id) {
				setIsFamilyWalletOpen(true);
			}
		};
		window.addEventListener("dente-open-family-wallet", handleOpenFamily);
		return () => window.removeEventListener("dente-open-family-wallet", handleOpenFamily);
	}, [resolvedPatient?.id]);

	const allergyText = useMemo(() => {
		if (!resolvedPatient) return "";
		const raw =
			resolvedPatient.allergies ||
			resolvedPatient.anamnesis?.allergies ||
			"";
		if (
			raw &&
			typeof raw === "string" &&
			raw.trim() &&
			!isNegativeAllergyStatement(raw)
		) {
			return raw.trim();
		}
		if (resolvedPatient.clinicalSafetyProfile) {
			const evalResult = evaluatePatientSafetyFlags(resolvedPatient.clinicalSafetyProfile);
			const allergyFlags = evalResult.activeFlags.filter(
				(f) =>
					f.category === "anesthesia_allergy" ||
					f.id.startsWith("allergy_") ||
					f.id.includes("allergy") ||
					f.id === "anaphylaxis_history" ||
					f.id === "custom_allergy_notes",
			);
			if (allergyFlags.length > 0) {
				return allergyFlags.map((f) => f.shortBadge).join(" ");
			}
		}
		return "";
	}, [resolvedPatient]);

	const criticalSomaticFlags = useMemo<SomaticFlagItem[]>(() => {
		if (!resolvedPatient) return [];
		const profile =
			resolvedPatient.clinicalSafetyProfile ||
			resolvedPatient.anamnesis?.clinicalSafetyProfile ||
			resolvedPatient.somaticRiskProfile;
		if (profile) {
			const evalResult = evaluatePatientSafetyFlags(profile);
			return evalResult.activeFlags.filter(
				(f) =>
					f.category !== "anesthesia_allergy" &&
					!f.id.startsWith("allergy_") &&
					!f.id.includes("allergy") &&
					f.id !== "anaphylaxis_history",
			);
		}
		const chronicText =
			resolvedPatient.chronicDiseases ||
			resolvedPatient.anamnesis?.chronicDiseases ||
			resolvedPatient.notes;
		if (typeof chronicText === "string" && chronicText.trim()) {
			const evalResult = evaluatePatientSafetyFlags(chronicText);
			return evalResult.activeFlags.filter(
				(f) =>
					f.category !== "anesthesia_allergy" &&
					!f.id.startsWith("allergy_") &&
					!f.id.includes("allergy") &&
					f.id !== "anaphylaxis_history",
			);
		}
		return [];
	}, [resolvedPatient]);

	const diagnosisText = useMemo(() => {
		if (!resolvedPatient) return "";
		const d =
			resolvedPatient.diagnosis ||
			resolvedPatient.primaryDiagnosis ||
			resolvedPatient.mkb10 ||
			resolvedPatient.anamnesis?.diagnosis ||
			"";
		return typeof d === "string" ? d.trim() : "";
	}, [resolvedPatient]);

	const nextAppointment = useMemo(() => {
		if (!resolvedPatient?.id || !dashboard?.appointments) return null;
		const nowTime = Date.now();
		const upcoming = (dashboard.appointments as Array<{
			id: string;
			patientId?: string;
			startsAt?: string;
			status?: string;
			reason?: string;
		}>)
			.filter(
				(a) =>
					a.patientId === resolvedPatient.id &&
					a.status !== "cancelled" &&
					a.startsAt &&
					new Date(a.startsAt).getTime() >= nowTime - 60 * 60 * 1000,
			)
			.sort(
				(a, b) =>
					new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime(),
			);
		return upcoming[0] || null;
	}, [resolvedPatient?.id, dashboard?.appointments]);

	if (!resolvedPatient) {
		return null;
	}

	const fullName = resolvedPatient.fullName || "Пациент без имени";
	const initials =
		fullName
			.split(" ")
			.map((part: string) => part[0])
			.filter(Boolean)
			.slice(0, 2)
			.join("")
			.toUpperCase() || "П";

	const balance = Number(
		resolvedPatient.balanceRub ?? resolvedPatient.balance ?? 0,
	);
	const phone = resolvedPatient.phone || "";
	const birthDateStr = formatPatientBirthAndAge(
		resolvedPatient.birthDate || resolvedPatient.birthDateIso,
	);
	const isActiveVisit = dashboard?.activeVisit?.patientId === resolvedPatient.id;

	const { contractStatus, consentStatus } = useMemo(() => {
		if (!resolvedPatient?.id) return { contractStatus: "none" as const, consentStatus: "none" as const };
		// biome-ignore lint/suspicious/noExplicitAny: generated docs
		const allDocs: any[] = (dashboard?.documents ?? []) as any[];
		// biome-ignore lint/suspicious/noExplicitAny: patient docs
		const patientDocs = allDocs.filter((doc: any) => doc && doc.patientId === resolvedPatient.id);

		// Contract status
		const contractDoc = patientDocs.find(
			(d) => d.kind === "paid_medical_services_contract" && d.status !== "voided",
		);
		let cStatus: "issued" | "draft" | "none" = "none";
		if (contractDoc) {
			cStatus = contractDoc.status === "issued" ? "issued" : "draft";
		} else if (resolvedPatient.hasSignedContract || resolvedPatient.contractStatus === "issued") {
			cStatus = "issued";
		} else if (resolvedPatient.contractStatus === "draft") {
			cStatus = "draft";
		}

		// Consent status
		const consentDoc = patientDocs.find(
			(d) =>
				(d.kind === "informed_consent" || d.kind === "procedure_specific_consent_packet") &&
				d.status !== "voided",
		);
		let iStatus: "issued" | "draft" | "none" = "none";
		if (consentDoc) {
			iStatus = consentDoc.status === "issued" ? "issued" : "draft";
		} else if (resolvedPatient.hasSignedConsent || resolvedPatient.consentStatus === "issued") {
			iStatus = "issued";
		} else if (resolvedPatient.consentStatus === "draft") {
			iStatus = "draft";
		}

		return { contractStatus: cStatus, consentStatus: iStatus };
	}, [resolvedPatient, dashboard?.documents]);

	return (
		<div
			className={`patient-header-card p-2 sm:p-2.5 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xs transition-colors flex flex-col gap-1.5 ${className}`}
			data-testid="patient-header-card"
		>
			{/* Main Compact Row: <= 60-70px total desktop height */}
			<div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap min-w-0">
				<PatientHeaderIdentity
					resolvedPatient={resolvedPatient}
					fullName={fullName}
					initials={initials}
					birthDateStr={birthDateStr}
					phone={phone}
					diagnosisText={diagnosisText}
					isActiveVisit={isActiveVisit}
					nextAppointment={nextAppointment}
					contractStatus={contractStatus}
					consentStatus={consentStatus}
				/>

				{/* Right: Balance & Action Toolbar */}
				<div className="flex items-center gap-2 shrink-0">
					<PatientHeaderBalanceBadge
						patientId={resolvedPatient.id}
						patientFullName={fullName}
						balance={balance}
					/>

					<PatientHeaderQuickActions
						resolvedPatient={resolvedPatient}
						fullName={fullName}
						phone={phone}
						clinicLegalName={dashboard?.clinicSettings?.profile?.legalName}
						onOpenAnamnesis={onOpenAnamnesis}
						onEditPatient={onEditPatient}
						onOpenFamilyWallet={() => setIsFamilyWalletOpen(true)}
					/>
				</div>
			</div>

			<PatientHeaderAllergiesAlert
				allergyText={allergyText}
				criticalSomaticFlags={criticalSomaticFlags}
			/>

			<FamilyWalletModal
				isOpen={isFamilyWalletOpen}
				onClose={() => setIsFamilyWalletOpen(false)}
				patientId={resolvedPatient.id}
				patientName={fullName}
			/>
		</div>
	);
};

export default PatientHeaderCard;
