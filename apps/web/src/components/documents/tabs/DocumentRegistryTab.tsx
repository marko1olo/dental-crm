/**
 * tabs/DocumentRegistryTab.tsx
 * Documents registry list view (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 */

import React from "react";
import type { DocumentKind } from "@dental/shared";
import { FileText } from "lucide-react";
import { DocumentRegistryFilterBar } from "../DocumentRegistryFilterBar";
import { EmptyState } from "../../EmptyState";
import type { DocumentRegistryTabProps } from "./registry/documentRegistryTypes";
import { DocumentRegistryRow } from "./registry/DocumentRegistryRow";

export type { DocumentRegistryTabProps } from "./registry/documentRegistryTypes";

export const DocumentRegistryTab: React.FC<DocumentRegistryTabProps> = React.memo(
	function DocumentRegistryTab(props) {
		const {
			activeCategoryTab,
			registrySearchQuery,
			setRegistrySearchQuery,
			registryStatusFilter,
			setRegistryStatusFilter,
			registryEdsFilter,
			setRegistryEdsFilter,
			registryKindFilter,
			setRegistryKindFilter,
			typedActiveDocuments,
			filteredActiveDocuments,
			availableRegistryKinds,
			setActiveCategoryTab,
			documentsSlice,
			setDisplayLimit,
		} = props;

		return (
			<>
				<DocumentRegistryFilterBar
					activeCategoryTab={activeCategoryTab}
					searchQuery={registrySearchQuery}
					onSearchChange={setRegistrySearchQuery}
					statusFilter={registryStatusFilter}
					onStatusFilterChange={setRegistryStatusFilter}
					edsFilter={registryEdsFilter}
					onEdsFilterChange={setRegistryEdsFilter}
					kindFilter={registryKindFilter}
					onKindFilterChange={(val) => setRegistryKindFilter(val as "all" | DocumentKind)}
					totalCount={typedActiveDocuments?.length ?? 0}
					filteredCount={filteredActiveDocuments.length}
					availableKinds={availableRegistryKinds.map((k) => ({ kind: k.key, label: k.label }))}
					onResetFilters={() => {
						setRegistrySearchQuery("");
						setRegistryStatusFilter("all");
						setRegistryEdsFilter("all");
						setRegistryKindFilter("all");
						setActiveCategoryTab("all");
					}}
				/>

				<div className="document-list">
					{documentsSlice.visibleItems.map((doc) => (
						<DocumentRegistryRow key={doc.id} {...props} document={doc} />
					))}

					{documentsSlice.hasMore && (
						<div className="py-4 text-center bg-[var(--paper-soft)] rounded-xl my-2">
							<button
								type="button"
								className="btn-documents-show-more h-9 px-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] font-semibold text-xs inline-flex items-center gap-1.5 hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
								data-testid="btn-documents-show-more"
								onClick={() => setDisplayLimit((prev) => prev + 40)}
							>
								<span>Показать ещё 40 документов (осталось {documentsSlice.remainingCount})</span>
							</button>
						</div>
					)}

					{(filteredActiveDocuments ?? []).length === 0 && (
						<EmptyState
							title={(typedActiveDocuments ?? []).length === 0 ? "Нет документов" : "Документы не найдены"}
							description={(typedActiveDocuments ?? []).length === 0
								? "Для этого пациента еще не сформировано ни одного документа. Выберите шаблон выше и нажмите «Создать»."
								: "По заданным фильтрам и поисковому запросу ничего не найдено. Попробуйте сбросить фильтры поиска."}
							icon={<FileText size={24} aria-hidden="true" />}
							className="my-4 py-6"
						/>
					)}
				</div>
			</>
		);
	},
);
