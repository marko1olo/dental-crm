import React from "react";
import { Activity, CheckCircle2, Scan } from "lucide-react";
import { UNIVERSAL_SENSOR_CATALOG, type DentalSensorModel } from "../../radiology/sensorGateway/index.js";

interface Props {
	activeGatewaySensorId: string;
	isDetectingSensor: boolean;
	gatewayStatusMessage: string;
	selectedGatewaySensor?: DentalSensorModel;
	onSensorSelect: (id: string) => void;
	onAutoDetect: () => void;
	onTestHealth: () => void;
}

export const HardwareSensorGatewayCard: React.FC<Props> = ({
	activeGatewaySensorId,
	isDetectingSensor,
	gatewayStatusMessage,
	selectedGatewaySensor,
	onSensorSelect,
	onAutoDetect,
	onTestHealth,
}) => {
	return (
		<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] mb-4 space-y-3" data-testid="universal-sensor-gateway-card">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center font-bold">
						<Scan size={16} />
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)]">Мультивендорный шлюз визиографов (Universal Sensor Gateway)</h4>
						<p className="text-xs text-[var(--muted)]">Прямой аппаратный опрос USB VID/PID, TWAIN 2.x DSM и Hot Folder маршрутизатор для всех мировых брендов</p>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={onAutoDetect}
						disabled={isDetectingSensor}
						className="min-h-[32px] px-3 py-1 rounded-lg bg-[var(--teal,#0d9488)] hover:opacity-90 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
						data-testid="hw-btn-auto-detect-sensor"
						title="Автоматическое сканирование подключенных USB-датчиков и TWAIN DSM"
					>
						<Scan size={13} className={isDetectingSensor ? "animate-spin" : ""} />
						<span>{isDetectingSensor ? "Сканирование..." : "Авто-детект сенсора"}</span>
					</button>

					<button
						type="button"
						onClick={onTestHealth}
						className="min-h-[32px] px-3 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-[var(--paper-hover)]"
						data-testid="hw-btn-test-sensor-connection"
						title="Диагностический пинг сенсора (<20 мс)"
					>
						<Activity size={13} className="text-emerald-500" />
						<span>Проверить связь</span>
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
				<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1">
					<span className="text-[11px] font-bold text-[var(--muted)] block">Активная модель визиографа</span>
					<select
						value={activeGatewaySensorId}
						onChange={(e) => onSensorSelect(e.target.value)}
						className="w-full bg-transparent text-xs text-[var(--ink)] font-semibold border-none outline-none cursor-pointer"
						data-testid="hw-select-gateway-sensor"
					>
						{UNIVERSAL_SENSOR_CATALOG.map((sensor) => (
							<option key={sensor.id} value={sensor.id} className="bg-slate-900 text-slate-100">
								{sensor.brandName}: {sensor.name} ({sensor.resolution} · {sensor.pixelSpacing} мм)
							</option>
						))}
					</select>
				</div>

				<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1">
					<span className="text-[11px] font-bold text-[var(--muted)] block">Калибровка и параметры захвата</span>
					<div className="text-xs text-[var(--ink)] flex items-center justify-between">
						<span className="font-mono text-teal-600 dark:text-teal-400">
							{selectedGatewaySensor?.pixelSpacing ?? 0.035} мм/пикс · {selectedGatewaySensor?.bitDepth ?? 14}-bit
						</span>
						<span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold">
							{selectedGatewaySensor?.technology ?? "CMOS"}
						</span>
					</div>
				</div>

				<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] space-y-1">
					<span className="text-[11px] font-bold text-[var(--muted)] block">Статус готовности к снимкам</span>
					<div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5" data-testid="hw-sensor-gateway-status">
						<CheckCircle2 size={13} className="shrink-0" />
						<span className="truncate">{gatewayStatusMessage}</span>
					</div>
				</div>
			</div>
		</div>
	);
};
