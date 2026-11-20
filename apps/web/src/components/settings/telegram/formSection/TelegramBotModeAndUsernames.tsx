import React, { type ChangeEvent } from "react";

export type TelegramBotModeAndUsernamesPropsBag = {
	telegramModeLabels?: Record<string, string>;
	telegramModeDraft?: string;
	setTelegramModeDraft?: (val: string) => void;
	normalizedTelegramBotMode?: ((val: string) => string) | string;
	telegramModeHints?: Record<string, string>;
	telegramBotUsernameDraft?: string;
	setTelegramBotUsernameDraft?: (val: string) => void;
	telegramOwnBotUsernameDraft?: string;
	setTelegramOwnBotUsernameDraft?: (val: string) => void;
	telegramBotConfigId?: string;
	setTelegramBotConfigId?: (val: string) => void;
	markTelegramSettingsDirty?: () => void;
	[key: string]: unknown;
};

interface TelegramBotModeAndUsernamesProps {
	props: TelegramBotModeAndUsernamesPropsBag;
}

export function TelegramBotModeAndUsernames({ props }: TelegramBotModeAndUsernamesProps) {
	const {
		telegramModeLabels = {
			shared_dente_bot: "Общий бот DENTE",
			disabled: "Отключен",
			clinic_owned_bot: "Собственный бот клиники",
		},
		telegramModeDraft,
		setTelegramModeDraft,
		normalizedTelegramBotMode,
		telegramModeHints = {},
		telegramBotUsernameDraft,
		setTelegramBotUsernameDraft,
		telegramOwnBotUsernameDraft,
		setTelegramOwnBotUsernameDraft,
		telegramBotConfigId,
		setTelegramBotConfigId,
		markTelegramSettingsDirty,
	} = props;

	return (
		<>
			<div className="settings-field">
				<span className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
					Режим бота
				</span>
				<div className="flex gap-2 flex-wrap mb-1">
					{[
						{ value: "shared_dente_bot", label: telegramModeLabels?.shared_dente_bot ?? "Общий бот DENTE" },
						{ value: "disabled", label: telegramModeLabels?.disabled ?? "Отключен" },
						{ value: "clinic_owned_bot", label: telegramModeLabels?.clinic_owned_bot ?? "Собственный бот клиники" },
					].map((option) => (
						<button
							key={option.value}
							type="button"
							onClick={() => {
								const nextMode =
									typeof normalizedTelegramBotMode === "function"
										? normalizedTelegramBotMode(option.value)
										: option.value;
								setTelegramModeDraft?.(nextMode);
								markTelegramSettingsDirty?.();
							}}
							className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer min-h-[36px] ${
								telegramModeDraft === option.value
									? "bg-[var(--teal)] text-white border-[var(--teal-dark)]"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
						>
							{option.label}
						</button>
					))}
				</div>
				<small className="field-note">
					{telegramModeDraft ? (telegramModeHints?.[telegramModeDraft] ?? "") : ""}
				</small>
			</div>

			<label htmlFor="telegram-bot-username-draft">
				Имя общего бота в Telegram
				<input
					id="telegram-bot-username-draft"
					inputMode="text"
					placeholder="dentecrm_bot"
					value={telegramBotUsernameDraft}
					onChange={(event: ChangeEvent<HTMLInputElement>) => {
						setTelegramBotUsernameDraft?.(event.target.value);
						markTelegramSettingsDirty?.();
					}}
				/>
			</label>

			<label htmlFor="telegram-own-bot-username-draft">
				Имя бота клиники в Telegram
				<input
					id="telegram-own-bot-username-draft"
					inputMode="text"
					placeholder="clinic_bot"
					value={telegramOwnBotUsernameDraft}
					onChange={(event: ChangeEvent<HTMLInputElement>) => {
						setTelegramOwnBotUsernameDraft?.(event.target.value);
						markTelegramSettingsDirty?.();
					}}
				/>
			</label>

			<label htmlFor="telegram-bot-config-id">
				Профиль бота клиники
				<input
					id="telegram-bot-config-id"
					inputMode="text"
					placeholder="clinic-main"
					value={telegramBotConfigId}
					onChange={(event: ChangeEvent<HTMLInputElement>) => setTelegramBotConfigId?.(event.target.value)}
				/>
				<small>Если у клиники один бот, оставьте основной профиль.</small>
			</label>
		</>
	);
}
