/**
 * MobileCheckinAppointmentCard.tsx
 * (DOMAIN: PORTAL & SELF-CHECKIN KIOSK)
 *
 * Patient Appointment Card:
 * - Clear scheduled visit overview (Doctor, Time, Cabinet, Floor)
 * - Physiological norm status indicator
 * - Apple HIG card ergonomics with zero horizontal overflow
 */

import React, { memo } from "react";
import { Calendar, Clock, MapPin, User } from "lucide-react";

export interface MobileCheckinAppointmentCardProps {
	readonly patientName: string;
	readonly appointmentTime: string;
	readonly doctorName: string;
	readonly cabinetName?: string | undefined;
	readonly queueTicket?: string | undefined;
	readonly statusBadge?: string | undefined;
}

export const MobileCheckinAppointmentCard: React.FC<MobileCheckinAppointmentCardProps> = memo(({
	patientName,
	appointmentTime,
	doctorName,
	cabinetName,
	queueTicket,
	statusBadge,
}) => {
	return (
		<div
			className="selfcheckin-appointment-card"
			style={{
				padding: "14px",
				borderRadius: "14px",
				border: "1px solid var(--line)",
				backgroundColor: "var(--paper-card, var(--paper))",
				marginBottom: "12px",
				display: "flex",
				flexDirection: "column",
				gap: "8px",
			}}
			data-testid="mobile-checkin-appointment-card"
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<User size={18} className="text-teal-600" />
					<strong style={{ fontSize: "15px", color: "var(--ink)" }}>
						{patientName || "Пациент клиники"}
					</strong>
				</div>
				{queueTicket && (
					<span
						style={{
							padding: "3px 8px",
							borderRadius: "8px",
							backgroundColor: "var(--teal-soft, rgba(13, 148, 136, 0.1))",
							color: "var(--teal)",
							fontWeight: 700,
							fontSize: "12px",
						}}
					>
						{queueTicket}
					</span>
				)}
			</div>

			<div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "13px", color: "var(--muted)" }}>
				{appointmentTime && (
					<span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
						<Clock size={14} />
						<span>{appointmentTime}</span>
					</span>
				)}
				{doctorName && (
					<span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
						<Calendar size={14} />
						<span>{doctorName}</span>
					</span>
				)}
				{cabinetName && (
					<span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
						<MapPin size={14} />
						<span>Кабинет {cabinetName}</span>
					</span>
				)}
			</div>

			{statusBadge && (
				<div
					style={{
						fontSize: "12px",
						fontWeight: 600,
						color: "var(--teal)",
						borderTop: "1px dashed var(--line)",
						paddingTop: "6px",
						marginTop: "2px",
					}}
				>
					{statusBadge}
				</div>
			)}
		</div>
	);
});

MobileCheckinAppointmentCard.displayName = "MobileCheckinAppointmentCard";
