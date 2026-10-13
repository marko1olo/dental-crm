import type { Patient } from "@dental/shared";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import type { AppView } from "../../utils/routeUtils";
import { applySomaticNormToText } from "../../utils/somaticNorm";
import { showToast } from "../GlobalToast";
import type { PatientCoreDraft } from "./PatientCoreEditorForm";

export async function executePatientCoreSaveAutonomy({
	selectedPatient,
	patientCoreNameMissing,
	patientCoreDirty,
	savePatientCoreProp,
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	patientCoreNameMissing: boolean;
	patientCoreDirty: boolean;
	savePatientCoreProp?: () =>
		| undefined
		| boolean
		| Promise<undefined | boolean>;
	showToastFn?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
}) {
	if (!selectedPatient) {
		showToastFn("Выберите пациента для сохранения карточки", "warning");
		return { executed: false, reason: "no_patient" as const };
	}
	if (patientCoreNameMissing) {
		showToastFn("Введите ФИО пациента для сохранения", "warning");
		return { executed: false, reason: "missing_name" as const };
	}
	if (!patientCoreDirty) {
		showToastFn("Данные пациента актуальны (нет несохранённых правок)", "info");
		return { executed: false, reason: "not_dirty" as const };
	}
	try {
		const result = await savePatientCoreProp?.();
		if (result !== false) {
			showToastFn("Данные пациента сохранены", "success");
		}
		return {
			executed: result !== false,
			reason: result === false ? ("save_failed" as const) : ("saved" as const),
		};
	} catch {
		return { executed: false, reason: "save_failed" as const };
	}
}

export async function executePatientAdministrativeProfileSaveAutonomy({
	selectedPatient,
	patientAdministrativeProfileDirty,
	patientAdministrativeProfileValidationMessage,
	savePatientAdministrativeProfileProp,
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	patientAdministrativeProfileDirty: boolean;
	patientAdministrativeProfileValidationMessage: string | null | undefined;
	savePatientAdministrativeProfileProp?: () =>
		| undefined
		| boolean
		| Promise<undefined | boolean>;
	showToastFn?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
}) {
	if (!selectedPatient) {
		showToastFn("Выберите пациента перед сохранением реквизитов", "warning");
		return { executed: false, reason: "no_patient" as const };
	}
	if (patientAdministrativeProfileValidationMessage) {
		showToastFn(patientAdministrativeProfileValidationMessage, "warning");
	}
	if (!patientAdministrativeProfileDirty) {
		showToastFn("Реквизиты пациента актуальны", "info");
		return { executed: false, reason: "not_dirty" as const };
	}
	try {
		const result = await savePatientAdministrativeProfileProp?.();
		if (result !== false) {
			showToastFn("Реквизиты пациента сохранены", "success");
		}
		return {
			executed: result !== false,
			reason: result === false ? ("save_failed" as const) : ("saved" as const),
		};
	} catch {
		return { executed: false, reason: "save_failed" as const };
	}
}

export function executeOpenPatientVisitAutonomy({
	selectedPatient,
	setSelectedPatientId = (id: string) =>
		usePatientStore.getState().setSelectedPatientId(id),
	setCurrentView = (view: AppView) =>
		useAppStore.getState().setCurrentView(view),
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	visitId?: string;
	setSelectedPatientId?: (id: string) => void;
	setCurrentView?: (view: AppView) => void;
	showToastFn?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
}) {
	if (!selectedPatient) {
		showToastFn(
			"Выберите пациента из списка слева для открытия приёма",
			"info",
		);
		return { executed: false, reason: "no_patient" as const };
	}
	setSelectedPatientId(selectedPatient.id);
	setCurrentView("visit");
	showToastFn(`Открыт приём: ${selectedPatient.fullName}`, "success");
	return { executed: true, reason: "visit_opened" as const };
}

export function executeBookPatientAppointmentAutonomy({
	selectedPatient,
	setNewAppointmentDraft = (draft: any) =>
		useScheduleStore.getState().setNewAppointmentDraft(draft),
	setCurrentView = (view: AppView) =>
		useAppStore.getState().setCurrentView(view),
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	setNewAppointmentDraft?: (draft: any) => void;
	setCurrentView?: (view: AppView) => void;
	showToastFn?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
}) {
	if (!selectedPatient) {
		showToastFn(
			"Выберите пациента из списка слева для записи в расписание",
			"info",
		);
		return { executed: false, reason: "no_patient" as const };
	}
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const currentHour = now.getHours();
	const startHour = Math.min(Math.max(currentHour + 1, 9), 20);
	const endHour = Math.min(startHour + 1, 21);
	const startsAt = `${todayIso}T${pad(startHour)}:00:00.000Z`;
	const endsAt = `${todayIso}T${pad(endHour)}:00:00.000Z`;

	setNewAppointmentDraft({
		patientId: selectedPatient.id,
		doctorUserId: "",
		assistantUserId: "",
		chairId: "",
		status: "planned",
		startsAt,
		endsAt,
		reason: "Первичный приём и консультация",
		comment: "",
	});
	setCurrentView("schedule");
	showToastFn(
		`Пациент ${selectedPatient.fullName} выбран для записи в расписание`,
		"success",
	);
	return { executed: true, reason: "appointment_drafted" as const };
}

