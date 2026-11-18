import type { Patient, Dashboard } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { DEMO_SHOWCASE_MODAL_PATIENT } from "../patientCardModalModules/patientCardModalTypes";
import {
	buildPatientAdministrativeProfilePayload,
	type PatientAdministrativeProfileDraft,
} from "../../../utils/clinicProfileUtils";
import { emptyPatientAdministrativeProfileDraft } from "../../../utils/draftDefaults";
import {
	formatSafetyProfileToDiaryText,
	type PatientClinicalSafetyProfile,
} from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import type { PatientCoreDraft } from "../coreEditor/usePatientCoreDraftDebounce";

function buildAdministrativeDraftFromGeneralInfo(
	general: PatientGeneralInfo,
	covLimitRub: number | null,
	covLimitKop: number | null,
): PatientAdministrativeProfileDraft {
	const identityDoc = (general.passportSeries || general.passportNumber)
		? `${general.passportSeries ?? ""} ${general.passportNumber ?? ""}`.trim()
		: ((general as { identityDocument?: string }).identityDocument ?? "");

	return {
		...emptyPatientAdministrativeProfileDraft(),
		identityDocument: identityDoc,
		taxpayerInn: general.inn ?? general.taxpayerInn ?? "",
		registrationAddress: general.registrationAddress ?? "",
		residentialAddress: general.residentialAddress ?? "",
		insurancePolicyNumber: general.omsPolicyNumber ?? "",
		snils: general.snils ?? "",
		legalRepresentativeFullName: general.representativeFullName ?? "",
		legalRepresentativeRelationship: general.representativeType ?? "",
		legalRepresentativeIdentityDocument: general.representativeDoc ?? (general as { representativePassportDetails?: string }).representativePassportDetails ?? "",
		legalRepresentativePhone: general.representativePhone ?? "",
		preferredDocumentRecipient: general.preferredDocumentRecipient ?? "",
		dataProcessingBasisNote: general.dataProcessingBasisNote ?? "",
		dmsInsuranceCompany: general.dmsInsuranceCompany ?? "",
		dmsPolicyNumber: general.dmsPolicyNumber ?? "",
		dmsGuaranteeLetterNumber: general.dmsGuaranteeLetterNumber ?? "",
		dmsCoverageLimitRub: covLimitRub,
		dmsCoverageLimitKopecks: covLimitKop,
	};
}

