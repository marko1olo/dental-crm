import React from "react";
import { Copy, FileText, Printer } from "lucide-react";
import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import { numberToWordsRu } from "../../invoiceEngine";
import { formatMoneyRu } from "./fiscalModalRefundLogic";

export interface FiscalActTabProps {
	readonly actNumber: string;
	readonly setActNumber: (v: string) => void;
	readonly contractNumber: string;
	readonly setContractNumber: (v: string) => void;
	readonly cashierFullName: string;
	readonly clinicName: string;
	readonly patientName: string;
	readonly customerContact: string;
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly totalSumRub: number;
	readonly handleCopyActData: () => void;
}

export const FiscalActTab: React.FC<FiscalActTabProps> = ({
	actNumber,
	setActNumber,
	contractNumber,
	setContractNumber,
	cashierFullName,
	clinicName,
	patientName,
	customerContact,
	activeItems,
	totalSumRub,
	handleCopyActData,
}) => {
	return (
		<div className="space-y-6">
			{/* Act Controls */}
			<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-3">
				<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<FileText size={16} className="text-[var(--ok-fg,#059669)]" />
					Реквизиты Акта сдачи-приемки выполненных медицинских работ:
				</h4>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<div>
						<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
							Номер акта:
						</label>
						<input
							type="text"
							value={actNumber}
							onChange={(e) => setActNumber(e.target.value)}
							className="w-full min-h-[44px] px-3 py-2 text-xs font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
						/>
					</div>
					<div>
						<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
							К договору №:
						</label>
						<input
							type="text"
							value={contractNumber}
							onChange={(e) => setContractNumber(e.target.value)}
							className="w-full min-h-[44px] px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
						/>
					</div>
					<div>
						<label className="block text-xs font-semibold text-[var(--muted,#64748b)] mb-1">
							Исполнитель (Кассир / Врач):
						</label>
						<input
							type="text"
							value={cashierFullName}
							readOnly
							className="w-full min-h-[44px] px-3 py-2 text-xs rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] cursor-not-allowed"
						/>
					</div>
				</div>
			</div>

			{/* Official Printable Act Layout */}
			<div className="p-6 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 shadow-sm space-y-4 font-serif select-text">
				<div className="text-center space-y-1 border-b border-slate-300 dark:border-slate-700 pb-3">
					<h2 className="text-base sm:text-lg font-bold font-sans tracking-wide uppercase">
						АКТ № {actNumber}
					</h2>
					<p className="text-xs font-sans text-slate-600 dark:text-slate-400">
						сдачи-приемки выполненных стоматологических работ (оказанных медицинских услуг)
					</p>
					<p className="text-xs font-sans font-semibold text-slate-700 dark:text-slate-300">
						к Договору на оказание платных медицинских услуг № {contractNumber} от {new Date().toLocaleDateString("ru-RU")} г.
					</p>
				</div>

				<div className="text-xs space-y-1 text-slate-800 dark:text-slate-200 font-sans">
					<p>
						<strong>Исполнитель:</strong> {clinicName}, Лицензия ЛО41-01137-77/00123456
					</p>
					<p>
						<strong>Заказчик (Пациент):</strong> {patientName}, тел. {customerContact}
					</p>
					<p className="pt-1 leading-relaxed">
						Мы, нижеподписавшиеся, Исполнитель в лице {cashierFullName}, с одной стороны, и Пациент (Заказчик) {patientName}, с другой стороны, составили настоящий Акт о том, что Исполнителем были фактически оказаны, а Заказчиком приняты следующие медицинские услуги:
					</p>
				</div>

				{/* Items Table */}
				<div className="overflow-x-auto">
					<table className="w-full text-xs font-sans border-collapse border border-slate-400 dark:border-slate-600">
						<thead>
							<tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-center">
								<th className="border border-slate-400 dark:border-slate-600 p-2 w-8">№</th>
								<th className="border border-slate-400 dark:border-slate-600 p-2 w-28">Код услуги</th>
								<th className="border border-slate-400 dark:border-slate-600 p-2 text-left">Наименование медицинской услуги</th>
								<th className="border border-slate-400 dark:border-slate-600 p-2 w-14">Зуб</th>
								<th className="border border-slate-400 dark:border-slate-600 p-2 w-14">Кол-во</th>
								<th className="border border-slate-400 dark:border-slate-600 p-2 w-24 text-right">Цена (руб.)</th>
								<th className="border border-slate-400 dark:border-slate-600 p-2 w-24 text-right">Сумма (руб.)</th>
							</tr>
						</thead>
						<tbody>
							{activeItems.map((it, idx) => {
								const qty = it.quantity || 1;
								const sum = it.priceRub * qty - (it.discountRub || 0);
								return (
									<tr key={it.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
										<td className="border border-slate-400 dark:border-slate-600 p-2 text-center">{idx + 1}</td>
										<td className="border border-slate-400 dark:border-slate-600 p-2 font-mono text-center text-[11px]">{it.code804n || "—"}</td>
										<td className="border border-slate-400 dark:border-slate-600 p-2 max-w-[320px]">
											<div className="truncate min-w-0" title={it.name}>{it.name}</div>
										</td>
										<td className="border border-slate-400 dark:border-slate-600 p-2 text-center font-bold">{it.toothNumber || "—"}</td>
										<td className="border border-slate-400 dark:border-slate-600 p-2 text-center">{qty}</td>
										<td className="border border-slate-400 dark:border-slate-600 p-2 text-right font-mono">{formatMoneyRu(it.priceRub)}</td>
										<td className="border border-slate-400 dark:border-slate-600 p-2 text-right font-mono font-bold">{formatMoneyRu(sum)}</td>
									</tr>
								);
							})}
						</tbody>
						<tfoot>
							<tr className="bg-slate-100 dark:bg-slate-800 font-bold">
								<td colSpan={6} className="border border-slate-400 dark:border-slate-600 p-2 text-right uppercase">Итого к оплате:</td>
								<td className="border border-slate-400 dark:border-slate-600 p-2 text-right font-mono font-extrabold text-sm">{formatMoneyRu(totalSumRub)}</td>
							</tr>
						</tfoot>
					</table>
				</div>

				{/* Amount in words */}
				<div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-sans space-y-1">
					<p>
						<strong>Всего оказано услуг:</strong> {activeItems.length} на сумму <strong>{formatMoneyRu(totalSumRub)}</strong>
					</p>
					<p>
						<strong>Сумма прописью:</strong> <em>{numberToWordsRu(totalSumRub)}</em>
					</p>
				</div>

				{/* Guarantee and Quality Statement */}
				<div className="text-[11px] text-slate-700 dark:text-slate-300 font-sans space-y-1 pt-1 leading-relaxed">
					<p>
						Вышеперечисленные медицинские услуги выполнены в полном объеме, надлежащего качества и в установленные сроки согласно стандартам медицинской помощи и клиническим рекомендациям Минздрава РФ (ст. 779 ГК РФ, Постановление Правительства РФ № 736). Заказчик претензий по объему, качеству и срокам оказания услуг к Исполнителю не имеет.
					</p>
				</div>

				{/* Signatures */}
				<div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300 dark:border-slate-700 text-xs font-sans">
					<div className="space-y-4">
						<p className="font-bold">Исполнитель:</p>
						<p className="text-slate-600 dark:text-slate-400">{clinicName}</p>
						<div className="pt-4 border-b border-slate-400 dark:border-slate-600 flex justify-between items-end">
							<span>Подпись / М.П.:</span>
							<span className="font-bold">/ {cashierFullName} /</span>
						</div>
					</div>
					<div className="space-y-4">
						<p className="font-bold">Заказчик (Пациент):</p>
						<p className="text-slate-600 dark:text-slate-400">{patientName}</p>
						<div className="pt-4 border-b border-slate-400 dark:border-slate-600 flex justify-between items-end">
							<span>Подпись:</span>
							<span className="font-bold">/ {patientName} /</span>
						</div>
					</div>
				</div>
			</div>

			{/* Actions: Copy & Print */}
			<div className="flex flex-wrap gap-3">
				<button
					type="button"
					onClick={handleCopyActData}
					className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
				>
					<Copy size={16} />
					<span>Скопировать текст Акта</span>
				</button>
				<button
					type="button"
					onClick={() => window.print()}
					className="min-h-[48px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-[var(--ok-fg,#059669)] text-[var(--on-teal,#ffffff)] hover:opacity-90 flex items-center gap-2 cursor-pointer transition-colors shadow-md"
				>
					<Printer size={16} />
					<span>Печать Акта выполненных работ</span>
				</button>
			</div>
		</div>
	);
};
