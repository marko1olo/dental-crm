import React from "react";
import {
	Building2,
	Check,
	Coins,
	RotateCcw,
	Undo2,
	Wallet,
	X,
} from "lucide-react";
import {
	STOMX_CASH_BOXES,
	STOMX_CASH_EXPENSE_CATEGORIES,
	type StomxCashBoxType,
	type StomxExpenseTypeAlias,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import { formatMoneyRu } from "./fiscalModalRefundLogic";

export interface FiscalRefundTabProps {
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly patientDepositRub: number;
	readonly refundMode: "items" | "advance";
	readonly setRefundMode: (m: "items" | "advance") => void;
	readonly selectedCashBoxType: StomxCashBoxType;
	readonly setSelectedCashBoxType: (t: StomxCashBoxType) => void;
	readonly selectedExpenseAlias: StomxExpenseTypeAlias;
	readonly setSelectedExpenseAlias: (a: StomxExpenseTypeAlias) => void;
	readonly isAdvanceRefund: boolean;
	readonly refundAdvanceAmountRub: number;
	readonly setRefundAdvanceAmountRub: (amt: number) => void;
	readonly refundAdvancePurpose: string;
	readonly setRefundAdvancePurpose: (p: string) => void;
	readonly handleSelectAllRefundItems: () => void;
	readonly handleDeselectAllRefundItems: () => void;
	readonly refundItemSelection: Record<string, boolean>;
	readonly setRefundItemSelection: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
	readonly originalReceiptNumberForRefund: string;
	readonly setOriginalReceiptNumberForRefund: (n: string) => void;
	readonly refundReason: string;
	readonly setRefundReason: (r: string) => void;
	readonly handleExecuteFiscalization: () => Promise<void>;
	readonly isFiscalizing: boolean;
	readonly refundFiscalData: { readonly totalRub: number };
}

export const FiscalRefundTab: React.FC<FiscalRefundTabProps> = ({
	activeItems,
	patientDepositRub,
	refundMode,
	setRefundMode,
	selectedCashBoxType,
	setSelectedCashBoxType,
	selectedExpenseAlias,
	setSelectedExpenseAlias,
	isAdvanceRefund,
	refundAdvanceAmountRub,
	setRefundAdvanceAmountRub,
	refundAdvancePurpose,
	setRefundAdvancePurpose,
	handleSelectAllRefundItems,
	handleDeselectAllRefundItems,
	refundItemSelection,
	setRefundItemSelection,
	originalReceiptNumberForRefund,
	setOriginalReceiptNumberForRefund,
	refundReason,
	setRefundReason,
	handleExecuteFiscalization,
	isFiscalizing,
	refundFiscalData,
}) => {
	return (
		<div className="space-y-6">
			<div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800/60 flex items-start gap-3">
				<Undo2 size={24} className="text-rose-600 shrink-0 mt-0.5" />
				<div>
					<h4 className="font-extrabold text-sm text-rose-950 dark:text-rose-200">
						<span>Оформление чека возврата</span>
						<span className="sr-only">Формирование чека возврата прихода</span>
					</h4>
					<p className="text-xs text-rose-800 dark:text-rose-300 mt-1">
						Отметьте позиции, от которых пациент отказался, или оформите возврат аванса/депозита. Сумма возврата будет автоматически распределена с сохранением копеечной точности по методу наибольших остатков.
					</p>
				</div>
			</div>

			{/* Mode switcher if items exist */}
			{activeItems.length > 0 && (
				<div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] w-fit text-xs">
					<button
						type="button"
						onClick={() => setRefundMode("items")}
						data-testid="btn-refund-mode-items"
						className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
							refundMode === "items"
								? "bg-rose-600 text-white shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						По услугам плана ({activeItems.length})
					</button>
					<button
						type="button"
						onClick={() => setRefundMode("advance")}
						data-testid="btn-refund-mode-advance"
						className={`px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer ${
							refundMode === "advance"
								? "bg-rose-600 text-white shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]"
						}`}
					>
						Возврат аванса / по номеру чека
					</button>
				</div>
			)}

			{/* StomX Cash Expense (ДДС) & Cash Box Selector for Refund */}
			<div className="p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-[var(--paper-soft,#f8fafc)] space-y-2.5" data-testid="stomx-cash-flow-refund-bar">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-1.5 font-bold text-xs text-rose-950 dark:text-rose-200 uppercase tracking-wider">
						<Coins size={14} className="text-rose-600 shrink-0" />
						<span>Статья расхода ДДС и Касса клиники:</span>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-[var(--muted,#64748b)]">
						<Building2 size={13} className="text-rose-600 shrink-0" />
						<span>Касса:</span>
						<select
							value={selectedCashBoxType}
							onChange={(e) => setSelectedCashBoxType(e.target.value as StomxCashBoxType)}
							className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] outline-none cursor-pointer"
							data-testid="select-stomx-cashbox-refund"
						>
							{STOMX_CASH_BOXES.map((b) => (
								<option key={b.id} value={b.type}>
									{b.name} ({b.isCashless ? "Безнал" : "Нал"})
								</option>
							))}
						</select>
					</div>
				</div>

				{/* 1-Click Fast Expense Category Pills */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{STOMX_CASH_EXPENSE_CATEGORIES.slice(0, 5).map((cat) => (
						<button
							key={cat.id}
							type="button"
							onClick={() => setSelectedExpenseAlias(cat.alias)}
							className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
								selectedExpenseAlias === cat.alias
									? "bg-rose-600 text-white shadow-2xs"
									: "bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border border-[var(--border,#cbd5e1)] hover:border-rose-400"
							}`}
							data-testid={`btn-expense-cat-${cat.alias}`}
						>
							<span>{cat.name}</span>
						</button>
					))}
					<select
						value={selectedExpenseAlias}
						onChange={(e) => setSelectedExpenseAlias(e.target.value as StomxExpenseTypeAlias)}
						className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] outline-none cursor-pointer"
						data-testid="select-expense-category-all"
					>
						{STOMX_CASH_EXPENSE_CATEGORIES.map((cat) => (
							<option key={cat.id} value={cat.alias}>
								{cat.name} ({cat.isFiscalRefund ? "Чек возврата" : "Без чека"})
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Either Advance return form OR Items picker */}
			{isAdvanceRefund ? (
				<div
					className="space-y-4 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20"
					data-testid="refund-advance-container"
				>
					<div className="flex items-center gap-2 text-rose-950 dark:text-rose-200 font-bold text-xs sm:text-sm">
						<Wallet size={18} className="text-rose-600 shrink-0" />
						<span>Возврат аванса / денежных средств по чеку</span>
						<span className="sr-only">Возврат аванса / денежных средств по номеру фискального чека (54-ФЗ)</span>
					</div>
					<p className="text-xs text-rose-800 dark:text-rose-300">
						{activeItems.length === 0
							? "Услуги плана лечения не привязаны. Введите сумму к возврату и назначение платежа для печати чека возврата."
							: "Режим возврата аванса/депозита без изменения состава оказанных услуг плана лечения."}
					</p>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
								Сумма возврата (₽):
							</label>
							<input
								type="number"
								min="0"
								step="0.01"
								value={refundAdvanceAmountRub === 0 ? "" : refundAdvanceAmountRub}
								onChange={(e) => {
									const val = Number.parseFloat(e.target.value);
									setRefundAdvanceAmountRub(Number.isNaN(val) || val < 0 ? 0 : val);
								}}
								placeholder="0.00 ₽"
								data-testid="input-refund-advance-amount"
								className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-rose-500"
							/>
							{patientDepositRub > 0 && (
								<div className="mt-1.5 flex items-center gap-2">
									<span className="text-[11px] text-[var(--muted,#64748b)]">
										Доступный депозит: {formatMoneyRu(patientDepositRub)}
									</span>
									<button
										type="button"
										onClick={() => setRefundAdvanceAmountRub(patientDepositRub)}
										data-testid="btn-use-full-deposit-refund"
										className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
									>
										Заполнить всю сумму
									</button>
								</div>
							)}
						</div>
						<div>
							<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
								Назначение платежа:
							</label>
							<input
								type="text"
								value={refundAdvancePurpose}
								onChange={(e) => setRefundAdvancePurpose(e.target.value)}
								placeholder="Возврат аванса / денежных средств"
								data-testid="input-refund-advance-purpose"
								className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-rose-500"
							/>
						</div>
					</div>
				</div>
			) : (
				<div className="space-y-2">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
						<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)]">
							1. Выберите отменяемые услуги плана лечения:
						</h4>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={handleSelectAllRefundItems}
								data-testid="btn-refund-select-all"
								className="min-h-[32px] px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 dark:hover:bg-rose-900 border border-rose-300 dark:border-rose-800 transition-colors cursor-pointer flex items-center gap-1.5"
								title="Отметить все позиции для полного 100% возврата"
							>
								<Check size={14} />
								<span>Выбрать все позиции (100% возврат)</span>
							</button>
							<button
								type="button"
								onClick={handleDeselectAllRefundItems}
								data-testid="btn-refund-deselect-all"
								className="min-h-[32px] px-3 py-1.5 text-xs font-medium rounded-xl bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--muted,#64748b)] border border-[var(--border,#cbd5e1)] transition-colors cursor-pointer flex items-center gap-1.5"
								title="Снять выбор со всех позиций"
							>
								<X size={14} />
								<span>Снять выбор</span>
							</button>
						</div>
					</div>
					<div className="divide-y divide-[var(--border,#cbd5e1)] rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] overflow-hidden">
						{activeItems.map((item) => {
							const isSelected = refundItemSelection[item.id] ?? false;
							const itemRub = (item.unitPriceRub || item.priceRub || 0) * (item.quantity || 1) - (item.discountRub || 0);
							return (
								<label
									key={item.id}
									className="flex items-center justify-between p-3.5 hover:bg-[var(--paper-strong,var(--paper,#ffffff))] cursor-pointer transition-colors"
								>
									<div className="flex items-center gap-3">
										<input
											type="checkbox"
											checked={isSelected}
											onChange={(e) =>
												setRefundItemSelection((prev) => ({
													...prev,
													[item.id]: e.target.checked,
												}))
											}
											data-testid={`checkbox-refund-${item.id}`}
											className="w-5 h-5 rounded text-rose-600 accent-rose-600 cursor-pointer"
										/>
										<div>
											<span className="font-bold text-xs sm:text-sm text-[var(--ink,#0f172a)] block">
												{item.name} {item.toothNumber ? `(зуб №${item.toothNumber})` : ""}
											</span>
											<span className="text-xs text-[var(--muted,#64748b)]">
												{item.code804n ? `[${item.code804n}] · ` : ""}
												{item.quantity || 1} шт. × {formatMoneyRu(item.unitPriceRub || item.priceRub || 0)}
												{item.discountRub ? ` (- скидка ${formatMoneyRu(item.discountRub)})` : ""}
											</span>
										</div>
									</div>
									<span className="font-mono font-bold text-xs sm:text-sm text-rose-600 dark:text-rose-400">
										{formatMoneyRu(itemRub)}
									</span>
								</label>
							);
						})}
					</div>
				</div>
			)}

			{/* Refund details inputs */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
						Номер исходного чека продажи:
					</label>
					<input
						type="text"
						value={originalReceiptNumberForRefund}
						onChange={(e) => setOriginalReceiptNumberForRefund(e.target.value)}
						placeholder="CHK-2026-XXXXX"
						data-testid="input-refund-original-receipt"
						className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm font-mono rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
					/>
				</div>
				<div>
					<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
						Причина возврата (для журнала ККТ):
					</label>
					<input
						type="text"
						value={refundReason}
						onChange={(e) => setRefundReason(e.target.value)}
						placeholder="Отказ пациента / Коррекция"
						data-testid="input-refund-reason"
						className="w-full min-h-[44px] px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
					/>
				</div>
			</div>

			{/* Action: Execute Refund */}
			<button
				type="button"
				onClick={() => handleExecuteFiscalization()}
				disabled={isFiscalizing}
				title={
					isFiscalizing
						? "Идет фискализация возврата в ККТ..."
						: refundFiscalData.totalRub <= 0
							? "Укажите сумму возврата больше 0 ₽"
							: undefined
				}
				data-testid="btn-execute-refund"
				className="w-full min-h-[52px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-bold text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99]"
			>
				<RotateCcw size={18} />
				<span>
					{isFiscalizing
						? "Фискализация возврата..."
						: `Пробить чек возврата прихода на ${formatMoneyRu(refundFiscalData.totalRub)}`}
				</span>
			</button>
		</div>
	);
};
