/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyWalletHistoryRow.tsx
 * Single transaction record row in family wallet history.
 * Mandate 8b: strictly <= 120 lines.
 */

import {
	ArrowDownRight,
	ArrowRightLeft,
	ArrowUpRight,
	Receipt,
} from "lucide-react";
import React from "react";
import { money } from "../../../../AppHelpers";
import type { FamilyTransactionItem } from "./types";

export interface FamilyWalletHistoryRowProps {
	readonly tx: FamilyTransactionItem;
}

export const FamilyWalletHistoryRow: React.FC<FamilyWalletHistoryRowProps> =
	React.memo(function FamilyWalletHistoryRow({ tx }) {
		const isTopup = tx.operationType === "topup";
		const isSpend = tx.operationType === "spend";
		const isTransfer = tx.operationType === "transfer";

		return (
			<div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[var(--paper-soft)] transition-colors">
				<div className="flex items-center gap-2.5 min-w-0">
					<div
						className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
							isTopup
								? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
								: isSpend
									? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
									: "bg-blue-500/15 text-blue-700 dark:text-blue-300"
						}`}
					>
						{isTopup && <ArrowUpRight className="w-4 h-4" />}
						{isSpend && <ArrowDownRight className="w-4 h-4" />}
						{isTransfer && <ArrowRightLeft className="w-4 h-4" />}
						{!isTopup && !isSpend && !isTransfer && (
							<Receipt className="w-4 h-4" />
						)}
					</div>

					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="text-xs font-semibold text-[var(--ink)]">
								{isTopup && "Пополнение семейного счета"}
								{isSpend && "Оплата стоматологического лечения"}
								{isTransfer && "Внутрисемейный перевод"}
							</span>
							<span className="text-[10px] text-[var(--muted)]">{tx.date}</span>
						</div>
						<p className="text-[11px] text-[var(--muted)] m-0 truncate">
							{tx.payerName && `Плательщик: ${tx.payerName}`}
							{tx.targetName && ` → За: ${tx.targetName}`}
							{tx.note && ` • ${tx.note}`}
						</p>
					</div>
				</div>

				<div className="text-left sm:text-right shrink-0">
					<span
						className={`text-sm font-bold block ${
							isTopup
								? "text-teal-700 dark:text-teal-300"
								: isSpend
									? "text-rose-600 dark:text-rose-400"
									: "text-[var(--ink)]"
						}`}
					>
						{isTopup ? "+" : isSpend ? "−" : ""}
						{money(tx.amountRub)}
					</span>
					{tx.method && (
						<span className="text-[10px] text-[var(--muted)] block">
							{tx.method}
						</span>
					)}
				</div>
			</div>
		);
	});
