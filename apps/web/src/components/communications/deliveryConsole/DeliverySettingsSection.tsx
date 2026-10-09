import React from "react";
import { minutesToTime, timeToMinutes } from "./constants";
import type { CommunicationSettings } from "./types";

export interface DeliverySettingsSectionProps {
	settings: CommunicationSettings | null;
	busy: boolean;
	saveSettings: (patch: Partial<CommunicationSettings>) => Promise<void>;
}

export function DeliverySettingsSection({
	settings,
	busy,
	saveSettings,
}: DeliverySettingsSectionProps) {
	return (
		<>
			{/* ── Правила ───────────────────────────────────────────────────── */}
			<h3 className="ops-section-title">Правила рассылки</h3>
			{settings === null ? (
				<p className="ops-empty">Загружаю правила…</p>
			) : (
				<div>
					<p className="ops-hint">
						Часовой пояс: {settings?.timezone ?? ""}. Тихие часы:{" "}
						{minutesToTime(settings?.quietHoursStartMinute ?? 0)} —{" "}
						{minutesToTime(settings?.quietHoursEndMinute ?? 0)}. Сервисные
						сообщения в это время откладываются до утра, рекламные не
						отправляются. Не более {settings?.dailyLimitPerPatient ?? 0}{" "}
						сообщений одному пациенту в сутки.
					</p>

					<div className="ops-toolbar">
						<span className="ops-field">
							<label htmlFor="quiet-start">Тихие часы с</label>
							<input
								id="quiet-start"
								type="time"
								defaultValue={minutesToTime(
									settings?.quietHoursStartMinute ?? 0,
								)}
								onBlur={(event) => {
									const minutes = timeToMinutes(event.target.value);
									if (
										minutes !== null &&
										minutes !== settings?.quietHoursStartMinute
									) {
										void saveSettings({ quietHoursStartMinute: minutes });
									}
								}}
							/>
						</span>
						<span className="ops-field">
							<label htmlFor="quiet-end">до</label>
							<input
								id="quiet-end"
								type="time"
								defaultValue={minutesToTime(settings?.quietHoursEndMinute ?? 0)}
								onBlur={(event) => {
									const minutes = timeToMinutes(event.target.value);
									if (
										minutes !== null &&
										minutes !== settings?.quietHoursEndMinute
									) {
										void saveSettings({ quietHoursEndMinute: minutes });
									}
								}}
							/>
						</span>
					</div>

					<label className="ops-checkbox" htmlFor="reminders-enabled">
						<input
							id="reminders-enabled"
							type="checkbox"
							checked={settings?.appointmentReminderEnabled ?? false}
							disabled={busy}
							onChange={(event) =>
								void saveSettings({
									appointmentReminderEnabled: event.target.checked,
								})
							}
						/>{" "}
						Напоминать о приёме автоматически за{" "}
						{(settings?.appointmentReminderLeadHours ?? []).join(", ")} ч
					</label>
					{settings?.appointmentReminderEnabled ? null : (
						<p className="ops-hint">
							Пока выключено. Для включения нужен активный шаблон с назначением
							«Подтверждение приёма» — иначе автоматика не отправит ничего и
							промолчит об этом.
						</p>
					)}
				</div>
			)}
		</>
	);
}
