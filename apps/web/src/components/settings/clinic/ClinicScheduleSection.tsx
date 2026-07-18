import { Clock } from "lucide-react";
import type React from "react";
import type { ChangeEvent } from "react";

type InputChangeEvent = ChangeEvent<HTMLInputElement>;
type WeekdayOption = { value: number; label: string };

interface ClinicScheduleSectionProps {
	clinicProfileDraft: any;
	updateClinicProfileDraft: (field: string, value: any) => void;
	toggleClinicWorkingDay: (day: number) => void;
	typedWeekdayOptions: WeekdayOption[];
}

export const ClinicScheduleSection: React.FC<ClinicScheduleSectionProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
	toggleClinicWorkingDay,
	typedWeekdayOptions,
}) => {
	return (
		<section className="clinic-section-card" aria-label="График работы">
			<div className="clinic-section-header">
				<div className="clinic-section-icon">
					<Clock size={24} />
				</div>
				<div className="clinic-section-title">
					<h3>График работы клиники</h3>
					<p>Настройки времени и параметров записи по умолчанию</p>
				</div>
			</div>

			<div className="clinic-form-grid">
				<div className="clinic-form-group">
					<label>Начало смены</label>
					<input
						type="time"
						value={clinicProfileDraft?.workdayStart ?? ""}
						onChange={(event: InputChangeEvent) =>
							updateClinicProfileDraft("workdayStart", event.target.value)
						}
					/>
				</div>
				<div className="clinic-form-group">
					<label>Конец смены</label>
					<input
						type="time"
						value={clinicProfileDraft?.workdayEnd ?? ""}
						onChange={(event: InputChangeEvent) =>
							updateClinicProfileDraft("workdayEnd", event.target.value)
						}
					/>
				</div>
				<div className="clinic-form-group">
					<label>Длительность визита по умолчанию (мин)</label>
					<input
						inputMode="numeric"
						value={clinicProfileDraft?.defaultVisitMinutes ?? ""}
						onChange={(event: InputChangeEvent) =>
							updateClinicProfileDraft(
								"defaultVisitMinutes",
								event.target.value.replace(/[^\d]/g, "").slice(0, 3),
							)
						}
					/>
				</div>
				<div className="clinic-form-group">
					<label>Буфер между записями (мин)</label>
					<input
						inputMode="numeric"
						value={clinicProfileDraft?.appointmentBufferMinutes ?? ""}
						onChange={(event: InputChangeEvent) =>
							updateClinicProfileDraft(
								"appointmentBufferMinutes",
								event.target.value.replace(/[^\d]/g, "").slice(0, 3),
							)
						}
					/>
				</div>
				<div className="clinic-form-group full-width">
					<label>Рабочие дни клиники</label>
					<div className="weekday-toggle-row">
						{typedWeekdayOptions.map((day: any) => {
							const isWorking = (
								clinicProfileDraft?.workingDays ?? []
							).includes(day.value);
							return (
								<button
									key={day.value}
									type="button"
									className={isWorking ? "active" : ""}
									aria-pressed={isWorking}
									onClick={() => toggleClinicWorkingDay(day.value)}
								>
									{day.label}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</section>
	);
};
