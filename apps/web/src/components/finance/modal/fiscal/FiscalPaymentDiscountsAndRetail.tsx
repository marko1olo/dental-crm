import React from "react";
import {
	Building2,
	CheckCircle2,
	Coins,
	Copy,
	CreditCard,
	FileText,
	Layers,
	MoreHorizontal,
	Printer,
	Settings2,
	ShieldCheck,
	ShoppingBag,
	Sparkles,
	X,
} from "lucide-react";
import {
	parseChestnyZnakDataMatrix,
	RECEPTION_RETAIL_CATALOG,
	STOMX_CASH_BOXES,
	STOMX_CASH_RECEIPT_CATEGORIES,
	type RetailProductItem,
	type StomxCashBoxType,
	type StomxReceiptTypeAlias,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import {
	mapTreatmentItemsToFiscalReceipt,
	TREATMENT_STAGE_LABELS,
} from "../../order804nFiscalEngine";
import type { LoyaltyDiscountPreset } from "../../fiscal/fiscal54fzEngine";
import { formatMoneyRu } from "./fiscalModalRefundLogic";

export interface FiscalPaymentDiscountsAndRetailProps {
	readonly isOverflowMenuOpen: boolean;
	readonly setIsOverflowMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handlePrintSalesSlip: () => Promise<void>;
	readonly handleManualCardTerminalConfirm: () => Promise<void>;
	readonly isSubmittingManualCard: boolean;
	readonly handleRetryFiscalizationWithoutBalanceImpact: () => Promise<void>;
	readonly isFiscalizing: boolean;
	readonly showStomxSettings: boolean;
	readonly setShowStomxSettings: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handleCopyActData: () => void;
	readonly handleCopyCertData: () => void;
	readonly selectedReceiptAlias: StomxReceiptTypeAlias;
	readonly setSelectedReceiptAlias: (v: StomxReceiptTypeAlias) => void;
	readonly selectedCashBoxType: StomxCashBoxType;
	readonly setSelectedCashBoxType: (v: StomxCashBoxType) => void;
	readonly setIsRetailModalOpen: (v: boolean) => void;
	readonly handleAddRetailProduct: (product: RetailProductItem, qty: number) => void;
	readonly additionalRetailItems: readonly TreatmentPlanItem[];
	readonly handleRemoveRetailItem: (id: string) => void;
	readonly availableStages: readonly string[];
	readonly selectedStageKind: string;
	readonly handleSelectStage: (stage: string) => void;
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly items: readonly TreatmentPlanItem[];
	readonly fiscalData: ReturnType<typeof mapTreatmentItemsToFiscalReceipt>;
	readonly mdlpCodes: Record<string, string>;
	readonly handleUpdateMdlpCode: (itemId: string, code: string) => void;
	readonly selectedDiscountPreset: LoyaltyDiscountPreset;
	readonly setSelectedDiscountPreset: (p: LoyaltyDiscountPreset) => void;
	readonly customDiscountPercent: number;
	readonly setCustomDiscountPercent: (pct: number) => void;
	readonly setCustomDiscountRub: (rub: number) => void;
	readonly totalSumRub: number;
}

export const FiscalPaymentDiscountsAndRetail: React.FC<FiscalPaymentDiscountsAndRetailProps> = ({
	isOverflowMenuOpen,
	setIsOverflowMenuOpen,
	handlePrintSalesSlip,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
	handleRetryFiscalizationWithoutBalanceImpact,
	isFiscalizing,
	showStomxSettings,
	setShowStomxSettings,
	handleCopyActData,
	handleCopyCertData,
	selectedReceiptAlias,
	setSelectedReceiptAlias,
	selectedCashBoxType,
	setSelectedCashBoxType,
	setIsRetailModalOpen,
	handleAddRetailProduct,
	additionalRetailItems,
	handleRemoveRetailItem,
	availableStages,
	selectedStageKind,
	handleSelectStage,
	activeItems,
	items,
	fiscalData,
	mdlpCodes,
	handleUpdateMdlpCode,
	selectedDiscountPreset,
	setSelectedDiscountPreset,
	customDiscountPercent,
	setCustomDiscountPercent,
	setCustomDiscountRub,
	totalSumRub,
}) => {
	return (
		<>
			{/* Top Bar: Operations Popover & StomX Quick Requisites */}
			<div className="flex items-center justify-between gap-2 flex-wrap pb-1">
				<div className="text-xs text-[var(--muted,#64748b)] font-bold flex items-center gap-1.5">
					<Coins size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Кассовая операция</span>
				</div>

				{/* Secondary Actions / Overflow Menu Button («...») */}
				<div className="relative">
					<button
						type="button"
						onClick={() => setIsOverflowMenuOpen((prev) => !prev)}
						className="h-8 px-2.5 rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
						title="Дополнительные операции: товарный чек, ручное подтверждение, статья ДДС"
						data-testid="btn-payment-overflow-menu"
					>
						<MoreHorizontal size={15} />
						<span>Опции...</span>
					</button>

					{isOverflowMenuOpen && (
						<div className="absolute right-0 top-full mt-1.5 w-72 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] shadow-2xl p-2 z-40 space-y-1 text-xs">
							<div className="px-2.5 py-1 text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider">
								Дополнительные операции
							</div>
							<button
								type="button"
								onClick={() => {
									setIsOverflowMenuOpen(false);
									void handlePrintSalesSlip();
								}}
								className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
								data-testid="overflow-print-sales-slip"
							>
								<FileText size={14} className="text-teal-600 shrink-0" />
								<span>Товарный чек (без отправки в налоговую)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsOverflowMenuOpen(false);
									void handleManualCardTerminalConfirm();
								}}
								disabled={isSubmittingManualCard}
								className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2 cursor-pointer transition-colors"
								data-testid="overflow-manual-card-confirm"
							>
								<CreditCard size={14} className="text-blue-600 shrink-0" />
								<span>Подтвердить терминал вручную</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsOverflowMenuOpen(false);
									void handleRetryFiscalizationWithoutBalanceImpact();
								}}
								disabled={isFiscalizing}
								className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 cursor-pointer transition-colors"
								data-testid="overflow-retry-fiscal"
							>
								<Printer size={14} className="text-emerald-600 shrink-0" />
								<span>Повторить чек без баланса</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setShowStomxSettings((prev) => !prev);
									setIsOverflowMenuOpen(false);
								}}
								className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
							>
								<Settings2 size={14} className="text-amber-600 shrink-0" />
								<span>{showStomxSettings ? "Скрыть кассу и ДДС" : "Настроить кассу и ДДС"}</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsOverflowMenuOpen(false);
									handleCopyActData();
								}}
								className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
							>
								<Copy size={14} className="text-slate-500 shrink-0" />
								<span>Копировать текст акта</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsOverflowMenuOpen(false);
									handleCopyCertData();
								}}
								className="w-full h-8 px-2.5 rounded-lg font-bold text-left text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
							>
								<Copy size={14} className="text-indigo-500 shrink-0" />
								<span>Копировать данные справки ФНС</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* StomX Cash Flow (ДДС) & Cash Box Selector */}
			<div className={`p-2.5 rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] ${showStomxSettings ? "space-y-2" : "flex items-center justify-between flex-wrap gap-2"}`} data-testid="stomx-cash-flow-payment-bar">
				<div className="flex items-center gap-2 flex-wrap">
					<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink,#0f172a)] uppercase tracking-wider">
						<Coins size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>ДДС:</span>
					</div>
					<select
						value={selectedReceiptAlias}
						onChange={(e) => setSelectedReceiptAlias(e.target.value as StomxReceiptTypeAlias)}
						className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] outline-none cursor-pointer max-w-[200px] truncate"
						data-testid="select-receipt-category-all"
					>
						{STOMX_CASH_RECEIPT_CATEGORIES.map((cat) => (
							<option key={cat.id} value={cat.alias}>
								{cat.name} ({cat.ffdCalculationSubject === 4 ? "Услуга" : cat.ffdCalculationSubject === 1 ? "Товар" : cat.ffdCalculationSubject === 3 ? "Аванс" : "Внереализ."})
							</option>
						))}
					</select>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1.5 text-xs text-[var(--muted,#64748b)]">
						<Building2 size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Касса:</span>
						<select
							value={selectedCashBoxType}
							onChange={(e) => setSelectedCashBoxType(e.target.value as StomxCashBoxType)}
							className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] outline-none cursor-pointer"
							data-testid="select-stomx-cashbox-payment"
						>
							{STOMX_CASH_BOXES.map((b) => (
								<option key={b.id} value={b.type}>
									{b.name} ({b.isCashless ? "Безнал" : "Нал"})
								</option>
							))}
						</select>
					</div>
				</div>

				{/* 1-Click Fast Category Pills when expanded */}
				{showStomxSettings && (
					<div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--border,#cbd5e1)]">
						{STOMX_CASH_RECEIPT_CATEGORIES.slice(0, 5).map((cat) => (
							<button
								key={cat.id}
								type="button"
								onClick={() => setSelectedReceiptAlias(cat.alias)}
								className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
									selectedReceiptAlias === cat.alias
										? "bg-teal-600 text-white shadow-2xs"
										: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] hover:border-teal-400"
								}`}
								data-testid={`btn-receipt-cat-${cat.alias}`}
							>
								<span>{cat.name}</span>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Reception Retail Showcase & Gift Certificates Button */}
			<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2.5" data-testid="reception-retail-showcase-bar">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
						<ShoppingBag size={14} className="text-teal-600 dark:text-teal-400" />
						<span>Сопутствующие товары (зубные пасты, щетки):</span>
					</div>
					<button
						type="button"
						onClick={() => setIsRetailModalOpen(true)}
						className="h-7 px-3 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs"
						data-testid="btn-open-retail-showcase"
					>
						<ShoppingBag size={13} />
						<span>+ Добавить товар / сертификат</span>
					</button>
				</div>

				{/* Quick-add chips for most popular items */}
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold mr-0.5">Быстро:</span>
					<button
						type="button"
						onClick={() => {
							const item = RECEPTION_RETAIL_CATALOG.find((p) => p.id === "curaprox-cs-5460");
							if (item) handleAddRetailProduct(item, 1);
						}}
						className="h-6 px-2 rounded-md text-[11px] font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 cursor-pointer transition-all"
						title="Curaprox CS 5460 (1200 ₽, НДС 20%)"
						data-testid="btn-quick-add-curaprox"
					>
						+ Curaprox 5460 (1200 ₽)
					</button>
					<button
						type="button"
						onClick={() => {
							const item = RECEPTION_RETAIL_CATALOG.find((p) => p.id === "marvis-mint-85");
							if (item) handleAddRetailProduct(item, 1);
						}}
						className="h-6 px-2 rounded-md text-[11px] font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 cursor-pointer transition-all"
						title="Marvis Mint 85ml (1150 ₽, НДС 20%)"
						data-testid="btn-quick-add-marvis"
					>
						+ Marvis Mint (1150 ₽)
					</button>
					<button
						type="button"
						onClick={() => {
							const item = RECEPTION_RETAIL_CATALOG.find((p) => p.id === "biorepair-total-75");
							if (item) handleAddRetailProduct(item, 1);
						}}
						className="h-6 px-2 rounded-md text-[11px] font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 cursor-pointer transition-all"
						title="Biorepair Total 75ml (950 ₽, НДС 20%)"
						data-testid="btn-quick-add-biorepair"
					>
						+ Biorepair (950 ₽)
					</button>
					<button
						type="button"
						onClick={() => {
							const item = RECEPTION_RETAIL_CATALOG.find((p) => p.id === "gift-cert-5000");
							if (item) handleAddRetailProduct(item, 1);
						}}
						className="h-6 px-2 rounded-md text-[11px] font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-500/30 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/60 cursor-pointer transition-all"
						title="Подарочный сертификат 5000 ₽ (Аванс, Без НДС)"
						data-testid="btn-quick-add-cert-5000"
					>
						+ Сертификат 5000 ₽
					</button>
				</div>

				{/* List of added retail items with delete buttons */}
				{additionalRetailItems.length > 0 && (
					<div className="pt-2 border-t border-[var(--border,#cbd5e1)] space-y-1">
						<div className="text-[11px] font-semibold text-[var(--muted,#64748b)]">
							Добавлено в текущий чек с витрины ({additionalRetailItems.length}):
						</div>
						<div className="space-y-1">
							{additionalRetailItems.map((rItem) => (
								<div
									key={rItem.id}
									className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)]"
								>
									<span className="truncate pr-2 font-medium">
										{rItem.name} ({rItem.quantity} шт. × {rItem.unitPriceRub} ₽)
									</span>
									<div className="flex items-center gap-2 shrink-0">
										<span className="font-bold font-mono">
											{formatMoneyRu(rItem.priceRub)}
										</span>
										<button
											type="button"
											onClick={() => handleRemoveRetailItem(rItem.id)}
											className="text-rose-500 hover:text-rose-700 cursor-pointer p-0.5"
											title="Удалить из чека"
											data-testid={`btn-remove-retail-${rItem.id}`}
										>
											<X size={14} />
										</button>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* Stage Filter Chips */}
			{availableStages.length > 0 && (
				<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2">
					<div className="flex items-center justify-between text-xs font-bold">
						<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)] uppercase tracking-wider text-xs">
							<Layers size={14} className="text-teal-600 dark:text-teal-400" />
							Этап плана лечения для оплаты:
						</span>
						<span className="font-mono text-teal-700 dark:text-teal-300">
							Позиций: {activeItems.length}
						</span>
					</div>
					<div className="flex flex-wrap gap-1.5">
						<button
							type="button"
							onClick={() => handleSelectStage("all")}
							className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
								selectedStageKind === "all"
									? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
									: "bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-400"
							}`}
						>
							Все этапы ({formatMoneyRu(mapTreatmentItemsToFiscalReceipt(items).totalRub)})
						</button>
						{availableStages.map((st) => {
							const stageItems = items.filter((i) => (i.stageKind || i.category) === st);
							const stageSumRub = mapTreatmentItemsToFiscalReceipt(stageItems).totalRub;
							const label = TREATMENT_STAGE_LABELS[st] || st;
							return (
								<button
									key={st}
									type="button"
									onClick={() => handleSelectStage(st)}
									className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
										selectedStageKind === st
											? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
											: "bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-400"
									}`}
								>
									{label} ({formatMoneyRu(stageSumRub)})
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* MDLP DataMatrix Marking Code Capture Block */}
			{fiscalData.items.some((i) => i.isMarkedItem) && (
				<div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 space-y-2">
					<div className="flex items-center justify-between text-xs">
						<span className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
							<ShieldCheck size={16} className="text-amber-600" />
							Маркированные препараты (Честный ЗНАК)
						</span>
						<span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
							Маркировка
						</span>
					</div>
					<p className="text-xs text-amber-800 dark:text-amber-300">
						В счете присутствуют лекарственные препараты / имплантаты, подлежащие списанию при продаже.
					</p>
					<div className="space-y-2 pt-1">
						{fiscalData.items
							.filter((i) => i.isMarkedItem)
							.map((markedItem) => {
								const currentCode = mdlpCodes[markedItem.id] || "";
								const parseResult = currentCode ? parseChestnyZnakDataMatrix(currentCode) : null;
								return (
									<div
										key={markedItem.id}
										className="p-3 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-200 dark:border-amber-800/60 space-y-2"
									>
										<div className="flex items-center justify-between text-xs">
											<span className="font-bold text-[var(--ink,#0f172a)] truncate max-w-[280px]">
												{markedItem.name}
											</span>
											<span className="text-xs font-mono text-[var(--muted,#64748b)]">
												{formatMoneyRu(markedItem.amountRub)}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<input
												type="text"
												value={currentCode}
												onChange={(e) => handleUpdateMdlpCode(markedItem.id, e.target.value)}
												placeholder="Отсканируйте GS1 DataMatrix (01)...(21)..."
												className="min-h-[44px] flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
											/>
											{parseResult?.isValid ? (
												<span className="shrink-0 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1">
													<CheckCircle2 size={16} /> [М] ОК
												</span>
											) : currentCode ? (
												<span className="shrink-0 min-h-[44px] px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center">
													Ошибка GS1
												</span>
											) : null}
										</div>
									</div>
								);
							})}
					</div>
				</div>
			)}

			{/* Doctor Discounts & Round to Hundreds (Mandate 8e: Freedom of discounts without master passwords) */}
			<div className="p-3.5 rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-2.5" data-testid="doctor-discounts-bar">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span className="text-xs font-black text-[var(--ink,#0f172a)] uppercase tracking-wider">
							Скидка врача и округление:
						</span>
					</div>
					<button
						type="button"
						onClick={() => setSelectedDiscountPreset("round_hundreds")}
						className={`h-8 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
							selectedDiscountPreset === "round_hundreds"
								? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-400"
								: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
						}`}
						data-testid="btn-round-hundreds"
						title="Округлить сумму чека до сотен рублей (скидка на копейки в пользу пациента)"
					>
						<Sparkles className="w-3.5 h-3.5 shrink-0" />
						<span>Округлить до сотен рублей (скидка на копейки)</span>
					</button>
				</div>

				{/* Quick Discount Pills (3%, 5%, 10%, 100% Warranty, Manual, Reset) */}
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="text-xs text-[var(--muted,#64748b)] mr-1">Быстрые:</span>
					<button
						type="button"
						onClick={() => setSelectedDiscountPreset("discount_3")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							selectedDiscountPreset === "discount_3"
								? "bg-teal-600 text-white shadow-2xs"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
						}`}
						data-testid="btn-discount-3"
						title="Быстрая скидка 3% без мастер-паролей"
					>
						3%
					</button>
					<button
						type="button"
						onClick={() => setSelectedDiscountPreset("discount_5")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							selectedDiscountPreset === "discount_5"
								? "bg-teal-600 text-white shadow-2xs"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
						}`}
						data-testid="btn-discount-5"
						title="Быстрая скидка 5% без мастер-паролей"
					>
						5%
					</button>
					<button
						type="button"
						onClick={() => setSelectedDiscountPreset("discount_10")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							selectedDiscountPreset === "discount_10"
								? "bg-teal-600 text-white shadow-2xs"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
						}`}
						data-testid="btn-discount-10"
						title="Быстрая скидка 10% без мастер-паролей"
					>
						10%
					</button>
					<button
						type="button"
						onClick={() => setSelectedDiscountPreset("warranty_100")}
						className={`h-7 px-3 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
							selectedDiscountPreset === "warranty_100"
								? "bg-blue-600 text-white shadow-2xs"
								: "bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
						}`}
						data-testid="btn-discount-warranty"
						title="100% гарантийная переделка клинического этапа (к оплате 0 ₽)"
					>
						<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
						<span>100% Гарантия (Переделка)</span>
					</button>
					<button
						type="button"
						onClick={() => setSelectedDiscountPreset("colleague_100")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							selectedDiscountPreset === "colleague_100"
								? "bg-purple-600 text-white shadow-2xs"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
						}`}
						data-testid="btn-discount-colleague"
						title="100% скидка для коллег и персонала"
					>
						Персонал 100%
					</button>
					<button
						type="button"
						onClick={() => setSelectedDiscountPreset("manual_percent")}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							selectedDiscountPreset === "manual_percent"
								? "bg-teal-700 text-white shadow-2xs"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
						}`}
						data-testid="btn-discount-manual-percent"
					>
						Ручная %
					</button>
					<button
						type="button"
						onClick={() => {
							setSelectedDiscountPreset("none");
							setCustomDiscountPercent(0);
							setCustomDiscountRub(0);
						}}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
							selectedDiscountPreset === "none"
								? "bg-slate-700 text-white shadow-2xs"
								: "bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)]"
						}`}
						data-testid="btn-discount-none"
					>
						Сброс (0%)
					</button>
				</div>

				{/* Round-off 100 Rubles Clinical Notice Banner */}
				{selectedDiscountPreset === "round_hundreds" && (
					<div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between gap-2 flex-wrap" data-testid="round-hundreds-banner">
						<div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
							<Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
							<span>Округление до сотен: копейки списаны в пользу пациента. К оплате ровно {totalSumRub.toLocaleString("ru-RU")} ₽</span>
						</div>
						<span className="text-[11px] font-mono text-amber-700 dark:text-amber-300">
							Точность до копейки
						</span>
					</div>
				)}

				{/* Warranty 100% Clinical Notice Banner */}
				{selectedDiscountPreset === "warranty_100" && (
					<div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between gap-2 flex-wrap" data-testid="warranty-rework-banner">
						<div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
							<ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
							<span>100% Гарантийная переделка: стоимость услуг списана в 0 ₽</span>
						</div>
						<span className="text-[11px] font-mono text-blue-700 dark:text-blue-300">
							Чек 0 ₽ / Гарантия
						</span>
					</div>
				)}

				{/* Manual Percent Input */}
				{selectedDiscountPreset === "manual_percent" && (
					<div className="flex items-center gap-2 pt-1">
						<label className="text-xs font-semibold text-[var(--muted,#64748b)]">Процент скидки (%):</label>
						<input
							type="number"
							min={0}
							max={100}
							value={customDiscountPercent || ""}
							onChange={(e) => setCustomDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
							className="h-8 w-20 px-2 rounded-lg border border-[var(--border,#cbd5e1)] text-xs font-bold text-right"
							placeholder="0"
						/>
						<span className="text-xs font-bold">%</span>
					</div>
				)}
			</div>
		</>
	);
};
