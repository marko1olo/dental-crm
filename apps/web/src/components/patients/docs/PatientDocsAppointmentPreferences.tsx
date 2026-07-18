import { Clock } from "lucide-react";
import type React from "react";
import { usePatientStore } from "../../../store/patientStore";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";

type TextFieldChangeEvent = React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export function PatientDocsAppointmentPreferences() {
	const appLogic = useAppLogicContext();
	const { patientAdministrativeProfileDraft } = usePatientStore();
	const { updatePatientAdministrativeProfileDraft, weekdayOptions, normalizeOptionalWorkingDaysDraft } = appLogic;

	return (
		<section className="docs-section-card">
			<div className="docs-section-header">
				<div className="docs-section-icon">
					<Clock size={24} />
				</div>
				<div className="docs-section-title">
					<h3>Предпочтения по записи</h3>
					<p>Когда пациенту удобно посещать клинику</p>
				</div>
			</div>
			<div className="docs-form-grid">
				<div className="docs-form-group full-width">
					<label>Удобные дни недели</label>
					<div
						className="weekday-toggle-row"
						role="group"
						aria-label="Удобные дни записи"
					>
						{weekdayOptions.map((day) => {
							const weekdaySelected =
								patientAdministrativeProfileDraft.preferredAppointmentWeekdays.includes(
									day.value,
								);
							return (
								<button
									aria-pressed={weekdaySelected}
									className={weekdaySelected ? "active" : ""}
									key={`patient-weekday-${day.value}`}
									type="button"
									onClick={() => {
										const currentDays =
											patientAdministrativeProfileDraft.preferredAppointmentWeekdays;
										const nextDays = weekdaySelected
											? currentDays.filter((item) => item !== day.value)
											: [...currentDays, day.value];
										updatePatientAdministrativeProfileDraft(
											"preferredAppointmentWeekdays",
											normalizeOptionalWorkingDaysDraft(nextDays),
										);
									}}
								>
									{day.label}
								</button>
							);
						})}
					</div>
				</div>
				<div className="docs-form-group">
					<label>Удобно с (время)</label>
					<input
						type="time"
						value={patientAdministrativeProfileDraft.preferredAppointmentStart || ""}
						onChange={(event: TextFieldChangeEvent) =>
							updatePatientAdministrativeProfileDraft(
								"preferredAppointmentStart",
								event.target.value,
							)
						}
					/>
				</div>
				<div className="docs-form-group">
					<label>Удобно до (время)</label>
					<input
						type="time"
						value={patientAdministrativeProfileDraft.preferredAppointmentEnd || ""}
						onChange={(event: TextFieldChangeEvent) =>
							updatePatientAdministrativeProfileDraft(
								"preferredAppointmentEnd",
								event.target.value,
							)
						}
					/>
				</div>
				<div className="docs-form-group full-width">
					<label>Комментарий к записи (пожелания)</label>
					<input
						autoComplete="off"
						value={patientAdministrativeProfileDraft.preferredAppointmentNote || ""}
						onChange={(event: TextFieldChangeEvent) =>
							updatePatientAdministrativeProfileDraft(
								"preferredAppointmentNote",
								event.target.value,
							)
						}
						placeholder="только утро, звонить после 19:00"
					/>
				</div>
			</div>
		</section>
	);
}
