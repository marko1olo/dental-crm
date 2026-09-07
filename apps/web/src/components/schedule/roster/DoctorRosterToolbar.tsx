/**
 * DENTE Dental CRM — Doctor Shift Roster Toolbar & KPI Controls Strip
 * Compliance: TK RF Article 350 (33-hour medical workweek), Mandate 8e, Mandate 8d (HIG 44px)
 */

import React from "react";
import {
	AlertTriangle,
	Check,
	ChevronLeft,
	ChevronRight,
	Clock,
	FileSpreadsheet,
	Layers,
	Printer,
	Save,
	Sparkles,
	Users,
	X,
} from "lucide-react";
import type { MonthProductionCalendarNorm2026 } from "./doctorShiftRosterPresets";
import type { RosterConflict } from "./doctorShiftRosterEngine";

export interface DoctorRosterToolbarProps {
	clinicName?: string | undefined;
	kpis: {
		totalWeekShifts: number;
		totalWeeklyHours: number;
		assistantPairingPct: number;
		conflictCount: number;
		errorConflictCount: number;
	};
	monthNormObj?: MonthProductionCalendarNorm2026 | undefined;
	activeTab: "cabinets" | "doctors" | "t13" | "utilization";
	onSelectTab: (tab: "cabinets" | "doctors" | "t13" | "utilization") => void;
	weekStartDateIso: string;
	weekEndDateIso: string;
	selectedYear: number;
	onPrevWeek: () => void;
	onNextWeek: () => void;
	onAutoFillDefault: () => void;
	onApplyPreset: (
		preset: "five_day" | "two_two" | "morning" | "evening" | "full_day",
		label: string,
	) => void;
	onPrintSchedule: () => void;
	onExportT13: () => void;
	onSaveAll: (closeAfter?: boolean) => void;
	onClose: () => void;
	notification: { type: "success" | "info" | "error"; message: string } | null;
	conflicts: RosterConflict[];
}

