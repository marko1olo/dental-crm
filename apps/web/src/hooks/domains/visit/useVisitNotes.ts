import {
	buildRuleBasedVisitDraftFromTranscript,
	normalizeDentalSpeechTranscript,
	type SpeechTranscriptPolishResponse,
	type VisitFlowResult,
} from "@dental/shared";
import { useCallback, useMemo } from "react";
import {
	appendSpeechTextWithoutDuplicateTail,
	buildOfflineVisitDraftFromTranscript,
	emptyVisitNoteForm,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	type VisitNoteField,
	visitNoteFieldDefinitions,
	visitNoteFormFromDraft,
	visitNoteFormFromVisit,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { useAppStore } from "../../../store/appStore";
import { useVisitStore } from "../../../store/visitStore";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { useWorkspaceProfileStore } from "../../useWorkspaceProfile";
import type { UseVisitNotesParams, UseVisitNotesReturn } from "./types";

export function useVisitNotes({
	auth,
	setError,
	dashboard,
	activePatient,
	activeDoctor,
	speechGatewayStatus,
	scrollToVisitArea,
}: UseVisitNotesParams): UseVisitNotesReturn {
	const visitStore = useVisitStore();
	const appStore = useAppStore();

	const {
		selectedSpecialty,
		clearedTranscriptSnapshot,
		setClearedTranscriptSnapshot,
		transcript,
		setTranscript,
		draft,
		setDraft,
		setVisitFlowResult,
		visitNoteForm,
		setVisitNoteForm,
		applyAiToothCodes,
		isDraftAccepting,
		setIsDraftLoading,
		setIsTranscriptPolishing,
		visitDraftUserEditedRef,
	} = visitStore;

	const { setSpeechStatusNote } = appStore;

	const visitCloseChecklist = dashboard?.visitCloseChecklist ?? null;
	const visitWarnings =
		// biome-ignore lint/suspicious/noExplicitAny: checklist items
		visitCloseChecklist?.items.filter((item: any) => !item.ready) ?? [];
	const primaryVisitWarning =
		// biome-ignore lint/suspicious/noExplicitAny: checklist items
		visitWarnings?.find((item: any) => item.blocking) ??
		visitWarnings[0] ??
		null;

	const savedVisitNoteForm = useMemo(
		() =>
			dashboard
				? visitNoteFormFromVisit(dashboard.activeVisit)
				: emptyVisitNoteForm,
		[dashboard],
	);

	const isVisitNoteDirty = visitNoteFieldDefinitions.some(
		({ key }) => visitNoteForm[key] !== savedVisitNoteForm[key],
	);

	const hasVisitNoteFormText = visitNoteFieldDefinitions.some(
		({ key }) => visitNoteForm[key].trim().length > 0,
	);

	const hasVisitTranscriptText = transcript.trim().length > 0;

	const visitDraftBuildMissingSteps = [
		!activePatient ? "выберите пациента" : null,
		!hasVisitTranscriptText
			? "добавьте текст диктовки или нажмите голосовую запись"
			: null,
	].filter((step): step is string => Boolean(step));

	const visitDraftReadyToBuild = visitDraftBuildMissingSteps.length === 0;

	const visitNoteAcceptMissingSteps = [
		!hasVisitNoteFormText
			? "заполните хотя бы одно поле ЭМК или соберите черновик из диктовки"
			: null,
		!draft && !isVisitNoteDirty
			? "внесите правку в ЭМК или подготовьте новый черновик"
			: null,
	].filter((step): step is string => Boolean(step));

	const visitNoteReadyToAccept = visitNoteAcceptMissingSteps.length === 0;

	const visitNoteActionLabel = isDraftAccepting
		? "Сохраняю"
		: draft
			? "Принять"
			: isVisitNoteDirty
				? "Сохранить"
				: "Сохранено";

	const visitNoteStatusLabel = draft
		? "черновик готов"
		: isVisitNoteDirty
			? "есть правки"
			: "сохранено";

	const visitHasSavedNote = hasVisitNoteFormText && !draft && !isVisitNoteDirty;

	const appendVisitDictationText = useCallback(
		(value: string) => {
			const cleanValue = value.trim();
			if (!cleanValue) return;
			visitDraftUserEditedRef.current = true;
			setClearedTranscriptSnapshot(null);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			setTranscript((current: any) =>
				appendSpeechTextWithoutDuplicateTail(
					current,
					cleanValue,
					speechGatewayStatus?.chunkingPolicy?.dedupeWindowChars ?? 600,
				),
			);
			setDraft(null);
		},
		[
			setDraft,
			visitDraftUserEditedRef,
			speechGatewayStatus?.chunkingPolicy?.dedupeWindowChars,
			setTranscript,
			setClearedTranscriptSnapshot,
		],
	);

	const appendToTranscript = useCallback(
		(text: string) => {
			visitDraftUserEditedRef.current = true;
			setClearedTranscriptSnapshot(null);
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			setTranscript((current: any) =>
				appendSpeechTextWithoutDuplicateTail(
					current,
					text,
					speechGatewayStatus?.chunkingPolicy?.dedupeWindowChars ?? 600,
				),
			);
		},
		[
			setClearedTranscriptSnapshot,
			visitDraftUserEditedRef,
			speechGatewayStatus?.chunkingPolicy?.dedupeWindowChars,
			setTranscript,
		],
	);

	const updateVisitNoteField = useCallback(
		(field: VisitNoteField | string, value: string) => {
			visitDraftUserEditedRef.current = true;
			const canonicalKey = field === "complaints" ? "complaint" : field;
			const pluralKey = field === "complaint" ? "complaints" : field;
			setVisitNoteForm((current) => ({
				...current,
				[field]: value,
				[canonicalKey]: value,
				[pluralKey]: value,
			}));
		},
		[visitDraftUserEditedRef, setVisitNoteForm],
	);

	const buildOfflineDraft = useCallback(() => {
		if (!hasVisitTranscriptText) {
			setError("Добавьте текст диктовки перед локальным разбором.");
			return;
		}
		visitDraftUserEditedRef.current = true;
		const fallbackDraft = buildOfflineVisitDraftFromTranscript(
			transcript,
			selectedSpecialty,
		);
		setDraft(fallbackDraft);
		setVisitNoteForm(visitNoteFormFromDraft(fallbackDraft));
		scrollToVisitArea(".visit-note-panel");
	}, [
		setVisitNoteForm,
		transcript,
		setDraft,
		selectedSpecialty,
		hasVisitTranscriptText,
		visitDraftUserEditedRef,
		scrollToVisitArea,
		setError,
	]);

	const openVisitWarningAction = useCallback(() => {
		if (!primaryVisitWarning) {
			scrollToVisitArea(".close-checklist");
			return;
		}
		if (primaryVisitWarning.section === "visit") {
			if (primaryVisitWarning.id === "ai-draft-review") {
				scrollToVisitArea(".ai-draft");
				return;
			}
			if (primaryVisitWarning.id === "clinical-rules") {
				const warningPanel = document.querySelector(
					".clinical-rule-panel-compact",
				);
				if (warningPanel instanceof HTMLDetailsElement) {
					warningPanel.open = true;
				}
				scrollToVisitArea(".clinical-rule-panel");
				return;
			}
			scrollToVisitArea(".close-checklist");
			return;
		}
		window.location.hash = primaryVisitWarning.section;
	}, [
		scrollToVisitArea,
		primaryVisitWarning?.id,
		primaryVisitWarning?.section,
		primaryVisitWarning,
	]);

	const polishTranscript = useCallback(async () => {
		if (!hasVisitTranscriptText) {
			setError(
				"Перед очисткой диктовки: добавьте текст диктовки или нажмите голосовую запись.",
			);
			return;
		}
		visitDraftUserEditedRef.current = true;
		setIsTranscriptPolishing(true);
		try {
			const response = await fetchWithHandling(
				"/api/speech/polish-transcript",
				{
					method: "POST",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						transcript,
						specialty: selectedSpecialty,
						source: "voice",
					}),
				},
			);
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Серверная очистка диктовки недоступна",
					),
				);
			}
			const result = (await response.json()) as SpeechTranscriptPolishResponse;
			setTranscript(result.normalizedTranscript);
			setDraft(result.draft);
			setVisitNoteForm(visitNoteFormFromDraft(result.draft));
			const polishLabel =
				result.polishMode === "deterministic_neural"
					? `ИИ-полировка ${result.modelName ?? ""}`.trim()
					: "локальная проверка правил";
			setSpeechStatusNote(
				result.changedPhrases.length
					? `Текст очищен (${polishLabel}): ${result.changedPhrases.slice(0, 4).join(", ")}`
					: `Текст проверен (${polishLabel}): факты не добавлялись.`,
			);
		} catch (polishError) {
			showToast(
				actionFailureToast(
					"Серверная очистка недоступна",
					(polishError as { status?: number })?.status ?? null,
				),
				"error",
			);
			const local = normalizeDentalSpeechTranscript(
				transcript,
				selectedSpecialty,
			);
			const localDraft = buildRuleBasedVisitDraftFromTranscript(
				local.normalizedText,
				selectedSpecialty,
				{
					sourceLabel: "Локальная очистка диктовки",
				},
			);
			setTranscript(local.normalizedText);
			setDraft(localDraft);
			setVisitNoteForm(visitNoteFormFromDraft(localDraft));
			setSpeechStatusNote("Текст очищен локальным разбором без сервера.");
			if (polishError instanceof Error) {
				setError(
					`${operatorWorkflowFailureMessage("Серверная очистка недоступна", polishError)} Использован локальный разбор.`,
				);
			}
		} finally {
			setIsTranscriptPolishing(false);
		}
	}, [
		setSpeechStatusNote,
		selectedSpecialty,
		visitDraftUserEditedRef,
		setVisitNoteForm,
		transcript,
		hasVisitTranscriptText,
		setError,
		setDraft,
		auth.denteClinicalMutationHeaders,
		setTranscript,
		setIsTranscriptPolishing,
	]);

	const buildDraft = useCallback(async () => {
		if (!dashboard || !activePatient || !hasVisitTranscriptText) {
			const missingSteps = [
				!dashboard ? "дождитесь загрузки приема" : null,
				...visitDraftBuildMissingSteps,
			].filter((step): step is string => Boolean(step));
			setError(`Перед сборкой черновика: ${missingSteps.join(", ")}.`);
			return;
		}
		visitDraftUserEditedRef.current = true;
		setIsDraftLoading(true);
		try {
			const {
				aiEnableTreatmentPlan,
				aiEnableRecommendations,
				aiEnableDocuments,
			} = useWorkspaceProfileStore.getState();

			const response = await fetchWithHandling("/api/ai/visit-flow", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: activePatient.id,
					transcript,
					specialty: selectedSpecialty,
					source: "voice",
					completedServices:
						(useVisitStore.getState().completedServices?.length ?? 0) > 0
							? useVisitStore.getState().completedServices.map((s) => ({
									serviceId: s.serviceId,
									title: s.name,
									quantity: s.quantity || 1,
									priceRub: s.priceRub,
									toothCode: s.toothCode
										? String(s.toothCode)
										: s.toothNumber
											? String(s.toothNumber)
											: null,
									toothNumber: s.toothNumber ? Number(s.toothNumber) : null,
									code804n: s.code804n,
							  }))
							: ((dashboard?.activeVisit as any)?.completedServices ?? []),
					doctorFullName: activeDoctor?.fullName ?? undefined,
					planPayload: null, // extracted inside flow
					recommendationsPayload: null,
					orchestratorConfig: {
						enablePlan: aiEnableTreatmentPlan,
						enableRecommendations: aiEnableRecommendations,
						enableDocuments: aiEnableDocuments,
					},
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Серверный поток визита недоступен",
					),
				);
			}
			const result: VisitFlowResult = await response.json();
			setVisitFlowResult(result);

			const draftData = result.draft.data;
			if (draftData) {
				setDraft(draftData);
				setVisitNoteForm(visitNoteFormFromDraft(draftData));
				// Auto-update tooth map from AI-detected tooth codes
				if (
					draftData.quality?.detectedToothCodes?.length ||
					draftData.quality?.detectedToothStates
				) {
					applyAiToothCodes(
						draftData.quality?.detectedToothCodes || [],
						"planned",
						draftData.quality?.detectedToothStates,
					);
				}
			}
			scrollToVisitArea(".visit-note-panel");
		} catch (draftError) {
			showToast(
				actionFailureToast(
					"Серверный черновик недоступен",
					(draftError as { status?: number })?.status ?? null,
				),
				"error",
			);
			const fallbackDraft = buildOfflineVisitDraftFromTranscript(
				transcript,
				selectedSpecialty,
			);
			setDraft(fallbackDraft);
			setVisitNoteForm(visitNoteFormFromDraft(fallbackDraft));
			scrollToVisitArea(".visit-note-panel");
			setError(
				`${operatorWorkflowFailureMessage("Серверный черновик недоступен", draftError)} Включен офлайн-разбор.`,
			);
		} finally {
			setIsDraftLoading(false);
		}
	}, [
		hasVisitTranscriptText,
		setVisitNoteForm,
		dashboard,
		selectedSpecialty,
		auth.denteClinicalReadHeaders,
		visitDraftBuildMissingSteps,
		applyAiToothCodes,
		scrollToVisitArea,
		visitDraftUserEditedRef,
		setError,
		activePatient,
		setIsDraftLoading,
		setVisitFlowResult,
		setDraft,
		activeDoctor?.fullName,
		transcript,
	]);

	const clearTranscriptWithUndo = useCallback(() => {
		const previousTranscript = transcript;
		if (!previousTranscript.trim()) {
			setSpeechStatusNote("Диктовка уже пустая. Нечего очищать.");
			return;
		}
		visitDraftUserEditedRef.current = true;
		setClearedTranscriptSnapshot(previousTranscript);
		setTranscript("");
		setSpeechStatusNote(
			"Диктовка очищена. Можно сразу вернуть текст кнопкой «Вернуть».",
		);
	}, [
		transcript,
		visitDraftUserEditedRef,
		setTranscript,
		setSpeechStatusNote,
		setClearedTranscriptSnapshot,
	]);

	const undoTranscriptClear = useCallback(() => {
		if (!clearedTranscriptSnapshot) {
			setSpeechStatusNote("Нет очищенной диктовки для восстановления.");
			return;
		}
		visitDraftUserEditedRef.current = true;
		setTranscript(clearedTranscriptSnapshot);
		setClearedTranscriptSnapshot(null);
		setSpeechStatusNote("Диктовка восстановлена из локального черновика.");
	}, [
		setTranscript,
		visitDraftUserEditedRef,
		setSpeechStatusNote,
		setClearedTranscriptSnapshot,
		clearedTranscriptSnapshot,
	]);

	return {
		visitCloseChecklist,
		visitWarnings,
		primaryVisitWarning,
		savedVisitNoteForm,
		isVisitNoteDirty,
		hasVisitNoteFormText,
		hasVisitTranscriptText,
		visitDraftBuildMissingSteps,
		visitDraftReadyToBuild,
		visitNoteAcceptMissingSteps,
		visitNoteReadyToAccept,
		visitNoteActionLabel,
		visitNoteStatusLabel,
		visitHasSavedNote,
		appendToTranscript,
		appendVisitDictationText,
		updateVisitNoteField,
		buildOfflineDraft,
		openVisitWarningAction,
		polishTranscript,
		buildDraft,
		clearTranscriptWithUndo,
		undoTranscriptClear,
	};
}
