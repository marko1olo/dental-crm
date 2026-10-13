import {
	Award,
	CheckCircle2,
	ChevronDown,
	Download,
	FileBadge,
	FileSpreadsheet,
	Gauge,
	MoreVertical,
	Printer,
	QrCode,
	RotateCcw,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import React, { useEffect, useRef } from "react";
import {
	printConsolidatedBinderAction,
	exportConsolidatedCsvAction,
} from "./sanpinConsolidatedExportHelpers";

export interface SanpinRegistersHeaderProps {
	readonly summary: any;
	readonly showExpandedKpi: boolean;
	readonly onToggleExpandedKpi: () => void;
	readonly autofillPeriod: "day" | "week" | "month";
	readonly setAutofillPeriod: (period: "day" | "week" | "month") => void;
	readonly autoFilling: boolean;
	readonly onAutofillByPeriod: (period: "day" | "week" | "month") => void;
	readonly exportContext: { auth?: any; appLogic?: any };
	readonly isExportMenuOpen: boolean;
	readonly setIsExportMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onRefreshSummary: () => void;
	readonly onAutofillShift: () => void;
	readonly onOpenRetroactiveBatchModal: () => void;
	readonly onOpenNurseSignModal: () => void;
	readonly onOpenKraftModal: () => void;
	readonly onOpenJournal257Modal: () => void;
}

export function SanpinRegistersHeader({
	summary,
	showExpandedKpi,
	onToggleExpandedKpi,
	autofillPeriod,
	setAutofillPeriod,
	autoFilling,
	onAutofillByPeriod,
	exportContext,
	isExportMenuOpen,
	setIsExportMenuOpen,
	onRefreshSummary,
	onAutofillShift,
	onOpenRetroactiveBatchModal,
	onOpenNurseSignModal,
	onOpenKraftModal,
	onOpenJournal257Modal,
}: SanpinRegistersHeaderProps) {
	const exportMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
				setIsExportMenuOpen(false);
			}
		};
		if (isExportMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isExportMenuOpen, setIsExportMenuOpen]);

	const hasTempDeviations = (summary?.temperature?.deviationsToday ?? 0) > 0;

	return (
		<div className="sanpin-header">
			<div className="sanpin-title-block">
				<h1 className="sanpin-main-title">
					<ShieldCheck size={18} color="var(--teal, #0d9488)" className="shrink-0" />
					<span>Стерилизация и ЦСО</span>
				</h1>

				<button
					type="button"
					onClick={onToggleExpandedKpi}
					className="sanpin-kpi-summary-chip h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] px-3 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation"
					title="Сводка контроля стерильности за смену (нажмите для деталей)"
					data-testid="sanpin-kpi-consolidated-chip"
				>
					<CheckCircle2 size={13} color="var(--teal, #0d9488)" className="shrink-0" />
					<span className="sanpin-kpi-status-ok">Норма 100%</span>
					<span className="sanpin-kpi-desktop-detail sanpin-kpi-sep">·</span>
					<span className="sanpin-kpi-desktop-detail sanpin-kpi-metric">
						ПСО {summary?.pso?.approvedToday ?? 0}
					</span>
					<span className="sanpin-kpi-desktop-detail sanpin-kpi-sep">·</span>
					<span className="sanpin-kpi-desktop-detail sanpin-kpi-metric">
						АК {summary?.sterilization?.passedToday ?? 0}
					</span>
					<span className="sanpin-kpi-desktop-detail sanpin-kpi-sep">·</span>
					<span
						className={`sanpin-kpi-desktop-detail ${
							hasTempDeviations ? "sanpin-kpi-status-bad" : "sanpin-kpi-status-ok"
						}`}
					>
						T° {hasTempDeviations ? `${summary.temperature.deviationsToday} откл.` : "Норма"}
					</span>
				</button>
			</div>

			<div className="sanpin-header-actions">
				<button
					type="button"
					onClick={() => onAutofillByPeriod("month")}
					aria-busy={autoFilling}
					className="sanpin-btn-primary-cta h-9 min-h-[36px] rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-strong)] text-white shadow-xs px-3.5 text-[13px] font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer touch-manipulation"
					data-testid="sanpin-autofill-month-primary-btn"
					data-action="autofill-month"
					title="Сформировать все регламентные журналы за месяц по СанПиН 3.3686-21 (Автоклав Ф-257, ПСО Ф-366, Дезар, Т° Pozis, отходы Б — 100% норма)"
				>
					<Sparkles size={14} className="shrink-0" />
					<span>{autoFilling ? "Заполнение..." : "Заполнить журналы за месяц"}</span>
				</button>

				<button
					type="button"
					onClick={() => printConsolidatedBinderAction(exportContext)}
					className="sanpin-btn-export-cta sanpin-desktop-only-btn h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-3 text-[13px] font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer touch-manipulation"
					data-testid="sanpin-print-form257-btn"
					data-action="print-form257"
					title="Официальный сшив журналов по СанПиН 3.3686-21 для Роспотребнадзора (А4 альбомная, Форма 257/у, Форма 366/у)"
				>
					<Printer size={14} className="shrink-0" />
					<span>Печать журнала</span>
				</button>

				<div ref={exportMenuRef} className="sanpin-options-menu-wrap">
					<button
						type="button"
						onClick={() => setIsExportMenuOpen((prev) => !prev)}
						className="sanpin-btn-options h-9 min-h-[36px] rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] px-3 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer touch-manipulation"
						aria-expanded={isExportMenuOpen}
						data-testid="sanpin-options-dropdown-btn"
						title="Дополнительные опции"
					>
						<MoreVertical size={14} className="shrink-0" />
						<span className="sanpin-desktop-only-label">Опции</span>
						<span className="sanpin-desktop-only-label sanpin-chevron-wrap">
							<ChevronDown
								size={12}
								className={`sanpin-chevron-icon ${isExportMenuOpen ? "sanpin-chevron-icon--open" : ""}`}
							/>
						</span>
					</button>

					{isExportMenuOpen && (
						<div className="sanpin-options-dropdown" role="menu">
							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsExportMenuOpen(false);
									onRefreshSummary();
								}}
								className="sanpin-dropdown-item"
							>
								<RotateCcw size={15} color="var(--teal)" className="shrink-0" />
								<span>Обновить сводку смены</span>
							</button>

							<div className="sanpin-dropdown-divider" />

							<div className="sanpin-dropdown-section-label">
								Период автопилота:
							</div>
							<div className="sanpin-dropdown-period-group">
								<button
									type="button"
									onClick={() => {
										setAutofillPeriod("day");
										onAutofillByPeriod("day");
										setIsExportMenuOpen(false);
									}}
									className={`sanpin-btn-secondary sanpin-dropdown-period-btn ${
										autofillPeriod === "day" ? "active" : ""
									}`}
									data-testid="sanpin-period-day-btn"
								>
									День
								</button>
								<button
									type="button"
									onClick={() => {
										setAutofillPeriod("week");
										onAutofillByPeriod("week");
										setIsExportMenuOpen(false);
									}}
									className={`sanpin-btn-secondary sanpin-dropdown-period-btn ${
										autofillPeriod === "week" ? "active" : ""
									}`}
									data-testid="sanpin-period-week-btn"
								>
									Неделя
								</button>
								<button
									type="button"
									onClick={() => {
										setAutofillPeriod("month");
										onAutofillByPeriod("month");
										setIsExportMenuOpen(false);
									}}
									className={`sanpin-btn-secondary sanpin-dropdown-period-btn ${
										autofillPeriod === "month" ? "active" : ""
									}`}
									data-testid="sanpin-period-month-btn"
								>
									Месяц
								</button>
							</div>

							<div className="sanpin-dropdown-divider" />

							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsExportMenuOpen(false);
									onAutofillShift();
								}}
								aria-busy={autoFilling}
								className="sanpin-dropdown-item"
							>
								<Sparkles size={15} color="var(--teal)" className="shrink-0" />
								<span>{autoFilling ? "Оформление..." : "Завершить и закрыть смену"}</span>
							</button>

							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsExportMenuOpen(false);
									onOpenRetroactiveBatchModal();
								}}
								className="sanpin-dropdown-item"
								data-testid="open-retroactive-batch-header-btn"
							>
								<Gauge size={15} color="var(--teal)" className="shrink-0" />
								<span>Пакетное закрытие (за период)</span>
							</button>

							<div className="sanpin-dropdown-divider" />

							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsExportMenuOpen(false);
									printConsolidatedBinderAction(exportContext);
								}}
								className="sanpin-dropdown-item"
								data-testid="print-consolidated-binder-btn"
							>
								<FileBadge size={15} color="var(--teal)" className="shrink-0" />
								<span>Выгрузка журналов для проверки</span>
							</button>

							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsExportMenuOpen(false);
									exportConsolidatedCsvAction(exportContext);
								}}
								className="sanpin-dropdown-item"
								data-testid="export-consolidated-csv-btn"
							>
								<Download size={15} color="var(--ok-fg)" className="shrink-0" />
								<span>Сводный архив (CSV)</span>
							</button>

							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsExportMenuOpen(false);
									onOpenNurseSignModal();
								}}
								className="sanpin-dropdown-item"
							>
								<Award size={15} color="var(--teal)" className="shrink-0" />
								<span>ЭЦП ответственного (заверка смены)</span>
							</button>

							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsExportMenuOpen(false);
									onOpenKraftModal();
								}}
								className="sanpin-dropdown-item"
								data-testid="open-kraft-studio-header-btn"
							>
								<QrCode size={15} color="var(--teal)" className="shrink-0" />
								<span>Маркировка крафт-пакетов</span>
							</button>

							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsExportMenuOpen(false);
									onOpenJournal257Modal();
								}}
								className="sanpin-dropdown-item"
								data-testid="open-journal-257-header-btn"
							>
								<FileSpreadsheet size={15} color="var(--teal)" className="shrink-0" />
								<span>Журнал работы стерилизаторов (автоклавов)</span>
							</button>

							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setIsExportMenuOpen(false);
									window.print();
								}}
								className="sanpin-dropdown-item"
							>
								<Printer size={15} color="var(--muted, #64748b)" className="shrink-0" />
								<span>Печать текущей вкладки</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
