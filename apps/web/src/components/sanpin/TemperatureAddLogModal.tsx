import type { TemperatureMeasurementPeriod } from "@dental/shared";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import React from "react";

export interface TemperatureAddLogModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly equipments: any[];
	readonly logEquipId: string;
	readonly setLogEquipId: (id: string) => void;
	readonly logDate: string;
	readonly setLogDate: (d: string) => void;
	readonly logPeriod: TemperatureMeasurementPeriod;
	readonly setLogPeriod: (p: TemperatureMeasurementPeriod) => void;
	readonly logTemp: number;
	readonly setLogTemp: (t: number) => void;
	readonly logHumidity: number | undefined;
	readonly setLogHumidity: (h: number | undefined) => void;
	readonly liveEval: {
		isWithinNorm: boolean;
		deviationMessage: string | null;
	};
	readonly logCorrectiveAction: string;
	readonly setLogCorrectiveAction: (a: string) => void;
	readonly onSubmit: (e: React.FormEvent) => void;
	readonly submitting: boolean;
}

export function TemperatureAddLogModal({
	isOpen,
	onClose,
	equipments,
	logEquipId,
	setLogEquipId,
	logDate,
	setLogDate,
	logPeriod,
	setLogPeriod,
	logTemp,
	setLogTemp,
	logHumidity,
	setLogHumidity,
	liveEval,
	logCorrectiveAction,
	setLogCorrectiveAction,
	onSubmit,
	submitting,
}: TemperatureAddLogModalProps) {
	if (!isOpen) return null;

	return (
		<div className="sanpin-modal-overlay">
			<div className="sanpin-modal">
				<div className="sanpin-modal-header">
					<h3>Фиксация замера температуры и влажности (Приказ 706н)</h3>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							color: "var(--muted)",
						}}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>
				<form onSubmit={onSubmit}>
					<div className="sanpin-modal-body">
						<div className="sanpin-form-group">
							<label className="sanpin-form-label">Объект контроля</label>
							<select
								required
								value={logEquipId}
								onChange={(e) => setLogEquipId(e.target.value)}
								className="sanpin-select"
							>
								{equipments.map((eq) => (
									<option key={eq.id} value={eq.id}>
										{eq.name} ({eq.targetTempMinCelsius}°C .. {eq.targetTempMaxCelsius}°C)
									</option>
								))}
							</select>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Дата замера</label>
								<input
									type="date"
									required
									value={logDate}
									onChange={(e) => setLogDate(e.target.value)}
									className="sanpin-input"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Период замера</label>
								<select
									value={logPeriod}
									onChange={(e) => setLogPeriod(e.target.value as TemperatureMeasurementPeriod)}
									className="sanpin-select"
								>
									<option value="morning">Утренний замер (09:00)</option>
									<option value="evening">Вечерний замер (18:00)</option>
								</select>
							</div>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Температура по термометру (°C)</label>
								<input
									type="number"
									step="0.1"
									required
									value={logTemp}
									onChange={(e) => setLogTemp(parseFloat(e.target.value) || 0)}
									className="sanpin-input"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Относительная влажность (%)</label>
								<input
									type="number"
									step="0.1"
									placeholder="Например: 45"
									value={logHumidity || ""}
									onChange={(e) => setLogHumidity(e.target.value ? parseFloat(e.target.value) : undefined)}
									className="sanpin-input"
								/>
							</div>
						</div>

						{/* Live status check */}
						<div
							style={{
								padding: "0.75rem",
								borderRadius: "0.375rem",
								background: liveEval.isWithinNorm ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
								border: `1px solid ${liveEval.isWithinNorm ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
								display: "flex",
								alignItems: "flex-start",
								gap: "0.5rem",
							}}
						>
							{liveEval.isWithinNorm ? (
								<CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0, marginTop: "2px" }} />
							) : (
								<AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: "2px" }} />
							)}
							<div style={{ fontSize: "0.8rem" }}>
								<div style={{ fontWeight: 600, color: liveEval.isWithinNorm ? "#059669" : "#dc2626" }}>
									{liveEval.isWithinNorm
										? "Показатели соответствуют требованиям Приказа 706н"
										: "ОТКЛОНЕНИЕ ОТ НОРМЫ ХРАНЕНИЯ ЛС!"}
								</div>
								{liveEval.deviationMessage && (
									<div style={{ marginTop: "0.25rem", color: "#dc2626" }}>
										{liveEval.deviationMessage}
									</div>
								)}
							</div>
						</div>

						{!liveEval.isWithinNorm && (
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Причина отклонения и принятые меры</label>
								<input
									type="text"
									required
									value={logCorrectiveAction}
									onChange={(e) => setLogCorrectiveAction(e.target.value)}
									className="sanpin-input"
									placeholder="Например: Препараты временно перемещены в резервный холодильник Pozis №2"
								/>
							</div>
						)}
					</div>
					<div className="sanpin-modal-footer">
						<button type="button" onClick={onClose} className="sanpin-btn sanpin-btn-secondary">
							Отмена
						</button>
						<button type="submit" aria-busy={submitting} className="sanpin-btn sanpin-btn-primary">
							Зафиксировать замер
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
