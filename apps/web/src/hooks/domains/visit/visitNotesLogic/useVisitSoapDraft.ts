import { useCallback } from "react";
import type { Dashboard, VisitFlowResult } from "@dental/shared";
import {
	buildOfflineVisitDraftFromTranscript,
	operatorWorkflowFailureMessage,
	responseErrorMessage,
	visitNoteFormFromDraft,
} from "../../../../AppHelpers";
import { showToast } from "../../../../components/GlobalToast";
import { actionFailureToast } from "../../../../lib/panelStateText";
import { useVisitStore } from "../../../../store/visitStore";
import { fetchWithHandling } from "../../../../utils/networkUtils";
import { useWorkspaceProfileStore } from "../../../useWorkspaceProfile";

export interface UseVisitSoapDraftParams {
	// biome-ignore lint/suspicious/noExplicitAny: auth client carries headers
	auth: any;
	setError: (err: string | null) => void;
	dashboard: Dashboard | null;
	// biome-ignore lint/suspicious/noExplicitAny: active patient entity
	activePatient?: any;
	// biome-ignore lint/suspicious/noExplicitAny: active doctor entity
	activeDoctor?: any;
	scrollToVisitArea: (selector: string) => void;
	hasVisitTranscriptText: boolean;
	hasVisitNoteFormText: boolean;
	isVisitNoteDirty: boolean;
}

export interface UseVisitSoapDraftReturn {
	// biome-ignore lint/suspicious/noExplicitAny: checklist
	visitCloseChecklist: any;
	// biome-ignore lint/suspicious/noExplicitAny: warnings
	visitWarnings: any[];
	// biome-ignore lint/suspicious/noExplicitAny: warning
	primaryVisitWarning: any;
	visitDraftBuildMissingSteps: string[];
	visitDraftReadyToBuild: boolean;
	visitNoteAcceptMissingSteps: string[];
	visitNoteReadyToAccept: boolean;
	buildOfflineDraft: () => void;
	buildDraft: () => Promise<void>;
	openVisitWarningAction: () => void;
}

/**
 * useVisitSoapDraft
 *
 * Clinical SOAP draft engine & preparation workflow.
 * Governed by Mandate 8e (Doctor Autonomy & Zero-Blocking Invariant):
 * - Primary CTA "Save" is NEVER disabled. Missing inputs trigger soft guidance, not blockades.
 * - 1-Click physiological norm preset fallback.
 * - FDI tooth formula detection & automatic planned status mapping.
 */
export function useVisitSoapDraft({
	auth,
	setError,
	dashboard,
	activePatient,
	activeDoctor,
	scrollToVisitArea,
	hasVisitTranscriptText,
	hasVisitNoteFormText,
	isVisitNoteDirty,
}: UseVisitSoapDraftParams): UseVisitSoapDraftReturn {
	const transcript = useVisitStore((s) => s.transcript);
	const draft = useVisitStore((s) => s.draft);
	const setDraft = useVisitStore((s) => s.setDraft);
	const setVisitFlowResult = useVisitStore((s) => s.setVisitFlowResult);
	const setVisitNoteForm = useVisitStore((s) => s.setVisitNoteForm);
	const applyAiToothCodes = useVisitStore((s) => s.applyAiToothCodes);
	const setIsDraftLoading = useVisitStore((s) => s.setIsDraftLoading);
	const selectedSpecialty = useVisitStore((s) => s.selectedSpecialty);
	const visitDraftUserEditedRef = useVisitStore(
		(s) => s.visitDraftUserEditedRef,
	);

	const visitCloseChecklist = dashboard?.visitCloseChecklist ?? null;
	const visitWarnings =
		// biome-ignore lint/suspicious/noExplicitAny: checklist items
		visitCloseChecklist?.items?.filter((item: any) => !item.ready) ?? [];
	const primaryVisitWarning =
		// biome-ignore lint/suspicious/noExplicitAny: checklist items
		visitWarnings?.find((item: any) => item.blocking) ??
		visitWarnings[0] ??
		null;

	const visitDraftBuildMissingSteps = [
		!activePatient ? "выберите пациента" : null,
		!hasVisitTranscriptText
			? "добавьте текст диктовки или нажмите голосовую запись"
			: null,
	].filter((step): step is string => Boolean(step));

	const visitDraftReadyToBuild = visitDraftBuildMissingSteps.length === 0;

	// Mandate 8e: Hints for the doctor, but NEVER a blocker for saving!
	const visitNoteAcceptMissingSteps = [
		!hasVisitNoteFormText
			? "заполните хотя бы одно поле ЭМК или соберите черновик из диктовки"
			: null,
		!draft && !isVisitNoteDirty
			? "внесите правку в ЭМК или подготовьте новый черновик"
			: null,
	].filter((step): step is string => Boolean(step));

	// Mandate 8e Doctor Autonomy Invariant: Save button is ALWAYS ready to accept.
	// Saving without text saves physiological norm in 1 click!
	const visitNoteReadyToAccept = true;

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
		hasVisitTranscriptText,
		transcript,
		selectedSpecialty,
		setDraft,
		setVisitNoteForm,
		scrollToVisitArea,
		setError,
		visitDraftUserEditedRef,
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

			const visitStoreState = useVisitStore.getState();
			const completedServices =
				(visitStoreState.completedServices?.length ?? 0) > 0
					? visitStoreState.completedServices.map((s) => ({
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
					: // biome-ignore lint/suspicious/noExplicitAny: raw visit services
						((dashboard?.activeVisit as any)?.completedServices ?? []);

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
					completedServices,
					doctorFullName: activeDoctor?.fullName ?? undefined,
					planPayload: null,
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
		dashboard,
		activePatient,
		hasVisitTranscriptText,
		visitDraftBuildMissingSteps,
		visitDraftUserEditedRef,
		setIsDraftLoading,
		auth.denteClinicalReadHeaders,
		transcript,
		selectedSpecialty,
		activeDoctor?.fullName,
		setVisitFlowResult,
		setDraft,
		setVisitNoteForm,
		applyAiToothCodes,
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
	}, [primaryVisitWarning, scrollToVisitArea]);

	return {
		visitCloseChecklist,
		visitWarnings,
		primaryVisitWarning,
		visitDraftBuildMissingSteps,
		visitDraftReadyToBuild,
		visitNoteAcceptMissingSteps,
		visitNoteReadyToAccept,
		buildOfflineDraft,
		buildDraft,
		openVisitWarningAction,
	};
}
