import React from "react";
import { Calendar, ClipboardCheck } from "lucide-react";
import { PatientAvatar } from "../../PatientAvatar";

export interface DoctorShiftNextAppointmentHeroProps {
	readonly nextAppointment: any;
	readonly nextAppointmentPatient: any;
	readonly formatClockTime: (value: unknown) => string;
	readonly onStartNextAppointment: (patientId: string) => void;
	readonly onOpenSchedule: () => void;
}

export const DoctorShiftNextAppointmentHero: React.FC<DoctorShiftNextAppointmentHeroProps> = ({
	nextAppointment,
	nextAppointmentPatient,
	formatClockTime,
	onStartNextAppointment,
	onOpenSchedule,
}) => (
	<>
		<div className="patient-hero">
			<PatientAvatar
				fullName={nextAppointmentPatient?.fullName ?? "?"}
				size={44}
			/>
			<div className="hero-info min-w-0">
				<h2 className="break-words leading-tight" style={{ color: "var(--ink)" }}>
					{nextAppointmentPatient?.fullName ?? "Пациент не найден"}
				</h2>
				<p className="hero-phone break-words leading-tight" style={{ color: "var(--muted)" }}>
					Ближайший прием сегодня в {formatClockTime(nextAppointment.startsAt)}
					{nextAppointment.reason ? ` · ${nextAppointment.reason}` : ""}
				</p>
			</div>
		</div>
		<div className="hero-actions" style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
			<button
				className="primary-button"
				style={{ fontSize: "13px", fontWeight: 600, padding: "0 16px", height: "36px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px" }}
				type="button"
				onClick={() => {
					if (nextAppointmentPatient) {
						onStartNextAppointment(nextAppointmentPatient.id);
					}
				}}
			>
				<ClipboardCheck size={15} aria-hidden="true" /> Начать приём
			</button>
			<button
				className="secondary-button"
				style={{ fontSize: "13px", fontWeight: 600, padding: "0 14px", height: "36px", borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--paper-soft)", border: "1px solid var(--line)", color: "var(--ink)" }}
				type="button"
				onClick={onOpenSchedule}
			>
				<Calendar size={15} aria-hidden="true" /> Все записи дня
			</button>
		</div>
	</>
);
