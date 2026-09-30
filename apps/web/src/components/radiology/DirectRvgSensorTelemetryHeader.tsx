import type React from "react";
import { Camera, HardDrive, ShieldCheck, UploadCloud, X, Zap } from "lucide-react";
import type { SensorCaptureStatus } from "./directRvgTypes";

export interface DirectRvgSensorItem {
	id: string;
	name: string;
	resolution: string;
	pixelSpacing: number;
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
	readonly radiationDoseText: string;
	readonly onTriggerCapture: () => void;
	readonly uploadAction?: React.ReactNode;
	readonly onUploadClick?: () => void;
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
							className="bg-transparent text-slate-200 border-none outline-none font-sans text-xs cursor-pointer max-w-[180px] truncate"
							data-testid="rvg-sensor-device-select"
						>
							{availableSensors.map((sensor) => (
								<option key={sensor.id} value={sensor.id} className="bg-slate-900 text-slate-100">
									{sensor.name} ({sensor.resolution})
								</option>
							))}
						</select>
					</div>

					<div className="rvg-telemetry-chip" title="Эффективная безопасная лучевая нагрузка">
						<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
						<span>{radiationDoseText}</span>
					</div>

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
