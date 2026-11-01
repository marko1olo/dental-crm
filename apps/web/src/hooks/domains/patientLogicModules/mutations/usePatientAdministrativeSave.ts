import type { Dashboard, Patient } from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { PatientAdministrativeProfileDraft } from "../../../../AppConstants";
import {
	buildPatientAdministrativeProfilePayload,
	emptyPatientAdministrativeProfileDraft,
	operatorWorkflowFailureMessage,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileDraftSignature,
	patientAdministrativeProfileTimeWarning,
	responseErrorMessage,
} from "../../../../AppHelpers";
import { showToast } from "../../../../components/GlobalToast";
import { shouldResetPatientDraftState } from "../../../../components/patients/patientDraftResetDecision.js";
import { actionFailureToast } from "../../../../lib/panelStateText";
import { usePatientStore } from "../../../../store/patientStore";
import { fetchWithHandling } from "../../../../utils/networkUtils";

export interface UsePatientAdministrativeSaveProps {
	dashboard: Dashboard | null | undefined;
	setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
	setError: (error: string | null) => void;
	auth: any;
	selectedPatient: Patient | null;
	savedByThisScreenUpdatedAtRef: React.MutableRefObject<string | null>;
}

/**
 * Хук фонового сохранения административного профиля пациента
 * (паспортные данные, полис ОМС/ДМС, СНИЛС, адрес регистрации, предпочтительное время).
 * Убран в фоновый бэкофис без навязывания врачу у кресла (Мандат 8e, Мандат 8n).
 */
