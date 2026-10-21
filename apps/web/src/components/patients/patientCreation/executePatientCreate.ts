import { usePatientStore } from "../../../store/patientStore";
import { formatPhoneNumber } from "../../../utils/inputSanitation";
import { showToast } from "../../GlobalToast";
import {
	EMERGENCY_PATIENT_FALLBACK_NAME,
	syncCreationDraftsToStore,
	TOAST_SPECIFY_NAME_OR_EMERGENCY,
} from "./constants";

export async function executePatientCreate(params: any, options?: { allowDuplicate?: boolean }) {
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
		if (validationResult.missingRequiredLabels?.length > 0) {
			showToast(
				`Пациент создан. Поля (${validationResult.missingRequiredLabels.join(", ")}) можно внести позже при оформлении договора`,
				"info",
				4000,
			);
		}
	} catch (err: any) {
		if (err?.status === 409 || err?.duplicateData) {
			const dup = err.duplicateData;
			setDuplicateConflict({
				message: err.message || "Обнаружена похожая карта пациента в картотеке.",
				existingPatientId: dup?.existingPatientId || dup?.existingPatient?.id,
				isNameOnlyDuplicate: dup?.error === "PatientNameDuplicateError" || Boolean(dup?.isNameOnlyDuplicate),
			});
			showToast(err.message || "Найден однофамилец или совпадение карты", "warning", 5000);
		}
	}
}
