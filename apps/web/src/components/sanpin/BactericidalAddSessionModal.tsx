import type { BactericidalOperatingMode } from "@dental/shared";
import { X, Zap } from "lucide-react";
import React from "react";

export interface BactericidalAddSessionModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly equipments: any[];
	readonly logEquipId: string;
	readonly setLogEquipId: (id: string) => void;
	readonly logDate: string;
	readonly setLogDate: (d: string) => void;
	readonly logStartTime: string;
	readonly setLogStartTime: (t: string) => void;
	readonly logEndTime: string;
	readonly setLogEndTime: (t: string) => void;
	readonly logDurationMin: number;
	readonly setLogDurationMin: (m: number) => void;
	readonly logMode: BactericidalOperatingMode;
	readonly setLogMode: (m: BactericidalOperatingMode) => void;
	readonly logNotes: string;
	readonly setLogNotes: (n: string) => void;
	readonly onStartTimeChange: (val: string) => void;
	readonly onEndTimeChange: (val: string) => void;
	readonly onSetPresetDuration: (min: number) => void;
	readonly hoursPreview: {
		cur: number;
		addH: number;
		nextH: number;
		maxH: number;
		remH: number;
		pct: number;
	} | null;
	readonly onSubmit: (e: React.FormEvent) => void;
	readonly submitting: boolean;
}

export function BactericidalAddSessionModal({
	isOpen,
	onClose,
	equipments,
	logEquipId,
	setLogEquipId,
	logDate,
	setLogDate,
	logStartTime,
	setLogStartTime,
	logEndTime,
	setLogEndTime,
	logDurationMin,
	setLogDurationMin,
	logMode,
	setLogMode,
	logNotes,
	setLogNotes,
	onStartTimeChange,
	onEndTimeChange,
	onSetPresetDuration,
	hoursPreview,
	onSubmit,
	submitting,
}: BactericidalAddSessionModalProps) {
	if (!isOpen) return null;

	return (
		<div className="sanpin-modal-overlay">
			<div className="sanpin-modal">
				<div className="sanpin-modal-header">
					<h3>Фиксация сеанса работы бактерицидного облучателя</h3>
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
						<div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
							<button
								type="button"
								onClick={() => {
									onSetPresetDuration(30);
									setLogStartTime("07:30");
									setLogEndTime("08:00");
									setLogMode("pre_op_preparation");
									setLogNotes("Включение баклампы перед сменой (30 мин) — норма СанПиН 3.3686-21");
								}}
								className="sanpin-btn sanpin-btn-secondary"
								style={{
									minHeight: "44px",
									fontSize: "0.82rem",
									padding: "0.4rem 0.85rem",
									fontWeight: 700,
									color: "var(--teal, #0d9488)",
									borderColor: "var(--teal, #0d9488)",
									display: "inline-flex",
									alignItems: "center",
									gap: "0.35rem",
								}}
								data-testid="log-modal-prefill-30min-btn"
							>
								<Zap size={14} /> 30 мин перед сменой (норма СанПиН)
							</button>
						</div>

						<div className="sanpin-form-group">
							<label className="sanpin-form-label">Выберите облучатель / помещение</label>
							<select
								required
								value={logEquipId}
								onChange={(e) => setLogEquipId(e.target.value)}
								className="sanpin-select"
							>
								{equipments.map((e) => (
									<option key={e.id} value={e.id}>
										{e.roomName} — {e.deviceBrand} (Зав. №{e.serialNumber})
									</option>
								))}
							</select>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Дата сеанса</label>
								<input
									type="date"
									required
									value={logDate}
									onChange={(e) => setLogDate(e.target.value)}
									className="sanpin-input"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Режим обеззараживания</label>
								<select
									value={logMode}
									onChange={(e) => setLogMode(e.target.value as BactericidalOperatingMode)}
									className="sanpin-select"
								>
									<option value="continuous_presence">В присутствии людей (рабочая смена)</option>
									<option value="pre_op_preparation">Предоперационная подготовка (30-60 мин)</option>
									<option value="post_cleaning">После генеральной уборки</option>
									<option value="intermittent">Периодический режим</option>
								</select>
							</div>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Время включения</label>
								<input
									type="time"
									required
									value={logStartTime}
									onChange={(e) => onStartTimeChange(e.target.value)}
									className="sanpin-input"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Время выключения</label>
								<input
									type="time"
									required
									value={logEndTime}
									onChange={(e) => onEndTimeChange(e.target.value)}
									className="sanpin-input"
								/>
							</div>
						</div>

						<div className="sanpin-form-group">
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
								<label className="sanpin-form-label" style={{ margin: 0 }}>
									Длительность работы (минут)
								</label>
								<div style={{ display: "flex", gap: "0.25rem" }}>
									<button
										type="button"
										onClick={() => onSetPresetDuration(30)}
										className="sanpin-btn sanpin-btn-secondary"
										style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}
									>
										30м
									</button>
									<button
										type="button"
										onClick={() => onSetPresetDuration(60)}
										className="sanpin-btn sanpin-btn-secondary"
										style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}
									>
										1ч
									</button>
									<button
										type="button"
										onClick={() => onSetPresetDuration(120)}
										className="sanpin-btn sanpin-btn-secondary"
										style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}
									>
										2ч
									</button>
									<button
										type="button"
										onClick={() => onSetPresetDuration(360)}
										className="sanpin-btn sanpin-btn-secondary"
										style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", fontWeight: 700 }}
									>
										Смена 6ч
									</button>
								</div>
							</div>
							<input
								type="number"
								min={1}
								required
								value={logDurationMin}
								onChange={(e) => {
									const val = parseInt(e.target.value, 10) || 0;
									setLogDurationMin(val);
									const [rawSH = "", rawSM = ""] = logStartTime.split(":");
									const sH = Number(rawSH);
									const sM = Number(rawSM);
									if (!Number.isNaN(sH) && !Number.isNaN(sM)) {
										const totalEndMin = (sH * 60 + sM + val) % (24 * 60);
										const eH = Math.floor(totalEndMin / 60);
										const eM = totalEndMin % 60;
										setLogEndTime(`${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`);
									}
								}}
								className="sanpin-input"
							/>
							<span className="sanpin-form-hint">
								Эквивалентно {(logDurationMin / 60).toFixed(2)} часам наработки ламп
							</span>
						</div>

						{/* Компактный статус ресурса лампы */}
						{hoursPreview && (
							<div
								style={{
									padding: "0.5rem 0.75rem",
									borderRadius: "6px",
									background: "var(--paper-subtle, rgba(2,132,199,0.06))",
									border: "1px solid var(--glass-border)",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									fontSize: "0.825rem",
								}}
							>
								<span style={{ color: "var(--ink)" }}>
									Наработка: <strong>{hoursPreview.nextH} ч</strong> из {hoursPreview.maxH} ч (остаток {hoursPreview.remH} ч)
								</span>
								<span style={{ fontWeight: 600, color: hoursPreview.pct >= 90 ? "#dc2626" : "#10b981" }}>
									{hoursPreview.pct >= 100 ? "Замена ламп" : hoursPreview.pct >= 90 ? "Скоро замена" : "Ресурс в норме"}
								</span>
							</div>
						)}
					</div>
					<div className="sanpin-modal-footer">
						<button type="button" onClick={onClose} className="sanpin-btn sanpin-btn-secondary">
							Отмена
						</button>
						<button
							type="submit"
							aria-busy={submitting}
							style={{ opacity: submitting ? 0.7 : 1 }}
							className="sanpin-btn sanpin-btn-primary"
						>
							Зафиксировать сеанс
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
