export function calculateSmsSegments(text: string): {
	segments: number;
	encoding: "gsm7" | "ucs2";
	charCount: number;
} {
	const isUcs2 = /[^\u0020-\u007E\r\n]/.test(text);
	const charCount = text.length;

	if (isUcs2) {
		const segments = charCount <= 70 ? (charCount > 0 ? 1 : 0) : Math.ceil(charCount / 67);
		return { segments, encoding: "ucs2", charCount };
	}

	const segments = charCount <= 160 ? (charCount > 0 ? 1 : 0) : Math.ceil(charCount / 153);
	return { segments, encoding: "gsm7", charCount };
}

export function checkChannelLimits(
	channel: string,
	text: string,
): { ok: boolean; problems: string[] } {
	const problems: string[] = [];
	const len = text.length;

	switch (channel) {
		case "sms": {
			const { segments } = calculateSmsSegments(text);
			if (segments > 5) {
				problems.push(`Сообщение слишком длинное для SMS (${segments} сегментов, лимит: 5 сегментов)`);
			}
			break;
		}
		case "telegram":
		case "whatsapp":
		case "vk":
			if (len > 4096) {
				problems.push(`Превышен лимит символов для канала ${channel} (${len}/4096 символов)`);
			}
			break;
		default:
			break;
	}

	return {
		ok: problems.length === 0,
		problems,
	};
}
