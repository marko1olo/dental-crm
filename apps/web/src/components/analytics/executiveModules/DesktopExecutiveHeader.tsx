import React from "react";
import type { ExecutivePeriod } from "@dental/shared";
import { Download, RefreshCw, Sparkles } from "lucide-react";

interface DesktopExecutiveHeaderProps {
	readonly period: ExecutivePeriod;
	readonly setPeriod: (p: ExecutivePeriod) => void;
	readonly loading: boolean;
	readonly reload: () => void;
	readonly handleExportCsv: () => void;
	readonly handleOpenPnl: () => void;
}

export function DesktopExecutiveHeader({
	period,
	setPeriod,
	loading,
	reload,
	handleExportCsv,
	handleOpenPnl,
}: DesktopExecutiveHeaderProps) {
	return (
		<header className="executive-header">
			<div className="executive-header-info">
				<div className="executive-title-row">
					<h1 className="executive-title">Аналитика клиники</h1>
					<span className="executive-badge-feature">P&amp;L Кокпит</span>
				</div>
				<p
					className="executive-subtitle"
					title="Сквозная конверсия первичных пациентов, план/факт P&L отделений и операционная эффективность"
				>
					Сквозная выручка кассы, себестоимость кресло-часа и рентабельность отделений
				</p>
			</div>

			<div className="executive-controls">
				<div className="executive-period-toggle" role="group" aria-label="Период отчета">
					{([
						{ key: "day", label: "Сегодня" },
						{ key: "yesterday", label: "Вчера" },
						{ key: "week", label: "Неделя" },
						{ key: "month", label: "Месяц" },
						{ key: "quarter", label: "Квартал" },
						{ key: "year", label: "Год" },
					] as const).map((opt) => (
						<button
							key={opt.key}
							type="button"
							className={`secondary-button ${period === opt.key ? "active" : ""}`}
							onClick={() => setPeriod(opt.key)}
							data-testid={`desktop-period-${opt.key}`}
						>
							{opt.label}
						</button>
					))}
				</div>

				<button
					type="button"
					className="secondary-button"
					onClick={handleExportCsv}
					title="Экспорт аналитического отчета в Excel / CSV"
					data-testid="desktop-export-btn"
				>
					<Download size={14} aria-hidden="true" />
					<span>Экспорт в Excel / PDF</span>
				</button>

				<button
					type="button"
					className="primary-button"
					onClick={handleOpenPnl}
					title="Открыть финансовую аналитику P&amp;L"
					data-testid="desktop-open-pnl-btn"
				>
					<Sparkles size={14} aria-hidden="true" />
					<span>Финансовый отчет P&amp;L</span>
				</button>

				<button
					type="button"
					className="secondary-button"
					onClick={reload}
					disabled={loading}
					aria-label="Обновить показатели дашборда"
					title="Обновить показатели дашборда"
					data-testid="desktop-refresh-btn"
				>
					<RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
				</button>
			</div>
		</header>
	);
}
