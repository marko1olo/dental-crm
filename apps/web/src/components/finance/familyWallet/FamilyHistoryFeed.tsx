import React from "react";
import { BookOpen, Printer, X } from "lucide-react";
import { money } from "../../../AppHelpers";
import type { FamilyHistoryFeedProps } from "./types";

export const FamilyHistoryFeed: React.FC<FamilyHistoryFeedProps> = ({
	isOpen,
	onClose,
	ledgerEntries,
	headFullName,
	onPrintLedger,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="mt-4 p-4 rounded-xl border border-teal-500/30 bg-[var(--paper-soft,#f8fafc)] space-y-3 animate-in fade-in duration-150"
			data-testid="family-ledger-container"
		>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<BookOpen size={18} className="text-teal-600" />
					<h4 className="font-extrabold text-xs sm:text-sm m-0 text-[var(--ink,#0f172a)]">
						Семейный гроссбух: история списаний и депозитов
					</h4>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onPrintLedger}
						className="min-h-[36px] px-3 rounded-lg border border-[var(--line,#cbd5e1)] text-xs font-bold flex items-center gap-1 hover:bg-[var(--paper,#ffffff)] cursor-pointer"
						title="Распечатать официальную выписку по семейному счету (А4)"
						data-testid="btn-print-family-ledger"
					>
						<Printer size={13} />
						<span>Печать выписки</span>
					</button>

					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--muted,#64748b)] cursor-pointer"
						aria-label="Скрыть гроссбух"
					>
						<X size={16} />
					</button>
				</div>
			</div>

			<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] overflow-hidden shadow-2xs">
				{ledgerEntries.length === 0 ? (
					<div className="p-6 text-center text-xs text-[var(--muted,#64748b)]">
						Операций по семейному кошельку в текущей сессии пока не зафиксировано.
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-xs text-left border-collapse">
							<thead className="bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)] font-bold border-b border-[var(--line,#e2e8f0)]">
								<tr>
									<th className="py-2.5 px-3">Дата/время</th>
									<th className="py-2.5 px-3">Тип</th>
									<th className="py-2.5 px-3">Плательщик</th>
									<th className="py-2.5 px-3">За кого</th>
									<th className="py-2.5 px-3">Основание</th>
									<th className="py-2.5 px-3 text-right">Сумма</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
								{ledgerEntries.map((entry) => {
									const isPlus =
										entry.entryType === "deposit" ||
										entry.entryType === "refund_deposit";
									return (
										<tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
											<td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
												{new Date(entry.createdAt).toLocaleDateString("ru-RU")}
											</td>
											<td className="py-2.5 px-3">
												<span
													className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
														isPlus
															? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
															: "bg-rose-500/15 text-rose-800 dark:text-rose-300"
													}`}
												>
													{entry.entryType === "deposit"
														? "Пополнение"
														: entry.entryType === "refund_deposit"
															? "Возврат на депозит"
															: "Списание"}
												</span>
											</td>
											<td className="py-2.5 px-3 font-medium">
												{entry.payerFullName || headFullName}
											</td>
											<td className="py-2.5 px-3 font-medium">
												{entry.targetPatientFullName || "—"}
											</td>
											<td
												className="py-2.5 px-3 text-[11px] text-[var(--muted,#64748b)] truncate max-w-[200px]"
												title={entry.notes}
											>
												{entry.actNumber || entry.visitId || entry.notes || "—"}
											</td>
											<td
												className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
													isPlus ? "text-emerald-600" : "text-rose-600"
												}`}
											>
												{isPlus ? "+" : "−"} {money(entry.amountRub)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};
