import { useEffect, useRef } from "react";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import { persistPatientCardModalToApi } from "../patientAutonomyActions";
import type { PatientSectionSaveState } from "../patientCardSavePill";

export interface PatientCardDraftSyncProps {
	isOpen: boolean;
	isDirty: boolean;
	setIsDirty: (v: boolean) => void;
	patientData: PatientGeneralInfo;
	setPatientData: React.Dispatch<React.SetStateAction<PatientGeneralInfo>>;
	safetyProfile: PatientClinicalSafetyProfile;
	setSafetyProfile: React.Dispatch<React.SetStateAction<PatientClinicalSafetyProfile>>;
	setSaveState: (v: PatientSectionSaveState) => void;
	onSavePatient?: ((data: PatientGeneralInfo, safety: PatientClinicalSafetyProfile) => Promise<void>) | undefined;
}

export function usePatientCardDraftSync({
	isOpen,
	isDirty,
	setIsDirty,
	patientData,
	setPatientData,
	safetyProfile,
	setSafetyProfile,
	setSaveState,
	onSavePatient,
}: PatientCardDraftSyncProps) {
	const inFlightRef = useRef(false);

	// Restore draft from localStorage on modal open if available (Zero Keystroke Loss)
	useEffect(() => {
		if (!isOpen || !patientData.id || typeof window === "undefined") return;
		try {
			const raw = localStorage.getItem(`dente_patient_card_draft_${patientData.id}`);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (parsed?.patientData) {
					setPatientData((prev) => ({ ...prev, ...parsed.patientData }));
					if (parsed.safetyProfile) {
						setSafetyProfile(parsed.safetyProfile);
					}
					setIsDirty(true);
				}
			}
		} catch {
			// ignore localStorage issues
		}
	}, [isOpen, patientData.id, setIsDirty, setPatientData, setSafetyProfile]);

	// Debounced autosave to localStorage and Fastify API (Zero Data Loss)
	useEffect(() => {
		if (!isDirty || !patientData.id || typeof window === "undefined") return;

		try {
			localStorage.setItem(
				`dente_patient_card_draft_${patientData.id}`,
				JSON.stringify({ patientData, safetyProfile, savedAt: Date.now() }),
			);
		} catch {
			// ignore storage quota
		}

		const timer = setTimeout(async () => {
			if (inFlightRef.current) return;
			inFlightRef.current = true;
			try {
				if (onSavePatient) {
					await onSavePatient(patientData, safetyProfile);
				} else {
					await persistPatientCardModalToApi(patientData, safetyProfile, patientData.id || "");
				}
				setIsDirty(false);
				setSaveState("saved");
			} catch {
				setSaveState("idle");
			} finally {
				inFlightRef.current = false;
			}
		}, 1200);

		return () => clearTimeout(timer);
	}, [isDirty, patientData, safetyProfile, onSavePatient, setIsDirty, setSaveState]);

	return inFlightRef;
}
