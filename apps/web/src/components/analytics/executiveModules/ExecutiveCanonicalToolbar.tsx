import React from "react";
import { Download, RefreshCw, Sparkles } from "lucide-react";
import type { MobileAnalyticsPeriod } from "./executiveAnalyticsTypes";

export const CANONICAL_PERIOD_OPTIONS: readonly {
	readonly key: MobileAnalyticsPeriod;
	readonly label: string;
}[] = [
	{ key: "day", label: "Сегодня" },
	{ key: "yesterday", label: "Вчера" },
	{ key: "week", label: "Неделя" },
	{ key: "month", label: "Месяц" },
	{ key: "quarter", label: "Квартал" },
	{ key: "year", label: "Год" },
] as const;

interface ExecutiveCanonicalToolbarProps {
	readonly period: MobileAnalyticsPeriod;
	readonly setPeriod: (p: any) => void;
	readonly loading: boolean;
	readonly reload: () => void;
	readonly handleExportCsv: () => void;
	readonly handleOpenPnl: () => void;
}

export function ExecutiveCanonicalToolbar({
	period,
	setPeriod,
	loading,
	reload,
	handleExportCsv,
	handleOpenPnl,
}: ExecutiveCanonicalToolbarProps) {
	return (
		<header className="executive-canonical-toolbar" role="toolbar" aria-label="Панель периода и действий аналитики">
			<div className="executive-period-chips" role="radiogroup" aria-label="Выбор периода аналитики">
				{CANONICAL_PERIOD_OPTIONS.map((opt) => (
					<button
						key={opt.key}
						type="button"
						role="radio"
						aria-checked={period === opt.key}
						className={`secondary-button ${period === opt.key ? "active" : ""}`}
						onClick={() => setPeriod(opt.key)}
						data-testid={`period-btn-${opt.key}`}
					>
						{opt.label}
					</button>
				))}
			</div>

			<div className="executive-toolbar-actions" role="group" aria-label="Действия">
				<button
					type="button"
					className="secondary-button"
					onClick={handleExportCsv}
					title="Экспорт в Excel / CSV"
					data-testid="desktop-export-btn"
				>
					<Download size={14} aria-hidden="true" />
					<span className="hidden sm:inline">Экспорт в Excel / CSV</span>
				</button>

				<button
					type="button"
					className="primary-button"
					onClick={handleOpenPnl}
					title="Открыть финансовую аналитику P&L"
					data-testid="desktop-open-pnl-btn"
				>
					<Sparkles size={14} aria-hidden="true" />
					<span>P&amp;L калькулятор</span>
				</button>

				<button
					type="button"
					className="secondary-button"
					onClick={reload}
					disabled={loading}
					title="Обновить показатели дашборда"
					aria-label="Обновить показатели дашборда"
					data-testid="desktop-refresh-btn"
				>
					<RefreshCw size={14} className={loading ? "animate-spin text-[var(--teal)]" : ""} aria-hidden="true" />
				</button>
			</div>
		</header>
	);
}
