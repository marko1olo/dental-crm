import { useCallback } from "react";
import { showToast } from "../../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import {
	applyOrthopedicProtocolToVisit, createDoctorClinicalOverride,
	type OrthopedicProtocolPreset, type FormatOrthopedicProtocolOptions,
} from "../orthopedicProtocols.js";
import type { StandardZtlPreset } from "../orthopedicsPresets.js";
import { STANDARD_ZTL_ORDER_PRESETS, PREPARATION_MARGIN_PRESETS, FIXATION_TYPE_PRESETS } from "../orthopedicsPresets.js";
import { CANONICAL_MANUFACTURING_5_STAGES, type CanonicalManufacturing5StageItem } from "../../lab/labMath.js";
import { calculateDueDateStr } from "./orthopedicsChairsideTypes.js";

export function useOrthopedicsChairsideActions(state: any, props: any) {
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
				headers: { "Content-Type": "application/json", ...denteAdminSecretRequestHeaders() },
				body: JSON.stringify({ stage: stage.id, techStage: stage.shortLabelRu }),
			}).catch(() => {});
		}
	}, [state]);

	const handleImmediateSendToLab = useCallback(async () => {
		const teethParts = state.activeTeethInput.split(/[\s,;-]+/).map((p: string) => p.trim()).filter(Boolean);
		const preset = STANDARD_ZTL_ORDER_PRESETS.find((p) => p.id === state.activeZtlPresetId) ?? STANDARD_ZTL_ORDER_PRESETS[0];
		if (!preset) return;
		const orderNumber = `ЗТЛ-${Date.now().toString().slice(-6)}`;
		state.setIsLabOrderSending(true);
		const labOrderPayload = {
			orderNumber, createdAt: new Date().toISOString(),
			teeth: teethParts.length > 0 ? teethParts : ["16"],
			teethFdi: teethParts.length > 0 ? teethParts.join(", ") : "16",
			jawScope: state.jawScope !== "none" ? state.jawScope : "upper",
			construction: preset.constructionType, constructionType: preset.constructionType,
			material: state.selectedMaterial, colorVita: state.selectedShade, stumpShade: state.selectedStumpShade,
			laboratoryName: "Основная лаборатория",
			dueDate: state.dueDate, patientId: props.patientId || undefined,
			priceRub: state.isWarrantyRework ? 0 : state.grossPriceRub,
			costRub: state.isWarrantyRework ? 0 : state.ztlCostRub,
		};
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente-lab-order-created", { detail: labOrderPayload }));
		}
		try {
			const res = await fetch("/api/lab/orders", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(labOrderPayload),
			});
			if (res.ok) {
				const json = await res.json().catch(() => null);
				if (json?.id) state.setActiveOrderId(json.id);
			}
		} catch {} finally {
			state.setIsLabOrderSending(false);
			state.setLabOrderSentNumber(orderNumber);
			showToast(`Наряд ${orderNumber} в ЗТЛ успешно отправлен!`, "success", 3000);
		}
	}, [state, props]);

	const handleApplyProtocol = useCallback((protocol: OrthopedicProtocolPreset) => {
		if (props.isLocked && !state.overrideActive) {
			showToast("Клинический протокол заблокирован (активируйте оверрайд врача)", "warning");
			return;
		}
		const teethParts = state.activeTeethInput.split(/[\s,;-]+/).map((p: string) => p.trim()).filter(Boolean);
		const options: FormatOrthopedicProtocolOptions = {
			teethFdi: teethParts.length > 0 ? teethParts : undefined,
			toothFdi: teethParts.length === 1 ? teethParts[0] : undefined,
			jawScope: state.jawScope !== "none" ? state.jawScope : undefined,
			material: state.selectedMaterial, colorVita: state.selectedShade,
			labOrderId: props.initialLabOrder?.id ?? state.activeOrderId ?? undefined,
		};
		const result = applyOrthopedicProtocolToVisit({ protocol, options, copyToClipboard: true, showNotification: true });
		if (result.servicesToAdd && props.onAddToInvoice) props.onAddToInvoice(result.servicesToAdd);
		state.setAppliedProtocolId(protocol.id);
	}, [state, props]);

	return { handleSelectZtlPreset, handleSelectStage, handleImmediateSendToLab, handleApplyProtocol };
}
