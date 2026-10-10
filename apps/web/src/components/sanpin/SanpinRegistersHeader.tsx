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

	return (
		<div
			className="sanpin-header"
			style={{
				padding: "0.2rem 0 0.35rem",
				borderBottom: "1px solid var(--line, rgba(148, 163, 184, 0.2))",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "0.5rem",
				flexWrap: "nowrap",
				minHeight: "36px",
				maxWidth: "100%",
				overflow: "visible",
			}}
		>
			<div className="sanpin-title-block" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 1, minWidth: 0 }}>
				<h1 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--ink)", whiteSpace: "nowrap" }}>
					<ShieldCheck size={18} color="var(--teal, #0d9488)" />
					<span>Стерилизация и ЦСО</span>
				</h1>

				<button
					type="button"
					onClick={onToggleExpandedKpi}
					className="sanpin-kpi-summary-chip touch-manipulation"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "0.35rem",
						padding: "0.15rem 0.5rem",
						borderRadius: "8px",
						background: "var(--paper-soft, #f1f5f9)",
						border: "1px solid var(--line, #e2e8f0)",
						fontSize: "0.72rem",
						fontWeight: 600,
						color: "var(--ink, #334155)",
						cursor: "pointer",
						height: "28px",
						minHeight: "28px",
						whiteSpace: "nowrap",
						transition: "all 0.15s ease",
					}}
					title="Сводка контроля стерильности за смену (нажмите для деталей)"
					data-testid="sanpin-kpi-consolidated-chip"
				>
					<CheckCircle2 size={12} color="var(--teal, #0d9488)" />
					<span style={{ color: "var(--ok-fg, #059669)", fontWeight: 700 }}>Норма 100%</span>
					<span style={{ color: "var(--muted, #94a3b8)" }}>·</span>
					<span style={{ color: "var(--ink)", fontWeight: 600 }}>
						ПСО {summary?.pso?.approvedToday ?? 0}
					</span>
					<span style={{ color: "var(--muted, #94a3b8)" }}>·</span>
					<span style={{ color: "var(--ink)", fontWeight: 600 }}>
						АК {summary?.sterilization?.passedToday ?? 0}
					</span>
					<span style={{ color: "var(--muted, #94a3b8)" }}>·</span>
					<span style={{ color: (summary?.temperature?.deviationsToday ?? 0) > 0 ? "var(--bad-fg)" : "var(--ok-fg, #059669)", fontWeight: 700 }}>
						T° {summary?.temperature?.deviationsToday ? `${summary.temperature.deviationsToday} откл.` : "Норма"}
					</span>
				</button>
			</div>

			<div className="sanpin-header-actions" style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexShrink: 0 }}>
				<div className="dente-segmented-bar" role="tablist" aria-label="Период автозаполнения">
					<button
						type="button"
						role="tab"
						aria-selected={autofillPeriod === "day"}
						onClick={() => setAutofillPeriod("day")}
						className={`dente-segmented-item ${autofillPeriod === "day" ? "active" : ""}`}
						data-testid="sanpin-period-day-btn"
					>
						День
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={autofillPeriod === "week"}
						onClick={() => setAutofillPeriod("week")}
						className={`dente-segmented-item ${autofillPeriod === "week" ? "active" : ""}`}
						data-testid="sanpin-period-week-btn"
					>
						Неделя
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={autofillPeriod === "month"}
						onClick={() => setAutofillPeriod("month")}
						className={`dente-segmented-item ${autofillPeriod === "month" ? "active" : ""}`}
						data-testid="sanpin-period-month-btn"
					>
						Месяц
					</button>
				</div>

				<button
					type="button"
					onClick={() => onAutofillByPeriod(autofillPeriod)}
					aria-busy={autoFilling}
					className="sanpin-btn-primary-cta touch-manipulation"
					style={{ padding: "0 0.65rem", fontSize: "0.75rem" }}
					data-testid="sanpin-1click-autopilot-primary-btn"
					title={`Сформировать все регламентные журналы за ${autofillPeriod === "day" ? "день" : autofillPeriod === "week" ? "неделю" : "месяц"} (Автоклав, пробы чистоты, воздух, отходы, холодильники — 100% норма)`}
				>
					<Sparkles size={14} />
					<span>
						{autoFilling
							? "Заполнение..."
							: `Заполнить (${autofillPeriod === "day" ? "День" : autofillPeriod === "week" ? "Неделя" : "Месяц"})`}
					</span>
				</button>

				<button
					type="button"
					onClick={() => printConsolidatedBinderAction(exportContext)}
					className="sanpin-btn-export-cta touch-manipulation"
					style={{ padding: "0 0.65rem", fontSize: "0.75rem" }}
					data-testid="sanpin-regulatory-export-btn"
					title="Печать журналов стерилизации и проверок чистоты"
				>
					<Printer size={14} />
					<span>Печать журнала</span>
				</button>

				<div ref={exportMenuRef} style={{ position: "relative", display: "inline-block", zIndex: 60 }}>
					<button
						type="button"
						onClick={() => setIsExportMenuOpen((prev) => !prev)}
						className="sanpin-btn-options touch-manipulation"
						aria-expanded={isExportMenuOpen}
						data-testid="sanpin-options-dropdown-btn"
						title="Дополнительные опции"
					>
						<MoreVertical size={14} />
						<span className="hidden sm:inline">Опции</span>
						<ChevronDown size={11} style={{ transform: isExportMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
					</button>

					{isExportMenuOpen && (
						<div
							style={{
								position: "absolute",
								right: 0,
								top: "calc(100% + 4px)",
								minWidth: "280px",
								background: "var(--paper-strong, #ffffff)",
								border: "1px solid var(--line, #e2e8f0)",
								borderRadius: "10px",
								boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.15)",
								zIndex: 1000,
								padding: "0.35rem",
								display: "flex",
								flexDirection: "column",
								gap: "0.2rem",
							}}
						>
							<button
								type="button"
								onClick={() => {
									setIsExportMenuOpen(false);
									onRefreshSummary();
								}}
								className="sanpin-dropdown-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "none",
									border: "none",
									width: "100%",
									textAlign: "left",
									fontSize: "0.825rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
							>
								<RotateCcw size={15} color="var(--teal)" />
								<span>Обновить сводку смены</span>
							</button>

							<div style={{ height: "1px", background: "var(--line, #e2e8f0)", margin: "0.2rem 0" }} />

							<button
								type="button"
								onClick={() => {
									setIsExportMenuOpen(false);
									onAutofillShift();
								}}
								aria-busy={autoFilling}
								className="sanpin-dropdown-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "none",
									border: "none",
									width: "100%",
									textAlign: "left",
									fontSize: "0.825rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
							>
								<Sparkles size={15} color="var(--teal)" />
								<span>{autoFilling ? "Оформление..." : "Завершить и закрыть смену"}</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsExportMenuOpen(false);
									onOpenRetroactiveBatchModal();
								}}
								className="sanpin-dropdown-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "none",
									border: "none",
									width: "100%",
									textAlign: "left",
									fontSize: "0.825rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
								data-testid="open-retroactive-batch-header-btn"
							>
								<Gauge size={15} color="var(--teal)" />
								<span>Пакетное закрытие (за период)</span>
							</button>

							<div style={{ height: "1px", background: "var(--line, #e2e8f0)", margin: "0.2rem 0" }} />

							<button
								type="button"
								onClick={() => {
									setIsExportMenuOpen(false);
									printConsolidatedBinderAction(exportContext);
								}}
								className="sanpin-dropdown-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "none",
									border: "none",
									width: "100%",
									textAlign: "left",
									fontSize: "0.825rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
								data-testid="print-consolidated-binder-btn"
							>
								<FileBadge size={15} color="var(--teal)" />
								<span>Выгрузка журналов для проверки</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsExportMenuOpen(false);
									exportConsolidatedCsvAction(exportContext);
								}}
								className="sanpin-dropdown-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "none",
									border: "none",
									width: "100%",
									textAlign: "left",
									fontSize: "0.825rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
								data-testid="export-consolidated-csv-btn"
							>
								<Download size={15} color="var(--ok-fg)" />
								<span>Сводный архив (CSV)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsExportMenuOpen(false);
									onOpenNurseSignModal();
								}}
								className="sanpin-dropdown-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "none",
									border: "none",
									width: "100%",
									textAlign: "left",
									fontSize: "0.825rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
							>
								<Award size={15} color="var(--teal)" />
								<span>ЭЦП ответственного (заверка смены)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsExportMenuOpen(false);
									onOpenKraftModal();
								}}
								className="sanpin-dropdown-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "none",
									border: "none",
									width: "100%",
									textAlign: "left",
									fontSize: "0.825rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
								data-testid="open-kraft-studio-header-btn"
							>
								<QrCode size={15} color="var(--teal)" />
								<span>Маркировка крафт-пакетов</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsExportMenuOpen(false);
									onOpenJournal257Modal();
								}}
								className="sanpin-dropdown-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "none",
									border: "none",
									width: "100%",
									textAlign: "left",
									fontSize: "0.825rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
								data-testid="open-journal-257-header-btn"
							>
								<FileSpreadsheet size={15} color="var(--teal)" />
								<span>Журнал работы стерилизаторов (автоклавов)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsExportMenuOpen(false);
									window.print();
								}}
								className="sanpin-dropdown-item"
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.5rem",
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "none",
									border: "none",
									width: "100%",
									textAlign: "left",
									fontSize: "0.825rem",
									fontWeight: 600,
									color: "var(--ink, #0f172a)",
									cursor: "pointer",
								}}
							>
								<Printer size={15} color="var(--muted, #64748b)" />
								<span>Печать текущей вкладки</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
