import React from "react";
import { Camera, CheckCircle2, HardDrive, UploadCloud, X, Zap } from "lucide-react";
import type { SensorCaptureStatus } from "./directRvgTypes";

export interface DirectRvgSensorItem {
	id: string;
	name: string;
	resolution: string;
	pixelSpacing: number;
	brandName?: string | undefined;
}

export interface DirectRvgSensorTelemetryHeaderProps {
	readonly modalId?: string;
	readonly patientName?: string;
	readonly patientCardNumber?: string;
	readonly doctorName?: string;
	readonly onClose?: () => void;
	readonly sensorStatus: SensorCaptureStatus;
	readonly acquisitionProgress: number;
	readonly selectedSensorModel: string;
	readonly onSelectSensorModel: (modelId: string) => void;
	readonly availableSensors: DirectRvgSensorItem[];
	readonly radiationDoseText?: string;
	readonly onTriggerCapture: () => void;
	readonly uploadAction?: React.ReactNode;
	readonly onUploadClick?: () => void;
	readonly onAutoDetectSensor?: (() => void) | undefined;
	readonly onTestSensorConnection?: (() => void) | undefined;
	readonly isDetectingSensor?: boolean | undefined;
	readonly sensorStatusMessage?: string | undefined;
}

/**
 * DirectRvgSensorTelemetryHeader
 *
 * Compact Apple HIG telemetry and control header for RVG intraoral sensor capture.
 * Displays:
 * - Patient / Doctor metadata
 * - Quiet equipment status pill: "Vatech EzSensor — Датчик готов (Auto-Trigger)"
 * - Direct capture trigger and disk upload buttons
 *
 * Governed by Mandate 8e (Doctor Autonomy) and Mandate 8zd (Rebuild Rotten Seeds Law).
 */
