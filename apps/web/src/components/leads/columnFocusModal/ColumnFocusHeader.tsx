/**
 * DENTE Dental CRM — Column Focus Workspace Header (Layer 1)
 *
 * Mandate 8n (Clinical Ergonomics, Scale Sovereignty & Solo Doctor Autonomy)
 * Top header containing stage identity, clinical telemetry metrics, view toggles, and dismiss button.
 */

import React from "react";
import {
	AlertTriangle,
	Clock,
	DollarSign,
	FileSpreadsheet,
	LayoutGrid,
	Users,
	X,
} from "lucide-react";
import type { ColumnFocusHeaderProps } from "./types";

export const ColumnFocusHeader: React.FC<ColumnFocusHeaderProps> = ({
	column,
	metrics,
	viewMode,
	onViewModeChange,
	onClose,
}) => {
	return (
		<header className="expanded-focus-header">
			<div className="expanded-focus-title-group">
				<div
					className="expanded-focus-column-icon"
					style={{ background: column.color }}
				>
					{column.icon}
				</div>
				<div>
					<div className="flex items-center gap-2">
						<h2 className="expanded-focus-title">{column.label}</h2>
						<span className="expanded-focus-badge-mode">
							Focus Workspace · 92vw
						</span>
					</div>
					<p className="expanded-focus-subtitle">
						Широкий рабочий стол этапа воронки для скоростной пакетной обработки
					</p>
				</div>
			</div>

			{/* Clinical Telemetry / Metrics */}
			<div className="expanded-focus-metrics-cluster">
				<div className="expanded-focus-metric-pill" title="Всего лидов на этапе">
					<Users size={12} className="text-[var(--muted)]" />
					<span>
						Лидов: <strong>{metrics.totalCount}</strong>
					</span>
				</div>
				{metrics.totalRevenue > 0 && (
					<div
						className="expanded-focus-metric-pill expanded-focus-metric-pill--revenue"
						title="Суммарный потенциал выручки"
					>
						<DollarSign size={12} />
						<span>{metrics.totalRevenue.toLocaleString("ru-RU")} ₽</span>
					</div>
				)}
				<div
					className="expanded-focus-metric-pill"
					title="Среднее время ожидания в очереди"
				>
					<Clock size={12} className="text-[var(--muted)]" />
					<span>
						Ср. SLA: <strong>{metrics.avgWaitMinutes}м</strong>
					</span>
				</div>
				{metrics.breachedCount > 0 && (
					<div
						className="expanded-focus-metric-pill expanded-focus-metric-pill--breached lead-sla-breached-pulse"
						title="Требуют немедленной реакции"
					>
						<AlertTriangle size={12} />
						<span>
							SLA просрочен: <strong>{metrics.breachedCount}</strong>
						</span>
					</div>
				)}
			</div>

			{/* View Toggle & Close */}
			<div className="expanded-focus-header-actions">
				<div className="leads-viewmode-segmented dente-segmented-bar">
					<button
						type="button"
						className={`leads-viewmode-segmented-btn dente-segmented-item ${viewMode === "cards" ? "is-active active" : ""}`}
						onClick={() => onViewModeChange("cards")}
						title="Вид: 3-колоночная широкая сетка карточек"
						data-testid="focus-view-toggle-cards"
					>
						<LayoutGrid size={13} />
						<span>Карточки (3-col)</span>
					</button>
					<button
						type="button"
						className={`leads-viewmode-segmented-btn dente-segmented-item ${viewMode === "table" ? "is-active active" : ""}`}
						onClick={() => onViewModeChange("table")}
						title="Вид: клинический спредшит (таблица 32px)"
						data-testid="focus-view-toggle-table"
					>
						<FileSpreadsheet size={13} />
						<span>Таблица 32px</span>
					</button>
				</div>

				<button
					type="button"
					className="expanded-focus-close-btn"
					onClick={onClose}
					title="Закрыть широкий фокус (Esc)"
					aria-label="Закрыть фокус"
					data-testid="focus-modal-close-btn"
				>
					<X size={16} />
				</button>
			</div>
		</header>
	);
};
