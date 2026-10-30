import React from "react";
import { Search, X } from "lucide-react";
import { CatalogCategoryTabs } from "./CatalogCategoryTabs";
import { CatalogToolbarActions } from "./CatalogToolbarActions";
import type { DocumentCatalogCategory } from "./types";

export interface CatalogToolbarProps {
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	activeCategory: DocumentCatalogCategory;
	setActiveCategory: (cat: DocumentCatalogCategory) => void;
	categoryCounts: Record<string, number>;
	existingDocsCount: number;
	onSelectRegistryTab?: (() => void) | undefined;
	onOpenAutoclaveLog?: (() => void) | undefined;
	handleOpenIntake: () => void;
	setIsDiplomaModalOpen: (open: boolean) => void;
}

export function CatalogToolbar({
	searchQuery,
	setSearchQuery,
	activeCategory,
	setActiveCategory,
	categoryCounts,
	existingDocsCount,
	onSelectRegistryTab,
	onOpenAutoclaveLog,
	handleOpenIntake,
	setIsDiplomaModalOpen,
}: CatalogToolbarProps): React.JSX.Element {
	return (
		<div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--line,#e2e8f0)] min-w-0 flex-wrap">
			<div
				className="relative shrink-0"
				style={{ width: "210px", minWidth: "210px" }}
			>
				<Search
					className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted,#64748b)] pointer-events-none"
					aria-hidden="true"
				/>
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Поиск по бланкам..."
					style={{ paddingLeft: "38px" }}
					className="document-search-input w-full h-8 pr-7 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] placeholder:text-[var(--muted,#64748b)] focus:border-[var(--teal,#0d9488)] focus:bg-[var(--paper,#ffffff)] focus:outline-hidden transition"
					data-testid="input-documents-catalog-search"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => setSearchQuery("")}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
						aria-label="Очистить поиск"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			<CatalogCategoryTabs
				activeCategory={activeCategory}
				setActiveCategory={setActiveCategory}
				categoryCounts={categoryCounts}
				existingDocsCount={existingDocsCount}
				onSelectRegistryTab={onSelectRegistryTab}
			/>

			<CatalogToolbarActions
				onOpenAutoclaveLog={onOpenAutoclaveLog}
				handleOpenIntake={handleOpenIntake}
				setIsDiplomaModalOpen={setIsDiplomaModalOpen}
			/>
		</div>
	);
}
