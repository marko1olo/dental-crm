import React from "react";
import { Building2, CheckCircle2, Code2, FileCheck, FileCode2 } from "lucide-react";
import type { OneCDocumentType } from "@dental/shared";
import type { TreatmentPlanItem } from "../../../treatment-plans/types";
import { formatMoneyRu } from "./fiscalModalRefundLogic";

export interface FiscalOneCTabProps {
	readonly oneCDocType: OneCDocumentType;
	readonly setOneCDocType: (v: OneCDocumentType) => void;
	readonly actNumber: string;
	readonly setActNumber: (v: string) => void;
	readonly oneCDocDate: string;
	readonly setOneCDocDate: (v: string) => void;
	readonly contractNumber: string;
	readonly setContractNumber: (v: string) => void;
	readonly oneCClinicInn: string;
	readonly setOneCClinicInn: (v: string) => void;
	readonly oneCClinicKpp: string;
	readonly setOneCClinicKpp: (v: string) => void;
	readonly oneCPatientInn: string;
	readonly setOneCPatientInn: (v: string) => void;
	readonly oneCPatientAddress: string;
	readonly setOneCPatientAddress: (v: string) => void;
	readonly cashierFullName: string;
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly totalSumRub: number;
	readonly totalKopecks: number;
	readonly oneCXmlPreview: string;
}

