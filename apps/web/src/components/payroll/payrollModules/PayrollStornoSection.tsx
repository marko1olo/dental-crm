import React from "react";
import type { DoctorPayrollResult } from "../staffPayrollEngine";

export interface PayrollStornoSectionProps {
	readonly stornoItems: DoctorPayrollResult["stornoItems"];
}

export const PayrollStornoSection: React.FC<PayrollStornoSectionProps> = ({ stornoItems }) => {
	if (!stornoItems || stornoItems.length === 0) return null;

	return (
		<div className="flex flex-col gap-2" data-testid="doctor-payroll-storno-section">
			<h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
				<span>Сторно комиссий при возвратах и перерасчётах:</span>
				<span className="text-[10px] font-normal normal-case text-[var(--muted,#64748b)]">
					(Автоматическое сторнирование начислений при возврате денег пациенту)
				</span>
			</h4>
			<div className="hidden sm:block border border-rose-200 dark:border-rose-900/60 rounded-xl overflow-hidden bg-rose-50/30 dark:bg-rose-950/20">
				<div className="overflow-x-auto">
					<table className="w-full text-left text-xs">
						<thead className="bg-rose-100/50 dark:bg-rose-900/40 border-b border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200">
							<tr>
								<th className="p-2.5 font-semibold">Дата</th>
								<th className="p-2.5 font-semibold">Чек / Документ</th>
								<th className="p-2.5 font-semibold">Услуга / Основание</th>
								<th className="p-2.5 font-semibold text-right">Возврат пациенту</th>
								<th className="p-2.5 font-semibold text-right">Сторно комиссии</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-rose-200/60 dark:divide-rose-900/40">
							{stornoItems.map((storno) => (
								<tr key={storno.id} className="hover:bg-rose-100/30 dark:hover:bg-rose-900/20 transition-colors">
									<td className="p-2.5 font-medium whitespace-nowrap">{storno.dateIso}</td>
									<td className="p-2.5 font-mono font-bold text-rose-700 dark:text-rose-300">№ {storno.receiptNumber}</td>
									<td className="p-2.5 text-[var(--ink,#0f172a)]">
										<div className="font-semibold">{storno.serviceNameRu}</div>
										<div className="text-[10px] text-rose-600 dark:text-rose-400">{storno.reasonRu}</div>
										<div className="text-[10px] font-bold text-rose-700 dark:text-rose-300 mt-0.5">{storno.labelRu}</div>
									</td>
									<td className="p-2.5 font-bold text-right text-rose-600 dark:text-rose-400 whitespace-nowrap">
										-{Math.round(storno.refundedGrossKop / 100).toLocaleString("ru-RU")} ₽
									</td>
									<td className="p-2.5 font-black text-right text-rose-700 dark:text-rose-300 whitespace-nowrap">
										-{Math.round(storno.stornoCommissionKop / 100).toLocaleString("ru-RU")} ₽
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className="block sm:hidden flex flex-col gap-2">
				{stornoItems.map((storno) => (
					<div key={storno.id} className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-xs">
						<div className="flex items-center justify-between gap-2">
							<span className="font-mono font-bold text-rose-700 dark:text-rose-300">№ {storno.receiptNumber}</span>
							<span className="text-[11px] text-[var(--muted,#64748b)]">{storno.dateIso}</span>
						</div>
						<div className="font-semibold text-[var(--ink,#0f172a)] mt-1">{storno.serviceNameRu}</div>
						<div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">{storno.reasonRu}</div>
						<div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-rose-200/50">
							<span className="text-rose-600 dark:text-rose-400">
								Возврат: -{Math.round(storno.refundedGrossKop / 100).toLocaleString("ru-RU")} ₽
							</span>
							<span className="font-bold text-rose-700 dark:text-rose-300">
								Сторно: -{Math.round(storno.stornoCommissionKop / 100).toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
