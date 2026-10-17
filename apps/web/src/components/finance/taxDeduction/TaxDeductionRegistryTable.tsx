import React from "react";
import { CheckCircle2, Clock, FileCheck, FileCode, Printer } from "lucide-react";
import type { TaxCertificateRegistryItem } from "./taxRegistryPresets";

export interface TaxDeductionRegistryTableProps {
	readonly filteredItems: readonly TaxCertificateRegistryItem[];
	readonly onPrintItem: (item: TaxCertificateRegistryItem) => void;
	readonly onDownloadXmlItem: (item: TaxCertificateRegistryItem) => void;
}

export const TaxDeductionRegistryTable: React.FC<TaxDeductionRegistryTableProps> = ({
	filteredItems,
	onPrintItem,
	onDownloadXmlItem,
}) => {
	return (
		<div className="hidden md:block rounded-2xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden">
			<table className="w-full text-xs text-left border-collapse">
				<thead className="bg-[var(--paper-soft)] border-b border-[var(--line)] font-bold text-[var(--muted)]">
					<tr>
						<th className="p-3">№ Справки</th>
						<th className="p-3">Дата выдачи</th>
						<th className="p-3">Пациент</th>
						<th className="p-3">Налогоплательщик (Родство)</th>
						<th className="p-3 text-right">Код 01 (руб.)</th>
						<th className="p-3 text-right">Код 02 (руб.)</th>
						<th className="p-3 text-right">Итого (руб.)</th>
						<th className="p-3 text-right">Возврат 13%</th>
						<th className="p-3 text-center">Статус</th>
						<th className="p-3 text-center">Действия</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--line)] font-medium">
					{filteredItems.map((item) => {
						const isIssued = item.status === "ISSUED";
						const isSent = item.status === "SENT_TO_FNS";
						return (
							<tr key={item.id} className="hover:bg-slate-500/5 transition-colors">
								<td className="p-3 font-mono font-bold text-teal-700 dark:text-teal-300">№ {item.certificateNumber}</td>
								<td className="p-3 font-mono text-[var(--muted)]">{item.issueDateIso.slice(0, 10)}</td>
								<td className="p-3">
									<div className="font-bold text-[var(--ink)]">{item.patientName}</div>
									{item.patientInn && <div className="text-[11px] font-mono text-[var(--muted)]">ИНН {item.patientInn}</div>}
								</td>
								<td className="p-3">
									<div className="font-medium text-[var(--ink)]">{item.taxpayerName}</div>
									<div className="text-[11px] text-[var(--muted)]">Код {item.relationshipCode}: {item.relationshipRu}</div>
								</td>
								<td className="p-3 text-right font-mono font-bold text-teal-700 dark:text-teal-300">{item.code01Rub.toLocaleString("ru-RU")} ₽</td>
								<td className="p-3 text-right font-mono font-bold text-rose-600">{item.code02Rub > 0 ? `${item.code02Rub.toLocaleString("ru-RU")} ₽` : "—"}</td>
								<td className="p-3 text-right font-mono font-black text-sm">{item.totalRub.toLocaleString("ru-RU")} ₽</td>
								<td className="p-3 text-right font-mono font-bold text-emerald-600">{item.refund13Rub.toLocaleString("ru-RU")} ₽</td>
								<td className="p-3 text-center">
									<span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
										isIssued ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20" : isSent ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
									}`}>
										{isIssued ? <CheckCircle2 size={12} /> : isSent ? <FileCheck size={12} /> : <Clock size={12} />}
										{isIssued ? "Выдана" : isSent ? "В ФНС" : "Черновик"}
									</span>
								</td>
								<td className="p-3 text-center">
									<div className="flex items-center justify-center gap-1.5">
										<button
											type="button"
											onClick={() => onPrintItem(item)}
											className="icon-button"
											style={{ minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", border: "1px solid var(--line)", backgroundColor: "var(--paper-soft)", color: "#0d9488", cursor: "pointer" }}
											title="Печать справки А4 (КНД 1151158)"
											data-testid={`btn-print-cert-${item.id}`}
										>
											<Printer size={15} />
										</button>
										<button
											type="button"
											onClick={() => onDownloadXmlItem(item)}
											className="icon-button"
											style={{ minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", border: "1px solid var(--line)", backgroundColor: "var(--paper-soft)", color: "var(--ink)", cursor: "pointer" }}
											title="Скачать XML для ФНС (КНД 1184043)"
											data-testid={`btn-xml-cert-${item.id}`}
										>
											<FileCode size={15} />
										</button>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
