import type { ClinicMode } from "@dental/shared";
import React from "react";
import { useAppLogicContext } from "../../../../contexts/AppLogicContext";

export function InlineStepClinic() {
	const {
		dashboard,
		clinicModeLabels,
		changeClinicMode,
		clinicProfileDraft,
		updateClinicProfileDraft,
		uiLanguage,
		setUiLanguage,
		normalizeUiLanguageInput,
		uiLanguageOptions,
		selectedUiLanguageOption,
		weekdayOptions,
		toggleClinicWorkingDay,
	} = useAppLogicContext();

	return (
		<div className="onboarding-panel">
			<div>
				<h3>Режим и базовые контакты</h3>
				<p>
					Режим меняет первый экран, очереди ролей и подсказки без ручной
					перенастройки интерфейса.
				</p>
			</div>
			<div className="mode-grid form-span-2" aria-label="Режим клиники">
				{(Object.keys(clinicModeLabels) as ClinicMode[]).map((mode) => (
					<button
						className={`mode-card ${dashboard.clinicSettings?.profile?.mode === mode ? "active" : ""}`}
						key={mode}
						type="button"
						aria-pressed={
							dashboard.clinicSettings?.profile?.mode === mode
						}
						onClick={() => changeClinicMode(mode)}
					>
						<strong>{clinicModeLabels[mode].title}</strong>
						<span>{clinicModeLabels[mode].detail}</span>
					</button>
				))}
			</div>
			<div className="onboarding-form-grid">
				<label>
					Название клиники
					<input
						value={clinicProfileDraft.clinicName}
						onChange={(event) =>
							updateClinicProfileDraft("clinicName", event.target.value)
						}
					/>
				</label>
				<label>
					Телефон
					<input
						value={clinicProfileDraft.phone}
						onChange={(event) =>
							updateClinicProfileDraft("phone", event.target.value)
						}
					/>
				</label>
				<label>
					Часовой пояс
					<input
						value={clinicProfileDraft.timezone}
						onChange={(event) =>
							updateClinicProfileDraft("timezone", event.target.value)
						}
					/>
				</label>
				<label>
					Язык интерфейса
					<select
						value={uiLanguage}
						onChange={(event) =>
							setUiLanguage(normalizeUiLanguageInput(event.target.value))
						}
					>
						{uiLanguageOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<small className="field-note">
						{selectedUiLanguageOption?.detail}
					</small>
				</label>
				<label>
					Минут на визит
					<input
						inputMode="numeric"
						value={clinicProfileDraft.defaultVisitMinutes}
						onChange={(event) =>
							updateClinicProfileDraft(
								"defaultVisitMinutes",
								event.target.value.replace(/[^\d]/g, "").slice(0, 3),
							)
						}
					/>
				</label>
				<label>
					Начало смены
					<input
						type="time"
						value={clinicProfileDraft.workdayStart}
						onChange={(event) =>
							updateClinicProfileDraft("workdayStart", event.target.value)
						}
					/>
				</label>
				<label>
					Конец смены
					<input
						type="time"
						value={clinicProfileDraft.workdayEnd}
						onChange={(event) =>
							updateClinicProfileDraft("workdayEnd", event.target.value)
						}
					/>
				</label>
				<label>
					Буфер, мин
					<input
						inputMode="numeric"
						value={clinicProfileDraft.appointmentBufferMinutes}
						onChange={(event) =>
							updateClinicProfileDraft(
								"appointmentBufferMinutes",
								event.target.value.replace(/[^\d]/g, "").slice(0, 3),
							)
						}
					/>
				</label>
				<div
					className="weekday-toggle-row form-span-2"
					role="group"
					aria-label="Рабочие дни клиники"
				>
					<span>Рабочие дни</span>
					{weekdayOptions.map((day: any) => (
						<button
							className={
								clinicProfileDraft.workingDays.includes(day.value)
									? "active"
									: ""
							}
							key={day.value}
							type="button"
							aria-pressed={clinicProfileDraft.workingDays.includes(
								day.value,
							)}
							onClick={() => toggleClinicWorkingDay(day.value)}
						>
							{day.label}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
