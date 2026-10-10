import { Armchair } from "lucide-react";
import type React from "react";
import type { ReactElement } from "react";
import { formatChairSpecialtyLabel } from "./constants";
import { DoctorFilterDropdown } from "./DoctorFilterDropdown";
import type {
	ScheduleBranch,
	ScheduleChair,
	ScheduleStaffMember,
	ShiftQueueCounts,
} from "./types";

export interface CabinetFilterBarProps {
	activeScheduleFilterCount: number;
	scheduleStatusFilter?: string | null | undefined;
	resetScheduleFilters: () => void;
	setScheduleStatusFilter?: ((status: string | null) => void) | undefined;
	queueCounts?: ShiftQueueCounts | undefined;
	hasMultipleBranches: boolean;
	selectedBranchId?: string | null | undefined;
	onSelectBranch?: ((branchId: string | null) => void) | undefined;
	activeBranches: ScheduleBranch[];
	hasMultipleChairs: boolean;
	myChair: ScheduleChair | null;
	isMyChairActive: boolean;
	handleSelectMyChair: () => void;
	hasMultipleDoctors: boolean;
	activeDoctors: ScheduleStaffMember[];
	scheduleDoctorFilterId?: string | null | undefined;
	setScheduleDoctorFilterId?: ((id: string | null) => void) | undefined;
	displayChairs: readonly ScheduleChair[];
	scheduleChairFilterId?: string | null | undefined;
	setScheduleChairFilterId?: ((id: string | null) => void) | undefined;
	handleOpenAddChair: () => void;
	activeFilterSummary?: React.ReactNode | undefined;
}

