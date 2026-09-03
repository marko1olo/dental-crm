/**
 * documentScannerEngine.ts
 *
 * Core engine for clinical document scanning, mobile camera framing,
 * image binarization/auto-contrast, and statutory Russian ID/Insurance OCR regex parsing.
 */

export type DocumentType =
	| "passport_rf"
	| "oms_policy"
	| "dms_policy"
	| "snils"
	| "referral_057u"
	| "other";

export type DocumentPresetIcon =
	| "CreditCard"
	| "Shield"
	| "FileSpreadsheet"
	| "FileText"
	| "ClipboardList"
	| "Paperclip";

export interface DocumentPreset {
	readonly id: DocumentType;
	readonly title: string;
	readonly shortTitle: string;
	readonly icon: DocumentPresetIcon;
	readonly aspectRatio: number; // width / height
	readonly placeholderText: string;
	readonly expectedFormatHint: string;
}

export const DOCUMENT_PRESETS: Record<DocumentType, DocumentPreset> = {
	passport_rf: {
		id: "passport_rf",
		title: "Паспорт гражданина РФ",
		shortTitle: "Паспорт РФ",
		icon: "CreditCard",
		aspectRatio: 1.42, // ~125mm x 88mm
		placeholderText: "Поместите главный разворот паспорта (с фото и кем выдан) в рамку",
		expectedFormatHint: "Серия: 4 цифры, Номер: 6 цифр, Код: 6 цифр",
	},
	oms_policy: {
		id: "oms_policy",
		title: "Полис ОМС (единый образец / пластик)",
		shortTitle: "Полис ОМС",
		icon: "Shield",
		aspectRatio: 1.58, // ID-1 format 85.6mm x 53.98mm
		placeholderText: "Поместите лицевую сторону полиса ОМС с 16-значным номером в рамку",
		expectedFormatHint: "16-значный номер полиса ОМС",
	},
	dms_policy: {
		id: "dms_policy",
		title: "Полис ДМС / Гарантийное письмо",
		shortTitle: "Полис ДМС",
		icon: "FileSpreadsheet",
		aspectRatio: 1.414, // A4 ratio
		placeholderText: "Поместите карточку ДМС или гарантийное письмо страховой в рамку",
		expectedFormatHint: "Номер договора / полиса ДМС и название СК",
	},
	snils: {
		id: "snils",
		title: "СНИЛС (зелёное свидетельство / выписка АДИ-РЕГ)",
		shortTitle: "СНИЛС",
		icon: "FileText",
		aspectRatio: 1.45,
		placeholderText: "Поместите свидетельство СНИЛС в рамку",
		expectedFormatHint: "Формат: XXX-XXX-XXX YY (11 цифр)",
	},
	referral_057u: {
		id: "referral_057u",
		title: "Направление формы 057/у-04",
		shortTitle: "Форма 057/у",
		icon: "ClipboardList",
		aspectRatio: 1.414,
		placeholderText: "Поместите бланк направления 057/у-04 в рамку",
		expectedFormatHint: "Штамп направляющей МО, номер и дата",
	},
	other: {
		id: "other",
		title: "Прочий медицинский документ / выписка",
		shortTitle: "Документ",
		icon: "Paperclip",
		aspectRatio: 1.414,
		placeholderText: "Поместите документ в рамку кадрирования",
		expectedFormatHint: "Любой формат медицинского документа",
	},
};

export const DOCUMENT_PRESETS_LIST: DocumentPreset[] = [
	DOCUMENT_PRESETS.passport_rf,
	DOCUMENT_PRESETS.oms_policy,
	DOCUMENT_PRESETS.dms_policy,
	DOCUMENT_PRESETS.snils,
	DOCUMENT_PRESETS.referral_057u,
	DOCUMENT_PRESETS.other,
];

export interface ExtractedPassportData {
	series?: string | undefined;
	number?: string | undefined;
	issueDate?: string | undefined;
	issuerCode?: string | undefined;
	birthDate?: string | undefined;
	fullName?: string | undefined;
	isValidSeriesNumber: boolean;
}

export interface ExtractedOmsData {
	policyNumber?: string | undefined;
	expirationDate?: string | undefined;
	insuranceCompany?: string | undefined;
	isValid16Digit: boolean;
}

export interface ExtractedSnilsData {
	raw: string;
	formatted?: string | undefined;
	digitsOnly?: string | undefined;
	isValidChecksum: boolean;
}

/**
 * Validates Russian SNILS 11-digit checksum algorithm according to Pension Fund rules.
 */
