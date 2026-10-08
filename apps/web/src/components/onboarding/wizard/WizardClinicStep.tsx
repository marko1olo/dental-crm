import React from "react";
import type { ClinicMode } from "@dental/shared";
import { SovereignScalePresetsCard } from "../SovereignScalePresetsCard";
import type { WizardClinicStepProps } from "./types";

export function WizardClinicStep({
	clinicProfileDraft,
	updateClinicProfileDraft,
	changeClinicMode,
	uiLanguage,
	setUiLanguage,
	normalizeUiLanguageInput,
	uiLanguageOptions,
	selectedUiLanguageOption,
	weekdayOptions,
	toggleClinicWorkingDay,
}: WizardClinicStepProps) {
	return (
		<div className="onboarding-panel">
			<div>
				<h3>Режим и базовые контакты</h3>
				<p>
					Режим меняет первый экран, очереди ролей и подсказки без ручной
					перенастройки интерфейса.
				</p>
			</div>
			<div className="form-span-2 mb-2">
				<SovereignScalePresetsCard
					compactMode={false}
					hideHeader={false}
					onPresetApplied={(presetId) => {
						const targetMode: ClinicMode =
							presetId === "solo_doctor"
								? "solo_doctor"
								: presetId === "standard_clinic"
									? "small_clinic"
									: "network_clinic";
						changeClinicMode(targetMode);
						updateClinicProfileDraft(
							"defaultVisitMinutes",
							presetId === "solo_doctor" ? 30 : presetId === "standard_clinic" ? 45 : 60,
						);
					}}
				/>
			</div>
			<div className="onboarding-form-grid">
				<label>
					Название клиники
					<input
						value={clinicProfileDraft.clinicName ?? ""}
						onChange={(event) =>
							updateClinicProfileDraft("clinicName", event.target.value)
						}
					/>
				</label>
				<label>
					Телефон
					<input
						value={clinicProfileDraft.phone ?? ""}
						onChange={(event) =>
							updateClinicProfileDraft("phone", event.target.value)
						}
					/>
				</label>
				<label>
					Часовой пояс
					<input
						value={clinicProfileDraft.timezone ?? ""}
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
						{selectedUiLanguageOption.detail}
					</small>
				</label>
				<label>
					Минут на визит
					<input
						inputMode="numeric"
						value={clinicProfileDraft.defaultVisitMinutes ?? ""}
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
						value={clinicProfileDraft.workdayStart ?? ""}
						onChange={(event) =>
							updateClinicProfileDraft("workdayStart", event.target.value)
						}
					/>
				</label>
				<label>
					Конец смены
					<input
						type="time"
						value={clinicProfileDraft.workdayEnd ?? ""}
						onChange={(event) =>
							updateClinicProfileDraft("workdayEnd", event.target.value)
						}
					/>
				</label>
				<label>
					Буфер, мин
					<input
						inputMode="numeric"
						value={clinicProfileDraft.appointmentBufferMinutes ?? ""}
						onChange={(event) =>
							updateClinicProfileDraft(
								"appointmentBufferMinutes",
								event.target.value.replace(/[^\d]/g, "").slice(0, 3),
							)
						}
					/>
				</label>
				<fieldset
					className="weekday-toggle-row form-span-2"
					aria-label="Рабочие дни клиники"
					style={{ border: "none", padding: 0, margin: 0 }}
				>
					<legend className="sr-only">Рабочие дни клиники</legend>
					<span>Рабочие дни</span>
					{weekdayOptions.map((day) => (
						<button
							className={
								clinicProfileDraft.workingDays?.includes(day.value)
									? "active"
									: ""
							}
							key={day.value}
							type="button"
							aria-pressed={clinicProfileDraft.workingDays?.includes(
								day.value,
							)}
							onClick={() => toggleClinicWorkingDay(day.value)}
						>
							{day.label}
						</button>
					))}
				</fieldset>
			</div>
		</div>
	);
}
