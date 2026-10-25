import { useCallback, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import {
	type PatientClinicalSafetyProfile,
	DEFAULT_SOMATIC_HEALTHY_NORM,
	createHealthySomaticNormProfile,
	evaluatePatientSafetyFlags,
} from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import {
	type PatientCardActiveTab,
	type PatientCardProps,
	DEMO_PATIENT_CARD_DATA,
} from "./patientCardTypes";

export function usePatientCardState({
	patient: propPatient,
	patientId,
	safetyProfile: propSafetyProfile,
	dashboard,
	initialTab = "timeline",
	onPrintCard043,
}: Pick<
	PatientCardProps,
	"patient" | "patientId" | "safetyProfile" | "dashboard" | "initialTab" | "onPrintCard043"
>) {
	const [activeTab, setActiveTab] = useState<PatientCardActiveTab>(initialTab);

	const patientData = useMemo<PatientGeneralInfo>(() => {
		if (propPatient) return propPatient;
		if (patientId && dashboard?.patients) {
			const match = dashboard.patients.find((p) => p.id === patientId);
			if (match) {
				return {
					id: match.id, fullName: match.fullName, phone: match.phone, birthDate: match.birthDate,
					notes: match.notes, cardNumber: (match as { cardNumber?: string }).cardNumber || undefined,
				};
			}
		}
		return DEMO_PATIENT_CARD_DATA;
	}, [propPatient, patientId, dashboard]);

	const [safetyProfile, setSafetyProfile] = useState<PatientClinicalSafetyProfile>(() => {
		return propSafetyProfile || DEFAULT_SOMATIC_HEALTHY_NORM;
	});

	const safetyEvaluation = useMemo(() => evaluatePatientSafetyFlags(safetyProfile), [safetyProfile]);

	const handleApplyNorm = useCallback(() => {
		setSafetyProfile(createHealthySomaticNormProfile());
		showToast("Применена физиологическая норма: соматически здоров", "success");
	}, []);

	const handlePrint = useCallback(() => {
		if (onPrintCard043) onPrintCard043();
		else if (typeof window !== "undefined") {
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
		if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
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
		return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
	}, [patientData.fullName]);

	const { contractStatus, consentStatus } = useMemo(() => {
		if (!patientData?.id) return { contractStatus: "none" as const, consentStatus: "none" as const };
		const allDocs: any[] = (dashboard?.documents ?? []) as any[];
		const patientDocs = allDocs.filter((doc: any) => doc && doc.patientId === patientData.id);
		const contractDoc = patientDocs.find((d) => d.kind === "paid_medical_services_contract" && d.status !== "voided");
		let cStatus: "issued" | "draft" | "none" = "none";
		if (contractDoc) cStatus = contractDoc.status === "issued" ? "issued" : "draft";
		else if ((patientData as any).hasSignedContract || (patientData as any).contractStatus === "issued") cStatus = "issued";
		else if ((patientData as any).contractStatus === "draft") cStatus = "draft";

		const consentDoc = patientDocs.find((d) => (d.kind === "informed_consent" || d.kind === "procedure_specific_consent_packet") && d.status !== "voided");
		let iStatus: "issued" | "draft" | "none" = "none";
		if (consentDoc) iStatus = consentDoc.status === "issued" ? "issued" : "draft";
		else if ((patientData as any).hasSignedConsent || (patientData as any).consentStatus === "issued") iStatus = "issued";
		else if ((patientData as any).consentStatus === "draft") iStatus = "draft";

		return { contractStatus: cStatus, consentStatus: iStatus };
	}, [patientData, dashboard?.documents]);

	return {
		activeTab, setActiveTab, patientData, safetyProfile, setSafetyProfile, safetyEvaluation,
		handleApplyNorm, handlePrint, ageString, initials, contractStatus, consentStatus,
	};
}