export const FiscalOneCTab: React.FC<FiscalOneCTabProps> = ({
	oneCDocType,
	setOneCDocType,
	actNumber,
	setActNumber,
	oneCDocDate,
	setOneCDocDate,
	contractNumber,
	setContractNumber,
	oneCClinicInn,
	setOneCClinicInn,
	oneCClinicKpp,
	setOneCClinicKpp,
	oneCPatientInn,
	setOneCPatientInn,
	oneCPatientAddress,
	setOneCPatientAddress,
	cashierFullName,
	activeItems,
	totalSumRub,
	totalKopecks,
	oneCXmlPreview,
}) => {
	return (
		<div className="space-y-4" data-testid="1c-enterprise-export-panel">
			{/* Statutory Badges Bar */}
			<div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2.5">
				<div className="flex items-center gap-2">
					<div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
						<FileCode2 size={16} />
					</div>
					<div>
						<h4 className="font-extrabold text-xs text-[var(--ink,#0f172a)] flex items-center gap-2">
							<span>1С:Предприятие 8.3 / Бухгалтерия & УТ</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold">
								CommerceML 2.09
							</span>
						</h4>
						<p className="text-[11px] text-[var(--muted,#64748b)]">
							Выгрузка электронных первичных документов и счетов в учетную систему 1С с привязкой прейскуранта услуг и освобождением от НДС
						</p>
					</div>
				</div>

				{/* Badges */}
				<div className="flex items-center gap-1.5 flex-wrap text-xs">
					<span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
						<CheckCircle2 size={12} />
						<span>пп. 2 п. 2 ст. 149 НК РФ (Без НДС)</span>
					</span>
					<span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
						ОКЕИ 796 (Шт.)
					</span>
					<span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
						КНД 1151156 / 804н
					</span>
				</div>
			</div>

			{/* Document Configuration Parameters - Compact 2-Column Grid with h-8 inputs */}
			<div className="p-3.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2.5">
				<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--muted,#64748b)] flex items-center gap-1.5">
					<Building2 size={14} className="text-amber-600 dark:text-amber-400" />
					Параметры документа выгрузки в 1С:
				</h4>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
					{/* Column 1: Document Requisites */}
					<div className="space-y-2">
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
									Тип документа 1С:
								</label>
								<select
									value={oneCDocType}
									onChange={(e) => setOneCDocType(e.target.value as OneCDocumentType)}
									className="w-full h-8 px-2 text-xs font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] cursor-pointer"
								>
									<option value="act">Реализация товаров и услуг (Акт 804н)</option>
									<option value="invoice">Заказ покупателя (Счет на оплату)</option>
									<option value="cash_order">Приходный кассовый ордер (ПКО)</option>
									<option value="acquiring_payment">Оплата картой (Эквайринг)</option>
								</select>
							</div>

							<div>
								<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
									Номер документа:
								</label>
								<input
									type="text"
									value={actNumber}
									onChange={(e) => setActNumber(e.target.value)}
									className="w-full h-8 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
									Дата проведения:
								</label>
								<input
									type="date"
									value={oneCDocDate}
									onChange={(e) => setOneCDocDate(e.target.value)}
									className="w-full h-8 px-2.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
								/>
							</div>

							<div>
								<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
									Договор пациента:
								</label>
								<input
									type="text"
									value={contractNumber}
									onChange={(e) => setContractNumber(e.target.value)}
									className="w-full h-8 px-2.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
								/>
							</div>
						</div>
					</div>

					{/* Column 2: Parties Requisites */}
					<div className="space-y-2">
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
									ИНН Клиники:
								</label>
								<input
									type="text"
									value={oneCClinicInn}
									onChange={(e) => setOneCClinicInn(e.target.value)}
									className="w-full h-8 px-2.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
								/>
							</div>

							<div>
								<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
									КПП Клиники:
								</label>
								<input
									type="text"
									value={oneCClinicKpp}
									onChange={(e) => setOneCClinicKpp(e.target.value)}
									className="w-full h-8 px-2.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
								/>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<div>
								<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
									ИНН Пациента (опционально, только для юрлиц/ИП по 54-ФЗ):
								</label>
								<input
									type="text"
									placeholder="ИНН (10 или 12 цифр)"
									value={oneCPatientInn}
									onChange={(e) => setOneCPatientInn(e.target.value)}
									className="w-full h-8 px-2.5 text-xs font-mono rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)]"
								/>
							</div>

							<div>
								<label className="block text-[11px] font-medium text-[var(--muted,#64748b)] mb-0.5">
									Адрес / Врач:
								</label>
								<input
									type="text"
									value={oneCPatientAddress}
									onChange={(e) => setOneCPatientAddress(e.target.value)}
									placeholder="г. Москва, ул. Клиническая..."
									className="w-full h-8 px-2.5 text-xs rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] truncate"
									title={`Адрес: ${oneCPatientAddress} | Врач: ${cashierFullName}`}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Items Registry Table for 1C */}
			<div className="p-4 rounded-2xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] space-y-3 shadow-xs">
				<div className="flex items-center justify-between">
					<h4 className="font-bold text-xs uppercase tracking-wider text-[var(--ink,#0f172a)] flex items-center gap-1.5">
						<FileCheck size={16} className="text-amber-600 dark:text-amber-400" />
						Реестр номенклатурных позиций для 1С (Табличная часть):
					</h4>
					<span className="text-xs font-mono text-[var(--muted,#64748b)]">
						Позиций: {activeItems.length} · Итого: <strong>{formatMoneyRu(totalSumRub)}</strong>
					</span>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-xs font-sans border-collapse border border-[var(--border,#cbd5e1)]">
						<thead>
							<tr className="bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] font-bold text-center">
								<th className="border border-[var(--border,#cbd5e1)] p-2 w-8">№</th>
								<th className="border border-[var(--border,#cbd5e1)] p-2 w-28">Артикул / 804н</th>
								<th className="border border-[var(--border,#cbd5e1)] p-2 text-left">Наименование номенклатуры</th>
								<th className="border border-[var(--border,#cbd5e1)] p-2 w-16">Ед. ОКЕИ</th>
								<th className="border border-[var(--border,#cbd5e1)] p-2 w-14">Кол-во</th>
								<th className="border border-[var(--border,#cbd5e1)] p-2 w-24 text-right">Цена</th>
								<th className="border border-[var(--border,#cbd5e1)] p-2 w-16 text-center">Скидка</th>
								<th className="border border-[var(--border,#cbd5e1)] p-2 w-24 text-right">Сумма</th>
								<th className="border border-[var(--border,#cbd5e1)] p-2 w-20 text-center">Ставка НДС</th>
							</tr>
						</thead>
						<tbody>
							{activeItems.map((it, idx) => {
								const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
								const sum = it.priceRub * qty - (it.discountRub || 0);
								const discPercent = it.discountRub ? Math.round((it.discountRub / (it.priceRub * qty)) * 100) : 0;
								return (
									<tr key={it.id || idx} className="hover:bg-[var(--paper-soft,#f8fafc)]">
										<td className="border border-[var(--border,#cbd5e1)] p-2 text-center text-[var(--muted,#64748b)]">{idx + 1}</td>
										<td className="border border-[var(--border,#cbd5e1)] p-2 font-mono text-center text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
											{it.code804n || `ART-${idx + 1}`}
										</td>
										<td className="border border-[var(--border,#cbd5e1)] p-2 font-medium text-[var(--ink,#0f172a)] max-w-[320px]">
											<div className="truncate min-w-0" title={it.name}>
												{it.name}
												{it.toothNumber ? (
													<span className="ml-1 text-[11px] font-bold text-teal-600 dark:text-teal-400">
														[Зуб {it.toothNumber}]
													</span>
												) : null}
											</div>
										</td>
										<td className="border border-[var(--border,#cbd5e1)] p-2 text-center text-[var(--muted,#64748b)]">796 (шт)</td>
										<td className="border border-[var(--border,#cbd5e1)] p-2 text-center font-bold">{qty}</td>
										<td className="border border-[var(--border,#cbd5e1)] p-2 text-right font-mono">{formatMoneyRu(it.priceRub)}</td>
										<td className="border border-[var(--border,#cbd5e1)] p-2 text-center font-mono">
											{discPercent > 0 ? `${discPercent}%` : "0%"}
										</td>
										<td className="border border-[var(--border,#cbd5e1)] p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
											{formatMoneyRu(sum)}
										</td>
										<td className="border border-[var(--border,#cbd5e1)] p-2 text-center text-[11px] text-[var(--muted,#64748b)]">
											Без НДС
										</td>
									</tr>
								);
							})}
						</tbody>
						<tfoot>
							<tr className="bg-[var(--paper-soft,#f8fafc)] font-bold">
								<td colSpan={7} className="border border-[var(--border,#cbd5e1)] p-2 text-right uppercase text-[var(--muted,#64748b)]">
									Итого по выгрузке (Копеек: {totalKopecks}):
								</td>
								<td className="border border-[var(--border,#cbd5e1)] p-2 text-right font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
									{formatMoneyRu(totalSumRub)}
								</td>
								<td className="border border-[var(--border,#cbd5e1)] p-2 text-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
									Освобождено
								</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>

			{/* CommerceML 2.09 XML Live Preview Box */}
			<div className="p-4 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 space-y-2">
				<div className="flex items-center justify-between pb-2 border-b border-slate-800">
					<div className="flex items-center gap-2">
						<Code2 size={16} className="text-amber-400" />
						<span className="font-mono text-xs font-bold text-amber-300">
							Предпросмотр XML-пакета CommerceML 2.09 (1С:Предприятие 8.3)
						</span>
					</div>
					<span className="text-[11px] font-mono text-slate-400">
						Размер: {new Blob([oneCXmlPreview]).size} байт · Кодировка UTF-8
					</span>
				</div>

				<pre className="p-3 bg-slate-900/90 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-52 border border-slate-800 select-all leading-relaxed whitespace-pre">
					{oneCXmlPreview}
				</pre>
			</div>
		</div>
	);
};
