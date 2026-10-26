import React from "react";
import { Layers, PackageCheck, ShieldCheck, X, Zap } from "lucide-react";
import type { WriteoffActiveTab } from "./batchWriteoffTypes.js";

interface BatchWriteoffHeaderProps {
	readonly activeTab: WriteoffActiveTab;
	readonly setActiveTab: (t: WriteoffActiveTab) => void;
	readonly procedureTitle?: string | undefined;
	readonly onClose: () => void;
	readonly isBusy: boolean;
}

export const BatchWriteoffHeader: React.FC<BatchWriteoffHeaderProps> = ({
	activeTab,
	setActiveTab,
	procedureTitle,
	onClose,
	isBusy,
}) => {
	return (
		<div className="shrink-0">
			<div className="sm:hidden w-10 h-1.5 rounded-full bg-[var(--line)] mx-auto mt-2 mb-1" />

			<div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)]">
				<div className="flex items-center gap-3 min-w-0">
					<div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-500/20">
						<PackageCheck className="w-5 h-5" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h2 id="shift-deduction-title" className="text-base font-bold truncate">
								Списание расходников за смену
							</h2>
							<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-200 shrink-0">
								1 клик по техкартам • Мягкий овердрафт
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] truncate">
							Старшая медсестра / Врач • Пакетное списание в 1 клик с мягким овердрафтом
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					disabled={isBusy}
					className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/10 border border-[var(--line)] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
					aria-label="Закрыть окно"
				>
					<X size={18} />
				</button>
			</div>

			<div className="px-4 py-2 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between flex-wrap gap-2">
				<div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-xs font-semibold">
					<button
						type="button"
						onClick={() => setActiveTab("shift")}
						className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 rounded-lg inline-flex items-center gap-1.5 transition border ${
							activeTab === "shift"
								? "bg-[var(--paper)] text-[var(--primary)] shadow-xs border-[var(--line)]"
								: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]"
						}`}
						data-testid="tab-mode-shift"
					>
						<PackageCheck size={14} className="shrink-0" />
						<span>За смену</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("packages")}
						className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 rounded-lg inline-flex items-center gap-1.5 transition border ${
							activeTab === "packages"
								? "bg-[var(--paper)] text-[var(--primary)] shadow-xs border-[var(--line)]"
								: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]"
						}`}
						data-testid="tab-mode-packages"
					>
						<Zap size={14} className="shrink-0" />
						<span>Клинические пакеты</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("procedure")}
						className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 rounded-lg inline-flex items-center gap-1.5 transition border ${
							activeTab === "procedure"
								? "bg-[var(--paper)] text-[var(--primary)] shadow-xs border-[var(--line)]"
								: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border-[var(--line)]"
						}`}
						data-testid="tab-mode-procedure"
					>
						<Layers size={14} className="shrink-0" />
						<span>{procedureTitle ? "По процедуре" : "По приёму"}</span>
					</button>
				</div>

				<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/20">
					<ShieldCheck size={14} className="text-teal-600" />
					<span>Мягкий овердрафт активен</span>
				</div>
			</div>
		</div>
	);
};
