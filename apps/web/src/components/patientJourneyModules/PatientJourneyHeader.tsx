import { Search, X } from "lucide-react";
import type React from "react";
import { PatientJourneyFilterChips } from "./PatientJourneyFilterChips";

export interface PatientJourneyHeaderProps {
	readonly patientId: string;
	readonly totalEventsCount: number;
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
}

export const PatientJourneyHeader: React.FC<PatientJourneyHeaderProps> = ({
	patientId,
	totalEventsCount,
	searchQuery,
	setSearchQuery,
}) => {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2.5">
					<h3 className="text-sm sm:text-base font-bold text-[var(--ink)] m-0">
						История визитов и событий
					</h3>
					<span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
						{totalEventsCount} {totalEventsCount === 1 ? "запись" : "записей"}
					</span>
				</div>
				<span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
					ID: {typeof patientId === "string" ? patientId.slice(0, 8) : "—"}
				</span>
			</div>

			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2">
				<div className="relative flex items-center w-full">
					<Search
						size={15}
						className="absolute left-3 text-[var(--muted)] pointer-events-none"
					/>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по записям приёма..."
						className="w-full min-h-[38px] h-9.5 pl-9 pr-9 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--teal)] focus:ring-1 focus:ring-[var(--teal-soft)] transition-all font-medium"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="absolute right-1 top-1 bottom-1 px-2 flex items-center justify-center rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
							title="Очистить поиск"
						>
							<X size={14} />
						</button>
					)}
				</div>
				<PatientJourneyFilterChips
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
				/>
			</div>
		</div>
	);
};
