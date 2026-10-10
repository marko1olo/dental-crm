/**
 * planPersistenceAndSync.ts — сохранение плана по API в PostgreSQL 18,
 * автосохранение/загрузка черновика и кастомных позиций, перевод в статус
 * «Согласован» / «В работе» / «Завершён», создание наряда в ЗТЛ,
 * экспорт в кассу и списание материалов по акту.
 * Выделено из useTreatmentPlanLogic.ts строго по Мандату 8b (лимит строк <= 800).
 */

import { useEffect } from "react";
import { showToast } from "../../GlobalToast";
import { logger } from "../../../utils/logger";
import { loadPersistedCustomPlanItems } from "../ctImplantIntegrationBridge";
import { detectMutuallyExclusiveToothProcedures } from "../validation/starProtocolValidationEngine";
import {
	mergeIncomingPlanItem,
	mergePersistedPlanItems,
} from "../treatmentPlanStageMutations";
import {
	createExpressLabOrder,
	exportPlanToCashier,
	fetchPatientTreatmentPlans,
	savePlanToPostgres,
} from "../treatmentPlanNetworkSync";
import type {
	LabOrderPrefillContext,
	PlanPersistenceAndSyncContext,
	PlanPersistenceAndSyncHandlers,
	PlanPersistenceEffectsParams,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStatus,
} from "./types";

export function useTreatmentPlanPersistenceEffects({
	patientId,
	catalog,
	initialPlanId,
	autoStages,
	setCurrentPlanId,
	setPlanStatus,
	setCustomStages,
}: PlanPersistenceEffectsParams): void {
	// Load plans from PostgreSQL 18
	useEffect(() => {
		if (!patientId) return;
		let isCancelled = false;

		async function loadPatientPlans() {
			const loaded = await fetchPatientTreatmentPlans(
				patientId,
				catalog,
				initialPlanId,
			);
			if (isCancelled || !loaded) return;
			setCurrentPlanId(loaded.planId);
			setPlanStatus(loaded.status);
			if (loaded.rebuiltStages) {
				setCustomStages(loaded.rebuiltStages);
			}
		}

		loadPatientPlans();

		const handleReload = () => {
			loadPatientPlans();
		};
		window.addEventListener("dente-treatment-plans-reload", handleReload);
		return () => {
			isCancelled = true;
			window.removeEventListener("dente-treatment-plans-reload", handleReload);
		};
	}, [patientId, catalog, initialPlanId, setCurrentPlanId, setPlanStatus, setCustomStages]);

	useEffect(() => {
		const handleAddItem = (e: Event) => {
			const customEvent = e as CustomEvent<{
				item: TreatmentPlanItem;
				toothNumber?: number;
				patientId?: string;
			}>;
			if (!customEvent.detail?.item) return;
			const newItem = customEvent.detail.item;
			setCustomStages((prevStages) =>
				mergeIncomingPlanItem(prevStages ?? autoStages, newItem),
			);
		};
		window.addEventListener("dente-add-treatment-plan-item", handleAddItem);
		return () =>
			window.removeEventListener(
				"dente-add-treatment-plan-item",
				handleAddItem,
			);
	}, [autoStages, setCustomStages]);

	useEffect(() => {
		if (!patientId) return;
		const persistedItems = loadPersistedCustomPlanItems(patientId);
		if (persistedItems.length === 0) return;
		setCustomStages((prevStages) => {
			const { updatedStages, changed } = mergePersistedPlanItems(
				prevStages ?? autoStages,
				persistedItems,
			);
			return changed ? updatedStages : prevStages;
		});
	}, [patientId, autoStages, setCustomStages]);
}

