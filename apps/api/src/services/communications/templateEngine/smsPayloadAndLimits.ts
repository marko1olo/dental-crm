const GSM7_BASIC =
	"@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
	"¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENDED = "^{}\\[~]|€";

const gsm7Basic = new Set(GSM7_BASIC.split(""));
const gsm7Extended = new Set(GSM7_EXTENDED.split(""));

export type SmsPayloadDescription = {
	readonly encoding: "gsm7" | "ucs2";
	readonly characters: number;
	readonly segments: number;
	readonly charactersLeftInSegment: number;
};

export function describeSmsPayload(text: string): SmsPayloadDescription {
	let characters = 0;
	let requiresUcs2 = false;

	for (const character of text) {
		if (gsm7Basic.has(character)) {
			characters += 1;
			continue;
		}
		if (gsm7Extended.has(character)) {
			characters += 2;
			continue;
		}
		requiresUcs2 = true;
		break;
	}

	if (requiresUcs2) {
		const units = [...text].reduce(
			(total, character) =>
				total + ((character.codePointAt(0) ?? 0) > 0xffff ? 2 : 1),
			0,
		);
		const single = 70;
		const multipart = 67;
		const segments =
			units <= single
				? Math.max(1, Math.ceil(units / single))
				: Math.ceil(units / multipart);
		const capacity = segments <= 1 ? single : multipart * segments;
		return {
			encoding: "ucs2",
			characters: units,
			segments,
			charactersLeftInSegment: Math.max(0, capacity - units),
		};
	}

	const single = 160;
	const multipart = 153;
	const segments =
		characters <= single
			? Math.max(1, Math.ceil(characters / single))
			: Math.ceil(characters / multipart);
	const capacity = segments <= 1 ? single : multipart * segments;
	return {
		encoding: "gsm7",
		characters,
		segments,
		charactersLeftInSegment: Math.max(0, capacity - characters),
	};
}

export const channelBodyLimits: Readonly<Record<string, number>> = {
	sms: 1000,
	whatsapp: 4096,
	telegram: 4096,
	max: 4000,
	vk: 4096,
	email: 100_000,
	phone: 4000,
	in_person: 4000,
};

export type ChannelFitResult = {
	readonly ok: boolean;
	readonly length: number;
	readonly limit: number;
	readonly sms: SmsPayloadDescription | null;
	readonly problems: string[];
};

export type CheckChannelFitOptions = {
	readonly maxSmsSegments?: number | undefined;
};

export function checkChannelFit(
	channel: string,
	text: string,
	options: CheckChannelFitOptions = {},
): ChannelFitResult {
	const limit = channelBodyLimits[channel] ?? 4096;
	const problems: string[] = [];
	const length = [...text].length;

	if (length > limit) {
		problems.push(
			`Текст длиннее предела канала: ${length} из ${limit} символов.`,
		);
	}

	let sms: SmsPayloadDescription | null = null;
	if (channel === "sms") {
		sms = describeSmsPayload(text);
		const maxSegments = options.maxSmsSegments ?? 4;
		if (sms.segments > maxSegments) {
			problems.push(
				`SMS разобьётся на ${sms.segments} сегмент(ов) при пределе ${maxSegments}. ` +
					"Клиника платит за каждый сегмент — сократите текст или отправьте ссылку.",
			);
		}
	}

	return { ok: problems.length === 0, length, limit, sms, problems };
}
