import type { GeneralCleaningLog } from "@dental/shared";
import { Calculator, Plus, Search, X } from "lucide-react";
import type React from "react";
import { GeneralCleaningOptionsMenu } from "./GeneralCleaningOptionsMenu";

export interface GeneralCleaningControlBarProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly typeFilter: string;
	readonly setTypeFilter: (t: string) => void;
	readonly viewMode: "table" | "schedule";
	readonly setViewMode: (m: "table" | "schedule") => void;
	readonly onOpenDisinfectionModal: () => void;
	readonly onQuickRecordNormCleaning: () => void;
	readonly onAutopilotMonth: () => void;
	readonly isAutopilotLoading: boolean;
	readonly submitting: boolean;
	readonly logs: readonly GeneralCleaningLog[];
	readonly filteredLogs: readonly GeneralCleaningLog[];
}

export const GeneralCleaningControlBar: React.FC<GeneralCleaningControlBarProps> = ({
	searchQuery, setSearchQuery, typeFilter, setTypeFilter, viewMode, setViewMode,
	onOpenDisinfectionModal, onQuickRecordNormCleaning, onAutopilotMonth,
	isAutopilotLoading, submitting, logs, filteredLogs,
}) => {
	return (
		<div className="sanpin-control-bar">
			<div className="sanpin-filter-group">
				<div className="dente-search-wrap" style={{ minWidth: "240px" }}>
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						placeholder="Поиск по кабинету, дезсредству..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="dente-search-input !h-9"
					/>
					{searchQuery && (
						<button type="button" className="dente-search-clear" onClick={() => setSearchQuery("")} aria-label="Очистить поиск">
							<X size={12} />
						</button>
					)}
				</div>
				<select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="sanpin-select" style={{ height: "36px" }}>
					<option value="all">Все виды уборок</option>
					<option value="general">Генеральные уборки</option>
					<option value="current_routine">Текущая дезинфекция</option>
				</select>
			</div>

			<div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
				<div className="dente-segmented-bar" role="tablist">
					<button
						type="button" role="tab" aria-selected={viewMode === "table"} onClick={() => setViewMode("table")}
						className={`dente-segmented-item ${viewMode === "table" ? "active" : ""}`}
					>
						Таблица
					</button>
					<button
						type="button" role="tab" aria-selected={viewMode === "schedule"} onClick={() => setViewMode("schedule")}
						className={`dente-segmented-item ${viewMode === "schedule" ? "active" : ""}`}
					>
						График (7 дн.)
					</button>
				</div>

				<button
					type="button" onClick={onOpenDisinfectionModal} className="sanpin-btn sanpin-btn-secondary"
					style={{ height: "36px", minHeight: "36px", padding: "0 0.85rem", fontSize: "0.825rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
					title="Расчет концентрации, расхода дезраствора и график генеральной уборки"
				>
					<Calculator size={15} className="text-teal" /> Расчет дезсредства
				</button>

				<button
					type="button" onClick={onQuickRecordNormCleaning} className="sanpin-btn sanpin-btn-primary"
					style={{ height: "36px", minHeight: "36px", padding: "0 0.85rem", fontSize: "0.825rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
				>
					<Plus size={15} /> Зафиксировать уборку
				</button>

				<GeneralCleaningOptionsMenu
					logs={logs}
					filteredLogs={filteredLogs}
					isAutopilotLoading={isAutopilotLoading}
					submitting={submitting}
					onAutopilotMonth={onAutopilotMonth}
					onQuickRecordNormCleaning={onQuickRecordNormCleaning}
				/>
			</div>
		</div>
	);
};
