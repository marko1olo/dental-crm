import type { BactericidalDeviceType } from "@dental/shared";
import React from "react";

export interface BactericidalAddEquipmentFormFieldsProps {
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
}

export function BactericidalAddEquipmentFormFields({
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
}: BactericidalAddEquipmentFormFieldsProps) {
	return (
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
					style={{ minHeight: "44px" }}
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
						style={{ minHeight: "44px" }}
					/>
				</div>

				<div className="sanpin-form-group">
					<label className="sanpin-form-label">Тип облучателя</label>
					<select
						value={newDeviceType}
						onChange={(e) => setNewDeviceType(e.target.value as BactericidalDeviceType)}
						className="sanpin-select"
						style={{ minHeight: "44px" }}
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
						style={{ minHeight: "44px" }}
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
						style={{ minHeight: "44px" }}
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
					style={{ minHeight: "44px" }}
				/>
				<span className="sanpin-form-hint">Стандарт для безозоновых ламп Philips TUV / Osram: 8000-9000 часов</span>
			</div>
		</div>
	);
}
