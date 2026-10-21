import type { Appointment, Patient } from "@dental/shared";
import { Clock } from "lucide-react";
import React from "react";

export interface MobilePatientHeroInfoProps {
	readonly patient: Patient;
	readonly fullName: string;
	readonly initials: string;
	readonly birthDateStr: string;
	readonly isCurrentlyInVisit: boolean;
	readonly upcomingAppointment: Appointment | null;
}

export function MobilePatientHeroInfo({
	patient,
	fullName,
	initials,
	birthDateStr,
	isCurrentlyInVisit,
	upcomingAppointment,
}: MobilePatientHeroInfoProps) {
	return (
		<div className="flex items-start gap-3 min-w-0">
			<div
				className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--teal,#0d9488)] to-cyan-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs ring-2 ring-[var(--teal,#0d9488)]/20"
				aria-hidden="true"
			>
				{initials}
			</div>

			<div className="min-w-0 flex-1">
				<h1 className="text-base sm:text-lg font-black text-[var(--ink)] leading-snug break-words m-0" data-testid="mobile-patient-fullname">
					{fullName}
				</h1>

				<p className="text-xs text-[var(--muted)] mt-0.5 m-0 font-medium">
					{birthDateStr || "Дата рождения не указана"}
				</p>

				<div className="flex items-center gap-2 flex-wrap mt-1.5">
					{isCurrentlyInVisit ? (
						<span
							className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30"
							data-testid="mobile-patient-in-visit-badge"
						>
							<span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
							На приёме в клинике
						</span>
					) : upcomingAppointment ? (
						<span
							className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal-dark,#0f766e)] dark:text-[var(--teal,#2dd4bf)] border border-[var(--teal,#0d9488)]/25"
							data-testid="mobile-patient-upcoming-visit-badge"
						>
							<Clock size={11} className="shrink-0" />
							<span>
								Приём: {new Date(upcomingAppointment.startsAt!).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} в {new Date(upcomingAppointment.startsAt!).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
							</span>
						</span>
					) : (
						<span className="text-[11px] text-[var(--muted)]">Запланированных визитов нет</span>
					)}

					<span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]">
						{patient.id ? `№ ${String(patient.id).slice(0, 8)}` : "—"}
					</span>
				</div>
			</div>
		</div>
	);
}
