/**
 * OmnichannelQuickBookingDrawer.tsx — Шторка быстрой записи на приём и перехода в сетку расписания.
 * Строго <= 120 строк по Мандату 8b.
 */

import React, { useState } from "react";
import { Calendar, Check, ExternalLink, X } from "lucide-react";
import type { PatientOmnichannelContact } from "../types.js";

export interface OmnichannelQuickBookingDrawerProps {
	readonly contact: PatientOmnichannelContact;
	readonly onClose: () => void;
	readonly onApplySlotToChat: (text: string) => void;
}

export const OmnichannelQuickBookingDrawer: React.FC<OmnichannelQuickBookingDrawerProps> = ({
	contact,
	onClose,
	onApplySlotToChat,
}) => {
	const [doctor, setDoctor] = useState("Д-р Соколов А.В. (Терапия)");
	const [date, setDate] = useState("Завтра, 27 октября");
	const [slot, setSlot] = useState("14:00");

	const handleConfirmSlot = () => {
		onApplySlotToChat(`Запись подтверждена: ${date} в ${slot} к врачу ${doctor}. Ждём вас!`);
		onClose();
	};

	const handleOpenScheduleGrid = () => {
		if (typeof window !== "undefined") {
			const bookingDetail = {
				patientId: contact.id,
				patientName: contact.fullName,
				phone: contact.phone,
				preferredSlot: slot,
			};
			window.dispatchEvent(new CustomEvent("dente-open-quick-booking", { detail: bookingDetail }));
			window.dispatchEvent(new CustomEvent("dente-quick-book-slot", { detail: bookingDetail }));
		}
		onClose();
	};

	return (
		<div className="hub-quick-booking-drawer">
			<div className="hub-quick-booking-header">
				<h4 className="hub-quick-booking-title">Быстрая запись на приём</h4>
				<button type="button" className="omnichannel-modal-close cursor-pointer" onClick={onClose} aria-label="Закрыть">
					<X size={16} />
				</button>
			</div>
			<div className="hub-quick-booking-body">
				<label className="text-xs font-semibold text-muted">Врач-специалист:</label>
				<select className="hub-channel-select w-full" value={doctor} onChange={(e) => setDoctor(e.target.value)}>
					<option value="Д-р Соколов А.В. (Терапия)">Д-р Соколов А.В. (Терапия)</option>
					<option value="Д-р Воронова Е.Н. (Ортопедия)">Д-р Воронова Е.Н. (Ортопедия)</option>
					<option value="Д-р Смирнов К.И. (Хирургия)">Д-р Смирнов К.И. (Хирургия)</option>
				</select>

				<label className="text-xs font-semibold text-muted">Дата приёма:</label>
				<div className="flex gap-2">
					{["Сегодня", "Завтра, 27 октября", "28 октября"].map((d) => (
						<button
							key={d}
							type="button"
							className={`hub-filter-btn flex-1 cursor-pointer ${date === d ? "active" : ""}`}
							onClick={() => setDate(d)}
						>
							{d}
						</button>
					))}
				</div>

				<label className="text-xs font-semibold text-muted">Свободный слот:</label>
				<div className="hub-quick-booking-slots-grid">
					{["10:00", "11:30", "14:00", "15:30", "17:00", "18:30"].map((s) => (
						<button
							key={s}
							type="button"
							className={`hub-quick-booking-slot-btn ${slot === s ? "selected" : ""}`}
							onClick={() => setSlot(s)}
						>
							{s}
						</button>
					))}
				</div>
			</div>
			<div className="hub-quick-booking-footer flex items-center justify-between gap-2">
				<button
					type="button"
					className="hub-btn-send cursor-pointer flex-1"
					onClick={handleConfirmSlot}
				>
					<Check size={15} /> В чат
				</button>
				<button
					type="button"
					className="omnichannel-btn-secondary min-h-[44px] px-3 cursor-pointer inline-flex items-center gap-1.5"
					onClick={handleOpenScheduleGrid}
					title="Открыть форму в сетке расписания"
				>
					<ExternalLink size={14} /> В расписание
				</button>
			</div>
		</div>
	);
};
