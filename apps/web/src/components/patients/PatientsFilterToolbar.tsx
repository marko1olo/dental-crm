import type { Patient } from "@dental/shared";
import { Filter, Plus, RotateCcw, Search, X } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";
import { PatientSearchAutocomplete } from "./PatientSearchAutocomplete";

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
			<header className="patients-header max-md:!hidden md:flex">
				<div className="dente-search-wrap patients-search-box">
					<Search aria-hidden="true" className="dente-search-icon search-icon" />
					<input
						ref={searchInputRef}
						aria-label="Поиск пациента"
						type="search"
						autoComplete="off"
						className="dente-search-input"
						value={query}
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							onQueryChange(e.target.value)
						}
						placeholder="ФИО / тел."
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
					<span
						className="patients-search-shortcut-hint hidden sm:inline"
						aria-hidden="true"
					>
						⌘K / Ctrl+K
					</span>
				</div>

				<div className="hidden xl:block min-w-[220px] max-w-[300px]">
					<PatientSearchAutocomplete
						patients={filteredPatients}
						onSelectPatient={(p) => onSelectPatient(p.id)}
						placeholder="Быстрый поиск (ФИО / тел)..."
					/>
				</div>

				<div className="patients-header-actions shrink-0 flex items-center gap-1.5">
					<button
						type="button"
						className="secondary-button shrink-0 min-w-0 text-[13px] h-8 px-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)]"
						onClick={onOpenRecallsHub}
						title="Профосмотры и диспансерный учет (Recall, гигиена, импланты)"
						data-testid="btn-patients-recalls-hub"
					>
						<RotateCcw size={14} aria-hidden="true" className="shrink-0 text-[var(--muted)]" />
						<span className="whitespace-nowrap truncate">Профосмотры</span>
					</button>

					<button
						type="button"
						className="secondary-button shrink-0 min-w-0 text-[13px] h-8 px-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)]"
						onClick={onOpenTactileSearch}
						title="Тактильная матрица поиска исследований по аппаратам и датам"
						data-testid="btn-patients-tactile-search"
					>
						<Filter size={14} aria-hidden="true" className="shrink-0 text-[var(--muted)]" />
						<span className="whitespace-nowrap truncate">Матрица поиска</span>
					</button>

					<button
						type="button"
						className={`secondary-button ${
							showLostPatientsOnly
								? "active font-semibold border-[var(--teal)] text-[var(--teal-dark)] dark:text-[var(--teal)] bg-[var(--teal-soft)]"
								: "border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)]"
						} shrink-0 min-w-0 text-[13px] h-8 px-2.5 rounded-lg font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none`}
						onClick={onToggleLostPatients}
						title="Показать пациентов без будущих приемов, открытых задач и записей в листе ожидания"
					>
						<span className="whitespace-nowrap truncate">
							{isLoadingLost
								? "Загрузка..."
								: showLostPatientsOnly
									? "Показаны потерянные"
									: "Потерянные"}
						</span>
					</button>

					<button
						type="button"
						className="primary-button patients-new-patient-btn shrink-0 min-w-0 text-[13px] h-8 px-3 rounded-lg font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs whitespace-nowrap"
						onClick={onOpenCreatePatient}
						title="Зарегистрировать нового пациента"
						data-testid="open-create-patient-modal-btn"
					>
						<Plus size={15} aria-hidden="true" className="shrink-0" />
						<span className="whitespace-nowrap truncate">Создать нового</span>
					</button>
				</div>
			</header>

			{/* Systemic Segmented Control: Все / Первичные / Должники / Архив */}
			<div
				className="dente-segmented-bar w-full justify-between shrink-0 mb-1"
				role="tablist"
				aria-label="Фильтры картотеки пациентов"
				data-testid="patients-category-segmented-bar"
			>
				<button
					type="button"
					role="tab"
					aria-selected={categoryFilter === "all"}
					data-active={categoryFilter === "all"}
					className={`dente-segmented-item flex-1 ${categoryFilter === "all" ? "active" : ""}`}
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
					className={`dente-segmented-item flex-1 ${categoryFilter === "primary" ? "active" : ""}`}
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
					className={`dente-segmented-item flex-1 ${categoryFilter === "debt" ? "active" : ""}`}
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
					className={`dente-segmented-item flex-1 ${categoryFilter === "archive" ? "active" : ""}`}
					onClick={() => onCategoryFilterChange("archive")}
					data-testid="patient-filter-archive"
				>
					Архив {counts.countArchive > 0 ? `(${counts.countArchive})` : ""}
				</button>
			</div>
		</>
	);
}
