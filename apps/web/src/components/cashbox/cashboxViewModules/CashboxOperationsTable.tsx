/**
 * apps/web/src/components/cashbox/cashboxViewModules/CashboxOperationsTable.tsx
 *
 * Layer 4: Presentation Subcomponent for Shift Operations & Fiscal Receipts Table.
 * Pure vector icons (Lucide), 0 emojis, strict 32px desktop ergonomics.
 */

import React from "react";
import {
	Receipt,
	ArrowDownLeft,
	ArrowUpRight,
	CreditCard,
	Banknote,
	QrCode,
	Layers,
	FileText,
} from "lucide-react";
import type { CashboxOperationItem } from "./types.js";
import {
	formatCurrencyRub,
	getOperationTypeLabel,
	getPaymentMethodName,
} from "./cashboxConstants.js";

export interface CashboxOperationsTableProps {
	readonly operations?: readonly CashboxOperationItem[];
	readonly isShiftOpen: boolean;
	readonly onSelectOperation?: (op: CashboxOperationItem) => void;
}

export function CashboxOperationsTable({
	operations = [],
	isShiftOpen,
	onSelectOperation,
}: CashboxOperationsTableProps): React.JSX.Element {
	const hasOps = Array.isArray(operations) && operations.length > 0;

	return (
		<div className="bg-[var(--paper)] border border-[var(--line)] rounded-xl p-3 sm:p-4 shadow-xs">
			<div className="flex items-center justify-between gap-2 px-1 pb-2 border-b border-[var(--line)] mb-3">
				<div className="flex items-center gap-2">
					<Receipt className="w-4 h-4 text-[var(--teal,var(--brand-primary))] shrink-0" />
					<h3 className="text-sm font-bold text-[var(--ink)] m-0">
						Журнал операций смены
					</h3>
				</div>
				<span className="text-xs text-[var(--muted)]">
					{isShiftOpen ? "Смена открыта" : "Смена закрыта"}
				</span>
			</div>

			{!hasOps ? (
				<div className="text-center py-6 px-4 bg-[var(--paper-soft)] rounded-lg border border-dashed border-[var(--line)]">
					<FileText className="w-8 h-8 mx-auto text-[var(--muted)] opacity-50 mb-2" />
					<p className="text-xs font-medium text-[var(--muted)] m-0">
						За текущую кассовую смену операций не зафиксировано
					</p>
					<p className="text-[11px] text-[var(--muted)] opacity-75 mt-1 m-0">
						Все пробитые фискальные чеки, внесения и возвраты появятся здесь в реальном времени
					</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-xs text-left border-collapse">
						<thead>
							<tr className="border-b border-[var(--line)] text-[var(--muted)]">
								<th className="py-2 px-2.5 font-semibold">Время</th>
								<th className="py-2 px-2.5 font-semibold">Тип операции</th>
								<th className="py-2 px-2.5 font-semibold">Способ оплаты</th>
								<th className="py-2 px-2.5 font-semibold">Пациент / Основание</th>
								<th className="py-2 px-2.5 font-semibold text-right">Сумма</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line)]">
							{operations.map((op) => {
								const typeInfo = getOperationTypeLabel(op.type);
								return (
									<tr
										key={op.id}
										onClick={() => onSelectOperation?.(op)}
										className="hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
										style={{ height: 32 }}
									>
										<td className="py-1.5 px-2.5 font-mono text-[var(--muted)]">
											{op.time}
										</td>
										<td className="py-1.5 px-2.5">
											<span className={`inline-flex items-center gap-1 font-medium ${typeInfo.badgeClass}`}>
												{op.type === "payment" ? (
													<ArrowDownLeft className="w-3.5 h-3.5" />
												) : (
													<ArrowUpRight className="w-3.5 h-3.5" />
												)}
												<span>{typeInfo.label}</span>
											</span>
										</td>
										<td className="py-1.5 px-2.5">
											<span className="inline-flex items-center gap-1 text-[var(--ink)]">
												{op.method === "card" && <CreditCard className="w-3 h-3 text-[var(--muted)]" />}
												{op.method === "cash" && <Banknote className="w-3 h-3 text-[var(--muted)]" />}
												{op.method === "sbp" && <QrCode className="w-3 h-3 text-[var(--muted)]" />}
												{op.method === "split" && <Layers className="w-3 h-3 text-[var(--muted)]" />}
												<span>{getPaymentMethodName(op.method)}</span>
											</span>
										</td>
										<td className="py-1.5 px-2.5 text-[var(--ink)] truncate max-w-[200px]">
											{op.patientName || "—"}
										</td>
										<td className="py-1.5 px-2.5 text-right font-mono font-bold text-[var(--ink)]">
											{formatCurrencyRub(op.amountRub)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
