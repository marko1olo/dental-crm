import * as React from "react";
import { CheckCircle2, Filter, Search, X } from "lucide-react";
import { type PipelineStageFilter, STAGE_CONFIG } from "./types";

export interface TreatmentPipelineToolbarProps {
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
	selectedStage: PipelineStageFilter;
	onResetStageFilter: () => void;
	selectedDoctorId: string;
	onDoctorIdChange: (doctorId: string) => void;
	accumulatedDoctors: Array<{ id: string; name: string }>;
	dropoutMessage?: string | null | undefined;
	onDismissDropoutMessage?: (() => void) | undefined;
}

export const TreatmentPipelineToolbar: React.FC<TreatmentPipelineToolbarProps> = ({
	searchQuery,
	onSearchQueryChange,
	selectedStage,
	onResetStageFilter,
	selectedDoctorId,
	onDoctorIdChange,
	accumulatedDoctors,
	dropoutMessage,
	onDismissDropoutMessage,
}) => {
	return (
		<div className="space-y-3">
			{/* Dropout Banner Alert */}
			{dropoutMessage && (
				<div
					className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200"
					data-testid="pipeline-dropout-alert-banner"
				>
					<div className="flex items-center gap-2">
						<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
						<span className="font-medium">{dropoutMessage}</span>
					</div>
					<button
						type="button"
						onClick={onDismissDropoutMessage}
						className="text-[var(--muted)] hover:text-[var(--text)] transition p-1 rounded-md"
						title="Скрыть уведомление"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Filter & Search Bar */}
			<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 sm:p-3 bg-[var(--paper)] border border-[var(--line)] rounded-2xl shadow-sm">
				{/* Search Field */}
				<div className="relative flex-1 max-w-md dente-search-wrap">
					<Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
						placeholder="Поиск по пациенту, телефону или плану..."
						style={{ paddingLeft: "38px" }}
						className="w-full h-9 sm:h-[38px] min-h-[36px] pr-4 text-xs rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--teal,#0d9488)] outline-none transition pipeline-search-input"
						data-testid="pipeline-search-input"
					/>
				</div>

				<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
					{/* Active stage filter reset pill */}
					{selectedStage !== "all" && (
						<button
							type="button"
							onClick={onResetStageFilter}
							className="h-9 sm:h-[38px] min-h-[36px] px-3 rounded-xl bg-[var(--teal-subtle,#0d948815)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30 text-xs font-medium flex items-center gap-1.5 transition hover:bg-[var(--teal,#0d9488)]/20 shadow-xs cursor-pointer"
							title="Сбросить фильтр этапа"
							data-testid="pipeline-stage-filter-reset"
						>
							<span>Этап: {STAGE_CONFIG[selectedStage]?.title || selectedStage}</span>
							<X className="w-3.5 h-3.5" />
						</button>
					)}

					{/* Doctor selection filter - preserved across filtering (Red Team Trap 3) */}
					<div className="relative w-full sm:w-auto">
						<select
							value={selectedDoctorId}
							onChange={(e) => onDoctorIdChange(e.target.value)}
							className="w-full sm:w-auto h-9 sm:h-[38px] min-h-[36px] px-3 pr-8 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--text)] font-medium outline-none focus:border-[var(--teal,#0d9488)] transition appearance-none cursor-pointer"
							data-testid="pipeline-doctor-filter-select"
						>
							<option value="all">Все лечащие врачи</option>
							{accumulatedDoctors.map((doc) => (
								<option key={doc.id} value={doc.id}>
									{doc.name}
								</option>
							))}
						</select>
						<Filter className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]" />
					</div>
				</div>
			</div>
		</div>
	);
};
