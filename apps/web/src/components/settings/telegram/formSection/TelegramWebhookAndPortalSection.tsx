import React, { type ChangeEvent, useState } from "react";
import { ExternalLink } from "lucide-react";
import { PatientCabinetModal } from "../../../portal/patientCabinet/PatientCabinetModal";

interface TelegramWebhookAndPortalSectionProps {
	// biome-ignore lint/suspicious/noExplicitAny: props bag
	props: any;
}

export function TelegramWebhookAndPortalSection({ props }: TelegramWebhookAndPortalSectionProps) {
	const {
		telegramWebhookBaseUrlDraft,
		setTelegramWebhookBaseUrlDraft,
		telegramPatientPortalBaseUrlDraft,
		setTelegramPatientPortalBaseUrlDraft,
		telegramWelcomeImageUrlDraft,
		setTelegramWelcomeImageUrlDraft,
		telegramTokenTtlDraft,
		setTelegramTokenTtlDraft,
		markTelegramSettingsDirty,
	} = props;

	const [showPatientPortalPreview, setShowPatientPortalPreview] = useState(false);

	return (
		<>
			<label htmlFor="telegram-webhook-base-url-draft">
				Адрес приема сообщений Telegram
				<input
					id="telegram-webhook-base-url-draft"
					type="url"
					inputMode="url"
					placeholder="https://crm.clinic.ru"
					value={telegramWebhookBaseUrlDraft}
					onChange={(event: ChangeEvent<HTMLInputElement>) => {
						setTelegramWebhookBaseUrlDraft(event.target.value);
						markTelegramSettingsDirty();
					}}
				/>
				<small>Публичный HTTPS-адрес CRM для вебхуков Telegram.</small>
			</label>

			<label>
				Портал пациента
				<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
					<input
						type="url"
						inputMode="url"
						placeholder="https://portal.example"
						value={telegramPatientPortalBaseUrlDraft}
						onChange={(event: ChangeEvent<HTMLInputElement>) => {
							setTelegramPatientPortalBaseUrlDraft(event.target.value);
							markTelegramSettingsDirty();
						}}
					/>
					<button
						type="button"
						className="secondary-button min-h-[44px] cursor-pointer"
						style={{ whiteSpace: "nowrap" }}
						onClick={() => setShowPatientPortalPreview(true)}
					>
						<ExternalLink size={14} /> Предпросмотр
					</button>
				</div>
			</label>

			{showPatientPortalPreview && (
				<PatientCabinetModal
					isOpen={showPatientPortalPreview}
					onClose={() => setShowPatientPortalPreview(false)}
				/>
			)}

			<label htmlFor="telegram-welcome-image-url-draft">
				Картинка приветствия
				<input
					id="telegram-welcome-image-url-draft"
					type="url"
					inputMode="url"
					placeholder="https://.../welcome.jpg"
					value={telegramWelcomeImageUrlDraft}
					onChange={(event: ChangeEvent<HTMLInputElement>) => {
						setTelegramWelcomeImageUrlDraft(event.target.value);
						markTelegramSettingsDirty();
					}}
				/>
			</label>

			<label htmlFor="telegram-token-ttl-draft">
				Срок QR-кода, минут
				<input
					id="telegram-token-ttl-draft"
					type="number"
					min={5}
					max={1440}
					step={5}
					value={telegramTokenTtlDraft}
					onChange={(event: ChangeEvent<HTMLInputElement>) => {
						setTelegramTokenTtlDraft(event.target.value);
						markTelegramSettingsDirty();
					}}
				/>
			</label>
		</>
	);
}