export const DoctorRosterToolbar: React.FC<DoctorRosterToolbarProps> = React.memo(
	function DoctorRosterToolbar({
		clinicName,
		kpis,
		monthNormObj,
		activeTab,
		onSelectTab,
		weekStartDateIso,
		weekEndDateIso,
		selectedYear,
		onPrevWeek,
		onNextWeek,
		onAutoFillDefault,
		onApplyPreset,
		onPrintSchedule,
		onExportT13,
		onSaveAll,
		onClose,
		notification,
		conflicts,
	}) {
		const monthName = React.useMemo(() => {
			if (monthNormObj?.nameRu) return monthNormObj.nameRu;
			try {
				const d = new Date(weekStartDateIso || Date.now());
				const raw = new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(d);
				return raw.charAt(0).toUpperCase() + raw.slice(1);
			} catch {
				return "Текущий месяц";
			}
		}, [monthNormObj?.nameRu, weekStartDateIso]);

		return (
			<>
				{/* Top Header */}
				<div className="roster-header">
					<div className="roster-header-top">
						<div className="roster-title-block">
							<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<span className="roster-title-badge">Норма: 33 ч/нед</span>
								{clinicName && (
									<span
										style={{
											fontSize: "0.8125rem",
											color: "var(--muted, #64748b)",
											fontWeight: 500,
										}}
									>
										{clinicName}
									</span>
								)}
							</div>
							<h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
								График сменности и табель учета врачей (2026)
							</h2>
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={onPrintSchedule}
								style={{ minHeight: "44px" }}
								title="Печать графика в формате А4 Альбомный"
							>
								<Printer size={16} />
								<span>Печать (А4)</span>
							</button>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={onExportT13}
								style={{ minHeight: "44px" }}
								title="Выгрузить форму Т-13 в CSV для 1C / Excel"
							>
								<FileSpreadsheet size={16} />
								<span>Табель Т-13 (CSV)</span>
							</button>
							<button
								type="button"
								data-testid="roster-save-btn"
								className="roster-btn roster-btn-primary"
								onClick={() => onSaveAll(false)}
								style={{ minHeight: "44px" }}
								title="Сохранить изменения графика (Мандат 8e)"
							>
								<Save size={16} />
								<span>Сохранить</span>
							</button>
							<button
								type="button"
								className="roster-btn roster-btn-secondary"
								onClick={onClose}
								style={{ minHeight: "44px" }}
								title="Закрыть табель (Esc)"
							>
								<X size={16} />
								<span>Закрыть</span>
							</button>
						</div>
					</div>

					{/* Notification Toast Strip */}
					{notification && (
						<div
							className={`roster-notification roster-notification-${notification.type}`}
						>
							{notification.type === "success" && <Check size={16} />}
							{notification.type === "error" && <AlertTriangle size={16} />}
							{notification.type === "info" && <Clock size={16} />}
							<span>{notification.message}</span>
						</div>
					)}

					{/* Navigation Strip */}
					<div className="roster-nav-strip">
						<div className="roster-week-nav">
							<button
								type="button"
								className="roster-btn-icon"
								onClick={onPrevWeek}
								title="Предыдущая неделя"
								style={{ minHeight: "44px", minWidth: "44px" }}
							>
								<ChevronLeft size={18} />
							</button>
							<div className="roster-week-label">
								<span className="roster-week-dates">
									{weekStartDateIso} — {weekEndDateIso}
								</span>
								<span className="roster-week-year">{selectedYear} г.</span>
							</div>
							<button
								type="button"
								className="roster-btn-icon"
								onClick={onNextWeek}
								title="Следующая неделя"
								style={{ minHeight: "44px", minWidth: "44px" }}
							>
								<ChevronRight size={18} />
							</button>
						</div>

						{/* Quick Fill & Presets */}
						<div className="roster-actions-group">
							<button
								type="button"
								className="roster-btn roster-btn-auto"
								onClick={onAutoFillDefault}
								style={{ minHeight: "44px" }}
								title="Автозаполнение графика по стандартным шаблонам отделений"
							>
								<Sparkles size={16} />
								<span>Автозаполнение по шаблону</span>
							</button>
							<div className="roster-preset-dropdown">
								<button
									type="button"
									className="roster-btn roster-btn-secondary"
									style={{ minHeight: "44px" }}
									title="Применить типовой график сменности ко всем врачам"
								>
									<Layers size={16} />
									<span>Шаблоны графиков ▾</span>
								</button>
								<div className="roster-preset-menu">
									<button
										type="button"
										onClick={() => onApplyPreset("five_day", "5/2")}
									>
										Пятидневка (5/2, Пн-Пт 6.6ч)
									</button>
									<button
										type="button"
										onClick={() => onApplyPreset("two_two", "2/2")}
									>
										Сменный 2 через 2 (2/2, 12ч)
									</button>
									<button
										type="button"
										onClick={() =>
											onApplyPreset("morning", "Утренние смены")
										}
									>
										Все утренние (08:30–14:30)
									</button>
									<button
										type="button"
										onClick={() =>
											onApplyPreset("evening", "Вечерние смены")
										}
									>
										Все вечерние (14:30–20:30)
									</button>
									<button
										type="button"
										onClick={() =>
											onApplyPreset("full_day", "Полный день")
										}
									>
										Полный день (12ч смены)
									</button>
								</div>
							</div>
						</div>
					</div>

					{/* KPI Strip */}
					<div className="roster-kpis-strip">
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Смен на неделю</span>
							<span className="roster-kpi-val">{kpis.totalWeekShifts}</span>
							<span className="roster-kpi-sub">
								{kpis.totalWeeklyHours} рабочих часов
							</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">
								Норма месяца ({monthName})
							</span>
							<span
								className="roster-kpi-val"
								style={{ color: "var(--teal, #0d9488)" }}
							>
								{monthNormObj?.normHours33 || 138.6} ч
							</span>
							<span className="roster-kpi-sub">33-часовая неделя</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Ассистентские пары</span>
							<span className="roster-kpi-val">{kpis.assistantPairingPct}%</span>
							<span className="roster-kpi-sub">Охват работы в 4 руки</span>
						</div>
						<div className="roster-kpi-card">
							<span className="roster-kpi-label">Коллизии и наложения</span>
							<span
								className="roster-kpi-val"
								style={{
									color:
										kpis.conflictCount > 0
											? "var(--bad-fg, #ef4444)"
											: "var(--teal, #0d9488)",
								}}
							>
								{kpis.conflictCount}
							</span>
							<span className="roster-kpi-sub">
								{kpis.errorConflictCount > 0
									? "Есть наложения смен"
									: "График сбалансирован"}
							</span>
						</div>
					</div>
				</div>

				{/* Nav, Tab & Period Strip */}
				<div className="roster-nav-bar">
					<div className="roster-tab-group">
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "cabinets" ? "active" : ""}`}
							onClick={() => onSelectTab("cabinets")}
							style={{ minHeight: "44px" }}
						>
							<Layers size={16} />
							<span>По кабинетам</span>
						</button>
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "doctors" ? "active" : ""}`}
							onClick={() => onSelectTab("doctors")}
							style={{ minHeight: "44px" }}
						>
							<Users size={16} />
							<span>Расписание врачей</span>
						</button>
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "t13" ? "active" : ""}`}
							onClick={() => onSelectTab("t13")}
							style={{ minHeight: "44px" }}
						>
							<FileSpreadsheet size={16} />
							<span>Табель Т-13</span>
						</button>
						<button
							type="button"
							className={`roster-tab-btn ${activeTab === "utilization" ? "active" : ""}`}
							onClick={() => onSelectTab("utilization")}
							style={{ minHeight: "44px" }}
						>
							<Clock size={16} />
							<span>Загрузка кресел</span>
						</button>
					</div>

					{/* Period Selector */}
					<div className="roster-period-controls">
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={onPrevWeek}
							style={{
								padding: "0.25rem 0.5rem",
								minHeight: "44px",
								minWidth: "44px",
							}}
							title="Предыдущая неделя"
						>
							<ChevronLeft size={18} />
						</button>
						<div
							style={{
								fontWeight: 700,
								fontSize: "0.875rem",
								minWidth: "13rem",
								textAlign: "center",
							}}
						>
							{weekStartDateIso.substring(8, 10)}.
							{weekStartDateIso.substring(5, 7)} —{" "}
							{weekEndDateIso.substring(8, 10)}.
							{weekEndDateIso.substring(5, 7)}.{selectedYear}
						</div>
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={onNextWeek}
							style={{
								padding: "0.25rem 0.5rem",
								minHeight: "44px",
								minWidth: "44px",
							}}
							title="Следующая неделя"
						>
							<ChevronRight size={18} />
						</button>
						<button
							type="button"
							className="roster-btn roster-btn-secondary"
							onClick={onAutoFillDefault}
							style={{ minHeight: "44px", fontSize: "0.75rem" }}
							title="Заполнить неделю стандартным шаблоном смен"
						>
							<Sparkles size={14} />
							<span>Авто-шаблон</span>
						</button>
					</div>
				</div>

				{/* 1-Click Shift Allocation Presets Strip (Mandates 8e, 8k, 8n) */}
				<div
					className="roster-presets-strip"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						padding: "0.5rem 1.5rem",
						background: "var(--paper-soft, #f8fafc)",
						borderBottom: "1px solid var(--line, #e2e8f0)",
						flexWrap: "wrap",
					}}
				>
					<span
						style={{
							fontSize: "0.75rem",
							fontWeight: 700,
							color: "var(--muted, #64748b)",
						}}
					>
						Шаблоны сменности:
					</span>
					<button
						type="button"
						data-testid="roster-preset-five-day"
						className="roster-btn roster-btn-secondary"
						onClick={() => onApplyPreset("five_day", "Пятидневка")}
						style={{
							minHeight: "44px",
							padding: "0.25rem 0.75rem",
							fontSize: "0.8125rem",
						}}
						title="Пятидневка (Пн–Пт) для врачей и кресел"
					>
						<span>Пятидневка</span>
					</button>
					<button
						type="button"
						data-testid="roster-preset-two-two"
						className="roster-btn roster-btn-secondary"
						onClick={() => onApplyPreset("two_two", "2/2")}
						style={{
							minHeight: "44px",
							padding: "0.25rem 0.75rem",
							fontSize: "0.8125rem",
						}}
						title="Сменный график 2 через 2 дня"
					>
						<span>2/2</span>
					</button>
					<button
						type="button"
						data-testid="roster-preset-morning"
						className="roster-btn roster-btn-secondary"
						onClick={() => onApplyPreset("morning", "Утро 08:00–14:00")}
						style={{
							minHeight: "44px",
							padding: "0.25rem 0.75rem",
							fontSize: "0.8125rem",
						}}
						title="Утренние смены 08:00–14:00"
					>
						<span>Утро 08:00–14:00</span>
					</button>
					<button
						type="button"
						data-testid="roster-preset-evening"
						className="roster-btn roster-btn-secondary"
						onClick={() => onApplyPreset("evening", "Вечер 14:00–20:00")}
						style={{
							minHeight: "44px",
							padding: "0.25rem 0.75rem",
							fontSize: "0.8125rem",
						}}
						title="Вечерние смены 14:00–20:00"
					>
						<span>Вечер 14:00–20:00</span>
					</button>
					<button
						type="button"
						data-testid="roster-preset-full-day"
						className="roster-btn roster-btn-secondary"
						onClick={() => onApplyPreset("full_day", "Полный день 08:00–20:00")}
						style={{
							minHeight: "44px",
							padding: "0.25rem 0.75rem",
							fontSize: "0.8125rem",
						}}
						title="Полный рабочий день 08:00–20:00"
					>
						<span>Полный день 08:00–20:00</span>
					</button>
				</div>

				{/* Notifications & Conflicts Ribbon */}
				{notification && (
					<div
						style={{
							padding: "0.5rem 1.5rem",
							background:
								notification.type === "error"
									? "var(--bad-bg, #fef2f2)"
									: "var(--ok-bg, #f0fdf4)",
							color:
								notification.type === "error"
									? "var(--bad-fg, #991b1b)"
									: "var(--ok-fg, #166534)",
							fontSize: "0.8125rem",
							fontWeight: 600,
							display: "flex",
							alignItems: "center",
							gap: "0.5rem",
							borderBottom: "1px solid rgba(0,0,0,0.05)",
						}}
					>
						<Check size={16} />
						<span>{notification.message}</span>
					</div>
				)}

				{conflicts.length > 0 && (
					<div
						className="roster-conflict-banner"
						role="status"
						aria-live="polite"
					>
						<div className="roster-conflict-header">
							<AlertTriangle size={16} className="roster-conflict-icon" />
							<span className="roster-conflict-title">
								Предупреждения ({conflicts.length}):
							</span>
						</div>
						<div className="roster-conflict-list">
							{conflicts.map((c) => (
								<div
									key={c.id}
									className={`roster-conflict-tag ${c.severity === "error" ? "error" : "warning"}`}
									title={c.message}
								>
									<span className="roster-conflict-dot" />
									<span className="roster-conflict-text">{c.message}</span>
								</div>
							))}
						</div>
					</div>
				)}
			</>
		);
	},
);
