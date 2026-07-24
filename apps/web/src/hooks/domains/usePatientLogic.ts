import type { Dashboard, Patient } from "@dental/shared";
import { useEffect, useMemo, useRef } from "react";
import type {
	PatientAdministrativeProfileDraft,
	PatientCoreDraft,
} from "../../AppHelpers";
import {
	buildPatientAdministrativeProfilePayload,
	buildPatientCorePayload,
	emptyPatientAdministrativeProfileDraft,
	emptyPatientCoreDraft,
	findPatient,
	nullablePatientDraftValue,
	operatorWorkflowFailureMessage,
	patientAdministrativeProfileDraftFromPatient,
	patientAdministrativeProfileDraftIssue,
	patientAdministrativeProfileDraftSignature,
	patientCoreDraftFromPatient,
	patientCoreDraftSignature,
	responseErrorMessage,
} from "../../AppHelpers";
import { usePatientStore } from "../../store/patientStore";

export function usePatientLogic({
	dashboard,
	query,
	setPaymentFeedback,
	setPaymentPayerFullName,
	setPaymentPayerInn,
	setPaymentPayerBirthDate,
	setPaymentPayerIdentityDocument,
	setPaymentPayerRelationship,
	setPaymentTaxDeductionCode,
	setError,
	auth,
	setDashboard,
	setQuery,
}: any) {
	const {
		selectedPatientId,
		patientCoreDraft,
		patientCoreSaveState,
		patientCoreDirty,
		patientAdministrativeProfileDraft,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileDirty,
		newPatientName,
		newPatientPhone,
		newPatientBirthDate,
		isPatientCreating,
		newRulePatientText,
		setSelectedPatientId,
		setPatientCoreDraft,
		setPatientCoreSaveState,
		setPatientCoreDirty,
		setPatientAdministrativeProfileDraft,
		setPatientAdministrativeProfileSaveState,
		setPatientAdministrativeProfileDirty,
		setNewPatientName,
		setNewPatientPhone,
		setNewPatientBirthDate,
		setIsPatientCreating,
		setNewRulePatientText,
	} = usePatientStore();

	const patientCoreDraftRef = useRef<PatientCoreDraft>(emptyPatientCoreDraft());

	const patientAdministrativeProfileDraftRef =
		useRef<PatientAdministrativeProfileDraft>(
			emptyPatientAdministrativeProfileDraft(),
		);

	const activePatient = useMemo(() => {
		if (!dashboard) return null;
		return (
			findPatient(dashboard.patients, dashboard?.activeVisit?.patientId) ??
			dashboard?.patients?.find((patient) => patient.status === "active") ??
			null
		);
	}, [dashboard]);

	const selectedPatient = useMemo(() => {
		if (!dashboard) return null;
		return (
			(selectedPatientId
				? findPatient(dashboard.patients, selectedPatientId)
				: null) ?? activePatient
		);
	}, [activePatient, dashboard, selectedPatientId]);

	const documentPatient = selectedPatient ?? activePatient;

	const documentPatientMatchesActiveVisit = Boolean(
		documentPatient && dashboard?.activeVisit?.patientId === documentPatient.id,
	);

	const paymentPatientContextReady = Boolean(
		documentPatient && documentPatientMatchesActiveVisit,
	);

	const paymentPatientContextMessage = !documentPatient
		? "Выберите пациента текущего приема перед записью оплаты."
		: !documentPatientMatchesActiveVisit
			? `Сейчас выбран пациент ${documentPatient.fullName}, но активный прием открыт для другого пациента. Переключите активный прием перед записью оплаты.`
			: "";

	const patientAdministrativeProfileValidationMessage = useMemo(
		() =>
			patientAdministrativeProfileDraftIssue(patientAdministrativeProfileDraft),
		[patientAdministrativeProfileDraft],
	);

	const patientInsightById = useMemo(() => {
		if (!dashboard)
			return new Map<string, Dashboard["patientInsights"][number]>();
		return new Map(
			(dashboard?.patientInsights ?? []).map((insight) => [
				insight.patientId,
				insight,
			]),
		);
	}, [dashboard]);

	const activePatientInsight = activePatient
		? (patientInsightById.get(activePatient.id) ?? null)
		: null;

	const activePatientCallablePhone =
		activePatient?.phone?.trim().replace(/[^\d+]/g, "") ?? "";

	const activePatientHasCallablePhone = activePatientCallablePhone.length >= 5;

	const filteredPatients = useMemo(() => {
		if (!dashboard) return [];
		const normalizedQuery = query.trim().toLowerCase();
		if (!normalizedQuery) return dashboard.patients;
		return (dashboard.patients || []).filter((patient) => {
			return `${patient.fullName} ${patient.phone ?? ""}`
				.toLowerCase()
				.includes(normalizedQuery);
		});
	}, [dashboard, query]);

	useEffect(() => {
		if (!dashboard) return;
		setSelectedPatientId((current: any) =>
			current &&
			(dashboard?.patients ?? []).some((patient) => patient.id === current)
				? current
				: (activePatient?.id ?? null),
		);
	}, [activePatient?.id, dashboard?.patients?.length]);

	useEffect(() => {
		setPaymentFeedback("");
		setPaymentPayerFullName("");
		setPaymentPayerInn("");
		setPaymentPayerBirthDate("");
		setPaymentPayerIdentityDocument("");
		setPaymentPayerRelationship("пациент");
		setPaymentTaxDeductionCode("");
	}, [documentPatient?.id]);

	useEffect(() => {
		setPatientCoreDraft(patientCoreDraftFromPatient(selectedPatient));
		setPatientCoreSaveState("idle");
		setPatientCoreDirty(false);
	}, [selectedPatient?.id, selectedPatient?.updatedAt]);

	useEffect(() => {
		setPatientAdministrativeProfileDraft(
			patientAdministrativeProfileDraftFromPatient(selectedPatient),
		);
		setPatientAdministrativeProfileSaveState("idle");
		setPatientAdministrativeProfileDirty(false);
	}, [selectedPatient?.id, selectedPatient?.updatedAt]);

	useEffect(() => {
		patientCoreDraftRef.current = patientCoreDraft;
	}, [patientCoreDraft]);

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
			void savePatientAdministrativeProfile();
		}, 1400);
		return () => window.clearTimeout(saveTimer);
	}, [
		selectedPatient?.id,
		patientAdministrativeProfileDirty,
		patientAdministrativeProfileDraft,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileValidationMessage,
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
			const response = await fetch(`/api/patients/${selectedPatient.id}`, {
				method: "PUT",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(payload),
			});
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
			setPatientCoreSaveState(latestMatchesSaved ? "saved" : "idle");
			setError(null);
			return true;
		} catch (saveError) {
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

	async function savePatientAdministrativeProfile() {
		if (patientAdministrativeProfileSaveState === "saving") {
			setError("Дождитесь завершения сохранения реквизитов пациента.");
			return false;
		}
		if (!selectedPatient) {
			setError("Выберите пациента перед сохранением реквизитов.");
			return false;
		}
		if (!patientAdministrativeProfileDirty) return true;
		if (patientAdministrativeProfileValidationMessage) {
			setPatientAdministrativeProfileSaveState("error");
			setError(patientAdministrativeProfileValidationMessage);
			return false;
		}
		const expectedSignature = patientAdministrativeProfileDraftSignature(
			patientAdministrativeProfileDraft,
		);
		setPatientAdministrativeProfileSaveState("saving");
		try {
			const response = await fetch(
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
			setPatientAdministrativeProfileSaveState(
				latestMatchesSaved ? "saved" : "idle",
			);
			setError(null);
			return true;
		} catch (saveError) {
			setPatientAdministrativeProfileSaveState("error");
			setError(
				operatorWorkflowFailureMessage(
					"Данные пациента не сохранены",
					saveError,
				),
			);
			return false;
		}
	}

	async function createPatient() {
		if (isPatientCreating) {
			setError("Дождитесь завершения создания карточки пациента.");
			return;
		}
		const fullName = newPatientName.trim();
		if (!fullName) {
			setError("Укажите ФИО пациента перед созданием карточки.");
			return;
		}
		const payload = {
			fullName,
			phone: nullablePatientDraftValue(newPatientPhone),
			birthDate: nullablePatientDraftValue(newPatientBirthDate),
		};
		setIsPatientCreating(true);
		try {
			const response = await fetch("/api/patients", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				setError(await responseErrorMessage(response, "Пациент не создан"));
				return;
			}
			const patient = (await response.json()) as Patient;
			setNewPatientName("");
			setNewPatientPhone("");
			setNewPatientBirthDate("");
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
		} catch (patientError) {
			setError(
				operatorWorkflowFailureMessage("Пациент не создан", patientError),
			);
		} finally {
			setIsPatientCreating(false);
		}
	}

	return {
		patientCoreDraftRef,
		patientAdministrativeProfileDraftRef,
		selectedPatientId,
		patientCoreDraft,
		patientCoreSaveState,
		patientCoreDirty,
		patientAdministrativeProfileDraft,
		patientAdministrativeProfileSaveState,
		patientAdministrativeProfileDirty,
		newPatientName,
		newPatientPhone,
		newPatientBirthDate,
		isPatientCreating,
		newRulePatientText,
		setSelectedPatientId,
		setPatientCoreDraft,
		setPatientCoreSaveState,
		setPatientCoreDirty,
		setPatientAdministrativeProfileDraft,
		setPatientAdministrativeProfileSaveState,
		setPatientAdministrativeProfileDirty,
		setNewPatientName,
		setNewPatientPhone,
		setNewPatientBirthDate,
		setIsPatientCreating,
		setNewRulePatientText,
		activePatient,
		selectedPatient,
		documentPatient,
		documentPatientMatchesActiveVisit,
		paymentPatientContextReady,
		paymentPatientContextMessage,
		patientAdministrativeProfileValidationMessage,
		patientInsightById,
		activePatientInsight,
		activePatientCallablePhone,
		activePatientHasCallablePhone,
		filteredPatients,
		updatePatientCoreDraft,
		updatePatientAdministrativeProfileDraft,
		savePatientCore,
		savePatientAdministrativeProfile,
		createPatient,
	};
}
