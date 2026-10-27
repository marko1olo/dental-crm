import React from "react";
import { Building2, Coins } from "lucide-react";
import {
	CASH_BOXES,
	CASH_RECEIPT_CATEGORIES,
	type CashBoxType,
	type CashReceiptTypeAlias,
} from "@dental/shared";

export interface PaymentCashFlowBarProps {
	readonly showSettings: boolean;
	readonly selectedReceiptAlias: CashReceiptTypeAlias;
	readonly setSelectedReceiptAlias: (v: CashReceiptTypeAlias) => void;
	readonly selectedCashBoxType: CashBoxType;
	readonly setSelectedCashBoxType: (v: CashBoxType) => void;
}

export const PaymentCashFlowBar: React.FC<PaymentCashFlowBarProps> = ({
	showSettings,
	selectedReceiptAlias,
	setSelectedReceiptAlias,
	selectedCashBoxType,
	setSelectedCashBoxType,
}) => {
	return (
		<div
			className={`p-2.5 rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] ${
				showSettings ? "space-y-2" : "flex items-center justify-between flex-wrap gap-2"
			}`}
			data-testid="cash-flow-payment-bar"
		>
			<div className="flex items-center gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink,#0f172a)] uppercase tracking-wider">
					<Coins size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>ДДС:</span>
				</div>
				<select
					value={selectedReceiptAlias}
					onChange={(e) => setSelectedReceiptAlias(e.target.value as CashReceiptTypeAlias)}
					className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] outline-none cursor-pointer max-w-[200px] truncate"
					data-testid="select-receipt-category-all"
				>
					{CASH_RECEIPT_CATEGORIES.map((cat) => (
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
						onChange={(e) => setSelectedCashBoxType(e.target.value as CashBoxType)}
						className="h-7 px-2 rounded-lg text-xs font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] outline-none cursor-pointer"
						data-testid="select-cashbox-payment"
					>
						{CASH_BOXES.map((b) => (
							<option key={b.id} value={b.type}>
								{b.name} ({b.isCashless ? "Безнал" : "Нал"})
							</option>
						))}
					</select>
				</div>
			</div>

			{showSettings && (
				<div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--border,#cbd5e1)]">
					{CASH_RECEIPT_CATEGORIES.slice(0, 5).map((cat) => (
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
	);
};
