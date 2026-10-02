/**
 * TreatmentPlanPresenterModal.tsx — Интерактивная студия презентации планов лечения пациенту у кресла
 * (Wave 19: Chairside Treatment Plan Presenter & Official Appendix #1 Generator).
 *
 * Декомпозирован строго по Мандату 8b (лимит строк <= 800 строк на файл):
 * - treatmentPlanConsumables.ts — фильтрация микро-расходников (isMicroConsumable)
 * - TreatmentPlanPresenterHeader.tsx — шапка презентации и табы навигации
 * - TreatmentPlanPresenterToolsStrip.tsx — кресельная панель инструментов врача
 * - TreatmentPlanPresenterComparisonTab.tsx — 3-Tier сравнение («Эконом», «Оптимум», «Премиум»)
 * - TreatmentPlanPresenterStagesTab.tsx — детальный просмотр клинических этапов
 * - TreatmentPlanPresenterFinanceTab.tsx — рассрочка 0% и 13% вычет НДФЛ
 * - TreatmentPlanPresenterPrintView.tsx — печать Приложения №1 к Договору (ПП РФ № 736)
 * - TreatmentPlanPresenterAiAuditTab.tsx — ИИ-аудит и студия кресельного комментария
 */

import React, { useMemo, useState, useEffect } from "react";
import {
	type Kopecks,
	parseKopecks,
	percentageOfKopecks,
	sumKopecks,
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
	type TreatmentPlanValidateAndCommentResponse,
} from "@dental/shared";
import {
	formatWarrantyYearsText,
	type NdflDeductionResult,
	type TreatmentPlanStage,
	type TreatmentPlanTier,
	type TreatmentPlanTierId,
	type TreatmentPlanWorkflowStatus,
} from "./types";
import type { ToothData } from "../odontogram/ToothChart";
import {
	generate3TierPlanComparison,
	computeTierInstallments,
} from "./treatmentPlanStagesEngine";
import {
	applyCopilotCommandToPlan,
	type CopilotCommandType,
	requestTreatmentPlanAiValidationAndComment,
} from "../../services/ai/treatmentPlanCopilot";
import {
	applyClinicalBundleToTier,
	getClinicalBundleById,
	type ClinicalBundleId,
} from "./treatmentPlanBundlesEngine";
import "./treatmentPlans.css";
import { TreatmentPlanRoadmap } from "./TreatmentPlanRoadmap";
import { showToast } from "../GlobalToast";
import { isMicroConsumable, type PlanItemLike } from "./treatmentPlanConsumables";
export { isMicroConsumable, type PlanItemLike };
import {
	formatChairsidePrice,
	recalculateTierTotals,
	applyDoctorDiscountToStages,
} from "./treatmentPlanMath";

import { TreatmentPlanPresenterHeader, type PresenterTabId } from "./TreatmentPlanPresenterHeader";
import { TreatmentPlanPresenterToolsStrip } from "./TreatmentPlanPresenterToolsStrip";
import { TreatmentPlanPresenterComparisonTab } from "./TreatmentPlanPresenterComparisonTab";
import { TreatmentPlanPresenterStagesTab } from "./TreatmentPlanPresenterStagesTab";
import { TreatmentPlanPresenterFinanceTab } from "./TreatmentPlanPresenterFinanceTab";
import { TreatmentPlanPresenterPrintView } from "./TreatmentPlanPresenterPrintView";
import { TreatmentPlanPresenterAiAuditTab } from "./TreatmentPlanPresenterAiAuditTab";
import { TreatmentPlanPresenterFooter } from "./TreatmentPlanPresenterFooter";

export interface TreatmentPlanPresenterModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly doctorFullName?: string | undefined;
	readonly doctorSpecialty?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicOgrn?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicLicense?: string | undefined;
	readonly contractNumber?: string | undefined;
	readonly teeth?: readonly ToothData[] | undefined;
	readonly tiers?: readonly TreatmentPlanTier[] | undefined;
	readonly initialSelectedTierId?: TreatmentPlanTierId | undefined;
	readonly onSelectPlan?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onConfirmSelection?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onPrintContract?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onApproveAndSign?: ((tier: TreatmentPlanTier) => void) | undefined;
	readonly onUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly planCreatedAtIso?: string | undefined;
	readonly isClosed?: boolean | undefined;
	readonly isDraft?: boolean | undefined;
	readonly isSigned?: boolean | undefined;
	readonly status?: string | undefined;
	readonly planId?: string | undefined;
	readonly workflowStatus?: TreatmentPlanWorkflowStatus | undefined;
	readonly watermarkText?: string | undefined;
	readonly className?: string | undefined;
}

