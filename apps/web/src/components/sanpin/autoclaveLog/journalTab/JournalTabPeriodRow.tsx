import React from "react";
import { Calendar } from "lucide-react";
import { Autoclave } from "../../../icons/DentalIcons";

export interface JournalTabPeriodRowProps {
	readonly periodPreset: string;
	readonly onPresetChange: (p: string) => void;
	readonly startDate: string;
	readonly onStartDateChange: (d: string) => void;
	readonly endDate: string;
	readonly onEndDateChange: (d: string) => void;
	readonly onGenerateBatch: () => void;
	readonly filteredCount: number;
	readonly totalCount: number;
}

export const JournalTabPeriodRow: React.FC<JournalTabPeriodRowProps> = ({
	periodPreset, onPresetChange, startDate, onStartDateChange,
	endDate, onEndDateChange, onGenerateBatch, filteredCount, totalCount,
}) => (
	<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
		<div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
			<Calendar size={16} color="var(--teal, #0d9488)" />
			<span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--ink, #0f172a)" }}>Период:</span>
			<select className="autoclave-select" style={{ minHeight: "36px", height: "36px", fontSize: "0.8125rem" }} value={periodPreset} onChange={(e) => onPresetChange(e.target.value)} data-testid="journal-tab-period-preset-select">
				<option value="all">За всё время</option>
				<option value="current_month">Текущий месяц</option>
				<option value="today">Сегодня</option>
				<option value="week">Текущая неделя</option>
				<option value="prev_month">Прошлый месяц</option>
				<option value="current_quarter">Текущий квартал</option>
				<option value="custom">Произвольные даты</option>
			</select>
		</div>
		<div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
			<input type="date" className="autoclave-input" style={{ minHeight: "36px", height: "36px", fontSize: "0.8125rem", width: "135px" }} value={startDate} onChange={(e) => onStartDateChange(e.target.value)} data-testid="journal-tab-start-date-input" title="Дата начала периода" />
			<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>—</span>
			<input type="date" className="autoclave-input" style={{ minHeight: "36px", height: "36px", fontSize: "0.8125rem", width: "135px" }} value={endDate} onChange={(e) => onEndDateChange(e.target.value)} data-testid="journal-tab-end-date-input" title="Дата окончания периода" />
		</div>
		<button type="button" onClick={onGenerateBatch} className="autoclave-btn autoclave-btn-secondary" style={{ minHeight: "36px", padding: "0.45rem 0.875rem", fontWeight: 600, fontSize: "0.8125rem" }} title="Пакетно сформировать циклы стерилизации (134°C 2.1 бар 5 мин / 20 мин, 5 точек КТ) за выбранный период" data-testid="journal-tab-generate-batch-btn">
			<Autoclave size={15} color="var(--teal, #0d9488)" />
			<span>Сформировать за период</span>
		</button>
		<div style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)", fontWeight: 500, marginLeft: "0.5rem" }}>
			Найдено: <strong>{filteredCount}</strong> / {totalCount}
		</div>
	</div>
);
