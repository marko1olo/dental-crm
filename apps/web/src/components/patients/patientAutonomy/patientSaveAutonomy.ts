import type { Patient } from "@dental/shared";
import { applySomaticNormToText } from "../../../utils/somaticNorm";
import { showToast } from "../../GlobalToast";
import type { PatientCoreDraft } from "../PatientCoreEditorForm";

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
	savePatientCoreProp?: () => undefined | boolean | Promise<undefined | boolean>;
	showToastFn?: (text: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
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
		return { executed: result !== false, reason: result === false ? ("save_failed" as const) : ("saved" as const) };
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
	savePatientAdministrativeProfileProp?: () => undefined | boolean | Promise<undefined | boolean>;
	showToastFn?: (text: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
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
		return { executed: result !== false, reason: result === false ? ("save_failed" as const) : ("saved" as const) };
	} catch {
		return { executed: false, reason: "save_failed" as const };
	}
}

export function executePatientSomaticNormAutonomy({
	selectedPatient,
	currentNotes,
	updatePatientCoreDraft,
	showToastFn = showToast,
}: {
	selectedPatient: Patient | null | undefined;
	currentNotes?: string;
	updatePatientCoreDraft?: (field: keyof PatientCoreDraft, value: string) => void;
	showToastFn?: (text: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void;
}) {
	if (!selectedPatient) {
		showToastFn("Выберите пациента перед установкой соматической нормы", "warning");
		return { executed: false, reason: "no_patient" as const };
	}
	const newNotes = applySomaticNormToText(currentNotes);
	if (typeof updatePatientCoreDraft === "function") {
		updatePatientCoreDraft("notes", newNotes);
	}
	showToastFn("Установлена норма соматического статуса", "success");
	return { executed: true, notes: newNotes };
}