const DEFAULT_SAMPLE_TEETH: ToothData[] = [
	{ toothNumber: 16, state: "Caries", notes: "Глубокий кариес" },
	{ toothNumber: 36, state: "Missing", notes: "Отсутствует зуб (имплантация)" },
	{ toothNumber: 46, state: "Pulpitis", notes: "Пульпит (3 канала)" },
	{ toothNumber: 11, state: "Crown", notes: "Коронка / винир" },
	{ toothNumber: 24, state: "Caries", notes: "Кариес" },
];

export const TreatmentPlanPresenterModal: React.FC<TreatmentPlanPresenterModalProps> = ({
	isOpen,
	onClose,
	patientName = "",
	patientId = "",
	patientPhone = "",
	patientBirthDate,
	doctorFullName = "",
	doctorSpecialty = "",
	clinicName = "DENTE Стоматология",
	clinicLegalName = "",
	clinicInn = "",
	clinicOgrn = "",
	clinicAddress = "",
	clinicPhone = "",
	clinicLicense = "",
	contractNumber,
	teeth,
	tiers: propTiers,
	initialSelectedTierId = "standard",
	onSelectPlan,
	onConfirmSelection,
	onPrintContract,
	onApproveAndSign,
	onUpdateItemPrice: propOnUpdateItemPrice,
	planCreatedAtIso,
	isClosed,
	isDraft,
	isSigned,
	status,
	planId,
	workflowStatus,
	watermarkText,
	className = "",
}) => {
	const initialCalculatedTiers = useMemo(() => {
		if (propTiers && propTiers.length > 0) return propTiers;
		const effectiveTeeth = teeth && teeth.length > 0 ? teeth : DEFAULT_SAMPLE_TEETH;
		return generate3TierPlanComparison(effectiveTeeth);
	}, [propTiers, teeth]);

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

	const handleRunAiAudit = async () => {
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
					teeth: teeth && teeth.length > 0 ? teeth : DEFAULT_SAMPLE_TEETH,
					totalRub: selectedTier.totalRub,
					warrantyYears: typeof selectedTier.warrantyYears === "number" ? selectedTier.warrantyYears : 2,
					monthlyInstallment12Rub: selectedTier.monthlyInstallment12Rub,
				},
			);
			setAiAuditResult(res);
		} catch (err: any) {
			setAiAuditError("Не удалось связаться с ИИ-сервером. Отображаются локальные клинические правила СтАР.");
		} finally {
			setIsAiAuditing(false);
		}
	};

	const handleCopyTiersSummary = async () => {
		const linesSummary = [
			`📋 Варианты плана лечения для пациента: ${patientName}`,
			`Клиника: ${clinicName} · Врач: ${doctorFullName}`,
			`Дата: ${new Date().toLocaleDateString("ru-RU")}`,
			"----------------------------------------",
		];
		allTiers.forEach((tier) => {
			const letter = getTierLetter(tier.tierId);
			const isRec = tier.tierId === "standard" ? " ⭐ РЕКОМЕНДАЦИЯ ВРАЧА" : "";
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
	};

	const cleanPatCode = (patientId || "001").replace(/[^a-zA-Z0-9]/g, "");
	const displayContractNumber = contractNumber || ("ДОГ-2026-" + cleanPatCode);

	const getTierLetter = (tierId: TreatmentPlanTierId): string => {
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

	const formatRubles = (amount: number | undefined | null): string => {
		return formatChairsidePrice(amount);
	};

	const handleSelectTier = (tier: TreatmentPlanTier) => {
		setSelectedTierId(tier.tierId);
		if (onSelectPlan) {
			onSelectPlan(tier);
		}
	};

	const recalculateTierFromStages = (
		tier: TreatmentPlanTier,
		updatedStages: readonly TreatmentPlanStage[],
	): TreatmentPlanTier => {
		return recalculateTierTotals(tier, updatedStages);
	};

	const handleUpdateItemPrice = (itemId: string, newPriceRub: number) => {
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
					const stTotalRub = Math.round(stTotalKopecks / 100);
					return {
						...st,
						items: updatedItems,
						totalRub: stTotalRub,
						totalKopecks: stTotalKopecks,
					};
				});

				const updatedTier = recalculateTierFromStages(tier, updatedStages);
				if (propOnUpdateItemPrice) {
					propOnUpdateItemPrice(itemId, newPriceRub);
				}
				return updatedTier;
			}),
		);
		showToast("Цена услуги обновлена", "success");
	};

	const handleExecuteCopilot = (cmdOrText: CopilotCommandType | string) => {
		setIsCopilotExecuting(true);
		try {
			const res = applyCopilotCommandToPlan(selectedTier.stages, cmdOrText);
			if (res.success) {
				setAllTiers((prev) =>
					prev.map((t) => {
						if (t.tierId !== selectedTierId) return t;
						const updated = recalculateTierFromStages(t, res.stages);
						return updated;
					}),
				);
				setCopilotFeedback(res.explanation);
				showToast(`AI Copilot: ${res.commandTitle} применено`, "success");
			}
		} finally {
			setIsCopilotExecuting(false);
		}
	};

	const handleApplyClinicalBundle = (bundleId: ClinicalBundleId, toothNumber?: number) => {
		const bundle = getClinicalBundleById(bundleId);
		setAllTiers((prev) =>
			prev.map((t) => {
				if (t.tierId !== selectedTierId) return t;
				const updated = applyClinicalBundleToTier(t, bundleId, toothNumber);
				return updated;
			}),
		);
		const toothDesc = bundle?.requiresTooth ? ` (зуб ${toothNumber ?? bundle?.defaultTooth})` : "";
		showToast(`Пакет «${bundle?.shortTitle || bundleId}» успешно добавлен в ${getTierLetter(selectedTierId)}${toothDesc}!`, "success", 4000);
	};

	const handleApplyDoctorDiscount = (pct: number) => {
		const validPct = Math.max(0, Math.min(100, pct));
		setDoctorDiscountPercent(validPct);
		setAllTiers((prev) =>
			prev.map((tier) => {
				if (tier.tierId !== selectedTierId) return tier;
				const updatedStages = applyDoctorDiscountToStages(tier.stages, validPct);
				return recalculateTierTotals(tier, updatedStages);
			}),
		);
		showToast(`Скидка ${validPct}% применена к ${getTierLetter(selectedTierId)}`, "info");
	};

	const handleConfirmPatientChoice = (targetTier?: TreatmentPlanTier) => {
		const effectiveTier = targetTier ?? selectedTier;
		setIsChoiceConfirmed(true);
		setConfirmedTierId(effectiveTier.tierId);
		const variantTitle = getTierLetter(effectiveTier.tierId);
		const message = "Выбор зафиксирован: Пациент выбрал " + variantTitle + " на сумму " + formatRubles(effectiveTier.totalRub);
		setConfirmedNotice(message);
		showToast(message, "success");

		if (onConfirmSelection) {
			onConfirmSelection(effectiveTier);
		}
		if (onSelectPlan) {
			onSelectPlan(effectiveTier);
		}
	};

	const handlePrintAppendix = () => {
		setActiveTab("print_appendix");
		setTimeout(() => {
			window.print();
		}, 300);
	};

	const toggleStage = (stageNum: number) => {
		setExpandedStages((prev) => ({
			...prev,
			[stageNum]: !prev[stageNum],
		}));
	};

	const toggleAllStages = (expand: boolean) => {
		const next: Record<number, boolean> = {};
		selectedTier.stages.forEach((s) => {
			next[s.stageNumber] = expand;
		});
		setExpandedStages(next);
	};

	const todayRu = new Date().toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});

	const patientChoiceBtnText = "Пациент выбрал " + getTierLetter(selectedTier.tierId) + " (" + (selectedTier.totalRub ? selectedTier.totalRub.toLocaleString("ru-RU") : "0") + " ₽)";
	const choiceConfirmedBtnText = "Выбор зафиксирован (" + getTierLetter(selectedTier.tierId) + ")";

	if (!isOpen) return null;

	return (
		<div
			className={"treatment-presenter-backdrop " + (isFullscreen ? "fullscreen-mode" : "")}
			data-testid="treatment-plan-presenter-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-presenter-modal-title"
		>
			<div className={"treatment-presenter-container " + className}>
				{/* Top Header */}
				<TreatmentPlanPresenterHeader
					patientName={patientName}
					doctorFullName={doctorFullName}
					planAgeDays={planAgeDays}
					isFullscreen={isFullscreen}
					onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
					activeTab={activeTab}
					onSelectTab={setActiveTab}
					onCopyTiersSummary={handleCopyTiersSummary}
					onPrintAppendix={handlePrintAppendix}
					onClose={onClose}
					aiAuditResult={aiAuditResult}
					isAiAuditing={isAiAuditing}
					onRunAiAudit={handleRunAiAudit}
				/>

				{/* Chairside Assistant & Clinical Tools Strip */}
				<TreatmentPlanPresenterToolsStrip
					activeToolsPanel={activeToolsPanel}
					setActiveToolsPanel={setActiveToolsPanel}
					isCopilotExecuting={isCopilotExecuting}
					onExecuteCopilot={handleExecuteCopilot}
					onApplyClinicalBundle={handleApplyClinicalBundle}
					copilotFeedback={copilotFeedback}
					setCopilotFeedback={setCopilotFeedback}
					doctorDiscountPercent={doctorDiscountPercent}
					setDoctorDiscountPercent={setDoctorDiscountPercent}
					onApplyDoctorDiscount={handleApplyDoctorDiscount}
					showMicroConsumables={showMicroConsumables}
					setShowMicroConsumables={setShowMicroConsumables}
					selectedTier={selectedTier}
					allTiers={allTiers}
					onSelectPlan={onSelectPlan}
					teeth={teeth}
					patientChoiceBtnText={patientChoiceBtnText}
					choiceConfirmedBtnText={choiceConfirmedBtnText}
					isChoiceConfirmed={isChoiceConfirmed}
					confirmedNotice={confirmedNotice}
					onConfirmPatientChoice={handleConfirmPatientChoice}
					onApproveAndSign={onApproveAndSign}
				/>

				{/* Main Body */}
				<main className="treatment-presenter-body" data-testid="treatment-presenter-body">
					{activeTab === "comparison" && (
						<TreatmentPlanPresenterComparisonTab
							allTiers={allTiers}
							selectedTierId={selectedTierId}
							onSelectTier={handleSelectTier}
							getTierLetter={getTierLetter}
							formatRubles={formatRubles}
							expandedStages={expandedStages}
							onToggleStage={toggleStage}
							onToggleAllStages={toggleAllStages}
							showMicroConsumables={showMicroConsumables}
							onUpdateItemPrice={handleUpdateItemPrice}
							onConfirmPatientChoice={handleConfirmPatientChoice}
							isChoiceConfirmed={isChoiceConfirmed}
							confirmedTierId={confirmedTierId}
							onApproveAndSign={onApproveAndSign}
						/>
					)}

					{activeTab === "stages" && (
						<TreatmentPlanPresenterStagesTab
							selectedTier={selectedTier}
							selectedTierId={selectedTierId}
							allTiers={allTiers}
							onSelectTier={handleSelectTier}
							showMicroConsumables={showMicroConsumables}
							onUpdateItemPrice={handleUpdateItemPrice}
						/>
					)}

					{activeTab === "roadmap" && (
						<TreatmentPlanRoadmap
							tier={selectedTier}
							patientName={patientName}
							doctorName={doctorFullName}
							clinicName={clinicName}
							displayContractNumber={displayContractNumber}
							todayRu={todayRu}
							getTierLetter={getTierLetter}
							onPrint={handlePrintAppendix}
							onConfirmPatientChoice={() => handleConfirmPatientChoice(selectedTier)}
						/>
					)}

					{activeTab === "finance" && (
						<TreatmentPlanPresenterFinanceTab
							selectedTier={selectedTier}
							installmentMonths={installmentMonths}
							setInstallmentMonths={setInstallmentMonths}
						/>
					)}

					{activeTab === "print_appendix" && (
						<TreatmentPlanPresenterPrintView
							printDocFormat={printDocFormat}
							setPrintDocFormat={setPrintDocFormat}
							showMicroConsumables={showMicroConsumables}
							setShowMicroConsumables={setShowMicroConsumables}
							selectedTier={selectedTier}
							patientName={patientName}
							patientBirthDate={patientBirthDate}
							patientPhone={patientPhone}
							doctorFullName={doctorFullName}
							doctorSpecialty={doctorSpecialty}
							clinicName={clinicName}
							clinicLegalName={clinicLegalName}
							clinicInn={clinicInn}
							clinicOgrn={clinicOgrn}
							clinicAddress={clinicAddress}
							clinicPhone={clinicPhone}
							clinicLicense={clinicLicense}
							displayContractNumber={displayContractNumber}
							todayRu={todayRu}
							watermarkText={watermarkText}
							getTierLetter={getTierLetter}
							patientId={patientId}
							planAgeDays={planAgeDays}
						/>
					)}

					{activeTab === "ai_audit" && (
						<TreatmentPlanPresenterAiAuditTab
							aiAuditResult={aiAuditResult}
							isAiAuditing={isAiAuditing}
							aiAuditError={aiAuditError}
							onRunAiAudit={handleRunAiAudit}
							onExecuteCopilot={handleExecuteCopilot}
							selectedTier={selectedTier}
						/>
					)}
				</main>

				{/* Sticky Bottom Action Footer */}
				<TreatmentPlanPresenterFooter
					selectedTier={selectedTier}
					getTierLetter={getTierLetter}
					onPrintAppendix={handlePrintAppendix}
					onConfirmPatientChoice={handleConfirmPatientChoice}
					onApproveAndSign={onApproveAndSign}
					isChoiceConfirmed={isChoiceConfirmed}
					patientChoiceBtnText={patientChoiceBtnText}
					choiceConfirmedBtnText={choiceConfirmedBtnText}
				/>
			</div>
		</div>
	);
};
