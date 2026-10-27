import type React from "react";
import type { ReactElement } from "react";
import { formatChairSpecialtyLabel } from "./constants";
import type { ScheduleChair } from "./types";

export interface CabinetChairChipsProps {
	hasMultipleChairs: boolean;
	displayChairs: readonly ScheduleChair[];
	scheduleChairFilterId?: string | null | undefined;
	setScheduleChairFilterId?: ((id: string | null) => void) | undefined;
	handleOpenAddChair: () => void;
}

export function CabinetChairChips({
	hasMultipleChairs,
	displayChairs,
	scheduleChairFilterId,
	setScheduleChairFilterId,
	handleOpenAddChair,
}: CabinetChairChipsProps): ReactElement {
	return (
		<>
			{displayChairs.length > 0 && (
				<span className="sr-only" data-testid="chair-view-count-badge">
					{displayChairs.length}
				</span>
			)}
			{hasMultipleChairs &&
				displayChairs.map((chair) => {
					const specName = formatChairSpecialtyLabel(chair?.specialization);
					const chairLabel =
						specName && !chair.name.includes("(")
							? `${chair.name} (${specName})`
							: chair?.name || "Кресло";
					const shortChairName = (chair?.name || "Кресло")
						.replace(/Кабинет\s*/i, "Каб. ")
						.replace(/Кресло\s*/i, "Кр. ")
						.replace(/\s*\([^)]*\)/, "");
					const isActive = scheduleChairFilterId === chair.id;

					return (
						<button
							key={chair.id}
							type="button"
							data-testid={`chair-view-badge-${chair.id}`}
							className={`secondary-button quick-chip dente-filter-chip schedule-overflow-chip-2xl h-8 min-h-[32px] sm:min-h-[36px] sm:h-9 max-h-8 sm:max-h-9 rounded-lg px-2.5 text-[12.5px] border border-[var(--line)] ${
								isActive
									? "active font-bold bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
									: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
							} shrink-0 flex-shrink-0 cursor-pointer inline-flex items-center gap-1 select-none whitespace-nowrap`}
							style={{ whiteSpace: "nowrap", flexShrink: 0 }}
							onClick={() =>
								setScheduleChairFilterId?.(isActive ? null : chair.id)
							}
							title={`Фильтр по кабинету / креслу: ${chairLabel}${chair.room ? ` (${chair.room})` : ""}`}
							aria-label={`Фильтр по кабинету / креслу: ${chairLabel}`}
						>
							<span
								className="shrink-0 flex-shrink-0 whitespace-nowrap min-w-max font-medium"
								title={chairLabel}
							>
								{shortChairName}
							</span>
						</button>
					);
				})}

			{/* Кнопка быстрого добавления кресла «+ Кресло» (нейтральная вторичная кнопка) */}
			{hasMultipleChairs && (
				<button
					type="button"
					onClick={handleOpenAddChair}
					className="secondary-button schedule-add-chair-chip-btn dente-filter-chip schedule-overflow-chip-2xl h-8 min-h-[44px] sm:min-h-[36px] sm:h-9 max-h-8 sm:max-h-9 min-w-[44px] rounded-lg shrink-0 flex-shrink-0 px-2.5 mr-1 border border-dashed border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] hover:border-[var(--line-strong,var(--line))] text-[var(--muted)] hover:text-[var(--ink)] text-[12px] font-medium inline-flex items-center justify-center gap-1 cursor-pointer transition-all select-none whitespace-nowrap"
					style={{ whiteSpace: "nowrap", flexShrink: 0, minHeight: "44px", minWidth: "44px" }}
					title="Быстрое добавление кресла или кабинета в расписание"
					aria-label="Добавить кресло в расписание"
					data-testid="schedule-add-chair-btn"
				>
					<span className="whitespace-nowrap shrink-0 flex-shrink-0 font-medium">+ Кресло</span>
				</button>
			)}
		</>
	);
}
