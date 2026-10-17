import React from "react";
import type { AppointmentCardEditorProps } from "./types";

export function EditorPatientDoctorSection({
	appointment,
	dashboard,
	appointmentDraft,
	appointmentHasOpenVisit,
	activePatients,
	activeDoctors,
	useManualSelects,
	updateAppointmentScheduleDraft,
	appointmentHandoffNoteId,
}: Pick<
	AppointmentCardEditorProps,
	| "appointment"
	| "dashboard"
	| "appointmentDraft"
	| "appointmentHasOpenVisit"
	| "activePatients"
	| "activeDoctors"
	| "useManualSelects"
	| "updateAppointmentScheduleDraft"
> & { appointmentHandoffNoteId: string }) {
	const isPatientLocked = appointment.id === dashboard?.activeVisit?.appointmentId;

	const handleDoctorChange = (newDocId: string) => {
		updateAppointmentScheduleDraft(appointment.id, "doctorUserId", newDocId);
		const doc = (dashboard?.clinicSettings?.staff ?? []).find((m) => m.id === newDocId);
		if (doc?.specialties?.length) {
			const matchingChair = (dashboard?.clinicSettings?.chairs ?? []).find(
				(c) => c.active && c.specialization && doc.specialties!.includes(c.specialization),
			);
			if (matchingChair && matchingChair.id !== appointmentDraft.chairId) {
				updateAppointmentScheduleDraft(appointment.id, "chairId", matchingChair.id);
			}
		}
	};

	return (
		<>
			<div className="min-w-0">
				<span className="text-xs font-semibold text-[var(--muted)] block mb-2">Пациент</span>
				{useManualSelects || (dashboard?.patients ?? []).length > 20 ? (
					<select
						value={String(appointmentDraft.patientId ?? "")}
						onChange={(e) => updateAppointmentScheduleDraft(appointment.id, "patientId", e.target.value)}
						disabled={isPatientLocked}
						className="w-full p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none truncate"
						aria-describedby={appointmentHasOpenVisit ? appointmentHandoffNoteId : undefined}
					>
						<option value="">-- Выберите пациента --</option>
						{activePatients.map((p) => (
							<option key={p.id} value={p.id}>{p.fullName}</option>
						))}
					</select>
				) : (
					<div className="flex flex-wrap gap-1.5 min-w-0">
						{activePatients.map((patient) => (
							<button
								key={patient.id}
								type="button"
								className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.patientId === patient.id ? "active" : ""}`}
								title={patient.fullName}
								onClick={() => updateAppointmentScheduleDraft(appointment.id, "patientId", patient.id)}
								disabled={isPatientLocked}
							>
								<span className="truncate">{patient.fullName}</span>
							</button>
						))}
					</div>
				)}
			</div>

			<div className="min-w-0">
				<span className="text-xs font-semibold text-[var(--muted)] block mb-2">Врач</span>
				{useManualSelects ? (
					<select
						value={String(appointmentDraft.doctorUserId ?? "")}
						onChange={(e) => handleDoctorChange(e.target.value)}
						className="w-full min-h-[44px] p-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none truncate"
					>
						<option value="">-- Выберите врача --</option>
						{activeDoctors.map((m) => (
							<option key={m.id} value={m.id}>{m.fullName}</option>
						))}
					</select>
				) : (
					<div className="flex flex-wrap gap-1.5 min-w-0">
						{activeDoctors.map((member) => (
							<button
								key={member.id}
								type="button"
								className={`quick-chip max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center ${appointmentDraft.doctorUserId === member.id ? "active" : ""}`}
								title={member.fullName}
								onClick={() => handleDoctorChange(member.id)}
							>
								<span className="truncate">{member.fullName}</span>
							</button>
						))}
					</div>
				)}
			</div>
		</>
	);
}
