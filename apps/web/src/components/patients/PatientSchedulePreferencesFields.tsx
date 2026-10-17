import React, { type ChangeEvent } from "react";
import type { PatientAdministrativeProfile } from "@dental/shared";
import type {
	PatientAdministrativeProfileDraft,
	WeekdayOption,
} from "./patientsViewModules";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;

const loyaltyTierLabels: Record<
	NonNullable<PatientAdministrativeProfile["loyaltyTier"]>,
	string
> = {
	standard: "Базовый",
	silver: "Серебро",
	gold: "Золото",
	platinum: "Платинум",
};

interface PatientSchedulePreferencesFieldsProps {
	draft: PatientAdministrativeProfileDraft;
	updateDraft: (field: keyof PatientAdministrativeProfileDraft, value: string | number[]) => void;
	weekdayOptions?: WeekdayOption[] | undefined;
	normalizeOptionalWorkingDaysDraft?: ((days: number[]) => number[]) | undefined;
}

export const PatientSchedulePreferencesFields: React.FC<PatientSchedulePreferencesFieldsProps> = ({
	draft,
	updateDraft,
	weekdayOptions = [],
	normalizeOptionalWorkingDaysDraft = (days: number[]) => days,
}) => (
	<>
		<div className="form-span-2 patient-appointment-preferences">
			<span>Предпочитаемые дни приема</span>
			<fieldset className="weekday-toggle-row" aria-label="Предпочитаемые дни приема пациента">
				{weekdayOptions.map((day) => {
					const weekdaySelected = (draft.preferredAppointmentWeekdays ?? []).includes(day.value);
					return (
						<button
							aria-pressed={weekdaySelected}
							className={weekdaySelected ? "active" : ""}
							key={`patient-weekday-${day.value}`}
							type="button"
							onClick={() => {
								const currentDays = draft.preferredAppointmentWeekdays ?? [];
								const nextDays = weekdaySelected
									? currentDays.filter((selectedDay) => selectedDay !== day.value)
									: [...currentDays, day.value];
								updateDraft("preferredAppointmentWeekdays", normalizeOptionalWorkingDaysDraft(nextDays));
							}}
						>
							{day.label}
						</button>
					);
				})}
			</fieldset>
		</div>
		<label>
			Удобно приходить с
			<input
				type="time"
				value={draft.preferredAppointmentStart}
				onChange={(e: TextFieldChangeEvent) => updateDraft("preferredAppointmentStart", e.target.value)}
			/>
		</label>
		<label>
			Удобно приходить до
			<input
				type="time"
				value={draft.preferredAppointmentEnd}
				onChange={(e: TextFieldChangeEvent) => updateDraft("preferredAppointmentEnd", e.target.value)}
			/>
		</label>
		<p className="field-note form-span-2">
			Удобное окно приёма пациента (начало и конец). Не блокирует сохранение реквизитов (заполните второе или очистите первое).
		</p>
		<label className="form-span-2">
			Комментарий к записи
			<input
				autoComplete="off"
				value={draft.preferredAppointmentNote}
				onChange={(e: TextFieldChangeEvent) => updateDraft("preferredAppointmentNote", e.target.value)}
				placeholder="Например: только утро, не звонить после 19:00"
			/>
		</label>
		<label>
			Уровень лояльности
			<select
				value={draft.loyaltyTier}
				onChange={(e: SelectChangeEvent) => updateDraft("loyaltyTier", e.target.value)}
			>
				{Object.entries(loyaltyTierLabels).map(([tier, label]) => (
					<option key={`patient-loyalty-${tier}`} value={tier}>
						{label}
					</option>
				))}
			</select>
		</label>
		<p className="field-note form-span-2">
			Уровень — пометка для сотрудников: скидку назначайте вручную при оплате.
		</p>
	</>
);
