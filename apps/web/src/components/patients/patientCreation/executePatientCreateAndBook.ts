import { usePatientStore } from "../../../store/patientStore";
import { useScheduleStore } from "../../../store/scheduleStore";
import { showToast } from "../../GlobalToast";
import {
	EMERGENCY_APPOINTMENT_COMMENT,
	EMERGENCY_APPOINTMENT_REASON,
	EMERGENCY_PATIENT_FALLBACK_NAME,
	ROUTINE_APPOINTMENT_REASON,
	syncCreationDraftsToStore,
	TOAST_PATIENT_CREATED_SCHEDULE,
	TOAST_SPECIFY_NAME_OR_EMERGENCY,
} from "./constants";
import type { UsePatientCreationActionsParams } from "./usePatientCreationActions";

export async function executePatientCreateAndBook(
	params: UsePatientCreationActionsParams,
	options?: { allowDuplicate?: boolean },
) {
	const {
		isPatientCreating,
		newPatientName,
		isEmergencyOrPrimary,
		setNewPatientName,
		advertisingSource,
		isChild,
		parentRole,
		parentName,
		parentPhone,
		isSomaticNorm,
		createPatient,
		setDuplicateConflict,
		onClose,
		appLogic,
	} = params;

	if (isPatientCreating) return;
	let effectiveName = newPatientName.trim();
	if (!effectiveName) {
		if (isEmergencyOrPrimary) {
			effectiveName = EMERGENCY_PATIENT_FALLBACK_NAME;
			setNewPatientName(effectiveName);
			usePatientStore.getState().setNewPatientName(effectiveName);
		} else {
			showToast(TOAST_SPECIFY_NAME_OR_EMERGENCY, "warning");
			return;
		}
	} else {
		usePatientStore.getState().setNewPatientName(effectiveName);
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

		const targetId = typeof created === "object" && created !== null && "id" in created && typeof (created as { id: unknown }).id === "string"
			? (created as { id: string }).id
			: usePatientStore.getState().selectedPatientId;
		if (targetId) {
			usePatientStore.getState().setSelectedPatientId(targetId);
			useScheduleStore.getState().setNewAppointmentDraft((prev) => ({
				...prev,
				patientId: targetId,
				reason: isEmergencyOrPrimary ? EMERGENCY_APPOINTMENT_REASON : ROUTINE_APPOINTMENT_REASON,
				...(isEmergencyOrPrimary ? { comment: EMERGENCY_APPOINTMENT_COMMENT } : {}),
			}));
		}
		const typedAppLogic = appLogic as { setActiveTab?: (tab: string) => void } | null | undefined;
		if (typedAppLogic?.setActiveTab) typedAppLogic.setActiveTab("schedule");
		showToast(TOAST_PATIENT_CREATED_SCHEDULE, "success");
	} catch (err: unknown) {
		const errorObj = err as {
			status?: number;
			duplicateData?: { message: string; existingPatientId?: string; isNameOnlyDuplicate?: boolean };
		} | null | undefined;
		if (errorObj?.status === 409 || errorObj?.duplicateData) {
			setDuplicateConflict(errorObj.duplicateData ?? null);
		}
	}
}
