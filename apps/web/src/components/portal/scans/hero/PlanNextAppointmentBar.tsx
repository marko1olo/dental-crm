import React from "react";
import { Calendar, Clock } from "lucide-react";
import { formatRussianDateIso } from "../../patientCabinet/patientCabinetEngine.js";

export interface PatientPlanNextAppointment {
	readonly id?: string | undefined;
	readonly dateRu?: string | undefined;
	readonly dateIso?: string | undefined;
	readonly timeRu?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly roomNumber?: string | undefined;
}

export interface PlanNextAppointmentBarProps {
	readonly nextAppointment?: PatientPlanNextAppointment | null | undefined;
	readonly onBookAppointment?: (() => void) | undefined;
	readonly onRescheduleAppointment?: (() => void) | undefined;
}

export const PlanNextAppointmentBar: React.FC<PlanNextAppointmentBarProps> = ({
	nextAppointment,
	onBookAppointment,
	onRescheduleAppointment,
}) => {
	if (!nextAppointment) return null;

	const appointmentText = [
		nextAppointment.dateRu || (nextAppointment.dateIso ? formatRussianDateIso(nextAppointment.dateIso) : ""),
		nextAppointment.timeRu ? `в ${nextAppointment.timeRu}` : "",
		nextAppointment.doctorName ? `Врач: ${nextAppointment.doctorName}` : "",
	].filter(Boolean).join(" • ");

	return (
		<div
			className="pc-card next-visit-card"
			data-testid="next-visit-card"
			style={{
				backgroundColor: "var(--pc-surface, #1e293b)",
				border: "1px solid var(--pc-border, #334155)",
				borderRadius: "12px",
				padding: "14px 16px",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				flexWrap: "wrap",
				gap: "12px",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<div
					style={{
						width: "36px",
						height: "36px",
						borderRadius: "8px",
						backgroundColor: "var(--pc-primary-light, rgba(13, 148, 136, 0.15))",
						color: "var(--pc-primary, #0d9488)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
					}}
				>
					<Calendar size={20} />
				</div>
				<div>
					<div style={{ fontSize: "12px", color: "var(--pc-text-muted, #94a3b8)" }}>
						Следующий визит по плану лечения:
					</div>
					<strong style={{ fontSize: "14px", color: "var(--pc-text-main, var(--ink, #0f172a))" }}>
						{appointmentText}
					</strong>
				</div>
			</div>

			<div style={{ display: "flex", gap: "8px" }}>
				{onRescheduleAppointment && (
					<button
						type="button"
						onClick={onRescheduleAppointment}
						className="pc-btn-secondary"
						data-testid="request-reschedule-btn"
						style={{
							minHeight: "44px",
							padding: "8px 16px",
							borderRadius: "8px",
							fontSize: "13px",
							fontWeight: 700,
							touchAction: "manipulation",
						}}
					>
						<Clock size={16} />
						<span>Запросить перенос</span>
					</button>
				)}
				{onBookAppointment && (
					<button
						type="button"
						onClick={onBookAppointment}
						className="pc-btn-primary"
						style={{
							minHeight: "44px",
							padding: "8px 16px",
							borderRadius: "8px",
							fontSize: "13px",
							fontWeight: 700,
							touchAction: "manipulation",
						}}
					>
						<span>Записаться</span>
					</button>
				)}
			</div>
		</div>
	);
};
