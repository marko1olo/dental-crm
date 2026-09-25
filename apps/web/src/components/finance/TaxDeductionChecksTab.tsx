import React from "react";
import { Receipt } from "lucide-react";
import {
	resolveTaxDeductionCategoryShared,
	type TaxDeductionPaymentItem,
} from "./taxDeductionEngine";

export interface TaxDeductionChecksTabProps {
	selectedYear: number;
	yearPayments: readonly TaxDeductionPaymentItem[];
}

export const TaxDeductionChecksTab: React.FC<TaxDeductionChecksTabProps> = ({
	selectedYear,
	yearPayments,
}) => {
	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
					Кассовые чеки по 54-ФЗ и разделение по Номенклатуре 804н за {selectedYear} год:
				</span>
				<span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
					Всего чеков: {yearPayments.length} шт.
				</span>
			</div>

			{yearPayments.length === 0 ? (
				<div className="p-8 rounded-2xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-center space-y-2">
					<Receipt className="w-8 h-8 text-[var(--muted,#64748b)] mx-auto opacity-50" />
					<div className="text-xs font-bold text-[var(--ink,#0f172a)]">
						Нет кассовых чеков по 54-ФЗ за {selectedYear} год
					</div>
					<p className="text-[11px] text-[var(--muted,#64748b)] max-w-sm mx-auto m-0">
						Кассовые чеки с фискальными признаками документов (ФД и ФПД) появятся здесь автоматически после фискализации оплаты.
					</p>
				</div>
			) : (
				<div className="border border-[var(--line,#e2e8f0)] rounded-2xl overflow-hidden bg-[var(--paper,#ffffff)]">
					<table className="w-full text-xs text-left border-collapse">
						<thead className="bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] font-bold text-[var(--muted,#64748b)]">
							<tr>
								<th className="p-3">№</th>
								<th className="p-3">Дата чека</th>
								<th className="p-3">Чек / ФД</th>
								<th className="p-3">ФПД</th>
								<th className="p-3">Наименование услуги</th>
								<th className="p-3">Код 804н</th>
								<th className="p-3">Код вычета</th>
								<th className="p-3 text-right">Сумма (руб.)</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line,#e2e8f0)] font-medium">
							{yearPayments.map((p, idx) => {
								const code = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);
								const isCode02 = code === "2";
								return (
									<tr key={p.id} className="hover:bg-slate-500/5 transition-colors">
										<td className="p-3 font-mono text-[var(--muted,#64748b)]">{idx + 1}</td>
										<td className="p-3 font-mono">{p.dateIso.slice(0, 10)}</td>
										<td className="p-3 font-mono font-bold">
											{p.receiptNumber} / ФД №{p.fiscalDocumentNumber}
										</td>
										<td className="p-3 font-mono text-[11px] text-[var(--muted,#64748b)]">
											{p.fiscalSign}
										</td>
										<td className="p-3 max-w-[220px] truncate min-w-0" title={p.serviceName}>{p.serviceName}</td>
										<td className="p-3 font-mono font-bold text-teal-700 dark:text-teal-300">
											{p.code804n || "—"}
										</td>
										<td className="p-3">
											<span
												className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
													isCode02
														? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
														: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
												}`}
											>
												{isCode02 ? "Код 02 (Дорогостоящее)" : "Код 01 (Стандартное)"}
											</span>
										</td>
										<td className="p-3 text-right font-mono font-bold text-sm">
											{p.amountRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
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
};