export function validateSnilsChecksum(digits: string): boolean {
	const clean = digits.replace(/\D/g, "");
	if (clean.length !== 11) return false;

	// SNILS <= 001-001-998 are exempt from checksum validation
	const num = Number.parseInt(clean.slice(0, 9), 10);
	if (num <= 1001998) return true;

	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += Number.parseInt(clean[i]!, 10) * (9 - i);
	}

	let checkDigit = 0;
	if (sum < 100) {
		checkDigit = sum;
	} else if (sum === 100 || sum === 101) {
		checkDigit = 0;
	} else {
		const rem = sum % 101;
		checkDigit = rem === 100 || rem === 101 ? 0 : rem;
	}

	const givenCheck = Number.parseInt(clean.slice(9, 11), 10);
	return checkDigit === givenCheck;
}

/**
 * Parses Russian Passport series, number, issue date and department code from OCR text.
 */
export function parsePassportOcrText(text: string): ExtractedPassportData {
	if (!text || typeof text !== "string") {
		return { isValidSeriesNumber: false };
	}

	const cleaned = text.replace(/[\r\n]+/g, " ");

	// 1. Series and Number (e.g. "45 12 123456" or "4512 123456" or "Серия 45 12 № 123456")
	let series: string | undefined;
	let number: string | undefined;

	const snMatch = cleaned.match(/(?:серия|паспорт)?\s*([0-9]{2}\s*[0-9]{2})\s*(?:№|N|no)?\s*([0-9]{6})\b/i);
	if (snMatch) {
		series = snMatch[1]!.replace(/\s+/g, " ");
		number = snMatch[2];
	} else {
		// Fallback: 10 consecutive digits
		const tenMatch = cleaned.match(/\b([0-9]{4})[\s-]*([0-9]{6})\b/);
		if (tenMatch) {
			series = `${tenMatch[1]!.slice(0, 2)} ${tenMatch[1]!.slice(2, 4)}`;
			number = tenMatch[2];
		}
	}

	// 2. Department code (Код подразделения: "770-001" or "770001")
	let issuerCode: string | undefined;
	const codeMatch = cleaned.match(/(?:код\s*(?:подразделения)?|к\/п)[\s.:№]*([0-9]{3})[\s-]*([0-9]{3})\b/i);
	if (codeMatch && codeMatch[1] && codeMatch[2]) {
		issuerCode = `${codeMatch[1]}-${codeMatch[2]}`;
	} else {
		// Fallback: look for 3-3 hyphenated pattern that is not the passport number
		const rawCodeMatch = cleaned.match(/\b([0-9]{3})-([0-9]{3})\b/);
		if (rawCodeMatch && rawCodeMatch[1] && rawCodeMatch[2]) {
			issuerCode = `${rawCodeMatch[1]}-${rawCodeMatch[2]}`;
		}
	}

	// 3. Dates (Issue date: DD.MM.YYYY)
	let issueDate: string | undefined;
	const dateMatches = cleaned.match(/\b(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[012])\.(19[4-9][0-9]|20[0-2][0-9])\b/g);
	if (dateMatches && dateMatches.length > 0) {
		issueDate = dateMatches[0];
	}

	const isValidSeriesNumber = Boolean(series && number && number.length === 6);

	return {
		series,
		number,
		issuerCode,
		issueDate,
		isValidSeriesNumber,
	};
}

/**
 * Parses OMS 16-digit unified insurance policy number from OCR text.
 */
export function parseOmsPolicyOcrText(text: string): ExtractedOmsData {
	if (!text || typeof text !== "string") {
		return { isValid16Digit: false };
	}

	const digitsOnly = text.replace(/[^0-9]/g, "");
	let policyNumber: string | undefined;

	// Look for 16-digit sequence
	const match16 = text.match(/\b([0-9]{4}\s*[0-9]{4}\s*[0-9]{4}\s*[0-9]{4})\b/);
	if (match16) {
		policyNumber = match16[1]!.replace(/\s+/g, "");
	} else if (digitsOnly.length === 16) {
		policyNumber = digitsOnly;
	} else {
		const seqMatch = digitsOnly.match(/([0-9]{16})/);
		if (seqMatch) {
			policyNumber = seqMatch[1];
		}
	}

	return {
		policyNumber,
		isValid16Digit: Boolean(policyNumber && policyNumber.length === 16),
	};
}

/**
 * Parses SNILS from OCR text and validates checksum.
 */
