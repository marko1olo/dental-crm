import { clientLogger } from "../../../services/logging/clientLogger";
import { deleteOfflineDraft } from "../../../services/offline/storage/idbDraftOps";
import { showToast } from "../../GlobalToast";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import { persistPatientCardModalToApi } from "../patientAutonomyActions";
import type { PatientSectionSaveState } from "../patientCardSavePill";
import { DEMO_SHOWCASE_MODAL_PATIENT } from "./patientCardModalTypes";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";

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
	onSavePatient?: ((data: PatientGeneralInfo, safety: PatientClinicalSafetyProfile) => void | Promise<void>) | undefined;
	onClose: () => void;
	setIsDirty: (dirty: boolean) => void;
	setSaveState: (state: PatientSectionSaveState) => void;
}) {
	if (inFlightRef.current) return;
	inFlightRef.current = true;
	setSaveState("saving");
	try {
		if (onSavePatient) {
			await onSavePatient(patientData, safetyProfile);
		} else {
			const targetId = patientData.id || (isDemoShowcaseMode() ? DEMO_SHOWCASE_MODAL_PATIENT.id || "" : "");
			if (!targetId) {
				throw new Error("Идентификатор пациента не найден. Сохранение невозможно.");
			}
			const demoId = isDemoShowcaseMode() ? (DEMO_SHOWCASE_MODAL_PATIENT.id || "") : "";
			await persistPatientCardModalToApi(patientData, safetyProfile, demoId);
		}
		setIsDirty(false);
		setSaveState("saved");
		showToast("Данные пациента сохранены", "success", 3000);
		if (typeof window !== "undefined" && patientData.id) {
			const draftKey = `dente_patient_card_draft_${patientData.id}`;
			void deleteOfflineDraft(draftKey);
			try {
				localStorage.removeItem(draftKey);
			} catch (storageErr) {
				clientLogger.debug("[savePatientCardModal] Failed to remove local draft key", storageErr, {
					module: "PatientCard",
				});
			}
		}
		onClose();
	} catch (err: unknown) {
		setSaveState("error");
		const message = err instanceof Error ? err.message : "Ошибка при сохранении карты";
		showToast(message, "error", 4000);
	} finally {
		inFlightRef.current = false;
	}
}
