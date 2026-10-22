import { Activity, FileText, Layers, Search, X } from "lucide-react";

export interface ClinicalCatalogSearchAndModesProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	viewMode: "procedures" | "chunks" | "diagnoses";
	setViewMode: (mode: "procedures" | "chunks" | "diagnoses") => void;
	proceduresCount: number;
	chunksCount: number;
	diagnosesCount: number;
}

export function ClinicalCatalogSearchAndModes({
	searchQuery,
	setSearchQuery,
	viewMode,
	setViewMode,
	proceduresCount,
	chunksCount,
	diagnosesCount,
}: ClinicalCatalogSearchAndModesProps) {
	return (
		<div className="p-3 border-b border-[var(--glass-border)] bg-[var(--paper)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
			<div className="dente-search-wrap flex-1">
				<Search size={15} className="dente-search-icon" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Поиск по процедуре, МКБ-10, материалу или симптому (например: кариес, пульпит, виниры)..."
					className="dente-search-input"
					autoFocus
					data-testid="input-search-protocols"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => setSearchQuery("")}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						<X size={14} />
					</button>
				)}
			</div>

			<div className="dente-segmented-bar shrink-0 self-start sm:self-auto">
				<button
					type="button"
					onClick={() => setViewMode("procedures")}
					className={`dente-segmented-item ${viewMode === "procedures" ? "active" : ""}`}
					data-testid="btn-view-mode-procedures"
				>
					<Layers size={13} />
					<span>Процедуры ({proceduresCount})</span>
				</button>
				<button
					type="button"
					onClick={() => setViewMode("chunks")}
					className={`dente-segmented-item ${viewMode === "chunks" ? "active" : ""}`}
					data-testid="btn-view-mode-chunks"
				>
					<FileText size={13} />
					<span>Все блоки ({chunksCount})</span>
				</button>
				<button
					type="button"
					onClick={() => setViewMode("diagnoses")}
					className={`dente-segmented-item ${viewMode === "diagnoses" ? "active" : ""}`}
					data-testid="btn-view-mode-diagnoses"
				>
					<Activity size={13} />
					<span>МКБ-10 ({diagnosesCount})</span>
				</button>
			</div>
		</div>
	);
}
