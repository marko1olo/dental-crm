import React from "react";
import { Download, Printer, Users } from "lucide-react";
import {
	TAX_DEDUCTION_RELATIONSHIP_MAP,
	type generateFamilyTaxDeductionBatch,
} from "./taxDeductionEngine";

export interface TaxDeductionFamilyTabProps {
	selectedYear: number;
	paymentsCount: number;
	familyBatchResult: ReturnType<typeof generateFamilyTaxDeductionBatch>;
	onClose: () => void;
	onDownloadBatchNoMedoplXml: () => void;
	onDownloadBatchXml: () => void;
	onPrintBatch: () => void;
}

export const TaxDeductionFamilyTab: React.FC<TaxDeductionFamilyTabProps> = ({
	selectedYear,
	paymentsCount,
	familyBatchResult,
	onClose,
	onDownloadBatchNoMedoplXml,
	onDownloadBatchXml,
	onPrintBatch,
}) => {
	if (familyBatchResult.totalPaymentsCount === 0) {
		return (
			<div className="p-6 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-center space-y-3">
				<div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
					<Users className="w-6 h-6" />
				</div>
				<div className="space-y-1.5 max-w-md mx-auto">
					<h4 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0">
						Нет оплат за {selectedYear} год для распределения между членами семьи
					</h4>
					<p className="text-xs text-[var(--muted,#64748b)] m-0 leading-relaxed">
						{paymentsCount === 0
							? "В карточке пациента отсутствуют подтвержденные чеки по 54-ФЗ. Пакет справок на возврат НДФЛ для родственников формируется при наличии оплат."
							: `За ${selectedYear} год чеков не найдено. Выберите другой налоговый период в переключателе годов.`}
					</p>
				</div>
				<div className="flex items-center justify-center gap-2 pt-2">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-slate-500/10 cursor-pointer transition-colors"
					>
						Закрыть
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Family Banner */}
			<div className="p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<span className="px-2.5 py-0.5 rounded-md bg-teal-600 text-white text-[11px] font-bold tracking-wide">
							СПРАВКИ НА ВЫЧЕТ • {selectedYear} ГОД
						</span>
						<span className="text-xs font-mono text-[var(--muted,#64748b)]">
							Справок в пакете: {familyBatchResult.certificatesCount} шт.
						</span>
					</div>
					<h3 className="text-base sm:text-lg font-bold m-0 text-[var(--ink,#0f172a)]">
						Пакет справок на возврат НДФЛ для всей семьи
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)] m-0">
						Разделение сумм по Коду 01 (обычное лечение) и Коду 02 (дорогостоящее: имплантация, синус-лифтинг, остеопластика) с копеечной точностью.
					</p>
				</div>
				<div className="p-3.5 rounded-xl bg-[var(--paper,#ffffff)] border border-teal-500/40 text-right shadow-xs">
					<div className="text-[11px] uppercase tracking-wider text-[var(--muted,#64748b)] font-bold">
						Суммарный возврат 13% семьи
					</div>
					<div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
						+{familyBatchResult.grandTotalRefund13Rub.toLocaleString("ru-RU")} ₽
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						Всего расходов: {familyBatchResult.grandTotalRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
			</div>

			{/* Summary Breakdown Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<div className="p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
					<div className="text-xs text-[var(--muted,#64748b)] font-semibold">Код 01 (Обычное лечение)</div>
					<div className="text-lg font-bold font-mono text-teal-700 dark:text-teal-300 mt-1">
						{familyBatchResult.grandTotalCode01Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						Лимит: {selectedYear >= 2024 ? "150 000" : "120 000"} ₽ / чел.
					</div>
				</div>
				<div className="p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
					<div className="text-xs text-[var(--muted,#64748b)] font-semibold">Код 02 (Дорогостоящее лечение)</div>
					<div className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300 mt-1">
						{familyBatchResult.grandTotalCode02Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						Без ограничений (п. 4 Пост. № 458)
					</div>
				</div>
				<div className="p-4 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)]">
					<div className="text-xs text-[var(--muted,#64748b)] font-semibold">Чеков в базе за {selectedYear} г.</div>
					<div className="text-lg font-bold font-mono text-[var(--ink,#0f172a)] mt-1">
						{familyBatchResult.totalPaymentsCount} шт.
					</div>
					<div className="text-[11px] text-[var(--muted,#64748b)] mt-0.5">
						54-ФЗ с фискальными номерами и ФПД
					</div>
				</div>
			</div>

			{/* Family Certificates Table */}
			<div className="space-y-3">
				<div className="flex items-center justify-between flex-wrap gap-2">
					<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] m-0 flex items-center gap-2">
						<Users size={16} className="text-teal-600" />
						<span>Справки по членам семьи (плательщикам)</span>
					</h4>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onDownloadBatchNoMedoplXml}
							className="min-h-[38px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1 hover:bg-slate-500/10 cursor-pointer"
							title="Выгрузить пакет NO_MEDOPL 5.01"
						>
							<Download size={14} />
							<span>NO_MEDOPL (5.01)</span>
						</button>
						<button
							type="button"
							onClick={onDownloadBatchXml}
							className="min-h-[38px] px-3.5 rounded-xl border border-teal-600/40 text-teal-700 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5 hover:bg-teal-500/10 cursor-pointer"
						>
							<Download size={14} />
							<span>Пакет XML (ТКС)</span>
						</button>
						<button
							type="button"
							onClick={onPrintBatch}
							className="min-h-[38px] px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
						>
							<Printer size={14} />
							<span>Печать пакета А4</span>
						</button>
					</div>
				</div>

				<div className="rounded-2xl border border-[var(--line,#e2e8f0)] overflow-hidden bg-[var(--paper,#ffffff)] shadow-xs">
					<table className="w-full text-left border-collapse text-xs">
						<thead>
							<tr className="border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] font-bold text-[var(--muted,#64748b)]">
								<th className="p-3">Степень родства</th>
								<th className="p-3">Налогоплательщик (ФИО)</th>
								<th className="p-3 text-center">№ Справки</th>
								<th className="p-3 text-center">Чеков</th>
								<th className="p-3 text-right">Код 01 (Руб)</th>
								<th className="p-3 text-right">Код 02 (Руб)</th>
								<th className="p-3 text-right">Всего расходов</th>
								<th className="p-3 text-right font-bold text-emerald-600">Возврат 13%</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-[var(--line,#e2e8f0)]">
							{familyBatchResult.summaries.map((s) => (
								<tr key={s.relationship} className="hover:bg-teal-500/5 transition-colors">
									<td className="p-3 font-semibold">
										<span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
											{TAX_DEDUCTION_RELATIONSHIP_MAP[s.relationship].shortLabelRu}
										</span>
									</td>
									<td className="p-3 font-bold text-[var(--ink,#0f172a)]">{s.payerFullName}</td>
									<td className="p-3 text-center font-mono font-bold text-teal-700 dark:text-teal-300">
										№ {s.certificateNumber}
									</td>
									<td className="p-3 text-center font-mono">{s.receiptsCount}</td>
									<td className="p-3 text-right font-mono">
										{s.code01Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</td>
									<td className="p-3 text-right font-mono font-bold text-rose-700 dark:text-rose-300">
										{s.code02Rub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</td>
									<td className="p-3 text-right font-mono font-bold">
										{s.totalRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽
									</td>
									<td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
										+{s.refund13EstimateRub.toLocaleString("ru-RU")} ₽
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
