import {
	evaluatePatientSafetyFlags,
	isNegativeAllergyStatement,
} from "../safetyMath";
import type { SomaticFlagItem } from "./patientHeaderTypes";

export function extractPatientSafetyFlags(p: any): {
	allergyText: string;
	criticalSomaticFlags: SomaticFlagItem[];
} {
	if (!p) return { allergyText: "", criticalSomaticFlags: [] };
	const raw = p.allergies || p.anamnesis?.allergies || "";
	let allergyText =
		raw && typeof raw === "string" && raw.trim() && !isNegativeAllergyStatement(raw)
			? raw.trim()
			: "";
	if (!allergyText && p.clinicalSafetyProfile) {
		const res = evaluatePatientSafetyFlags(p.clinicalSafetyProfile);
		const aFlags = res.activeFlags.filter(
			(f) =>
				f.category === "anesthesia_allergy" ||
				f.id.startsWith("allergy_") ||
				f.id.includes("allergy") ||
				f.id === "anaphylaxis_history" ||
				f.id === "custom_allergy_notes",
		);
		if (aFlags.length > 0) allergyText = aFlags.map((f) => f.shortBadge).join(" ");
	}
	const profile =
		p.clinicalSafetyProfile ||
		p.anamnesis?.clinicalSafetyProfile ||
		p.somaticRiskProfile ||
		p.chronicDiseases ||
		p.anamnesis?.chronicDiseases ||
		p.notes;
	const somaticFlags = profile
		? evaluatePatientSafetyFlags(profile).activeFlags.filter(
				(f) =>
					f.category !== "anesthesia_allergy" &&
					!f.id.startsWith("allergy_") &&
					!f.id.includes("allergy") &&
					f.id !== "anaphylaxis_history",
			)
		: [];
	return { allergyText, criticalSomaticFlags: somaticFlags };
}

export function resolveUpcomingAppointment(patientId?: string, appointments?: any[]): any {
	if (!patientId || !appointments) return null;
	const nowTime = Date.now();
	return (
		(appointments as Array<any>)
			.filter(
				(a) =>
					a.patientId === patientId &&
					a.status !== "cancelled" &&
					a.startsAt &&
					new Date(a.startsAt).getTime() >= nowTime - 60 * 60 * 1000,
			)
			.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ||
		null
	);
}

export function resolvePatientDocs(
	patient: any,
	docs?: any[],
): { contractStatus: "issued" | "draft" | "none"; consentStatus: "issued" | "draft" | "none" } {
	if (!patient?.id) return { contractStatus: "none", consentStatus: "none" };
	const pDocs = (docs || []).filter((d: any) => d && d.patientId === patient.id);
	const cDoc = pDocs.find((d) => d.kind === "paid_medical_services_contract" && d.status !== "voided");
	const contractStatus = cDoc
		? cDoc.status === "issued"
			? "issued"
			: "draft"
		: patient.hasSignedContract || patient.contractStatus === "issued"
			? "issued"
			: patient.contractStatus === "draft"
				? "draft"
				: "none";
	const iDoc = pDocs.find(
		(d) =>
			(d.kind === "informed_consent" || d.kind === "procedure_specific_consent_packet") &&
			d.status !== "voided",
	);
	const consentStatus = iDoc
		? iDoc.status === "issued"
			? "issued"
			: "draft"
		: patient.hasSignedConsent || patient.consentStatus === "issued"
			? "issued"
			: patient.consentStatus === "draft"
				? "draft"
				: "none";
	return { contractStatus, consentStatus };
}
