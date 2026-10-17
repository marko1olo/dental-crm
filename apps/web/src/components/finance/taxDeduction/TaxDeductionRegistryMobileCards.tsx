import React from "react";
import { CheckCircle2, Clock, FileCheck, FileCode, Printer } from "lucide-react";
import type { TaxCertificateRegistryItem } from "./taxRegistryPresets";

export interface TaxDeductionRegistryMobileCardsProps {
	readonly filteredItems: readonly TaxCertificateRegistryItem[];
	readonly onPrintItem: (item: TaxCertificateRegistryItem) => void;
	readonly onDownloadXmlItem: (item: TaxCertificateRegistryItem) => void;
}

export const TaxDeductionRegistryMobileCards: React.FC<TaxDeductionRegistryMobileCardsProps> = ({
	filteredItems,
	onPrintItem,
	onDownloadXmlItem,
}) => {
	return (
		<div className="block md:hidden space-y-3">
			{filteredItems.map((item) => {
				const isIssued = item.status === "ISSUED";
				const isSent = item.status === "SENT_TO_FNS";
				return (
					<article
						key={item.id}
						className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-xs space-y-3"
						style={{ backgroundColor: "var(--paper)", borderColor: "var(--line)" }}
					>
						<div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
							<div className="flex items-center gap-2">
								<span className="font-mono font-bold text-sm text-teal-700 dark:text-teal-300">
									Справка № {item.certificateNumber}
								</span>
								<span className="text-xs text-[var(--muted)] font-mono">
									от {item.issueDateIso.slice(0, 10)}
								</span>
							</div>
							<span
								className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
									isIssued
										? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
										: isSent
										? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
										: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
								}`}
							>
								{isIssued ? "Выдана" : isSent ? "В ФНС" : "Черновик"}
							</span>
						</div>

						<div className="space-y-1.5 text-xs">
							<div className="flex justify-between items-baseline">
								<span className="text-[var(--muted)]">Пациент:</span>
								<strong className="text-right text-[var(--ink)]">{item.patientName}</strong>
							</div>
							<div className="flex justify-between items-baseline">
								<span className="text-[var(--muted)]">Плательщик:</span>
								<span className="text-right font-medium text-[var(--ink)]">
									{item.taxpayerName} ({item.relationshipRu})
								</span>
							</div>
							<div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--line)]">
								<div>
									<span className="text-[11px] text-[var(--muted)] block">Код 01 (Обычное):</span>
									<span className="font-mono font-bold text-teal-700 dark:text-teal-300">
										{item.code01Rub.toLocaleString("ru-RU")} ₽
									</span>
								</div>
								<div>
									<span className="text-[11px] text-[var(--muted)] block">Код 02 (Дорогостоящее):</span>
									<span className="font-mono font-bold text-rose-600">
										{item.code02Rub > 0 ? `${item.code02Rub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
									</span>
								</div>
							</div>
							<div className="flex justify-between items-baseline pt-1 border-t border-[var(--line)] font-bold">
								<span className="text-sm">Итого к вычету:</span>
								<span className="text-base font-black font-mono text-[var(--ink)]">
									{item.totalRub.toLocaleString("ru-RU")} ₽
								</span>
							</div>
							<div className="text-[11px] text-emerald-600 font-bold text-right">
								Возврат 13% НДФЛ: {item.refund13Rub.toLocaleString("ru-RU")} ₽
							</div>
						</div>

						{/* Mobile Action Buttons (>= 44x44px per Apple HIG) */}
						<div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)]">
							<button
								type="button"
								onClick={() => onPrintItem(item)}
								className="secondary-button"
								style={{
									minHeight: "44px",
									borderRadius: "12px",
									border: "1px solid var(--line)",
									backgroundColor: "var(--paper-soft)",
									color: "#0d9488",
									fontSize: "12px",
									fontWeight: 700,
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
									cursor: "pointer",
								}}
								data-testid={`mobile-btn-print-${item.id}`}
							>
								<Printer size={15} />
								<span>Печать А4</span>
							</button>
							<button
								type="button"
								onClick={() => onDownloadXmlItem(item)}
								className="secondary-button"
								style={{
									minHeight: "44px",
									borderRadius: "12px",
									border: "1px solid var(--line)",
									backgroundColor: "var(--paper-soft)",
									color: "var(--ink)",
									fontSize: "12px",
									fontWeight: 700,
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									gap: "6px",
									cursor: "pointer",
								}}
								data-testid={`mobile-btn-xml-${item.id}`}
							>
								<FileCode size={15} />
								<span>Файл XML</span>
							</button>
						</div>
					</article>
				);
			})}
		</div>
	);
};
