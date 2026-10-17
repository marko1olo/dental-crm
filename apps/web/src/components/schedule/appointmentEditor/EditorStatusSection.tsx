import React from "react";
import type { Appointment } from "@dental/shared";
import { AppointmentQuickActions } from "../AppointmentQuickActions";
import { specialtyLabels } from "../../../workspaceUiLabels";
import type { AppointmentCardEditorProps } from "./types";

export function EditorStatusSection({
	appointment,
	appointmentDraft,
	appointmentLabels,
	appointmentHasOpenVisit,
	activeVisitLockedAppointmentStatuses,
	appointmentSaveState,
	appointmentPatientName,
	appointmentPatient,
	appointmentDoctor,
	appointmentChair,
	updateAppointmentScheduleDraft,
	normalizedAppointmentStatus,
	appointmentHandoffNoteId,
}: Pick<
	AppointmentCardEditorProps,
	| "appointment"
	| "appointmentDraft"
	| "appointmentLabels"
	| "appointmentHasOpenVisit"
	| "activeVisitLockedAppointmentStatuses"
	| "appointmentSaveState"
	| "appointmentPatientName"
	| "appointmentPatient"
	| "appointmentDoctor"
	| "appointmentChair"
	| "updateAppointmentScheduleDraft"
	| "normalizedAppointmentStatus"
> & { appointmentHandoffNoteId: string }) {
	const currentStatus = (appointmentDraft?.status || appointment.status) as Appointment["status"];
	const isSelectLocked =
		appointmentHasOpenVisit &&
		Boolean(activeVisitLockedAppointmentStatuses?.has?.(currentStatus as any));

	return (
		<div className="min-w-0">
			<span className="text-xs font-semibold text-[var(--muted)] block mb-1.5">Статус приема</span>
			<select
				className="appointment-status-select w-full max-w-xs min-h-[44px] px-2.5 rounded-lg text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer outline-none hover:border-[var(--teal,var(--brand-primary))] transition-colors"
				value={String(currentStatus)}
				onChange={(e) => {
					updateAppointmentScheduleDraft(
						appointment.id,
						"status",
						normalizedAppointmentStatus(e.target.value as Appointment["status"]),
					);
				}}
				disabled={isSelectLocked}
				aria-label="Статус приема"
			>
				{Object.keys(appointmentLabels ?? {}).map((key) => {
					const statusKey = key as Appointment["status"];
					return (
						<option
							key={statusKey}
							value={statusKey}
							disabled={Boolean(
								appointmentHasOpenVisit && activeVisitLockedAppointmentStatuses?.has?.(statusKey),
							)}
						>
							{appointmentLabels?.[statusKey] ?? statusKey}
						</option>
					);
				})}
			</select>
			<div className="mt-2">
				<AppointmentQuickActions
					appointmentId={appointment.id}
					currentStatus={currentStatus}
					patientName={appointmentPatientName || "Пациент"}
					patientPhone={appointmentPatient?.phone}
					doctorName={appointmentDoctor?.fullName}
					doctorSpecialty={
						appointmentDoctor?.specialties?.[0]
							? specialtyLabels[appointmentDoctor.specialties[0]]
							: undefined
					}
					startsAt={appointment.startsAt}
					treatmentReason={appointment.reason}
					cabinetName={appointmentChair?.name}
					appointmentHasOpenVisit={appointmentHasOpenVisit}
					activeVisitLockedAppointmentStatuses={activeVisitLockedAppointmentStatuses}
					onStatusChange={(newStatus, noteAppend) => {
						updateAppointmentScheduleDraft(
							appointment.id,
							"status",
							normalizedAppointmentStatus(newStatus),
						);
						if (noteAppend) {
							const existing = appointmentDraft?.comment ?? appointment.comment ?? "";
							const updated = existing ? `${existing}\n[${noteAppend}]` : `[${noteAppend}]`;
							updateAppointmentScheduleDraft(appointment.id, "comment", updated);
						}
					}}
					disabled={appointmentSaveState === "saving"}
				/>
			</div>
			{appointmentHasOpenVisit && (
				<div
					id={appointmentHandoffNoteId}
					className="status-blocker-note appointment-handoff-note text-xs mt-1 font-medium p-2 rounded break-words"
				>
					По этой записи сейчас открыт активный приём у врача.
					Завершите или закройте приём в рабочем месте врача перед изменением статуса записи.
				</div>
			)}
		</div>
	);
}
