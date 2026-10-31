import { useCallback, useMemo } from "react";
import {
	buildRuleBasedVisitDraftFromTranscript,
	normalizeDentalSpeechTranscript,
	type SpeechTranscriptPolishResponse,
	type Dashboard,
} from "@dental/shared";
import {
	emptyVisitNoteForm,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	type VisitNoteField,
	visitNoteFieldDefinitions,
	visitNoteFormFromDraft,
	visitNoteFormFromVisit,
	type VisitNoteForm,
} from "../../../../AppHelpers";
import { showToast } from "../../../../components/GlobalToast";
import { actionFailureToast } from "../../../../lib/panelStateText";
import { useAppStore } from "../../../../store/appStore";
import { useVisitStore } from "../../../../store/visitStore";
import { fetchWithHandling } from "../../../../utils/networkUtils";

export interface UseVisitNoteSyncParams {
	// biome-ignore lint/suspicious/noExplicitAny: auth client carries headers
	auth: any;
	setError: (err: string | null) => void;
	dashboard: Dashboard | null;
	hasVisitTranscriptText: boolean;
}

export interface UseVisitNoteSyncReturn {
	savedVisitNoteForm: VisitNoteForm;
	isVisitNoteDirty: boolean;
	hasVisitNoteFormText: boolean;
	visitNoteActionLabel: string;
	visitNoteStatusLabel: string;
	visitHasSavedNote: boolean;
	updateVisitNoteField: (field: VisitNoteField | string, value: string) => void;
	polishTranscript: () => Promise<void>;
}

/**
 * useVisitNoteSync
 *
 * Clinical note synchronization, state-dirty checking, and speech polishing.
 * Complies with Mandate 8e (Doctor Autonomy) and Mandate 8x (Clean Clinical Russian):
 * - Live field synchronization with debounced draft retention.
 * - Server speech transcript polishing with seamless local heuristic fallback.
 * - Canonical field aliasing (complaint <-> complaints).
 */
export function useVisitNoteSync({
	auth,
	setError,
	dashboard,
	hasVisitTranscriptText,
}: UseVisitNoteSyncParams): UseVisitNoteSyncReturn {
	const transcript = useVisitStore((s) => s.transcript);
	const setTranscript = useVisitStore((s) => s.setTranscript);
	const draft = useVisitStore((s) => s.draft);
	const setDraft = useVisitStore((s) => s.setDraft);
	const visitNoteForm = useVisitStore((s) => s.visitNoteForm);
	const setVisitNoteForm = useVisitStore((s) => s.setVisitNoteForm);
	const isDraftAccepting = useVisitStore((s) => s.isDraftAccepting);
	const setIsTranscriptPolishing = useVisitStore(
		(s) => s.setIsTranscriptPolishing,
	);
	const selectedSpecialty = useVisitStore((s) => s.selectedSpecialty);
	const visitDraftUserEditedRef = useVisitStore(
		(s) => s.visitDraftUserEditedRef,
	);
	const setSpeechStatusNote = useAppStore((s) => s.setSpeechStatusNote);

	const savedVisitNoteForm = useMemo(
		() =>
			dashboard
				? visitNoteFormFromVisit(dashboard.activeVisit)
				: emptyVisitNoteForm,
		[dashboard],
	);

	const isVisitNoteDirty = useMemo(
		() =>
			visitNoteFieldDefinitions.some(
				({ key }) => visitNoteForm[key] !== savedVisitNoteForm[key],
			),
		[visitNoteForm, savedVisitNoteForm],
	);

	const hasVisitNoteFormText = useMemo(
		() =>
			visitNoteFieldDefinitions.some(
				({ key }) => (visitNoteForm[key] ?? "").trim().length > 0,
			),
		[visitNoteForm],
	);

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
		hasVisitTranscriptText,
		visitDraftUserEditedRef,
		setIsTranscriptPolishing,
		auth.denteClinicalMutationHeaders,
		transcript,
		selectedSpecialty,
		setTranscript,
		setDraft,
		setVisitNoteForm,
		setSpeechStatusNote,
		setError,
	]);

	return {
		savedVisitNoteForm,
		isVisitNoteDirty,
		hasVisitNoteFormText,
		visitNoteActionLabel,
		visitNoteStatusLabel,
		visitHasSavedNote,
		updateVisitNoteField,
		polishTranscript,
	};
}
