/**
 * DENTE Dental CRM — Leads Conversion Date & Time Select
 * Mandate 8b (<= 120 lines)
 */

import React from "react";

interface LeadConvertDateTimeSelectProps {
	appointmentDate: string;
	setAppointmentDate: (date: string) => void;
	appointmentTime: string;
	setAppointmentTime: (time: string) => void;
	inputStyle: React.CSSProperties;
}

export const LeadConvertDateTimeSelect: React.FC<LeadConvertDateTimeSelectProps> = ({
	appointmentDate,
	setAppointmentDate,
	appointmentTime,
	setAppointmentTime,
	inputStyle,
}) => {
	const colStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, flex: 1 };
	const labelStyle: React.CSSProperties = { fontSize: 13, color: "var(--muted)" };

	return (
		<div style={{ display: "flex", gap: 12 }}>
			<div style={colStyle}>
				<label htmlFor="convert-lead-date" style={labelStyle}>Дата</label>
				<input
					id="convert-lead-date"
					type="date"
					value={appointmentDate}
					onChange={(e) => setAppointmentDate(e.target.value)}
					style={inputStyle}
				/>
			</div>
			<div style={colStyle}>
				<label htmlFor="convert-lead-time" style={labelStyle}>Время</label>
				<input
					id="convert-lead-time"
					type="time"
					value={appointmentTime}
					onChange={(e) => setAppointmentTime(e.target.value)}
					style={inputStyle}
				/>
			</div>
		</div>
	);
};
