import React from "react";
import { FolderSearch, Play, RefreshCw, Search } from "lucide-react";

export interface MigrationOperatorActionButtonsProps {
	onRunAutopilot: () => void;
	onDiscoverSources: () => void;
	onPickBrowserSource: () => void;
	onLookupClinicProfile: () => void;
	isLoading?: boolean;
	isDiscovering?: boolean;
	isBrowserScanning?: boolean;
	isClinicLookupLoading?: boolean;
}

export function MigrationOperatorActionButtons({
	onRunAutopilot,
	onDiscoverSources,
	onPickBrowserSource,
	onLookupClinicProfile,
	isLoading = false,
	isDiscovering = false,
	isBrowserScanning = false,
	isClinicLookupLoading = false,
}: MigrationOperatorActionButtonsProps) {
	return (
		<div className="migration-operator-action-bar" data-testid="migration-operator-actions-bar">
			{/* Exactly ONE Primary CTA per Mandate 8am / HIG */}
			<button
				className="primary-button migration-primary-cta-btn"
				type="button"
				onClick={onRunAutopilot}
				disabled={isLoading}
				data-testid="migration-run-autopilot-btn"
				aria-label="Запустить пробный импорт базы"
			>
				<Play className="btn-icon" aria-hidden="true" />
				<span>{isLoading ? "Выполняется пробный импорт..." : "Запустить пробный импорт (Dry Run)"}</span>
			</button>

			<div className="migration-secondary-actions-group">
				<button
					className="secondary-button"
					type="button"
					onClick={onDiscoverSources}
					disabled={isDiscovering}
					data-testid="migration-discover-sources-btn"
					aria-label="Повторить поиск источников данных"
				>
					<RefreshCw className="btn-icon" aria-hidden="true" />
					<span>{isDiscovering ? "Поиск..." : "Повторить поиск"}</span>
				</button>

				<button
					className="secondary-button"
					type="button"
					onClick={onPickBrowserSource}
					disabled={isBrowserScanning}
					data-testid="migration-pick-folder-btn"
					aria-label="Выбрать папку с базой данных на диске"
				>
					<FolderSearch className="btn-icon" aria-hidden="true" />
					<span>{isBrowserScanning ? "Сканирование..." : "Выбрать папку"}</span>
				</button>

				<button
					className="secondary-button"
					type="button"
					onClick={onLookupClinicProfile}
					disabled={isClinicLookupLoading}
					data-testid="migration-lookup-clinic-btn"
					aria-label="Проверить публичные реквизиты клиники"
				>
					<Search className="btn-icon" aria-hidden="true" />
					<span>{isClinicLookupLoading ? "Проверка..." : "Реквизиты клиники"}</span>
				</button>
			</div>
		</div>
	);
}