export function CabinetFilterBar({
	activeScheduleFilterCount,
	scheduleStatusFilter,
	resetScheduleFilters,
	setScheduleStatusFilter,
	queueCounts,
	hasMultipleBranches,
	selectedBranchId,
	onSelectBranch,
	activeBranches,
	hasMultipleChairs,
	myChair,
	isMyChairActive,
	handleSelectMyChair,
	hasMultipleDoctors,
	activeDoctors,
	scheduleDoctorFilterId,
	setScheduleDoctorFilterId,
	displayChairs,
	scheduleChairFilterId,
	setScheduleChairFilterId,
	handleOpenAddChair,
	activeFilterSummary,
}: CabinetFilterBarProps): ReactElement {
	return (
		<>
			<style>{`
				.schedule-filter-chips {
					scrollbar-width: none;
					-ms-overflow-style: none;
				}
				.schedule-filter-chips::-webkit-scrollbar {
					display: none;
				}
			`}</style>
			<div
				className="schedule-filter-chips dente-filter-chips hidden sm:flex flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap flex-nowrap scrollbar-none py-0.5 min-w-0 px-2"
				onWheel={(e) => {
					if (e.deltaY !== 0) {
						e.currentTarget.scrollLeft += e.deltaY;
					}
				}}
			>
				{/* 1-Click Branch Selector: auto-hidden when branches <= 1 (Mandates 8n, 8p) */}
				{hasMultipleBranches && (
					<div
						className="schedule-branch-selector-group flex items-center gap-1 shrink-0"
						data-testid="schedule-branch-selector"
					>
						<select
							value={selectedBranchId || ""}
							onChange={(e) => onSelectBranch?.(e.target.value ? e.target.value : null)}
							className="h-8 min-h-[32px] max-h-8 px-2 text-[12.5px] font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer hover:border-[var(--teal,var(--brand-primary))] transition-all"
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
							className={`quick-chip dente-filter-chip schedule-my-chair-chip h-8 min-h-[44px] sm:min-h-[32px] max-h-8 rounded-lg px-2 text-[12px] ${isMyChairActive ? "active font-semibold" : ""} shrink-0 flex-shrink-0 cursor-pointer inline-flex items-center gap-1.5 transition-all select-none`}
							style={{ whiteSpace: "nowrap", flexShrink: 0 }}
							onClick={handleSelectMyChair}
							title={`Моё дежурное кресло: ${cleanChairName}. Быстрая фильтрация`}
							aria-label={`Моё дежурное кресло: ${cleanChairName}`}
							data-testid="schedule-my-chair-btn"
						>
							<Armchair size={13} className="shrink-0 text-current" aria-hidden="true" />
							<span className="whitespace-nowrap shrink-0 flex-shrink-0">
								Моё кресло
							</span>
						</button>
					);
				})()}

				{/* Doctor filter chips */}
				<DoctorFilterDropdown
					hasMultipleDoctors={hasMultipleDoctors}
					activeDoctors={activeDoctors}
					scheduleDoctorFilterId={scheduleDoctorFilterId ?? null}
					setScheduleDoctorFilterId={setScheduleDoctorFilterId ?? (() => {})}
				/>

				{/* Chair filter chips with specializations */}
				{displayChairs.length > 0 && (
					<span
						className="sr-only"
						data-testid="chair-view-count-badge"
					>
						{displayChairs.length}
					</span>
				)}
				{hasMultipleChairs &&
					displayChairs.map((chair) => {
						const specName = formatChairSpecialtyLabel(chair?.specialization);
						const chairLabel = specName && !chair.name.includes("(")
							? `${chair.name} (${specName})`
							: chair?.name || "Кресло";
						const shortChairName = (chair?.name || "Кресло")
							.replace(/Кабинет\s*/i, "Каб. ")
							.replace(/Кресло\s*/i, "Кр. ")
							.replace(/\s*\([^)]*\)/, "");

						return (
							<button
								key={chair.id}
								type="button"
								data-testid={`chair-view-badge-${chair.id}`}
								className={`quick-chip dente-filter-chip h-8 min-h-[32px] max-h-8 rounded-lg px-2.5 text-[12.5px] ${scheduleChairFilterId === chair.id ? "active font-semibold" : ""} shrink-0 flex-shrink-0 cursor-pointer inline-flex items-center gap-1 select-none whitespace-nowrap`}
								style={{ whiteSpace: "nowrap", flexShrink: 0 }}
								onClick={() =>
									setScheduleChairFilterId?.(
										scheduleChairFilterId === chair.id ? null : chair.id,
									)
								}
								title={`Фильтр по кабинету / креслу: ${chairLabel}${chair.room ? ` (${chair.room})` : ""}`}
								aria-label={`Фильтр по кабинету / креслу: ${chairLabel}`}
							>
								<span className="shrink-0 flex-shrink-0 whitespace-nowrap min-w-max font-medium" title={chairLabel}>
									{shortChairName}
								</span>
							</button>
						);
					})}

				{/* Кнопка быстрого добавления кресла «+ Кресло» */}
				{hasMultipleChairs && (
					<button
						type="button"
						onClick={handleOpenAddChair}
						className="schedule-add-chair-chip-btn dente-filter-chip h-8 min-h-[44px] sm:min-h-[32px] max-h-8 min-w-[44px] rounded-lg shrink-0 flex-shrink-0 px-2.5 mr-1 border-dashed border-[var(--teal,var(--brand-primary))] bg-[var(--teal-soft)] hover:bg-[var(--teal)] hover:text-[var(--paper)] text-[var(--teal-dark)] dark:text-[var(--teal)] text-[12px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition-all select-none whitespace-nowrap"
						style={{ whiteSpace: "nowrap", flexShrink: 0, minHeight: "44px", minWidth: "44px" }}
						title="Быстрое добавление кресла или кабинета в расписание"
						aria-label="Добавить кресло в расписание"
						data-testid="schedule-add-chair-btn"
					>
						<span className="whitespace-nowrap shrink-0 flex-shrink-0 font-semibold">+ Кресло</span>
					</button>
				)}

				{/* Active filter summary */}
				{activeFilterSummary}
			</div>
		</>
	);
}
