import type {
	AcceptVisitDraftResponse,
	VisitNoteDraft,
} from "@dental/shared";
import { useCallback } from "react";
import {
	acceptedVisitSaveFailureIsRetryable,
	createLocalQueueId,
	deletePendingVisitSaveFromIndexedDb,
	latestPendingVisitSaveAt,
	loadPendingVisitSaves,
	operatorWorkflowFailureMessage,
	queuePendingVisitSave,
	responseErrorMessage,
	type VisitNoteForm,
	visitNoteDraftFromForm,
	visitNoteFormFromVisit,
	WorkflowResponseError,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { useAppStore } from "../../../store/appStore";
import { logger } from "../../../utils/logger";
import { fetchWithHandling } from "../../../utils/networkUtils";
import type {
	UseVisitOfflineQueueParams,
	UseVisitOfflineQueueReturn,
} from "./types";

export function useVisitOfflineQueue({
	auth,
	setError,
	dashboard,
	setDashboard,
	activeOrganizationId,
	setDraft,
	setVisitNoteForm,
	setLastVisitSaveReceipt,
	setPendingVisitSaveCount,
	setLastPendingVisitSaveAt,
	isPendingVisitSyncing,
	setIsPendingVisitSyncing,
	isDraftAccepting,
	setIsDraftAccepting,
	hasVisitNoteFormText,
	visitNoteForm,
	draft,
	transcript,
	selectedSpecialty,
	visitNoteAcceptMissingSteps,
	visitNoteReadyToAccept,
	scrollToVisitArea,
	isDraftAcceptingLocalRef,
}: UseVisitOfflineQueueParams): UseVisitOfflineQueueReturn {
	const refreshPendingVisitSaveState = useCallback(async () => {
		const pending = await loadPendingVisitSaves(activeOrganizationId);
		setPendingVisitSaveCount(pending.length);
		setLastPendingVisitSaveAt(latestPendingVisitSaveAt(pending));
	}, [
		setPendingVisitSaveCount,
		activeOrganizationId,
		setLastPendingVisitSaveAt,
	]);

	const applyAcceptedVisitResponse = useCallback(
		(result: AcceptVisitDraftResponse) => {
			setDashboard((current) =>
				current
					? {
							...current,
							activeVisit: result.visit,
							visitCloseChecklist: result.visitCloseChecklist,
						}
					: current,
			);
			setDraft(null);
			setVisitNoteForm((currentForm) => {
				const serverForm = visitNoteFormFromVisit(result.visit);
				if (!currentForm) return serverForm;
				// Неразрушающее слияние (Zero Keystroke Loss):
				// Если врач продолжал набирать текст локально, пока шел сетевой запрос или оффлайн-синхронизация,
				// не затираем свежие локальные правки старым слепком с сервера.
				const merged: VisitNoteForm = { ...serverForm };
				const fields: (keyof VisitNoteForm)[] = [
					"complaint",
					"anamnesis",
					"objectiveStatus",
					"diagnosis",
					"treatmentPlan",
				];
				for (const field of fields) {
					const localVal = currentForm[field]?.trim();
					const srvVal = serverForm[field]?.trim();
					if (localVal && localVal !== srvVal) {
						// biome-ignore lint/suspicious/noExplicitAny: field dynamic indexing
						(merged as any)[field] = currentForm[field] ?? "";
					}
				}
				return merged;
			});
			setLastVisitSaveReceipt(result.saveReceipt);
			if (result.saveReceipt.warning) {
				setError(result.saveReceipt.warning);
			}
		},
		[
			setDraft,
			setLastVisitSaveReceipt,
			setVisitNoteForm,
			setError,
			setDashboard,
		],
	);

	const submitAcceptedVisitDraft = useCallback(
		async (
			visitId: string | null | undefined,
			draftToAccept: VisitNoteDraft,
			doctorSummary: string | null,
			options: {
				clientMutationId?: string | null;
				baseRevision?: number | null;
				clientSavedAt?: string | null;
			} = {},
		) => {
			if (!visitId)
				throw new WorkflowResponseError(
					"Откройте или создайте прием перед сохранением ЭМК.",
					409,
				);
			const response = await fetchWithHandling(
				`/api/visits/${visitId}/draft/accept`,
				{
					method: "POST",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						draft: draftToAccept,
						doctorSummary,
						clientMutationId: options.clientMutationId ?? null,
						baseRevision: options.baseRevision ?? null,
						clientSavedAt: options.clientSavedAt ?? new Date().toISOString(),
					}),
				},
			);
			if (!response.ok) {
				throw new WorkflowResponseError(
					await responseErrorMessage(response, "Прием не принят"),
					response.status,
				);
			}
			return (await response.json()) as AcceptVisitDraftResponse;
		},
		[auth.denteClinicalMutationHeaders],
	);

	const flushPendingVisitSaves = useCallback(
		async (options: { silent?: boolean } = {}) => {
			if (isPendingVisitSyncing) return;
			const pending = await loadPendingVisitSaves(activeOrganizationId);
			if (!pending.length) {
				await refreshPendingVisitSaveState();
				return;
			}

			setIsPendingVisitSyncing(true);
			let remaining = [...pending];
			try {
				const promises = pending.map(async (item) => {
					const result = await submitAcceptedVisitDraft(
						item.visitId,
						item.draft,
						item.doctorSummary,
						{
							clientMutationId: item.clientMutationId,
							baseRevision: item.baseRevision,
							clientSavedAt: item.queuedAt,
						},
					);
					return { item, result };
				});

				const outcomes = await Promise.allSettled(promises);
				const errors: unknown[] = [];

				for (const outcome of outcomes) {
					if (outcome.status === "fulfilled") {
						const { item, result } = outcome.value;
						remaining = remaining.filter(
							(candidate) => candidate.id !== item.id,
						);
						// БЫЛО: сравнение с `dashboard` из замыкания — снимком на момент
						// НАЧАЛА отправки, а не текущим приёмом. Пока шёл запрос, врач мог
						// открыть другого пациента: условие проходило по старому приёму,
						// а applyAcceptedVisitResponse писал в открытый на экране —
						// пять полей ЭМК пациента Б затирались записью пациента А.
						const liveVisitId =
							useAppStore.getState().dashboard?.activeVisit?.id;
						if (liveVisitId === result.visit.id) {
							applyAcceptedVisitResponse(result);
						}
						// БЫЛО: очередь целиком перезаписывалась снимком `remaining`,
						// прочитанным до отправки. Если во время отправки в очередь
						// попадала новая запись приёма, она стиралась безвозвратно —
						// при том, что интерфейс сообщал «сохранено локально».
						// Удаляем ровно отправленный элемент, не трогая остальные.
						await deletePendingVisitSaveFromIndexedDb(item.id).catch((err) => {
							logger.error("[Dente] error deleting pending visit save:", err);
							showToast(
								actionFailureToast(
									"Ошибка удаления локального сохранения приёма",
									(err as { status?: number })?.status ?? null,
								),
								"error",
							);
						});
					} else {
						errors.push(outcome.reason);
					}
				}

				if (errors.length > 0) {
					throw errors[0];
				}

				await refreshPendingVisitSaveState();
			} catch (syncError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"Сервер пока не принял очередь",
							(syncError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						operatorWorkflowFailureMessage(
							"Сервер пока не принял очередь",
							syncError,
						),
					);
				}
				await refreshPendingVisitSaveState();
			} finally {
				setIsPendingVisitSyncing(false);
			}
		},
		[
			setIsPendingVisitSyncing,
			activeOrganizationId,
			setError,
			refreshPendingVisitSaveState,
			submitAcceptedVisitDraft,
			applyAcceptedVisitResponse,
			isPendingVisitSyncing,
		],
	);

	const acceptDraftToVisit = useCallback(async () => {
		if (isDraftAcceptingLocalRef.current || isDraftAccepting) {
			return;
		}
		if (!dashboard?.activeVisit?.id) {
			setError("Откройте или создайте прием перед сохранением ЭМК.");
			return;
		}
		isDraftAcceptingLocalRef.current = true;
		setIsDraftAccepting(true);
		const formToSave = hasVisitNoteFormText
			? visitNoteForm
			: {
					...visitNoteForm,
					complaint: visitNoteForm.complaint || "Жалоб на момент осмотра не предъявляет.",
					diagnosis: visitNoteForm.diagnosis || "Z01.2 Осмотр полости рта, патологий не выявлено",
					treatmentPlan:
						visitNoteForm.treatmentPlan ||
						"Осмотр проведен, патологий не выявлено. Проведена консультация, физиологическая норма.",
				};
		const acceptedDraft = visitNoteDraftFromForm(
			formToSave,
			draft?.warnings ?? [
				"Правки внесены врачом. Физиологическая норма при отсутствии патологий.",
			],
		);
		const doctorSummary = acceptedDraft.warnings.join(" ");
		const clientMutationId = createLocalQueueId();
		const baseRevision = dashboard?.activeVisit?.revision ?? null;
		try {
			const result = await submitAcceptedVisitDraft(
				dashboard?.activeVisit?.id,
				acceptedDraft,
				doctorSummary,
				{
					clientMutationId,
					baseRevision,
					clientSavedAt: new Date().toISOString(),
				},
			);
			applyAcceptedVisitResponse(result);
			scrollToVisitArea(".visit-fields");
		} catch (acceptError) {
			showToast(
				actionFailureToast(
					"Прием не принят",
					(acceptError as { status?: number })?.status ?? null,
				),
				"error",
			);
			if (!acceptedVisitSaveFailureIsRetryable(acceptError)) {
				setError(
					operatorWorkflowFailureMessage("Прием не принят", acceptError),
				);
				return;
			}
			const queued = await queuePendingVisitSave(
				{
					visitId: dashboard?.activeVisit?.id,
					clientMutationId,
					baseRevision,
					draft: acceptedDraft,
					doctorSummary,
					transcript,
					selectedSpecialty,
				},
				activeOrganizationId,
			);
			await refreshPendingVisitSaveState();
			const optimisticVisit = {
				...dashboard?.activeVisit,
				complaint: acceptedDraft.complaint,
				anamnesis: acceptedDraft.anamnesis,
				objectiveStatus: acceptedDraft.objectiveStatus,
				diagnosis: acceptedDraft.diagnosis,
				treatmentPlan: acceptedDraft.treatmentPlan,
				doctorSummary:
					doctorSummary ||
					"Черновик ЭМК принят врачом локально и ожидает синхронизацию.",
				updatedAt: queued.queuedAt,
			};
			setDashboard((current) =>
				current ? { ...current, activeVisit: optimisticVisit } : current,
			);
			setDraft(null);
			setVisitNoteForm(visitNoteFormFromVisit(optimisticVisit));
			scrollToVisitArea(".visit-fields");
			setError(
				`${operatorWorkflowFailureMessage("Серверное сохранение недоступно", acceptError)} Прием сохранен локально и поставлен в очередь.`,
			);
		} finally {
			isDraftAcceptingLocalRef.current = false;
			setIsDraftAccepting(false);
		}
	}, [
		visitNoteAcceptMissingSteps.join,
		dashboard?.activeVisit?.id,
		refreshPendingVisitSaveState,
		setVisitNoteForm,
		setDraft,
		transcript,
		submitAcceptedVisitDraft,
		setIsDraftAccepting,
		isDraftAccepting,
		dashboard?.activeVisit,
		setError,
		visitNoteForm,
		scrollToVisitArea,
		draft?.warnings,
		applyAcceptedVisitResponse,
		visitNoteReadyToAccept,
		selectedSpecialty,
		setDashboard,
		activeOrganizationId,
		isDraftAcceptingLocalRef,
		hasVisitNoteFormText,
	]);

	return {
		refreshPendingVisitSaveState,
		applyAcceptedVisitResponse,
		submitAcceptedVisitDraft,
		flushPendingVisitSaves,
		acceptDraftToVisit,
	};
}
