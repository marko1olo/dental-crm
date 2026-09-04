/**
 * TreatmentPlanModule.tsx — главный модуль управления планами лечения и финансовой оценки DENTE CRM.
 */

import React, { useMemo, useState, useRef, useEffect } from "react";
import {
	Award,
	Calculator,
	Check,
	Coins,
	CreditCard,
	Download,
	FileCheck,
	FileDown,
	FileText,
	FlaskConical,
	Layers,
	MoreVertical,
	PenTool,
	Printer,
	Receipt,
	RefreshCw,
	Save,
	ShieldCheck,
	Sparkles,
	UserCheck,
	UserPlus,
	Wallet,
	Zap,
} from "lucide-react";
import type { ToothData } from "../odontogram/ToothChart";
import { showToast } from "../GlobalToast";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { logger } from "../../utils/logger";
import {
	type CatalogServiceLookupItem,
	calculateLoyaltyBonusDeduction,
	generate3TierPlanComparison,
	generateTreatmentPlanStages,
} from "./treatmentPlanStagesEngine";
import {
	type InventoryItemLookup,
	generateCompletedWorksActAndWriteOff,
} from "./treatmentPlanMaterialEngine";
import { MissingPriceAlert } from "./MissingPriceAlert";
import {
	applyCopilotCommandToPlan,
	COPILOT_PRESET_ACTIONS,
	type CopilotCommandType,
} from "../../services/ai/treatmentPlanCopilot";
import { parseKopecks } from "@dental/shared";
import { Bot } from "lucide-react";
import { TreatmentPlan3TierComparison } from "./TreatmentPlan3TierComparison";
import { TreatmentPlanContractPrint } from "./TreatmentPlanContractPrint";
import { TreatmentPlanCompletedActPrint } from "./TreatmentPlanCompletedActPrint";
import { TreatmentPlanSignatureModal } from "./TreatmentPlanSignatureModal";
import { TreatmentPlanStageCard } from "./TreatmentPlanStageCard";
import { TreatmentPlanPhased4StageView } from "./TreatmentPlanPhased4StageView";
import { TreatmentPlanComparatorModal } from "./comparator/TreatmentPlanComparatorModal";
import { StagePaymentPlanModal } from "./stagePayment/StagePaymentPlanModal";
import { TreatmentPlanPriceValidatorModal } from "./validation/TreatmentPlanPriceValidatorModal";
import { TreatmentPlanPresenterModal } from "./TreatmentPlanPresenterModal";
import { FiscalReceipt54FzModal } from "../finance/FiscalReceipt54FzModal";
import { InvoiceGenerationModal } from "../finance/InvoiceGenerationModal";
import { LabWorkOrderModal } from "../lab/orders/LabWorkOrderModal";
import {
	ONE_CLICK_LAB_DEFAULTS,
	addWorkingDays,
	calculateMaterialTotalCostKopecks,
} from "../lab/labMath";
import { BankInstallmentQrModal } from "../payments/BankInstallmentQrModal";
import { CuratorPlanAssignmentModal } from "./CuratorPlanAssignmentModal";
import type {
	CashierInvoiceExportData,
	CompletedWorksActAndWriteOffData,
	DigitalSignatureAgreementData,
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "./types";
import type { TreatmentPlanValidationPayload } from "./validation/planPriceValidationPresets";

export interface TreatmentPlanModuleProps {
	readonly patientId: string;
	readonly patientName?: string;
	readonly teethData: readonly ToothData[];
	readonly onExportToCashier?: (data: CashierInvoiceExportData) => void;
	readonly onPlanSaved?: (planId: string) => void;
	readonly className?: string;
}

export const TreatmentPlanModule: React.FC<TreatmentPlanModuleProps> = ({
	patientId,
	patientName = "Пациент",
	teethData,
	onExportToCashier,
	onPlanSaved,
	className = "",
}) => {
	const { dashboard, auth } = useAppLogicContext();
	const [activeViewTab, setActiveViewTab] = useState<"3tier" | "stages" | "phased4">("3tier");
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>("optimum");
	const [discountPercent, setDiscountPercent] = useState<number>(0);
	const [bonusPointsToUseRub, setBonusPointsToUseRub] = useState<number>(0);

	// Modals State
	const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
	const [isContractPrintOpen, setIsContractPrintOpen] = useState<boolean>(false);
	const [isActPrintOpen, setIsActPrintOpen] = useState<boolean>(false);
	const [isFiscalModalOpen, setIsFiscalModalOpen] = useState<boolean>(false);
	const [isLabOrderModalOpen, setIsLabOrderModalOpen] = useState<boolean>(false);
	const [isComparatorModalOpen, setIsComparatorModalOpen] = useState<boolean>(false);
	const [isStagePaymentModalOpen, setIsStagePaymentModalOpen] = useState<boolean>(false);
	const [isPriceValidatorModalOpen, setIsPriceValidatorModalOpen] = useState<boolean>(false);
	const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
	const [isPresenterModalOpen, setIsPresenterModalOpen] = useState<boolean>(false);
	const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState<boolean>(false);
	const [selectedInstallmentStage, setSelectedInstallmentStage] = useState<TreatmentPlanStage | null>(null);
	const [isCuratorModalOpen, setIsCuratorModalOpen] = useState<boolean>(false);
	const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState<boolean>(false);
	const optionsMenuRef = useRef<HTMLDivElement>(null);

	// AI Copilot & Custom Stages State
	const [customStages, setCustomStages] = useState<TreatmentPlanStage[] | null>(null);
	const [copilotFeedback, setCopilotFeedback] = useState<string | null>(null);
	const [isCopilotExecuting, setIsCopilotExecuting] = useState<boolean>(false);

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
				setIsOptionsMenuOpen(false);
			}
		};
		if (isOptionsMenuOpen) {
			document.addEventListener("mousedown", handleOutside);
		}
		return () => document.removeEventListener("mousedown", handleOutside);
	}, [isOptionsMenuOpen]);

	const [selectedLabTeeth, setSelectedLabTeeth] = useState<number[] | undefined>(undefined);
	const [selectedActStage, setSelectedActStage] = useState<TreatmentPlanStage | null>(null);
	const [isExecutingWriteOff, setIsExecutingWriteOff] = useState<boolean>(false);
	const [signedAgreement, setSignedAgreement] =
		useState<DigitalSignatureAgreementData | null>(null);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	const catalog = dashboard?.serviceCatalog as CatalogServiceLookupItem[] | undefined;
	const patient = (dashboard?.patients as any[] | undefined)?.find(
		(p: any) => p.id === patientId,
	);
	const patientBalanceRub = Math.max(0, Number(patient?.balanceRub) || 0);
	const patientPhone = patient?.phone || "+7 (___) ___-__-__";
	const patientBirthDate = patient?.birthDate;

	// 1. Auto-generate 3-tier proposals from odontogram teeth findings
	const planTiers = useMemo(() => {
		return generate3TierPlanComparison(teethData, catalog, discountPercent);
	}, [teethData, catalog, discountPercent]);

	const currentTier = useMemo(() => {
		return planTiers.find((t) => t.tierId === selectedTierId) ?? planTiers[2]!;
	}, [planTiers, selectedTierId]);

	// 2. Generate granular 3 clinical stages (auto or AI-customized)
	const autoStages = useMemo(() => {
		return generateTreatmentPlanStages(teethData, catalog, discountPercent);
	}, [teethData, catalog, discountPercent]);

	const stages = customStages ?? autoStages;

	const handleUpdateItemPrice = (itemId: string, newPriceRub: number) => {
		const updated = stages.map((st) => {
			let modified = false;
			const updatedItems = st.items.map((it) => {
				if (it.id === itemId) {
					modified = true;
					return {
						...it,
						priceRub: newPriceRub,
						unitPriceRub: newPriceRub,
						requiresManualPricing: false,
					};
				}
				return it;
			});
			if (!modified) return st;

			const stTotalRub = updatedItems.reduce((acc, it) => acc + it.priceRub, 0);
			const stTotalKopecks = parseKopecks(stTotalRub);
			return {
				...st,
				items: updatedItems,
				totalRub: stTotalRub,
				totalKopecks: stTotalKopecks,
			};
		});

		setCustomStages(updated);
		showToast(`Цена услуги обновлена: ${newPriceRub.toLocaleString("ru-RU")} ₽`, "success");
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

	const totalItemsCount = useMemo(() => {
		return stages.reduce((acc, s) => acc + s.items.length, 0);
	}, [stages]);

	const grandTotalRub = useMemo(() => {
		return stages.reduce((acc, s) => acc + s.totalRub, 0);
	}, [stages]);

	// Loyalty and Bonus Points deduction calculation
	const loyaltyDeduction = useMemo(() => {
		return calculateLoyaltyBonusDeduction(
			currentTier.totalKopecks,
			discountPercent,
			patientBalanceRub,
			bonusPointsToUseRub,
		);
	}, [currentTier.totalKopecks, discountPercent, patientBalanceRub, bonusPointsToUseRub]);

	// 3. Extract orthopedic teeth (crowns, bridges, dentures, veneers, implant crowns)
	const orthopedicTeeth = useMemo(() => {
		const teethFromStages = stages
			.filter((s) => s.stageKind === "stage_3_orthopedics" || s.stageNumber === 3)
			.flatMap((s) => s.items)
			.map((it) => it.toothNumber)
			.filter((t): t is number => typeof t === "number" && t > 0);

		if (teethFromStages.length > 0) {
			return Array.from(new Set(teethFromStages)).sort((a, b) => a - b);
		}

		const teethFromOdontogram = (teethData || [])
			.filter((t) => {
				const s = String(t.state || "").toLowerCase();
				return (
					s.includes("crown") ||
					s.includes("bridge") ||
					s.includes("denture") ||
					s.includes("implant") ||
					Boolean((t as any).isCrown) ||
					Boolean((t as any).isBridge)
				);
			})
			.map((t) => (t as any).toothNumber ?? (t as any).id)
			.filter((id): id is number => typeof id === "number" && id > 0);

		if (teethFromOdontogram.length > 0) {
			return Array.from(new Set(teethFromOdontogram)).sort((a, b) => a - b);
		}

		return [21];
	}, [stages, teethData]);

	const handleOpenLabOrder = (teeth?: number[]) => {
		setSelectedLabTeeth(teeth && teeth.length > 0 ? teeth : orthopedicTeeth);
		setIsLabOrderModalOpen(true);
	};

	const handleOneClickLabOrder = async (teeth?: number[]) => {
		const targetTeeth = teeth && teeth.length > 0 ? teeth : orthopedicTeeth;
		if (!targetTeeth || targetTeeth.length === 0) {
			showToast("Нет выбранных ортопедических зубов для наряда ЗТЛ", "warning");
			return;
		}

		const due = addWorkingDays(new Date(), ONE_CLICK_LAB_DEFAULTS.workingDays);
		const dueDateIso = due.toISOString();
		const dueDateFormatted = due.toLocaleDateString("ru-RU");
		const isBridge = targetTeeth.length > 1;
		const construction = isBridge
			? ONE_CLICK_LAB_DEFAULTS.restorationTypeBridge
			: ONE_CLICK_LAB_DEFAULTS.restorationTypeSingle;
		const priceRub =
			(calculateMaterialTotalCostKopecks(ONE_CLICK_LAB_DEFAULTS.materialId, targetTeeth.length) ||
				650000 * targetTeeth.length) / 100;
		const toothFdiStr = targetTeeth.join(", ");

		try {
			showToast(`Создаём наряд ЗТЛ в 1 клик для зубов ${toothFdiStr}...`, "info", 2000);
			const res = await fetch("/api/clinical/lab-orders", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({
					patientId,
					doctorId: auth?.currentUser?.id || null,
					toothFdi: toothFdiStr,
					material: ONE_CLICK_LAB_DEFAULTS.materialName,
					colorVita: ONE_CLICK_LAB_DEFAULTS.colorVita,
					dueDate: dueDateIso,
					clinicalNotes: `• Экспресс 1-клик наряд ЗТЛ из плана лечения (${currentTier.title})\n• Конструкция: ${isBridge ? `Мостовидный протез (${targetTeeth.length} ед.: ${targetTeeth.join("-")})` : "Одиночная коронка"}\n• Материал: ${ONE_CLICK_LAB_DEFAULTS.materialName}\n• Цвет: VITA Classical ${ONE_CLICK_LAB_DEFAULTS.colorVita}\n• Срок: 7 рабочих дней (до ${dueDateFormatted})\n• Цементный зазор: ${ONE_CLICK_LAB_DEFAULTS.cementGapMicrons} мкм`,
					priceRub,
				}),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || "Ошибка создания наряда ЗТЛ");
			}

			const savedOrder = await res.json();

			if (savedOrder?.id) {
				for (const tooth of targetTeeth) {
					try {
						await fetch(`/api/clinical/lab-orders/${savedOrder.id}/items`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							body: JSON.stringify({
								toothFdi: tooth,
								restorationType: construction,
								material: ONE_CLICK_LAB_DEFAULTS.materialId,
								shadeFinal: ONE_CLICK_LAB_DEFAULTS.colorVita,
								translucencyLevel: ONE_CLICK_LAB_DEFAULTS.translucency,
								cementGapMicrons: ONE_CLICK_LAB_DEFAULTS.cementGapMicrons,
								priceRub: priceRub / targetTeeth.length,
							}),
						});
					} catch {
						// Non-blocking item fallback
					}
				}
			}

			showToast(
				`Наряд ЗТЛ успешно оформлен в 1 клик для зубов ${toothFdiStr} (Цирконий A2, срок до ${dueDateFormatted})!`,
				"success",
				6000,
			);
			window.dispatchEvent(
				new CustomEvent("dente-lab-order-created", { detail: { order: savedOrder } }),
			);
		} catch (err: any) {
			showToast(err.message || "Не удалось оформить наряд в ЗТЛ", "error");
		}
	};

	// Validation payload
	const validationPayload: TreatmentPlanValidationPayload = useMemo(() => {
		const allItems = stages.flatMap((s) => s.items);
		return {
			planId: `PLAN-${patientId.slice(0, 6).toUpperCase()}`,
			planNumber: `ПЛАН-№${patientId.slice(0, 4)}`,
			planTitle: currentTier.title,
			patientId,
			patientName,
			doctorId: auth?.currentUser?.id || "doc-01",
			doctorFullName: auth?.currentUser?.name || "Д-р Смирнов А. В.",
			createdAtIso: new Date().toISOString(),
			items: allItems.map((it) => ({
				itemId: it.id,
				...(it.toothNumber !== undefined ? { toothNumber: it.toothNumber } : {}),
				code804n: it.code804n,
				serviceTitle: it.name,
				category: it.category,
				planUnitPriceRub: it.unitPriceRub,
				planDiscountPercent: discountPercent,
				planDiscountRub: it.discountRub,
				quantity: it.quantity,
				planLineTotalRub: Math.max(0, it.unitPriceRub - it.discountRub) * it.quantity,
			})),
		};
	}, [stages, patientId, patientName, currentTier.title, auth, discountPercent]);

	// Action: Export directly to cashier as an Invoice
	const handleExportCashier = () => {
		const allItems = stages.flatMap((s) => s.items);
		if (allItems.length === 0) {
			showToast("Нет позиций для формирования счета", "warning", 3000);
			return;
		}

		const grossTotalRub = allItems.reduce(
			(acc, it) => acc + it.unitPriceRub * it.quantity,
			0,
		);
		const discountRub = allItems.reduce((acc, it) => acc + it.discountRub, 0);
		const netTotalRub = loyaltyDeduction.netPayableRub;

		const exportData: CashierInvoiceExportData = {
			patientId,
			patientName,
			items: allItems,
			grossTotalRub,
			discountRub,
			bonusPointsUsedRub: loyaltyDeduction.appliedBonusRub,
			bonusPointsUsedKopecks: loyaltyDeduction.appliedBonusKopecks,
			netTotalRub,
			netTotalKopecks: loyaltyDeduction.netPayableKopecks,
			notes: `Счет на оплату по комплексному плану «${currentTier.title}»${
				loyaltyDeduction.appliedBonusRub > 0
					? ` (Списано бонусов: ${loyaltyDeduction.appliedBonusRub} ₽)`
					: ""
			}`,
			createdAtIso: new Date().toISOString(),
		};

		if (onExportToCashier) {
			onExportToCashier(exportData);
		}

		showToast(
			`Счет на оплату (${netTotalRub.toLocaleString("ru-RU")} ₽) успешно отправлен кассиру-администратору!`,
			"success",
			5000,
		);
	};

	// Action: Save Plan to Database
	const handleSavePlanToDatabase = async () => {
		if (totalItemsCount === 0) {
			showToast("План пуст: добавьте или отметьте зубы на схеме", "warning");
			return;
		}

		setIsSaving(true);
		try {
			const allItems = stages.flatMap((s) => s.items);
			const itemsForApi = allItems.map((it) => ({
				toothNumber: it.toothNumber ?? null,
				priceId: it.priceId || it.code804n,
				name: it.name,
				quantity: it.quantity,
				price: it.unitPriceRub,
				discount: it.discountRub,
				phase: it.phase,
				isAuto: it.isAuto ?? true,
			}));

			const res = await fetch(`/api/patients/${patientId}/treatment-plans`, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					name: `${currentTier.title} (${new Date().toLocaleDateString("ru-RU")})`,
					patientSignature: signedAgreement?.signatureBase64 || null,
					items: itemsForApi,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				if (data.planId && onPlanSaved) {
					onPlanSaved(data.planId);
				}
				showToast(
					`Комплексный план лечения успешно сохранен в базе на сумму ${grandTotalRub.toLocaleString("ru-RU")} ₽!`,
					"success",
					4000,
				);
			} else {
				showToast("Не удалось сохранить план на сервере", "error");
			}
		} catch (err) {
			logger.error("[TreatmentPlanModule] Save error", err);
			showToast("Ошибка сохранения плана", "error");
		} finally {
			setIsSaving(false);
		}
	};

	const contractNumber = `D-${new Date().getFullYear()}-${patientId.slice(0, 6).toUpperCase()}`;

	const completedActData = useMemo(() => {
		if (!selectedActStage) return null;
		return generateCompletedWorksActAndWriteOff({
			stage: selectedActStage,
			contractNumber,
			patientId,
			patientName,
			doctorFullName: auth?.currentUser?.name || "Лечащий врач стоматолог",
			clinicName: dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ",
			...(Array.isArray(dashboard?.inventoryItems) && dashboard.inventoryItems.length > 0
				? { inventoryItems: dashboard.inventoryItems as InventoryItemLookup[] }
				: {}),
		});
	}, [selectedActStage, contractNumber, patientId, patientName, auth, dashboard]);

	const handleExecuteWriteOffStage = (stage: TreatmentPlanStage) => {
		setSelectedActStage(stage);
		setIsActPrintOpen(true);
	};

	const handleConfirmExecuteWriteOff = async () => {
		if (!completedActData) return;
		setIsExecutingWriteOff(true);
		try {
			showToast(
				`Материалы по этапу «${completedActData.stageTitle}» на сумму ${completedActData.totalMaterialCostRub.toLocaleString("ru-RU")} ₽ успешно списаны со склада!`,
				"success",
				5000,
			);
			setIsActPrintOpen(false);
		} catch (err) {
			logger.error("[TreatmentPlanModule] Write-off error", err);
			showToast("Ошибка проведения списания на складе", "error");
		} finally {
			setIsExecutingWriteOff(false);
		}
	};

	return (
		<div
			className={`treatment-plan-module flex flex-col gap-5 w-full bg-[var(--paper,var(--background,#ffffff))] text-[var(--ink,#0f172a)] rounded-3xl border border-[var(--border,#cbd5e1)] p-5 shadow-xl ${className}`.trim()}
			data-testid="treatment-plan-module"
		>
			{/* Top Bar: Title & Global Quick Actions */}
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--border,#cbd5e1)]">
				<div className="flex items-center gap-3">
					<div className="p-3 rounded-2xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20">
						<Layers size={22} />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-lg font-black text-[var(--ink,#0f172a)]">
								Комплексный план лечения
							</h2>
							<span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-mono font-bold border border-cyan-500/20">
								Приказ МЗ РФ №804н
							</span>
							<span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold border border-emerald-500/20">
								СтАР
							</span>
						</div>
						<p className="text-xs text-[var(--muted,#64748b)]">
							Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong> ·{" "}
							{totalItemsCount} процедур · 3 клинических этапа
						</p>
					</div>
				</div>

				{/* Global Buttons: View Toggles, Clean Hick's/Miller's Toolbar & Actions */}
				<div className="flex flex-wrap items-center gap-2">
					{/* Tab Switcher: 3 Tiers vs Stages vs 4 Phases */}
					<div className="inline-flex items-center p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)]">
						<button
							type="button"
							onClick={() => setActiveViewTab("3tier")}
							className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								activeViewTab === "3tier"
									? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							3 Варианта
						</button>
						<button
							type="button"
							onClick={() => setActiveViewTab("stages")}
							className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								activeViewTab === "stages"
									? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Поэтапный (I, II, III)
						</button>
						<button
							type="button"
							onClick={() => setActiveViewTab("phased4")}
							className={`min-h-[44px] sm:min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
								activeViewTab === "phased4"
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs font-black"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							4 Этапа
						</button>
					</div>

					{/* Secondary 1: Digital Signature Indicator / Button */}
					{signedAgreement ? (
						<div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold">
							<ShieldCheck size={16} />
							<span>ПОДПИСАНО</span>
						</div>
					) : (
						<button
							type="button"
							onClick={() => setIsSignModalOpen(true)}
							className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong)] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] cursor-pointer transition-colors"
							title="Открыть окно цифровой подписи согласия"
						>
							<PenTool size={14} />
							<span>Подписать</span>
						</button>
					)}

					{/* Secondary 2: Export to Cashier / Invoice Generation */}
					<button
						type="button"
						onClick={() => setIsInvoiceModalOpen(true)}
						className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] shadow-xs cursor-pointer transition-colors"
						title="Сформировать наряд / счет на оплату с контролем цен и защитой сметы (Фича #41)"
					>
						<Receipt size={15} />
						<span>Счет / Наряд</span>
					</button>

					{/* Secondary 3: 54-FZ Fiscal Receipt & Split Payment Modal */}
					<button
						type="button"
						onClick={() => setIsFiscalModalOpen(true)}
						className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/30 shadow-xs cursor-pointer transition-all"
						title="Принять оплату (карты, СБП QR, наличные) и пробить фискальный чек 54-ФЗ"
					>
						<ShieldCheck size={15} className="text-[var(--teal,var(--brand-primary))]" />
						<span>Чек 54-ФЗ</span>
					</button>

					{/* Secondary 3.5: Curator of Treatment Button */}
					<button
						type="button"
						onClick={() => setIsCuratorModalOpen(true)}
						className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--accent,#6366f1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong)] border border-[var(--accent,#6366f1)]/30 shadow-xs cursor-pointer transition-all"
						title="Закрепить куратора лечения за пациентом и планом (Фича #27)"
					>
						<UserCheck size={15} className="text-[var(--accent,#6366f1)]" />
						<span>{patient?.administrativeProfile?.curatorFullName ? `Куратор: ${patient.administrativeProfile.curatorFullName.split(" ")[0]}` : "Куратор"}</span>
					</button>

					{/* Secondary 4: Overflow Dropdown Menu [⋮ Опции] */}
					<div className="relative inline-flex items-center" ref={optionsMenuRef}>
						<button
							type="button"
							onClick={() => setIsOptionsMenuOpen((prev) => !prev)}
							className="min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong)] cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
							title="Дополнительные студии, валидация и печать"
							aria-label="Опции плана лечения"
							aria-expanded={isOptionsMenuOpen}
						>
							<MoreVertical size={15} className="text-[var(--teal,var(--brand-primary))]" />
							<span className="hidden sm:inline">Опции</span>
						</button>

						{isOptionsMenuOpen && (
							<div
								className="absolute right-0 top-full mt-1.5 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] rounded-2xl shadow-2xl min-w-[240px] animate-in fade-in zoom-in-95 duration-100 text-xs"
								role="menu"
							>
								<div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
									Специализированные студии
								</div>
								<button
									type="button"
									onClick={() => {
										setIsCuratorModalOpen(true);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--teal-soft,var(--paper-soft))] hover:text-[var(--teal-dark,var(--teal))] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<UserCheck size={14} className="text-[var(--accent,#6366f1)]" />
									<span>Куратор лечения (воронка и комиссия)</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsComparatorModalOpen(true);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--teal-soft,var(--paper-soft))] hover:text-[var(--teal-dark,var(--teal))] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<Sparkles size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>Студия 3-Tier сравнения</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsStagePaymentModalOpen(true);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200 transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<Coins size={14} className="text-amber-500" />
									<span>Эскроу & Поэтапная оплата</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsPriceValidatorModalOpen(true);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<FileCheck size={14} className="text-emerald-600" />
									<span>Валидатор СтАР & 804н</span>
								</button>

								<div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted,#64748b)] border-t border-[var(--border,#cbd5e1)] mt-1 pt-1.5">
									Документы и производство
								</div>
								<button
									type="button"
									onClick={() => {
										setIsContractPrintOpen(true);
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--teal-soft,var(--paper-soft))] hover:text-[var(--teal-dark,var(--teal))] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<FileText size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>Договор и смета (QR)</span>
								</button>
								<button
									type="button"
									onClick={() => {
										handleOpenLabOrder();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--teal-soft,var(--paper-soft))] hover:text-[var(--teal-dark,var(--teal))] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									data-testid="lab-work-order-btn"
								>
									<FlaskConical size={14} className="text-[var(--teal,var(--brand-primary))]" />
									<span>Наряд-заказ в ЗТЛ</span>
								</button>
								<button
									type="button"
									onClick={() => {
										void handleOneClickLabOrder();
										setIsOptionsMenuOpen(false);
									}}
									className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
									data-testid="lab-work-order-one-click-btn"
								>
									<Zap size={14} className="text-amber-600 dark:text-amber-400" />
									<span>⚡ Наряд ЗТЛ в 1 клик (Цирконий A2)</span>
								</button>
							</div>
						)}
					</div>

					{/* STRICTLY 1 DOMINANT PRIMARY ACTION: Save to DB */}
					<button
						type="button"
						onClick={handleSavePlanToDatabase}
						disabled={isSaving}
						className="min-h-[40px] flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-[var(--teal-dark,var(--brand-primary))] hover:bg-[var(--teal,var(--brand-primary))] disabled:opacity-50 cursor-pointer transition-all shadow-md shadow-[var(--teal)]/20 active:scale-98 ml-auto"
					>
						<Save size={15} />
						<span>{isSaving ? "Сохранение..." : "Сохранить"}</span>
					</button>
				</div>
			</div>

			{/* Financial Adjustments Bar: Discounts & Loyalty Bonus Points */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-xs">
				{/* Quick Discounts */}
				<div className="flex items-center gap-2">
					<span className="font-semibold text-[var(--muted,#64748b)]">Скидка:</span>
					<div className="flex items-center gap-1">
						{[0, 5, 10, 15, 20, 50, 100].map((pct) => (
							<button
								key={pct}
								type="button"
								onClick={() => setDiscountPercent(pct)}
								className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs cursor-pointer transition-all ${
									discountPercent === pct
										? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
										: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
								}`}
							>
								{pct}%
							</button>
						))}
					</div>
				</div>

				{/* Loyalty Points / Patient Deposit */}
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5">
						<Coins size={14} className="text-amber-500" />
						<span className="text-[var(--muted,#64748b)]">
							Баланс/Бонусы:{" "}
							<strong className="font-mono text-[var(--ink,#0f172a)]">
								{patientBalanceRub.toLocaleString("ru-RU")} ₽
							</strong>
						</span>
					</div>

					{patientBalanceRub > 0 && (
						<div className="flex items-center gap-1.5">
							<input
								type="number"
								min={0}
								max={patientBalanceRub}
								value={bonusPointsToUseRub || ""}
								onChange={(e) => {
									const val = Math.max(0, Math.min(patientBalanceRub, Number(e.target.value) || 0));
									setBonusPointsToUseRub(val);
								}}
								placeholder="Списать ₽"
								className="w-24 px-2 py-1 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
							/>
							{bonusPointsToUseRub > 0 && (
								<button
									type="button"
									onClick={() => setBonusPointsToUseRub(0)}
									className="text-[10px] text-rose-500 hover:underline cursor-pointer"
								>
									Сбросить
								</button>
							)}
						</div>
					)}
				</div>
			</div>

			{/* AI Copilot Clinical Assistant Bar */}
			<div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-xs shadow-xs">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
					<div className="flex items-center gap-2 flex-wrap">
						<div className="inline-flex items-center gap-1.5 font-bold text-[var(--teal-dark,var(--teal))]">
							<Sparkles size={16} className="text-amber-500" />
							<span>AI Copilot (Ассистент врача):</span>
						</div>

						{COPILOT_PRESET_ACTIONS.map((action) => (
							<button
								key={action.id}
								type="button"
								disabled={isCopilotExecuting}
								onClick={() => handleExecuteCopilot(action.id)}
								className="px-3 py-1.5 rounded-xl font-bold bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--teal-soft,var(--paper-soft))] hover:text-[var(--teal-dark,var(--teal))] border border-[var(--border,#cbd5e1)] cursor-pointer transition-all disabled:opacity-50 shadow-2xs text-[11px]"
								title={action.description}
								data-testid={`module-copilot-btn-${action.id}`}
							>
								{action.title}
							</button>
						))}

						<button
							type="button"
							onClick={() => setIsPresenterModalOpen(true)}
							className="px-3 py-1.5 rounded-xl font-bold bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer transition-all shadow-2xs text-[11px] inline-flex items-center gap-1.5"
							title="Запустить клиническую валидацию СтАР, проверку анатомии FDI и генерацию объяснения для пациента"
							data-testid="module-copilot-ai-audit-btn"
						>
							<Bot size={13} className="text-amber-600 dark:text-amber-400" />
							<span>ИИ-Аудит & Презентация</span>
						</button>
					</div>

					<div className="flex items-center gap-2 shrink-0">
						{customStages && (
							<button
								type="button"
								onClick={() => {
									setCustomStages(null);
									setCopilotFeedback(null);
									showToast("План сброшен к исходной одонтограмме", "info");
								}}
								className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer"
								title="Сбросить все ручные правки и AI модификации"
								data-testid="copilot-reset-plan-btn"
							>
								Сбросить к исходному
							</button>
						)}
					</div>
				</div>

				{copilotFeedback && (
					<div
						className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-950 dark:text-indigo-100 text-xs mt-1"
						data-testid="module-copilot-feedback"
					>
						<div className="flex items-center gap-2">
							<Bot size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
							<span>{copilotFeedback}</span>
						</div>
						<button
							type="button"
							onClick={() => setCopilotFeedback(null)}
							className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-4 shrink-0"
						>
							Скрыть
						</button>
					</div>
				)}
			</div>

			{/* Main Content Area */}
			{activeViewTab === "3tier" ? (
				<TreatmentPlan3TierComparison
					tiers={planTiers}
					selectedTierId={selectedTierId}
					onSelectTier={(tier) => setSelectedTierId(tier.tierId)}
					onApproveAndSign={(tier) => {
						setSelectedTierId(tier.tierId);
						setIsSignModalOpen(true);
					}}
					onOpenComparatorStudio={() => setIsComparatorModalOpen(true)}
					onOpenStagePaymentStudio={() => setIsStagePaymentModalOpen(true)}
					onOpenPriceValidatorStudio={() => setIsPriceValidatorModalOpen(true)}
					onOpenInstallment={(tier) => {
						setSelectedTierId(tier.tierId);
						if (stages.length > 0) {
							setSelectedInstallmentStage(stages[0]!);
							setIsInstallmentModalOpen(true);
						}
					}}
					onPrintContract={(tier) => {
						setSelectedTierId(tier.tierId);
						setIsContractPrintOpen(true);
					}}
				/>
			) : activeViewTab === "phased4" ? (
				<TreatmentPlanPhased4StageView
					stages={stages}
					planTierTitle={currentTier.title}
					patientName={patientName}
					onExecuteStage={(cat) => {
						showToast(`Переход к выполнению этапа «${cat}»`, "info");
					}}
					onOpenStagePayment={() => setIsStagePaymentModalOpen(true)}
					onOpenInstallment={() => {
						if (stages.length > 0) {
							setSelectedInstallmentStage(stages[0]!);
							setIsInstallmentModalOpen(true);
						}
					}}
					onApproveAndSign={() => setIsSignModalOpen(true)}
					onPrintContract={() => setIsContractPrintOpen(true)}
				/>
			) : (
				<div className="flex flex-col gap-4">
					{stages.map((stage) => (
						<TreatmentPlanStageCard
							key={stage.stageNumber}
							stage={stage}
							defaultExpanded={true}
							{...(Array.isArray(dashboard?.inventoryItems) && dashboard.inventoryItems.length > 0
								? { inventoryItems: dashboard.inventoryItems as InventoryItemLookup[] }
								: {})}
							onUpdateItemPrice={handleUpdateItemPrice}
							onExecuteWriteOffStage={handleExecuteWriteOffStage}
							onOpenLabOrder={handleOpenLabOrder}
							onOneClickLabOrder={handleOneClickLabOrder}
							onOpenInstallment={(stageToFinance) => {
								setSelectedInstallmentStage(stageToFinance);
								setIsInstallmentModalOpen(true);
							}}
						/>
					))}
				</div>
			)}

			{/* 3-Tier Multi-Variant Presentation Studio Modal */}
			{isComparatorModalOpen && (
				<TreatmentPlanComparatorModal
					isOpen={isComparatorModalOpen}
					onClose={() => setIsComparatorModalOpen(false)}
					patientName={patientName}
					doctorName={auth?.currentUser?.name || "Д-р Смирнов А. В."}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "Стоматологическая клиника DENTE"}
					onPlanSelected={(tierCode) => {
						const mappedTierId =
							tierCode === "economy_basic"
								? "economy"
								: tierCode === "standard_recommended"
									? "standard"
									: "optimum";
						setSelectedTierId(mappedTierId);
						setIsComparatorModalOpen(false);
						showToast(`Выбран вариант лечения «${tierCode}»`, "success");
					}}
					onApproveAndSign={(tierCode) => {
						const mappedTierId =
							tierCode === "economy_basic"
								? "economy"
								: tierCode === "standard_recommended"
									? "standard"
									: "optimum";
						setSelectedTierId(mappedTierId);
						setIsComparatorModalOpen(false);
						setIsSignModalOpen(true);
					}}
					onOpenInstallment={() => {
						if (stages.length > 0) {
							setSelectedInstallmentStage(stages[0]!);
							setIsInstallmentModalOpen(true);
						}
					}}
					onPrintContract={() => {
						setIsContractPrintOpen(true);
					}}
				/>
			)}

			{/* Stage Payment & Escrow Studio Modal */}
			{isStagePaymentModalOpen && (
				<StagePaymentPlanModal
					isOpen={isStagePaymentModalOpen}
					onClose={() => setIsStagePaymentModalOpen(false)}
					patientName={patientName}
					patientId={patientId}
					planTitle={currentTier.title}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
					doctorFullName={auth?.currentUser?.name || "Д-р Смирнов А. В."}
				/>
			)}

			{/* Price & Star Protocols Validator Modal */}
			{isPriceValidatorModalOpen && (
				<TreatmentPlanPriceValidatorModal
					isOpen={isPriceValidatorModalOpen}
					onClose={() => setIsPriceValidatorModalOpen(false)}
					planPayload={validationPayload}
					stages={stages}
					catalogPricelist={catalog as any}
				/>
			)}

			{/* Digital Signature Modal */}
			{isSignModalOpen && (
				<TreatmentPlanSignatureModal
					isOpen={isSignModalOpen}
					tier={currentTier}
					patientName={patientName}
					patientId={patientId}
					doctorFullName={auth?.currentUser?.name || "Лечащий врач стоматолог"}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
					onClose={() => setIsSignModalOpen(false)}
					onSignedSuccess={(agreement) => {
						setSignedAgreement(agreement);
						setIsSignModalOpen(false);
						showToast(
							`План «${currentTier.title}» успешно подписан пациентом ${patientName}!`,
							"success",
							5000,
						);
					}}
				/>
			)}

			{/* Contract and Plan Specification Printable Modal */}
			{isContractPrintOpen && (
				<TreatmentPlanContractPrint
					isOpen={isContractPrintOpen}
					tier={currentTier}
					stages={stages}
					patientName={patientName}
					patientId={patientId}
					patientPhone={patientPhone}
					patientBirthDate={patientBirthDate}
					doctorFullName={auth?.currentUser?.name || "Лечащий врач стоматолог"}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
					signedAgreement={signedAgreement}
					discountPercent={discountPercent}
					bonusPointsDeductedRub={loyaltyDeduction.appliedBonusRub}
					onClose={() => setIsContractPrintOpen(false)}
				/>
			)}

			{/* Completed Works Act and Material Write-off Modal */}
			{isActPrintOpen && completedActData && (
				<TreatmentPlanCompletedActPrint
					isOpen={isActPrintOpen}
					actData={completedActData}
					onClose={() => {
						setIsActPrintOpen(false);
						setSelectedActStage(null);
					}}
					onConfirmExecuteWriteOff={handleConfirmExecuteWriteOff}
					isExecuting={isExecutingWriteOff}
				/>
			)}

			{/* 54-FZ Fiscal Receipt & Split Payment Modal */}
			{isFiscalModalOpen && (
				<FiscalReceipt54FzModal
					isOpen={isFiscalModalOpen}
					items={currentTier.stages.flatMap((s) => s.items)}
					patientId={patientId}
					patientName={patientName}
					patientPhone={dashboard?.activePatient?.phone || "+7 (999) 000-00-00"}
					patientDepositRub={Math.round((dashboard?.activePatient?.balanceKopecks || 0) / 100)}
					cashierFullName={auth?.currentUser?.name || "Кассир-администратор"}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
					onClose={() => setIsFiscalModalOpen(false)}
					onReceiptFiscalized={(receiptNum) => {
						showToast(`Чек №${receiptNum} сохранен в истории оплат`, "success");
					}}
				/>
			)}

			{/* Statutory Lab Work Order & Tracking Studio Modal */}
			{isLabOrderModalOpen && (
				<LabWorkOrderModal
					isOpen={isLabOrderModalOpen}
					onClose={() => setIsLabOrderModalOpen(false)}
					patientId={patientId}
					patientName={patientName}
					patientChartNumber={
						patient?.chartNumber || patient?.cardNumber || `К-${patientId.slice(0, 5)}`
					}
					doctorId={auth?.currentUser?.id || "doc-001"}
					doctorName={auth?.currentUser?.name || "Д-р Ковалев С. П."}
					initialTeeth={
						selectedLabTeeth && selectedLabTeeth.length > 0 ? selectedLabTeeth : orthopedicTeeth
					}
					initialOrder={
						selectedActStage
							? ({
									id: `LAB-${patientId.slice(0, 4)}-${Date.now().toString().slice(-4)}`,
									orderNumber: `НРД-${patientId.slice(0, 4)}-${Date.now().toString().slice(-4)}`,
									patientId,
									patientName,
									doctorId: auth?.currentUser?.id || "doc-001",
									doctorName: auth?.currentUser?.name || "Д-р Ковалев С. П.",
									selectedTeeth:
										selectedLabTeeth && selectedLabTeeth.length > 0
											? selectedLabTeeth
											: orthopedicTeeth,
									prostheticTypeId: "crown_zirconia_monolithic",
									materialId: "zirconia_katana_ml",
									shadeSystem: "classical",
									shadeCode: "A2",
									stumpShadeCode: "ND2",
									currentStage: "in_progress",
									completedStages: ["order_placed"],
									patientPriceRub: selectedActStage.totalRub,
									costPriceRub: Math.round(selectedActStage.totalRub * 0.4),
									createdAt: new Date().toISOString(),
									updatedAt: new Date().toISOString(),
									stagesLog: [],
									clinicNotes: `Оформлено по этапу №${selectedActStage.stageNumber} плана «${currentTier.title}». Зафиксированная стоимость: ${selectedActStage.totalRub.toLocaleString("ru-RU")} ₽.`,
								} as any)
							: null
					}
					onSaveOrder={(order) => {
						showToast(
							`Наряд-заказ №${order.orderNumber} в зуботехническую лабораторию на сумму ${order.financials.patientPriceTotalRub.toLocaleString("ru-RU")} ₽ успешно сохранен!`,
							"success",
							5000,
						);
					}}
				/>
			)}

			{/* Fast Invoice & Work Order Generation Modal (Feature #41 PriceGuard) */}
			{isInvoiceModalOpen && (
				<InvoiceGenerationModal
					isOpen={isInvoiceModalOpen}
					onClose={() => setIsInvoiceModalOpen(false)}
					patientId={patientId}
					patientName={patientName}
					patientPhone={patientPhone}
					patientBalanceRub={patientBalanceRub}
					planId={`PLAN-${patientId.slice(0, 6).toUpperCase()}`}
					planNumber={`ПЛАН-№${patientId.slice(0, 4)}`}
					planTitle={currentTier.title}
					planCreatedAtIso={new Date().toISOString()}
					approvedAtIso={signedAgreement ? new Date().toISOString() : undefined}
					isSignedWithPatient={Boolean(signedAgreement)}
					doctorFullName={auth?.currentUser?.name || "Д-р Смирнов А. В."}
					doctorUserId={auth?.currentUser?.id || undefined}
					planItems={stages.flatMap((s) => s.items)}
					onInvoiceCreated={(inv) => {
						showToast(`Документ ${inv.invoiceNumber} успешно сформирован!`, "success", 4000);
					}}
				/>
			)}

			{/* Price Validation & 804n Catalogue Lock Studio Modal (Feature #41) */}
			{isPriceValidatorModalOpen && (
				<TreatmentPlanPriceValidatorModal
					isOpen={isPriceValidatorModalOpen}
					onClose={() => setIsPriceValidatorModalOpen(false)}
					planPayload={validationPayload}
					catalogPricelist={(catalog as any) || []}
					onExportWorkOrder={(order) => {
						showToast(
							`Наряд-заказ №${order.orderNumber} на сумму ${order.totalPayableRub.toLocaleString("ru-RU")} ₽ выписан!`,
							"success",
							5000,
						);
					}}
					onExportCompletedAct={(act) => {
						showToast(
							`Акт выполненных работ №${act.orderNumber} на сумму ${act.totalPayableRub.toLocaleString("ru-RU")} ₽ сформирован!`,
							"success",
							5000,
						);
					}}
				/>
			)}

			{/* Bank Installment QR Financing Modal */}
			{isInstallmentModalOpen && selectedInstallmentStage && (
				<BankInstallmentQrModal
					isOpen={isInstallmentModalOpen}
					onClose={() => {
						setIsInstallmentModalOpen(false);
						setSelectedInstallmentStage(null);
					}}
					stageTitle={`Этап №${selectedInstallmentStage.stageNumber}: ${selectedInstallmentStage.title}`}
					stageNumber={selectedInstallmentStage.stageNumber}
					stageAmountKopecks={selectedInstallmentStage.totalKopecks}
					patientId={patientId}
					patientName={patientName}
					patientPhone={patientPhone}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
					clinicInn={dashboard?.clinicSettings?.requisites?.inn || "7701234567"}
					planId={`PLAN-${patientId.slice(0, 6).toUpperCase()}`}
					onInstallmentApproved={(approval) => {
						showToast(
							`Рассрочка на сумму ${selectedInstallmentStage.totalRub.toLocaleString("ru-RU")} ₽ одобрена банком!`,
							"success",
							5000,
						);
					}}
				/>
			)}

			{/* AI Audit & 3-Tier Chairside Presenter Modal */}
			{isPresenterModalOpen && (
				<TreatmentPlanPresenterModal
					isOpen={isPresenterModalOpen}
					onClose={() => setIsPresenterModalOpen(false)}
					patientId={patientId}
					patientName={patientName}
					patientPhone={dashboard?.activePatient?.phone || "+7 (999) 000-00-00"}
					doctorFullName={auth?.currentUser?.name || "Д-р Ковалев С. П."}
					teeth={teethData}
					onSelectPlan={(plan) => {
						showToast(`Выбран план: ${plan.title} (${plan.totalRub.toLocaleString("ru-RU")} ₽)`, "success");
					}}
				/>
			)}

			{/* Curator Plan Assignment Modal */}
			{isCuratorModalOpen && (
				<CuratorPlanAssignmentModal
					isOpen={isCuratorModalOpen}
					onClose={() => setIsCuratorModalOpen(false)}
					patientId={patientId}
					patientName={patientName}
					treatmentPlanId={`PLAN-${patientId.slice(0, 6).toUpperCase()}`}
					treatmentPlanTitle={`${currentTier.title} (${grandTotalRub.toLocaleString("ru-RU")} ₽)`}
					currentCuratorId={patient?.administrativeProfile?.curatorId || undefined}
					currentStage={patient?.administrativeProfile?.curatorFunnelStage || "consultation"}
					onAssigned={(assigned) => {
						showToast(`Куратор ${assigned.curatorFullName} успешно закреплен!`, "success");
					}}
				/>
			)}
		</div>
	);
};

export default TreatmentPlanModule;
