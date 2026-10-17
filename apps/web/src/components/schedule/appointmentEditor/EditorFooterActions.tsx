import React from "react";
import { AlertTriangle } from "lucide-react";
import type { AppointmentCardEditorProps } from "./types";

export function EditorFooterActions({
	appointment,
	appointmentSaveState,
	appointmentSaveError,
	appointmentDirty,
	appointmentMissingSteps,
	appointmentReadyToSave,
	collision,
	saveAppointmentSchedule,
	closeAppointmentEditor,
	appointmentSaveMissingId,
}: Pick<
	AppointmentCardEditorProps,
	| "appointment"
	| "appointmentSaveState"
	| "appointmentSaveError"
	| "appointmentDirty"
	| "appointmentMissingSteps"
	| "appointmentReadyToSave"
	| "collision"
	| "saveAppointmentSchedule"
	| "closeAppointmentEditor"
> & { appointmentSaveMissingId: string }) {
	const collisionId = `appointment-collision-${appointment?.id ?? ""}`;

	return (
		<div className="appointment-editor-actions flex flex-wrap items-center justify-between gap-3 min-w-0">
			<div className="min-h-reserved-error min-w-0" style={{ flex: 1, flexDirection: "column" }}>
				{appointmentSaveError && <span className="save-error break-words">{appointmentSaveError}</span>}
				{collision.hasCollision && (
					<div className="schedule-create-missing schedule-save-missing min-w-0 break-words" id={collisionId} role="alert">
						<strong style={{ color: "var(--bad-fg)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
							<AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
							<span>{collision.message}</span>
						</strong>
					</div>
				)}
				{Boolean((appointmentMissingSteps ?? []).length) && (
					<div className="schedule-create-missing schedule-save-missing min-w-0 break-words" id={appointmentSaveMissingId} role="status" aria-live="polite">
						<strong>Чтобы сохранить запись, исправьте:</strong>
						<ul>
							{(appointmentMissingSteps ?? []).map((step) => (
								<li key={step} className="break-words">{step}</li>
							))}
						</ul>
					</div>
				)}
			</div>
			<div className="flex items-center gap-2 flex-wrap shrink-0">
				<span className={`save-state save-state-${appointmentSaveState} break-words`}>
					{appointmentSaveState === "saving"
						? "Сохраняю"
						: appointmentSaveState === "saved"
							? "Сохранено"
							: appointmentSaveState === "error"
								? "Ошибка сохранения"
								: appointmentDirty
									? "Изменения не сохранены"
									: "Изменений нет"}
				</span>
				<button
					className="secondary-button min-h-[44px] min-w-[44px] px-4 py-2 text-xs font-semibold cursor-pointer shrink-0 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-colors inline-flex items-center justify-center"
					type="button"
					disabled={appointmentSaveState === "saving"}
					aria-busy={appointmentSaveState === "saving" || undefined}
					onClick={() => closeAppointmentEditor(appointment.id)}
				>
					Закрыть
				</button>
				<button
					className="primary-button min-h-[44px] min-w-[44px] px-4.5 py-2 text-xs font-bold cursor-pointer shrink-0 rounded-lg bg-[var(--teal-dark)] text-white hover:brightness-110 active:scale-95 transition-all shadow-2xs border border-transparent inline-flex items-center justify-center"
					type="button"
					onClick={() => void saveAppointmentSchedule(appointment.id)}
					disabled={appointmentSaveState === "saving"}
					aria-busy={appointmentSaveState === "saving" || undefined}
					aria-describedby={
						collision.hasCollision
							? collisionId
							: !appointmentReadyToSave && (appointmentMissingSteps ?? []).length
								? appointmentSaveMissingId
								: undefined
					}
				>
					Сохранить запись
				</button>
			</div>
		</div>
	);
}
