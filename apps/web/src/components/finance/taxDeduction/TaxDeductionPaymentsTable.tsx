import React from "react";
import {
	Coins,
	Receipt,
	ShieldCheck,
} from "lucide-react";
import {
	amountToWordsRu,
	resolveTaxDeductionCategoryShared,
} from "../taxDeductionEngine";
import type { TaxDeductionPaymentsTableProps } from "./types";

export const TaxDeductionPaymentsTable: React.FC<TaxDeductionPaymentsTableProps> = ({
	selectedYear,
	yearPayments,
	allPaymentsCount,
	targetYearSummary,
	clinicLicenseNumber,
	clinicLicenseDate,
	qrSvgString,
	onClose,
}) => {
	if (yearPayments.length === 0) {
		return (
			<div className="p-6 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] text-center space-y-3">
				<div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
					<Receipt className="w-6 h-6" />
				</div>
				<div className="space-y-1.5 max-w-md mx-auto">
					<h4 className="text-sm sm:text-base font-bold text-[var(--ink,#0f172a)] m-0">
						Нет подтвержденных оплат за {selectedYear} год для формирования справки на вычет
					</h4>
					<p className="text-xs text-[var(--muted,#64748b)] m-0 leading-relaxed">
						{allPaymentsCount === 0
							? "В карточке пациента отсутствуют оплаченные счета. Справка для налогового вычета формируется автоматически при наличии фискальных чеков."
							: `За ${selectedYear} год оплаченных счетов не найдено. Выберите другой налоговый период выше или закройте окно.`}
					</p>
				</div>
				<div className="flex items-center justify-center gap-2 pt-2">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] px-5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-xs font-bold text-[var(--ink,#0f172a)] hover:bg-slate-500/10 cursor-pointer transition-colors"
					>
						Закрыть
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Real-Time Calculation Breakdown Card */}
			<div className="p-4 sm:p-5 rounded-2xl bg-teal-500/5 border border-teal-500/30 space-y-4">
				<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-2.5">
					<span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-teal-800 dark:text-teal-200">
						<Coins size={16} className="text-teal-600" />
						Расчет сумм вычета по Приказу 824@ за {selectedYear} год:
					</span>
					<span className="text-xs text-[var(--muted,#64748b)]">
						Чеков за {selectedYear} г.: {targetYearSummary.receiptsCount}
					</span>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					{/* Code 01 */}
					<div
						className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-1"
						style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
					>
						<div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
							Код 01 (Обычное лечение)
						</div>
						<div className="text-lg font-bold font-mono text-teal-700 dark:text-teal-300">
							{(targetYearSummary.code01Kopecks / 100).toLocaleString("ru-RU", {
								minimumFractionDigits: 2,
							})}{" "}
							₽
						</div>
						<div className="text-[11px]" style={{ color: "var(--muted)" }}>
							Лимит: {targetYearSummary.code01StatutoryLimitRub.toLocaleString("ru-RU")} ₽ / год
						</div>
					</div>

					{/* Code 02 */}
					<div
						className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] space-y-1"
						style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
					>
						<div className="text-[11px] font-bold uppercase text-rose-500">
							Код 02 (Дорогостоящее)
						</div>
						<div className="text-lg font-bold font-mono text-rose-700 dark:text-rose-300">
							{(targetYearSummary.code02Kopecks / 100).toLocaleString("ru-RU", {
								minimumFractionDigits: 2,
							})}{" "}
							₽
						</div>
						<div className="text-[11px]" style={{ color: "var(--muted)" }}>
							Имплантация / без лимита
						</div>
					</div>

					{/* Estimated Refund */}
					<div
						className="p-3 rounded-xl text-white space-y-1 shadow-sm"
						style={{ backgroundColor: "#0d9488", color: "#ffffff" }}
					>
						<div className="text-[11px] font-bold uppercase opacity-90">
							Возврат НДФЛ 13% (к выплате)
						</div>
						<div className="text-xl font-black font-mono">
							{targetYearSummary.refund13EstimateRub.toLocaleString("ru-RU")} ₽
						</div>
						<div className="text-[11px] opacity-80">
							(15% для дохода свыше 5 млн ₽: {targetYearSummary.refund15EstimateRub.toLocaleString("ru-RU")} ₽)
						</div>
					</div>
				</div>

				{/* QR Verification preview & In-words preview */}
				<div
					className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex items-center justify-between gap-4"
					style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
				>
					<div className="space-y-1 text-xs">
						<div className="font-bold flex items-center gap-1.5" style={{ color: "var(--ink)" }}>
							<ShieldCheck size={16} className="text-emerald-600" />
							Сумма к вычету прописью:
						</div>
						<div className="font-serif italic text-slate-700 dark:text-slate-300">
							{amountToWordsRu(targetYearSummary.totalKopecks)}
						</div>
						<div className="text-[11px]" style={{ color: "var(--muted)" }}>
							Лицензия клиники: {clinicLicenseNumber || "—"} {clinicLicenseDate ? `от ${clinicLicenseDate} г.` : ""}
						</div>
					</div>
					<div
						className="w-16 h-16 shrink-0 border border-[var(--line)] rounded-lg p-1 shadow-xs"
						style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
						dangerouslySetInnerHTML={{ __html: qrSvgString }}
						title="QR-код моментальной проверки подлинности справки в ФНС"
					/>
				</div>
			</div>

			{/* Detailed Payments Table */}
			<div
				className="border border-[var(--line)] rounded-2xl overflow-hidden bg-[var(--paper)]"
				style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
			>
				<table className="w-full text-xs text-left border-collapse">
					<thead
						className="border-b border-[var(--line)] font-bold"
						style={{ backgroundColor: "var(--paper-soft)", borderColor: "var(--line)", color: "var(--muted)" }}
					>
						<tr>
							<th className="p-3">№</th>
							<th className="p-3">Дата чека</th>
							<th className="p-3">Чек / ФД</th>
							<th className="p-3">ФПД</th>
							<th className="p-3">Наименование услуги</th>
							<th className="p-3">Код услуги</th>
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
										{p.fiscalDocumentNumber
											? (p.receiptNumber ? `${p.receiptNumber} / ФД №${p.fiscalDocumentNumber}` : `ФД №${p.fiscalDocumentNumber}`)
											: (p.receiptNumber || "—")}
									</td>
									<td className="p-3 font-mono text-[11px] text-[var(--muted,#64748b)]">
										{p.fiscalSign || "—"}
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
		</div>
	);
};
