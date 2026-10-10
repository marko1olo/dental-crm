/**
 * DENTE Dental CRM — Doctor Shift Roster Date Navigation & Tabs
 * Layer 4: Presentation Subcomponent (RosterWeekNav, RosterNavBar, RosterDateNavigation)
 */

import React from "react";
import {
	ChevronLeft,
	ChevronRight,
	Clock,
	FileSpreadsheet,
	Layers,
	Sparkles,
	Users,
} from "lucide-react";
import type { RosterDateNavigationProps } from "./types";

export interface RosterWeekNavProps {
	weekStartDateIso: string;
	weekEndDateIso: string;
	selectedYear: number;
	onPrevWeek: () => void;
	onNextWeek: () => void;
}

export const RosterWeekNav: React.FC<RosterWeekNavProps> = React.memo(
	function RosterWeekNav({
		weekStartDateIso,
		weekEndDateIso,
		selectedYear,
		onPrevWeek,
		onNextWeek,
	}) {
		return (
			<div className="roster-week-nav">
				<button
					type="button"
					className="roster-btn-icon"
					onClick={onPrevWeek}
					title="Предыдущая неделя"
					style={{ minHeight: "34px", minWidth: "34px", height: "34px" }}
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
					style={{ minHeight: "34px", minWidth: "34px", height: "34px" }}
				>
					<ChevronRight size={18} />
				</button>
			</div>
		);
	},
);

export interface RosterNavBarProps {
	activeTab: "cabinets" | "doctors" | "t13" | "utilization";
	onSelectTab: (tab: "cabinets" | "doctors" | "t13" | "utilization") => void;
	weekStartDateIso: string;
	weekEndDateIso: string;
	selectedYear: number;
	onPrevWeek: () => void;
	onNextWeek: () => void;
	onAutoFillDefault: () => void;
}

export const RosterNavBar: React.FC<RosterNavBarProps> = React.memo(
	function RosterNavBar({
		activeTab,
		onSelectTab,
		weekStartDateIso,
		weekEndDateIso,
		selectedYear,
		onPrevWeek,
		onNextWeek,
		onAutoFillDefault,
	}) {
		return (
			<div className="roster-nav-bar">
				<div className="roster-tab-group">
					<button
						type="button"
						className={`roster-tab-btn ${activeTab === "cabinets" ? "active" : ""}`}
						onClick={() => onSelectTab("cabinets")}
						style={{ minHeight: "34px", height: "34px" }}
					>
						<Layers size={16} />
						<span>По кабинетам</span>
					</button>
					<button
						type="button"
						className={`roster-tab-btn ${activeTab === "doctors" ? "active" : ""}`}
						onClick={() => onSelectTab("doctors")}
						style={{ minHeight: "34px", height: "34px" }}
					>
						<Users size={16} />
						<span>Расписание врачей</span>
					</button>
					<button
						type="button"
						className={`roster-tab-btn ${activeTab === "t13" ? "active" : ""}`}
						onClick={() => onSelectTab("t13")}
						style={{ minHeight: "34px", height: "34px" }}
						title="Табель учёта рабочего времени"
					>
						<FileSpreadsheet size={16} />
						<span>Табель учёта времени</span>
					</button>
					<button
						type="button"
						className={`roster-tab-btn ${activeTab === "utilization" ? "active" : ""}`}
						onClick={() => onSelectTab("utilization")}
						style={{ minHeight: "34px", height: "34px" }}
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
							minHeight: "34px",
							minWidth: "34px",
							height: "34px",
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
							minHeight: "34px",
							minWidth: "34px",
							height: "34px",
						}}
						title="Следующая неделя"
					>
						<ChevronRight size={18} />
					</button>
					<button
						type="button"
						className="roster-btn roster-btn-secondary"
						onClick={onAutoFillDefault}
						style={{ minHeight: "34px", height: "34px", fontSize: "0.75rem" }}
						title="Заполнить неделю стандартным шаблоном смен"
					>
						<Sparkles size={14} />
						<span>Авто-шаблон</span>
					</button>
				</div>
			</div>
		);
	},
);

export const RosterDateNavigation: React.FC<RosterDateNavigationProps> = React.memo(
	function RosterDateNavigation(props) {
		return (
			<>
				<RosterWeekNav
					weekStartDateIso={props.weekStartDateIso}
					weekEndDateIso={props.weekEndDateIso}
					selectedYear={props.selectedYear}
					onPrevWeek={props.onPrevWeek}
					onNextWeek={props.onNextWeek}
				/>
				<RosterNavBar {...props} />
			</>
		);
	},
);
