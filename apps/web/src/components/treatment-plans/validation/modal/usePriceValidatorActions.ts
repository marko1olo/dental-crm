import { useMemo, useState } from "react";
import type {
	CatalogServiceItem,
	PlanPricePolicyPresetId,
	PriceLockResolutionPolicy,
	TreatmentPlanValidationPayload,
} from "../planPriceValidationPresets.js";
import { PLAN_PRICE_POLICY_PRESETS } from "../planPriceValidationPresets.js";
import {
	type AdminOverrideMetadata,
	generateWorkOrderExportPayload,
	validateTreatmentPlanPrices,
	type WorkOrderValidatedExport,
} from "../planPriceValidationEngine.js";
import type { StarProtocolSeverityFilter } from "../PriceValidatorStarTab.js";
import type { PriceValidatorActiveTab } from "./PriceValidatorTabBar.js";

interface UseActionsParams {
	readonly planPayload: TreatmentPlanValidationPayload;
	readonly catalogPricelist: readonly CatalogServiceItem[];
	readonly initialPresetId: PlanPricePolicyPresetId;
	readonly onExportWorkOrder?: ((data: WorkOrderValidatedExport) => void) | undefined;
	readonly onExportCompletedAct?: ((data: WorkOrderValidatedExport) => void) | undefined;
}

export function usePriceValidatorActions({
	planPayload,
	catalogPricelist,
	initialPresetId,
	onExportWorkOrder,
	onExportCompletedAct,
}: UseActionsParams) {
	const [activeTab, setActiveTab] = useState<PriceValidatorActiveTab>("prices");
	const [selectedPresetId, setSelectedPresetId] = useState<PlanPricePolicyPresetId>(initialPresetId);
	const [itemResolutions, setItemResolutions] = useState<Record<string, PriceLockResolutionPolicy>>({});
	const [adminOverride, setAdminOverride] = useState<AdminOverrideMetadata>({ isAuthorized: false });
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState(false);
	const [protocolSeverityFilter, setProtocolSeverityFilter] = useState<StarProtocolSeverityFilter>("all");
	const [adminPinInput, setAdminPinInput] = useState("");
	const [adminReasonInput, setAdminReasonInput] = useState("Согласовано сохранение цен в рамках программы лояльности");
	const [showAdminDrawer, setShowAdminDrawer] = useState(false);
	const [statusNotice, setStatusNotice] = useState<string | null>(null);

	const activePreset = PLAN_PRICE_POLICY_PRESETS[selectedPresetId];
	const report = useMemo(() => {
		return validateTreatmentPlanPrices(planPayload, catalogPricelist, activePreset, itemResolutions, {}, adminOverride);
	}, [planPayload, catalogPricelist, activePreset, itemResolutions, adminOverride]);

	const handleItemResolutionChange = (itemId: string, res: PriceLockResolutionPolicy) => {
		setItemResolutions((prev) => ({ ...prev, [itemId]: res }));
		setStatusNotice(null);
	};

	const handleBatchLockOriginal = () => {
		const res: Record<string, PriceLockResolutionPolicy> = {};
		for (const it of planPayload.items) res[it.itemId] = "LOCK_ORIGINAL_PRICE";
		setItemResolutions(res);
		setStatusNotice("Применена фиксация оригинальных цен плана ко всем позициям.");
	};

	const handleBatchUpdateToCurrent = () => {
		const res: Record<string, PriceLockResolutionPolicy> = {};
		for (const it of planPayload.items) res[it.itemId] = "UPDATE_TO_CURRENT_PRICE";
		setItemResolutions(res);
		setStatusNotice("Все позиции пересчитаны по актуальному прайс-листу клиники.");
	};

	const handleAuthorizeDoctorAutonomy = () => {
		setAdminOverride({
			isAuthorized: true,
			authorizedByAdminName: "Лечащий врач (автономия)",
			overrideReason: adminReasonInput.trim() || "Фиксация цен плана в рамках автономии врача",
			authorizedAtIso: new Date().toISOString(),
		});
		setShowAdminDrawer(false);
		setStatusNotice("Цены плана подтверждены лечащим врачом.");
	};

	const handleRevokeAdminOverride = () => {
		setAdminOverride({ isAuthorized: false });
		setAdminPinInput("");
		setStatusNotice("Авторизация согласования сброшена.");
	};

	const handleGenerateWorkOrder = () => {
		if (!planPayload.items?.length || (!planPayload.patientName?.trim() && !planPayload.patientId)) {
			setStatusNotice("Невозможно сформировать наряд ЗТЛ: проверьте позиции услуг и пациента.");
			return;
		}
		const exportData = generateWorkOrderExportPayload(report, "work_order");
		onExportWorkOrder?.(exportData);
		setIsLabOrderModalOpen(true);
		setStatusNotice(`Наряд-заказ ${exportData.orderNumber} на сумму ${exportData.totalPayableRub.toLocaleString("ru-RU")} ₽ сформирован.`);
	};

	const handleGenerateCompletedAct = () => {
		if (!planPayload.items?.length || (!planPayload.patientName?.trim() && !planPayload.patientId)) {
			setStatusNotice("Невозможно сформировать акт: проверьте позиции услуг и пациента.");
			return;
		}
		const exportData = generateWorkOrderExportPayload(report, "completed_works_act");
		onExportCompletedAct?.(exportData);
		setStatusNotice(`Акт выполненных работ ${exportData.orderNumber} готов к печати.`);
	};

	return {
		activeTab, setActiveTab, selectedPresetId, setSelectedPresetId, showAdminDrawer, setShowAdminDrawer,
		adminOverride, adminPinInput, setAdminPinInput, adminReasonInput, setAdminReasonInput, statusNotice,
		activePreset, report, isLabOrderModalOpen, setIsLabOrderModalOpen, protocolSeverityFilter, setProtocolSeverityFilter,
		handleItemResolutionChange, handleBatchLockOriginal, handleBatchUpdateToCurrent,
		handleAuthorizeDoctorAutonomy, handleRevokeAdminOverride, handleGenerateWorkOrder, handleGenerateCompletedAct,
	};
}
