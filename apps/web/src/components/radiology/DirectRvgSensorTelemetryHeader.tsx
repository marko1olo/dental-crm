import type React from "react";
import { Activity, Camera, CheckCircle2, HardDrive, Scan, ShieldCheck, UploadCloud, X, Zap } from "lucide-react";
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
 * Dedicated telemetry and control header for RVG intraoral sensor capture.
 * Displays modal title, patient/doctor metadata, real-time sensor status (ready / acquiring / captured),
 * device model picker, calculated effective radiation dose telemetry, and hardware exposure triggers.
 *
 * Governed by Mandate 8b (<= 800 lines limit) and Mandate 8e (Doctor Autonomy).
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
	radiationDoseText,
	onTriggerCapture,
	uploadAction,
	onUploadClick,
	onAutoDetectSensor,
	onTestSensorConnection,
	isDetectingSensor,
	sensorStatusMessage,
}) => {
	return (
		<>
			{/* ─── MODAL HEADER ─── */}
			{onClose && (
				<div className="rvg-capture-header">
					<div className="rvg-header-title-group min-w-0 flex-1">
						<div className="rvg-sensor-icon-box">
							<Camera className="w-5 h-5 animate-pulse" />
						</div>
						<div className="rvg-header-titles min-w-0 flex-1">
							<h2 id={modalId ? `${modalId}-title` : undefined} className="rvg-header-title min-w-0">
								<span className="truncate">Зона радиовизиографии: прямой захват с датчика</span>
								<span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-normal shrink-0">
									Прямой TWAIN / USB
								</span>
							</h2>
							<p
								className="rvg-header-subtitle truncate"
								title={`${patientName ?? "Пациент"} · Карта: ${patientCardNumber ?? ""} · Врач: ${doctorName ?? ""}`}
							>
								{patientName} · Карта: {patientCardNumber} · Врач: {doctorName}
							</p>
						</div>
					</div>

					<div className="rvg-header-actions">
						<button
							type="button"
							onClick={onClose}
							className="rvg-close-btn"
							aria-label="Закрыть окно захвата"
							data-testid="rvg-modal-close-btn"
						>
							<X className="w-5 h-5" />
						</button>
					</div>
				</div>
			)}

			{/* ─── SENSOR STATUS BANNER ─── */}
			<div
				className={`rvg-sensor-status-banner rvg-status-${sensorStatus}`}
				data-testid="rvg-sensor-status-banner"
			>
				<div className="rvg-sensor-status-state">
					<div className="rvg-status-indicator-dot" />
					<span className="rvg-status-badge">
						{sensorStatus === "ready" && "Датчик готов / Ожидание экспозиции"}
						{sensorStatus === "acquiring" && `Получение данных (${acquisitionProgress}%)`}
						{sensorStatus === "captured" && "Снимок получен / Кадр в буфере"}
					</span>
				</div>

				{/* Telemetry & Device Selector */}
				<div className="rvg-sensor-telemetry">
					<div className="rvg-telemetry-chip">
						<HardDrive className="w-3.5 h-3.5 text-teal-400" />
						<select
							value={selectedSensorModel}
							onChange={(e) => onSelectSensorModel(e.target.value)}
							className="bg-transparent text-slate-200 border-none outline-none font-sans text-xs cursor-pointer max-w-[210px] truncate"
							data-testid="rvg-sensor-device-select"
							title="Выбор модели внутриротового визиографа"
						>
							{availableSensors.map((sensor) => (
								<option key={sensor.id} value={sensor.id} className="bg-slate-900 text-slate-100">
									{sensor.name} ({sensor.resolution} · {sensor.pixelSpacing} мм)
								</option>
							))}
						</select>
					</div>

					{/* Auto-detect connected sensor button */}
					{onAutoDetectSensor && (
						<button
							type="button"
							onClick={onAutoDetectSensor}
							disabled={isDetectingSensor}
							className="rvg-trigger-btn rvg-trigger-btn-secondary"
							data-testid="btn-rvg-auto-detect-sensor"
							title="Автоматическое определение подключенного USB / TWAIN датчика визиографа"
						>
							<Scan className={`w-3.5 h-3.5 text-teal-300 ${isDetectingSensor ? "animate-spin" : ""}`} />
							<span>{isDetectingSensor ? "Поиск..." : "Авто-детект сенсора"}</span>
						</button>
					)}

					{/* Connection diagnostic test button */}
					{onTestSensorConnection && (
						<button
							type="button"
							onClick={onTestSensorConnection}
							className="rvg-trigger-btn rvg-trigger-btn-secondary"
							data-testid="btn-rvg-test-connection"
							title="Проверить связь с датчиком и статус готовности (<20 мс)"
						>
							<Activity className="w-3.5 h-3.5 text-emerald-400" />
							<span>Проверить связь</span>
						</button>
					)}

					{/* Live Sensor Readiness Status Pill */}
					{sensorStatusMessage ? (
						<div className="rvg-telemetry-chip" title={sensorStatusMessage} data-testid="rvg-sensor-health-chip">
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
							<span className="truncate max-w-[230px]">{sensorStatusMessage}</span>
						</div>
					) : null}

					{radiationDoseText ? (
						<div className="rvg-telemetry-chip" title="Эффективная лучевая нагрузка">
							<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
							<span>{radiationDoseText}</span>
						</div>
					) : null}


					{/* Hardware RVG Exposure & Frame Capture Trigger */}
					<button
						type="button"
						onClick={onTriggerCapture}
						disabled={sensorStatus === "acquiring"}
						className="rvg-trigger-btn"
						data-testid="rvg-trigger-exposure-btn"
						title={
							sensorStatus === "acquiring"
								? "Идет захват и передача кадра с датчика визиографа..."
								: sensorStatus === "captured"
									? "Повторный захват кадра с визиографа (Space)"
									: "Запустить экспозицию и захват кадра с датчика (Space)"
						}
					>
						<Zap className="w-3.5 h-3.5 fill-current" />
						<span>
							{sensorStatus === "acquiring"
								? "Экспонирование..."
								: sensorStatus === "captured"
									? "Повторный захват (Space)"
									: "Захват с датчика (Space)"}
						</span>
					</button>

					{/* Direct File Upload from Disk Button (Mandate 8e: Doctor Autonomy) */}
					{uploadAction ?? (
						<button
							type="button"
							onClick={onUploadClick}
							className="rvg-trigger-btn rvg-trigger-btn-secondary"
							data-testid="rvg-upload-file-btn"
							title="Загрузить снимок с диска (DICOM, TIFF, PNG, JPG)"
						>
							<UploadCloud className="w-3.5 h-3.5 text-teal-300" />
							<span>Загрузить с диска</span>
						</button>
					)}
				</div>
			</div>
		</>
	);
};
