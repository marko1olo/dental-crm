/**
 * apps/web/src/components/patient/familyWalletModal/FamilyWalletHistoryTable.tsx
 *
 * Layer 4: History Table of Family Pooled Wallet Transactions.
 * Features:
 * - Details of who paid for whom.
 * - Exact kopecks accounting (money()).
 * - Operation tags (Пополнение, Оплата лечения, Перевод).
 * - Empty state without clown emojis (Mandates 8d, 8e).
 */

import React from "react";
import {
	ArrowDownRight,
	ArrowRightLeft,
	ArrowUpRight,
	History,
	Receipt,
} from "lucide-react";
import { money } from "../../../AppHelpers";
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
						Все пополнения, списания за лечение родственников и внутрисемейные переводы фиксируются в общем журнале.
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
						Финансовый аудит 54-ФЗ
					</span>
				</div>

				<div className="border border-[var(--line)] rounded-xl divide-y divide-[var(--line)] bg-[var(--paper)] overflow-hidden shadow-2xs">
					{transactions.map((tx) => {
						const isTopup = tx.operationType === "topup";
						const isSpend = tx.operationType === "spend";
						const isTransfer = tx.operationType === "transfer";

						return (
							<div
								key={tx.id}
								className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[var(--paper-soft)] transition-colors"
							>
								<div className="flex items-center gap-2.5 min-w-0">
									<div
										className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
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
											<span className="text-[10px] text-[var(--muted)]">
												{tx.date}
											</span>
										</div>

										<p className="text-[11px] text-[var(--muted)] m-0 truncate">
											{tx.payerName && `Плательщик: ${tx.payerName}`}
											{tx.targetName && ` → За: ${tx.targetName}`}
											{tx.note && ` • ${tx.note}`}
										</p>
									</div>
								</div>

								<div className="text-left sm:text-right shrink-0">
									<div
										className={`text-sm font-bold ${
											isTopup
												? "text-teal-600 dark:text-teal-400"
												: "text-[var(--ink)]"
										}`}
									>
										{isTopup ? `+${money(tx.amountRub)}` : `-${money(tx.amountRub)}`}
									</div>
									{tx.method && (
										<span className="text-[10px] text-[var(--muted)] block">
											{tx.method === "card" && "Банковская карта"}
											{tx.method === "cash" && "Наличные в кассу"}
											{tx.method === "sbp" && "СБП QR"}
											{tx.method === "pool" && "Семейный аванс"}
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		);
	});
