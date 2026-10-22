import { Zap } from "lucide-react";
import type { ClinicalChunk1142 } from "../clinicalProtocolsCatalog";

export interface ClinicalChunksGridProps {
	filteredChunks: readonly ClinicalChunk1142[];
	paginatedChunks: readonly ClinicalChunk1142[];
	searchQuery: string;
	onApplySingleChunk: (chunk: ClinicalChunk1142) => void;
	onShowMore: () => void;
	pageSize: number;
}

export function ClinicalChunksGrid({
	filteredChunks,
	paginatedChunks,
	searchQuery,
	onApplySingleChunk,
	onShowMore,
	pageSize,
}: ClinicalChunksGridProps) {
	if (filteredChunks.length === 0) {
		return (
			<div className="text-center py-12 text-[var(--muted)]">
				<p className="text-sm font-semibold">Блоки по запросу «{searchQuery}» не найдены</p>
			</div>
		);
	}

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
				{paginatedChunks.map((chunk) => (
					<div
						key={chunk.id}
						className="p-3 sm:p-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] hover:border-[var(--teal)]/60 transition-all shadow-2xs flex flex-col justify-between h-full space-y-2"
					>
						<div className="space-y-1.5 min-w-0">
							<div className="flex items-center gap-1.5 flex-wrap">
								<span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)]">
									{chunk.categoryName}
								</span>
								<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--glass-border)]">
									ID: {chunk.id}
								</span>
							</div>
							<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug line-clamp-2" title={chunk.name}>
								{chunk.name}
							</h4>
							<p className="text-xs text-[var(--muted)] line-clamp-3 leading-relaxed">
								{chunk.text}
							</p>
						</div>

						<div className="pt-2 border-t border-[var(--glass-border)] mt-auto">
							<button
								type="button"
								onClick={() => onApplySingleChunk(chunk)}
								className="w-full h-8 px-3 rounded-lg text-xs font-bold bg-[var(--teal-soft)] hover:bg-[var(--teal-fill)] hover:text-[var(--on-teal)] text-[var(--teal-dark)] transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
								title="Вставить блок в соответствующий раздел карты"
							>
								<Zap size={13} />
								<span>Вставить в дневник</span>
							</button>
						</div>
					</div>
				))}
			</div>

			{filteredChunks.length > paginatedChunks.length && (
				<div className="text-center pt-4">
					<button
						type="button"
						onClick={onShowMore}
						className="h-8 px-4 rounded-lg text-xs font-bold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer"
					>
						Показать ещё {Math.min(pageSize, filteredChunks.length - paginatedChunks.length)} из {filteredChunks.length}
					</button>
				</div>
			)}
		</>
	);
}
