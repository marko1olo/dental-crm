import React from "react";
import { ShieldCheck, X, Zap } from "lucide-react";
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
			{/* Mobile bottom sheet drag handle */}
			<div className="sm:hidden w-10 h-1.5 rounded-full bg-[var(--line)] mx-auto mt-2 mb-1" />

			{/* Header bar */}
			<div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)]">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
						<Zap size={18} />
					</div>
					<div className="min-w-0">
						<h2 id="batch-writeoff-title" className="text-sm sm:text-base font-bold text-[var(--ink)] truncate">
							Пакетное списание расходных материалов
						</h2>
						<p className="text-xs text-[var(--muted)] truncate">
							1-кликовое списание за смену или приём с мягким овердрафтом
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					disabled={isBusy}
					className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]/10 transition"
					aria-label="Закрыть окно"
				>
					<X size={18} />
				</button>
			</div>

			{/* Tabs bar */}
			<div className="px-4 py-2 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between flex-wrap gap-2">
				<div className="dente-segmented-bar inline-flex p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] gap-1 text-xs font-semibold">
					<button
						type="button"
						onClick={() => setActiveTab("shift")}
						className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 rounded-lg transition ${
							activeTab === "shift"
								? "bg-[var(--paper)] text-[var(--primary)] shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-writeoff-shift"
					>
						⚡ Вся смена в 1 клик
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("packages")}
						className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 rounded-lg transition ${
							activeTab === "packages"
								? "bg-[var(--paper)] text-[var(--primary)] shadow-xs"
								: "text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						data-testid="tab-writeoff-packages"
					>
						📦 Клинические пакеты
					</button>

					{procedureTitle && (
						<button
							type="button"
							onClick={() => setActiveTab("procedure")}
							className={`px-3 py-1.5 min-h-[36px] sm:min-h-0 rounded-lg transition ${
								activeTab === "procedure"
									? "bg-[var(--paper)] text-[var(--primary)] shadow-xs"
									: "text-[var(--muted)] hover:text-[var(--ink)]"
							}`}
							data-testid="tab-writeoff-procedure"
						>
							🦷 Процедура приёма
						</button>
					)}
				</div>

				<div
					className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
					title="Списание материалов никогда не блокирует прием и сохранение"
				>
					<ShieldCheck size={14} className="text-emerald-600 shrink-0" />
					<span>Мягкий овердрафт активен (ноль блокировок)</span>
				</div>
			</div>
		</div>
	);
};
