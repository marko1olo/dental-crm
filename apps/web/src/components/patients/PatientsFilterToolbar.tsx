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
	filteredPatients,
	onSelectPatient,
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
			{/* Clean Single-Tier Toolbar Header (Desktop >=768px) */}
			<header
				className="patients-header max-md:!hidden md:flex items-center justify-between gap-2.5 flex-nowrap"
				style={{ minHeight: "44px", padding: "6px 10px" }}
			>
				<div
					className="dente-search-wrap patients-search-box"
					style={{ flex: "1 1 220px", maxWidth: "280px", minWidth: "180px" }}
				>
					<Search aria-hidden="true" className="dente-search-icon search-icon" />
					<input
						ref={searchInputRef}
						aria-label="Поиск пациента"
						type="search"
						autoComplete="off"
						className="dente-search-input"
						style={{ paddingLeft: "38px" }}
						value={query}
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							onQueryChange(e.target.value)
						}
						placeholder="ФИО или телефон..."
					/>
					{query ? (
						<button
							type="button"
							className="dente-search-clear patients-search-clear-btn"
							onClick={onClearQuery}
							aria-label="Очистить поисковый запрос"
							title="Очистить"
						>
							<X size={14} aria-hidden="true" />
						</button>
					) : null}
				</div>

				{/* Systemic Segmented Control: Все / Первичные / Должники / Архив (Inline in Single-Row Toolbar) */}
				<div
					className="dente-segmented-bar inline-flex items-center shrink-0 p-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)] gap-1 select-none"
					style={{ width: "auto", margin: 0 }}
					role="tablist"
					aria-label="Фильтры картотеки пациентов"
					data-testid="patients-category-segmented-bar"
				>
					<button
						type="button"
						role="tab"
						aria-selected={categoryFilter === "all"}
						data-active={categoryFilter === "all"}
						className={`dente-segmented-item rounded-lg transition-all cursor-pointer font-semibold border ${
							categoryFilter === "all"
								? "active bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/40 shadow-2xs font-bold"
								: "bg-transparent border-transparent text-[var(--ink,#334155)] hover:bg-[var(--paper,#ffffff)]/70 hover:border-[var(--line,#cbd5e1)]"
						}`}
						style={{ padding: "0 10px", height: "28px", fontSize: "12px", whiteSpace: "nowrap" }}
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
						className={`dente-segmented-item rounded-lg transition-all cursor-pointer font-semibold border ${
							categoryFilter === "primary"
								? "active bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/40 shadow-2xs font-bold"
								: "bg-transparent border-transparent text-[var(--ink,#334155)] hover:bg-[var(--paper,#ffffff)]/70 hover:border-[var(--line,#cbd5e1)]"
						}`}
						style={{ padding: "0 10px", height: "28px", fontSize: "12px", whiteSpace: "nowrap" }}
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
						className={`dente-segmented-item rounded-lg transition-all cursor-pointer font-semibold border ${
							categoryFilter === "debt"
								? "active bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/40 shadow-2xs font-bold"
								: "bg-transparent border-transparent text-[var(--ink,#334155)] hover:bg-[var(--paper,#ffffff)]/70 hover:border-[var(--line,#cbd5e1)]"
						}`}
						style={{ padding: "0 10px", height: "28px", fontSize: "12px", whiteSpace: "nowrap" }}
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
						className={`dente-segmented-item rounded-lg transition-all cursor-pointer font-semibold border ${
							categoryFilter === "archive"
								? "active bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/40 shadow-2xs font-bold"
								: "bg-transparent border-transparent text-[var(--ink,#334155)] hover:bg-[var(--paper,#ffffff)]/70 hover:border-[var(--line,#cbd5e1)]"
						}`}
						style={{ padding: "0 10px", height: "28px", fontSize: "12px", whiteSpace: "nowrap" }}
						onClick={() => onCategoryFilterChange("archive")}
						data-testid="patient-filter-archive"
					>
						Архив {counts.countArchive > 0 ? `(${counts.countArchive})` : ""}
					</button>
				</div>

				<div className="patients-header-actions shrink-0 flex items-center gap-1.5">
					<button
						type="button"
						className="secondary-button shrink-0 min-w-0 text-[12.5px] h-8 px-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)]"
						onClick={onOpenRecallsHub}
						title="Профосмотры и диспансерный учет (Recall, гигиена, импланты)"
						data-testid="btn-patients-recalls-hub"
					>
						<RotateCcw size={13} aria-hidden="true" className="shrink-0 text-[var(--muted)]" />
						<span className="whitespace-nowrap">Профосмотры</span>
					</button>

					<button
						type="button"
						className="secondary-button shrink-0 min-w-0 text-[12.5px] h-8 px-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)]"
						onClick={onOpenTactileSearch}
						title="Тактильная матрица поиска исследований по аппаратам и датам"
						data-testid="btn-patients-tactile-search"
					>
						<Filter size={13} aria-hidden="true" className="shrink-0 text-[var(--muted)]" />
						<span className="whitespace-nowrap">Снимки</span>
					</button>

					<button
						type="button"
						className={`secondary-button ${
							showLostPatientsOnly
								? "active font-semibold border-[var(--teal)] text-[var(--teal-dark)] dark:text-[var(--teal)] bg-[var(--teal-soft)]"
								: "border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)]"
						} shrink-0 min-w-0 text-[12.5px] h-8 px-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none`}
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

					<button
						type="button"
						className="primary-button patients-new-patient-btn shrink-0 min-w-0 text-[12.5px] h-8 px-3 rounded-lg font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap"
						onClick={onOpenCreatePatient}
						title="Зарегистрировать нового пациента"
						data-testid="open-create-patient-modal-btn"
					>
						<Plus size={14} aria-hidden="true" className="shrink-0" />
						<span className="whitespace-nowrap">Новый пациент</span>
					</button>
				</div>
			</header>
		</>
	);
}
