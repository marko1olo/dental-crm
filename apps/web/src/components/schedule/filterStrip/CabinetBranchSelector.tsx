import { Armchair } from "lucide-react";
import React from "react";
import type { ReactElement } from "react";
import type { ScheduleBranch, ScheduleChair } from "./types";

export interface CabinetBranchSelectorProps {
	hasMultipleBranches: boolean;
	selectedBranchId?: string | null | undefined;
	onSelectBranch?: ((branchId: string | null) => void) | undefined;
	activeBranches: ScheduleBranch[];
	hasMultipleChairs: boolean;
	myChair: ScheduleChair | null;
	isMyChairActive: boolean;
	handleSelectMyChair: () => void;
}

export function CabinetBranchSelector({
	hasMultipleBranches,
	selectedBranchId,
	onSelectBranch,
	activeBranches,
	hasMultipleChairs,
	myChair,
	isMyChairActive,
	handleSelectMyChair,
}: CabinetBranchSelectorProps): ReactElement {
	return (
		<>
			{/* 1-Click Branch Selector: auto-hidden when branches <= 1 */}
			{hasMultipleBranches && (
				<div
					className="schedule-branch-selector-group flex items-center gap-1 shrink-0"
					data-testid="schedule-branch-selector"
				>
					<select
						value={selectedBranchId || ""}
						onChange={(e) => onSelectBranch?.(e.target.value ? e.target.value : null)}
						className="h-8 min-h-[32px] sm:h-9 sm:min-h-[36px] max-h-8 sm:max-h-9 px-2 text-[12.5px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer hover:border-[var(--line-strong,var(--line))] transition-all"
						aria-label="Выбор филиала клиники"
						data-testid="schedule-branch-select"
					>
						<option value="">Все филиалы</option>
						{activeBranches.map((b) => (
							<option key={b.id} value={b.id}>
								{b.name}
							</option>
						))}
					</select>
				</div>
			)}

			{/* Быстрый фильтр «Моё кресло» */}
			{hasMultipleChairs && myChair && (() => {
				const cleanChairName = myChair.name.replace(/\s*\(.*\)/, "").trim();
				return (
					<button
						type="button"
						className={`secondary-button quick-chip dente-filter-chip schedule-my-chair-chip h-8 min-h-[44px] sm:min-h-[36px] sm:h-9 max-h-8 sm:max-h-9 rounded-lg px-2 text-[12px] border border-[var(--line)] ${
							isMyChairActive
								? "active font-bold bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
								: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
						} shrink-0 flex-shrink-0 cursor-pointer inline-flex items-center gap-1.5 transition-all select-none`}
						style={{ whiteSpace: "nowrap", flexShrink: 0 }}
						onClick={handleSelectMyChair}
						title={`Моё дежурное кресло: ${cleanChairName}. Быстрая фильтрация`}
						aria-label={`Моё дежурное кресло: ${cleanChairName}`}
						data-testid="schedule-my-chair-btn"
					>
						<Armchair size={13} className="shrink-0 text-current" aria-hidden="true" />
						<span className="whitespace-nowrap shrink-0 flex-shrink-0">
							Моё кресло ({cleanChairName})
						</span>
					</button>
				);
			})()}
		</>
	);
}
