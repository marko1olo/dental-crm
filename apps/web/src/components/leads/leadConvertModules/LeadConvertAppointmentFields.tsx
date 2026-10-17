/**
 * DENTE Dental CRM — Leads Conversion Appointment Fields (Layer 4)
 * Mandate 8e & 8n: Solo Doctor Autonomy & Zero Dead-Ends, Mandate 8b (<= 120 lines)
 */

import React from "react";
import type { LeadConvertAppointmentFieldsProps } from "./leadConvertTypes";
import { LeadConvertStaffChairSelect } from "./LeadConvertStaffChairSelect";

export const LeadConvertAppointmentFields: React.FC<LeadConvertAppointmentFieldsProps> = ({
	staff, chairs, effectiveStaff, effectiveChairs, selectedDoctorId, setSelectedDoctorId,
	selectedChairId, setSelectedChairId, reason, setReason, comment, setComment,
	appointmentDate, setAppointmentDate, appointmentTime, setAppointmentTime, colBg, borderColor,
}) => {
	const inputStyle: React.CSSProperties = {
		padding: 10, borderRadius: 8, border: `1px solid ${borderColor}`, background: colBg,
		color: "var(--ink)", fontSize: 13,
	};

	return (
		<>
			<LeadConvertStaffChairSelect
				staff={staff} chairs={chairs} effectiveStaff={effectiveStaff}
				effectiveChairs={effectiveChairs} selectedDoctorId={selectedDoctorId}
				setSelectedDoctorId={setSelectedDoctorId} selectedChairId={selectedChairId}
				setSelectedChairId={setSelectedChairId} colBg={colBg} borderColor={borderColor}
			/>

			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				<label htmlFor="convert-lead-reason" style={{ fontSize: 13, color: "var(--muted)" }}>
					Причина приёма / первичная жалоба
				</label>
				<input
					id="convert-lead-reason" type="text" value={reason} onChange={(e) => setReason(e.target.value)}
					placeholder="Первичная консультация" style={inputStyle} data-testid="convert-lead-reason-input"
				/>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				<label htmlFor="convert-lead-comment" style={{ fontSize: 13, color: "var(--muted)" }}>
					Клинический комментарий / примечание
				</label>
				<textarea
					id="convert-lead-comment" value={comment} onChange={(e) => setComment(e.target.value)}
					placeholder="Анамнез, жалобы, пожелания пациента..." rows={2}
					style={{ ...inputStyle, resize: "vertical" }} data-testid="convert-lead-comment-input"
				/>
			</div>

			<div style={{ display: "flex", gap: 12 }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
					<label htmlFor="convert-lead-date" style={{ fontSize: 13, color: "var(--muted)" }}>Дата</label>
					<input id="convert-lead-date" type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} style={inputStyle} />
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
					<label htmlFor="convert-lead-time" style={{ fontSize: 13, color: "var(--muted)" }}>Время</label>
					<input id="convert-lead-time" type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} style={inputStyle} />
				</div>
			</div>
		</>
	);
};
