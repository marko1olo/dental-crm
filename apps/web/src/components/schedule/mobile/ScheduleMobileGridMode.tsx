import React from "react";
import { Armchair, Plus } from "lucide-react";
import type { Appointment } from "@dental/shared";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";

export interface ScheduleMobileGridModeProps {
	chairs: any[];
	appointments: Appointment[];
	effectiveDateKey: string;
	selectedDoctorId: string | null;
	dashboard: any;
	patientName: (patients: any[], id: string | null) => string;
	appointmentLabels: Record<string, string>;
	onSlotClick?: ((slot: QuickBookingSlotInfo) => void) | undefined;
	onQuickBooking?: (() => void) | undefined;
	onSelectMobileAppt: (appt: Appointment) => void;
}

export const ScheduleMobileGridMode: React.FC<ScheduleMobileGridModeProps> = ({
	chairs,
	appointments,
	effectiveDateKey,
	selectedDoctorId,
	dashboard,
	patientName,
	appointmentLabels,
	onSlotClick,
	onQuickBooking,
	onSelectMobileAppt,
}) => {
	return (
		<div
			className="schedule-mobile-grid-mode p-3 flex flex-col gap-3"
			data-testid="schedule-mobile-grid-container"
		>
			{chairs.length === 0 ? (
				<div className="p-6 text-center text-sm text-[var(--muted)] bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
					Кабинеты ещё не настроены
				</div>
			) : (
				chairs.map((chair: any) => {
					const chairAppts = appointments.filter(
						(a) =>
							a.chairId === chair.id &&
							a.startsAt.startsWith(effectiveDateKey),
					);
					return (
						<div
							key={chair.id}
							className="schedule-mobile-chair-card p-3 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs flex flex-col gap-2"
							data-testid={`schedule-mobile-chair-card-${chair.id}`}
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div className="w-7 h-7 rounded-lg bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold text-xs">
										<Armchair size={15} />
									</div>
									<span className="text-sm font-bold text-[var(--ink)]">
										{chair.name}
									</span>
								</div>
								<span className="text-xs text-[var(--muted)] font-medium">
									Записей: {chairAppts.length}
								</span>
							</div>

							{chairAppts.length === 0 ? (
								<div className="py-3 px-3 text-center text-xs text-[var(--muted)] bg-[var(--paper-soft)] rounded-xl border border-dashed border-[var(--line)]">
									Свободно на весь день
								</div>
							) : (
								<div className="flex flex-col gap-1.5">
									{chairAppts.map((a) => (
										<div
											key={a.id}
											onClick={() => onSelectMobileAppt(a)}
											className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between text-xs cursor-pointer active:scale-[0.99] transition-all"
										>
											<div className="flex items-center gap-2">
												<span className="font-mono font-bold text-[var(--teal,#0d9488)]">
													{a.startsAt.slice(11, 16)} – {a.endsAt.slice(11, 16)}
												</span>
												<span className="font-medium text-[var(--ink)]">
													{patientName(
														dashboard?.patients ?? [],
														a.patientId,
													)}
												</span>
											</div>
											<span className="text-[11px] text-[var(--muted)]">
												{appointmentLabels[a.status] || a.status}
											</span>
										</div>
									))}
								</div>
							)}

							<button
								type="button"
								onClick={() => {
									if (onSlotClick) {
										onSlotClick({
											dateKey: effectiveDateKey,
											doctorUserId: selectedDoctorId || null,
											chairId: chair.id,
											durationMinutes: 30,
										});
									} else if (onQuickBooking) {
										onQuickBooking();
									}
								}}
								className="mt-1 w-full min-h-[44px] py-2 px-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)] text-xs font-semibold text-[var(--ink)] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
							>
								<Plus size={14} className="text-[var(--teal,#0d9488)]" />
								<span>Записать в этот кабинет</span>
							</button>
						</div>
					);
				})
			)}
		</div>
	);
};
