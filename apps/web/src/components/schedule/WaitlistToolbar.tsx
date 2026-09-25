import React from "react";
import { Search, X } from "lucide-react";
import {
	type WaitlistCandidateItem,
	type WaitlistUrgency,
	URGENCY_CONFIG,
	detectWaitlistUrgency,
} from "./waitlistCancellationEngine";

export interface WaitlistToolbarProps {
	readonly searchQuery: string;
	readonly onSearchChange: (query: string) => void;
	readonly selectedUrgency: WaitlistUrgency | "all";
	readonly onSelectUrgency: (urgency: WaitlistUrgency | "all") => void;
	readonly onlySameDoctor: boolean;
	readonly onToggleOnlySameDoctor: () => void;
	readonly hasTargetDoctor: boolean;
	readonly items: readonly WaitlistCandidateItem[];
}

export const WaitlistToolbar: React.FC<WaitlistToolbarProps> = ({
	searchQuery,
	onSearchChange,
	selectedUrgency,
	onSelectUrgency,
	onlySameDoctor,
	onToggleOnlySameDoctor,
	hasTargetDoctor,
	items,
}) => {
	return (
		<div
			className="p-3 sm:px-4 border-b border-[var(--line)] flex flex-col gap-2 shrink-0 bg-[var(--paper)]"
			data-testid="waitlist-toolbar"
		>
			{/* Search input + doctor filter */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1 min-w-[140px]">
					<Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Поиск по ФИО или телефону..."
						className="w-full pl-8 pr-2.5 h-8 bg-[var(--paper-soft)] border border-[var(--line)] rounded-lg text-xs text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:ring-1 focus:ring-[var(--teal)]"
						data-testid="waitlist-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchChange("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] p-0.5 cursor-pointer"
						>
							<X size={12} />
						</button>
					)}
				</div>

				{hasTargetDoctor && (
					<button
						type="button"
						onClick={onToggleOnlySameDoctor}
						className={`h-8 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
							onlySameDoctor
								? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
								: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
						}`}
						title="Показывать только пациентов, согласных на этого же врача"
						data-testid="waitlist-filter-same-doctor-btn"
					>
						<span>По врачу</span>
					</button>
				)}
			</div>

			{/* Urgency Filter Chips: 4 fast pills */}
			<div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap py-0.5 scrollbar-none">
				<button
					type="button"
					onClick={() => onSelectUrgency("all")}
					className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
						selectedUrgency === "all"
							? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
							: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					data-testid="waitlist-urgency-all"
				>
					Все ({items.length})
				</button>
				{(["acute_pain", "ortho_endo", "hygiene", "routine"] as const).map(
					(u) => {
						const cfg = URGENCY_CONFIG[u];
						const count = items.filter(
							(i) => detectWaitlistUrgency(i) === u,
						).length;
						const isSel = selectedUrgency === u;
						return (
							<button
								key={u}
								type="button"
								onClick={() => onSelectUrgency(u)}
								className={`h-7 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
									isSel
										? `${cfg.badgeClass} ring-1`
										: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid={`waitlist-urgency-${u}`}
							>
								<span>{cfg.shortLabel}</span>
								{count > 0 && <span className="opacity-75">({count})</span>}
							</button>
						);
					},
				)}
			</div>
		</div>
	);
};
