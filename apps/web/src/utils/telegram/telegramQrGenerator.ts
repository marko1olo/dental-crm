import type {
	DenteTelegramMessagePreview,
	DenteTelegramOutboxResponse,
} from "@dental/shared";

export function telegramQrSvgToDataUrl(svg: string): string {
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export type TelegramInlineButtonPreview = {
	text: string;
	target: string;
	kind: "url" | "callback" | "unknown";
};

export const telegramInlineButtonKindLabels: Record<
	TelegramInlineButtonPreview["kind"],
	string
> = {
	url: "ссылка",
	callback: "действие",
	unknown: "кнопка",
};

export function telegramInlineButtonRowsFromReplyMarkup(
	markup:
		| DenteTelegramMessagePreview["replyMarkup"]
		| DenteTelegramOutboxResponse["items"][number]["replyMarkup"]
		| null
		| undefined,
): TelegramInlineButtonPreview[][] {
	if (!markup || typeof markup !== "object" || Array.isArray(markup)) return [];
	const rows = (markup as { inline_keyboard?: unknown }).inline_keyboard;
	if (!Array.isArray(rows)) return [];
	return rows.flatMap((row) => {
		if (!Array.isArray(row)) return [];
		const buttons = row
			.map((button) => {
				if (!button || typeof button !== "object" || Array.isArray(button))
					return null;
				const candidate = button as {
					text?: unknown;
					url?: unknown;
					callback_data?: unknown;
				};
				if (typeof candidate.text !== "string") return null;
				if (typeof candidate.url === "string")
					return {
						text: candidate.text,
						target: candidate.url,
						kind: "url" as const,
					};
				if (typeof candidate.callback_data === "string") {
					return {
						text: candidate.text,
						target: candidate.callback_data,
						kind: "callback" as const,
					};
				}
				return { text: candidate.text, target: "", kind: "unknown" as const };
			})
			.filter((button): button is TelegramInlineButtonPreview =>
				Boolean(button),
			);
		return buttons.length ? [buttons] : [];
	});
}

export function telegramInlineButtonsFromReplyMarkup(
	markup:
		| DenteTelegramMessagePreview["replyMarkup"]
		| DenteTelegramOutboxResponse["items"][number]["replyMarkup"]
		| null
		| undefined,
): TelegramInlineButtonPreview[] {
	return telegramInlineButtonRowsFromReplyMarkup(markup).flat();
}

export function telegramInlineButtonsFromPreview(
	preview: DenteTelegramMessagePreview,
): TelegramInlineButtonPreview[] {
	return telegramInlineButtonsFromReplyMarkup(preview.replyMarkup);
}