export async function persistPatientCardModalToApi(
	patientData: PatientGeneralInfo,
	safetyProfile: PatientClinicalSafetyProfile,
	demoPatientId?: string,
): Promise<void> {
	if (!patientData.id) return;
	// Защита от мутации демонстрационного пациента в режиме показа (SEV-1.1)
	const isDemo = isDemoShowcaseMode();
	const isDemoId = patientData.id === DEMO_SHOWCASE_MODAL_PATIENT.id || (Boolean(demoPatientId) && patientData.id === demoPatientId);
	if (isDemo && isDemoId) {
		return;
	}
	const diaryNotes = patientData.doctorClinicalNotes?.trim() || formatSafetyProfileToDiaryText(safetyProfile);
	const covLimitRub = typeof patientData.dmsCoverageLimitRub === "number" ? patientData.dmsCoverageLimitRub : (patientData.dmsCoverageLimitRub ? Number(patientData.dmsCoverageLimitRub) : null);
	const covLimitKop = patientData.dmsCoverageLimitKopecks ?? (covLimitRub !== null && !isNaN(covLimitRub) ? Math.round(covLimitRub * 100) : null);
	try {
		const resCore = await fetch(`/api/patients/${patientData.id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify({
				fullName: patientData.fullName?.trim() || undefined,
				phone: patientData.phone?.trim() || null,
				birthDate: patientData.birthDate?.trim() || null,
				email: patientData.email?.trim() || null,
				notes: diaryNotes || null,
			}),
		});
		if (!resCore.ok) {
			const errBody = await resCore.text().catch(() => "");
			throw new Error(`[PatientPersistence] Ошибка сохранения данных пациента: статус ${resCore.status} ${errBody}`);
		}
		const adminDraft = buildAdministrativeDraftFromGeneralInfo(patientData, covLimitRub, covLimitKop);
		const adminPayload = {
			...buildPatientAdministrativeProfilePayload(adminDraft),
			dmsInsuranceCompany: patientData.dmsInsuranceCompany?.trim() || null,
			dmsPolicyNumber: patientData.dmsPolicyNumber?.trim() || null,
			dmsGuaranteeLetterNumber: patientData.dmsGuaranteeLetterNumber?.trim() || null,
			dmsCoverageLimitRub: covLimitRub,
			dmsCoverageLimitKopecks: covLimitKop,
			clinicalSafetyProfile: safetyProfile,
		};
		const resAdmin = await fetch(`/api/patients/${patientData.id}/administrative-profile`, {
			method: "PUT",
			headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
			body: JSON.stringify(adminPayload),
		});
		if (!resAdmin.ok) {
			const errBody = await resAdmin.text().catch(() => "");
			throw new Error(`[PatientPersistence] Ошибка сохранения административного профиля: статус ${resAdmin.status} ${errBody}`);
		}
	} catch (err: unknown) {
		console.error("[PatientPersistence] Failed to persist patient card to API:", err);
		throw err;
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
	updatePatientAdministrativeProfileDraft: (field: keyof PatientAdministrativeProfileDraft, value: string | number[]) => void;
	setDashboard?: (updater: (curr: Dashboard | null | undefined) => Dashboard | null | undefined) => void;
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

	const identityDoc = (updatedGeneral.passportSeries || updatedGeneral.passportNumber)
		? `${updatedGeneral.passportSeries ?? ""} ${updatedGeneral.passportNumber ?? ""}`.trim()
		: ((updatedGeneral as { identityDocument?: string }).identityDocument ?? "");
	if (identityDoc) updatePatientAdministrativeProfileDraft("identityDocument", identityDoc);
	if (updatedGeneral.representativeFullName !== undefined) updatePatientAdministrativeProfileDraft("legalRepresentativeFullName", updatedGeneral.representativeFullName ?? "");
	if (updatedGeneral.representativeType !== undefined) updatePatientAdministrativeProfileDraft("legalRepresentativeRelationship", updatedGeneral.representativeType ?? "");
	const repDoc = updatedGeneral.representativeDoc ?? (updatedGeneral as { representativePassportDetails?: string }).representativePassportDetails;
	if (repDoc !== undefined) updatePatientAdministrativeProfileDraft("legalRepresentativeIdentityDocument", repDoc ?? "");
	if (updatedGeneral.representativePhone !== undefined) updatePatientAdministrativeProfileDraft("legalRepresentativePhone", updatedGeneral.representativePhone ?? "");
	if (updatedGeneral.preferredDocumentRecipient !== undefined) updatePatientAdministrativeProfileDraft("preferredDocumentRecipient", updatedGeneral.preferredDocumentRecipient ?? "");
	if (updatedGeneral.dataProcessingBasisNote !== undefined) updatePatientAdministrativeProfileDraft("dataProcessingBasisNote", updatedGeneral.dataProcessingBasisNote ?? "");

	try {
		const resCore = await fetchWithHandling(`/api/patients/${selectedPatient.id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				fullName: updatedGeneral.fullName?.trim() || selectedPatient.fullName,
				phone: updatedGeneral.phone?.trim() || null,
				birthDate: updatedGeneral.birthDate?.trim() || null,
				email: updatedGeneral.email?.trim() || selectedPatient.email || null,
				notes: updatedGeneral.doctorClinicalNotes?.trim() || selectedPatient.notes || null,
			}),
		});
		const covLimitRub = typeof updatedGeneral.dmsCoverageLimitRub === "number" ? updatedGeneral.dmsCoverageLimitRub : (updatedGeneral.dmsCoverageLimitRub ? Number(updatedGeneral.dmsCoverageLimitRub) : null);
		const covLimitKop = updatedGeneral.dmsCoverageLimitKopecks ?? (covLimitRub !== null && !isNaN(covLimitRub) ? Math.round(covLimitRub * 100) : null);
		const adminDraft = buildAdministrativeDraftFromGeneralInfo(updatedGeneral, covLimitRub, covLimitKop);
		const adminPayload = {
			...buildPatientAdministrativeProfilePayload(adminDraft),
			dmsInsuranceCompany: updatedGeneral.dmsInsuranceCompany?.trim() || null,
			dmsPolicyNumber: updatedGeneral.dmsPolicyNumber?.trim() || null,
			dmsGuaranteeLetterNumber: updatedGeneral.dmsGuaranteeLetterNumber?.trim() || null,
			dmsCoverageLimitRub: covLimitRub,
			dmsCoverageLimitKopecks: covLimitKop,
			clinicalSafetyProfile: updatedSafety,
		};
		const resAdmin = await fetchWithHandling(`/api/patients/${selectedPatient.id}/administrative-profile`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(adminPayload),
		});
		const latestRes = resAdmin.ok ? resAdmin : resCore;
		if (latestRes.ok && setDashboard) {
			const saved = (await latestRes.json()) as Patient;
			setDashboard((curr) => curr ? { ...curr, patients: curr.patients.map((p: Patient) => (p.id === saved.id ? saved : p)) } : curr);
		}
	} catch (err: unknown) {
		console.error("[PatientPersistence] Failed to execute patient card save autonomy:", err);
	}
}
