import type { TemperatureEquipmentType } from "@dental/shared";
import { X } from "lucide-react";
import React from "react";

export interface TemperatureAddEquipmentModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly equipType: TemperatureEquipmentType;
	readonly setEquipType: (t: TemperatureEquipmentType) => void;
	readonly equipName: string;
	readonly setEquipName: (name: string) => void;
	readonly equipLocation: string;
	readonly setEquipLocation: (loc: string) => void;
	readonly meterName: string;
	readonly setMeterName: (name: string) => void;
	readonly meterSerial: string;
	readonly setMeterSerial: (s: string) => void;
	readonly targetMinTemp: number;
	readonly setTargetMinTemp: (t: number) => void;
	readonly targetMaxTemp: number;
	readonly setTargetMaxTemp: (t: number) => void;
	readonly setTargetMinHumidity: (h: number | undefined) => void;
	readonly setTargetMaxHumidity: (h: number | undefined) => void;
	readonly onSubmit: (e: React.FormEvent) => void;
	readonly submitting: boolean;
}

export function TemperatureAddEquipmentModal({
	isOpen,
	onClose,
	equipType,
	setEquipType,
	equipName,
	setEquipName,
	equipLocation,
	setEquipLocation,
	meterName,
	setMeterName,
	meterSerial,
	setMeterSerial,
	targetMinTemp,
	setTargetMinTemp,
	targetMaxTemp,
	setTargetMaxTemp,
	setTargetMinHumidity,
	setTargetMaxHumidity,
	onSubmit,
	submitting,
}: TemperatureAddEquipmentModalProps) {
	if (!isOpen) return null;

	return (
		<div className="sanpin-modal-overlay">
			<div className="sanpin-modal">
				<div className="sanpin-modal-header">
					<h3>Регистрация холодильника / зоны хранения ЛС</h3>
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
							<label className="sanpin-form-label">Тип объекта</label>
							<select
								value={equipType}
								onChange={(e) => {
									const t = e.target.value as TemperatureEquipmentType;
									setEquipType(t);
									if (t === "refrigerator_cold") {
										setTargetMinTemp(2.0);
										setTargetMaxTemp(8.0);
										setEquipName("Фармацевтический холодильник Pozis ХФ-250");
									} else if (t === "storage_room") {
										setTargetMinTemp(15.0);
										setTargetMaxTemp(25.0);
										setTargetMinHumidity(30);
										setTargetMaxHumidity(65);
										setEquipName("Комната хранения лекарственных препаратов");
									} else if (t === "refrigerator_cool") {
										setTargetMinTemp(8.0);
										setTargetMaxTemp(15.0);
										setEquipName("Прохладный шкаф для анестетиков");
									}
								}}
								className="sanpin-select"
							>
								<option value="refrigerator_cold">Холодильник фармацевтический (+2..+8 °C)</option>
								<option value="storage_room">Помещение хранения ЛС (+15..+25 °C, влажность 30..65%)</option>
								<option value="refrigerator_cool">Шкаф/холодильник прохладного хранения (+8..+15 °C)</option>
								<option value="freezer">Морозильник (&lt; -18 °C)</option>
							</select>
						</div>

						<div className="sanpin-form-group">
							<label className="sanpin-form-label">Наименование объекта</label>
							<input
								type="text"
								required
								value={equipName}
								onChange={(e) => setEquipName(e.target.value)}
								className="sanpin-input"
							/>
						</div>

						<div className="sanpin-form-group">
							<label className="sanpin-form-label">Место установки (кабинет)</label>
							<input
								type="text"
								required
								value={equipLocation}
								onChange={(e) => setEquipLocation(e.target.value)}
								className="sanpin-input"
							/>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Марка прибора учета (термометра)</label>
								<input
									type="text"
									required
									value={meterName}
									onChange={(e) => setMeterName(e.target.value)}
									className="sanpin-input"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Заводской номер прибора</label>
								<input
									type="text"
									value={meterSerial}
									onChange={(e) => setMeterSerial(e.target.value)}
									className="sanpin-input"
								/>
							</div>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Минимальная T° (°C)</label>
								<input
									type="number"
									step="0.1"
									required
									value={targetMinTemp}
									onChange={(e) => setTargetMinTemp(parseFloat(e.target.value) || 0)}
									className="sanpin-input"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Максимальная T° (°C)</label>
								<input
									type="number"
									step="0.1"
									required
									value={targetMaxTemp}
									onChange={(e) => setTargetMaxTemp(parseFloat(e.target.value) || 0)}
									className="sanpin-input"
								/>
							</div>
						</div>
					</div>
					<div className="sanpin-modal-footer">
						<button type="button" onClick={onClose} className="sanpin-btn sanpin-btn-secondary">
							Отмена
						</button>
						<button type="submit" aria-busy={submitting} className="sanpin-btn sanpin-btn-primary">
							Зарегистрировать
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
