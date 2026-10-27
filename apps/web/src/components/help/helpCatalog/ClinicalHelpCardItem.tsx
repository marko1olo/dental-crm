/**
 * DENTE CRM — Clinical Help Card Item Renderer (Apple HIG)
 * Authority: Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy)
 */

import React from "react";
import { ArrowRight, ChevronRight, ExternalLink, Gamepad2 } from "lucide-react";
import { ClinicalHelpHotkeyBadge } from "./ClinicalHelpHotkeyBadge";
import type { ClinicalGuideMeta } from "./helpTypes";

export interface ClinicalHelpCardItemProps {
	readonly guide: ClinicalGuideMeta;
	readonly isActive?: boolean;
	readonly isMobile?: boolean;
	readonly onSelect: () => void;
	readonly onNavigate: (e: React.MouseEvent) => void;
	readonly onTour: (e: React.MouseEvent) => void;
}

export const ClinicalHelpCardItem: React.FC<ClinicalHelpCardItemProps> = React.memo(({
	guide,
	isActive,
	isMobile,
	onSelect,
	onNavigate,
	onTour,
}) => {
	if (isMobile) {
		return (
			<div
				onClick={onSelect}
				className="p-3.5 flex flex-col gap-2 min-h-[52px] active:bg-[var(--paper-soft)] cursor-pointer transition-colors"
			>
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 shrink-0">
							{guide.badge}
						</span>
						<span className="text-sm font-semibold text-[var(--ink)] truncate">
							{guide.shortTitle}
						</span>
					</div>
					<ChevronRight size={18} className="text-[var(--muted)] shrink-0" />
				</div>
				<p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">
					{guide.description}
				</p>
				<div className="flex items-center justify-between pt-1 gap-2">
					{guide.hotkeys?.[0] ? <ClinicalHelpHotkeyBadge hotkey={guide.hotkeys[0]} /> : <div />}
					{guide.targetView && (
						<button
							type="button"
							onClick={onNavigate}
							className="text-xs font-semibold text-teal-600 dark:text-teal-400 min-h-[44px] min-w-[44px] px-2 flex items-center gap-1 active:opacity-70"
						>
							<span>Открыть</span>
							<ArrowRight size={14} />
						</button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div
			onClick={onSelect}
			className={`group p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
				isActive
					? "bg-[var(--paper)] border-teal-500 shadow-sm"
					: "bg-[var(--paper-soft)] hover:bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/50"
			}`}
		>
			<div className="space-y-1.5">
				<div className="flex items-center justify-between gap-2">
					<span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
						{guide.badge}
					</span>
					{guide.hotkeys && guide.hotkeys.length > 0 && (
						<div className="flex items-center gap-1">
							{guide.hotkeys.slice(0, 2).map((k) => (
								<ClinicalHelpHotkeyBadge key={k} hotkey={k} />
							))}
						</div>
					)}
				</div>
				<h3 className="text-sm font-bold text-[var(--ink)] group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
					{guide.title}
				</h3>
				<p className="text-xs text-[var(--muted)] line-clamp-2 leading-relaxed">
					{guide.description}
				</p>
			</div>

			<div className="pt-2 border-t border-[var(--line-subtle)] flex items-center justify-between gap-2">
				<button
					type="button"
					onClick={onTour}
					className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline min-h-[36px] px-1 cursor-pointer"
				>
					<Gamepad2 size={13} />
					<span>Тренажёр</span>
				</button>
				{guide.targetView && (
					<button
						type="button"
						onClick={onNavigate}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs font-medium text-[var(--ink)] hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 min-h-[36px] transition-colors cursor-pointer"
					>
						<span>В раздел</span>
						<ExternalLink size={12} />
					</button>
				)}
			</div>
		</div>
	);
});

ClinicalHelpCardItem.displayName = "ClinicalHelpCardItem";
