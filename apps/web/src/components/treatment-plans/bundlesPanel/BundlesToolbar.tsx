import React from "react";
import { Search, X } from "lucide-react";
import { CLINICAL_BUNDLES } from "../treatmentPlanBundlesEngine.js";

const COMMON_TEETH = [11, 16, 21, 26, 36, 46, 14, 24, 34, 44, 38, 48];

interface ToolbarProps {
	readonly stageFilter: number | "all";
	readonly onStageFilterChange: (stage: number | "all") => void;
	readonly selectedTooth: number;
	readonly onToothSelect: (tooth: number) => void;
	readonly customToothInput: string;
	readonly onCustomToothChange: (val: string) => void;
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
}

export const BundlesToolbar: React.FC<ToolbarProps> = ({
	stageFilter,
	onStageFilterChange,
	selectedTooth,
	onToothSelect,
	customToothInput,
	onCustomToothChange,
	searchQuery,
	onSearchChange,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] flex-wrap sm:flex-nowrap min-h-[36px]">
			<div className="dente-filter-chips overflow-x-auto min-w-0 flex-1 py-0.5">
				<button
					type="button"
					onClick={() => onStageFilterChange("all")}
					className={`dente-filter-chip ${stageFilter === "all" ? "active" : ""}`}
					data-active={stageFilter === "all"}
					data-testid="bundle-filter-all"
				>
					Все ({CLINICAL_BUNDLES.length})
				</button>
				<button
					type="button"
					onClick={() => onStageFilterChange(1)}
					className={`dente-filter-chip ${stageFilter === 1 ? "active" : ""}`}
					data-active={stageFilter === 1}
					data-testid="bundle-filter-stage-1"
				>
					Этап I: Терапия
				</button>
				<button
					type="button"
					onClick={() => onStageFilterChange(2)}
					className={`dente-filter-chip ${stageFilter === 2 ? "active" : ""}`}
					data-active={stageFilter === 2}
					data-testid="bundle-filter-stage-2"
				>
					Этап II: Хирургия
				</button>
				<button
					type="button"
					onClick={() => onStageFilterChange(3)}
					className={`dente-filter-chip ${stageFilter === 3 ? "active" : ""}`}
					data-active={stageFilter === 3}
					data-testid="bundle-filter-stage-3"
				>
					Этап III: Ортопедия
				</button>
			</div>

			<div className="flex items-center gap-1.5 shrink-0">
				<div className="flex items-center gap-1 bg-[var(--paper,#ffffff)] border border-[var(--line,var(--border,#cbd5e1))] rounded-lg px-2 h-7">
					<span className="text-[11px] font-bold text-[var(--muted,#64748b)]">Зуб:</span>
					<select
						value={selectedTooth}
						onChange={(e) => onToothSelect(Number(e.target.value))}
						className="bg-transparent font-mono font-bold text-xs text-[var(--ink,#0f172a)] outline-none cursor-pointer"
						title="Выбрать целевой зуб FDI"
					>
						{COMMON_TEETH.map((t) => (
							<option key={t} value={t}>#{t}</option>
						))}
					</select>
					<input
						type="text"
						value={customToothInput}
						onChange={(e) => onCustomToothChange(e.target.value)}
						placeholder="FDI"
						maxLength={2}
						className="w-7 text-center font-mono font-bold text-xs bg-transparent text-[var(--teal,#0d9488)] outline-none border-l border-[var(--line,var(--border,#cbd5e1))] pl-1 ml-1"
						title="Ввести номер зуба FDI вручную"
						data-testid="bundle-tooth-input"
					/>
				</div>

				<div className="dente-search-wrap" style={{ width: "160px" }}>
					<Search size={12} className="dente-search-icon" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Поиск пакета..."
						className="dente-search-input"
						data-testid="bundle-search-input"
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
			</div>
		</div>
	);
};
