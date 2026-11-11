import type { Dashboard, Patient } from "@dental/shared";
import { useEffect, useRef } from "react";
import type { PatientCoreDraft } from "../../../../AppConstants";
import {
	buildPatientAdministrativeProfilePayload,
	buildPatientCorePayload,
	emptyPatientCoreDraft,
	nullablePatientDraftValue,
	operatorWorkflowFailureMessage,
	patientAdministrativeProfileDraftFromPatient,
	patientCoreDraftFromPatient,
	patientCoreDraftSignature,
	responseErrorMessage,
} from "../../../../AppHelpers";
import { showToast } from "../../../../components/GlobalToast";
import { shouldResetPatientDraftState } from "../../../../components/patients/patientDraftResetDecision.js";
import { actionFailureToast } from "../../../../lib/panelStateText";
import { usePatientStore } from "../../../../store/patientStore";
import { fetchWithHandling } from "../../../../utils/networkUtils";

export interface UsePatientCoreSaveProps {
	dashboard: Dashboard | null | undefined;
	setDashboard: React.Dispatch<React.SetStateAction<Dashboard | null>>;
	setError: (error: string | null) => void;
	auth: any;
	selectedPatient: Patient | null;
	setSelectedPatientId: (id: string | null) => void;
	setQuery: (query: string) => void;
	savedByThisScreenUpdatedAtRef: React.MutableRefObject<string | null>;
}

/**
 * Хук сохранения базовой карточки пациента (ФИО, телефон, дата рождения, заметки).
 * Реализует Мандат 8e: 1-кликовая автономия врача без блокировок кнопки «Сохранить»
 * из-за отсутствия необязательных полей.
 */
