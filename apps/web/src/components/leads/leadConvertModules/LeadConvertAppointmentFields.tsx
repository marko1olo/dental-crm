/**
 * DENTE Dental CRM — Leads Conversion Appointment Fields (Layer 4)
 * Mandate 8e & 8n: Solo Doctor Autonomy & Zero Dead-Ends, Mandate 8b (<= 120 lines)
 */

import React from "react";
import {
	FALLBACK_DEFAULT_CHAIR,
	FALLBACK_SOLO_DOCTOR,
} from "../LeadsKanbanView";
import type { LeadConvertAppointmentFieldsProps } from "./leadConvertTypes";

const APPOINTMENT_TIME_SLOTS = [
	"09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
	"12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
	"15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
	"18:00", "18:30", "19:00",
];

export const LeadConvertAppointmentFields: React.FC<
	LeadConvertAppointmentFieldsProps
> = ({
	staff: _staff,
	chairs: _chairs,
	effectiveStaff,
	effectiveChairs,
	selectedDoctorId,
	setSelectedDoctorId,
	selectedChairId,
	setSelectedChairId,
	reason,
	setReason,
	comment,
	setComment,
	appointmentDate,
	setAppointmentDate,
	appointmentTime,
	setAppointmentTime,
	colBg,
	borderColor,
	inputStyle,
}) => {
	const defaultInputStyle: React.CSSProperties = {
		padding: "5px 8px",
		borderRadius: 6,
		border: `1px solid ${borderColor}`,
		background: colBg,
		color: "var(--ink)",
		fontSize: 12.5,
		outline: "none",
	};

	const effectiveInputStyle = inputStyle || defaultInputStyle;

	return (
		<>
			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<label
						htmlFor="convert-lead-doctor"
						style={{ fontSize: 11.5, color: "var(--muted)" }}
					>
						Врач
					</label>
					<select
						id="convert-lead-doctor"
						value={
							selectedDoctorId ||
							effectiveStaff[0]?.id ||
							FALLBACK_SOLO_DOCTOR.id
						}
						onChange={(e) => setSelectedDoctorId(e.target.value)}
						style={effectiveInputStyle}
					>
						{effectiveStaff.map((doc) => (
							<option key={doc.id} value={doc.id}>
								{doc.fullName || doc.name}
							</option>
						))}
					</select>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<label
						htmlFor="convert-lead-chair"
						style={{ fontSize: 11.5, color: "var(--muted)" }}
					>
						Кресло
					</label>
					<select
						id="convert-lead-chair"
						value={
							selectedChairId ||
							effectiveChairs[0]?.id ||
							FALLBACK_DEFAULT_CHAIR.id
						}
						onChange={(e) => setSelectedChairId(e.target.value)}
						style={effectiveInputStyle}
					>
						{effectiveChairs.map((ch) => (
							<option key={ch.id} value={ch.id}>
								{ch.name}
							</option>
						))}
					</select>
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1.2fr 0.8fr",
					gap: 6,
				}}
			>
				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<label
						htmlFor="convert-lead-date"
						style={{ fontSize: 11.5, color: "var(--muted)" }}
					>
						Дата приёма
					</label>
					<input
						id="convert-lead-date"
						type="date"
						value={appointmentDate}
						onChange={(e) => setAppointmentDate(e.target.value)}
						style={effectiveInputStyle}
					/>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<label
						htmlFor="convert-lead-time"
						style={{ fontSize: 11.5, color: "var(--muted)" }}
					>
						Время
					</label>
					<select
						id="convert-lead-time"
						value={appointmentTime}
						onChange={(e) => setAppointmentTime(e.target.value)}
						style={effectiveInputStyle}
					>
						{APPOINTMENT_TIME_SLOTS.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<label
						htmlFor="convert-lead-reason"
						style={{ fontSize: 11, color: "var(--muted)" }}
					>
						Причина приёма
					</label>
					<input
						id="convert-lead-reason"
						type="text"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Первичная консультация"
						style={effectiveInputStyle}
						data-testid="convert-lead-reason-input"
					/>
				</div>

				<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
					<label
						htmlFor="convert-lead-comment"
						style={{ fontSize: 11, color: "var(--muted)" }}
					>
						Клинический комментарий
					</label>
					<input
						id="convert-lead-comment"
						type="text"
						value={comment}
						onChange={(e) => setComment(e.target.value)}
						placeholder="Анамнез, жалобы..."
						style={effectiveInputStyle}
						data-testid="convert-lead-comment-input"
					/>
				</div>
			</div>
		</>
	);
};
