import type { BactericidalDeviceType } from "@dental/shared";
import { X } from "lucide-react";
import React from "react";

export interface BactericidalAddEquipmentModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly newRoomName: string;
	readonly setNewRoomName: (val: string) => void;
	readonly newRoomVolume: number;
	readonly setNewRoomVolume: (val: number) => void;
	readonly newDeviceBrand: string;
	readonly setNewDeviceBrand: (val: string) => void;
	readonly newSerialNumber: string;
	readonly setNewSerialNumber: (val: string) => void;
	readonly newDeviceType: BactericidalDeviceType;
	readonly setNewDeviceType: (val: BactericidalDeviceType) => void;
	readonly newMaxHours: number;
	readonly setNewMaxHours: (val: number) => void;
	readonly onSubmit: (e: React.FormEvent) => void;
	readonly submitting: boolean;
}

export function BactericidalAddEquipmentModal({
	isOpen,
	onClose,
	newRoomName,
	setNewRoomName,
	newRoomVolume,
	setNewRoomVolume,
	newDeviceBrand,
	setNewDeviceBrand,
	newSerialNumber,
	setNewSerialNumber,
	newDeviceType,
	setNewDeviceType,
	newMaxHours,
	setNewMaxHours,
	onSubmit,
	submitting,
}: BactericidalAddEquipmentModalProps) {
	if (!isOpen) return null;

	return (
		<div className="sanpin-modal-overlay">
			<div className="sanpin-modal">
				<div className="sanpin-modal-header">
					<h3>Регистрация бактерицидного облучателя / рециркулятора</h3>
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
							<label className="sanpin-form-label">Помещение / Кабинет</label>
							<input
								type="text"
								required
								value={newRoomName}
								onChange={(e) => setNewRoomName(e.target.value)}
								className="sanpin-input"
								placeholder="Кабинет хирургии / Стерилизационная"
							/>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Объем помещения (V, м³)</label>
								<input
									type="number"
									step="0.1"
									required
									value={newRoomVolume}
									onChange={(e) => setNewRoomVolume(parseFloat(e.target.value) || 0)}
									className="sanpin-input"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Тип облучателя</label>
								<select
									value={newDeviceType}
									onChange={(e) => setNewDeviceType(e.target.value as BactericidalDeviceType)}
									className="sanpin-select"
								>
									<option value="recirculator_closed">Рециркулятор закрытого типа (в присутствии людей)</option>
									<option value="irradiator_open">Облучатель открытого типа (только без людей)</option>
									<option value="combined">Комбинированный</option>
								</select>
							</div>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Марка / модель аппарата</label>
								<input
									type="text"
									required
									value={newDeviceBrand}
									onChange={(e) => setNewDeviceBrand(e.target.value)}
									className="sanpin-input"
									placeholder="Дезар-4 / Кронт / Сибэст"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Заводской номер</label>
								<input
									type="text"
									required
									value={newSerialNumber}
									onChange={(e) => setNewSerialNumber(e.target.value)}
									className="sanpin-input"
								/>
							</div>
						</div>

						<div className="sanpin-form-group">
							<label className="sanpin-form-label">Паспортный ресурс ламп (ч)</label>
							<input
								type="number"
								required
								value={newMaxHours}
								onChange={(e) => setNewMaxHours(parseInt(e.target.value) || 8000)}
								className="sanpin-input"
							/>
							<span className="sanpin-form-hint">Стандарт для безозоновых ламп Philips TUV / Osram: 8000-9000 часов</span>
						</div>
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
							Поставить на учет
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