export function executePatientSomaticNormAutonomy({
	selectedPatient,
	currentNotes,
	updatePatientCoreDraft,
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	currentNotes?: string;
	updatePatientCoreDraft?: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
	showToastFn?: (
		text: string,
		type?: "success" | "error" | "info" | "warning",
		duration?: number,
	) => void;
}) {
	if (!selectedPatient) {
		showToastFn(
			"Выберите пациента перед установкой соматической нормы",
			"warning",
		);
		return { executed: false, reason: "no_patient" as const };
	}
	const newNotes = applySomaticNormToText(currentNotes);

	if (typeof updatePatientCoreDraft === "function") {
		updatePatientCoreDraft("notes", newNotes);
	}
	showToastFn("Установлена норма соматического статуса", "success");
	return { executed: true, notes: newNotes };
}

import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { fetchWithHandling } from "../../utils/networkUtils";
import {
	DEFAULT_SOMATIC_HEALTHY_NORM,
	formatSafetyProfileToDiaryText,
	type PatientClinicalSafetyProfile,
	parseSafetyProfileFromText,
} from "./safetyMath";
import type { PatientGeneralInfo } from "./tabs/PatientGeneralInfoTab";

export function mapPatientToGeneralInfo(raw: any): PatientGeneralInfo {
	if (!raw || typeof raw !== "object") return {};
	const admin =
		raw.administrativeProfile && typeof raw.administrativeProfile === "object"
			? raw.administrativeProfile
			: {};
	return {
		...raw,
		snils: raw.snils ?? admin.snils ?? "",
		inn: raw.inn ?? admin.taxpayerInn ?? "",
		omsPolicyNumber: raw.omsPolicyNumber ?? admin.insurancePolicyNumber ?? "",
		registrationAddress:
			raw.registrationAddress ?? admin.registrationAddress ?? "",
		residentialAddress:
			raw.residentialAddress ?? admin.residentialAddress ?? "",
		representativeFullName:
			raw.representativeFullName ?? admin.legalRepresentativeFullName ?? "",
		representativeType:
			raw.representativeType ?? admin.legalRepresentativeRelationship ?? "",
		representativePhone:
			raw.representativePhone ?? admin.legalRepresentativePhone ?? "",
		representativePassportDetails:
			raw.representativePassportDetails ??
			admin.legalRepresentativeIdentityDocument ??
			"",
		patientBalanceRub:
			typeof raw.patientBalanceRub === "number"
				? raw.patientBalanceRub
				: typeof raw.balanceRub === "number"
					? raw.balanceRub
					: 0,
		doctorClinicalNotes: raw.doctorClinicalNotes ?? raw.notes ?? "",
		acquisitionSource:
			raw.acquisitionSource ??
			(typeof admin.preferredAppointmentNote === "string" &&
			admin.preferredAppointmentNote.startsWith("src:")
				? admin.preferredAppointmentNote.slice(4)
				: ""),
	};
}

export function resolveInitialSafetyProfile(
	rawPatient: any,
	explicitSafety?: Partial<PatientClinicalSafetyProfile> | null,
): PatientClinicalSafetyProfile {
	const fromNotes = parseSafetyProfileFromText(
		rawPatient?.notes ?? rawPatient?.doctorClinicalNotes ?? "",
	);
	const fromAdmin =
		rawPatient?.administrativeProfile?.clinicalSafetyProfile ?? null;
	const merged: Record<string, unknown> = {
		...DEFAULT_SOMATIC_HEALTHY_NORM,
		...fromNotes,
		...(fromAdmin && typeof fromAdmin === "object" ? fromAdmin : {}),
		...(explicitSafety ?? {}),
	};
	for (const key of Object.keys(fromNotes)) {
		if (
			(fromNotes as unknown as Record<string, unknown>)[key] === true &&
			!explicitSafety
		) {
			merged[key] = true;
		}
	}
	if (
		merged.hasArticaineAllergy ||
		merged.hasLidocaineAllergy ||
		merged.hasMepivacaineAllergy ||
		merged.hasEsterAnestheticsAllergy
	) {
		merged.hasAnestheticAllergy = true;
	}
	if (merged.takesAnticoagulants) {
		merged.hasAnticoagulantTherapy = true;
	}
	if (merged.hasAnticoagulantTherapy) {
		merged.takesAnticoagulants = true;
	}
	if (merged.takesBisphosphonates) {
		merged.hasBisphosphonateTherapy = true;
	}
	if (merged.hasBisphosphonateTherapy) {
		merged.takesBisphosphonates = true;
	}
	return merged as unknown as PatientClinicalSafetyProfile;
}

