import {
	Building2,
	Check,
	ChevronDown,
	DollarSign,
	Download,
	Printer,
	RefreshCw,
	TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BRANCH_OPTIONS, DATE_RANGES } from "./constants";
import type { AnalyticsHeaderBarProps } from "./types";

export function AnalyticsHeaderBar({
	updatedAt,
	dateRange,
	setDateRange,
	branchFilter,
	setBranchFilter,
	analyticsSection,
	setAnalyticsSection,
	loading,
	onExportCsv,
	onRetry,
	onOpenMarketingRoi,
	onOpenFinancialAnalytics,
}: AnalyticsHeaderBarProps) {
	const [isSectionMoreOpen, setIsSectionMoreOpen] = useState(false);
	const [isDateMoreOpen, setIsDateMoreOpen] = useState(false);
	const sectionMoreRef = useRef<HTMLDivElement>(null);
	const dateMoreRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				sectionMoreRef.current &&
				!sectionMoreRef.current.contains(e.target as Node)
			) {
				setIsSectionMoreOpen(false);
			}
			if (
				dateMoreRef.current &&
				!dateMoreRef.current.contains(e.target as Node)
			) {
				setIsDateMoreOpen(false);
			}
		};
		if (isSectionMoreOpen || isDateMoreOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isSectionMoreOpen, isDateMoreOpen]);

	return (
		<>
			<header className="analytics-header">
				<div className="analytics-header-title-group">
					<h2
						className="analytics-title"
						title="Панель руководителя: путь планов лечения, загрузка кресел, сколько приносит пациент со временем и выработка врачей"
					>
						Аналитика клиники
					</h2>
					{updatedAt && (
						<span
							className="analytics-updated-badge"
							title="Время последнего успешного обновления показателей"
						>
							Обновлено {updatedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
						</span>
					)}
				</div>

				<div className="analytics-toolbar" role="toolbar" aria-label="Фильтры аналитики">
					{/* Филиал (Compact 32px SegmentedControl) */}
					<div className="analytics-segmented" role="radiogroup" aria-label="Выбор филиала">
						{BRANCH_OPTIONS.map((b) => (
							<button
								key={b.value}
								type="button"
								className={`analytics-segmented-btn ${branchFilter === b.value ? "analytics-segmented-btn--active" : ""}`}
								onClick={() => setBranchFilter(b.value)}
								aria-checked={branchFilter === b.value}
								role="radio"
							>
								{b.value === "all" && <Building2 size={12} aria-hidden="true" className="mr-1 inline-block" />}
								{b.label}
							</button>
						))}
					</div>

					{/* Период (Compact 32px SegmentedControl with ... menu for rare ranges) */}
					<div
						className={`analytics-segmented ${analyticsSection === "executive" ? "hidden sm:flex" : "flex"}`}
						role="radiogroup"
						aria-label="Выбор периода"
					>
						{DATE_RANGES.slice(0, 3).map((r) => (
							<button
								key={r.value}
								type="button"
								className={`analytics-segmented-btn ${dateRange === r.value ? "analytics-segmented-btn--active" : ""}`}
								onClick={() => {
									setDateRange(r.value);
									setIsDateMoreOpen(false);
								}}
								aria-checked={dateRange === r.value}
								role="radio"
							>
								{r.label}
							</button>
						))}

						{/* Меню редких периодов: Квартал, Год, Всё время */}
						<div className="relative inline-flex items-center" ref={dateMoreRef}>
							<button
								type="button"
								className={`analytics-segmented-btn inline-flex items-center gap-1 ${
									DATE_RANGES.slice(3).some((r) => r.value === dateRange)
										? "analytics-segmented-btn--active"
										: ""
								}`}
								onClick={() => setIsDateMoreOpen((prev) => !prev)}
								aria-expanded={isDateMoreOpen}
								title="Выбрать расширенный период (Квартал, Год, Всё время)"
							>
								<span>
									{DATE_RANGES.slice(3).find((r) => r.value === dateRange)?.label || "Период..."}
								</span>
								<ChevronDown
									size={11}
									className={`transition-transform duration-150 ${isDateMoreOpen ? "rotate-180" : ""}`}
								/>
							</button>

							{isDateMoreOpen && (
								<div
									className="analytics-dropdown-menu absolute right-0 top-full mt-1 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl min-w-[130px] text-xs animate-in fade-in zoom-in-95 duration-100"
									role="menu"
								>
									{DATE_RANGES.slice(3).map((r) => (
										<button
											key={r.value}
											type="button"
											className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
												dateRange === r.value
													? "bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal-dark,#0f766e)] font-semibold"
													: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
											}`}
											role="menuitem"
											onClick={() => {
												setDateRange(r.value);
												setIsDateMoreOpen(false);
											}}
										>
											<span>{r.label}</span>
											{dateRange === r.value && (
												<Check size={13} className="text-[var(--teal)]" />
											)}
										</button>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Тактильные кнопки действий тулбара: Экспорт, Печать, Обновление */}
					<div
						className={`flex items-center gap-1.5 shrink-0 ${analyticsSection === "executive" ? "hidden sm:flex" : "flex"}`}
						role="group"
						aria-label="Действия с отчетом"
					>
						<button
							type="button"
							className="analytics-action-btn"
							onClick={onExportCsv}
							title="Экспорт сводного отчета в Excel / CSV"
							data-testid="analytics-export-csv-btn"
						>
							<Download size={13} aria-hidden="true" />
							<span className="hidden sm:inline">Экспорт</span>
						</button>

						<button
							type="button"
							className="analytics-action-btn"
							onClick={() => window.print()}
							title="Распечатать аналитику / Сохранить в PDF"
							data-testid="analytics-print-btn"
						>
							<Printer size={13} aria-hidden="true" />
							<span className="hidden sm:inline">Печать</span>
						</button>

						<button
							type="button"
							className="analytics-action-btn"
							onClick={onRetry}
							disabled={loading}
							title="Обновить данные аналитики"
							aria-label="Обновить данные аналитики"
							data-testid="analytics-refresh-btn"
						>
							<RefreshCw size={13} className={loading ? "animate-spin text-[var(--teal)]" : ""} aria-hidden="true" />
						</button>
					</div>
				</div>
			</header>

			{/* Навигация по подразделам аналитики (Компактные 32-36px вкладки с меню «...») */}
			<div
				className="analytics-section-tabs"
				role="tablist"
				aria-label="Разделы аналитики"
			>
				<button
					type="button"
					role="tab"
					aria-selected={analyticsSection === "executive"}
					className={`analytics-tab-btn ${analyticsSection === "executive" ? "analytics-tab-btn--active" : ""}`}
					onClick={() => {
						setAnalyticsSection("executive");
						setIsSectionMoreOpen(false);
					}}
				>
					<span className="hidden sm:inline">Рабочий стол Директора</span>
					<span className="sm:hidden">Директор</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={analyticsSection === "operational"}
					className={`analytics-tab-btn ${analyticsSection === "operational" ? "analytics-tab-btn--active" : ""}`}
					onClick={() => {
						setAnalyticsSection("operational");
						setIsSectionMoreOpen(false);
					}}
				>
					<span className="hidden sm:inline">Операционные графики</span>
					<span className="sm:hidden">Графики</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={analyticsSection === "curators"}
					className={`analytics-tab-btn ${analyticsSection === "curators" ? "analytics-tab-btn--active" : ""}`}
					onClick={() => {
						setAnalyticsSection("curators");
						setIsSectionMoreOpen(false);
					}}
				>
					<span className="hidden sm:inline">Кураторы пациентов</span>
					<span className="sm:hidden">Кураторы</span>
				</button>

				{/* Контекстное меню «...» для специализированных разделов */}
				<div className="relative inline-flex items-center" ref={sectionMoreRef}>
					<button
						type="button"
						role="tab"
						aria-selected={
							analyticsSection === "lost_patients" ||
							analyticsSection === "freed_slots" ||
							analyticsSection === "marketing" ||
							analyticsSection === "clinic"
						}
						aria-expanded={isSectionMoreOpen}
						className={`analytics-tab-btn ${
							analyticsSection === "lost_patients" ||
							analyticsSection === "freed_slots" ||
							analyticsSection === "marketing" ||
							analyticsSection === "clinic"
								? "analytics-tab-btn--active"
								: ""
						}`}
						onClick={() => setIsSectionMoreOpen((prev) => !prev)}
						title="Дополнительные разделы аналитики (Возврат, Освободившиеся окна, Маркетинг, Сводный пульт)"
					>
						<span className="hidden sm:inline">
							{analyticsSection === "lost_patients"
								? "Ещё: Возврат пациентов"
								: analyticsSection === "freed_slots"
									? "Ещё: Освободившиеся окна"
									: analyticsSection === "marketing"
										? "Ещё: Сквозной маркетинг"
										: analyticsSection === "clinic"
											? "Ещё: Сводный пульт"
											: "Ещё разделы"}
						</span>
						<span className="sm:hidden">
							{analyticsSection === "lost_patients"
								? "Возврат"
								: analyticsSection === "freed_slots"
									? "Окна"
									: analyticsSection === "marketing"
										? "Маркетинг"
										: analyticsSection === "clinic"
											? "Пульт"
											: "Ещё"}
						</span>
						<ChevronDown
							size={13}
							className={`transition-transform duration-150 ${isSectionMoreOpen ? "rotate-180" : ""}`}
						/>
					</button>

					{isSectionMoreOpen && (
						<div
							className="analytics-dropdown-menu absolute left-0 sm:right-0 sm:left-auto top-full mt-1 z-50 flex flex-col gap-0.5 p-1.5 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-2xl min-w-[220px] text-xs animate-in fade-in zoom-in-95 duration-100"
							role="menu"
						>
							<button
								type="button"
								className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
									analyticsSection === "lost_patients"
										? "bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal-dark,#0f766e)] font-semibold"
										: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								role="menuitem"
								onClick={() => {
									setAnalyticsSection("lost_patients");
									setIsSectionMoreOpen(false);
								}}
							>
								<span>Возврат пациентов</span>
								{analyticsSection === "lost_patients" && (
									<Check size={14} className="text-[var(--teal)]" />
								)}
							</button>

							<button
								type="button"
								className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
									analyticsSection === "freed_slots"
										? "bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal-dark,#0f766e)] font-semibold"
										: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								role="menuitem"
								onClick={() => {
									setAnalyticsSection("freed_slots");
									setIsSectionMoreOpen(false);
								}}
							>
								<span>Освободившиеся окна</span>
								{analyticsSection === "freed_slots" && (
									<Check size={14} className="text-[var(--teal)]" />
								)}
							</button>

							<button
								type="button"
								className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
									analyticsSection === "marketing"
										? "bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal-dark,#0f766e)] font-semibold"
										: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								role="menuitem"
								onClick={() => {
									setAnalyticsSection("marketing");
									setIsSectionMoreOpen(false);
								}}
							>
								<span>Сквозной маркетинг и ROMI</span>
								{analyticsSection === "marketing" && (
									<Check size={14} className="text-[var(--teal)]" />
								)}
							</button>

							<button
								type="button"
								className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
									analyticsSection === "clinic"
										? "bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal-dark,#0f766e)] font-semibold"
										: "text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
								role="menuitem"
								onClick={() => {
									setAnalyticsSection("clinic");
									setIsSectionMoreOpen(false);
								}}
							>
								<span>Сводный пульт клиники (Zero-Mock)</span>
								{analyticsSection === "clinic" && (
									<Check size={14} className="text-[var(--teal)]" />
								)}
							</button>

							<div className="my-1 border-t border-[var(--line)]" />

							<button
								type="button"
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors flex items-center gap-2 cursor-pointer"
								role="menuitem"
								onClick={() => {
									onOpenMarketingRoi();
									setIsSectionMoreOpen(false);
								}}
								data-testid="btn-open-marketing-roi-modal"
								title="Открыть сквозную аналитику ROI маркетинговых кампаний"
							>
								<TrendingUp size={14} className="text-emerald-600 dark:text-emerald-400" />
								<span>ROI маркетинговых кампаний</span>
							</button>

							<button
								type="button"
								className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors flex items-center gap-2 cursor-pointer"
								role="menuitem"
								onClick={() => {
									onOpenFinancialAnalytics();
									setIsSectionMoreOpen(false);
								}}
								data-testid="btn-open-financial-analytics-modal"
								title="Открыть финансовую аналитику P&L и кассовые остатки"
							>
								<DollarSign size={14} className="text-teal-600 dark:text-teal-400" />
								<span>Финансовая аналитика P&L</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</>
	);
}
