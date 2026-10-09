import React from "react";
import { Sparkles, X } from "lucide-react";
import type { ModalTab } from "./types";

export interface PediatricModalHeaderProps {
	activeTab: ModalTab;
	onTabChange: (tab: ModalTab) => void;
	onClose: () => void;
}

export const PediatricModalHeader: React.FC<PediatricModalHeaderProps> = ({
	activeTab,
	onTabChange,
	onClose,
}) => {
	return (
		<>
			{/* Modal Header */}
			<div className="flex items-start justify-between gap-3 p-4 sm:p-6 sm:px-8 border-b border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 shrink-0">
				<div className="flex items-center gap-3 min-w-0">
					<div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[var(--teal-surface,rgba(20,184,166,0.12))] text-[var(--teal,#0d9488)] border border-[var(--teal-glow,rgba(20,184,166,0.25))] shrink-0 shadow-inner">
						<Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
					</div>
					<div className="min-w-0">
						<h2
							id="pediatric-modal-title"
							className="text-sm sm:text-lg lg:text-xl font-black tracking-tight text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:text-slate-100 whitespace-normal break-words"
						>
							Детский и сменный прикус: Сроки смены &amp; Cariogram
						</h2>
						<p className="text-xs sm:text-sm text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 font-medium mt-0.5 whitespace-normal break-words">
							Физиологическая резорбция корней (0–100%), эксфолиация и оценка кариесогенного риска по Douglas Bratthall (ВОЗ)
						</p>
					</div>
				</div>

				{/* Close Button >= 44x44px */}
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] sm:min-h-[32px] min-w-[44px] p-2 rounded-xl text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-100 hover:bg-[var(--odontogram-surface-hover,var(--paper-strong,#f1f5f9))] dark:hover:bg-slate-800 border border-transparent hover:border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center shrink-0"
					aria-label="Закрыть модальное окно"
				>
					<X className="w-5 h-5" />
				</button>
			</div>

			{/* Navigation Tabs (Strictly 1 row 32–36px under Sin #2) */}
			<div
				className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 h-[36px] min-h-[36px] border-b border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] dark:border-slate-800 bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] dark:bg-slate-950/70 shrink-0 w-full overflow-x-auto no-scrollbar"
			>
				<button
					type="button"
					onClick={() => onTabChange("timeline")}
					className={`h-[32px] min-h-[32px] min-w-max shrink-0 whitespace-nowrap px-3 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
						activeTab === "timeline"
							? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
							: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
					}`}
				>
					<span className="hidden sm:inline">Сроки смены (6–12 лет)</span>
					<span className="sm:hidden">Сроки смены</span>
				</button>

				<button
					type="button"
					onClick={() => onTabChange("cariogram")}
					className={`h-[32px] min-h-[32px] min-w-max shrink-0 whitespace-nowrap px-3 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
						activeTab === "cariogram"
							? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
							: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
					}`}
				>
					<span className="hidden sm:inline">Cariogram (Риск кариеса)</span>
					<span className="sm:hidden">Cariogram</span>
				</button>

				<button
					type="button"
					onClick={() => onTabChange("resorption")}
					className={`h-[32px] min-h-[32px] min-w-max shrink-0 whitespace-nowrap px-3 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
						activeTab === "resorption"
							? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
							: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
					}`}
				>
					<span className="hidden sm:inline">Резорбция корней (0–100%)</span>
					<span className="sm:hidden">Резорбция</span>
				</button>

				<button
					type="button"
					onClick={() => onTabChange("frankl")}
					className={`h-[32px] min-h-[32px] min-w-max shrink-0 whitespace-nowrap px-3 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer select-none inline-flex items-center justify-center ${
						activeTab === "frankl"
							? "border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] dark:text-teal-400 bg-[var(--odontogram-paper,var(--paper-strong,#ffffff))] dark:bg-slate-900 shadow-xs"
							: "border-transparent text-[var(--odontogram-ink-muted,var(--muted,#64748b))] dark:text-slate-400 hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] dark:hover:text-slate-200"
					}`}
				>
					<span>Шкала Frankl</span>
				</button>
			</div>
		</>
	);
};