export async function persistPatientCardModalToApi(
	patientData: PatientGeneralInfo,
	safetyProfile: PatientClinicalSafetyProfile,
	demoPatientId: string,
): Promise<void> {
	if (!patientData.id || patientData.id === demoPatientId) return;
	const diaryNotes =
		patientData.doctorClinicalNotes?.trim() ||
		formatSafetyProfileToDiaryText(safetyProfile);
	try {
		await fetch(`/api/patients/${patientData.id}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				fullName: patientData.fullName?.trim() || undefined,
				phone: patientData.phone?.trim() || null,
				birthDate: patientData.birthDate?.trim() || null,
				email: patientData.email?.trim() || null,
				notes: diaryNotes || null,
			}),
		});
		await fetch(`/api/patients/${patientData.id}/administrative-profile`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			},
			body: JSON.stringify({
				snils: patientData.snils?.trim() || null,
				taxpayerInn:
					patientData.inn && /^\d{10}$|^\d{12}$/.test(patientData.inn.trim())
						? patientData.inn.trim()
						: null,
				insurancePolicyNumber: patientData.omsPolicyNumber?.trim() || null,
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
	updatePatientCoreDraft: (
		field: keyof PatientCoreDraft,
		value: string,
	) => void;
	updatePatientAdministrativeProfileDraft: (field: any, value: any) => void;
	setDashboard?: (updater: (curr: any) => any) => void;
}) {
	if (updatedGeneral.fullName?.trim()) {
		updatePatientCoreDraft("fullName", updatedGeneral.fullName.trim());
	}
	if (updatedGeneral.phone !== undefined) {
		updatePatientCoreDraft("phone", updatedGeneral.phone ?? "");
	}
	if (updatedGeneral.birthDate !== undefined) {
		updatePatientCoreDraft("birthDate", updatedGeneral.birthDate ?? "");
	}
	if (updatedGeneral.doctorClinicalNotes !== undefined) {
		updatePatientCoreDraft("notes", updatedGeneral.doctorClinicalNotes ?? "");
	}
	if (updatedGeneral.snils !== undefined) {
		updatePatientAdministrativeProfileDraft(
			"snils",
			updatedGeneral.snils ?? "",
		);
	}
	if (updatedGeneral.inn !== undefined) {
		updatePatientAdministrativeProfileDraft(
			"taxpayerInn",
			updatedGeneral.inn ?? "",
		);
	}
	if (updatedGeneral.omsPolicyNumber !== undefined) {
		updatePatientAdministrativeProfileDraft(
			"insurancePolicyNumber",
			updatedGeneral.omsPolicyNumber ?? "",
		);
	}
	if (updatedGeneral.registrationAddress !== undefined) {
		updatePatientAdministrativeProfileDraft(
			"registrationAddress",
			updatedGeneral.registrationAddress ?? "",
		);
	}
	if (updatedGeneral.residentialAddress !== undefined) {
		updatePatientAdministrativeProfileDraft(
			"residentialAddress",
			updatedGeneral.residentialAddress ?? "",
		);
	}
	try {
		const resCore = await fetchWithHandling(
			`/api/patients/${selectedPatient.id}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					fullName: updatedGeneral.fullName?.trim() || selectedPatient.fullName,
					phone: updatedGeneral.phone?.trim() || null,
					birthDate: updatedGeneral.birthDate?.trim() || null,
					email: updatedGeneral.email?.trim() || selectedPatient.email || null,
					notes:
						updatedGeneral.doctorClinicalNotes?.trim() ||
						selectedPatient.notes ||
						null,
				}),
			},
		);
		const resAdmin = await fetchWithHandling(
			`/api/patients/${selectedPatient.id}/administrative-profile`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					snils: updatedGeneral.snils?.trim() || null,
					taxpayerInn:
						updatedGeneral.inn &&
						/^\d{10}$|^\d{12}$/.test(updatedGeneral.inn.trim())
							? updatedGeneral.inn.trim()
							: null,
					insurancePolicyNumber: updatedGeneral.omsPolicyNumber?.trim() || null,
					registrationAddress:
						updatedGeneral.registrationAddress?.trim() || null,
					residentialAddress: updatedGeneral.residentialAddress?.trim() || null,
					clinicalSafetyProfile: updatedSafety,
				}),
			},
		);
		const latestRes = resAdmin.ok ? resAdmin : resCore;
		if (latestRes.ok && setDashboard) {
			const saved = (await latestRes.json()) as Patient;
			setDashboard((curr: any) =>
				curr
					? {
							...curr,
							patients: curr.patients.map((p: Patient) =>
								p.id === saved.id ? saved : p,
							),
						}
					: curr,
			);
		}
	} catch {
		// Handled by fetchWithHandling/toast
	}
}
