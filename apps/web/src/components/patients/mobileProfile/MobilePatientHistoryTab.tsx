/**
 * DENTE CRM — Mobile Patient History Tab (Визиты и приёмы)
 * (Apple HIG & Anti-Desktop-Squeeze Mandate)
 *
 * Layer 4: Vertical Timeline of Appointments and Clinical Visits.
 */

import type { Appointment } from "@dental/shared";
import { Calendar, ChevronRight, Clock, Plus } from "lucide-react";
import React from "react";

export interface MobilePatientHistoryTabProps {
	patientAppointments: Appointment[];
	onBookAppointment: () => void;
	onOpenVisit?: ((visitId: string) => void) | undefined;
	onStartVisit: () => void;
}

export const MobilePatientHistoryTab: React.FC<MobilePatientHistoryTabProps> = ({
	patientAppointments,
	onBookAppointment,
	onOpenVisit,
	onStartVisit,
}) => {
	return (
		<div className="flex flex-col gap-3" data-testid="mobile-panel-visits">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-black uppercase tracking-wider text-[var(--muted)] m-0">
					История визитов ({patientAppointments.length})
				</h3>
				<button
					type="button"
					onClick={onBookAppointment}
					className="h-8 px-2.5 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
					data-testid="mobile-btn-book-visit"
				>
					<Plus size={13} />
					<span>Записать</span>
				</button>
			</div>

			{patientAppointments.length === 0 ? (
				<div className="p-8 text-center rounded-2xl bg-[var(--paper)] border border-[var(--line)] flex flex-col items-center gap-2">
					<Calendar size={32} className="text-[var(--muted)] opacity-50" />
					<p className="text-xs text-[var(--muted)] m-0">
						История визитов пуста. Запишите пациента на приём.
					</p>
					<button
						type="button"
						onClick={onBookAppointment}
						className="mt-2 min-h-[44px] px-4 rounded-xl bg-teal-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs"
					>
						<Plus size={14} />
						<span>Создать запись</span>
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-2">
					{patientAppointments.map((appt) => {
						const date = new Date(appt.startsAt || 0);
						const dateStr = date.toLocaleDateString("ru-RU", {
							day: "numeric",
							month: "short",
							year: "numeric",
						});
						const timeStr = date.toLocaleTimeString("ru-RU", {
							hour: "2-digit",
							minute: "2-digit",
						});
						const statusRu =
							appt.status === "completed"
								? "Завершён"
								: appt.status === "in_treatment"
									? "На приёме"
									: appt.status === "cancelled"
										? "Отменён"
										: "Запланирован";

						return (
							<div
								key={appt.id}
								className="p-3.5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2"
								data-testid={`mobile-visit-card-${appt.id}`}
							>
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
										<Clock size={13} className="text-teal-600 dark:text-teal-400" />
										<span>{dateStr} в {timeStr}</span>
									</div>
									<span
										className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
											appt.status === "completed"
												? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
												: appt.status === "in_treatment"
													? "bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/30 animate-pulse"
													: "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)]"
										}`}
									>
										{statusRu}
									</span>
								</div>

								{appt.reason && (
									<p className="text-xs text-[var(--ink)] m-0 font-medium line-clamp-2">
										{appt.reason}
									</p>
								)}

								<div className="flex items-center justify-between pt-1 border-t border-[var(--line-subtle,#f1f5f9)] text-xs">
									<span className="text-[var(--muted)] text-[11px]">
										Врач: {(appt as any).doctorFullName || "Врач клиники"}
									</span>
									<button
										type="button"
										onClick={() => {
											if (onOpenVisit) onOpenVisit(appt.id);
											else onStartVisit();
										}}
										className="text-xs font-bold text-[var(--teal)] inline-flex items-center gap-0.5 cursor-pointer hover:underline"
									>
										<span>К приёму</span>
										<ChevronRight size={13} />
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
