import React from "react";
import { Award, FileCheck, Printer, Search, X } from "lucide-react";
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
	searchQuery, setSearchQuery, activeCategory, setActiveCategory,
	categoryCounts, existingDocsCount, onSelectRegistryTab, onOpenAutoclaveLog,
	handleOpenIntake, setIsDiplomaModalOpen,
}: CatalogToolbarProps) {
	const tabs = [
		{ id: "all" as const, label: "Все", testId: "filter-cat-all", count: categoryCounts.all },
		{ id: "intake" as const, label: "Первичный приём", testId: "filter-cat-intake" },
		{ id: "clinical" as const, label: "Лечение", testId: "filter-cat-clinical" },
		{ id: "finance_tax" as const, label: "Финансы и ФНС", testId: "filter-cat-finance" },
		{ id: "refusal" as const, label: "Отказы", testId: "filter-cat-refusal" },
		{ id: "pediatric" as const, label: "Детские", testId: "filter-cat-pediatric" },
		{ id: "registry" as const, label: "Реестр", testId: "filter-cat-registry", count: existingDocsCount },
	];

	return (
		<div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--line,#e2e8f0)] min-w-0 flex-wrap">
			<div className="relative shrink-0" style={{ width: "210px", minWidth: "210px" }}>
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted,#64748b)] pointer-events-none" aria-hidden="true" />
				<input
					type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="Поиск по бланкам..." style={{ paddingLeft: "38px" }}
					className="document-search-input w-full h-8 pr-7 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-xs text-[var(--ink,#0f172a)] placeholder:text-[var(--muted,#64748b)] focus:border-[var(--teal,#0d9488)] focus:bg-[var(--paper,#ffffff)] focus:outline-hidden transition"
					data-testid="input-documents-catalog-search"
				/>
				{searchQuery && (
					<button type="button" onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer" aria-label="Очистить поиск">
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			<div className="dente-segmented-bar inline-flex p-0.5 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)] gap-0.5 overflow-x-auto max-w-full min-h-[32px] items-center shrink-0 select-none" role="tablist" aria-label="Категории документов">
				{tabs.map((tab) => {
					const isActive = activeCategory === tab.id;
					return (
						<button
							key={tab.id} type="button" role="tab" aria-selected={isActive}
							onClick={() => { setActiveCategory(tab.id); if (tab.id === "registry") onSelectRegistryTab?.(); }}
							className={`dente-segmented-item h-7 px-2 rounded-lg text-xs transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 border ${
								isActive ? "active bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/40 shadow-2xs font-bold" : "bg-transparent border-transparent text-[var(--ink,#334155)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)]/70 font-semibold"
							}`}
							data-testid={tab.testId}
						>
							<span>{tab.label}</span>
							{tab.count !== undefined && (
								<span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? "bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)]" : "bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]"}`}>
									{tab.count}
								</span>
							)}
						</button>
					);
				})}
			</div>

			<div className="flex items-center gap-1.5 shrink-0">
				{onOpenAutoclaveLog && (
					<button type="button" onClick={onOpenAutoclaveLog} className="secondary-button documents-open-autoclave-log-257-btn h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0" data-testid="documents-open-autoclave-log-257-btn" title="Открыть журнал контроля стерилизации и автоклавирования">
						<FileCheck className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span className="whitespace-nowrap">Автоклав</span>
					</button>
				)}
				<button type="button" onClick={handleOpenIntake} className="primary-button h-8 px-2.5 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0 shadow-2xs" data-testid="btn-catalog-primary-intake" title="Пакет приёма в 1 клик (ИДС + Договор + Персданные)">
					<Printer className="w-3.5 h-3.5 text-white" />
					<span className="whitespace-nowrap">Пакет приёма</span>
				</button>
				<button type="button" onClick={() => setIsDiplomaModalOpen(true)} className="secondary-button h-8 px-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:border-[var(--teal,#0d9488)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0" data-testid="btn-catalog-print-diploma" title="Печать памятного диплома маленькому пациенту за смелость">
					<Award className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
					<span className="hidden xl:inline whitespace-nowrap">Грамота</span>
				</button>
			</div>
		</div>
	);
}
