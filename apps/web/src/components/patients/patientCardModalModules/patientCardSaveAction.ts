import { showToast } from "../../GlobalToast";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import { persistPatientCardModalToApi } from "../patientAutonomyActions";
import type { PatientSectionSaveState } from "../patientCardSavePill";
import { DEMO_SHOWCASE_MODAL_PATIENT } from "./patientCardModalTypes";

export async function savePatientCardModal({
	inFlightRef,
	patientData,
	safetyProfile,
	onSavePatient,
	onClose,
	setIsDirty,
	setSaveState,
}: {
	inFlightRef: React.MutableRefObject<boolean>;
	patientData: PatientGeneralInfo;
	safetyProfile: PatientClinicalSafetyProfile;
	onSavePatient?: ((data: PatientGeneralInfo, safety: PatientClinicalSafetyProfile) => Promise<void>) | undefined;
	onClose: () => void;
	setIsDirty: (dirty: boolean) => void;
	setSaveState: (state: PatientSectionSaveState) => void;
}) {
	if (inFlightRef.current) return;
	inFlightRef.current = true;
	setSaveState("saving");
	try {
		if (onSavePatient) await onSavePatient(patientData, safetyProfile);
		else await persistPatientCardModalToApi(patientData, safetyProfile, patientData.id || DEMO_SHOWCASE_MODAL_PATIENT.id || "");
		setIsDirty(false);
		setSaveState("saved");
		showToast("Данные пациента сохранены", "success", 3000);
		if (typeof window !== "undefined" && patientData.id) {
			try {
				localStorage.removeItem(`dente_patient_card_draft_${patientData.id}`);
			} catch {
				// ignore
			}
		}
		onClose();
	} catch (err: any) {
		setSaveState("error");
		showToast(err?.message || "Ошибка при сохранении карты", "error", 4000);
	} finally {
		inFlightRef.current = false;
	}
}
