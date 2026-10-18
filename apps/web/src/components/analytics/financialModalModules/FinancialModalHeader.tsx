import React from "react";
import { DollarSign, Download, RefreshCw, X } from "lucide-react";
import {
	exportFinancialPnlCsvReport,
	type FinancialPeriodChoice,
} from "./FinancialCashflowTimeline";
import type { ComputedPnlMetrics } from "./FinancialPnlBreakdownSection";

interface FinancialModalHeaderProps {
	readonly period: FinancialPeriodChoice;
	readonly onPeriodChange: (p: FinancialPeriodChoice) => void;
	readonly metrics: ComputedPnlMetrics;
	readonly isLoading: boolean;
	readonly onRefresh: () => void;
	readonly onClose: () => void;
}

export function FinancialModalHeader({
	period,
	onPeriodChange,
	metrics,
	isLoading,
	onRefresh,
	onClose,
}: FinancialModalHeaderProps) {
	return (
		<>
			<header className="fin-analytics-header">
				<div className="fin-analytics-title-group">
					<div className="fin-analytics-header-icon"><DollarSign size={22} /></div>
					<div>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<h2 className="fin-analytics-title">Финансовая Аналитика и P&amp;L Клиники</h2>
							<span className="fin-analytics-badge">Касса и управленческий учет</span>
						</div>
						<p className="fin-analytics-subtitle">
							Валовая прибыль • Себестоимость • EBITDA • Чистая рентабельность • Распределение по кассам
						</p>
					</div>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<button
						type="button"
						onClick={() => exportFinancialPnlCsvReport({ period, ...metrics })}
						className="secondary-button fin-analytics-action-btn"
						data-testid="export-financial-csv-btn"
					>
						<Download size={14} /> <span>Экспорт P&amp;L</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="icon-button fin-analytics-close-btn"
						aria-label="Закрыть окно"
						data-testid="close-financial-modal-btn"
					>
						<X size={20} />
					</button>
				</div>
			</header>

			<div className="fin-analytics-controls">
				<div className="fin-analytics-period-wrapper">
					<span className="fin-analytics-period-label">Период:</span>
					<div className="fin-analytics-period-tabs" role="radiogroup" aria-label="Период отчета">
						{(["month", "quarter", "year"] as const).map((p) => (
							<button
								key={p}
								type="button"
								className={`fin-analytics-tab-btn ${period === p ? "active" : ""}`}
								onClick={() => onPeriodChange(p)}
								data-testid={`period-${p}-btn`}
								role="radio"
								aria-checked={period === p}
							>
								{p === "month" ? "Текущий месяц" : p === "quarter" ? "Квартал" : "2026 год"}
							</button>
						))}
					</div>
				</div>

				<button
					type="button"
					onClick={onRefresh}
					className="secondary-button fin-analytics-action-btn"
					title="Обновить финансовые показатели"
				>
					<RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
					<span>Обновить</span>
				</button>
			</div>
		</>
	);
}
