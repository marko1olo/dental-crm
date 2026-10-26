import { Calendar, Send } from "lucide-react";
import type React from "react";
import { getQuickPeriod } from "./managerReportsPresets";

export interface ManagerReportsToolbarProps {
	readonly from: string;
	readonly to: string;
	readonly granularity: "day" | "week" | "month";
	readonly loading: boolean;
	readonly onFromChange: (val: string) => void;
	readonly setToChange: (val: string) => void;
	readonly onGranularityChange: (val: "day" | "week" | "month") => void;
	readonly onRefresh: () => void;
	readonly onExportCsv: () => void;
	readonly onShareEveningSummary: () => void;
}

export const ManagerReportsToolbar: React.FC<ManagerReportsToolbarProps> = ({
	from,
	to,
	granularity,
	loading,
	onFromChange,
	setToChange,
	onGranularityChange,
	onRefresh,
	onExportCsv,
	onShareEveningSummary,
}) => {
	const applyPreset = (type: "today" | "yesterday" | "week" | "month") => {
		const p = getQuickPeriod(type);
		onFromChange(p.from);
		setToChange(p.to);
	};

	return (
		<div className="ops-toolbar flex flex-wrap items-center gap-2 mb-3">
			<div className="flex items-center gap-1 bg-[var(--paper-soft)] p-1 rounded-lg border border-[var(--line)]">
				<button type="button" className="secondary-button text-xs py-1 px-2.5" onClick={() => applyPreset("today")}>Сегодня</button>
				<button type="button" className="secondary-button text-xs py-1 px-2.5" onClick={() => applyPreset("yesterday")}>Вчера</button>
				<button type="button" className="secondary-button text-xs py-1 px-2.5" onClick={() => applyPreset("week")}>Неделя</button>
				<button type="button" className="secondary-button text-xs py-1 px-2.5" onClick={() => applyPreset("month")}>Месяц</button>
			</div>

			<span className="ops-field">
				<label htmlFor="report-from">С</label>
				<input id="report-from" type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
			</span>
			<span className="ops-field">
				<label htmlFor="report-to">По</label>
				<input id="report-to" type="date" value={to} onChange={(e) => setToChange(e.target.value)} />
			</span>
			<span className="ops-field">
				<label htmlFor="report-granularity">Шаг</label>
				<select id="report-granularity" value={granularity} onChange={(e) => onGranularityChange(e.target.value as "day" | "week" | "month")}>
					<option value="day">по дням</option>
					<option value="week">по неделям</option>
					<option value="month">по месяцам</option>
				</select>
			</span>

			<button className="secondary-button" type="button" onClick={onRefresh} disabled={loading}>
				{loading ? "Считаю…" : "Обновить"}
			</button>
			<button className="secondary-button" type="button" onClick={onExportCsv} data-testid="reports-export-csv-btn">
				Экспорт в CSV
			</button>
			<button
				className="secondary-button flex items-center gap-1.5"
				type="button"
				onClick={onShareEveningSummary}
				title="Скопировать вечернюю сводку смены для WhatsApp/Telegram"
			>
				<Send className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
				<span>Z-сводка смены</span>
			</button>
		</div>
	);
};
