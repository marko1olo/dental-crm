import type { Patient } from "@dental/shared";
import { showToast } from "../GlobalToast";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { useScheduleStore } from "../../store/scheduleStore";
import { applySomaticNormToText } from "../../utils/somaticNorm";
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
	setCurrentView = (
		view:
			| "visit"
			| "patients"
			| "schedule"
			| "finance"
			| "warehouse"
			| "analytics"
			| "tasks"
			| "settings"
			| "audit",
	) => useAppStore.getState().setCurrentView(view),
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	visitId?: string;
	setSelectedPatientId?: (id: string) => void;
	setCurrentView?: (view: any) => void;
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
	setCurrentView = (view: any) => useAppStore.getState().setCurrentView(view),
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	setNewAppointmentDraft?: (draft: any) => void;
	setCurrentView?: (view: any) => void;
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
	showToastFn(
		"Установлена норма соматического статуса",
		"success",
	);
	return { executed: true, notes: newNotes };
}
