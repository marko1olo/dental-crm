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
import { resetPaymentComposer } from "../../components/finance/paymentComposerReset";
import { useDocumentStore } from "../../store/documentStore";
import { usePatientStore } from "../../store/patientStore";

/** Заготовка приёма из гидратации базы: приёмов нет, объект есть. */
const NIL_VISIT_UUID = "00000000-0000-0000-0000-000000000000";

/*
 * Записывающие функции формы оплаты больше не прокидываются сюда по одной:
 * сброс берёт их из того же хранилища, где лежат сами поля, и очищает форму
 * целиком. Прокинутая россыпь сеттеров и была причиной того, что восемь полей
 * из четырнадцати забыли — см. сброс при смене пациента ниже.
 */
export function usePatientLogic({
	dashboard,
	query,
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
			dashboard?.patients?.[0] ??
			null
		);
	}, [dashboard]);

	/**
	 * Пациент открытого приёма — и только он. `activePatient` выше при
	 * отсутствии приёма подставляет первого пациента списка, поэтому карточка
	 * на «Смене» показывала случайного человека с красной пометкой «СРОЧНО»,
	 * хотя его никто не выбирал и приёма не было.
	 *
	 * Гидратация базы кладёт в `activeVisit` заготовку с нулевым UUID, когда
	 * черновиков нет вовсе, — она пациентом не считается.
	 */
	const activeVisitPatient = useMemo(() => {
		const visit = dashboard?.activeVisit;
		if (!visit?.id || visit.id === NIL_VISIT_UUID) return null;
		if (!visit.patientId || visit.patientId === NIL_VISIT_UUID) return null;
		return findPatient(dashboard?.patients, visit.patientId) ?? null;
	}, [dashboard?.activeVisit, dashboard?.patients]);

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

	/*
	 * КАССА ОТКАЗЫВАЛАСЬ ПРИНИМАТЬ ДЕНЬГИ, КОГДА ПРИЁМА НЕТ ВОВСЕ.
	 *
	 * Готовность оплаты требовала совпадения пациента с пациентом открытого
	 * приёма. Но гидратация базы кладёт в `activeVisit` заготовку с нулевым
	 * UUID, когда открытых приёмов нет: совпадения не было никогда, и приём
	 * оплаты был заперт. Хуже того, объяснение врало — «активный прием открыт
	 * для другого пациента», хотя приём не открыт ни для кого.
	 *
	 * Сервер такие оплаты принимает: visitId необязателен, и это правильно —
	 * пациент платит и авансом, и по счёту, и за документ, и по долгу.
	 * Настоящий риск ровно один: открыт приём ДРУГОГО пациента, и деньги уйдут
	 * не тому. Только этот случай и запираем.
	 */
	const activeVisitPatientId =
		dashboard?.activeVisit?.id && dashboard.activeVisit.id !== NIL_VISIT_UUID
			? dashboard.activeVisit.patientId
			: null;
	const openVisitBelongsToSomeoneElse = Boolean(
		documentPatient &&
			activeVisitPatientId &&
			activeVisitPatientId !== NIL_VISIT_UUID &&
			activeVisitPatientId !== documentPatient.id,
	);

	const paymentPatientContextReady = Boolean(
		documentPatient && !openVisitBelongsToSomeoneElse,
	);

	const paymentPatientContextMessage = !documentPatient
		? "Выберите пациента, за которого принимаете оплату."
		: openVisitBelongsToSomeoneElse
			? `Сейчас выбран пациент ${documentPatient.fullName}, но открытый прием идёт у другого пациента. Переключите приём, иначе оплата уйдёт не тому.`
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
		if (!normalizedQuery) return dashboard.patients || [];
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

	/*
	 * СМЕНИЛСЯ ПАЦИЕНТ — ФОРМА ОПЛАТЫ ПУСТАЯ.
	 *
	 * БЫЛО: здесь очищались только шесть полей плательщика для вычета. Сумма и
	 * весь фискальный блок (номер чека, дата, ФН, ФД, ФПД, ссылка НФД, кассир)
	 * оставались от предыдущего пациента. Кассир набирал сумму и переписывал
	 * признаки с чека пациента А, не нажимал «Принять оплату», переключался на
	 * пациента Б — и форма выглядела заполненной им самим. Нажатие записывало
	 * деньги пациенту Б с суммой пациента А и с фискальными признаками чужого
	 * чека; они же уходят в налоговые документы.
	 *
	 * Сброс после записанного платежа (useAppLogic.tsx) очищал все четырнадцать
	 * полей — то есть программа сама знала, как выглядит свежая форма, но при
	 * смене пациента этого не делала. Теперь определение одно на оба случая:
	 * components/finance/paymentComposerReset.ts.
	 *
	 * Зависимость — идентификатор пациента, поэтому перезагрузка сводки при том
	 * же пациенте набранную сумму не стирает. Снятие выбора (пациента нет,
	 * идентификатор становится undefined) считается сменой и тоже очищает форму.
	 */
	useEffect(() => {
		resetPaymentComposer(useDocumentStore.getState());
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

	// Отложенное сохранение профиля: флаг нужен, чтобы при размонтировании или
	// смене пациента не потерять уже введённые данные.
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
			// БЫЛО: очистка просто отменяла таймер. React выполняет её ПЕРЕД
			// применением нового эффекта, поэтому переключение на другого
			// пациента в течение 1,4 секунды после правки отменяло сохранение,
			// а следующий эффект перезаписывал черновик данными нового пациента.
			// Введённый ИНН или паспорт исчезали молча, без предупреждения.
			// Теперь незавершённое сохранение доводится до конца.
			if (pendingProfileSaveRef.current) {
				pendingProfileSaveRef.current = false;
				void savePatientAdministrativeProfile();
			}
		};
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
		activeVisitPatient,
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