export function parseSnilsOcrText(text: string): ExtractedSnilsData {
	if (!text || typeof text !== "string") {
		return { raw: text || "", isValidChecksum: false };
	}

	const digitsOnly = text.replace(/[^0-9]/g, "");
	let formatted: string | undefined;
	let validDigits: string | undefined;

	const snilsMatch = text.match(/\b([0-9]{3})[\s-]*([0-9]{3})[\s-]*([0-9]{3})[\s-]*([0-9]{2})\b/);
	if (snilsMatch && snilsMatch[1] && snilsMatch[2] && snilsMatch[3] && snilsMatch[4]) {
		validDigits = `${snilsMatch[1]}${snilsMatch[2]}${snilsMatch[3]}${snilsMatch[4]}`;
		formatted = `${snilsMatch[1]}-${snilsMatch[2]}-${snilsMatch[3]} ${snilsMatch[4]}`;
	} else if (digitsOnly.length === 11) {
		validDigits = digitsOnly;
		formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 9)} ${digitsOnly.slice(9, 11)}`;
	}

	const isValidChecksum = validDigits ? validateSnilsChecksum(validDigits) : false;

	return {
		raw: text,
		formatted,
		digitsOnly: validDigits,
		isValidChecksum,
	};
}

export type DocumentFilterMode = "original" | "grayscale" | "auto_contrast" | "high_contrast_bw";

/**
 * Applies document image enhancement / binarization directly to an HTML Canvas element.
 * Makes scanned document text, passport stamps, and insurance details crystal clear.
 */
export function applyDocumentEnhancementToCanvas(
	canvas: HTMLCanvasElement,
	mode: DocumentFilterMode,
): void {
	if (mode === "original") return;

	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return;

	const width = canvas.width;
	const height = canvas.height;
	if (!width || !height) return;

	const imgData = ctx.getImageData(0, 0, width, height);
	const data = imgData.data;
	const len = data.length;

	if (mode === "grayscale") {
		for (let i = 0; i < len; i += 4) {
			const r = data[i] ?? 0;
			const g = data[i + 1] ?? 0;
			const b = data[i + 2] ?? 0;
			const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
			data[i] = gray;
			data[i + 1] = gray;
			data[i + 2] = gray;
		}
	} else if (mode === "auto_contrast") {
		// 1. Find min and max luminance for histogram stretching
		let minLum = 255;
		let maxLum = 0;
		for (let i = 0; i < len; i += 4) {
			const r = data[i] ?? 0;
			const g = data[i + 1] ?? 0;
			const b = data[i + 2] ?? 0;
			const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
			if (lum < minLum) minLum = lum;
			if (lum > maxLum) maxLum = lum;
		}

		const range = Math.max(1, maxLum - minLum);

		// 2. Linear histogram stretch + gamma 0.85 boost for crisp text
		for (let i = 0; i < len; i += 4) {
			for (let c = 0; c < 3; c++) {
				const val = data[i + c] ?? 0;
				const stretched = Math.max(0, Math.min(255, ((val - minLum) / range) * 255));
				// Contrast curve
				const boosted = 255 * (stretched / 255) ** 0.85;
				data[i + c] = Math.round(Math.max(0, Math.min(255, boosted)));
			}
		}
	} else if (mode === "high_contrast_bw") {
		// Otsu-like adaptive threshold binarization
		let sum = 0;
		for (let i = 0; i < len; i += 4) {
			const r = data[i] ?? 0;
			const g = data[i + 1] ?? 0;
			const b = data[i + 2] ?? 0;
			sum += 0.299 * r + 0.587 * g + 0.114 * b;
		}
		const avgLum = Math.round(sum / (len / 4));
		const threshold = Math.max(80, Math.min(180, avgLum - 10));

		for (let i = 0; i < len; i += 4) {
			const r = data[i] ?? 0;
			const g = data[i + 1] ?? 0;
			const b = data[i + 2] ?? 0;
			const lum = 0.299 * r + 0.587 * g + 0.114 * b;
			const bw = lum >= threshold ? 255 : 0;
			data[i] = bw;
			data[i + 1] = bw;
			data[i + 2] = bw;
		}
	}

	ctx.putImageData(imgData, 0, 0);
}

/**
 * Calculates normalized crop rect inside video stream viewport based on document aspect ratio.
 */
export function calculateDocumentGuideFrame(
	viewportWidth: number,
	viewportHeight: number,
	targetAspectRatio: number,
): { x: number; y: number; width: number; height: number } {
	const padding = 24;
	const maxWidth = Math.max(100, viewportWidth - padding * 2);
	const maxHeight = Math.max(100, viewportHeight - padding * 2);

	let frameWidth = maxWidth;
	let frameHeight = frameWidth / targetAspectRatio;

	if (frameHeight > maxHeight) {
		frameHeight = maxHeight;
		frameWidth = frameHeight * targetAspectRatio;
	}

	const x = Math.round((viewportWidth - frameWidth) / 2);
	const y = Math.round((viewportHeight - frameHeight) / 2);

	return {
		x,
		y,
		width: Math.round(frameWidth),
		height: Math.round(frameHeight),
	};
}
