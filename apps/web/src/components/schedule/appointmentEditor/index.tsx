import React from "react";
import type { AppointmentCardEditorProps } from "./types";
import { EditorDateTimeSection } from "./EditorDateTimeSection";
import { EditorPatientDoctorSection } from "./EditorPatientDoctorSection";
import { EditorStaffChairSection } from "./EditorStaffChairSection";
import { EditorStatusSection } from "./EditorStatusSection";
import { EditorReasonCommentSection } from "./EditorReasonCommentSection";
import { EditorFooterActions } from "./EditorFooterActions";

export type { AppointmentCardEditorProps } from "./types";

export function AppointmentCardEditor(props: AppointmentCardEditorProps) {
	const appointmentSaveMissingId = `appointment-save-missing-${props.appointment?.id ?? ""}`;
	const appointmentEditorId = `appointment-editor-${props.appointment?.id ?? ""}`;
	const appointmentHandoffNoteId = `appointment-handoff-note-${props.appointment?.id ?? ""}`;

	return (
		<section
			className="appointment-editor form-span-2"
			id={appointmentEditorId}
			aria-label={`Редактирование записи: ${props.appointmentPatientName}`}
		>
			<EditorDateTimeSection {...props} />
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))",
					gap: "24px",
					marginBottom: "16px",
					gridColumn: "1 / -1",
				}}
			>
				<EditorPatientDoctorSection
					{...props}
					appointmentHandoffNoteId={appointmentHandoffNoteId}
				/>
				<EditorStaffChairSection {...props} />
				<EditorStatusSection
					{...props}
					appointmentHandoffNoteId={appointmentHandoffNoteId}
				/>
			</div>
			<EditorReasonCommentSection {...props} />
			<EditorFooterActions
				{...props}
				appointmentSaveMissingId={appointmentSaveMissingId}
			/>
		</section>
	);
}
