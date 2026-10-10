/**
 * planStageMutationHandlers.ts — обработчики добавления/удаления этапов и процедур 804н,
 * перемещения между этапами, назначения врачей, применения клинических пакетов,
 * AI Copilot и генерации шаблонов из одонтограммы/КЛКТ.
 * Выделено из useTreatmentPlanLogic.ts строго по Мандату 8b (лимит строк <= 800).
 */

import {
	applyCopilotCommandToPlan,
	type CopilotCommandType,
} from "../../../services/ai/treatmentPlanCopilot";
import { StaffActionAuditService } from "../../../services/audit/staffActionAuditService";
import { logger } from "../../../utils/logger";
import { showRollbackToast, showToast } from "../../GlobalToast";
import {
	extractCbctFindingsFromOdontogramAndStorage,
	generateCbctAutoPlanScenarios,
} from "../ctImplantIntegrationBridge";
import {
	applyClinicalBundleToStages,
	type ClinicalBundleDefinition,
	type ClinicalBundleId,
	createBundlePlanItems,
	getClinicalBundleById,
} from "../treatmentPlanBundlesEngine";
import { dispatchStageStartEvents } from "../treatmentPlanNetworkSync";
import {
	addItemToPlanStages,
	assignDoctorToItemInStages,
	assignDoctorToStageInStages,
	createNewStageInPlan,
	removeItemFromStages,
	updateItemInStages,
	updateItemPriceInStages,
	updateItemQuantityInStages,
} from "../treatmentPlanStageMutations";
import type {
	CashierInvoiceExportData,
	PlanStageMutationContext,
	PlanStageMutationHandlers,
	TreatmentPlanCreateStagePresetKind,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStageStatus,
} from "./types";

