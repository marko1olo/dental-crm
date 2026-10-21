/**
 * apps/web/src/components/patients/family/familyWalletModal/FamilyWalletHistoryTable.tsx
 * History Table of Family Pooled Wallet Transactions.
 * Mandate 8b: strictly <= 120 lines.
 */

import { History } from "lucide-react";
import React from "react";
import { FamilyWalletHistoryRow } from "./FamilyWalletHistoryRow";
import type { FamilyTransactionItem } from "./types";

export interface FamilyWalletHistoryTableProps {
	readonly transactions: readonly FamilyTransactionItem[];
}

export const FamilyWalletHistoryTable: React.FC<FamilyWalletHistoryTableProps> =
	React.memo(function FamilyWalletHistoryTable({ transactions }) {
		if (transactions.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center p-8 text-center bg-[var(--paper)] rounded-xl border border-[var(--line)] shadow-2xs">
					<div className="w-12 h-12 rounded-full bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center mb-2">
						<History className="w-6 h-6" />
					</div>
					<h3 className="text-sm font-bold text-[var(--ink)] m-0">
						История операций пуста
					</h3>
					<p className="text-xs text-[var(--muted)] m-0 mt-1 max-w-sm">
						Все пополнения, списания за лечение родственников и внутрисемейные
						переводы фиксируются в общем журнале.
					</p>
				</div>
			);
		}

		return (
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
						История операций семьи ({transactions.length})
					</span>
					<span className="text-[11px] text-[var(--muted)]">
						Финансовый аудит
					</span>
				</div>

				<div className="border border-[var(--line)] rounded-xl divide-y divide-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs">
					{transactions.map((tx) => (
						<FamilyWalletHistoryRow key={tx.id} tx={tx} />
					))}
				</div>
			</div>
		);
	});
