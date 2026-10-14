import type { Patient } from "@dental/shared";
import { Filter, Plus, RotateCcw, Search, X } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

export interface PatientsFilterToolbarProps {
	readonly query: string;
	readonly onQueryChange: (val: string) => void;
	readonly onClearQuery: () => void;
	readonly searchInputRef?: RefObject<HTMLInputElement | null>;
	readonly filteredPatients: Patient[];
	readonly onSelectPatient: (patientId: string) => void;
	readonly onOpenRecallsHub: () => void;
	readonly onOpenTactileSearch: () => void;
	readonly showLostPatientsOnly: boolean;
	readonly onToggleLostPatients: () => void;
	readonly isLoadingLost: boolean;
	readonly onOpenCreatePatient: () => void;
	readonly categoryFilter: "all" | "primary" | "debt" | "archive";
	readonly onCategoryFilterChange: (cat: "all" | "primary" | "debt" | "archive") => void;
	readonly counts: {
		countAll: number;
		countPrimary: number;
		countDebt: number;
		countArchive: number;
	};
}

export function PatientsFilterToolbar({
	query,
	onQueryChange,
	onClearQuery,
	searchInputRef,
	filteredPatients: _filteredPatients,
	onSelectPatient: _onSelectPatient,
	onOpenRecallsHub,
	onOpenTactileSearch,
	showLostPatientsOnly,
	onToggleLostPatients,
	isLoadingLost,
	onOpenCreatePatient,
	categoryFilter,
	onCategoryFilterChange,
	counts,
}: PatientsFilterToolbarProps) {
	return (
		<>
			{/* Clean Single-Tier Toolbar Header (Desktop >=768px, Mandate 8am) */}
			<header
				className="patients-header max-md:!hidden md:flex items-center justify-between gap-2.5 flex-nowrap h-12 min-h-[48px] max-h-[52px] px-3 border border-[var(--line)] bg-[var(--paper)] rounded-xl shadow-xs box-border overflow-hidden select-none"
			>
				{/* Search input with canonical geometry (padding-left: 38px, height: 36px, Mandate 12 & 8am) */}
				<div className="dente-search-wrap patients-search-box relative flex-1 max-w-[280px] min-w-[180px] flex items-center">
					<Search aria-hidden="true" className="dente-search-icon search-icon w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
					<input
						ref={searchInputRef}
						aria-label="Поиск пациента"
						type="search"
						autoComplete="off"
						className="dente-search-input !pl-[38px] !pr-9 h-9 min-h-[36px] w-full text-xs sm:text-[13px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-all"
						value={query}
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							onQueryChange(e.target.value)
						}
						placeholder="ФИО или телефон..."
					/>
					{query ? (
						<button
							type="button"
							className="dente-search-clear patients-search-clear-btn absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 text-[var(--muted)] hover:text-[var(--ink)] rounded-full transition-colors cursor-pointer"
							onClick={onClearQuery}
							aria-label="Очистить поисковый запрос"
							title="Очистить"
						>
							<X size={14} aria-hidden="true" />
						</button>
					) : null}
				</div>

				{/* Systemic Segmented Control: Все / Первичные / Должники / Архив (Mandate 8am: h-8, px-3, rounded-lg) */}
				<div
					className="dente-segmented-bar inline-flex items-center shrink-0 p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-0.5 select-none"
					role="tablist"
					aria-label="Фильтры картотеки пациентов"
					data-testid="patients-category-segmented-bar"
				>
					<button
						type="button"
						role="tab"
						aria-selected={categoryFilter === "all"}
						data-active={categoryFilter === "all"}
						className={`dente-segmented-item h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border select-none ${
							categoryFilter === "all"
								? "active bg-[var(--paper)] text-[var(--primary)] border-[var(--primary)]/30 shadow-xs font-bold"
								: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-semibold"
						}`}
						onClick={() => onCategoryFilterChange("all")}
						data-testid="patient-filter-all"
					>
						Все {counts.countAll > 0 ? `(${counts.countAll})` : ""}
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={categoryFilter === "primary"}
						data-active={categoryFilter === "primary"}
						className={`dente-segmented-item h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border select-none ${
							categoryFilter === "primary"
								? "active bg-[var(--paper)] text-[var(--primary)] border-[var(--primary)]/30 shadow-xs font-bold"
								: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-semibold"
						}`}
						onClick={() => onCategoryFilterChange("primary")}
						data-testid="patient-filter-primary"
					>
						Первичные {counts.countPrimary > 0 ? `(${counts.countPrimary})` : ""}
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={categoryFilter === "debt"}
						data-active={categoryFilter === "debt"}
						className={`dente-segmented-item h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border select-none ${
							categoryFilter === "debt"
								? "active bg-[var(--paper)] text-[var(--primary)] border-[var(--primary)]/30 shadow-xs font-bold"
								: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-semibold"
						}`}
						onClick={() => onCategoryFilterChange("debt")}
						data-testid="patient-filter-debt"
					>
						Должники {counts.countDebt > 0 ? `(${counts.countDebt})` : ""}
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={categoryFilter === "archive"}
						data-active={categoryFilter === "archive"}
						className={`dente-segmented-item h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border select-none ${
							categoryFilter === "archive"
								? "active bg-[var(--paper)] text-[var(--primary)] border-[var(--primary)]/30 shadow-xs font-bold"
								: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-semibold"
						}`}
						onClick={() => onCategoryFilterChange("archive")}
						data-testid="patient-filter-archive"
					>
						Архив {counts.countArchive > 0 ? `(${counts.countArchive})` : ""}
					</button>
				</div>

				{/* Desktop Action Buttons: strictly 36px height, rounded-xl (Mandate 8am) */}
				<div className="patients-header-actions shrink-0 flex items-center gap-1.5">
					<button
						type="button"
						className="secondary-button shrink-0 min-w-0 text-xs sm:text-[13px] h-9 min-h-[36px] px-3 rounded-xl font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs"
						onClick={onOpenRecallsHub}
						title="Профосмотры и диспансерный учет (Recall, гигиена, импланты)"
						data-testid="btn-patients-recalls-hub"
					>
						<RotateCcw size={14} aria-hidden="true" className="shrink-0 text-[var(--ink-muted)]" />
						<span className="whitespace-nowrap">Профосмотры</span>
					</button>

					<button
						type="button"
						className="secondary-button shrink-0 min-w-0 text-xs sm:text-[13px] h-9 min-h-[36px] px-3 rounded-xl font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs"
						onClick={onOpenTactileSearch}
						title="Тактильная матрица поиска исследований по аппаратам и датам"
						data-testid="btn-patients-tactile-search"
					>
						<Filter size={14} aria-hidden="true" className="shrink-0 text-[var(--ink-muted)]" />
						<span className="whitespace-nowrap">Снимки</span>
					</button>

					<button
						type="button"
						className={`secondary-button ${
							showLostPatientsOnly
								? "active font-semibold border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10"
								: "border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium"
						} shrink-0 min-w-0 text-xs sm:text-[13px] h-9 min-h-[36px] px-3 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none shadow-xs`}
						onClick={onToggleLostPatients}
						title="Показать пациентов без будущих приемов, открытых задач и записей в листе ожидания"
					>
						<span className="whitespace-nowrap">
							{isLoadingLost
								? "Загрузка..."
								: showLostPatientsOnly
									? "Потерянные ✓"
									: "Потерянные"}
						</span>
					</button>

					{/* Primary CTA: strictly 1 on toolbar, 36px height, rounded-xl (Mandate 8am) */}
					<button
						type="button"
						className="primary-button patients-new-patient-btn shrink-0 min-w-0 text-xs sm:text-[13px] h-9 min-h-[36px] px-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-1.5 bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs whitespace-nowrap cursor-pointer transition-all select-none"
						onClick={onOpenCreatePatient}
						title="Зарегистрировать нового пациента"
						data-testid="open-create-patient-modal-btn"
					>
						<Plus size={15} aria-hidden="true" className="shrink-0" />
						<span className="whitespace-nowrap">Новый пациент</span>
					</button>
				</div>
			</header>
		</>
	);
}
