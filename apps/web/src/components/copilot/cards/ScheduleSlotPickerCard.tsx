import React, { useState, useMemo } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Stethoscope,
  User,
} from "lucide-react";
import type { ScheduleSlotOption, ScheduleSlotPickerCardProps } from "./types";
import { formatDateTime, formatTimeRange } from "../useCopilotFormat";

export const ScheduleSlotPickerCard: React.FC<ScheduleSlotPickerCardProps> = ({
	data,
	selectedSlotId,
	onSelectSlot,
	onBookSlot,
	onChangeDate,
}) => {
	const [selectedId, setSelectedId] = useState<string | undefined>(
		selectedSlotId || data.slots?.[0]?.id,
	);
	const [activeDate, setActiveDate] = useState<string>(data.date || "Сегодня");
	const [bookedStatus, setBookedStatus] = useState<boolean>(false);

	const availableDates = data.availableDates || [
		"Сегодня",
		"Завтра",
		"Послезавтра",
	];

	const handleSlotClick = (slot: ScheduleSlotOption) => {
		if (slot.isAvailable === false) return;
		setSelectedId(slot.id);
		setBookedStatus(false);
		onSelectSlot?.(slot);
	};

	const selectedSlot = useMemo(() => {
		return data.slots.find((s) => s.id === selectedId) || data.slots[0];
	}, [data.slots, selectedId]);

	const handleBook = () => {
		if (!selectedSlot) return;
		setBookedStatus(true);
		onBookSlot?.(selectedSlot);
	};

	const handleDateSelect = (d: string) => {
		setActiveDate(d);
		onChangeDate?.(d);
	};

	return (
		<div
			className="copilot-gen-card copilot-schedule-picker-card"
			data-testid="copilot-schedule-picker-card"
		>
			{/* Header with Doctor info */}
			<div className="copilot-sp-header">
				<div className="copilot-sp-doctor-info">
					<div className="copilot-sp-doctor-icon">
						<Stethoscope size={18} />
					</div>
					<div>
						<div className="copilot-sp-doctor-name">
							{data.doctorName || "Врач клиники"}
						</div>
						<div className="copilot-sp-doctor-meta">
							{data.doctorSpecialty && <span>{data.doctorSpecialty}</span>}
							{data.cabinet && (
								<span className="flex items-center gap-1">
									<MapPin size={11} />
									{data.cabinet}
								</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Date Selector Tabs */}
			<div className="copilot-sp-date-bar">
				{availableDates.map((d) => (
					<button
						key={d}
						type="button"
						onClick={() => handleDateSelect(d)}
						className={`copilot-sp-date-chip ${activeDate === d ? "active" : ""}`}
					>
						<span>{d}</span>
					</button>
				))}
			</div>

			{/* Interactive Slots Grid */}
			<div className="copilot-sp-slots-grid">
				{data.slots.map((slot) => {
					const isSelected = slot.id === selectedId;
					const isAvail = slot.isAvailable !== false;
					const label =
						slot.time || formatTimeRange(slot.startTime || "", slot.endTime);

					return (
						<button
							key={slot.id}
							type="button"
							disabled={!isAvail}
							onClick={() => handleSlotClick(slot)}
							className={`copilot-sp-slot-btn ${isSelected ? "selected" : ""}`}
							title={isAvail ? `Выбрать время ${label}` : "Слот уже занят"}
						>
							<span>{label}</span>
							<span className="copilot-sp-slot-duration">
								{slot.durationMinutes
									? `${slot.durationMinutes} мин`
									: "30 мин"}
							</span>
						</button>
					);
				})}
			</div>

			{/* 1-Click Booking Confirmation Bar */}
			{selectedSlot && (
				<div className="copilot-sp-booking-footer">
					<div className="copilot-sp-booking-info">
						<Clock size={14} className="inline mr-1.5" />
						<span>
							{activeDate}:{" "}
							<strong>{selectedSlot.time || selectedSlot.startTime}</strong> (
							{selectedSlot.cabinet || data.cabinet || "Кабинет 1"})
						</span>
					</div>

					<button
						type="button"
						onClick={handleBook}
						disabled={bookedStatus}
						className={`copilot-sp-book-btn ${bookedStatus ? "bg-[var(--green)]" : ""}`}
						title="Забронировать слот"
					>
						{bookedStatus ? (
							<>
								<CheckCircle2 size={15} />
								<span>Забронировано</span>
							</>
						) : (
							<>
								<Check size={15} />
								<span>Забронировать</span>
							</>
						)}
					</button>
				</div>
			)}
		</div>
	);
};

// ============================================================================
// 3. Prescription107Card COMPONENT
// ============================================================================

