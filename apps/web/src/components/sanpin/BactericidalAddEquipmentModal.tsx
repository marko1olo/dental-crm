import type { BactericidalDeviceType } from "@dental/shared";
import { ShieldCheck, X } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";

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

	const modalContent = (
		<div
			className="sanpin-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-label="Регистрация бактерицидного облучателя"
			onClick={onClose}
		>
			<div className="sanpin-modal" onClick={(e) => e.stopPropagation()}>
				<div className="sanpin-modal-header">
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<ShieldCheck size={20} color="var(--teal, #0d9488)" />
						<div>
							<h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
								Регистрация бактерицидного облучателя
							</h3>
							<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
								СанПиН 3.3686-21 • Паспорт установки и учет наработки часов
							</div>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							color: "var(--muted)",
							minHeight: "44px",
							minWidth: "44px",
						}}
						aria-label="Закрыть"
					>
						<X size={20} />
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
					<div className="sanpin-modal-footer">
						<button
							type="button"
							onClick={onClose}
							className="sanpin-btn sanpin-btn-secondary"
							style={{ minHeight: "44px" }}
						>
							Отмена
						</button>
						<button
							type="submit"
							aria-busy={submitting}
							style={{ opacity: submitting ? 0.7 : 1, minHeight: "44px" }}
							className="sanpin-btn sanpin-btn-primary"
						>
							Поставить на учет в журнале
						</button>
					</div>
				</form>
			</div>
		</div>
	);

	if (typeof document === "undefined") return null;
	return createPortal(modalContent, document.body);
}
