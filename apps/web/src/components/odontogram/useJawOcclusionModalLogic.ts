import { useCallback, useEffect, useState } from "react";
import { showToast } from "../GlobalToast";
import {
	LOWER_JAW_PRESETS,
	OCCLUSION_PRESETS,
	UPPER_JAW_PRESETS,
} from "./jawOcclusionPresets";
import {
	type JawFindingPreset,
	type JawOcclusionModalProps,
	type JawOrOcclusionTarget,
	resolveJawTargetLabels,
} from "./jawOcclusionTypes";

export function useJawOcclusionModalLogic(
	isOpen: boolean,
	initialTarget: JawOrOcclusionTarget = "JU",
	onClose: () => void,
	onApply?: JawOcclusionModalProps["onApply"],
) {
	const [activeTab, setActiveTab] =
		useState<JawOrOcclusionTarget>(initialTarget);
	const [selectedPresetId, setSelectedPresetId] = useState<string>("");
	const [customComment, setCustomComment] = useState<string>("");

	useEffect(() => {
		if (isOpen) {
			setActiveTab(initialTarget);
			setSelectedPresetId("");
			setCustomComment("");
		}
	}, [isOpen, initialTarget]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	const currentPresets =
		activeTab === "JU"
			? UPPER_JAW_PRESETS
			: activeTab === "JL"
				? LOWER_JAW_PRESETS
				: OCCLUSION_PRESETS;
	const { targetLabelRu, targetShortTitle } =
		resolveJawTargetLabels(activeTab);
	const selectedPreset = currentPresets.find((p) => p.id === selectedPresetId);

	const handleApplyPreset = useCallback(
		(preset: JawFindingPreset) => {
			const fullSoap = customComment.trim()
				? `${preset.soapStatusLocalis} Примечание: ${customComment.trim()}.`
				: preset.soapStatusLocalis;
			try {
				window.dispatchEvent(
					new CustomEvent("dente-apply-soap-protocol", {
						detail: {
							targetCode: activeTab,
							targetNameRu: targetShortTitle,
							title: preset.titleRu,
							soap: {
								statusLocalis: fullSoap,
								diagnosis: preset.titleRu,
								recommendations: preset.recommendedPlanRu || undefined,
							},
							mode: "smart_append",
							immediate: true,
						},
					}),
				);
			} catch {
				/* Fallback */
			}

			onApply?.({
				code: activeTab,
				nameRu: targetShortTitle,
				titleRu: preset.titleRu,
				soapText: fullSoap,
				...(preset.mkb10Code ? { mkb10Code: preset.mkb10Code } : {}),
			});

			showToast(
				`Зафиксировано: ${targetShortTitle} — ${preset.titleRu}`,
				preset.isNorm ? "success" : "info",
			);
			onClose();
		},
		[activeTab, customComment, onApply, onClose, targetShortTitle],
	);

	const handle1ClickNorm = useCallback(() => {
		const normPreset =
			currentPresets.find((p) => p.isNorm) ?? currentPresets[0];
		if (normPreset) handleApplyPreset(normPreset);
	}, [currentPresets, handleApplyPreset]);

	return {
		activeTab,
		setActiveTab,
		selectedPresetId,
		setSelectedPresetId,
		customComment,
		setCustomComment,
		currentPresets,
		targetLabelRu,
		selectedPreset,
		handleApplyPreset,
		handle1ClickNorm,
	};
}
