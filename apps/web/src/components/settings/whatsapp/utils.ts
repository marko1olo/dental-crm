import type { WhatsappStaffRouting } from "../../../hooks/useWhatsappSettings.js";
import { messengerRoutingChanged } from "../MessengerRoutingRules.js";

/**
 * Вычисляет наличие несохраненных изменений в форме настроек WhatsApp.
 */
export function computeWhatsappSettingsDirty(params: {
	phoneNumberIdDraft: string;
	settingsPhoneNumberId: string | null | undefined;
	webhookVerifyTokenDraft: string;
	settingsWebhookVerifyToken: string | null | undefined;
	isActiveDraft: boolean;
	settingsIsActive: boolean | undefined;
	enabledFeaturesDraft: string[];
	settingsEnabledFeatures: string[] | undefined;
	staffRoutingDraft: WhatsappStaffRouting;
	settingsStaffRouting: WhatsappStaffRouting | undefined;
	accessTokenDraft: string;
}): boolean {
	const featuresChanged =
		params.enabledFeaturesDraft.length !==
			(params.settingsEnabledFeatures?.length ?? 0) ||
		params.enabledFeaturesDraft.some(
			(f) => !(params.settingsEnabledFeatures ?? []).includes(f),
		);

	return (
		params.phoneNumberIdDraft !== (params.settingsPhoneNumberId ?? "") ||
		params.webhookVerifyTokenDraft !==
			(params.settingsWebhookVerifyToken ?? "") ||
		params.isActiveDraft !== (params.settingsIsActive ?? false) ||
		featuresChanged ||
		messengerRoutingChanged(
			params.staffRoutingDraft,
			params.settingsStaffRouting,
		) ||
		params.accessTokenDraft.trim() !== ""
	);
}

/**
 * Проверяет, заблокирована ли кнопка сохранения настроек WhatsApp.
 * По Мандату 8e кнопка сохранения не должна блокироваться из-за отсутствия
 * изменений (!dirty). Блокировка допустима ТОЛЬКО если сохранение небезопасно
 * (!canSave — черновики ещё не прочитаны с сервера) либо уже идёт процесс сохранения (saveState === "saving").
 */
export function isWhatsappSettingsSaveDisabled(
	canSave: boolean,
	saveState: string,
): boolean {
	return !canSave || saveState === "saving";
}