export const DirectRvgSensorTelemetryHeader: React.FC<DirectRvgSensorTelemetryHeaderProps> = ({
	modalId,
	patientName,
	patientCardNumber,
	doctorName,
	onClose,
	sensorStatus,
	acquisitionProgress,
	selectedSensorModel,
	onSelectSensorModel,
	availableSensors,
	onTriggerCapture,
	uploadAction,
	onUploadClick,
	onAutoDetectSensor,
	onTestSensorConnection,
	isDetectingSensor,
	sensorStatusMessage,
}) => {
	const currentSensor = availableSensors.find((s) => s.id === selectedSensorModel) || availableSensors[0];
	const sensorDisplayName = currentSensor?.name ? (currentSensor.name.split("(")[0]?.trim() || "Vatech EzSensor") : "Vatech EzSensor";
	const formattedCard = patientCardNumber
		? (patientCardNumber.startsWith("043/") || patientCardNumber.startsWith("043/у-")
			? `ЭМК №${patientCardNumber.replace(/^043\/[уy]-?/, "")}`
			: `ЭМК №${patientCardNumber}`)
		: "—";

	return (
		<div className="rvg-capture-header">
			{/* Left: Modality Title & Patient Meta */}
			<div className="rvg-header-title-group">
				<div className="rvg-sensor-icon-box">
					<Camera className="w-5 h-5 text-teal-500 dark:text-teal-400" />
				</div>
				<div className="rvg-header-titles">
					<h2 id={modalId ? `${modalId}-title` : undefined} className="rvg-header-title">
						<span>Прицельный снимок</span>
						<span
							className="rvg-badge-autotrigger"
							title="Ожидание снимка (Hot Folder / Автоподхват) · Auto-Trigger / USB · Hot Folder / TWAIN (Бесконфликтно)"
							data-testid="rvg-non-conflicting-badge"
						>
							Автозахват с датчика визиографа (USB)
						</span>
					</h2>
					<p
						className="rvg-header-subtitle"
						title={`${patientName ?? "Пациент"} · ${formattedCard} · Врач: ${doctorName ?? ""}`}
					>
						{patientName ?? "Пациент"} · {formattedCard} · Врач: {doctorName ?? "—"}
					</p>
				</div>
			</div>

			{/* Center: Quiet Equipment Telemetry Banner */}
			<div
				className={`rvg-sensor-status-banner rvg-status-${sensorStatus}`}
				data-testid="rvg-sensor-status-banner"
			>
				<div
					className="rvg-sensor-status-state"
					data-testid="rvg-sensor-health-chip"
					title={sensorStatusMessage || "Статус датчика"}
				>
					<div className="rvg-status-indicator-dot" />
					<span className="rvg-status-badge">
						{availableSensors.length > 1 ? "" : `${sensorDisplayName} — `}
						{sensorStatus === "ready" && (sensorStatusMessage || "Датчик готов (Auto-Trigger)")}
						{sensorStatus === "acquiring" && `Получение данных (${acquisitionProgress}%)`}
						{sensorStatus === "captured" && "Кадр получен"}
					</span>
				</div>

				{/* Non-conflicting coexistence hint */}
				<div
					className="text-[11px] text-teal-600/90 dark:text-teal-400/90 font-medium px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/20 max-w-[280px] truncate hidden sm:block"
					title="Работает параллельно с ПО оборудования без конфликта за USB"
					data-testid="rvg-coexistence-hint"
				>
					Параллельно с EzDent-i / Romexis (без конфликта за USB)
				</div>

				{/* Discreet sensor model select dropdown */}
				{availableSensors.length > 1 && (
					<div className="rvg-telemetry-chip" title="Модель активного датчика">
						<HardDrive className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400 shrink-0" />
						<select
							value={selectedSensorModel}
							onChange={(e) => onSelectSensorModel(e.target.value)}
							className="bg-transparent text-[var(--ink,#e2e8f0)] border-none outline-none font-sans text-xs cursor-pointer max-w-[150px] truncate"
							data-testid="rvg-sensor-device-select"
							title="Выбор модели датчика"
						>
							{availableSensors.map((sensor) => (
								<option key={sensor.id} value={sensor.id} className="bg-[var(--paper,#0f172a)] text-[var(--ink,#ffffff)]">
									{sensor.name}
								</option>
							))}
						</select>
					</div>
				)}

				{/* Discreet Hardware diagnostics actions */}
				<div className="rvg-diagnostics-actions">
					{onAutoDetectSensor && (
						<button
							type="button"
							onClick={onAutoDetectSensor}
							disabled={isDetectingSensor}
							className="rvg-chip-btn"
							data-testid="btn-rvg-auto-detect-sensor"
							title="Автоматический поиск подключенного USB/IP датчика"
						>
							{isDetectingSensor ? "Поиск..." : "Авто-детект сенсора"}
						</button>
					)}
					{onTestSensorConnection && (
						<button
							type="button"
							onClick={onTestSensorConnection}
							className="rvg-chip-btn"
							data-testid="btn-rvg-test-connection"
							title="Проверить отклик и калибровку датчика"
						>
							Проверить связь
						</button>
					)}
				</div>
			</div>

			{/* Right: Actions (Trigger, Upload, Close) */}
			<div className="rvg-header-actions">
				{/* Hardware Capture Trigger Button */}
				<button
					type="button"
					onClick={onTriggerCapture}
					disabled={sensorStatus === "acquiring"}
					className="rvg-trigger-btn"
					data-testid="rvg-trigger-exposure-btn"
					title={
						sensorStatus === "acquiring"
							? "Идет передача кадра с датчика..."
							: "Мгновенный захват с датчика (Space)"
					}
				>
					<Zap className="w-3.5 h-3.5 fill-current" />
					<span>
						{sensorStatus === "acquiring" ? "Экспонирование..." : "Захват (Space)"}
					</span>
				</button>

				{/* Disk Upload Button */}
				{uploadAction ?? (
					<button
						type="button"
						onClick={onUploadClick}
						className="rvg-trigger-btn rvg-trigger-btn-secondary"
						data-testid="rvg-upload-file-btn"
						title="Загрузить снимок с диска (DICOM, TIFF, PNG, JPG)"
					>
						<UploadCloud className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300" />
						<span>Загрузить</span>
					</button>
				)}

				{/* Close Button */}
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="rvg-close-btn"
						aria-label="Закрыть окно захвата"
						data-testid="rvg-modal-close-btn"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
};

export default DirectRvgSensorTelemetryHeader;
