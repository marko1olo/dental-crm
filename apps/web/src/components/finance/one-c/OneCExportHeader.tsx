import React from "react";
import { Code2, Database, FileText, Receipt, X } from "lucide-react";
import { formatMoney } from "./types";

export interface OneCExportHeaderProps {
	readonly patientName: string;
	readonly calculatedTotalRub: number;
	readonly activeSubTab: "items" | "xml" | "requisites";
	readonly setActiveSubTab: (t: "items" | "xml" | "requisites") => void;
	readonly itemsCount: number;
	readonly onClose: () => void;
}

export const OneCExportHeader: React.FC<OneCExportHeaderProps> = ({
	patientName,
	calculatedTotalRub,
	activeSubTab,
	setActiveSubTab,
	itemsCount,
	onClose,
}) => {
	return (
		<>
			<div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--border,#cbd5e1)] shrink-0">
				<div className="flex items-center gap-3 min-w-0 flex-1">
					<div className="p-2 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shrink-0">
						<Database size={20} className="text-teal-600 dark:text-teal-400" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap">
							<h3 className="text-lg font-bold text-[var(--ink,#0f172a)] break-words m-0 leading-tight">
								1С:Предприятие 8.3 / Экспорт в CommerceML 2.09 и кассовые чеки
							</h3>
							<div className="flex items-center gap-1.5 shrink-0">
								<span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-800 dark:text-teal-200 border border-teal-500/25 font-bold whitespace-nowrap">
									CommerceML 2.09
								</span>
								<span className="text-[11px] font-sans px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 border border-cyan-500/25 font-bold whitespace-nowrap">
									Кассовый чек
								</span>
							</div>
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] mt-0.5 flex items-center gap-1.5 flex-wrap">
							<span>Пациент:</span>
							<strong className="text-[var(--ink,#0f172a)] font-semibold">{patientName}</strong>
							<span>· Итого к выгрузке:</span>
							<strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold whitespace-nowrap">
								{formatMoney(calculatedTotalRub)}
							</strong>
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer shrink-0"
					aria-label="Закрыть модальное окно"
				>
					<X size={20} />
				</button>
			</div>

			<div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2 border-b border-[var(--border,#cbd5e1)] bg-[var(--paper,#ffffff)] text-xs shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden whitespace-nowrap">
				<div className="inline-flex items-center gap-1 p-0.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] shrink-0 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<button
						type="button"
						onClick={() => setActiveSubTab("items")}
						className={`min-h-[44px] sm:min-h-[36px] px-3 sm:px-3.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
							activeSubTab === "items"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] font-medium"
						}`}
					>
						<Receipt size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Услуги ({itemsCount})</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveSubTab("xml")}
						className={`min-h-[44px] sm:min-h-[36px] px-3 sm:px-3.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
							activeSubTab === "xml"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] font-medium"
						}`}
					>
						<Code2 size={14} className="text-[var(--muted,#64748b)] shrink-0" />
						<span>XML</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveSubTab("requisites")}
						className={`min-h-[44px] sm:min-h-[36px] px-3 sm:px-3.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
							activeSubTab === "requisites"
								? "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] shadow-xs"
								: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] font-medium"
						}`}
					>
						<FileText size={14} className="text-[var(--muted,#64748b)] shrink-0" />
						<span>Реквизиты</span>
					</button>
				</div>

				<div className="text-[11px] text-[var(--muted,#64748b)] hidden md:flex items-center gap-1 font-mono shrink-0">
					<span>XML Schema:</span>
					<strong className="text-[var(--ink,#0f172a)] font-bold">1C_Enterprise_v2.09</strong>
				</div>
			</div>
		</>
	);
};
