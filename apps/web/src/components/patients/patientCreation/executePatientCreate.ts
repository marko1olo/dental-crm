import type { Patient } from "@dental/shared";
import { usePatientStore } from "../../../store/patientStore";
import { formatPhoneNumber } from "../../../utils/inputSanitation";
import { showToast } from "../../GlobalToast";
import {
	EMERGENCY_PATIENT_FALLBACK_NAME,
	syncCreationDraftsToStore,
	TOAST_SPECIFY_NAME_OR_EMERGENCY,
} from "./constants";

export interface ExecutePatientCreateParams {
	readonly isPatientCreating: boolean;
	readonly newPatientName: string;
	readonly newPatientPhone: string;
	readonly advertisingSource: string;
	readonly isEmergencyOrPrimary: boolean;
	readonly isSomaticNorm: boolean;
	readonly isChild: boolean;
	readonly parentRole: string;
	readonly parentName: string;
	readonly parentPhone: string;
	readonly createPatient: (options?: { allowDuplicate?: boolean }) => Promise<Patient | null | unknown>;
	readonly onClose: () => void;
	readonly setDuplicateConflict: (conflict: { message: string; existingPatientId?: string; isNameOnlyDuplicate?: boolean } | null) => void;
	readonly validationResult: { missingRequiredLabels?: string[] };
	readonly setNewPatientName: (name: string) => void;
	readonly setNewPatientPhone: (phone: string) => void;
}

export async function executePatientCreate(params: ExecutePatientCreateParams, options?: { allowDuplicate?: boolean }) {
	const {
		isPatientCreating,
		newPatientName,
		newPatientPhone,
		advertisingSource,
		isEmergencyOrPrimary,
		isSomaticNorm,
		isChild,
		parentRole,
		parentName,
		parentPhone,
		createPatient,
		onClose,
		setDuplicateConflict,
		validationResult,
		setNewPatientName,
		setNewPatientPhone,
	} = params;

	if (isPatientCreating) return;
	let effectiveName = newPatientName.trim() || usePatientStore.getState().newPatientName.trim();
	if (!effectiveName) {
		if (isEmergencyOrPrimary) {
			effectiveName = EMERGENCY_PATIENT_FALLBACK_NAME;
			setNewPatientName(effectiveName);
			usePatientStore.getState().setNewPatientName(effectiveName);
		} else {
			showToast(TOAST_SPECIFY_NAME_OR_EMERGENCY, "warning");
			return;
		}
	}
	if (newPatientPhone.trim()) {
		const formatted = formatPhoneNumber(newPatientPhone.trim());
		setNewPatientPhone(formatted);
		usePatientStore.getState().setNewPatientPhone(formatted);
	}
	try {
		syncCreationDraftsToStore(usePatientStore.getState(), {
			advertisingSource,
			isChild,
			parentRole,
			parentName,
			parentPhone,
			isSomaticNorm,
		});
		const created = await createPatient(options);
		if (created === null) return;
		setDuplicateConflict(null);
		onClose();
		if (validationResult.missingRequiredLabels && validationResult.missingRequiredLabels.length > 0) {
			showToast(
				`Пациент создан. Поля (${validationResult.missingRequiredLabels.join(", ")}) можно внести позже при оформлении договора`,
				"info",
				4000,
			);
		}
	} catch (err: unknown) {
		const errorObj = err as {
			status?: number;
			message?: string;
			duplicateData?: {
				existingPatientId?: string;
				existingPatient?: { id?: string };
				error?: string;
				isNameOnlyDuplicate?: boolean;
			};
		};
		if (errorObj?.status === 409 || errorObj?.duplicateData) {
			const dup = errorObj.duplicateData;
			const conflictData: { message: string; existingPatientId?: string; isNameOnlyDuplicate?: boolean } = {
				message: errorObj.message || "Обнаружена похожая карта пациента в картотеке.",
				isNameOnlyDuplicate: dup?.error === "PatientNameDuplicateError" || Boolean(dup?.isNameOnlyDuplicate),
			};
			const existingId = dup?.existingPatientId || dup?.existingPatient?.id;
			if (existingId) conflictData.existingPatientId = existingId;
			setDuplicateConflict(conflictData);
			showToast(errorObj.message || "Найден однофамилец или совпадение карты", "warning", 5000);
		}
	}
}
