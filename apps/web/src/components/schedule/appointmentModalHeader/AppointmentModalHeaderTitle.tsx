import { Calendar, Zap } from "lucide-react";
import React from "react";

export interface AppointmentModalHeaderTitleProps {
	headerTitle: string;
	isNewAppointment: boolean;
	currentPatientName: string;
	isCito: boolean;
	startsAtLocal: string;
	endsAtLocal: string;
}

export function AppointmentModalHeaderTitle({
	headerTitle,
	isNewAppointment,
	currentPatientName,
	isCito,
	startsAtLocal,
	endsAtLocal,
}: AppointmentModalHeaderTitleProps) {
	const timeRange = startsAtLocal
		? `${startsAtLocal.slice(0, 10)} ${startsAtLocal.slice(11, 16)} - ${endsAtLocal.slice(11, 16)}`
		: "";

	return (
		<div className="flex items-center gap-2.5 min-w-0 flex-1">
			<div className="p-1.5 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal,var(--brand-primary))]/20 shrink-0">
				<Calendar size={18} />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2 min-w-0">
					<h3
						className="text-sm sm:text-base font-bold text-[var(--ink)] m-0 leading-tight truncate shrink min-w-0"
						title={
							isNewAppointment
								? "Запись на приём"
								: `Запись: ${currentPatientName}`
						}
					>
						{headerTitle}
					</h3>
					{isCito && (
						<span
							className="h-6 px-2 rounded-md border border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[11px] font-black inline-flex items-center gap-1 shrink-0 shadow-2xs"
							title="Экстренный прием: острая боль"
							data-testid="appointment-cito-active-badge"
						>
							<Zap
								size={11}
								className="text-rose-600 dark:text-rose-400 shrink-0 fill-current"
							/>
							<span className="tracking-wider">СРОЧНО</span>
						</span>
					)}
				</div>
				<p
					className="text-xs text-[var(--muted)] m-0 mt-0.5 truncate leading-tight"
					title={timeRange}
				>
					{timeRange}
				</p>
			</div>
		</div>
	);
}
