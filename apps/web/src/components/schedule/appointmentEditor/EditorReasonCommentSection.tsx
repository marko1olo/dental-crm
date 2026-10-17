import React, { type ChangeEvent } from "react";
import type { AppointmentCardEditorProps } from "./types";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

const REASON_CHIPS = [
	"Кариес", "Пульпит", "Удаление", "Осмотр", "Профгигиена",
	"Консультация", "Брекеты", "Коронка", "КЛКТ", "Имплантация",
];

const COMMENT_CHIPS = ["Первичный", "Боль", "Осмотр", "Консультация", "Снимки"];

export function EditorReasonCommentSection({
	appointment,
	appointmentDraft,
	updateAppointmentScheduleDraft,
}: Pick<
	AppointmentCardEditorProps,
	"appointment" | "appointmentDraft" | "updateAppointmentScheduleDraft"
>) {
	const appendChipToField = (field: "reason" | "comment", chip: string) => {
		const currentVal = String(appointmentDraft[field] || "").trim();
		const newVal = currentVal ? `${currentVal}, ${chip.toLowerCase()}` : chip;
		updateAppointmentScheduleDraft(appointment.id, field, newVal);
	};

	return (
		<>
			<label className="form-span-2 min-w-0">
				Причина
				<input
					className="w-full"
					value={String(appointmentDraft.reason || "")}
					onChange={(e: TextFieldChangeEvent) =>
						updateAppointmentScheduleDraft(appointment.id, "reason", e.target.value)
					}
				/>
				<div className="flex flex-wrap gap-1.5 mt-1.5 min-w-0">
					{REASON_CHIPS.map((chip) => (
						<button
							key={chip}
							type="button"
							onClick={() => appendChipToField("reason", chip)}
							className="quick-chip quick-chip--sm max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center"
						>
							+ {chip}
						</button>
					))}
				</div>
			</label>
			<label className="form-span-2 min-w-0">
				Комментарий
				<textarea
					className="w-full"
					value={String(appointmentDraft.comment || "")}
					onChange={(e: TextFieldChangeEvent) =>
						updateAppointmentScheduleDraft(appointment.id, "comment", e.target.value)
					}
					rows={2}
				/>
				<div className="flex flex-wrap gap-1.5 mt-1.5 min-w-0">
					{COMMENT_CHIPS.map((chip) => (
						<button
							key={chip}
							type="button"
							onClick={() => appendChipToField("comment", chip)}
							className="quick-chip quick-chip--sm max-w-full truncate min-h-[44px] sm:min-h-0 inline-flex items-center"
						>
							+ {chip}
						</button>
					))}
				</div>
			</label>
		</>
	);
}
