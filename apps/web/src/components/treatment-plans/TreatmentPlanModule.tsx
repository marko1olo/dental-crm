/**
 * TreatmentPlanModule.tsx — главный модуль управления планами лечения и финансовой оценки DENTE CRM.
 */

import React, { useMemo, useState } from "react";
import {
	Calculator,
	Check,
	Coins,
	CreditCard,
	Download,
	FileDown,
	FileText,
	Layers,
	PenTool,
	Printer,
	Receipt,
	RefreshCw,
	Save,
	ShieldCheck,
	Sparkles,
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
import { TreatmentPlan3TierComparison } from "./TreatmentPlan3TierComparison";
import { TreatmentPlanContractPrint } from "./TreatmentPlanContractPrint";
import { TreatmentPlanCompletedActPrint } from "./TreatmentPlanCompletedActPrint";
import { TreatmentPlanSignatureModal } from "./TreatmentPlanSignatureModal";
import { TreatmentPlanStageCard } from "./TreatmentPlanStageCard";
import type {
	CashierInvoiceExportData,
	CompletedWorksActAndWriteOffData,
	DigitalSignatureAgreementData,
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "./types";

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
	const [activeViewTab, setActiveViewTab] = useState<"3tier" | "stages">("3tier");
	const [selectedTierId, setSelectedTierId] = useState<TreatmentPlanTierId>("optimum");
	const [discountPercent, setDiscountPercent] = useState<number>(0);
	const [bonusPointsToUseRub, setBonusPointsToUseRub] = useState<number>(0);
	const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
	const [isContractPrintOpen, setIsContractPrintOpen] = useState<boolean>(false);
	const [isActPrintOpen, setIsActPrintOpen] = useState<boolean>(false);
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

	// 2. Generate granular 3 clinical stages
	const stages = useMemo(() => {
		return generateTreatmentPlanStages(teethData, catalog, discountPercent);
	}, [teethData, catalog, discountPercent]);

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
		if (stages.length === 0 || totalItemsCount === 0) {
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
			// Send material write-off ledger event
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
					<div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
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
						</div>
						<p className="text-xs text-[var(--muted,#64748b)]">
							Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong> ·{" "}
							{totalItemsCount} процедур · 3 клинических этапа
						</p>
					</div>
				</div>

				{/* Global Buttons: View Toggles & Actions */}
				<div className="flex flex-wrap items-center gap-2">
					{/* Tab Switcher: 3 Tiers vs Stages */}
					<div className="inline-flex items-center p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)]">
						<button
							type="button"
							onClick={() => setActiveViewTab("3tier")}
							className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
								activeViewTab === "3tier"
									? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							3 Варианта (Сравнение)
						</button>
						<button
							type="button"
							onClick={() => setActiveViewTab("stages")}
							className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
								activeViewTab === "stages"
									? "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-xs"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
							}`}
						>
							Поэтапный план (Этапы I, II, III)
						</button>
					</div>

					{/* Digital Signature Indicator / Button */}
					{signedAgreement ? (
						<div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold">
							<ShieldCheck size={16} />
							<span>ПОДПИСАНО ПАЦИЕНТОМ</span>
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

					{/* Contract & Print Form Button */}
					<button
						type="button"
						onClick={() => setIsContractPrintOpen(true)}
						className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] shadow-xs cursor-pointer transition-colors"
						title="Открыть договор на оказание платных медицинских услуг и спецификацию"
					>
						<FileText size={15} className="text-teal-600 dark:text-teal-400" />
						<span>Договор и план</span>
					</button>

					{/* Export to Cashier Button */}
					<button
						type="button"
						onClick={handleExportCashier}
						className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
						title="Сформировать счет на оплату в кассу"
					>
						<Receipt size={15} />
						<span>Создать счет в кассу</span>
					</button>

					{/* Save to DB */}
					<button
						type="button"
						onClick={handleSavePlanToDatabase}
						disabled={isSaving}
						className="min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
					>
						<Save size={14} />
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
						{[0, 5, 10, 15, 20].map((pct) => (
							<button
								key={pct}
								type="button"
								onClick={() => setDiscountPercent(pct)}
								className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs cursor-pointer transition-all ${
									discountPercent === pct
										? "bg-teal-600 text-white shadow-xs"
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
							onExecuteWriteOffStage={handleExecuteWriteOffStage}
						/>
					))}
				</div>
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
		</div>
	);
};

