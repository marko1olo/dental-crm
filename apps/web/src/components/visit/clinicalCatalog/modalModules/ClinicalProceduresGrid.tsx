import type { ClinicalChunk1142, GroupedClinicalProcedure } from "../clinicalProtocolsCatalog";
import { ClinicalProcedureCard } from "./ClinicalProcedureCard";

export interface ClinicalProceduresGridProps {
	filteredProcedures: readonly GroupedClinicalProcedure[];
	paginatedProcedures: readonly GroupedClinicalProcedure[];
	searchQuery: string;
	expandedProcedureId: string | null;
	onToggleExpand: (id: string) => void;
	onApplyFull: (proc: GroupedClinicalProcedure) => void;
	onApplyChunk: (chunk: ClinicalChunk1142) => void;
	onShowMore: () => void;
	pageSize: number;
}

export function ClinicalProceduresGrid({
	filteredProcedures,
	paginatedProcedures,
	searchQuery,
	expandedProcedureId,
	onToggleExpand,
	onApplyFull,
	onApplyChunk,
	onShowMore,
	pageSize,
}: ClinicalProceduresGridProps) {
	if (filteredProcedures.length === 0) {
		return (
			<div className="text-center py-12 text-[var(--muted)]">
				<p className="text-sm font-semibold">Процедуры по запросу «{searchQuery}» не найдены</p>
				<p className="text-xs mt-1">Попробуйте изменить поисковый запрос или выбрать вкладку «Все»</p>
			</div>
		);
	}

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
				{paginatedProcedures.map((proc) => (
					<ClinicalProcedureCard
						key={proc.id}
						proc={proc}
						isExpanded={expandedProcedureId === proc.id}
						onToggleExpand={onToggleExpand}
						onApplyFull={onApplyFull}
						onApplyChunk={onApplyChunk}
					/>
				))}
			</div>

			{filteredProcedures.length > paginatedProcedures.length && (
				<div className="text-center pt-4">
					<button
						type="button"
						onClick={onShowMore}
						className="h-8 px-4 rounded-lg text-xs font-bold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer"
					>
						Показать ещё {Math.min(pageSize, filteredProcedures.length - paginatedProcedures.length)} из {filteredProcedures.length}
					</button>
				</div>
			)}
		</>
	);
}
