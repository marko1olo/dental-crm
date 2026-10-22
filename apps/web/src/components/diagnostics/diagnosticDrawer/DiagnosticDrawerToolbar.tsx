import React from "react";
import { Search, X, Trash2, Download } from "lucide-react";
import type { LogLevel } from "@dental/shared";
import type { TabKind } from "./diagnosticDrawerTypes";

interface DiagnosticDrawerToolbarProps {
	activeTab: TabKind;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	logLevelFilter: "ALL" | LogLevel;
	setLogLevelFilter: (level: "ALL" | LogLevel) => void;
	selectedModule: string;
	setSelectedModule: (mod: string) => void;
	availableModules: readonly string[];
	onClearLogs: () => void;
	onExportReport: () => void;
}

export const DiagnosticDrawerToolbar: React.FC<DiagnosticDrawerToolbarProps> = ({
	activeTab,
	searchQuery,
	setSearchQuery,
	logLevelFilter,
	setLogLevelFilter,
	selectedModule,
	setSelectedModule,
	availableModules,
	onClearLogs,
	onExportReport,
}) => {
	if (activeTab !== "logs" && activeTab !== "network") return null;

	return (
		<div className="dente-diagnostic-toolbar">
			<div className="dente-search-wrap flex-1 min-w-[180px]">
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					className="dente-search-input"
					placeholder="Поиск по сообщениям, URL или Correlation ID..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
				{searchQuery && (
					<button
						type="button"
						className="dente-search-clear"
						onClick={() => setSearchQuery("")}
						aria-label="Очистить поиск"
					>
						<X size={14} />
					</button>
				)}
			</div>

			{activeTab === "logs" && (
				<div className="dente-diagnostic-filter-group">
					<select
						className="dente-diagnostic-select"
						value={logLevelFilter}
						onChange={(e) => setLogLevelFilter(e.target.value as "ALL" | LogLevel)}
						aria-label="Фильтр уровня логов"
					>
						<option value="ALL">Все уровни</option>
						<option value="DEBUG">DEBUG</option>
						<option value="INFO">INFO</option>
						<option value="WARN">WARN</option>
						<option value="ERROR">ERROR</option>
						<option value="AUDIT">AUDIT</option>
					</select>

					<select
						className="dente-diagnostic-select"
						value={selectedModule}
						onChange={(e) => setSelectedModule(e.target.value)}
						aria-label="Фильтр модуля"
					>
						<option value="ALL">Все модули</option>
						{availableModules.map((mod) => (
							<option key={mod} value={mod}>{mod}</option>
						))}
					</select>
				</div>
			)}

			<div className="dente-diagnostic-filter-group">
				<button
					type="button"
					className="dente-diagnostic-action-btn"
					onClick={onClearLogs}
					title="Очистить текущие логи"
				>
					<Trash2 size={14} />
					<span>Очистить</span>
				</button>
				<button
					type="button"
					className="dente-diagnostic-action-btn dente-diagnostic-primary-btn"
					onClick={onExportReport}
					title="Скачать полный диагностический отчет .json"
				>
					<Download size={14} />
					<span>Экспорт .json</span>
				</button>
			</div>
		</div>
	);
};
