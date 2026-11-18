import React, { type ChangeEvent } from "react";

interface TelegramNotificationTimingsSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	props: any;
}

export function TelegramNotificationTimingsSection({ props }: TelegramNotificationTimingsSectionProps) {
	const {
		telegramReminderLeadTimesDraft,
		setTelegramReminderLeadTimesDraft,
		telegramReviewRequestDelayDraft,
		setTelegramReviewRequestDelayDraft,
		telegramPostVisitCheckupDelayFields = [],
		typedTelegramPostVisitCheckupDelayDrafts = {},
		updateTelegramPostVisitCheckupDelayDraft,
		telegramStaffEscalationChannelDraft,
		setTelegramStaffEscalationChannelDraft,
		markTelegramSettingsDirty,
	} = props;

	// biome-ignore lint/suspicious/noExplicitAny: post-visit delay list
	const delayFields = (telegramPostVisitCheckupDelayFields || []) as any[];

	return (
		<>
			<label htmlFor="telegram-reminder-lead-times-draft">
				Напоминания до приема, часы
				<input
					id="telegram-reminder-lead-times-draft"
					inputMode="text"
					placeholder="24, 2"
					value={telegramReminderLeadTimesDraft}
					onChange={(event: ChangeEvent<HTMLInputElement>) => {
						setTelegramReminderLeadTimesDraft(event.target.value);
						markTelegramSettingsDirty();
					}}
				/>
				<small>Напоминания до приема в часах: от 1 до 168, максимум 6 значений.</small>
			</label>

			<label htmlFor="telegram-review-request-delay-draft">
				Просьба оценить клинику, часы после визита
				<input
					id="telegram-review-request-delay-draft"
					type="number"
					min={1}
					max={720}
					step={1}
					value={telegramReviewRequestDelayDraft}
					onChange={(event: ChangeEvent<HTMLInputElement>) => {
						setTelegramReviewRequestDelayDraft(event.target.value);
						markTelegramSettingsDirty();
					}}
				/>
				<small>От 1 до 720 часов после закрытого визита или оплаты.</small>
			</label>

			<fieldset className="telegram-checkup-delay-fields full">
				<legend>Контроль после лечения</legend>
				<small>Бот отправит короткий вопрос о самочувствии через выбранное число часов.</small>
				{delayFields.map((field) => (
					<label htmlFor={`telegram-checkup-delay-${field.key}`} key={field.key}>
						{field.label}
						<input
							id={`telegram-checkup-delay-${field.key}`}
							type="number"
							min={1}
							max={720}
							step={1}
							value={typedTelegramPostVisitCheckupDelayDrafts[field.key] ?? ""}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								updateTelegramPostVisitCheckupDelayDraft(field.key, event.target.value)
							}
						/>
						<small>{field.help}</small>
					</label>
				))}
			</fieldset>

			<label htmlFor="telegram-staff-escalation-channel-draft">
				Канал эскалации
				<input
					id="telegram-staff-escalation-channel-draft"
					inputMode="text"
					placeholder="@clinic_admins"
					value={telegramStaffEscalationChannelDraft}
					onChange={(event: ChangeEvent<HTMLInputElement>) => {
						setTelegramStaffEscalationChannelDraft(event.target.value);
						markTelegramSettingsDirty();
					}}
				/>
			</label>
		</>
	);
}
