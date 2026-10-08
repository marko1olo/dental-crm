import { FolderSync, RefreshCw } from "lucide-react";
import { useState } from "react";
import { DEFAULT_HOT_FOLDER_CONFIG } from "./constants";
import type { DicomHotFolderConfig, TextInputChangeEvent } from "./types";

export interface DicomHotFolderPanelProps {
	initialConfig?: Partial<DicomHotFolderConfig>;
	onSaveConfig?: (config: DicomHotFolderConfig) => void;
	onTriggerScan?: () => void;
	isScanning?: boolean;
}

export function DicomHotFolderPanel({
	initialConfig,
	onSaveConfig,
	onTriggerScan,
	isScanning = false,
}: DicomHotFolderPanelProps) {
	const [config, setConfig] = useState<DicomHotFolderConfig>({
		...DEFAULT_HOT_FOLDER_CONFIG,
		...initialConfig,
	});

	const handleSave = () => {
		onSaveConfig?.(config);
	};

	return (
		<section
			className="dicom-hot-folder-panel"
			aria-label="Локальный демон Hot Folder"
		>
			<div className="dicomweb-launch-head">
				<div>
					<strong>Локальный демон Hot Folder (Рентген-сканер)</strong>
					<p>
						Автоматический опрос локальной папки аппарата и импорт снимков без
						ручной выгрузки.
					</p>
				</div>
				<span>
					<FolderSync aria-hidden="true" style={{ width: 16, height: 16 }} />{" "}
					{config.enabled ? "Активен" : "Отключен"}
				</span>
			</div>

			<div className="dicomweb-input-grid">
				<label>
					Путь к папке снимков
					<input
						value={config.folderPath}
						onChange={(e: TextInputChangeEvent) =>
							setConfig((prev) => ({ ...prev, folderPath: e.target.value }))
						}
						placeholder="C:\DentalImages\Incoming"
					/>
				</label>
				<label>
					Интервал сканирования (сек)
					<input
						type="number"
						value={config.scanIntervalSec}
						onChange={(e: TextInputChangeEvent) =>
							setConfig((prev) => ({
								...prev,
								scanIntervalSec: Number(e.target.value) || 15,
							}))
						}
					/>
				</label>
			</div>

			<div className="mpr-check-row" style={{ marginTop: "12px" }}>
				<label>
					<input
						type="checkbox"
						className="toggle-switch"
						checked={config.enabled}
						onChange={(e) =>
							setConfig((prev) => ({ ...prev, enabled: e.target.checked }))
						}
					/>
					Фоновое сканирование папки
				</label>
				<label>
					<input
						type="checkbox"
						className="toggle-switch"
						checked={config.autoGroupSeries}
						onChange={(e) =>
							setConfig((prev) => ({
								...prev,
								autoGroupSeries: e.target.checked,
							}))
						}
					/>
					Автогруппировка серий КЛКТ
				</label>
			</div>

			<div className="dicomweb-action-row" style={{ marginTop: "12px" }}>
				<button
					type="button"
					className="primary-button"
					onClick={handleSave}
				>
					Сохранить параметры Hot Folder
				</button>
				<button
					type="button"
					className="secondary-button"
					onClick={onTriggerScan}
					disabled={isScanning || !config.enabled}
				>
					<RefreshCw aria-hidden="true" />
					{isScanning ? "Сканирую папку..." : "Сканировать сейчас"}
				</button>
			</div>
		</section>
	);
}
