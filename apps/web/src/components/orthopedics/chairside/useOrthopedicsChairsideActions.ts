import { useCallback, useRef } from "react";
import { showToast } from "../../GlobalToast";
import {
	applyOrthopedicProtocolToVisit,
	type OrthopedicProtocolPreset, type FormatOrthopedicProtocolOptions,
} from "../orthopedicProtocols";
import type { StandardZtlPreset } from "../orthopedicCatalogData";
import { STANDARD_ZTL_ORDER_PRESETS } from "../orthopedicCatalogData";
import type { CanonicalManufacturing5StageItem } from "../../lab/labMath";
import { calculateDueDateStr, type OrthopedicsChairsidePanelProps } from "./orthopedicsChairsideTypes";
import type { OrthopedicsChairsideState } from "./useOrthopedicsChairsideState";

export function useOrthopedicsChairsideActions(
	state: OrthopedicsChairsideState,
	props: OrthopedicsChairsidePanelProps,
) {
	const inFlightRef = useRef(false);

	const handleSelectZtlPreset = useCallback((preset: StandardZtlPreset) => {
		state.setActiveZtlPresetId(preset.id);
		state.setSelectedMaterial(preset.material);
		if (preset.fixationType) state.setFixationType(preset.fixationType);
		if (preset.hasAntagonists !== undefined) state.setHasAntagonists(preset.hasAntagonists);
		state.setDueDate(calculateDueDateStr(preset.turnaroundBusinessDays ?? 5));
		showToast(`Выбран стандарт ЗТЛ: ${preset.name} (${preset.badge})`, "info", 2000);
	}, [state]);

	const handleSelectStage = useCallback((stage: CanonicalManufacturing5StageItem) => {
		state.setSelectedStageId(stage.id);
		showToast(`Этап ЗТЛ: ${stage.shortLabelRu} (${stage.descRu})`, "info", 2000);
		if (state.activeOrderId) {
			fetch(`/api/lab/orders/${state.activeOrderId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ stage: stage.id, techStage: stage.shortLabelRu }),
			})
				.then((res) => {
					if (!res.ok) console.warn("Failed to update lab order stage on server", res.status);
				})
				.catch((err) => {
					console.warn("Network error updating lab order stage", err);
				});
		}
	}, [state]);

	const handleImmediateSendToLab = useCallback(async () => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		const teethParts = state.activeTeethInput.split(/[\s,;-]+/).map((p: string) => p.trim()).filter(Boolean);
		const preset = STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === state.activeZtlPresetId) ?? STANDARD_ZTL_ORDER_PRESETS[0];
		if (!preset) {
			inFlightRef.current = false;
			return;
		}
		const orderNumber = `ЗТЛ-${Date.now().toString().slice(-6)}`;
		state.setIsLabOrderSending(true);
		const labOrderPayload = {
			orderNumber,
			createdAt: new Date().toISOString(),
			teeth: teethParts.length > 0 ? teethParts : [],
			teethFdi: teethParts.length > 0 ? teethParts.join(", ") : undefined,
			jawScope: state.jawScope !== "none" ? state.jawScope : "upper",
			construction: preset.constructionType,
			constructionType: preset.constructionType,
			material: state.selectedMaterial,
			colorVita: state.selectedShade,
			stumpShade: state.selectedStumpShade,
			preparationMargin: state.preparationMargin,
			fixationType: state.fixationType,
			hasAntagonists: state.hasAntagonists,
			articulatorType: state.articulatorType,
			hasFacebow: state.hasFacebow,
			attachedXrayUrl: state.activeXrayUrl ?? undefined,
			laboratoryName: "Основная лаборатория",
			dueDate: state.dueDate,
			patientId: props.patientId || undefined,
			priceRub: state.isWarrantyRework ? 0 : state.grossPriceRub,
			costRub: state.isWarrantyRework && state.warrantyLiabilityType === "lab_defect" ? 0 : state.ztlCostRub,
			isWarrantyRework: state.isWarrantyRework,
			isWarranty: state.isWarrantyRework,
			warrantyLiabilityType: state.isWarrantyRework ? state.warrantyLiabilityType : undefined,
		};
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: labOrderPayload }));
		}
		try {
			const res = await fetch("/api/lab/orders", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(labOrderPayload),
			});
			if (res.ok) {
				const json = await res.json().catch(() => null);
				if (json?.id) state.setActiveOrderId(json.id);
				state.setLabOrderSentNumber(orderNumber);
				showToast(`Наряд ${orderNumber} в ЗТЛ успешно отправлен!`, "success", 3000);
			} else {
				showToast(`Ошибка отправки наряда ${orderNumber} на сервере`, "error", 4000);
			}
		} catch (err) {
			console.error("Failed to send lab order:", err);
			showToast(`Сетевая ошибка при отправке наряда ${orderNumber}`, "error", 4000);
		} finally {
			inFlightRef.current = false;
			state.setIsLabOrderSending(false);
		}
	}, [state, props]);

	const handleApplyProtocol = useCallback((protocol: OrthopedicProtocolPreset) => {
		const teethParts = state.activeTeethInput.split(/[\s,;-]+/).map((p: string) => p.trim()).filter(Boolean);
		const options: FormatOrthopedicProtocolOptions = {
			teethFdi: teethParts.length > 0 ? teethParts : undefined,
			toothFdi: teethParts.length === 1 ? teethParts[0] : undefined,
			jawScope: state.jawScope !== "none" ? state.jawScope : undefined,
			material: state.selectedMaterial,
			colorVita: state.selectedShade,
			labOrderId: props.initialLabOrder?.id ?? state.activeOrderId ?? undefined,
		};
		const result = applyOrthopedicProtocolToVisit({ protocol, options, copyToClipboard: true, showNotification: true });
		if (result.services && props.onAddToInvoice) props.onAddToInvoice(result.services);
		state.setAppliedProtocolId(protocol.id);
	}, [state, props]);

	return { handleSelectZtlPreset, handleSelectStage, handleImmediateSendToLab, handleApplyProtocol };
}
