import React, { type ChangeEvent } from "react";
import type { AppointmentCardEditorProps } from "./types";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function EditorDateTimeSection({
	appointment,
	dashboard,
	appointmentDraft,
	toDateTimeLocalValue,
	fromDateTimeLocalValue,
	updateAppointmentScheduleDraft,
}: Pick<
	AppointmentCardEditorProps,
	| "appointment"
	| "dashboard"
	| "appointmentDraft"
	| "toDateTimeLocalValue"
	| "fromDateTimeLocalValue"
	| "updateAppointmentScheduleDraft"
>) {
	const timezone = dashboard?.clinicSettings?.profile?.timezone;

	return (
		<>
			<label>
				Начало
				<input
					type="datetime-local"
					value={toDateTimeLocalValue(appointmentDraft?.startsAt as string, timezone)}
					onChange={(event: TextFieldChangeEvent) =>
						updateAppointmentScheduleDraft(
							appointment.id,
							"startsAt",
							fromDateTimeLocalValue(event.target.value, timezone),
						)
					}
				/>
			</label>
			<label>
				Окончание
				<input
					type="datetime-local"
					value={toDateTimeLocalValue(appointmentDraft?.endsAt as string, timezone)}
					onChange={(event: TextFieldChangeEvent) =>
						updateAppointmentScheduleDraft(
							appointment.id,
							"endsAt",
							fromDateTimeLocalValue(event.target.value, timezone),
						)
					}
				/>
			</label>
		</>
	);
}
