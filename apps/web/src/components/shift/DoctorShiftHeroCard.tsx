import React from "react";
import { DoctorShiftInChairHero } from "./heroCard/DoctorShiftInChairHero";
import { DoctorShiftNextAppointmentHero } from "./heroCard/DoctorShiftNextAppointmentHero";
import { DoctorShiftEmptyChairHero } from "./heroCard/DoctorShiftEmptyChairHero";

export interface DoctorShiftHeroCardProps {
	readonly currentPatient: any | null | undefined;
	readonly currentPatientHasCallablePhone: boolean;
	readonly currentPatientCallablePhone: string;
	readonly currentAppointmentReason: string;
	readonly nextAppointment: any | null | undefined;
	readonly nextAppointmentPatient: any | null | undefined;
	readonly todayAppointmentsCount: number;
	readonly formatClockTime: (value: unknown) => string;
	readonly onOpenVisit: (patientId: string) => void;
	readonly onOpenImaging: (patientId: string) => void;
	readonly onCallPatientError?: ((msg: string) => void) | undefined;
	readonly onStartNextAppointment: (patientId: string) => void;
	readonly onOpenSchedule: () => void;
}

export const DoctorShiftHeroCard: React.FC<DoctorShiftHeroCardProps> = ({
	currentPatient,
	currentPatientHasCallablePhone,
	currentPatientCallablePhone,
	currentAppointmentReason,
	nextAppointment,
	nextAppointmentPatient,
	todayAppointmentsCount,
	formatClockTime,
	onOpenVisit,
	onOpenImaging,
	onCallPatientError,
	onStartNextAppointment,
	onOpenSchedule,
}) => (
	<div className="now-card" data-testid="doctor-shift-hero-card">
		<div className="row-between">
			<p className="eyebrow" style={{ color: "var(--ink-2)" }}>
				{currentPatient ? "Сейчас в кресле" : "Сейчас в работе"}
			</p>
			{currentPatient ? (
				<span className="status-pill status-in_treatment">
					<span className="pulse-dot" aria-hidden="true" />
					В кресле
				</span>
			) : null}
		</div>

		{currentPatient ? (
			<DoctorShiftInChairHero
				currentPatient={currentPatient}
				currentPatientHasCallablePhone={currentPatientHasCallablePhone}
				currentPatientCallablePhone={currentPatientCallablePhone}
				currentAppointmentReason={currentAppointmentReason}
				onOpenVisit={onOpenVisit}
				onOpenImaging={onOpenImaging}
				onCallPatientError={onCallPatientError}
			/>
		) : nextAppointment ? (
			<DoctorShiftNextAppointmentHero
				nextAppointment={nextAppointment}
				nextAppointmentPatient={nextAppointmentPatient}
				formatClockTime={formatClockTime}
				onStartNextAppointment={onStartNextAppointment}
				onOpenSchedule={onOpenSchedule}
			/>
		) : (
			<DoctorShiftEmptyChairHero
				todayAppointmentsCount={todayAppointmentsCount}
				onOpenSchedule={onOpenSchedule}
			/>
		)}
	</div>
);
