/**
 * useTreatmentPlanPresenterState.ts — Хук управления состоянием и расчетами студии презентации планов лечения
 * Врачебные инструменты: 3-Tier альтернативы, скидка врача, пакеты, ИИ-аудит, копирование сметы.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import {
	type Kopecks,
	parseKopecks,
	sumKopecks,
	type TreatmentPlanValidateAndCommentResponse,
} from "@dental/shared";
import {
	formatWarrantyYearsText,
	type TreatmentPlanStage,
	type TreatmentPlanTier,
	type TreatmentPlanTierId,
} from "../types";
import type { ToothData } from "../../odontogram/ToothChart";
import { generate3TierPlanComparison } from "../treatmentPlanStagesEngine";
import {
	applyCopilotCommandToPlan,
	type CopilotCommandType,
	requestTreatmentPlanAiValidationAndComment,
} from "../../../services/ai/treatmentPlanCopilot";
import {
	applyClinicalBundleToTier,
	getClinicalBundleById,
	type ClinicalBundleId,
} from "../treatmentPlanBundlesEngine";
import { showToast } from "../../GlobalToast";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import {
	formatChairsidePrice,
	recalculateTierTotals,
	applyDoctorDiscountToStages,
	applyDoctorFixedDiscountToStages,
} from "../treatmentPlanMath";
import type { PresenterTabId } from "../TreatmentPlanPresenterHeader";
import type { TreatmentPlanPresenterModalProps } from "./treatmentPlanPresenterTypes";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { logger } from "../../../utils/logger";

export const DEFAULT_SAMPLE_TEETH: ToothData[] = [
	{ toothNumber: 16, state: "Caries", notes: "Глубокий кариес" },
	{ toothNumber: 36, state: "Missing", notes: "Отсутствует зуб (имплантация)" },
	{ toothNumber: 46, state: "Pulpitis", notes: "Пульпит (3 канала)" },
	{ toothNumber: 11, state: "Crown", notes: "Коронка / винир" },
	{ toothNumber: 24, state: "Caries", notes: "Кариес" },
];

export const getTierLetter = (tierId: TreatmentPlanTierId): string => {
	switch (tierId) {
		case "economy":
			return "Вариант А: Базовый (Эконом)";
		case "standard":
			return "Вариант Б: Оптимум (Оптимальный)";
		case "optimum":
			return "Вариант В: Премиум";
		default:
			return "Вариант";
	}
};

export const formatRubles = (amount: number | undefined | null): string => {
	return formatChairsidePrice(amount);
};

export function useTreatmentPlanPresenterState(props: TreatmentPlanPresenterModalProps) {
	const {
		isOpen,
		onClose,
		patientName = "",
		patientId = "",
		doctorFullName = "",
		clinicName = "DENTE Стоматология",
		clinicPhone = "",
		contractNumber,
		planId,
		teeth,
		tiers: propTiers,
		initialSelectedTierId = "standard",
		onSelectPlan,
		onConfirmSelection,
		onUpdateItemPrice: propOnUpdateItemPrice,
		planCreatedAtIso,
		isDemoMode: propIsDemoMode,
	} = props;

	const isDemo = propIsDemoMode !== undefined ? propIsDemoMode : isDemoShowcaseMode();

	const initialCalculatedTiers = useMemo(() => {
		if (propTiers && propTiers.length > 0) return propTiers;
		const effectiveTeeth =
			teeth && teeth.length > 0
				? teeth
				: isDemo
					? DEFAULT_SAMPLE_TEETH
					: [];
		return generate3TierPlanComparison(effectiveTeeth, undefined, 0, 0, { isDemoMode: isDemo });
	}, [propTiers, teeth, isDemo]);

	const [allTiers, setAllTiers] = useState<readonly TreatmentPlanTier[]>(initialCalculatedTiers);
	const [activeTab, setActiveTab] = useState<PresenterTabId>("comparison");
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>(initialSelectedTierId);
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({ 1: true });
	const [installmentMonths, setInstallmentMonths] = useState<3 | 6 | 12 | 24>(12);
	const [isChoiceConfirmed, setIsChoiceConfirmed] = useState<boolean>(false);
	const [confirmedTierId, setConfirmedTierId] = useState<TreatmentPlanTierId | null>(null);
	const [confirmedNotice, setConfirmedNotice] = useState<string | null>(null);
	const [printDocFormat, setPrintDocFormat] = useState<"patient_friendly" | "official_appendix">("patient_friendly");
	const [showMicroConsumables, setShowMicroConsumables] = useState<boolean>(false);

	const [activeToolsPanel, setActiveToolsPanel] = useState<"copilot" | "bundles" | "doctorDiscount" | null>(null);
	const [copilotFeedback, setCopilotFeedback] = useState<string | null>(null);
	const [isCopilotExecuting, setIsCopilotExecuting] = useState<boolean>(false);
	const [doctorDiscountPercent, setDoctorDiscountPercent] = useState<number>(0);
	const [doctorDiscountRub, setDoctorDiscountRub] = useState<number>(0);
	const [doctorDiscountMode, setDoctorDiscountMode] = useState<"percent" | "fixed">("percent");
	const [doctorDiscountTargetStage, setDoctorDiscountTargetStage] = useState<number>(0); // 0 = all stages

	const [aiAuditResult, setAiAuditResult] = useState<TreatmentPlanValidateAndCommentResponse | null>(null);
	const [isAiAuditing, setIsAiAuditing] = useState<boolean>(false);
	const [aiAuditError, setAiAuditError] = useState<string | null>(null);

	useEffect(() => {
		if (propTiers && propTiers.length > 0) {
			setAllTiers(propTiers);
		}
	}, [propTiers]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && isOpen) {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	const planAgeDays = useMemo(() => {
		if (!planCreatedAtIso) return 0;
		const createdTime = new Date(planCreatedAtIso).getTime();
		if (Number.isNaN(createdTime)) return 0;
		const diffMs = Date.now() - createdTime;
		return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
	}, [planCreatedAtIso]);

	const selectedTier = useMemo(() => {
		return allTiers.find((t) => t.tierId === selectedTierId) || allTiers[0] || initialCalculatedTiers[0]!;
	}, [allTiers, selectedTierId, initialCalculatedTiers]);

	const handleRunAiAudit = useCallback(async () => {
		if (isAiAuditing) return;
		setIsAiAuditing(true);
		setAiAuditError(null);
		try {
			const res = await requestTreatmentPlanAiValidationAndComment(
				selectedTier.stages,
				{
					patientName,
					doctorName: doctorFullName,
					selectedTierTitle: selectedTier.title,
					teeth: teeth && teeth.length > 0 ? teeth : isDemoShowcaseMode() ? DEFAULT_SAMPLE_TEETH : [],
					totalRub: selectedTier.totalRub,
					warrantyYears: typeof selectedTier.warrantyYears === "number" ? selectedTier.warrantyYears : 2,
					monthlyInstallment12Rub: selectedTier.monthlyInstallment12Rub,
				},
			);
			setAiAuditResult(res);
		} catch {
			setAiAuditError("Не удалось связаться с ИИ-сервером. Отображаются локальные клинические правила СтАР.");
		} finally {
			setIsAiAuditing(false);
		}
	}, [isAiAuditing, selectedTier, patientName, doctorFullName, teeth]);

	const handleCopyTiersSummary = useCallback(async () => {
		const linesSummary = [
			`Варианты плана лечения для пациента: ${patientName}`,
			`Клиника: ${clinicName} · Врач: ${doctorFullName}`,
			`Дата: ${new Date().toLocaleDateString("ru-RU")}`,
			"----------------------------------------",
		];
		allTiers.forEach((tier) => {
			const letter = getTierLetter(tier.tierId);
			const isRec = tier.tierId === "standard" ? " [РЕКОМЕНДАЦИЯ ВРАЧА]" : "";
			linesSummary.push(`${letter}: ${tier.title}${isRec}`);
			linesSummary.push(`  Итого: ${tier.totalRub.toLocaleString("ru-RU")} ₽`);
			linesSummary.push(`  Срок: ~ ${tier.durationWeeks} нед. (${tier.durationVisits} визитов)`);
			linesSummary.push(`  Гарантия: ${formatWarrantyYearsText(tier.warrantyYears)}`);
			if (tier.monthlyInstallment12Rub > 0) {
				linesSummary.push(`  Рассрочка 0%: от ${tier.monthlyInstallment12Rub.toLocaleString("ru-RU")} ₽/мес на 12 мес.`);
			}
			if (tier.ndflRefundRub > 0) {
				linesSummary.push(`  Возврат 13% НДФЛ: -${tier.ndflRefundRub.toLocaleString("ru-RU")} ₽ (к оплате с вычетом: ${tier.priceWithNdflRefundRub.toLocaleString("ru-RU")} ₽)`);
			}
			linesSummary.push("");
		});
		linesSummary.push("----------------------------------------");
		linesSummary.push("Запись на консультацию и утверждение плана: " + clinicPhone);

		try {
			await navigator.clipboard.writeText(linesSummary.join("\n"));
			showToast("Смета всех 3 вариантов скопирована в буфер обмена!", "success");
		} catch {
			showToast("Не удалось скопировать смету", "error");
		}
	}, [patientName, clinicName, doctorFullName, allTiers, clinicPhone]);

	const cleanPatCode = (patientId || "001").replace(/[^a-zA-Z0-9]/g, "");
	const displayContractNumber = contractNumber || ("ДОГ-2026-" + cleanPatCode);

	const handleSelectTier = useCallback((tier: TreatmentPlanTier) => {
		setSelectedTierId(tier.tierId);
		if (onSelectPlan) {
			onSelectPlan(tier);
		}
	}, [onSelectPlan]);

	const handleUpdateItemPrice = useCallback((itemId: string, newPriceRub: number) => {
		setAllTiers((prev) =>
			prev.map((tier) => {
				if (tier.tierId !== selectedTierId) return tier;
				const updatedStages = tier.stages.map((st) => {
					if (!st.items.some((it) => it.id === itemId)) return st;
					const updatedItems = st.items.map((it) => {
						if (it.id !== itemId) return it;
						const qty = Math.max(1, it.quantity || 1);
						const unitKop = parseKopecks(newPriceRub);
						const discKop = parseKopecks(it.discountRub || 0);
						const lineTotalKop = Math.max(0, unitKop * qty - discKop) as Kopecks;
						return {
							...it,
							unitPriceRub: Math.round(unitKop / 100),
							priceRub: Math.round(lineTotalKop / 100),
							discountRub: Math.round(discKop / 100),
							isDraft: false,
							requiresManualPricing: false,
						};
					});

					const stTotalKopecks = sumKopecks(updatedItems.map((it) => parseKopecks(it.priceRub)));
					return {
						...st,
						items: updatedItems,
						totalRub: Math.round(stTotalKopecks / 100),
						totalKopecks: stTotalKopecks,
					};
				});

				const updatedTier = recalculateTierTotals(tier, updatedStages);
				if (propOnUpdateItemPrice) {
					propOnUpdateItemPrice(itemId, newPriceRub);
				}
				return updatedTier;
			}),
		);
		showToast("Цена услуги обновлена", "success");
	}, [selectedTierId, propOnUpdateItemPrice]);

	const handleExecuteCopilot = useCallback((cmdOrText: CopilotCommandType | string) => {
		setIsCopilotExecuting(true);
		try {
			const res = applyCopilotCommandToPlan(selectedTier.stages, cmdOrText);
			if (res.success) {
				setAllTiers((prev) =>
					prev.map((t) => {
						if (t.tierId !== selectedTierId) return t;
						return recalculateTierTotals(t, res.stages);
					}),
				);
				setCopilotFeedback(res.explanation);
				showToast(`AI Copilot: ${res.commandTitle} применено`, "success");
			}
		} finally {
			setIsCopilotExecuting(false);
		}
	}, [selectedTier, selectedTierId]);

	const handleApplyClinicalBundle = useCallback((bundleId: ClinicalBundleId, toothNumber?: number) => {
		const bundle = getClinicalBundleById(bundleId);
		setAllTiers((prev) =>
			prev.map((t) => {
				if (t.tierId !== selectedTierId) return t;
				return applyClinicalBundleToTier(t, bundleId, toothNumber);
			}),
		);
		const toothDesc = bundle?.requiresTooth ? ` (зуб ${toothNumber ?? bundle?.defaultTooth})` : "";
		showToast(`Пакет «${bundle?.shortTitle || bundleId}» успешно добавлен в ${getTierLetter(selectedTierId)}${toothDesc}!`, "success", 4000);
	}, [selectedTierId]);

	const handleApplyDoctorDiscount = useCallback((pct: number, stageNum?: number) => {
		const validPct = Math.max(0, Math.min(100, pct));
		const targetStage = stageNum !== undefined ? stageNum : doctorDiscountTargetStage;
		setDoctorDiscountPercent(validPct);
		setDoctorDiscountMode("percent");
		setAllTiers((prev) =>
			prev.map((tier) => {
				if (tier.tierId !== selectedTierId) return tier;
				const updatedStages = applyDoctorDiscountToStages(tier.stages, validPct, targetStage);
				return recalculateTierTotals(tier, updatedStages);
			}),
		);
		const stageDesc = targetStage > 0 ? ` (Этап ${targetStage})` : "";
		showToast(`Скидка ${validPct}% применена к ${getTierLetter(selectedTierId)}${stageDesc}`, "info");

		if (patientId && planId) {
			fetch(`/api/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(planId)}/discount-mode`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					discountMode: "plan_fixed",
					planDiscountPercent: validPct,
				}),
			}).catch((err) => {
				logger.warn("Не удалось сохранить скидку на сервере:", err);
			});
		}
	}, [selectedTierId, doctorDiscountTargetStage, patientId, planId]);

	const handleApplyDoctorFixedDiscount = useCallback((rub: number, stageNum?: number) => {
		const validRub = Math.max(0, rub);
		const targetStage = stageNum !== undefined ? stageNum : doctorDiscountTargetStage;
		setDoctorDiscountRub(validRub);
		setDoctorDiscountMode("fixed");
		setAllTiers((prev) =>
			prev.map((tier) => {
				if (tier.tierId !== selectedTierId) return tier;
				const updatedStages = applyDoctorFixedDiscountToStages(tier.stages, validRub, targetStage);
				return recalculateTierTotals(tier, updatedStages);
			}),
		);
		const stageDesc = targetStage > 0 ? ` (Этап ${targetStage})` : "";
		showToast(`Скидка ${validRub.toLocaleString("ru-RU")} ₽ применена к ${getTierLetter(selectedTierId)}${stageDesc}`, "info");

		if (patientId && planId) {
			fetch(`/api/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(planId)}/discount-mode`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					discountMode: "plan_fixed",
					planDiscountRub: validRub,
				}),
			}).catch((err) => {
				logger.warn("Не удалось сохранить скидку на сервере:", err);
			});
		}
	}, [selectedTierId, doctorDiscountTargetStage, patientId, planId]);

	const handleConfirmPatientChoice = useCallback((targetTier?: TreatmentPlanTier) => {
		const effectiveTier = targetTier ?? selectedTier;
		setIsChoiceConfirmed(true);
		setConfirmedTierId(effectiveTier.tierId);
		const variantTitle = getTierLetter(effectiveTier.tierId);
		const message = "Выбор зафиксирован: Пациент выбрал " + variantTitle + " на сумму " + formatRubles(effectiveTier.totalRub);
		setConfirmedNotice(message);
		showToast(message, "success");

		if (patientId && planId) {
			fetch(`/api/patients/${encodeURIComponent(patientId)}/treatment-plans/${encodeURIComponent(planId)}/approve-variant`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					reason: `Пациент выбрал тариф «${effectiveTier.title}»`,
				}),
			}).catch((err) => {
				logger.warn("Не удалось сохранить выбор варианта на сервере:", err);
			});
		}

		// Передача Этапа 1 выбранного плана в текущий визит приёма (Mandates 8e, 8n)
		const stage1 = effectiveTier.stages.find((s) => s.stageNumber === 1) || effectiveTier.stages[0];
		if (stage1 && stage1.items && stage1.items.length > 0) {
			const stagePayload = {
				title: `Этап 1: ${stage1.title || "Терапия и санация"}`,
				stageNumber: stage1.stageNumber || 1,
				items: stage1.items,
			};
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-take-stage-to-visit", {
						detail: {
							stage: stagePayload,
							items: stage1.items,
							patientId,
						},
					}),
				);
			}
		}

		if (onConfirmSelection) onConfirmSelection(effectiveTier);
		if (onSelectPlan) onSelectPlan(effectiveTier);
	}, [selectedTier, onConfirmSelection, onSelectPlan, patientId, planId]);

	const handlePrintAppendix = useCallback(() => {
		setActiveTab("print_appendix");
		setTimeout(() => {
			window.print();
		}, 300);
	}, []);

	const toggleStage = useCallback((stageNum: number) => {
		setExpandedStages((prev) => ({
			...prev,
			[stageNum]: !prev[stageNum],
		}));
	}, []);

	const toggleAllStages = useCallback((expand: boolean) => {
		const next: Record<number, boolean> = {};
		selectedTier.stages.forEach((s) => {
			next[s.stageNumber] = expand;
		});
		setExpandedStages(next);
	}, [selectedTier.stages]);

	const todayRu = useMemo(() => new Date().toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}), []);

	const patientChoiceBtnText = "Пациент выбрал " + getTierLetter(selectedTier.tierId) + " (" + (selectedTier.totalRub ? selectedTier.totalRub.toLocaleString("ru-RU") : "0") + " ₽)";
	const choiceConfirmedBtnText = "Выбор зафиксирован (" + getTierLetter(selectedTier.tierId) + ")";

	return {
		allTiers,
		selectedTier,
		selectedTierId,
		activeTab,
		setActiveTab,
		isFullscreen,
		setIsFullscreen,
		expandedStages,
		toggleStage,
		toggleAllStages,
		installmentMonths,
		setInstallmentMonths,
		isChoiceConfirmed,
		confirmedTierId,
		confirmedNotice,
		printDocFormat,
		setPrintDocFormat,
		showMicroConsumables,
		setShowMicroConsumables,
		activeToolsPanel,
		setActiveToolsPanel,
		copilotFeedback,
		setCopilotFeedback,
		isCopilotExecuting,
		doctorDiscountPercent,
		setDoctorDiscountPercent,
		doctorDiscountRub,
		setDoctorDiscountRub,
		doctorDiscountMode,
		setDoctorDiscountMode,
		doctorDiscountTargetStage,
		setDoctorDiscountTargetStage,
		aiAuditResult,
		isAiAuditing,
		aiAuditError,
		planAgeDays,
		displayContractNumber,
		todayRu,
		patientChoiceBtnText,
		choiceConfirmedBtnText,
		handleRunAiAudit,
		handleCopyTiersSummary,
		handleSelectTier,
		handleUpdateItemPrice,
		handleExecuteCopilot,
		handleApplyClinicalBundle,
		handleApplyDoctorDiscount,
		handleApplyDoctorFixedDiscount,
		handleConfirmPatientChoice,
		handlePrintAppendix,
	};
}
