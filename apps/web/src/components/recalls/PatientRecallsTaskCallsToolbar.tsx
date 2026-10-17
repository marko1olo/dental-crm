import type React from "react";
import { Search, X } from "lucide-react";
import { STOMX_TASK_CALLS_CATALOG, type StomxTaskCallType } from "@dental/shared";
import type { TaskCallCandidateItem } from "./PatientRecallsTaskCallsTab";

export interface PatientRecallsTaskCallsToolbarProps {
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly selectedTaskCallType: StomxTaskCallType | "all";
	readonly onSelectTaskCallType: (type: StomxTaskCallType | "all") => void;
	readonly activeTaskCallScriptType: StomxTaskCallType | null;
	readonly onToggleTaskCallScriptType: (type: StomxTaskCallType | null) => void;
	readonly taskCallCandidates: readonly TaskCallCandidateItem[];
}

export const PatientRecallsTaskCallsToolbar: React.FC<PatientRecallsTaskCallsToolbarProps> = ({
	searchQuery,
	onSearchQueryChange,
	selectedTaskCallType,
	onSelectTaskCallType,
	activeTaskCallScriptType,
	onToggleTaskCallScriptType,
	taskCallCandidates,
}) => {
	const btnCls = "recall-action-btn border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors";

	return (
		<div className="recall-toolbar">
			<div className="recall-toolbar-top">
				<div className="recall-search-input-wrap dente-search-wrap">
					<Search size={15} className="recall-search-icon dente-search-icon" aria-hidden="true" />
					<label htmlFor="task-call-search-input" className="sr-only">Поиск по пациенту, телефону или врачу</label>
					<input
						id="task-call-search-input"
						type="search"
						className="recall-search-input dente-search-input"
						placeholder="Поиск по пациенту, телефону или врачу..."
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
					/>
					{searchQuery && (
						<button type="button" onClick={() => onSearchQueryChange("")} className="dente-search-clear" aria-label="Очистить поиск">
							<X size={13} />
						</button>
					)}
				</div>

				{activeTaskCallScriptType && (
					<button type="button" onClick={() => onToggleTaskCallScriptType(null)} className={btnCls} style={{ minHeight: "44px" }}>
						<span>Скрыть речевой скрипт</span>
					</button>
				)}
			</div>

			<div className="recall-status-chips" role="radiogroup" aria-label="Фильтр по типам сервисных звонков">
				<button
					type="button"
					data-testid="chip-task-call-all"
					className={`recall-chip border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors ${selectedTaskCallType === "all" ? "active" : ""}`}
					onClick={() => onSelectTaskCallType("all")}
				>
					Все задачи
					<span className="recall-chip-badge">{taskCallCandidates.length}</span>
				</button>

				{STOMX_TASK_CALLS_CATALOG.map((cat) => {
					const count = taskCallCandidates.filter((item) => item.taskType === cat.type).length;
					return (
						<button
							key={cat.type}
							type="button"
							data-testid={`chip-task-call-${cat.type}`}
							className={`recall-chip border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors ${selectedTaskCallType === cat.type ? "active" : ""}`}
							onClick={() => onSelectTaskCallType(cat.type)}
						>
							{cat.shortLabelRu}
							{count > 0 && <span className="recall-chip-badge">{count}</span>}
						</button>
					);
				})}
			</div>
		</div>
	);
};
