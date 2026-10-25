import type { Patient } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { fetchWithHandling } from "../../../utils/networkUtils";
import {
	formatSafetyProfileToDiaryText,
	type PatientClinicalSafetyProfile,
} from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import type { PatientCoreDraft } from "../PatientCoreEditorForm";

export async function persistPatientCardModalToApi(
	patientData: PatientGeneralInfo,
	safetyProfile: PatientClinicalSafetyProfile,
	demoPatientId: string,
): Promise<void> {
	if (!patientData.id || patientData.id === demoPatientId) return;
	const diaryNotes = patientData.doctorClinicalNotes?.trim() || formatSafetyProfileToDiaryText(safetyProfile);
	const covLimitRub = typeof patientData.dmsCoverageLimitRub === "number" ? patientData.dmsCoverageLimitRub : (patientData.dmsCoverageLimitRub ? Number(patientData.dmsCoverageLimitRub) : null);
	const covLimitKop = patientData.dmsCoverageLimitKopecks ?? (covLimitRub !== null && !isNaN(covLimitRub) ? Math.round(covLimitRub * 100) : null);
	try {
		await fetch(`/api/patients/${patientData.id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				fullName: patientData.fullName?.trim() || undefined,
				phone: patientData.phone?.trim() || null,
				birthDate: patientData.birthDate?.trim() || null,
				email: ((patientData as any)?.email as string | undefined)?.trim() || null,
				notes: diaryNotes || null,
			}),
		});
		await fetch(`/api/patients/${patientData.id}/administrative-profile`, {
			method: "PUT",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				snils: patientData.snils?.trim() || null,
				taxpayerInn: patientData.inn && /^\d{10}$|^\d{12}$/.test(patientData.inn.trim()) ? patientData.inn.trim() : null,
				insurancePolicyNumber: patientData.omsPolicyNumber?.trim() || null,
				dmsInsuranceCompany: patientData.dmsInsuranceCompany?.trim() || null,
				dmsPolicyNumber: patientData.dmsPolicyNumber?.trim() || null,
				dmsGuaranteeLetterNumber: patientData.dmsGuaranteeLetterNumber?.trim() || null,
				dmsCoverageLimitRub: covLimitRub,
				dmsCoverageLimitKopecks: covLimitKop,
				registrationAddress: patientData.registrationAddress?.trim() || null,
				residentialAddress: patientData.residentialAddress?.trim() || null,
				clinicalSafetyProfile: safetyProfile,
			}),
		});
	} catch {
		// Non-blocking fallback
	}
}

export async function executePatientCardModalSaveAutonomy({
	selectedPatient,
	updatedGeneral,
	updatedSafety,
	updatePatientCoreDraft,
	updatePatientAdministrativeProfileDraft,
	setDashboard,
}: {
	selectedPatient: Patient;
	updatedGeneral: PatientGeneralInfo;
	updatedSafety: PatientClinicalSafetyProfile;
	updatePatientCoreDraft: (field: keyof PatientCoreDraft, value: string) => void;
	updatePatientAdministrativeProfileDraft: (field: any, value: any) => void;
	setDashboard?: (updater: (curr: any) => any) => void;
}) {
	if (updatedGeneral.fullName?.trim()) updatePatientCoreDraft("fullName", updatedGeneral.fullName.trim());
	if (updatedGeneral.phone !== undefined) updatePatientCoreDraft("phone", updatedGeneral.phone ?? "");
	if (updatedGeneral.birthDate !== undefined) updatePatientCoreDraft("birthDate", updatedGeneral.birthDate ?? "");
	if (updatedGeneral.doctorClinicalNotes !== undefined) updatePatientCoreDraft("notes", updatedGeneral.doctorClinicalNotes ?? "");
	if (updatedGeneral.snils !== undefined) updatePatientAdministrativeProfileDraft("snils", updatedGeneral.snils ?? "");
	if (updatedGeneral.inn !== undefined) updatePatientAdministrativeProfileDraft("taxpayerInn", updatedGeneral.inn ?? "");
	if (updatedGeneral.omsPolicyNumber !== undefined) updatePatientAdministrativeProfileDraft("insurancePolicyNumber", updatedGeneral.omsPolicyNumber ?? "");
	if (updatedGeneral.registrationAddress !== undefined) updatePatientAdministrativeProfileDraft("registrationAddress", updatedGeneral.registrationAddress ?? "");
	if (updatedGeneral.residentialAddress !== undefined) updatePatientAdministrativeProfileDraft("residentialAddress", updatedGeneral.residentialAddress ?? "");
	if (updatedGeneral.dmsInsuranceCompany !== undefined) updatePatientAdministrativeProfileDraft("dmsInsuranceCompany", updatedGeneral.dmsInsuranceCompany ?? "");
	if (updatedGeneral.dmsPolicyNumber !== undefined) updatePatientAdministrativeProfileDraft("dmsPolicyNumber", updatedGeneral.dmsPolicyNumber ?? "");
	if (updatedGeneral.dmsGuaranteeLetterNumber !== undefined) updatePatientAdministrativeProfileDraft("dmsGuaranteeLetterNumber", updatedGeneral.dmsGuaranteeLetterNumber ?? "");

	try {
		const resCore = await fetchWithHandling(`/api/patients/${selectedPatient.id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				fullName: updatedGeneral.fullName?.trim() || selectedPatient.fullName,
				phone: updatedGeneral.phone?.trim() || null,
				birthDate: updatedGeneral.birthDate?.trim() || null,
				email: ((updatedGeneral as any)?.email as string | undefined)?.trim() || selectedPatient.email || null,
				notes: updatedGeneral.doctorClinicalNotes?.trim() || selectedPatient.notes || null,
			}),
		});
		const covLimitRub = typeof updatedGeneral.dmsCoverageLimitRub === "number" ? updatedGeneral.dmsCoverageLimitRub : (updatedGeneral.dmsCoverageLimitRub ? Number(updatedGeneral.dmsCoverageLimitRub) : null);
		const covLimitKop = updatedGeneral.dmsCoverageLimitKopecks ?? (covLimitRub !== null && !isNaN(covLimitRub) ? Math.round(covLimitRub * 100) : null);
		const resAdmin = await fetchWithHandling(`/api/patients/${selectedPatient.id}/administrative-profile`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				snils: updatedGeneral.snils?.trim() || null,
				taxpayerInn: updatedGeneral.inn && /^\d{10}$|^\d{12}$/.test(updatedGeneral.inn.trim()) ? updatedGeneral.inn.trim() : null,
				insurancePolicyNumber: updatedGeneral.omsPolicyNumber?.trim() || null,
				dmsInsuranceCompany: updatedGeneral.dmsInsuranceCompany?.trim() || null,
				dmsPolicyNumber: updatedGeneral.dmsPolicyNumber?.trim() || null,
				dmsGuaranteeLetterNumber: updatedGeneral.dmsGuaranteeLetterNumber?.trim() || null,
				dmsCoverageLimitRub: covLimitRub,
				dmsCoverageLimitKopecks: covLimitKop,
				registrationAddress: updatedGeneral.registrationAddress?.trim() || null,
				residentialAddress: updatedGeneral.residentialAddress?.trim() || null,
				clinicalSafetyProfile: updatedSafety,
			}),
		});
		const latestRes = resAdmin.ok ? resAdmin : resCore;
		if (latestRes.ok && setDashboard) {
			const saved = (await latestRes.json()) as Patient;
			setDashboard((curr: any) => curr ? { ...curr, patients: curr.patients.map((p: Patient) => (p.id === saved.id ? saved : p)) } : curr);
		}
	} catch {
		// Handled by fetchWithHandling/toast
	}
}
