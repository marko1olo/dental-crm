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
				<div className="dente-search-wrap flex-1 min-w-[140px]">
					<Search className="dente-search-icon" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Поиск по ФИО или телефону..."
						className="dente-search-input"
						data-testid="waitlist-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchChange("")}
							className="dente-search-clear"
							aria-label="Очистить поиск"
						>
							<X size={12} />
						</button>
					)}
				</div>

				{hasTargetDoctor && (
					<button
						type="button"
						onClick={onToggleOnlySameDoctor}
						className={`dente-filter-chip ${
							onlySameDoctor ? "active" : ""
						}`}
						title="Показывать только пациентов, согласных на этого же врача"
						data-testid="waitlist-filter-same-doctor-btn"
					>
						<span>По врачу</span>
					</button>
				)}
			</div>

			{/* Urgency Filter Chips: 4 fast pills */}
			<div className="dente-filter-chips overflow-x-auto whitespace-nowrap py-0.5 scrollbar-none">
				<button
					type="button"
					onClick={() => onSelectUrgency("all")}
					className={`dente-filter-chip ${selectedUrgency === "all" ? "active" : ""}`}
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
								className={`dente-filter-chip ${isSel ? "active" : ""}`}
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