export function createPlanStageMutationHandlers(
	ctx: PlanStageMutationContext,
): PlanStageMutationHandlers {
	const {
		patientId,
		patientName,
		effectiveTeethData,
		catalog,
		discountPercent,
		stages,
		currentPlanId,
		onExportToCashier,
		setCbctAutoPlanTiers,
		setSelectedTierId,
		setCustomStages,
		setActiveViewTab,
		setIsCopilotExecuting,
		setCopilotFeedback,
		setIsChairsideBundlesModalOpen,
		setDiscountPercent,
	} = ctx;

	const handleGenerateCbctAutoPlan = () => {
		try {
			const findings = extractCbctFindingsFromOdontogramAndStorage(
				patientId,
				effectiveTeethData,
			);
			const generatedTiers = generateCbctAutoPlanScenarios(
				findings,
				catalog,
				discountPercent,
			);
			setCbctAutoPlanTiers(generatedTiers);
			setSelectedTierId("standard");
			setCustomStages([...generatedTiers[1].stages]);
			setActiveViewTab("3tier");
			showToast(
				`Автоплан по КЛКТ сформирован: 3 сценария (Эконом: ${generatedTiers[0].totalRub.toLocaleString("ru-RU")} ₽, Оптимум: ${generatedTiers[1].totalRub.toLocaleString("ru-RU")} ₽, Премиум: ${generatedTiers[2].totalRub.toLocaleString("ru-RU")} ₽) на 4 клинических этапа`,
				"success",
				5000,
			);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-cbct-autoplan-generated", {
						detail: { patientId, tiers: generatedTiers, findings },
					}),
				);
			}
		} catch (err: unknown) {
			logger.error(
				"[useTreatmentPlanLogic] Error generating CBCT auto plan",
				err,
			);
			showToast("Не удалось сформировать автоплан по КЛКТ", "error");
		}
	};

	const handleUpdateItemQuantity = (itemId: string, newQty: number) => {
		setCustomStages(
			updateItemQuantityInStages(stages, itemId, newQty, discountPercent),
		);
	};

	const handleUpdateItemPrice = (itemId: string, newPriceRub: number) => {
		setCustomStages(
			updateItemPriceInStages(stages, itemId, newPriceRub, discountPercent),
		);
		showToast(
			`Цена услуги обновлена: ${newPriceRub.toLocaleString("ru-RU")} ₽`,
			"success",
		);
	};

	const handleUpdateItem = (updatedItem: TreatmentPlanItem) => {
		setCustomStages(updateItemInStages(stages, updatedItem, discountPercent));
		showToast(`Процедура «${updatedItem.name}» обновлена`, "success");
	};

	const handleRemoveItem = (itemId: string) => {
		const targetItem = stages
			.flatMap((s) => s.items)
			.find((it) => it.id === itemId);
		const prevStages = stages;
		setCustomStages(removeItemFromStages(stages, itemId));
		if (targetItem) {
			StaffActionAuditService.logServiceRemove({
				patientId,
				planId: currentPlanId || "default_plan",
				serviceCode: targetItem.code804n,
				serviceName: targetItem.name,
				amountKopecks: Math.round((targetItem.priceRub || 0) * 100),
			});
		}
		const itemName = targetItem ? `«${targetItem.name}»` : "Процедура";
		showRollbackToast(
			`${itemName} удалена из плана лечения`,
			() => {
				setCustomStages(prevStages);
			},
			5000,
		);
	};

	const handleAssignDoctorToStage = (
		stage: TreatmentPlanStage,
		doctorId: string | null,
		doctorName: string | null,
		doctorSpecialty: string | null,
	) => {
		setCustomStages(
			assignDoctorToStageInStages(
				stages,
				stage.stageNumber,
				doctorId,
				doctorName,
				doctorSpecialty,
			),
		);
		if (doctorName) {
			showToast(
				`Врач ${doctorName} назначен на этап ${stage.stageNumber}`,
				"success",
			);
		} else {
			showToast(`Назначение врача с этапа ${stage.stageNumber} снято`, "info");
		}
	};

	const handleAssignDoctorToItem = (
		itemId: string,
		doctorId: string | null,
		doctorName: string | null,
		doctorSpecialty: string | null,
	) => {
		setCustomStages(
			assignDoctorToItemInStages(
				stages,
				itemId,
				doctorId,
				doctorName,
				doctorSpecialty,
			),
		);
		if (doctorName) {
			showToast(`Врач ${doctorName} назначен на процедуру`, "success");
		} else {
			showToast("Назначение врача на процедуру снято", "info");
		}
	};

	const handleExecuteCopilot = (cmdOrText: CopilotCommandType | string) => {
		setIsCopilotExecuting(true);
		try {
			const res = applyCopilotCommandToPlan(stages, cmdOrText);
			if (res.success) {
				setCustomStages([...res.stages]);
				setCopilotFeedback(res.explanation);
				showToast(`AI Copilot: ${res.commandTitle} применено`, "success");
			}
		} finally {
			setIsCopilotExecuting(false);
		}
	};

	const handleApplyClinicalBundle = (
		bundleId: ClinicalBundleId,
		toothNumber?: number,
	) => {
		const bundle = getClinicalBundleById(bundleId);
		const updated = applyClinicalBundleToStages(stages, bundleId, toothNumber);
		setCustomStages(updated);
		const toothDesc = bundle?.requiresTooth
			? ` (зуб ${toothNumber ?? bundle?.defaultTooth})`
			: "";
		showToast(
			`Пакет «${bundle?.shortTitle || bundleId}» успешно добавлен в план${toothDesc}!`,
			"success",
			4000,
		);
	};

	const handleApplyChairsideBundlePlan = (
		items: TreatmentPlanItem[],
		bundle: ClinicalBundleDefinition,
	) => {
		const targetStageExists = stages.some(
			(st) =>
				st.stageKind === bundle.stageKind ||
				st.stageNumber === bundle.stageNumber,
		);
		let updated: TreatmentPlanStage[];
		if (!targetStageExists) {
			const stageTitles: Record<
				1 | 2 | 3,
				{ title: string; subtitle: string; goal: string }
			> = {
				1: {
					title: "Этап 1: Неотложная помощь и терапевтическая санация",
					subtitle: "Санация",
					goal: "Санация полости рта",
				},
				2: {
					title: "Этап 2: Хирургический этап и дентальная имплантация",
					subtitle: "Хирургия",
					goal: "Хирургическая санация",
				},
				3: {
					title: "Этап 3: Ортопедический этап и протезирование",
					subtitle: "Ортопедия",
					goal: "Ортопедическое восстановление",
				},
			};
			const meta = stageTitles[bundle.stageNumber];
			const stageTotalRub = items.reduce((acc, it) => acc + it.priceRub, 0);
			const newStage: TreatmentPlanStage = {
				stageNumber: bundle.stageNumber,
				stageKind: bundle.stageKind,
				title: meta.title,
				subtitle: meta.subtitle,
				clinicalGoal: meta.goal,
				items,
				totalRub: stageTotalRub,
				totalKopecks: Math.round(stageTotalRub * 100) as any,
				estimatedVisits: Math.max(1, Math.ceil(items.length / 2)),
				estimatedWeeks: 2,
				order804nCodes: items.map((it) => it.code804n),
			};
			updated = [...stages, newStage].sort(
				(a, b) => a.stageNumber - b.stageNumber,
			);
		} else {
			updated = stages.map((st) => {
				if (
					st.stageKind !== bundle.stageKind &&
					st.stageNumber !== bundle.stageNumber
				) {
					return st;
				}
				const updatedItems = [...st.items, ...items];
				const totalRub = updatedItems.reduce((acc, it) => acc + it.priceRub, 0);
				return {
					...st,
					items: updatedItems,
					totalRub,
					totalKopecks: Math.round(totalRub * 100) as any,
					order804nCodes: Array.from(
						new Set([...st.order804nCodes, ...items.map((it) => it.code804n)]),
					),
				};
			});
		}
		setCustomStages(updated);
		setIsChairsideBundlesModalOpen(false);
	};

	const handleApplyChairsideBundleInvoice = (
		_invoiceItems: unknown[],
		bundle: ClinicalBundleDefinition,
		toothNumber?: number,
	) => {
		if (onExportToCashier) {
			const planItems = createBundlePlanItems(bundle.id, { toothNumber });
			const grossRub = planItems.reduce((acc, it) => acc + it.priceRub, 0);
			const exportData: CashierInvoiceExportData = {
				patientId,
				patientName,
				invoiceId: `inv-chairside-${bundle.id}-${Date.now()}`,
				invoiceNumber: `ПАКЕТ-${Date.now().toString().slice(-6)}`,
				items: planItems,
				grossTotalRub: grossRub,
				discountRub: 0,
				bonusPointsUsedRub: 0,
				bonusPointsUsedKopecks: 0 as any,
				netTotalRub: grossRub,
				netTotalKopecks: Math.round(grossRub * 100) as any,
				notes: `Клинический пакет «${bundle.shortTitle}» у кресла`,
				createdAtIso: new Date().toISOString(),
			};
			onExportToCashier(exportData);
		}
		setIsChairsideBundlesModalOpen(false);
	};

	const handleAddItemToStage = (
		targetStageNumber: number,
		newItemData: Partial<TreatmentPlanItem>,
	) => {
		const nextStages = addItemToPlanStages(
			stages,
			targetStageNumber,
			newItemData,
		);
		setCustomStages(nextStages);
		StaffActionAuditService.logServiceAdd({
			patientId,
			planId: currentPlanId || "default_plan",
			serviceCode: newItemData.code804n || "804n_service",
			serviceName: newItemData.name || "Услуга",
			amountKopecks: newItemData.priceRub
				? Math.round(newItemData.priceRub * 100)
				: 0,
			...(newItemData.toothNumber
				? { toothNumber: newItemData.toothNumber }
				: {}),
		});
		showToast(
			`Услуга «${newItemData.name || "Услуга"}» добавлена в этап №${targetStageNumber}`,
			"success",
		);
	};

	const handleApplyDiscount = (newDiscountPercent: number, reason?: string) => {
		const oldDiscount = discountPercent;
		setDiscountPercent(newDiscountPercent);
		if (oldDiscount !== newDiscountPercent) {
			StaffActionAuditService.logDiscountApply({
				patientId,
				planId: currentPlanId,
				discountPercent: newDiscountPercent,
				reason:
					reason ??
					`План лечения: изменение скидки с ${oldDiscount}% на ${newDiscountPercent}%`,
			});
		}
	};

	const handleCreateNewStage = (
		presetKind: TreatmentPlanCreateStagePresetKind,
		customTitle?: string,
	) => {
		const { nextStages, createdTitle } = createNewStageInPlan(
			stages,
			presetKind,
			customTitle,
		);
		setCustomStages(nextStages);
		showToast(`Создан новый этап: «${createdTitle}»`, "success");
	};

	const handleDeleteStage = (stageToDelete: TreatmentPlanStage) => {
		const updated = stages.filter(
			(s) => s.stageNumber !== stageToDelete.stageNumber,
		);
		setCustomStages(updated);
		showToast(`Этап №${stageToDelete.stageNumber} удален из плана`, "info");
	};

	const handleStartStage = (stageToStart: TreatmentPlanStage) => {
		const updated = stages.map((s) =>
			s.stageNumber === stageToStart.stageNumber
				? { ...s, status: "in_progress" as const }
				: s,
		);
		setCustomStages(updated);
		showToast(
			`Этап №${stageToStart.stageNumber} («${stageToStart.title}») активирован и передан в работу визита (${stageToStart.items.length} услуг)`,
			"success",
			4000,
		);
		dispatchStageStartEvents(patientId, patientName, stageToStart);
	};

	const handleChangeStageStatus = (
		stageToChange: TreatmentPlanStage,
		newStatus: TreatmentPlanStageStatus,
	) => {
		const updated = stages.map((s) =>
			s.stageNumber === stageToChange.stageNumber
				? { ...s, status: newStatus }
				: s,
		);
		setCustomStages(updated);
		showToast(
			`Статус этапа №${stageToChange.stageNumber} изменен на «${newStatus}»`,
			"info",
		);
	};

	return {
		handleGenerateCbctAutoPlan,
		handleUpdateItemQuantity,
		handleUpdateItemPrice,
		handleUpdateItem,
		handleRemoveItem,
		handleAssignDoctorToStage,
		handleAssignDoctorToItem,
		handleExecuteCopilot,
		handleApplyClinicalBundle,
		handleApplyChairsideBundlePlan,
		handleApplyChairsideBundleInvoice,
		handleAddItemToStage,
		handleApplyDiscount,
		handleCreateNewStage,
		handleDeleteStage,
		handleStartStage,
		handleChangeStageStatus,
	};
}
