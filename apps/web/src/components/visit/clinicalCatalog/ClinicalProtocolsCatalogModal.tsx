import React from "react";
import type { SpecialtyCategoryKey, VisitNoteFieldsPatch } from "./clinicalProtocolsCatalog";
import { ClinicalCatalogModalFooter } from "./modalModules/ClinicalCatalogModalFooter";
import { ClinicalCatalogModalHeader } from "./modalModules/ClinicalCatalogModalHeader";
import { ClinicalCatalogSearchAndModes } from "./modalModules/ClinicalCatalogSearchAndModes";
import { ClinicalCatalogSpecialtyTabs } from "./modalModules/ClinicalCatalogSpecialtyTabs";
import { ClinicalChunksGrid } from "./modalModules/ClinicalChunksGrid";
import { ClinicalDiagnosesGrid } from "./modalModules/ClinicalDiagnosesGrid";
import { ClinicalProceduresGrid } from "./modalModules/ClinicalProceduresGrid";
import { useClinicalCatalogModalState } from "./modalModules/useClinicalCatalogModalState";

export interface ClinicalProtocolsCatalogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly activeTooth?: number | null;
	readonly onApplyPatch: (patch: VisitNoteFieldsPatch, successMessage: string) => void;
	readonly currentNoteForm?: Record<string, any>;
	readonly initialSpecialty?: SpecialtyCategoryKey;
}

/**
 * Канонический фасад каталога клинических протоколов (ClinicalProtocolsCatalogModal).
 * Декомпозирован по МАНДАТУ 8b до <= 120 строк на файл:
 * - useClinicalCatalogModalState: Поиск, фильтрация, пагинация, скролл табов
 * - ClinicalCatalogModalHeader: Заголовок, бейджи, зуб, кнопка закрытия
 * - ClinicalCatalogSearchAndModes: Строка поиска, сегментный переключатель
 * - ClinicalCatalogSpecialtyTabs: Стрелки скролла и чипы специальностей
 * - ClinicalProceduresGrid / ChunksGrid / DiagnosesGrid: Сетки процедур, блоков, МКБ-10
 * - ClinicalCatalogModalFooter: Федеральный статус стандартов и кнопка «Закрыть»
 */
export const ClinicalProtocolsCatalogModal: React.FC<ClinicalProtocolsCatalogModalProps> = React.memo(
	function ClinicalProtocolsCatalogModal(props) {
		const { isOpen, onClose, activeTooth = null } = props;
		const state = useClinicalCatalogModalState(props);

		if (!isOpen) return null;

		return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
				role="dialog"
				aria-modal="true"
				aria-label="Каталог клинических протоколов и дневников приёма"
				data-testid="clinical-protocols-catalog-modal"
				onClick={onClose}
			>
				<div
					className="bg-[var(--paper-strong)] border border-[var(--glass-border)] text-[var(--ink)] rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
					onClick={(e) => e.stopPropagation()}
				>
					<ClinicalCatalogModalHeader activeTooth={activeTooth} onClose={onClose} />
					<ClinicalCatalogSearchAndModes
						searchQuery={state.searchQuery}
						setSearchQuery={state.setSearchQuery}
						viewMode={state.viewMode}
						setViewMode={state.setViewMode}
						proceduresCount={state.filteredProcedures.length}
						chunksCount={state.filteredChunks.length}
						diagnosesCount={state.filteredDiagnoses.length}
					/>
					{state.viewMode !== "diagnoses" && (
						<ClinicalCatalogSpecialtyTabs
							activeCategory={state.activeCategory}
							setActiveCategory={state.setActiveCategory}
							tabsRef={state.tabsRef}
							canScrollLeft={state.canScrollLeft}
							canScrollRight={state.canScrollRight}
							scrollTabs={state.scrollTabs}
						/>
					)}

					<div className="flex-1 overflow-y-auto p-3 sm:p-4" data-testid="protocols-catalog-list">
						{state.viewMode === "procedures" && (
							<ClinicalProceduresGrid
								filteredProcedures={state.filteredProcedures}
								paginatedProcedures={state.paginatedProcedures}
								searchQuery={state.searchQuery}
								expandedProcedureId={state.expandedProcedureId}
								onToggleExpand={(id) => state.setExpandedProcedureId((prev) => (prev === id ? null : id))}
								onApplyFull={state.handleApplyFullProcedure}
								onApplyChunk={state.handleApplySingleChunk}
								onShowMore={() => state.setPage((p) => p + 1)}
								pageSize={state.PAGE_SIZE}
							/>
						)}
						{state.viewMode === "chunks" && (
							<ClinicalChunksGrid
								filteredChunks={state.filteredChunks}
								paginatedChunks={state.paginatedChunks}
								searchQuery={state.searchQuery}
								onApplySingleChunk={state.handleApplySingleChunk}
								onShowMore={() => state.setPage((p) => p + 1)}
								pageSize={state.PAGE_SIZE}
							/>
						)}
						{state.viewMode === "diagnoses" && (
							<ClinicalDiagnosesGrid
								filteredDiagnoses={state.filteredDiagnoses}
								paginatedDiagnoses={state.paginatedDiagnoses}
								searchQuery={state.searchQuery}
								onApplyDiagnosis={state.handleApplyDiagnosis}
								onShowMore={() => state.setPage((p) => p + 1)}
								pageSize={state.PAGE_SIZE}
							/>
						)}
					</div>

					<ClinicalCatalogModalFooter onClose={onClose} />
				</div>
			</div>
		);
	},
);

export default ClinicalProtocolsCatalogModal;
