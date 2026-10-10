import React from "react";
import { Clock, RefreshCw } from "lucide-react";
import type { HotFolderDirectoryConfigProps, HotFolderSource } from "./types";

export const HotFolderDirectoryConfig: React.FC<HotFolderDirectoryConfigProps> = ({
	filteredItemsCount,
	totalItemsCount,
	activeSourceFilter,
	isScanning,
	onSourceFilterChange,
	onRescanFolder,
	freshCount,
}) => {
	return (
		<div className="hfi-left-header">
			<div className="hfi-folder-status-bar">
				<div
					className="hfi-folder-status-indicator"
					title="Работает параллельно с Vatech EzDent-i, Carestream, Romexis без конфликта за USB"
				>
					<span className="hfi-status-pulse-dot" />
					<span>Папка автозахвата ({filteredItemsCount} снимков) · Бесконфликтно</span>
				</div>
				<button
					type="button"
					onClick={onRescanFolder}
					className="hfi-rescan-btn"
					data-testid="hfi-rescan-btn"
					title="Обновить каталог автозахвата снимков"
				>
					<RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin text-teal-400" : ""}`} />
					<span>{isScanning ? "Поиск..." : "Обновить"}</span>
				</button>
			</div>

			<select
				value={activeSourceFilter}
				onChange={(e) => onSourceFilterChange(e.target.value as HotFolderSource)}
				className="hfi-source-filter-select"
				data-testid="hfi-source-filter-select"
				aria-label="Фильтр по источнику рентгена"
			>
				<option value="all">Все источники рентгена</option>
				<option value="fresh_15m">Свежие снимки (&lt;15 минут)</option>
				<option value="ezdent">Vatech EzDent-i (Auto-Export)</option>
				<option value="romexis">Planmeca Romexis (Exchange)</option>
				<option value="sidexis">Dentsply Sirona Sidexis 4</option>
				<option value="carestream">Carestream CS Imaging</option>
				<option value="dicom_network">Область загрузки снимка (локальный файл)</option>
			</select>

			{/* Quick filter chips for fresh shots (< 15 mins) */}
			<div className="hfi-fdi-quick-presets" style={{ marginTop: "0.25rem" }}>
				<button
					type="button"
					onClick={() => onSourceFilterChange("all")}
					className={`hfi-fdi-quick-chip ${activeSourceFilter === "all" ? "active" : ""}`}
					data-testid="hfi-filter-all-btn"
				>
					Все ({totalItemsCount})
				</button>
				<button
					type="button"
					onClick={() => onSourceFilterChange("fresh_15m")}
					className={`hfi-fdi-quick-chip ${activeSourceFilter === "fresh_15m" ? "active" : ""}`}
					style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
					data-testid="hfi-filter-fresh-btn"
					title="Интеллектуальный поиск свежих снимков за последние 15 минут"
				>
					<Clock className="w-3 h-3" />
					<span>Свежие &lt;15м ({freshCount})</span>
				</button>
			</div>
		</div>
	);
};
