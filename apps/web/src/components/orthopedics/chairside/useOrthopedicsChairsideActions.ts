import { useCallback, useRef } from "react";
import { rublesToKopecks } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { clientLogger } from "../../../services/logging/clientLogger";
import {
	applyOrthopedicProtocolToVisit,
	type OrthopedicProtocolPreset, type FormatOrthopedicProtocolOptions,
} from "../orthopedicProtocols";
import type { StandardZtlPreset } from "../orthopedicCatalogData";
import { STANDARD_ZTL_ORDER_PRESETS } from "../orthopedicCatalogData";
import type { CanonicalManufacturing5StageItem } from "../../lab/labMath";
import { calculateDueDateStr, type OrthopedicsChairsidePanelProps } from "./orthopedicsChairsideTypes";
import type { OrthopedicsChairsideState } from "./useOrthopedicsChairsideState";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { PARTNER_LABS } from "../../lab/dentalLabCatalogData";

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

	const handleSelectStage = useCallback(async (stage: CanonicalManufacturing5StageItem) => {
		state.setSelectedStageId(stage.id);
		showToast(`Этап ЗТЛ: ${stage.shortLabelRu} (${stage.descRu})`, "info", 2000);
		if (state.activeOrderId) {
			try {
				const res = await fetch(`/api/lab/orders/${state.activeOrderId}`, {
					method: "PATCH",
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": crypto.randomUUID(),
					}),
					body: JSON.stringify({ stage: stage.id, techStage: stage.shortLabelRu }),
				});
				if (!res.ok) {
					clientLogger.warn("Failed to update lab order stage on server", { status: res.status }, { module: "useOrthopedicsChairsideActions" });
					showToast(`Не удалось обновить этап на сервере (${res.status})`, "error", 3000);
				}
			} catch (err) {
				clientLogger.warn("Network error updating lab order stage", err, { module: "useOrthopedicsChairsideActions" });
				showToast("Сетевая ошибка при обновлении этапа ЗТЛ", "error", 3000);
			}
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
		state.setIsLabOrderSending(true);
		const defaultLabName = PARTNER_LABS.find((l) => l.isDefault)?.name ?? PARTNER_LABS[0]?.name ?? "Арт-Дент Лаб (CAD/CAM центр)";
		const laboratoryName = props.initialLabOrder?.laboratoryName?.trim()
			|| (typeof window !== "undefined" && window.localStorage?.getItem("dente_default_lab_name")?.trim())
			|| defaultLabName;
		const labOrderPayload = {
			orderNumber: props.initialLabOrder?.orderNumber || undefined,
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
			attachedImageUrl: state.activeXrayUrl ?? undefined,
			attachedXrayUrl: state.activeXrayUrl ?? undefined,
			laboratoryName,
			dueDate: state.dueDate,
			patientId: props.patientId || undefined,
			patientName: props.patientName || undefined,
			priceRub: state.isWarrantyRework ? 0 : state.grossPriceRub,
			priceKopecks: state.isWarrantyRework ? 0 : rublesToKopecks(state.grossPriceRub),
			patientPriceKopecks: state.isWarrantyRework ? 0 : rublesToKopecks(state.grossPriceRub),
			amountKopecks: state.isWarrantyRework ? 0 : rublesToKopecks(state.grossPriceRub),
			costRub: state.isWarrantyRework && state.warrantyLiabilityType === "lab_defect" ? 0 : state.ztlCostRub,
			labCostKopecks: state.isWarrantyRework && state.warrantyLiabilityType === "lab_defect" ? 0 : rublesToKopecks(state.ztlCostRub),
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
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": crypto.randomUUID(),
				}),
				body: JSON.stringify(labOrderPayload),
			});
			if (res.ok) {
				const json = await res.json().catch(() => null);
				const payload = json?.data ?? json;
				const serverOrderId = payload?.id;
				const serverOrderNumber = payload?.orderNumber
					|| (serverOrderId ? `ЗТЛ-${String(serverOrderId).slice(0, 6).toUpperCase()}` : "ЗТЛ");
				if (serverOrderId) state.setActiveOrderId(serverOrderId);
				state.setLabOrderSentNumber(serverOrderNumber);
				showToast(`Наряд ${serverOrderNumber} в ЗТЛ успешно отправлен!`, "success", 3000);
			} else {
				showToast(`Ошибка отправки наряда на сервере (${res.status})`, "error", 4000);
			}
		} catch (err) {
			clientLogger.error("Failed to send lab order", err, { module: "useOrthopedicsChairsideActions" });
			showToast("Сетевая ошибка при отправке наряда ЗТЛ", "error", 4000);
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
