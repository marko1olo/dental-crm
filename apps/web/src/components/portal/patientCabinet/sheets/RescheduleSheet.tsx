import type React from "react";
import { useState } from "react";
import { Calendar, Send, X } from "lucide-react";
import type { PatientAppointment } from "../patientCabinetEngine";

export interface RescheduleSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly appointment: PatientAppointment | null;
	readonly onSubmit: (request: {
		appointmentId: string;
		newDate: string;
		newTime: string;
		reason: string;
	}) => void;
}

export const RescheduleSheet: React.FC<RescheduleSheetProps> = ({
	isOpen,
	onClose,
	appointment,
	onSubmit,
}) => {
	const [newDate, setNewDate] = useState("");
	const [newTime, setNewTime] = useState("");
	const [reason, setReason] = useState("");

	if (!isOpen || !appointment) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSubmit({
			appointmentId: appointment.id,
			newDate,
			newTime,
			reason,
		});
		onClose();
	};

	return (
		<div
			className="pc-sheet-overlay"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Запрос на перенос записи"
		>
			<div
				className="pc-sheet-window"
				onClick={(e) => e.stopPropagation()}
				style={{ maxWidth: "520px" }}
			>
				{/* Top Drag Handle */}
				<div className="pc-sheet-handle-bar">
					<div className="pc-sheet-handle" />
				</div>

				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<Calendar size={20} style={{ color: "var(--pc-primary)" }} />
						<h3 style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 800, color: "var(--pc-text-main)" }}>
							Запрос на перенос записи
						</h3>
					</div>
					<button
						type="button"
						className="pc-close-btn"
						onClick={onClose}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<div style={{ backgroundColor: "var(--pc-surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--pc-border)" }}>
					<div style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)" }}>Текущая запись:</div>
					<strong style={{ fontSize: "0.9375rem", display: "block", marginTop: "2px", color: "var(--pc-text-main)" }}>
						{appointment.titleRu}
					</strong>
					<div style={{ fontSize: "0.8125rem", color: "var(--pc-text-muted)", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
						<Calendar size={13} style={{ color: "var(--pc-primary)" }} />
						<span>{appointment.dateIso} в {appointment.timeRu} &bull; Врач: {appointment.doctorName} ({appointment.roomNumber})</span>
					</div>
				</div>

				<form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
					<div>
						<label htmlFor="reschedule-date" style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "4px" }}>
							Желаемая дата:
						</label>
						<input
							id="reschedule-date"
							type="date"
							value={newDate}
							onChange={(e) => setNewDate(e.target.value)}
							required
							style={{
								width: "100%",
								minHeight: "44px",
								borderRadius: "var(--pc-radius-sm)",
								border: "1px solid var(--pc-border)",
								background: "var(--pc-surface)",
								color: "var(--pc-text-main)",
								padding: "8px 12px",
								fontSize: "0.875rem",
								boxSizing: "border-box",
							}}
						/>
					</div>

					<div>
						<label htmlFor="reschedule-time" style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "4px" }}>
							Желаемое время:
						</label>
						<input
							id="reschedule-time"
							type="time"
							value={newTime}
							onChange={(e) => setNewTime(e.target.value)}
							style={{
								width: "100%",
								minHeight: "44px",
								borderRadius: "var(--pc-radius-sm)",
								border: "1px solid var(--pc-border)",
								background: "var(--pc-surface)",
								color: "var(--pc-text-main)",
								padding: "8px 12px",
								fontSize: "0.875rem",
								boxSizing: "border-box",
							}}
						/>
					</div>

					<div>
						<label htmlFor="reschedule-reason" style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--pc-text-muted)", display: "block", marginBottom: "4px" }}>
							Причина переноса или пожелания:
						</label>
						<textarea
							id="reschedule-reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							rows={3}
							placeholder="Например: задержка на работе, командировка"
							style={{
								width: "100%",
								borderRadius: "var(--pc-radius-sm)",
								border: "1px solid var(--pc-border)",
								background: "var(--pc-surface)",
								color: "var(--pc-text-main)",
								padding: "8px 12px",
								fontSize: "0.875rem",
								resize: "vertical",
								boxSizing: "border-box",
							}}
						/>
					</div>

					<div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
						<button
							type="button"
							className="pc-btn-secondary"
							onClick={onClose}
							style={{ flex: 1, minHeight: "44px" }}
						>
							Отмена
						</button>
						<button
							type="submit"
							className="pc-btn-primary"
							style={{ flex: 2, minHeight: "44px" }}
						>
							<Send size={15} />
							<span>Отправить администратору</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
