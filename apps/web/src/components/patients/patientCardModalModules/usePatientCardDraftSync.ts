import { useEffect, useRef } from "react";
import type { PatientClinicalSafetyProfile } from "../safetyMath";
import type { PatientGeneralInfo } from "../tabs/PatientGeneralInfoTab";
import { persistPatientCardModalToApi } from "../patientAutonomyActions";
import type { PatientSectionSaveState } from "../patientCardSavePill";
import { DEMO_SHOWCASE_MODAL_PATIENT } from "./patientCardModalTypes";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { clientLogger } from "../../../services/logging/clientLogger";
import { resolveActiveOfflineOrgScope } from "../../../services/offline/storage/constants";
import {
	loadOfflineDraft,
	saveOfflineDraftDebounced,
} from "../../../services/offline/storage/idbDraftOps";
import { enqueueOfflineMutation } from "../../../utils/offlineMutationQueue";

export interface PatientCardDraftSyncProps {
	isOpen: boolean;
	isDirty: boolean;
	setIsDirty: (v: boolean) => void;
	patientData: PatientGeneralInfo;
	setPatientData: React.Dispatch<React.SetStateAction<PatientGeneralInfo>>;
	safetyProfile: PatientClinicalSafetyProfile;
	setSafetyProfile: React.Dispatch<React.SetStateAction<PatientClinicalSafetyProfile>>;
	setSaveState: (v: PatientSectionSaveState) => void;
	onSavePatient?: ((data: PatientGeneralInfo, safety: PatientClinicalSafetyProfile) => void | Promise<void>) | undefined;
}

interface PatientCardDraftPayload {
	patientData?: Partial<PatientGeneralInfo> | undefined;
	safetyProfile?: PatientClinicalSafetyProfile | undefined;
	savedAt?: number | undefined;
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

	// Restore draft from unified IndexedDB / L1 RAM draft storage on modal open (Zero Keystroke Loss)
	useEffect(() => {
		if (!isOpen || !patientData.id || typeof window === "undefined") return;
		let cancelled = false;
		const draftKey = `dente_patient_card_draft_${patientData.id}`;

		void loadOfflineDraft<PatientCardDraftPayload>(draftKey)
			.then((draft) => {
				if (cancelled) return;
				const parsed = draft?.data;
				if (parsed?.patientData) {
					setPatientData((prev) => ({ ...prev, ...parsed.patientData }));
					if (parsed.safetyProfile) {
						setSafetyProfile(parsed.safetyProfile);
					}
					setIsDirty(true);
				}
			})
			.catch((err) => {
				clientLogger.warn("[usePatientCardDraftSync] Failed to restore IDB patient draft", err, {
					module: "PatientCard",
				});
			});

		return () => {
			cancelled = true;
		};
	}, [isOpen, patientData.id, setIsDirty, setPatientData, setSafetyProfile]);

	// Debounced autosave to unified IDB draft store and Fastify API (Zero Data Loss)
	useEffect(() => {
		if (!isDirty || !patientData.id || typeof window === "undefined") return;

		const draftKey = `dente_patient_card_draft_${patientData.id}`;
		const orgScope = resolveActiveOfflineOrgScope();
		saveOfflineDraftDebounced<PatientCardDraftPayload>(
			draftKey,
			"patient",
			patientData.id,
			{ patientData, safetyProfile, savedAt: Date.now() },
			orgScope,
		);

		const timer = setTimeout(async () => {
			if (inFlightRef.current) return;
			inFlightRef.current = true;
			try {
				if (onSavePatient) {
					await onSavePatient(patientData, safetyProfile);
				} else {
					const demoId = isDemoShowcaseMode() ? (DEMO_SHOWCASE_MODAL_PATIENT.id || "") : "";
					await persistPatientCardModalToApi(patientData, safetyProfile, demoId);
				}
				setIsDirty(false);
				setSaveState("saved");
			} catch (err) {
				clientLogger.warn("[usePatientCardDraftSync] Failed to autosave patient card", err, {
					module: "PatientCard",
				});
				const isPermanentClientError =
					err instanceof Error && /^HTTP 4(?!08|29)/.test(err.message);
				if (!isPermanentClientError) {
					const draftPatientId = patientData.id ?? "new";
					await enqueueOfflineMutation({
						entityType: "patient",
						entityId: draftPatientId,
						action: "update",
						endpoint: `/api/patients/${encodeURIComponent(draftPatientId)}`,
						organizationId: orgScope,
						payload: { patientData, safetyProfile },
					});
				}
				setSaveState("error");
			} finally {
				inFlightRef.current = false;
			}
		}, 1200);

		return () => clearTimeout(timer);
	}, [isDirty, patientData, safetyProfile, onSavePatient, setIsDirty, setSaveState]);

	return inFlightRef;
}