export function usePatientCoreSave({
	dashboard: _dashboard,
	setDashboard,
	setError,
	auth,
	selectedPatient,
	setSelectedPatientId,
	setQuery,
	savedByThisScreenUpdatedAtRef,
}: UsePatientCoreSaveProps) {
	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const setPatientCoreDraft = usePatientStore((s) => s.setPatientCoreDraft);
	const patientCoreSaveState = usePatientStore((s) => s.patientCoreSaveState);
	const setPatientCoreSaveState = usePatientStore((s) => s.setPatientCoreSaveState);
	const patientCoreDirty = usePatientStore((s) => s.patientCoreDirty);
	const setPatientCoreDirty = usePatientStore((s) => s.setPatientCoreDirty);

	const setNewPatientName = usePatientStore((s) => s.setNewPatientName);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setNewPatientBirthDate = usePatientStore((s) => s.setNewPatientBirthDate);
	const setIsPatientCreating = usePatientStore((s) => s.setIsPatientCreating);

	const patientCoreDraftRef = useRef<PatientCoreDraft>(emptyPatientCoreDraft());

	useEffect(() => {
		if (
			!shouldResetPatientDraftState({
				incomingUpdatedAt: selectedPatient?.updatedAt,
				savedByThisScreenUpdatedAt: savedByThisScreenUpdatedAtRef.current,
			})
		) {
			return;
		}
		setPatientCoreDraft(patientCoreDraftFromPatient(selectedPatient));
		setPatientCoreSaveState("idle");
		setPatientCoreDirty(false);
	}, [
		selectedPatient?.id,
		selectedPatient?.updatedAt,
		setPatientCoreSaveState,
		setPatientCoreDirty,
		setPatientCoreDraft,
		selectedPatient,
		savedByThisScreenUpdatedAtRef,
	]);

	useEffect(() => {
		patientCoreDraftRef.current = patientCoreDraft;
	}, [patientCoreDraft]);

	function updatePatientCoreDraft<K extends keyof PatientCoreDraft>(
		key: K,
		value: PatientCoreDraft[K],
	) {
		setPatientCoreDraft((current: any) => ({ ...current, [key]: value }));
		setPatientCoreDirty(true);
		setPatientCoreSaveState("idle");
	}

	async function savePatientCore(): Promise<boolean> {
		if (patientCoreSaveState === "saving") {
			setError("Дождитесь завершения сохранения карточки пациента.");
			return false;
		}
		if (!selectedPatient) {
			setError("Выберите пациента перед сохранением карточки.");
			return false;
		}
		if (!patientCoreDirty) return true;
		const payload = buildPatientCorePayload(patientCoreDraft);
		const expectedSignature = patientCoreDraftSignature(patientCoreDraft);
		if (!payload.fullName?.trim()) {
			setPatientCoreSaveState("error");
			setError("ФИО пациента обязательно для расписания, документов и связи.");
			return false;
		}
		setPatientCoreSaveState("saving");
		try {
			const response = await fetchWithHandling(
				`/api/patients/${selectedPatient.id}`,
				{
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify(payload),
				},
			);
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Карточка пациента не сохранена",
					),
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
			setSelectedPatientId(savedPatient.id);
			const latestMatchesSaved =
				patientCoreDraftSignature(patientCoreDraftRef.current) ===
				expectedSignature;
			if (latestMatchesSaved) {
				setPatientCoreDraft(patientCoreDraftFromPatient(savedPatient));
				setPatientCoreDirty(false);
			}
			savedByThisScreenUpdatedAtRef.current = savedPatient.updatedAt ?? null;
			setPatientCoreSaveState(latestMatchesSaved ? "saved" : "idle");
			setError(null);
			return true;
		} catch (saveError) {
			showToast(
				actionFailureToast(
					"Карточка пациента не сохранена",
					(saveError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setPatientCoreSaveState("error");
			setError(
				operatorWorkflowFailureMessage(
					"Карточка пациента не сохранена",
					saveError,
				),
			);
			return false;
		}
	}

	async function createPatient(options?: { allowDuplicate?: boolean }): Promise<Patient | null> {
		if (usePatientStore.getState().isPatientCreating) {
			setError("Дождитесь завершения создания карточки пациента.");
			return null;
		}
		const storeState = usePatientStore.getState();
		const fullName = (storeState.newPatientName || storeState.patientCoreDraft.fullName || "").trim();
		if (!fullName) {
			setError("Укажите ФИО пациента перед созданием карточки.");
			return null;
		}
		const phone = nullablePatientDraftValue(
			storeState.newPatientPhone || storeState.patientCoreDraft.phone,
		);
		const birthDate = nullablePatientDraftValue(
			storeState.newPatientBirthDate || storeState.patientCoreDraft.birthDate,
		);
		const isAnon = storeState.patientAdministrativeProfileDraft.isAnonymous === true;
		const anonymousCode = isAnon
			? (storeState.patientAdministrativeProfileDraft.anonymousCode || null)
			: null;
		const administrativeProfile = buildPatientAdministrativeProfilePayload({
			...storeState.patientAdministrativeProfileDraft,
			isAnonymous: isAnon,
			anonymousCode,
		});
		const notes = nullablePatientDraftValue(storeState.patientCoreDraft.notes);
		const payload = {
			fullName,
			phone,
			birthDate,
			notes,
			isAnonymous: isAnon,
			anonymousCode,
			administrativeProfile,
			allowDuplicate: Boolean(options?.allowDuplicate),
		};
		setIsPatientCreating(true);
		try {
			const response = await fetchWithHandling("/api/patients", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				const errorJson = await response.json().catch(() => null);
				const errorMsg =
					errorJson?.message ||
					(await responseErrorMessage(response, "Пациент не создан"));
				setError(errorMsg);
				const conflictError = new Error(errorMsg) as Error & {
					status?: number;
					duplicateData?: unknown;
				};
				conflictError.status = response.status;
				conflictError.duplicateData = errorJson;
				throw conflictError;
			}
			const patient = (await response.json()) as Patient;
			setNewPatientName("");
			setNewPatientPhone("");
			setNewPatientBirthDate("");
			setPatientCoreDraft(patientCoreDraftFromPatient(patient));
			usePatientStore.getState().setPatientAdministrativeProfileDraft(
				patientAdministrativeProfileDraftFromPatient(patient),
			);
			savedByThisScreenUpdatedAtRef.current = patient.updatedAt ?? null;
			setSelectedPatientId(patient.id);
			setQuery(patient.fullName);
			setDashboard((current) =>
				current
					? {
							...current,
							patients: [
								patient,
								...current.patients.filter((entry) => entry.id !== patient.id),
							],
						}
					: current,
			);
			setError(null);
			return patient;
		} catch (patientError: any) {
			if (patientError?.status === 409 || patientError?.duplicateData) {
				throw patientError;
			}
			showToast(
				actionFailureToast(
					"Пациент не создан",
					(patientError as { status?: number })?.status ?? null,
				),
				"error",
			);
			setError(
				operatorWorkflowFailureMessage("Пациент не создан", patientError),
			);
			return null;
		} finally {
			setIsPatientCreating(false);
		}
	}

	return {
		patientCoreDraftRef,
		updatePatientCoreDraft,
		savePatientCore,
		createPatient,
	};
}
