export interface SmsSegmentCalculation {
	readonly characterCount: number;
	readonly charCount: number;
	readonly encoding: "GSM-7" | "UCS-2";
	readonly isUnicode: boolean;
	readonly segmentCount: number;
	readonly charsPerSegment: number;
	readonly maxCharsInCurrentSegment: number;
	readonly remainingInCurrentSegment: number;
	readonly isMultipart: boolean;
}

export function calculateSmsSegments(text: string): SmsSegmentCalculation {
	const characterCount = text.length;
	if (characterCount === 0) {
		return {
			characterCount: 0,
			charCount: 0,
			encoding: "GSM-7",
			isUnicode: false,
			segmentCount: 0,
			charsPerSegment: 160,
			maxCharsInCurrentSegment: 160,
			remainingInCurrentSegment: 160,
			isMultipart: false,
		};
	}

	const gsm7Regex = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖ\u00D1\u00DC§¿a-zäöñüà^{}\\[~\]|€]*$/;
	const isGsm7 = gsm7Regex.test(text);
	const encoding: "GSM-7" | "UCS-2" = isGsm7 ? "GSM-7" : "UCS-2";
	const isUnicode = !isGsm7;

	const singleLimit = isGsm7 ? 160 : 70;
	const multiLimit = isGsm7 ? 153 : 67;

	if (characterCount <= singleLimit) {
		return {
			characterCount,
			charCount: characterCount,
			encoding,
			isUnicode,
			segmentCount: 1,
			charsPerSegment: singleLimit,
			maxCharsInCurrentSegment: singleLimit,
			remainingInCurrentSegment: singleLimit - characterCount,
			isMultipart: false,
		};
	}

	const segmentCount = Math.ceil(characterCount / multiLimit);
	const totalCapacity = segmentCount * multiLimit;
	const remainingInCurrentSegment = totalCapacity - characterCount;

	return {
		characterCount,
		charCount: characterCount,
		encoding,
		isUnicode,
		segmentCount,
		charsPerSegment: multiLimit,
		maxCharsInCurrentSegment: totalCapacity,
		remainingInCurrentSegment,
		isMultipart: true,
	};
}

export function formatSmsSummary(calc: SmsSegmentCalculation): string {
	if (calc.characterCount === 0) {
		return "0 символов • 0 SMS";
	}
	const segWord = calc.segmentCount === 1 ? "сегмент" : calc.segmentCount < 5 ? "сегмента" : "сегментов";
	return `${calc.characterCount} симв. • ${calc.segmentCount} SMS (${segWord}, ${calc.encoding}) • остаток: ${calc.remainingInCurrentSegment}`;
}
