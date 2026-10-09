import {
	ChevronDown,
	Download,
	Plus,
	Search,
	ShieldCheck,
	Sparkles,
	Tag,
	UploadCloud,
	X,
} from "lucide-react";
import type React from "react";
import {
	CATEGORY_TABS,
	QUICK_804N_CHIPS,
} from "../pricelistEditorHelpers";
import type { PricesFilterToolbarProps } from "./types";

export function PricesFilterToolbar({
	selectedCategoryFilter,
	onSelectCategoryFilter,
	searchQuery,
	onSearchChange,
	is804nCodesMenuOpen,
	setIs804nCodesMenuOpen,
	codes804nMenuRef,
	isSeedingBaseline,
	onSeedBaseline804n,
	onExportCsv,
	isNativeScannerDropzoneOpen,
	onToggleNativeScannerDropzone,
	onOpenServicePricelistModal,
	onOpenNewServiceModal,
}: PricesFilterToolbarProps) {
	return (
		<>
			{/* Category Quick Filter Strip — Canonical Apple-style Filter Chips (Mandate 8zf) */}
			<div className="dente-filter-chips overflow-x-auto pb-2 mb-3 scrollbar-none border-b border-[var(--line)]">
				{CATEGORY_TABS.map((cat) => (
					<button
						key={cat.id}
						type="button"
						onClick={() => onSelectCategoryFilter(cat.id)}
						className={`dente-filter-chip ${selectedCategoryFilter === cat.id ? "active" : ""}`}
						data-active={selectedCategoryFilter === cat.id ? "true" : undefined}
					>
						{cat.label}
					</button>
				))}
			</div>

			{/* STRICTLY 1 COMPACT MONOLITHIC 36px TOOLBAR ROW (Mandates 8c, 8d, 8p) */}
			<div className="pricelist-monolithic-toolbar min-h-[44px] sm:min-h-[36px] sm:h-9 sm:max-h-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-1 border border-[var(--line)] bg-[var(--paper)] rounded-xl shadow-xs mb-3 overflow-visible sm:overflow-hidden shrink-0 select-none">
				{/* Left: Canonical Dente Search Input (Zero overlap with search icon!) */}
				<div className="dente-search-wrap pricelist-search-wrapper flex items-center min-w-0 w-full sm:w-auto flex-1 max-w-full sm:max-w-xs relative">
					<Search size={14} className="dente-search-icon" />
					<input
						type="text"
						placeholder="Поиск по услугам или коду..."
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						className="dente-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchChange("")}
							className="dente-search-clear"
							title="Очистить поиск"
							aria-label="Очистить поиск"
						>
							<X size={13} />
						</button>
					)}
				</div>

				{/* Right Actions & 804n Menu Group (Horizontally scrollable on mobile) */}
				<div className="flex items-center gap-1.5 shrink-0 overflow-x-auto sm:overflow-visible pb-0.5 sm:pb-0 scrollbar-none w-full sm:w-auto ml-auto sm:ml-0">
					{/* Statutory 804n Quick Codes Dropdown Menu */}
					<div
						className="relative inline-flex items-center shrink-0"
						ref={codes804nMenuRef}
					>
						<button
							type="button"
							onClick={() => setIs804nCodesMenuOpen((prev) => !prev)}
							className={`secondary-button shrink-0 ${
								is804nCodesMenuOpen ||
								(searchQuery && searchQuery.startsWith("A"))
									? "active"
									: ""
							}`}
							title="Выбрать типовую услугу из официального справочника"
							aria-expanded={is804nCodesMenuOpen}
						>
							<Tag size={13} className="text-[var(--teal)] shrink-0" />
							<span className="hidden sm:inline">Справочник услуг</span>
							<span className="sm:hidden">Услуги</span>
							<ChevronDown
								size={11}
								className={`shrink-0 transition-transform ${is804nCodesMenuOpen ? "rotate-180" : ""}`}
							/>
						</button>

						{is804nCodesMenuOpen && (
							<div
								className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 z-50 flex flex-col gap-1 p-2 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl min-w-[240px] max-w-[340px] animate-in fade-in zoom-in-95 duration-100 text-xs"
								role="menu"
							>
								<div className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] mb-1">
									Официальный справочник услуг
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
									{QUICK_804N_CHIPS.map((chip) => (
										<button
											key={chip.code}
											type="button"
											onClick={() => {
												onSearchChange(chip.code);
												setIs804nCodesMenuOpen(false);
											}}
											className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer flex items-center justify-between ${
												searchQuery === chip.code
													? "bg-[var(--teal)] text-white font-bold"
													: "hover:bg-[var(--teal-soft)] text-[var(--ink)]"
											}`}
											role="menuitem"
										>
											<span>{chip.label}</span>
										</button>
									))}
								</div>
								<div className="mt-1.5 pt-1.5 border-t border-[var(--line)]">
									<button
										type="button"
										data-testid="pricelist-seed-baseline-804n-btn"
										disabled={isSeedingBaseline}
										onClick={() => onSeedBaseline804n(false)}
										className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--teal-soft)] hover:bg-[var(--teal)] hover:text-white text-[var(--teal-dark)] transition-all cursor-pointer flex items-center gap-2 group disabled:opacity-50"
									>
										<Sparkles
											size={14}
											className="shrink-0 text-[var(--teal)] group-hover:text-white"
										/>
										<div className="flex flex-col min-w-0">
											<span className="font-bold truncate">
												{isSeedingBaseline
													? "Наполнение каталога..."
													: "Заполнить базовый каталог (30 услуг)"}
											</span>
											<span className="text-xs opacity-80 truncate">
												Добавить недостающие типовые услуги с ценами
											</span>
										</div>
									</button>
								</div>
								{searchQuery && (
									<button
										type="button"
										onClick={() => {
											onSearchChange("");
											setIs804nCodesMenuOpen(false);
										}}
										className="w-full text-center px-2 py-1.5 mt-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors border-t border-[var(--line)]"
									>
										Сбросить фильтр поиска
									</button>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Right: Actions with Standardized Dente Button Styles */}
				<div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
					<button
						type="button"
						className="secondary-button shrink-0"
						onClick={onExportCsv}
						data-testid="export-pricelist-csv-btn"
						title="Экспортировать прайс-лист в Excel CSV (RFC 4180)"
					>
						<Download size={13} className="text-[var(--teal)] shrink-0" />
						<span className="hidden lg:inline">Экспорт CSV</span>
						<span className="lg:hidden">CSV</span>
					</button>
					<button
						type="button"
						className={`secondary-button shrink-0 ${
							isNativeScannerDropzoneOpen ? "active" : ""
						}`}
						onClick={onToggleNativeScannerDropzone}
						data-testid="btn-native-pricelist-import"
						title="Импорт прейскуранта клиники (Excel / CSV / Текст) со сканером номенклатуры услуг"
					>
						<UploadCloud size={13} className="text-[var(--teal)] shrink-0" />
						<span className="hidden lg:inline">
							Импорт прейскуранта (Excel/CSV/Текст)
						</span>
						<span className="hidden sm:inline lg:hidden">Импорт прайса</span>
						<span className="sm:hidden">Импорт</span>
					</button>
					<button
						type="button"
						className="secondary-button shrink-0"
						onClick={onOpenServicePricelistModal}
						data-testid="open-service-pricelist-modal-btn"
						title="Справочник услуг и прайс-лист клиники"
					>
						<ShieldCheck size={14} className="text-[var(--teal)] shrink-0" />
						<span className="hidden sm:inline">Прейскурант</span>
						<span className="sm:hidden">Прайс</span>
					</button>
					<button
						type="button"
						className="primary-button shrink-0"
						onClick={onOpenNewServiceModal}
					>
						<Plus size={15} className="shrink-0" />
						<span className="hidden sm:inline">Новая услуга</span>
						<span className="sm:hidden">Услуга</span>
					</button>
				</div>
			</div>
		</>
	);
}