export function createPlanPersistenceAndSyncHandlers(
	ctx: PlanPersistenceAndSyncContext,
): PlanPersistenceAndSyncHandlers {
	const {
		patientId,
		patientName,
		patientPhone,
		auth,
		stages,
		currentTier,
		loyaltyDeduction,
		orthopedicTeeth,
		currentPlanId,
		planStatus,
		signedAgreement,
		grandTotalRub,
		totalItemsCount,
		isSaving,
		completedActData,
		onStatusChange,
		onExportToCashier,
		onPlanSaved,
		setPlanStatus,
		setSelectedLabTeeth,
		setLabOrderPrefill,
		setIsLabOrderModalOpen,
		setIsSaving,
		setCurrentPlanId,
		setSelectedActStage,
		setIsActPrintOpen,
		setIsExecutingWriteOff,
	} = ctx;

	const handleStatusTransition = (newStatus: TreatmentPlanStatus) => {
		if (newStatus === "agreed" || newStatus === "in_progress") {
			const allItems = stages.flatMap((s) => s.items);
			const conflicts = detectMutuallyExclusiveToothProcedures(allItems);
			if (conflicts.length > 0) {
				const first = conflicts[0]!;
				showToast(
					`Внимание: обнаружен клинический конфликт на зубе №${first.toothNumber}! («${first.procedureA.name}» и «${first.procedureB.name}»). Статус изменён под клиническую ответственность врача.`,
					"warning",
					6000,
				);
			}
		}

		setPlanStatus(newStatus);
		onStatusChange?.(newStatus);
		const statusLabels: Partial<Record<TreatmentPlanStatus, string>> = {
			draft: "Черновик",
			presented: "Презентован",
			agreed: "Согласован",
			approved: "Утвержден",
			in_progress: "В работе",
			active: "Активен",
			accepted: "Принят",
			signed: "Подписан",
			completed: "Завершен",
			rejected: "Отклонен",
		};
		showToast(
			`Статус плана лечения: «${statusLabels[newStatus] || newStatus}»`,
			"success",
			3000,
		);
	};

	const handleOpenLabOrder = (
		teethOrContext?: number[] | LabOrderPrefillContext,
		maybeContext?: LabOrderPrefillContext,
	) => {
		let context: LabOrderPrefillContext = {};
		if (Array.isArray(teethOrContext)) {
			context = { ...maybeContext, selectedTeeth: teethOrContext };
		} else if (teethOrContext && typeof teethOrContext === "object") {
			context = teethOrContext;
		} else if (maybeContext) {
			context = maybeContext;
		}

		const resolvedTeeth =
			context.selectedTeeth && context.selectedTeeth.length > 0
				? [...context.selectedTeeth]
				: orthopedicTeeth;

		setSelectedLabTeeth(resolvedTeeth);
		setLabOrderPrefill({
			...context,
			selectedTeeth: resolvedTeeth,
		});
		setIsLabOrderModalOpen(true);
	};

	const handleOneClickLabOrder = async (teeth?: number[]) => {
		const targetTeeth =
			teeth && teeth.length > 0 ? teeth : orthopedicTeeth;
		await createExpressLabOrder({
			patientId,
			doctorId: auth?.currentUser?.id || null,
			targetTeeth,
			currentTierTitle: currentTier.title,
		});
	};

	const handleExportCashier = () => {
		exportPlanToCashier({
			patientId,
			patientName,
			patientPhone,
			doctorName: auth?.currentUser?.name || "Лечащий врач-стоматолог",
			stages,
			currentTier,
			loyaltyDeduction,
			onExportToCashier,
		});
	};

	const handleSavePlanToDatabase = async () => {
		if (isSaving) {
			showToast("Сохранение плана уже выполняется...", "info");
			return;
		}
		setIsSaving(true);
		try {
			const savedId = await savePlanToPostgres({
				patientId,
				currentPlanId,
				currentTier,
				planStatus,
				signedAgreement,
				stages,
				grandTotalRub,
				totalItemsCount,
				onPlanSaved,
			});
			if (savedId) {
				setCurrentPlanId(savedId);
			}
		} finally {
			setIsSaving(false);
		}
	};

	const handleExecuteWriteOffStage = (stage: TreatmentPlanStage) => {
		setSelectedActStage(stage);
		setIsActPrintOpen(true);
	};

	const handleConfirmExecuteWriteOff = async () => {
		if (!completedActData) return;
		setIsExecutingWriteOff(true);
		try {
			showToast(
				`Материалы по этапу «${completedActData.stageTitle}» на сумму ${(completedActData.totalMaterialCostRub || 0).toLocaleString("ru-RU")} ₽ успешно списаны со склада!`,
				"success",
				5000,
			);
			setIsActPrintOpen(false);
		} catch (err) {
			logger.error("[useTreatmentPlanLogic] Write-off error", err);
			showToast("Ошибка проведения списания на складе", "error");
		} finally {
			setIsExecutingWriteOff(false);
		}
	};

	return {
		handleStatusTransition,
		handleOpenLabOrder,
		handleOneClickLabOrder,
		handleExportCashier,
		handleSavePlanToDatabase,
		handleExecuteWriteOffStage,
		handleConfirmExecuteWriteOff,
	};
}
