/**
 * types.ts
 *
 * Layer 0: Data Transfer Objects, inline button/keyboard contracts,
 * and preset definitions for Telegram triage engine.
 */

export type TelegramInlineButton = {
	text: string;
	callback_data?: string;
	url?: string;
};

export type TelegramInlineKeyboard = {
	inline_keyboard: TelegramInlineButton[][];
};

export type TriageScreenResult = {
	text: string;
	replyMarkup: TelegramInlineKeyboard;
};

export type TreatmentCostOption = {
	id: string;
	label: string;
	priceRub: number;
	description?: string;
};

export type ImplantSystemPreset = {
	code: string;
	brand: string;
	country: string;
	priceRub: number;
	warrantyYears: number | string;
};

export type CrownTypePreset = {
	code: string;
	name: string;
	priceRub: number;
	aestheticRating: number; // 1-5
};

export type CariesPreset = {
	code: string;
	label: string;
	priceRub: number;
};

export type WhiteningPreset = {
	code: string;
	label: string;
	priceRub: number;
};

export type EnableHumanModeParams = {
	chatFingerprint: string;
	organizationId: string;
	clinicId?: string | null;
	botConfigId?: string | null;
	chatId?: string | null;
	reason?: string;
};

export type HandlePhotoIntakeParams = {
	botToken: string;
	organizationId: string;
	clinicId?: string | null;
	botConfigId?: string | null;
	chatId: string;
	fileId: string;
	caption?: string | null;
	updateId: number;
	storageDir?: string;
};

export type HandlePhotoIntakeResult = {
	ok: boolean;
	savedPath?: string | undefined;
	responseScreen: TriageScreenResult;
};

export type HandleCallbackQueryParams = {
	callbackData: string;
	callbackQueryId: string | null;
	chatFingerprint: string;
	chatId: string;
	messageId: number | null;
	botToken: string;
	organizationId: string;
	clinicId?: string | null;
	botConfigId?: string | null;
};

export type HandleCallbackQueryResult = {
	handled: boolean;
	screen?: TriageScreenResult;
};
