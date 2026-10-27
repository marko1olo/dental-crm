import { useRef } from "react";
import { showToast } from "../../../GlobalToast.js";
import { logger } from "../../../../utils/logger.js";
import { savePlanToPostgres } from "../../treatmentPlanNetworkSync.js";
import type { PlanPersistenceAndSyncContext, TreatmentPlanStage, TreatmentPlanStatus } from "../types.js";

export function createPlanDatabaseAndWriteOffHandlers(ctx: PlanPersistenceAndSyncContext) {
	const {
		patientId, stages, currentTier, currentPlanId, planStatus, signedAgreement,
		grandTotalRub, totalItemsCount, isSaving, completedActData, onStatusChange,
		onPlanSaved, setPlanStatus, setIsSaving, setCurrentPlanId, setSelectedActStage,
		setIsActPrintOpen, setIsExecutingWriteOff,
	} = ctx;

	const saveInFlightRef = useRef(false);

	const handleStatusTransition = (newStatus: TreatmentPlanStatus) => {
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
		showToast(`Статус плана лечения: «${statusLabels[newStatus] || newStatus}»`, "success", 3000);
	};

	const handleSavePlanToDatabase = async () => {
		if (isSaving || saveInFlightRef.current) {
			showToast("Сохранение плана уже выполняется...", "info");
			return;
		}
		saveInFlightRef.current = true;
		setIsSaving(true);
		try {
			const savedId = await savePlanToPostgres({
				patientId, currentPlanId, currentTier, planStatus,
				signedAgreement, stages, grandTotalRub, totalItemsCount, onPlanSaved,
			});
			if (savedId) setCurrentPlanId(savedId);
		} finally {
			setIsSaving(false);
			setTimeout(() => { saveInFlightRef.current = false; }, 350);
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
			const itemsToWriteOff = (completedActData.writtenOffMaterials || []).map((c) => ({
				itemId: c.inventoryItemId || c.id,
				quantity: c.quantityRequired || 1,
				notes: `Списание по плану лечения: этап «${completedActData.stageTitle}»`,
			}));

			if (itemsToWriteOff.length > 0) {
				try {
					await fetch("/api/inventory/deduct", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							items: itemsToWriteOff,
							reason: `Списание материалов этапа: ${completedActData.stageTitle}`,
						}),
					});
				} catch (networkErr) {
					logger.warn("[useTreatmentPlanLogic] Failed to sync write-off with backend inventory", networkErr);
				}
			}

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
		handleSavePlanToDatabase,
		handleExecuteWriteOffStage,
		handleConfirmExecuteWriteOff,
	};
}
