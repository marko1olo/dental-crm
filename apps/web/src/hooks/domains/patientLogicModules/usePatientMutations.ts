import type { Patient } from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
	PatientAdministrativeProfileDraft,
	PatientCoreDraft,
} from "../../../AppConstants";
import {
	buildPatientAdministrativeProfilePayload,
	buildPatientCorePayload,
	emptyPatientAdministrativeProfileDraft,
	emptyPatientCoreDraft,
	nullablePatientDraftValue,
	operatorWorkflowFailureMessage,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileDraftSignature,
	patientAdministrativeProfileTimeWarning,
	patientCoreDraftFromPatient,
	patientCoreDraftSignature,
	responseErrorMessage,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { shouldResetPatientDraftState } from "../../../components/patients/patientDraftResetDecision.js";
import { actionFailureToast } from "../../../lib/panelStateText";
import { usePatientStore } from "../../../store/patientStore";
import { fetchWithHandling } from "../../../utils/networkUtils";
import type {
	UsePatientMutationsProps,
	UsePatientMutationsReturn,
} from "./patientLogicTypes";

export function usePatientMutations({
	dashboard,
	setDashboard,
	setError,
	auth,
	selectedPatient,
	setSelectedPatientId,
	setQuery,
}: UsePatientMutationsProps): UsePatientMutationsReturn {
	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const setPatientCoreDraft = usePatientStore((s) => s.setPatientCoreDraft);
	const patientCoreSaveState = usePatientStore((s) => s.patientCoreSaveState);
	const setPatientCoreSaveState = usePatientStore(
		(s) => s.setPatientCoreSaveState,
	);
	const patientCoreDirty = usePatientStore((s) => s.patientCoreDirty);
	const setPatientCoreDirty = usePatientStore((s) => s.setPatientCoreDirty);

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

	const setNewPatientName = usePatientStore((s) => s.setNewPatientName);
	const setNewPatientPhone = usePatientStore((s) => s.setNewPatientPhone);
	const setNewPatientBirthDate = usePatientStore(
		(s) => s.setNewPatientBirthDate,
	);
	const setIsPatientCreating = usePatientStore((s) => s.setIsPatientCreating);

	const savedByThisScreenUpdatedAtRef = useRef<string | null>(null);
	const patientCoreDraftRef = useRef<PatientCoreDraft>(emptyPatientCoreDraft());
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
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(response, "Данные пациента не сохранены"),
				);
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
	]);

	useEffect(() => {
		if (
			!shouldResetPatientDraftState({
				incomingUpdatedAt: selectedPatient?.updatedAt,
				savedByThisScreenUpdatedAt: savedByThisScreenUpdatedAtRef.current,
			})
		)
			return;
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
	]);

	useEffect(() => {
		if (
			!shouldResetPatientDraftState({
				incomingUpdatedAt: selectedPatient?.updatedAt,
				savedByThisScreenUpdatedAt: savedByThisScreenUpdatedAtRef.current,
			})
		)
			return;
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
	]);

	useEffect(() => {
		patientCoreDraftRef.current = patientCoreDraft;
	}, [patientCoreDraft]);

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

	function updatePatientCoreDraft<K extends keyof PatientCoreDraft>(
		key: K,
		value: PatientCoreDraft[K],
	) {
		setPatientCoreDraft((current: any) => ({ ...current, [key]: value }));
		setPatientCoreDirty(true);
		setPatientCoreSaveState("idle");
	}

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
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Карточка пациента не сохранена",
					),
				);
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
		const domName =
			typeof document !== "undefined"
				? (
						document.getElementById(
							"patient-create-full-name",
						) as HTMLInputElement | null
					)?.value?.trim()
				: "";
		const fullName = (storeState.newPatientName || domName || "").trim();
		if (!fullName) {
			setError("Укажите ФИО пациента перед созданием карточки.");
			return null;
		}
		const domPhone =
			typeof document !== "undefined"
				? (
						document.getElementById(
							"patient-create-phone",
						) as HTMLInputElement | null
					)?.value?.trim()
				: "";
		const domBirth =
			typeof document !== "undefined"
				? (
						document.getElementById(
							"patient-create-birth-date",
						) as HTMLInputElement | null
					)?.value?.trim()
				: "";
		const phone = nullablePatientDraftValue(
			storeState.newPatientPhone || domPhone,
		);
		const birthDate = nullablePatientDraftValue(
			storeState.newPatientBirthDate || domBirth,
		);
		const isAnon = (storeState.patientAdministrativeProfileDraft.isAnonymous ?? patientAdministrativeProfileDraft.isAnonymous) === true;
		const anonymousCode = isAnon ? (storeState.patientAdministrativeProfileDraft.anonymousCode || patientAdministrativeProfileDraft.anonymousCode || null) : null;
		const administrativeProfile = buildPatientAdministrativeProfilePayload({
			...patientAdministrativeProfileDraft,
			...storeState.patientAdministrativeProfileDraft,
			isAnonymous: isAnon,
			anonymousCode,
		});
		const notes = nullablePatientDraftValue(storeState.patientCoreDraft.notes || patientCoreDraft.notes);
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
			setPatientAdministrativeProfileDraft(patientAdministrativeProfileDraftFromPatient(patient));
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
		patientAdministrativeProfileDraftRef,
		patientAdministrativeProfileValidationMessage,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		savePatientCore,
		savePatientAdministrativeProfile,
		createPatient,
	};
}
