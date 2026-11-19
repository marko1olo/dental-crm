import React from "react";
import { Camera, ChevronDown, ChevronRight, Folder, RefreshCw } from "lucide-react";
import {
	HARDWARE_CATEGORY_LABELS,
	HARDWARE_PROTOCOL_LABELS,
	type HardwareDeviceConfig,
} from "../../../services/hardware/hardwarePresets.js";

interface Props {
	dev: HardwareDeviceConfig;
	isExpanded: boolean;
	isTesting: boolean;
	onToggleExpand: () => void;
	onTestConnection: (e: React.MouseEvent) => void;
	onSimulateScan: (e: React.MouseEvent) => void;
}

export const HardwareDeviceRow: React.FC<Props> = ({
	dev,
	isExpanded,
	isTesting,
	onToggleExpand,
	onTestConnection,
	onSimulateScan,
}) => {
	const statusLabel = isTesting
		? "Проверка..."
		: dev.status === "ready"
			? "Готов к снимкам"
			: dev.status === "not_found"
				? "Каталог не найден"
				: "Проверить связь";

	return (
		<div className="hw-device-header cursor-pointer select-none" onClick={onToggleExpand}>
			<div className="hw-device-header-left">
				<span className={`hw-device-status-dot ${isTesting ? "testing" : dev.status}`} title={dev.statusMessage} />
				<div className="hw-device-info">
					<div className="hw-device-name-line">
						<span className="hw-device-title">{dev.name}</span>
						<span className="hw-device-vendor-badge">{dev.vendor}</span>
						<span className="text-[11px] text-[var(--muted)]">({HARDWARE_CATEGORY_LABELS[dev.category]})</span>
					</div>
					<div className="hw-device-path-line">
						<span className="inline-flex items-center gap-1">
							<Folder size={11} className="text-[var(--muted)] shrink-0" />
							<span>{dev.hotFolderPath}</span>
						</span>
						<span>•</span>
						<span>{HARDWARE_PROTOCOL_LABELS[dev.protocol]}</span>
						{dev.latencyMs !== null && (
							<>
								<span>•</span>
								<span className="text-emerald-600 font-semibold">{dev.latencyMs} мс</span>
							</>
						)}
					</div>
				</div>
			</div>

			<div className="hw-device-header-right">
				<button
					type="button"
					className={`hw-btn-test-connection ${dev.status}`}
					onClick={onTestConnection}
					title="Проверить связь с аппаратом"
				>
					<RefreshCw size={13} className={isTesting ? "animate-spin" : ""} />
					{statusLabel}
				</button>

				<button
					type="button"
					className="hw-btn-compact"
					onClick={onSimulateScan}
					title="Сгенерировать тестовый снимок в карту пациента"
				>
					<Camera size={13} />
					Тест снимка
				</button>

				<button
					type="button"
					className="hw-btn-compact"
					aria-label={isExpanded ? "Свернуть настройки" : "Развернуть настройки"}
					onClick={(e) => {
						e.stopPropagation();
						onToggleExpand();
					}}
				>
					{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
				</button>
			</div>
		</div>
	);
};
