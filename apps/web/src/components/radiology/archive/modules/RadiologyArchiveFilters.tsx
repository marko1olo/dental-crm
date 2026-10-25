import React from "react";
import { Filter, Plus, Search, Sparkles } from "lucide-react";
import type { ArchiveBindingFilter, ArchiveModalityFilter } from "./RadiologyArchiveTypes";

export interface RadiologyArchiveFiltersProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly modalityFilter: ArchiveModalityFilter;
	readonly setModalityFilter: (m: ArchiveModalityFilter) => void;
	readonly bindingFilter: ArchiveBindingFilter;
	readonly setBindingFilter: (b: ArchiveBindingFilter) => void;
	readonly onUploadNew?: (() => void) | undefined;
	readonly onOpenTactileMatrix?: (() => void) | undefined;
	readonly datePresetFilter?: string | undefined;
	readonly setDatePresetFilter?: ((p: string) => void) | undefined;
	readonly toothFilter?: string | undefined;
	readonly setToothFilter?: ((t: string) => void) | undefined;
}

export const RadiologyArchiveFilters: React.FC<RadiologyArchiveFiltersProps> = ({
	searchQuery, setSearchQuery, modalityFilter, setModalityFilter,
	bindingFilter, setBindingFilter, onUploadNew, onOpenTactileMatrix,
	datePresetFilter = "all", setDatePresetFilter, toothFilter = "all", setToothFilter,
}) => {
	const modalities: Array<{ key: ArchiveModalityFilter; label: string; testId: string }> = [
		{ key: "all", label: "Все", testId: "filter-modality-all" },
		{ key: "cbct", label: "3D КЛКТ", testId: "filter-modality-cbct" },
		{ key: "opg", label: "Панорама", testId: "filter-modality-opg" },
		{ key: "periapical", label: "Прицельные (RVG)", testId: "filter-modality-rvg" },
		{ key: "photo", label: "Фото", testId: "filter-modality-photo" },
	];

	return (
		<div className="flex flex-col gap-2 p-3 bg-[var(--paper-strong)] border-b border-[var(--line)]">
			<div className="flex items-center gap-2 flex-wrap justify-between">
				<div className="relative flex-1 min-w-[180px] max-w-sm">
					<Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
					<input
						type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по ФИО пациента или номеру карты..." data-testid="archive-search-input"
						className="w-full pl-9 pr-3 py-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-lg text-xs text-[var(--text)] outline-none focus:border-[var(--primary)]"
					/>
				</div>

				<button
					type="button" data-testid="btn-open-tactile-matrix" onClick={onOpenTactileMatrix}
					className="h-7 px-2.5 rounded-md font-semibold text-xs bg-teal-600/10 text-teal-400 hover:bg-teal-600/20 border border-teal-500/30 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
					title="Тактильная матрица поиска (Снимок 19)"
				>
					<Search className="w-3.5 h-3.5" />
					<span>Матрица поиска (Снимок 19)</span>
				</button>

				<div className="flex items-center gap-1 bg-[var(--paper)] border border-[var(--line)] rounded-lg p-0.5" data-testid="archive-date-presets-bar">
					{["all", "today", "yesterday", "3days", "last_week", "last_month"].map((p) => (
						<button
							key={p} type="button" onClick={() => setDatePresetFilter?.(p)}
							data-testid={p === "today" ? "archive-date-today" : p === "yesterday" ? "archive-date-yesterday" : p === "3days" ? "archive-date-3days" : p === "last_week" ? "archive-date-week" : p === "last_month" ? "archive-date-month" : undefined}
							className={`h-6 px-2 rounded text-xs font-semibold ${datePresetFilter === p ? "bg-teal-600 text-white" : "text-[var(--text-muted)] hover:text-[var(--text)]"}`}
						>
							{p === "all" ? "Все" : p === "today" ? "Сегодня" : p === "yesterday" ? "Вчера" : p === "3days" ? "3 дня" : p === "last_week" ? "Неделя" : "Месяц"}
						</button>
					))}
				</div>

				<select
					value={toothFilter} onChange={(e) => setToothFilter?.(e.target.value)}
					className="h-7 px-2 rounded-md bg-[var(--paper)] border border-[var(--line)] text-[var(--text)] text-xs outline-none cursor-pointer"
					data-testid="archive-tooth-filter"
				>
					<option value="all">Все зубы (FDI)</option>
					{["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28","48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"].map((t) => (
						<option key={t} value={t}>#{t}</option>
					))}
				</select>

				<div className="flex items-center gap-1 overflow-x-auto pb-0.5">
					{modalities.map((m) => (
						<button
							key={m.key} type="button" data-testid={m.testId} onClick={() => setModalityFilter(m.key)}
							className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${modalityFilter === m.key ? "bg-[var(--primary)] text-white" : "bg-[var(--paper)] text-[var(--text-muted)] hover:text-[var(--text)]"}`}
						>
							{m.label}
						</button>
					))}
					<button
						type="button" data-testid="filter-binding-pending"
						onClick={() => setBindingFilter(bindingFilter === "pending_review" ? "all" : "pending_review")}
						className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${bindingFilter === "pending_review" ? "bg-amber-600 text-white" : "bg-[var(--paper)] text-[var(--text-muted)] hover:text-[var(--text)]"}`}
					>
						Ожидают контроля
					</button>
					<button
						type="button" data-testid="btn-auto-bind-scan"
						className="px-2.5 py-1 rounded-md text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white inline-flex items-center gap-1 cursor-pointer"
						title="Запустить алгоритм автопривязки неразобранных КТ по ФИО и дате рождения"
					>
						<Sparkles className="w-3 h-3" />
						<span>Автопривязка по ФИО</span>
					</button>
					{onUploadNew && (
						<button type="button" data-testid="btn-archive-upload-new" onClick={onUploadNew} className="px-2.5 py-1 rounded-md text-xs font-bold bg-teal-600 text-white inline-flex items-center gap-1 cursor-pointer">
							<Plus size={12} /><span>Загрузить</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