export function usePatientAdministrativeSave({
	dashboard: _dashboard,
	setDashboard,
	setError,
	auth,
	selectedPatient,
	savedByThisScreenUpdatedAtRef,
}: UsePatientAdministrativeSaveProps) {
	const patientAdministrativeProfileDraft = usePatientStore(
		(s) => s.patientAdministrativeProfileDraft,
	);
	const setPatientAdministrativeProfileDraft = usePatientStore(
		(s) => s.setPatientAdministrativeProfileDraft,
	);
	const patientAdministrativeProfileSaveState = usePatientStore(
		(s) => s.patientAdministrativeProfileSaveState,
	);
	const setPatientAdministrativeProfileSaveState = usePatientStore(
		(s) => s.setPatientAdministrativeProfileSaveState,
	);
	const patientAdministrativeProfileDirty = usePatientStore(
		(s) => s.patientAdministrativeProfileDirty,
	);
	const setPatientAdministrativeProfileDirty = usePatientStore(
		(s) => s.setPatientAdministrativeProfileDirty,
	);

	const patientAdministrativeProfileDraftRef =
		useRef<PatientAdministrativeProfileDraft>(
			emptyPatientAdministrativeProfileDraft(),
		);

	const patientAdministrativeProfileValidationMessage = useMemo(
		() =>
			patientAdministrativeProfileDraftIssue(patientAdministrativeProfileDraft),
		[patientAdministrativeProfileDraft],
	);

	const savePatientAdministrativeProfile = useCallback(async () => {
		if (patientAdministrativeProfileSaveState === "saving") {
			setError("Дождитесь завершения сохранения реквизитов пациента.");
			return false;
		}
		if (!selectedPatient) {
			setError("Выберите пациента перед сохранением реквизитов.");
			return false;
		}
		if (!patientAdministrativeProfileDirty) return true;
		const timeWarning = patientAdministrativeProfileTimeWarning(
			patientAdministrativeProfileDraft,
		);
		if (timeWarning) {
			showToast(
				`Удобное время приема скорректировано: ${timeWarning} Остальные реквизиты пациента сохранены.`,
				"info",
			);
		}
		if (patientAdministrativeProfileValidationMessage) {
			showToast(patientAdministrativeProfileValidationMessage, "warning");
		}
		const expectedSignature = patientAdministrativeProfileDraftSignature(
			patientAdministrativeProfileDraft,
		);
		setPatientAdministrativeProfileSaveState("saving");
		try {
			const response = await fetchWithHandling(
				`/api/patients/${selectedPatient.id}/administrative-profile`,
				{
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify(
						buildPatientAdministrativeProfilePayload(
							patientAdministrativeProfileDraft,
						),
					),
				},
			);
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(response, "Данные пациента не сохранены"),
				);
			}
			const savedPatient = (await response.json()) as Patient;
			setDashboard((current) =>
				current
					? {
							...current,
							patients: current.patients.map((patient) =>
								patient.id === savedPatient.id ? savedPatient : patient,
							),
						}
					: current,
			);
			const latestDraft = patientAdministrativeProfileDraftRef.current;
			const latestMatchesSaved =
				patientAdministrativeProfileDraftSignature(latestDraft) ===
				expectedSignature;
			if (latestMatchesSaved) {
				setPatientAdministrativeProfileDraft(
					patientAdministrativeProfileDraftFromPatient(savedPatient),
				);
				setPatientAdministrativeProfileDirty(false);
			}
			savedByThisScreenUpdatedAtRef.current = savedPatient.updatedAt ?? null;
			setPatientAdministrativeProfileSaveState(
				latestMatchesSaved ? "saved" : "idle",
			);
			setError(null);
			return true;
		} catch (saveError) {
			showToast(
				actionFailureToast(
					"Данные пациента не сохранены",
					(saveError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setPatientAdministrativeProfileSaveState("error");
			setError(
				operatorWorkflowFailureMessage(
					"Данные пациента не сохранены",
					saveError,
				),
			);
			return false;
		}
	}, [
		patientAdministrativeProfileSaveState,
		setError,
		selectedPatient,
		patientAdministrativeProfileDirty,
		patientAdministrativeProfileValidationMessage,
		patientAdministrativeProfileDraft,
		auth,
		setPatientAdministrativeProfileSaveState,
		setDashboard,
		setPatientAdministrativeProfileDraft,
		setPatientAdministrativeProfileDirty,
		savedByThisScreenUpdatedAtRef,
	]);

	useEffect(() => {
		if (
			!shouldResetPatientDraftState({
				incomingUpdatedAt: selectedPatient?.updatedAt,
				savedByThisScreenUpdatedAt: savedByThisScreenUpdatedAtRef.current,
			})
		) {
			return;
		}
		setPatientAdministrativeProfileDraft(
			patientAdministrativeProfileDraftFromPatient(selectedPatient),
		);
		setPatientAdministrativeProfileSaveState("idle");
		setPatientAdministrativeProfileDirty(false);
	}, [
		selectedPatient?.id,
		selectedPatient?.updatedAt,
		selectedPatient,
		setPatientAdministrativeProfileDirty,
		setPatientAdministrativeProfileSaveState,
		setPatientAdministrativeProfileDraft,
		savedByThisScreenUpdatedAtRef,
	]);

	const pendingProfileSaveRef = useRef(false);

	useEffect(() => {
		if (
			!selectedPatient ||
			!patientAdministrativeProfileDirty ||
			patientAdministrativeProfileSaveState === "saving" ||
			patientAdministrativeProfileValidationMessage
		) {
			return undefined;
		}
		const saveTimer = window.setTimeout(() => {
			pendingProfileSaveRef.current = false;
			void savePatientAdministrativeProfile();
		}, 1400);
		pendingProfileSaveRef.current = true;
		return () => {
			window.clearTimeout(saveTimer);
			if (pendingProfileSaveRef.current) {
				pendingProfileSaveRef.current = false;
				void savePatientAdministrativeProfile();
			}
		};
	}, [
		selectedPatient?.id,
		patientAdministrativeProfileDirty,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileValidationMessage,
		selectedPatient,
		savePatientAdministrativeProfile,
	]);

	function updatePatientAdministrativeProfileDraft<
		K extends keyof PatientAdministrativeProfileDraft,
	>(key: K, value: PatientAdministrativeProfileDraft[K]) {
		setPatientAdministrativeProfileDraft((current: any) => ({
			...current,
			[key]: value,
		}));
		setPatientAdministrativeProfileDirty(true);
		setPatientAdministrativeProfileSaveState("idle");
	}

	return {
		patientAdministrativeProfileDraftRef,
		patientAdministrativeProfileValidationMessage,
		updatePatientAdministrativeProfileDraft,
		savePatientAdministrativeProfile,
	};
}
