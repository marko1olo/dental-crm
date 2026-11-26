import { useCallback, useEffect, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { showToast } from "../GlobalToast";
import {
	LOWER_JAW_PRESETS,
	OCCLUSION_PRESETS,
	UPPER_JAW_PRESETS,
} from "./jawOcclusionPresets";
import {
	JAW_CODE_TO_NUMBER,
	type JawFindingPreset,
	type JawOcclusionModalProps,
	type JawOrOcclusionTarget,
	resolveJawTargetLabels,
} from "./jawOcclusionTypes";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useJawOcclusionModalLogic(
	isOpen: boolean,
	initialTarget: JawOrOcclusionTarget = "JU",
	onClose: () => void,
	onApply?: JawOcclusionModalProps["onApply"],
	patientId?: string | undefined,
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
							targetNumber: JAW_CODE_TO_NUMBER[activeTab],
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

			if (patientId && UUID_PATTERN.test(patientId) && typeof fetch === "function") {
				const jawNumber = JAW_CODE_TO_NUMBER[activeTab];
				void fetch("/api/odontogram/status", {
					method: "POST",
					headers: {
						...getDenteAuthHeaders({ "Content-Type": "application/json" }),
						"Idempotency-Key": generateUuidV7(),
					},
					body: JSON.stringify({
						patientId,
						toothNumber: jawNumber,
						state: "Healthy",
						notes: fullSoap,
						reason: `Челюстной статус (${activeTab}): ${preset.titleRu}`,
						clinicalData: {
							toothNumber: jawNumber,
							jawCode: activeTab,
							presetId: preset.id,
							titleRu: preset.titleRu,
							mkb10Code: preset.mkb10Code ?? null,
							isNorm: Boolean(preset.isNorm),
							recommendedPlanRu: preset.recommendedPlanRu ?? null,
							notes: fullSoap,
						},
					}),
				})
					.then(async (res) => {
						if (!res.ok) {
							const errJson = (await res.json().catch(() => null)) as {
								data?: { message?: string };
								message?: string;
							} | null;
							const errBody = errJson?.data ?? errJson;
							showToast(
								errBody?.message || "Не удалось сохранить челюстной статус в карту пациента",
								"error",
							);
						}
					})
					.catch(() => {
						showToast("Ошибка сети при сохранении челюстного статуса", "error");
					});
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
		[activeTab, customComment, onApply, onClose, patientId, targetShortTitle],
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
