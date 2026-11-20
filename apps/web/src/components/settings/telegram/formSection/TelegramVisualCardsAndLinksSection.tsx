import React, { type ChangeEvent } from "react";
import { ExternalLink } from "lucide-react";

export interface TelegramVisualCardField {
	key: string;
	label: string;
	placeholder?: string;
	help?: string;
}

export type TelegramVisualCardsPropsBag = {
	telegramVisualCardFields?: readonly TelegramVisualCardField[];
	telegramVisualCardUrlDrafts?: Record<string, string>;
	updateTelegramVisualCardUrlDraft?: (key: string, value: string) => void;
	telegramReviewUrlDraft?: string;
	setTelegramReviewUrlDraft?: (val: string) => void;
	telegramMapsUrlDraft?: string;
	setTelegramMapsUrlDraft?: (val: string) => void;
	saveTelegramSettings?: () => Promise<void> | void;
	isTelegramSettingsSaving?: boolean;
	telegramSettingsSaveState?: string;
	telegramSettingsSaveError?: string | null;
	telegramSettingsDirty?: boolean;
	markTelegramSettingsDirty?: () => void;
	[key: string]: unknown;
};

interface TelegramVisualCardsAndLinksSectionProps {
	props: TelegramVisualCardsPropsBag;
}

export function TelegramVisualCardsAndLinksSection({ props }: TelegramVisualCardsAndLinksSectionProps) {
	const {
		telegramVisualCardFields = [],
		telegramVisualCardUrlDrafts = {},
		updateTelegramVisualCardUrlDraft,
		telegramReviewUrlDraft,
		setTelegramReviewUrlDraft,
		telegramMapsUrlDraft,
		setTelegramMapsUrlDraft,
		saveTelegramSettings,
		isTelegramSettingsSaving,
		telegramSettingsSaveState,
		telegramSettingsSaveError,
		telegramSettingsDirty,
		markTelegramSettingsDirty,
	} = props;

	const visualFields = (telegramVisualCardFields || []) as readonly TelegramVisualCardField[];

	return (
		<>
			<div className="telegram-visual-card-fields">
				{visualFields.map((field) => (
					<label htmlFor={`telegram-visual-card-${field.key}`} key={field.key}>
						{field.label}
						<input
							id={`telegram-visual-card-${field.key}`}
							type="url"
							inputMode="url"
							placeholder={field.placeholder}
							value={telegramVisualCardUrlDrafts[field.key] ?? ""}
							onChange={(event: ChangeEvent<HTMLInputElement>) =>
								updateTelegramVisualCardUrlDraft?.(field.key, event.target.value)
							}
						/>
						<small>{field.help} Если поле пустое, используется картинка приветствия.</small>
					</label>
				))}
			</div>

			<div className="telegram-external-links">
				<label htmlFor="telegram-review-url-draft">
					Ссылка на отзыв
					<input
						id="telegram-review-url-draft"
						type="url"
						inputMode="url"
						placeholder="https://..."
						value={telegramReviewUrlDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramReviewUrlDraft?.(event.target.value);
							markTelegramSettingsDirty?.();
						}}
					/>
				</label>
				<label htmlFor="telegram-maps-url-draft">
					Ссылка на карту
					<input
						id="telegram-maps-url-draft"
						type="url"
						inputMode="url"
						placeholder="https://..."
						value={telegramMapsUrlDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramMapsUrlDraft?.(event.target.value);
							markTelegramSettingsDirty?.();
						}}
					/>
				</label>
				<button
					className="secondary-button min-h-[44px] cursor-pointer"
					type="button"
					onClick={() => void saveTelegramSettings?.()}
					disabled={isTelegramSettingsSaving}
				>
					<ExternalLink aria-hidden="true" />{" "}
					{isTelegramSettingsSaving ? "..." : "Сохранить"}
				</button>
			</div>

			<p className={`telegram-save-state save-${telegramSettingsSaveState}`}>
				{telegramSettingsSaveState === "saving"
					? "Автосохранение настроек..."
					: telegramSettingsSaveState === "saved"
						? "Настройки Telegram сохранены."
						: telegramSettingsSaveState === "error"
							? (telegramSettingsSaveError ?? "Настройки Telegram не сохранены.")
							: telegramSettingsDirty
								? "Изменения будут сохранены автоматически."
								: "Выбранная конфигурация сохранена и будет применяться до изменения."}
			</p>
		</>
	);
}
