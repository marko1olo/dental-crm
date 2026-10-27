import type { PostVisitCareTopic } from "@dental/shared";
import { postVisitCarePresets } from "../../../../postVisitCareData";
import { postVisitCareTopicOptions } from "../../../../workspaceStaticOptions";

export interface UseDocumentPostVisitCareProps {
	documentState: any;
}

export function useDocumentPostVisitCareValues({
	documentState,
}: UseDocumentPostVisitCareProps) {
	function applyPostVisitCarePreset(
		topic: PostVisitCareTopic,
		options: { force?: boolean } = {},
	) {
		const topicLabel =
			postVisitCareTopicOptions?.find((option) => option.value === topic)
				?.label ?? "выбранной темы";
		if (documentState.postVisitManualEdited && !options.force) {
			documentState.setPostVisitPresetFeedback(
				`Тема "${topicLabel}" выбрана. Текст не перезаписан, потому что есть ручные правки. Нажмите "Подставить памятку для темы", если нужно заменить поля.`,
			);
			return;
		}
		const preset = postVisitCarePresets[topic];
		documentState.setPostVisitProcedureName(preset.procedureName);
		documentState.setPostVisitAllowedAfter(preset.allowedAfter);
		documentState.setPostVisitRestrictions(preset.temporaryRestrictions);
		documentState.setPostVisitMedicationAndRinsePlan(
			preset.medicationAndRinsePlan,
		);
		documentState.setPostVisitHygieneInstructions(preset.hygieneInstructions);
		documentState.setPostVisitNutritionInstructions(
			preset.nutritionInstructions,
		);
		documentState.setPostVisitUrgentWarningSigns(preset.urgentWarningSigns);
		documentState.setPostVisitFollowUpAt(preset.plannedFollowUpAt);
		documentState.setPostVisitTelegramSummary(preset.telegramSummary);
		documentState.setPostVisitPrintedCopyReceived(false);
		documentState.setPostVisitUrgentSignsUnderstood(false);
		documentState.setPostVisitTelegramSafe(false);
		documentState.setPostVisitManualEdited(false);
		documentState.setPostVisitPresetFeedback(
			options.force
				? `Памятка для темы "${topicLabel}" подставлена, ручные правки сброшены.`
				: "",
		);
	}

	function changePostVisitCareTopic(topic: PostVisitCareTopic) {
		documentState.setPostVisitCareTopic(topic);
		applyPostVisitCarePreset(topic);
	}

	function _markPostVisitManualEdited() {
		documentState.setPostVisitManualEdited(true);
		documentState.setPostVisitPresetFeedback("");
	}

	return {
		applyPostVisitCarePreset,
		changePostVisitCareTopic,
		_markPostVisitManualEdited,
	};
}
