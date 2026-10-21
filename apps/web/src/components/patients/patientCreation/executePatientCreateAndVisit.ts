import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";
import {
	EMERGENCY_APPOINTMENT_REASON,
	EMERGENCY_PATIENT_FALLBACK_NAME,
	ROUTINE_APPOINTMENT_REASON,
	syncCreationDraftsToStore,
	TOAST_PATIENT_CREATED_VISIT,
	TOAST_SPECIFY_NAME_OR_EMERGENCY,
} from "./constants";

export async function executePatientCreateAndVisit(params: any, options?: { allowDuplicate?: boolean }) {
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

		const targetId = typeof created === "object" && created?.id ? created.id : usePatientStore.getState().selectedPatientId;
		if (targetId) {
			usePatientStore.getState().setSelectedPatientId(targetId);
			if (appLogic?.handleOpenVisitForPatient) {
				await appLogic.handleOpenVisitForPatient(targetId, {
					chiefComplaint: isEmergencyOrPrimary ? EMERGENCY_APPOINTMENT_REASON : ROUTINE_APPOINTMENT_REASON,
					isEmergency: isEmergencyOrPrimary,
				});
			} else if (appLogic?.setActiveTab) {
				appLogic.setActiveTab("visits");
			}
			showToast(TOAST_PATIENT_CREATED_VISIT, "success");
		}
	} catch (err: any) {
		if (err?.status === 409 || err?.duplicateData) {
			setDuplicateConflict(err.duplicateData);
		}
	}
}
