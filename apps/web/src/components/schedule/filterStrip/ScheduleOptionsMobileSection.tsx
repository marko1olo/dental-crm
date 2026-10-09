import { Armchair, LayoutGrid, List } from "lucide-react";
import type React from "react";
import type { ReactElement } from "react";
import { formatChairSpecialtyLabel } from "./constants";
import type {
	ScheduleBranch,
	ScheduleChair,
	ScheduleStaffMember,
} from "./types";

export interface ScheduleOptionsMobileSectionProps {
	setScheduleViewMode?: (mode: "timeline" | "grid" | "chairs") => void;
	scheduleViewMode?: "timeline" | "grid" | "chairs";
	setIsOptionsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	hasMultipleBranches: boolean;
	selectedBranchId?: string | null;
	onSelectBranch?: (branchId: string | null) => void;
	activeBranches: ScheduleBranch[];
	activeScheduleFilterCount: number;
	resetScheduleFilters: () => void;
	hasMultipleChairs: boolean;
	myChair: ScheduleChair | null;
	isMyChairActive: boolean;
	handleSelectMyChair: () => void;
	hasMultipleDoctors: boolean;
	activeDoctors: ScheduleStaffMember[];
	scheduleDoctorFilterId?: string | null;
	setScheduleDoctorFilterId?: (id: string | null) => void;
	displayChairs: readonly ScheduleChair[];
	scheduleChairFilterId?: string | null;
	setScheduleChairFilterId?: (id: string | null) => void;
}

export function ScheduleOptionsMobileSection({
	setScheduleViewMode,
	scheduleViewMode = "timeline",
	setIsOptionsMenuOpen,
	hasMultipleBranches,
	selectedBranchId,
	onSelectBranch,
	activeBranches,
	activeScheduleFilterCount,
	resetScheduleFilters,
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
}: ScheduleOptionsMobileSectionProps): ReactElement {
	return (
		<>
			{/* Mobile View Mode Switcher (visible strictly on < sm) */}
			{setScheduleViewMode && (
				<div className="sm:hidden mb-1.5 pb-1.5 border-b border-[var(--line)]">
					<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
						Режим отображения
					</div>
					<div className="schedule-view-mode-segmented flex w-full">
						<button
							type="button"
							onClick={() => {
								setScheduleViewMode("timeline");
								setIsOptionsMenuOpen(false);
							}}
							className={`schedule-view-mode-btn flex-1 ${
								scheduleViewMode === "timeline" ? "active" : ""
							}`}
						>
							<List size={13} className="shrink-0" />
							<span>Лента</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setScheduleViewMode("grid");
								setIsOptionsMenuOpen(false);
							}}
							className={`schedule-view-mode-btn flex-1 ${
								scheduleViewMode === "grid" ? "active" : ""
							}`}
						>
							<LayoutGrid size={13} className="shrink-0" />
							<span>Сетка</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setScheduleViewMode("chairs");
								setIsOptionsMenuOpen(false);
							}}
							className={`schedule-view-mode-btn flex-1 ${
								scheduleViewMode === "chairs" ? "active" : ""
							}`}
						>
							<Armchair size={13} className="shrink-0" />
							<span>Кресла</span>
						</button>
					</div>
				</div>
			)}

			{/* Branch Selector in Mobile / Options dropdown when multiple branches (hidden when <= 1 branch) */}
			{hasMultipleBranches && (
				<div className="px-2 py-1.5 border-b border-[var(--line)] mb-1 pb-1.5">
					<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">
						Филиал клиники
					</div>
					<select
						value={selectedBranchId || ""}
						onChange={(e) => {
							onSelectBranch?.(e.target.value ? e.target.value : null);
							setIsOptionsMenuOpen(false);
						}}
						className="w-full min-h-[44px] sm:min-h-0 sm:h-7 px-2 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer"
						aria-label="Выбор филиала"
						data-testid="schedule-options-branch-select"
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

			{/* Mobile Filter Chips by Doctor & Chair (visible strictly on < sm) */}
			<div className="sm:hidden mb-1.5 pb-1.5 border-b border-[var(--line)]">
				<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
					Фильтр расписания
				</div>
				<div className="flex flex-wrap gap-1 p-0.5">
					<button
						type="button"
						onClick={() => {
							resetScheduleFilters();
							setIsOptionsMenuOpen(false);
						}}
						className={`quick-chip ${activeScheduleFilterCount === 0 ? "active font-bold" : ""} min-h-[44px] px-2.5 text-xs font-semibold rounded-lg`}
					>
						Все записи
					</button>
					{hasMultipleChairs && myChair && (() => {
						const cleanChairName = myChair.name.replace(/\s*\(.*\)/, "").trim();
						return (
							<button
								type="button"
								onClick={() => {
									handleSelectMyChair();
									setIsOptionsMenuOpen(false);
								}}
								className={`quick-chip ${isMyChairActive ? "active font-bold" : ""} min-h-[44px] px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1`}
							>
								<Armchair size={12} />
								<span>Моё ({cleanChairName})</span>
							</button>
						);
					})()}
					{hasMultipleDoctors &&
						activeDoctors.map((m) => (
							<button
								key={`m-opt-doc-${m.id}`}
								type="button"
								onClick={() => {
									setScheduleDoctorFilterId?.(scheduleDoctorFilterId === m.id ? null : m.id);
									setIsOptionsMenuOpen(false);
								}}
								className={`quick-chip ${scheduleDoctorFilterId === m.id ? "active font-bold" : ""} min-h-[44px] px-2 text-xs rounded-lg`}
							>
								{m.fullName?.split(" ")[0] || "Врач"}
							</button>
						))}
					{hasMultipleChairs &&
						displayChairs.map((c) => {
							const specName = formatChairSpecialtyLabel(c?.specialization);
							const shortName = (c?.name || "Кресло").replace(/Кресло\s*/i, "Кр. ");
							const label = specName && !c.name.includes("(") ? `${shortName} (${specName})` : shortName;
							return (
								<button
									key={`m-opt-chair-${c.id}`}
									type="button"
									data-testid={`m-opt-chair-${c.id}`}
									onClick={() => {
										setScheduleChairFilterId?.(scheduleChairFilterId === c.id ? null : c.id);
										setIsOptionsMenuOpen(false);
									}}
									className={`quick-chip ${scheduleChairFilterId === c.id ? "active font-bold" : ""} min-h-[44px] px-2 text-xs rounded-lg flex items-center gap-1`}
									title={c.name}
								>
									<Armchair size={12} className="shrink-0" />
									<span>{label}</span>
								</button>
							);
						})}
				</div>
			</div>
		</>
	);
}
