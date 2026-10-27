/**
 * DENTE CRM — Clinical Help Container Top Navigation Bar
 * Authority: Mandate 8b (<= 120 lines), Apple HIG
 */

import React from "react";
import { ArrowLeft, BookOpen, Gamepad2, Keyboard, Printer } from "lucide-react";

export interface ClinicalHelpTopBarProps {
	readonly viewMode: "catalog" | "detail";
	readonly onBackToCatalog: () => void;
	readonly activeTitle?: string;
	readonly activeShortTitle?: string;
	readonly onLaunchTour?: () => void;
	readonly onOpenShortcuts?: () => void;
}

export const ClinicalHelpTopBar: React.FC<ClinicalHelpTopBarProps> = React.memo(({
	viewMode,
	onBackToCatalog,
	activeTitle,
	activeShortTitle,
	onLaunchTour,
	onOpenShortcuts,
}) => {
	return (
		<div className="p-3 sm:p-4 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-3 shrink-0">
			<div className="flex items-center gap-2.5 min-w-0">
				{viewMode === "detail" ? (
					<button
						type="button"
						onClick={onBackToCatalog}
						className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 min-h-[44px] sm:min-h-[32px] cursor-pointer"
					>
						<ArrowLeft size={14} />
						<span>К каталогу</span>
					</button>
				) : (
					<div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
						<BookOpen size={18} />
					</div>
				)}
				<div className="min-w-0">
					<h2 className="text-sm sm:text-base font-bold truncate">
						{viewMode === "detail" && activeShortTitle ? activeShortTitle : "База знаний и руководство"}
					</h2>
					<p className="text-[11px] text-[var(--muted)] truncate">
						{viewMode === "detail" && activeTitle ? activeTitle : "12 клинических модулей без канцелярита"}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-1.5 shrink-0">
				<button
					type="button"
					onClick={onLaunchTour}
					className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-500 text-white text-xs font-semibold hover:bg-teal-600 min-h-[44px] sm:min-h-[32px] cursor-pointer"
				>
					<Gamepad2 size={14} />
					<span className="hidden sm:inline">Интерактивный тренажёр</span>
				</button>
				{onOpenShortcuts && (
					<button
						type="button"
						onClick={onOpenShortcuts}
						className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-medium min-h-[44px] sm:min-h-[32px] cursor-pointer"
					>
						<Keyboard size={14} className="text-teal-500" />
						<span className="hidden sm:inline">Клавиши</span>
					</button>
				)}
				<button
					type="button"
					onClick={() => typeof window !== "undefined" && window.print()}
					className="p-2 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] flex items-center justify-center rounded-lg border border-transparent hover:border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
					aria-label="Печать"
				>
					<Printer size={15} />
				</button>
			</div>
		</div>
	);
});

ClinicalHelpTopBar.displayName = "ClinicalHelpTopBar";
