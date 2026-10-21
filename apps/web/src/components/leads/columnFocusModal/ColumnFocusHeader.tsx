/**
 * DENTE Dental CRM — Column Focus Workspace Header (Layer 1)
 * Mandate 8b (<= 120 lines)
 */

import {
	FileSpreadsheet,
	LayoutGrid,
	X,
} from "lucide-react";
import React from "react";
import { ColumnFocusMetricsCluster } from "./ColumnFocusMetricsCluster";
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

			<ColumnFocusMetricsCluster metrics={metrics} />

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
