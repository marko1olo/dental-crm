import { Check } from "lucide-react";
import type { ClinicalChunk1142 } from "../clinicalProtocolsCatalog";

export interface ClinicalDiagnosesGridProps {
	filteredDiagnoses: readonly ClinicalChunk1142[];
	paginatedDiagnoses: readonly ClinicalChunk1142[];
	searchQuery: string;
	onApplyDiagnosis: (chunk: ClinicalChunk1142) => void;
	onShowMore: () => void;
	pageSize: number;
}

export function ClinicalDiagnosesGrid({
	filteredDiagnoses,
	paginatedDiagnoses,
	searchQuery,
	onApplyDiagnosis,
	onShowMore,
	pageSize,
}: ClinicalDiagnosesGridProps) {
	if (filteredDiagnoses.length === 0) {
		return (
			<div className="text-center py-12 text-[var(--muted)]">
				<p className="text-sm font-semibold">Диагнозы МКБ-10 по запросу «{searchQuery}» не найдены</p>
			</div>
		);
	}

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 items-stretch">
				{paginatedDiagnoses.map((diag) => (
					<div
						key={diag.id}
						className="p-2.5 sm:p-3 rounded-xl border border-[var(--glass-border)] bg-[var(--paper)] hover:border-[var(--teal)]/60 transition-all shadow-2xs flex items-center justify-between gap-2.5"
					>
						<div className="space-y-1 min-w-0 flex-1">
							<div className="flex items-center gap-2">
								{diag.icd10 && (
									<span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40 shrink-0">
										{diag.icd10}
									</span>
								)}
							</div>
							<h4 className="text-xs sm:text-sm font-semibold text-[var(--ink)] leading-snug line-clamp-2" title={diag.name}>
								{diag.name}
							</h4>
						</div>

						<button
							type="button"
							onClick={() => onApplyDiagnosis(diag)}
							className="primary-button shrink-0"
							title="Установить этот диагноз в карту приёма"
						>
							<Check size={13} />
							<span>Выбрать</span>
						</button>
					</div>
				))}
			</div>

			{filteredDiagnoses.length > paginatedDiagnoses.length && (
				<div className="text-center pt-4">
					<button
						type="button"
						onClick={onShowMore}
						className="h-8 px-4 rounded-lg text-xs font-bold border border-[var(--glass-border)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] transition-colors cursor-pointer"
					>
						Показать ещё {Math.min(pageSize, filteredDiagnoses.length - paginatedDiagnoses.length)} из {filteredDiagnoses.length}
					</button>
				</div>
			)}
		</>
	);
}
