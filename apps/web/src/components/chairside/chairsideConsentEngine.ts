/**
 * ============================================================================
 * CHAIRSIDE TABLET CONSENT & SMS-PEP ENGINE (63-ФЗ / 323-ФЗ / 1051н / 152-ФЗ / 804н)
 * Движок кресельного планшетного подписания пакета медицинских документов:
 * 1. Информированное добровольное согласие (ИДС, Приказ Минздрава РФ № 1051н / 323-ФЗ ст. 20)
 * 2. Согласие на обработку персональных данных (152-ФЗ, ст. 6, 9, 10 / ЕГИСЗ)
 * 3. Согласованный план лечения и смета (Номенклатура 804н / ПП РФ № 736) с суммами в копейках
 * 4. Подписание Простой Электронной Подписью (ПЭП по 63-ФЗ) через 4-значный СМС-код (OTP, 5 минут)
 * 5. Фиксация неизменяемого криптографического SHA-256 хэша пакета и привязка к карте 043/у
 * 6. Формирование официального юридического штампа ПЭП по 63-ФЗ
 * 7. Генерация готового печатного A4/PDF документа
 * 8. Защита выхода из режима пациента PIN-кодом врача
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA CONTRACTS & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type ChairsideDocumentType = "ids_1051n" | "pdn_152fz" | "treatment_estimate";

export interface ChairsideTreatmentItem {
	id: string;
	serviceCode: string; // Номенклатура 804н e.g. "A16.07.002.001"
	title: string;
	toothNumber?: string | undefined; // FDI e.g. "16", "24", "46"
	stageTitle?: string | undefined; // Клинический этап e.g. "Этап 1: Санация и терапия"
	quantity: number; // Целое число >= 1
	unitPriceKopecks: number; // Целочисленные копейки >= 0
	discountPercent?: number | undefined; // 0..100
	totalKopecks: number; // Целочисленные копейки с учетом скидки и количества
}

export interface ChairsidePatientProfile {
	fullName: string;
	birthDate: string;
	passport?: string | undefined;
	phone?: string | undefined;
	snils?: string | undefined;
	address?: string | undefined;
	cardNumber?: string | undefined; // № медицинской карты 043/у
}

export interface ChairsideDoctorProfile {
	fullName: string;
	specialty: string;
	licenseNumber?: string | undefined;
}

export interface ChairsideClinicProfile {
	legalName: string;
	brandName: string;
	ogrn: string;
	inn: string;
	address: string;
	licenseNumber: string;
	licenseDate: string;
	licenseIssuer: string;
}

export interface ChairsideClinicalContext {
	diagnosisIcd: string; // e.g. "K04.0 Пульпит", "K02.1 Кариес дентина"
	teeth: string[]; // e.g. ["16", "17"]
	anamnesisAllergies?: string | undefined;
	specialNotes?: string | undefined;
}

export interface ChairsideDocumentSection {
	id: string;
	title: string;
	content: string;
	bullets?: readonly string[] | undefined;
}

export interface ChairsideDocument {
	type: ChairsideDocumentType;
	code: string;
	title: string;
	statutoryBasis: string;
	sections: readonly ChairsideDocumentSection[];
	isSigned: boolean;
	signedAt?: string | undefined;
	integrityHash?: string | undefined;
}

export interface ChairsideSmsOtpState {
	code: string; // 4-значный OTP код (1000..9999)
	phone: string; // Исходный номер телефона
	phoneMasked: string; // Маскированный телефон e.g. "+7 (***) ***-**-12"
	sentAt: number; // Таймштамп отправки (ms)
	expiresAt: number; // Таймштамп истечения (ms, sentAt + 5 минут)
	attemptsCount: number; // Количество совершенных попыток ввода
	maxAttempts: number; // Максимально допустимое число попыток (3)
	isVerified: boolean; // Флаг успешной верификации
}

export interface ChairsidePepSignatureRecord {
	verificationMethod: "sms_63fz_pep";
	phone: string;
	phoneMasked: string;
	otpCodeConfirmed: string; // e.g. "****" или фактический проверенный 4-значный код
	timestamp: number;
	signedAtIso: string;
	signedAtFormatted: string; // DD.MM.YYYY HH:mm
	signedByFullName: string;
	form043uRecordId: string;
	integrityHash: string; // SHA-256 отпечаток документа
	legalStampText: string; // Текст юридического штампа 63-ФЗ
	legalBasis: string; // Ссылка на законодательную базу
	documentsDigest: string;
}

export type ChairsidePackageStatus =
	| "draft"
	| "ready_for_patient"
	| "patient_reviewing"
	| "sms_sent"
	| "signed"
	| "rejected";

export interface ChairsideConsentPackage {
	packageId: string;
	createdAt: string; // ISO
	patient: ChairsidePatientProfile;
	doctor: ChairsideDoctorProfile;
	clinic: ChairsideClinicProfile;
	clinicalContext: ChairsideClinicalContext;
	treatmentItems: ChairsideTreatmentItem[];
	totalEstimateKopecks: number;
	totalEstimateWords: string;
	documents: ChairsideDocument[];
	smsOtp?: ChairsideSmsOtpState | undefined;
	signature?: ChairsidePepSignatureRecord | undefined;
	status: ChairsidePackageStatus;
	exitPinHash?: string | undefined; // Doctor exit PIN SHA-256
}

export interface CreateChairsidePackageParams {
	packageId?: string | undefined;
	patient: ChairsidePatientProfile;
	doctor: ChairsideDoctorProfile;
	clinic?: Partial<ChairsideClinicProfile> | undefined;
	clinicalContext?: Partial<ChairsideClinicalContext> | undefined;
	treatmentItems?: ChairsideTreatmentItem[] | undefined;
	exitPin?: string | undefined; // e.g. "1234"
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. FINANCIAL MATH & EXACT KOPECK ARITHMETIC
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CHAIRSIDE_CLINIC: ChairsideClinicProfile = {
	legalName: "ООО «Стоматологическая клиника ДЕНТЕ»",
	brandName: "ДЕНТЕ Клиник",
	ogrn: "1217700456789",
	inn: "7701987654",
	address: "г. Москва, ул. Стоматологов, д. 10, корп. 1",
	licenseNumber: "ЛО41-01137-77/00368421",
	licenseDate: "12.10.2021",
	licenseIssuer: "Департамент здравоохранения города Москвы",
};

/**
 * Расчет суммы позиции в целочисленных копейках с учетом скидки
 */
export function calculateItemTotalKopecks(
	unitPriceKopecks: number,
	quantity: number,
	discountPercent = 0,
): number {
	const sanitizedPrice = Math.max(0, Math.round(unitPriceKopecks));
	const sanitizedQty = Math.max(1, Math.round(quantity));
	const sanitizedDiscount = Math.min(100, Math.max(0, discountPercent));

	const subtotal = sanitizedPrice * sanitizedQty;
	if (sanitizedDiscount === 0) {
		return subtotal;
	}

	const discountAmount = Math.round((subtotal * sanitizedDiscount) / 100);
	return Math.max(0, subtotal - discountAmount);
}

/**
 * Расчет общей суммы сметы в целочисленных копейках
 */
export function calculateEstimateTotalKopecks(items: readonly ChairsideTreatmentItem[]): number {
	if (!items || items.length === 0) return 0;
	return items.reduce((acc, item) => {
		const itemTotal = item.totalKopecks !== undefined
			? Math.max(0, Math.round(item.totalKopecks))
			: calculateItemTotalKopecks(item.unitPriceKopecks, item.quantity, item.discountPercent);
		return acc + itemTotal;
	}, 0);
}

/**
 * Форматирование копеек в рубли: 1250050 -> "12 500,50 ₽"
 */
export function formatKopecksToRubles(kopecks: number): string {
	const totalKop = Math.max(0, Math.round(kopecks || 0));
	const rubles = Math.floor(totalKop / 100);
	const remainderKop = totalKop % 100;

	const rubFormatted = rubles
		.toLocaleString("ru-RU", { maximumFractionDigits: 0 })
		.replace(/[\u00A0\u202F]/g, " ");

	return rubFormatted + "," + String(remainderKop).padStart(2, "0") + " ₽";
}

/**
 * Преобразование целого числа в русские слова (1..999 999 999)
 */
function numberToRussianWords(n: number, isFemale = false): string {
	if (n === 0) return "ноль";

	const unitsMale = [
		"", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять",
		"десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать",
		"шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
	];

	const unitsFemale = [
		"", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять",
		"десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать",
		"шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
	];

	const tens = [
		"", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто",
	];

	const hundreds = [
		"", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот",
	];

	const units = isFemale ? unitsFemale : unitsMale;
	const parts: string[] = [];

	if (n >= 100) {
		const h = Math.floor(n / 100);
		parts.push(hundreds[h] || "");
		n %= 100;
	}

	if (n >= 20) {
		const t = Math.floor(n / 10);
		parts.push(tens[t] || "");
		n %= 10;
		if (n > 0) {
			parts.push(units[n] || "");
		}
	} else if (n > 0) {
		parts.push(units[n] || "");
	}

	return parts.filter(Boolean).join(" ");
}

/**
 * Склонение существительных по числу
 */
function declineRussianWord(count: number, one: string, twoFour: string, fiveMore: string): string {
	const n = Math.abs(Math.floor(count));
	const mod10 = n % 10;
	const mod100 = n % 100;

	if (mod100 >= 11 && mod100 <= 19) {
		return fiveMore;
	}
	if (mod10 === 1) {
		return one;
	}
	if (mod10 >= 2 && mod10 <= 4) {
		return twoFour;
	}
	return fiveMore;
}

/**
 * Преобразование суммы в копейках в сумму прописью по стандартам финансовой отчетности РФ
 * Пример: 1250050 -> "Двенадцать тысяч пятьсот рублей 50 копеек"
 */
export function kopecksToRussianWords(kopecks: number): string {
	const totalKop = Math.max(0, Math.round(kopecks || 0));
	const rubles = Math.floor(totalKop / 100);
	const remainderKop = totalKop % 100;

	if (rubles === 0) {
		const kopWord = declineRussianWord(remainderKop, "копейка", "копейки", "копеек");
		return "Ноль рублей " + String(remainderKop).padStart(2, "0") + " " + kopWord;
	}

	const groups: { val: number; one: string; twoFour: string; fiveMore: string; isFemale: boolean }[] = [];
	let rem = rubles;

	const billions = Math.floor(rem / 1_000_000_000);
	if (billions > 0) {
		groups.push({ val: billions, one: "миллиард", twoFour: "миллиарда", fiveMore: "миллиардов", isFemale: false });
		rem %= 1_000_000_000;
	}

	const millions = Math.floor(rem / 1_000_000);
	if (millions > 0) {
		groups.push({ val: millions, one: "миллион", twoFour: "миллиона", fiveMore: "миллионов", isFemale: false });
		rem %= 1_000_000;
	}

	const thousands = Math.floor(rem / 1_000);
	if (thousands > 0) {
		groups.push({ val: thousands, one: "тысяча", twoFour: "тысячи", fiveMore: "тысяч", isFemale: true });
		rem %= 1_000;
	}

	if (rem > 0 || groups.length === 0) {
		groups.push({ val: rem, one: "рубль", twoFour: "рубля", fiveMore: "рублей", isFemale: false });
	} else {
		groups.push({ val: 0, one: "рубль", twoFour: "рубля", fiveMore: "рублей", isFemale: false });
	}

	const wordsParts: string[] = [];
	for (const g of groups) {
		if (g.val > 0) {
			const w = numberToRussianWords(g.val, g.isFemale);
			const dec = declineRussianWord(g.val, g.one, g.twoFour, g.fiveMore);
			wordsParts.push(w + " " + dec);
		} else if (g.val === 0 && g.one === "рубль") {
			const lastRubWord = declineRussianWord(rubles, "рубль", "рубля", "рублей");
			wordsParts.push(lastRubWord);
		}
	}

	const rubText = wordsParts.join(" ").trim();
	const capitalized = rubText.charAt(0).toUpperCase() + rubText.slice(1);
	const kopWord = declineRussianWord(remainderKop, "копейка", "копейки", "копеек");

	return capitalized + " " + String(remainderKop).padStart(2, "0") + " " + kopWord;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CRYPTOGRAPHIC SHA-256 (FIPS 180-4)
// ─────────────────────────────────────────────────────────────────────────────

function rightRotate(value: number, amount: number): number {
	return (value >>> amount) | (value << (32 - amount));
}

export function generateSha256(asciiString: string): string {
	const maxWord = Math.pow(2, 32);

	const hash = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);

	const k = new Uint32Array([
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
	]);

	const utf8Bytes: number[] = [];
	for (let c = 0; c < asciiString.length; c++) {
		let code = asciiString.charCodeAt(c);
		if (code < 0x80) {
			utf8Bytes.push(code);
		} else if (code < 0x800) {
			utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code < 0xd800 || code >= 0xe000) {
			utf8Bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		} else {
			c++;
			code = 0x10000 + (((code & 0x3ff) << 10) | (asciiString.charCodeAt(c) & 0x3ff));
			utf8Bytes.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f),
			);
		}
	}

	const utf8BitLength = utf8Bytes.length * 8;

	utf8Bytes.push(0x80);
	while ((utf8Bytes.length % 64) !== 56) {
		utf8Bytes.push(0);
	}

	const highBits = Math.floor(utf8BitLength / maxWord);
	const lowBits = utf8BitLength >>> 0;

	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((highBits >>> (b * 8)) & 0xff);
	}
	for (let b = 3; b >= 0; b--) {
		utf8Bytes.push((lowBits >>> (b * 8)) & 0xff);
	}

	const wordsCount = utf8Bytes.length / 4;
	const words = new Uint32Array(wordsCount);
	for (let b = 0; b < wordsCount; b++) {
		const offset = b * 4;
		const b0 = utf8Bytes[offset] ?? 0;
		const b1 = utf8Bytes[offset + 1] ?? 0;
		const b2 = utf8Bytes[offset + 2] ?? 0;
		const b3 = utf8Bytes[offset + 3] ?? 0;
		words[b] = (b0 << 24) | (b1 << 16) | (b2 << 8) | b3;
	}

	const w = new Uint32Array(64);

	for (let j = 0; j < wordsCount; j += 16) {
		for (let i = 0; i < 16; i++) {
			w[i] = words[j + i] ?? 0;
		}
		for (let i = 16; i < 64; i++) {
			const w15 = w[i - 15] ?? 0;
			const w2 = w[i - 2] ?? 0;
			const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
			const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
			w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) | 0;
		}

		let a = hash[0] ?? 0;
		let b = hash[1] ?? 0;
		let c = hash[2] ?? 0;
		let d = hash[3] ?? 0;
		let e = hash[4] ?? 0;
		let f = hash[5] ?? 0;
		let g = hash[6] ?? 0;
		let h = hash[7] ?? 0;

		for (let i = 0; i < 64; i++) {
			const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = (h + S1 + ch + (k[i] ?? 0) + (w[i] ?? 0)) | 0;
			const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (S0 + maj) | 0;

			h = g;
			g = f;
			f = e;
			e = (d + temp1) | 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) | 0;
		}

		hash[0] = ((hash[0] ?? 0) + a) | 0;
		hash[1] = ((hash[1] ?? 0) + b) | 0;
		hash[2] = ((hash[2] ?? 0) + c) | 0;
		hash[3] = ((hash[3] ?? 0) + d) | 0;
		hash[4] = ((hash[4] ?? 0) + e) | 0;
		hash[5] = ((hash[5] ?? 0) + f) | 0;
		hash[6] = ((hash[6] ?? 0) + g) | 0;
		hash[7] = ((hash[7] ?? 0) + h) | 0;
	}

	let hexString = "";
	for (let i = 0; i < 8; i++) {
		const hex = ((hash[i] ?? 0) >>> 0).toString(16).padStart(8, "0");
		hexString += hex;
	}

	return hexString;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SMS-PEP AUTHENTICATION & LEGAL STAMP ENGINE (63-ФЗ)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Маскирование номера телефона в строгом юридическом формате: +7 (***) ***-**-12
 */
export function maskRussianPhone(phone: string): string {
	const clean = (phone || "").replace(/\D/g, "");
	if (clean.length < 2) {
		return "+7 (***) ***-**-00";
	}
	const last2 = clean.slice(-2);
	return `+7 (***) ***-**-${last2}`;
}

/**
 * Форматирование даты и времени в стандартный вид: DD.MM.YYYY HH:mm
 */
export function formatRussianDateTime(isoOrDate: string | Date | number): string {
	const d = typeof isoOrDate === "string" || typeof isoOrDate === "number" ? new Date(isoOrDate) : isoOrDate;
	if (Number.isNaN(d.getTime())) {
		return "01.01.2026 00:00";
	}

	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	const hours = String(d.getHours()).padStart(2, "0");
	const minutes = String(d.getMinutes()).padStart(2, "0");

	return `${day}.${month}.${year} ${hours}:${minutes}`;
}

/**
 * Генерация 4-значного OTP-кода для простой электронной подписи (ПЭП) по 63-ФЗ
 * Срок действия кода строго 5 минут (300 000 мс)
 */
export function generateChairsideSmsOtp(
	phone: string,
	mockCode?: string,
): ChairsideSmsOtpState {
	const code = mockCode || String(Math.floor(1000 + Math.random() * 9000));
	const now = Date.now();
	const expiresAt = now + 5 * 60 * 1000; // 5 минут

	return {
		code,
		phone,
		phoneMasked: maskRussianPhone(phone),
		sentAt: now,
		expiresAt,
		attemptsCount: 0,
		maxAttempts: 3,
		isVerified: false,
	};
}

/**
 * Валидация введенного пациентом СМС-кода
 */
export function verifyChairsideSmsOtp(
	inputCode: string,
	otpState: ChairsideSmsOtpState | undefined,
	nowMs?: number,
): { isValid: boolean; reason?: string } {
	if (!otpState) {
		return { isValid: false, reason: "СМС с кодом еще не отправлено пациенту" };
	}

	const cleanInput = (inputCode || "").trim();
	if (!cleanInput) {
		return { isValid: false, reason: "Введите 4-значный код из СМС" };
	}

	if (!/^\d{4}$/.test(cleanInput)) {
		return { isValid: false, reason: "Код подтверждения должен состоять ровно из 4 цифр" };
	}

	const now = nowMs ?? Date.now();
	if (now > otpState.expiresAt) {
		return {
			isValid: false,
			reason: "Срок действия СМС-кода (5 минут) истек. Запросите новый код.",
		};
	}

	if (otpState.attemptsCount >= otpState.maxAttempts) {
		return {
			isValid: false,
			reason: "Превышено максимальное количество попыток ввода. Запросите новый СМС-код.",
		};
	}

	if (cleanInput !== otpState.code) {
		return {
			isValid: false,
			reason: "Неверный код подтверждения из СМС. Проверьте правильность ввода.",
		};
	}

	return { isValid: true };
}

/**
 * Формирование официального юридического штампа ПЭП в строгом соответствии с 63-ФЗ
 */
export function generateLegalPepStamp(params: {
	otpCode: string;
	hash: string;
	phoneMasked: string;
	signedAtFormatted: string;
}): string {
	const codeMasked = params.otpCode ? "****" : "****";
	return `Документ подписан простой электронной подписью (ПЭП) в соответствии с 63-ФЗ. Код подтвержден: ${codeMasked}, Хэш: SHA-256 (${params.hash}), Телефон: ${params.phoneMasked}, Дата: ${params.signedAtFormatted}`;
}

/**
 * Генерация криптографического отпечатка SHA-256 пакета документов ПЭП
 */
export function generateDocumentPackageIntegrityHash(
	pkg: ChairsideConsentPackage,
	otpCode: string,
	phone: string,
	timestampIso: string,
): { hash: string; canonicalData: string } {
	const docsDigests = pkg.documents
		.map((d) => `${d.type}:${d.code}:${generateSha256(d.title + d.sections.map((s) => s.content).join(""))}`)
		.join(";");

	const estimateDigest = pkg.treatmentItems
		.map((it) => `${it.serviceCode}:${it.toothNumber || ""}:${it.quantity}:${it.totalKopecks}`)
		.join(";");

	const canonicalLines = [
		"=== CANONICAL DENTAL CHAIRSIDE PEP CONSENT RECORD (63-FZ / 323-FZ) ===",
		"PACKAGE_ID: " + pkg.packageId,
		"TIMESTAMP_ISO: " + timestampIso,
		"PATIENT_FULL_NAME: " + pkg.patient.fullName.trim().toUpperCase(),
		"PATIENT_BIRTH_DATE: " + pkg.patient.birthDate.trim(),
		"PATIENT_PASSPORT: " + (pkg.patient.passport || "").trim(),
		"PATIENT_PHONE: " + (phone || pkg.patient.phone || "").trim(),
		"FORM_043U_CARD: " + (pkg.patient.cardNumber || "").trim(),
		"DOCTOR_FULL_NAME: " + pkg.doctor.fullName.trim().toUpperCase(),
		"CLINIC_OGRN: " + pkg.clinic.ogrn.trim(),
		"CLINIC_INN: " + pkg.clinic.inn.trim(),
		"DOCUMENTS_DIGEST: " + docsDigests,
		"ESTIMATE_TOTAL_KOPECKS: " + pkg.totalEstimateKopecks,
		"ESTIMATE_DIGEST: " + estimateDigest,
		"PEP_AUTH_METHOD: SMS_OTP_63FZ",
		"OTP_DIGEST: " + generateSha256(otpCode),
		"======================================================================",
	];

	const canonicalData = canonicalLines.join("\n");
	const hash = generateSha256(canonicalData);

	return { hash, canonicalData };
}

/**
 * Отправка СМС-кода пациенту и перевод пакета в статус "sms_sent"
 */
export function sendChairsideSmsOtpToPatient(
	pkg: ChairsideConsentPackage,
	customPhone?: string,
	mockCode?: string,
): ChairsideConsentPackage {
	const targetPhone = customPhone || pkg.patient.phone || "+7 (999) 000-00-00";
	const smsOtp = generateChairsideSmsOtp(targetPhone, mockCode);

	return {
		...pkg,
		patient: {
			...pkg.patient,
			phone: targetPhone,
		},
		smsOtp,
		status: "sms_sent",
	};
}

/**
 * Подписание пакета документов простой электронной подписью (ПЭП) по СМС-коду (63-ФЗ)
 */
export function signPackageWithSmsPep(
	pkg: ChairsideConsentPackage,
	params: {
		inputCode: string;
		form043uChartNumber?: string;
		signedAtIso?: string;
		nowMs?: number;
	},
): {
	success: boolean;
	signedPackage?: ChairsideConsentPackage;
	error?: string;
} {
	const verification = verifyChairsideSmsOtp(params.inputCode, pkg.smsOtp, params.nowMs);
	if (!verification.isValid) {
		if (pkg.smsOtp) {
			pkg.smsOtp.attemptsCount += 1;
		}
		return { success: false, error: verification.reason || "Неверный СМС-код подтверждения" };
	}

	const signedAtIso = params.signedAtIso || new Date().toISOString();
	const timestamp = new Date(signedAtIso).getTime();
	const signedAtFormatted = formatRussianDateTime(signedAtIso);

	const targetPhone = pkg.smsOtp?.phone || pkg.patient.phone || "+7 (999) 000-00-00";
	const phoneMasked = pkg.smsOtp?.phoneMasked || maskRussianPhone(targetPhone);

	const integrity = generateDocumentPackageIntegrityHash(
		pkg,
		params.inputCode.trim(),
		targetPhone,
		signedAtIso,
	);

	const cardNum = params.form043uChartNumber || pkg.patient.cardNumber || ("043/у-" + pkg.packageId.slice(-6));
	const legalStampText = generateLegalPepStamp({
		otpCode: params.inputCode.trim(),
		hash: integrity.hash,
		phoneMasked,
		signedAtFormatted,
	});

	const docsDigest = pkg.documents.map((d) => d.code).join("; ");

	const signatureRecord: ChairsidePepSignatureRecord = {
		verificationMethod: "sms_63fz_pep",
		phone: targetPhone,
		phoneMasked,
		otpCodeConfirmed: "****",
		timestamp,
		signedAtIso,
		signedAtFormatted,
		signedByFullName: pkg.patient.fullName,
		form043uRecordId: cardNum,
		integrityHash: integrity.hash,
		legalStampText,
		legalBasis: "Федеральный закон от 06.04.2011 № 63-ФЗ, ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ, Приказ Минздрава РФ от 12.11.2021 № 1051н",
		documentsDigest: docsDigest,
	};

	const updatedDocs = pkg.documents.map((doc) => ({
		...doc,
		isSigned: true,
		signedAt: signedAtIso,
		integrityHash: integrity.hash,
	}));

	const updatedOtp: ChairsideSmsOtpState = {
		...(pkg.smsOtp || generateChairsideSmsOtp(targetPhone, params.inputCode.trim())),
		isVerified: true,
	};

	const signedPackage: ChairsideConsentPackage = {
		...pkg,
		patient: {
			...pkg.patient,
			phone: targetPhone,
			cardNumber: cardNum,
		},
		documents: updatedDocs,
		smsOtp: updatedOtp,
		signature: signatureRecord,
		status: "signed",
	};

	return {
		success: true,
		signedPackage,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DOCUMENT GENERATION (1051n, 152-FZ, ESTIMATE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Генерация ИДС по Приказу Минздрава РФ № 1051н
 */
export function generateIds1051nDocument(
	patient: ChairsidePatientProfile,
	doctor: ChairsideDoctorProfile,
	clinic: ChairsideClinicProfile,
	clinicalContext: ChairsideClinicalContext,
): ChairsideDocument {
	const teethList = clinicalContext.teeth.length > 0 ? clinicalContext.teeth.join(", ") : "зубной ряд";
	const diag = clinicalContext.diagnosisIcd || "K02.1 Кариес дентина";

	return {
		type: "ids_1051n",
		code: "ИДС-1051н",
		title: "Информированное добровольное согласие на медицинское вмешательство",
		statutoryBasis: "Приказ Минздрава РФ от 12.11.2021 № 1051н, ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ",
		isSigned: false,
		sections: [
			{
				id: "patient_consent_preamble",
				title: "1. Стороны и предмет согласия",
				content: "Настоящим я, " + patient.fullName + ", дата рождения: " + patient.birthDate + " (документ, удостоверяющий личность: " + (patient.passport || "Паспорт гражданина РФ") + ", телефон: " + (patient.phone || "не указан") + "), действуя добровольно и находясь в здравом уме, даю информированное добровольное согласие на виды медицинских вмешательств, включенные в Перечень определенных видов медицинских вмешательств, при получении первичной медико-санитарной стоматологической помощи в медицинской организации " + clinic.legalName + " (Лицензия № " + clinic.licenseNumber + " от " + clinic.licenseDate + ").",
			},
			{
				id: "clinical_assignment",
				title: "2. Лечащий врач, область лечения и клинический диагноз",
				content: "Медицинская помощь оказывается лечащим врачом: " + doctor.fullName + " (" + doctor.specialty + "). Область медицинского вмешательства: зубы/области [" + teethList + "], предварительный/установленный диагноз (по МКБ-10): " + diag + ".",
			},
			{
				id: "risks_and_methods",
				title: "3. Разъяснение методов, целей и возможных рисков",
				content: "Мне в доступной и понятной для меня форме разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты медицинских вмешательств, их последствия, в том числе вероятность развития осложнений, а также предполагаемые результаты оказания медицинской помощи. Мне разъяснено мое право отказаться от одного или нескольких видов медицинских вмешательств или потребовать их прекращения.",
				bullets: [
					"Применение современных методов местной карпульной анестезии (артикаин/мепивакаин) с обязательным контролем аллергического анамнеза;",
					"Препарирование твердых тканей, эндодонтическая обработка каналов, обтурация гуттаперчей и постановка пломб/реставраций;",
					"Возможность возникновения естественных постоперационных реакций (гиперестезия, болезненность при накусывании в течение 3–7 дней);",
					"Необходимость строгого соблюдения рекомендаций лечащего врача, правил гигиены и графика контрольных визитов.",
				],
			},
			{
				id: "patient_declaration",
				title: "4. Подтверждение пациента",
				content: "Я подтверждаю, что поставил(а) в известность лечащего врача обо всех имеющихся у меня аллергических реакциях, сопутствующих хронических заболеваниях (сердечно-сосудистые, диабет, свертываемость крови), принимаемых лекарственных препаратах. Вся предоставленная мной информация является достоверной.",
			},
		],
	};
}

/**
 * Генерация Согласия на обработку персональных данных (152-ФЗ)
 */
export function generatePdn152fzDocument(
	patient: ChairsidePatientProfile,
	clinic: ChairsideClinicProfile,
): ChairsideDocument {
	return {
		type: "pdn_152fz",
		code: "СОГЛ-152-ПДН",
		title: "Согласие на обработку персональных данных и передачу сведений в ЕГИСЗ",
		statutoryBasis: "Федеральный закон от 27.07.2006 № 152-ФЗ (ст. 6, 9, 10), Федеральный закон от 21.11.2011 № 323-ФЗ, Постановление Правительства РФ № 140",
		isSigned: false,
		sections: [
			{
				id: "pdn_operator",
				title: "1. Оператор персональных данных и субъект",
				content: "Я, " + patient.fullName + ", дата рождения: " + patient.birthDate + ", документ, удостоверяющий личность: " + (patient.passport || "Паспорт РФ") + ", СНИЛС: " + (patient.snils || "не указан") + ", свободно, своей волей и в своем интересе даю согласие оператору — " + clinic.legalName + " (ОГРН: " + clinic.ogrn + ", ИНН: " + clinic.inn + ", адрес: " + clinic.address + "), на обработку моих персональных данных.",
			},
			{
				id: "pdn_scope",
				title: "2. Перечень обрабатываемых персональных данных",
				content: "Обработка включает общие и специальные категории персональных данных, необходимые для оказания квалифицированной медицинской помощи, ведения медицинской карты и исполнения требований законодательства РФ:",
				bullets: [
					"Фамилия, имя, отчество, пол, дата и место рождения, паспортные данные, адрес регистрации и проживания;",
					"Контактный номер телефона, адрес электронной почты, реквизиты СНИЛС и полиса ОМС/ДМС;",
					"Специальные категории данных о состоянии здоровья: анамнез, результаты осмотров, рентгенологические снимки (КЛКТ, ОПТГ, прицельные), диагнозы по МКБ-10, протоколы лечения, медикаментозные назначения, зубная формула;",
					"Сведения о подтверждении волеизъявления посредством простой электронной подписи (ПЭП по 63-ФЗ).",
				],
			},
			{
				id: "pdn_egisz_actions",
				title: "3. Цели обработки и передача в ЕГИСЗ",
				content: "Обработка осуществляется в целях оказания медицинской помощи, установления медицинского диагноза, учета оказанных услуг, а также передачи сведений в Единую государственную информационную систему в сфере здравоохранения (ЕГИСЗ: РЭМД, ИЭМК) во исполнение Федерального закона № 323-ФЗ и Постановления Правительства РФ № 140.",
			},
			{
				id: "pdn_validity",
				title: "4. Срок действия и порядок отзыва",
				content: "Настоящее согласие действует бессрочно в течение сроков хранения первичной медицинской документации (Форма 043/у — 25 лет по Приказу Минздрава РФ) и может быть отозвано путем направления письменного заявления оператору в соответствии с ч. 2 ст. 9 Федерального закона № 152-ФЗ.",
			},
		],
	};
}

/**
 * Генерация Документа «Согласованный план лечения и смета»
 */
export function generateEstimateDocument(
	patient: ChairsidePatientProfile,
	doctor: ChairsideDoctorProfile,
	clinic: ChairsideClinicProfile,
	items: readonly ChairsideTreatmentItem[],
	totalKopecks: number,
	totalWords: string,
): ChairsideDocument {
	const itemsCount = items.length;
	const formattedSum = formatKopecksToRubles(totalKopecks);

	return {
		type: "treatment_estimate",
		code: "СМЕТА-ПЛАН",
		title: "Согласованный план лечения и финансовая смета",
		statutoryBasis: "Постановление Правительства РФ от 11.05.2023 № 736, Закон РФ «О защите прав потребителей» (ст. 10, 12)",
		isSigned: false,
		sections: [
			{
				id: "estimate_intro",
				title: "1. Стороны и назначение сметы",
				content: "Настоящий план лечения и предварительная смета согласованы между пациентом (" + patient.fullName + ") и лечащим врачом (" + doctor.fullName + ") в клинике " + clinic.brandName + " (" + clinic.legalName + "). Смета включает полный перечень рекомендуемых медицинских услуг с фиксацией стоимости в рублях и копейках.",
			},
			{
				id: "estimate_summary",
				title: "2. Итоговая стоимость и финансовые условия",
				content: "Общее количество позиций плана: " + itemsCount + ". Итоговая стоимость согласованного объема медицинских вмешательств составляет: " + formattedSum + " (" + totalWords + ").",
				bullets: [
					"Все цены соответствуют утвержденному прейскуранту клиники на дату подписания;",
					"Стоимость расходных материалов, стерилизации, анестезии и изоляции операционного поля включена в стоимость манипуляций;",
					"При выявлении скрытых патологий (скрытые кариозные полости, атипичная анатомия каналов) изменение плана согласовывается с пациентом дополнительно;",
					"Оплата производится поэтапно по факту оказания услуг либо авансовым платежом в соответствии с договором на оказание платных медицинских услуг.",
				],
			},
			{
				id: "estimate_warranty",
				title: "3. Гарантийные обязательства",
				content: "Клиника предоставляет гарантию на терапевтические пломбы и ортопедические конструкции в соответствии с Положением о гарантиях (от 12 до 36 месяцев по стандартам СтАР) при условии соблюдения пациентом правил гигиены полости рта и явки на контрольные осмотры не реже 1 раза в 6 месяцев.",
			},
		],
	};
}

/**
 * Фабрика создания полного пакета документов кресельного планшета
 */
export function createChairsideConsentPackage(
	params: CreateChairsidePackageParams,
): ChairsideConsentPackage {
	const packageId = params.packageId || "CSP-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
	const createdAt = new Date().toISOString();

	const clinic: ChairsideClinicProfile = {
		...DEFAULT_CHAIRSIDE_CLINIC,
		...(params.clinic || {}),
	};

	const clinicalContext: ChairsideClinicalContext = {
		diagnosisIcd: params.clinicalContext?.diagnosisIcd || "K02.1 Кариес дентина",
		teeth: params.clinicalContext?.teeth || ["16"],
		anamnesisAllergies: params.clinicalContext?.anamnesisAllergies,
		specialNotes: params.clinicalContext?.specialNotes,
	};

	const rawItems = params.treatmentItems || [];
	const treatmentItems: ChairsideTreatmentItem[] = rawItems.map((item, idx) => {
		const unitKop = Math.max(0, Math.round(item.unitPriceKopecks || 0));
		const qty = Math.max(1, Math.round(item.quantity || 1));
		const disc = Math.min(100, Math.max(0, item.discountPercent || 0));
		const totalKop = item.totalKopecks !== undefined
			? Math.max(0, Math.round(item.totalKopecks))
			: calculateItemTotalKopecks(unitKop, qty, disc);

		return {
			id: item.id || "item-" + (idx + 1),
			serviceCode: item.serviceCode || "A16.07.002",
			title: item.title || "Лечение кариеса с реставрацией зуба",
			toothNumber: item.toothNumber,
			stageTitle: item.stageTitle || "Этап 1: Санация полости рта",
			quantity: qty,
			unitPriceKopecks: unitKop,
			discountPercent: disc,
			totalKopecks: totalKop,
		};
	});

	const totalEstimateKopecks = calculateEstimateTotalKopecks(treatmentItems);
	const totalEstimateWords = kopecksToRussianWords(totalEstimateKopecks);

	const doc1051n = generateIds1051nDocument(params.patient, params.doctor, clinic, clinicalContext);
	const docPdn = generatePdn152fzDocument(params.patient, clinic);
	const docEstimate = generateEstimateDocument(
		params.patient,
		params.doctor,
		clinic,
		treatmentItems,
		totalEstimateKopecks,
		totalEstimateWords,
	);

	const exitPinHash = params.exitPin ? hashDoctorPin(params.exitPin) : hashDoctorPin("1234");

	return {
		packageId,
		createdAt,
		patient: params.patient,
		doctor: params.doctor,
		clinic,
		clinicalContext,
		treatmentItems,
		totalEstimateKopecks,
		totalEstimateWords,
		documents: [doc1051n, docPdn, docEstimate],
		status: "ready_for_patient",
		exitPinHash,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DOCTOR PIN PROTECTION (SECURITY FOR EXITING PATIENT MODE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Хеширование PIN-кода врача
 */
export function hashDoctorPin(pin: string): string {
	const sanitized = (pin || "").trim();
	return generateSha256("DENTAL_DOCTOR_PIN_SALT_" + sanitized);
}

/**
 * Проверка введенного PIN-кода врача
 */
export function verifyDoctorPin(pin: string, expectedHash: string | undefined): boolean {
	if (!expectedHash) {
		return hashDoctorPin(pin) === hashDoctorPin("1234");
	}
	return hashDoctorPin(pin) === expectedHash;
}

/**
 * Проверка формата PIN-кода (от 4 до 6 цифр)
 */
export function isValidPinFormat(pin: string): boolean {
	return /^\d{4,6}$/.test((pin || "").trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. PDF / HTML DOCUMENT RENDERER
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Генерация готового печатного / PDF-ready HTML документа пакета согласий
 */
export function renderChairsidePackageHtml(
	pkg: ChairsideConsentPackage,
	options: {
		includeSignatures?: boolean;
		theme?: "light" | "print";
	} = {},
): string {
	const includeSigs = options.includeSignatures ?? true;
	const isSigned = Boolean(pkg.signature && pkg.status === "signed");

	const totalSumRubles = formatKopecksToRubles(pkg.totalEstimateKopecks);

	const estimateRowsHtml = pkg.treatmentItems.map((item, idx) => {
		const toothBadge = item.toothNumber ? "<span class=\"tooth-pill\">" + escapeHtml(item.toothNumber) + "</span>" : "—";
		const priceFmt = formatKopecksToRubles(item.unitPriceKopecks);
		const discFmt = item.discountPercent && item.discountPercent > 0 ? (item.discountPercent + "%") : "—";
		const totalFmt = formatKopecksToRubles(item.totalKopecks);

		return "<tr>" +
			"<td style=\"text-align: center;\">" + (idx + 1) + "</td>" +
			"<td>" +
				"<div style=\"font-weight: 600;\">" + escapeHtml(item.title) + "</div>" +
				"<div style=\"font-size: 8pt; color: #64748b;\">Код 804н: " + escapeHtml(item.serviceCode) + (item.stageTitle ? " • " + escapeHtml(item.stageTitle) : "") + "</div>" +
			"</td>" +
			"<td style=\"text-align: center;\">" + toothBadge + "</td>" +
			"<td style=\"text-align: center;\">" + item.quantity + "</td>" +
			"<td style=\"text-align: right;\">" + priceFmt + "</td>" +
			"<td style=\"text-align: center;\">" + discFmt + "</td>" +
			"<td style=\"text-align: right; font-weight: 700;\">" + totalFmt + "</td>" +
		"</tr>";
	}).join("\n");

	const docsHtml = pkg.documents.map((doc) => {
		const sectionsHtml = doc.sections.map((sec) => {
			const bulletsHtml = sec.bullets && sec.bullets.length > 0
				? "<ul style=\"margin: 4px 0 0 0; padding-left: 18px; font-size: 9pt;\">" +
					sec.bullets.map((b) => "<li>" + escapeHtml(b) + "</li>").join("") +
				  "</ul>"
				: "";

			return "<div class=\"doc-section\">" +
				"<div class=\"doc-section-title\">" + escapeHtml(sec.title) + "</div>" +
				"<p class=\"doc-section-text\">" + escapeHtml(sec.content) + "</p>" +
				bulletsHtml +
			"</div>";
		}).join("\n");

		return "<div class=\"doc-page-container\">" +
			"<div class=\"doc-header-box\">" +
				"<div class=\"doc-badge-pill\">" + escapeHtml(doc.code) + " • " + escapeHtml(doc.statutoryBasis) + "</div>" +
				"<h2 class=\"doc-title\">" + escapeHtml(doc.title) + "</h2>" +
			"</div>" +
			sectionsHtml +
		"</div>";
	}).join("\n<div class=\"page-break\"></div>\n");

	let signatureBlockHtml = "";
	if (includeSigs && isSigned && pkg.signature) {
		signatureBlockHtml = "<div class=\"signature-stamp-card\">" +
			"<div class=\"stamp-header\">" +
				"<div style=\"display: flex; align-items: center; gap: 6px;\">" +
					"<svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#0d9488\" stroke-width=\"2\"><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/></svg>" +
					"<span style=\"font-weight: 800; color: #0d9488; font-size: 9.5pt; text-transform: uppercase;\">ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)</span>" +
				"</div>" +
				"<span style=\"font-size: 8pt; color: #0d9488; font-weight: 700;\">Федеральный закон от 06.04.2011 № 63-ФЗ</span>" +
			"</div>" +
			"<div class=\"stamp-body\">" +
				"<div class=\"sig-details-col\">" +
					"<div><b>Подписант (Пациент):</b> " + escapeHtml(pkg.signature.signedByFullName) + "</div>" +
					"<div><b>Телефон:</b> " + escapeHtml(pkg.signature.phoneMasked) + "</div>" +
					"<div><b>Код подтвержден:</b> " + escapeHtml(pkg.signature.otpCodeConfirmed) + " (СМС-код 4 знака, валидность 5 минут)</div>" +
					"<div><b>Дата и время подписания:</b> " + escapeHtml(pkg.signature.signedAtFormatted) + "</div>" +
					"<div><b>Медицинская карта Формы 043/у:</b> " + escapeHtml(pkg.signature.form043uRecordId) + "</div>" +
					"<div class=\"hash-string\"><b>SHA-256:</b> " + pkg.signature.integrityHash + "</div>" +
				"</div>" +
			"</div>" +
		"</div>";
	} else {
		signatureBlockHtml = "<div class=\"signature-manual-row\">" +
			"<div class=\"sig-manual-col\">" +
				"<div>Врач: ____________________ / " + escapeHtml(pkg.doctor.fullName) + " /</div>" +
				"<div style=\"font-size: 8pt; color: #64748b; margin-top: 4px;\">М.П. Клиники</div>" +
			"</div>" +
			"<div class=\"sig-manual-col\">" +
				"<div>Пациент: ____________________ / " + escapeHtml(pkg.patient.fullName) + " /</div>" +
				"<div style=\"font-size: 8pt; color: #64748b; margin-top: 4px;\">«____» ________________ 20___ г.</div>" +
			"</div>" +
		"</div>";
	}

	return "<!DOCTYPE html>\n<html lang=\"ru\">\n<head>\n" +
		"<meta charset=\"UTF-8\">\n" +
		"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
		"<title>Пакет согласий и смета — " + escapeHtml(pkg.patient.fullName) + " (" + escapeHtml(pkg.packageId) + ")</title>\n" +
		"<style>\n" +
			"@page { size: A4 portrait; margin: 12mm 15mm 12mm 15mm; }\n" +
			"* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n" +
			"body { font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif; font-size: 9.5pt; line-height: 1.45; color: #0f172a; background: #ffffff; margin: 0; padding: 20px; }\n" +
			".clinic-header { border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }\n" +
			".clinic-title { font-size: 14pt; font-weight: 800; color: #0f172a; margin: 0; }\n" +
			".clinic-sub { font-size: 8pt; color: #475569; margin-top: 2px; }\n" +
			".meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9pt; }\n" +
			".meta-row b { color: #334155; }\n" +
			".doc-page-container { margin-bottom: 20px; }\n" +
			".doc-header-box { margin-bottom: 10px; text-align: center; }\n" +
			".doc-badge-pill { display: inline-block; background: #f0fdfa; color: #0d9488; border: 1px solid #ccfbf1; font-size: 7.5pt; font-weight: 700; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; margin-bottom: 4px; }\n" +
			".doc-title { font-size: 11pt; font-weight: 800; text-transform: uppercase; margin: 0 0 6px 0; color: #0f172a; }\n" +
			".doc-section { margin-bottom: 10px; page-break-inside: avoid; }\n" +
			".doc-section-title { font-size: 9.5pt; font-weight: 700; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px; }\n" +
			".doc-section-text { font-size: 9pt; margin: 0; color: #334155; text-align: justify; }\n" +
			".estimate-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 8.5pt; }\n" +
			".estimate-table th { background: #f1f5f9; color: #1e293b; font-weight: 700; padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left; }\n" +
			".estimate-table td { padding: 6px 8px; border: 1px solid #cbd5e1; }\n" +
			".tooth-pill { background: #e0f2fe; color: #0369a1; border-radius: 4px; padding: 1px 5px; font-weight: 700; font-size: 8pt; }\n" +
			".total-box { background: #f8fafc; border: 2px solid #0d9488; border-radius: 8px; padding: 10px 14px; margin: 12px 0 16px 0; }\n" +
			".total-sum { font-size: 12pt; font-weight: 800; color: #0d9488; }\n" +
			".total-words { font-size: 8.5pt; color: #475569; font-style: italic; margin-top: 2px; }\n" +
			".signature-stamp-card { background: #f0fdfa; border: 2px solid #0d9488; border-radius: 8px; padding: 10px 14px; margin-top: 16px; page-break-inside: avoid; }\n" +
			".stamp-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #99f6e4; padding-bottom: 6px; margin-bottom: 8px; }\n" +
			".stamp-body { display: flex; gap: 16px; align-items: center; }\n" +
			".sig-details-col { font-size: 8.5pt; color: #334155; display: flex; flex-direction: column; gap: 3px; width: 100%; }\n" +
			".hash-string { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 7pt; word-break: break-all; color: #0f766e; background: #e6fffa; padding: 4px 6px; border-radius: 4px; border: 1px solid #b2f5ea; }\n" +
			".signature-manual-row { display: flex; justify-content: space-between; margin-top: 30px; padding-top: 10px; page-break-inside: avoid; }\n" +
			".sig-manual-col { width: 45%; font-size: 9pt; }\n" +
			".page-break { page-break-after: always; height: 0; }\n" +
			"@media print { body { padding: 0; } }\n" +
		"</style>\n" +
		"</head>\n" +
		"<body>\n" +
		"<header class=\"clinic-header\">\n" +
			"<div>\n" +
				"<h1 class=\"clinic-title\">" + escapeHtml(pkg.clinic.brandName) + "</h1>\n" +
				"<div class=\"clinic-sub\">" + escapeHtml(pkg.clinic.legalName) + " • ОГРН " + escapeHtml(pkg.clinic.ogrn) + " • ИНН " + escapeHtml(pkg.clinic.inn) + "</div>\n" +
				"<div class=\"clinic-sub\">Лицензия: № " + escapeHtml(pkg.clinic.licenseNumber) + " от " + escapeHtml(pkg.clinic.licenseDate) + " (" + escapeHtml(pkg.clinic.licenseIssuer) + ")</div>\n" +
			"</div>\n" +
			"<div style=\"text-align: right;\">\n" +
				"<div style=\"font-weight: 800; font-size: 10pt;\">ПАКЕТ СОГЛАСИЙ У КРЕСЛА (ПЭП 63-ФЗ)</div>\n" +
				"<div style=\"font-size: 8pt; color: #64748b;\">ID: " + escapeHtml(pkg.packageId) + "</div>\n" +
				"<div style=\"font-size: 8pt; color: #64748b;\">Карта 043/у: " + escapeHtml(pkg.patient.cardNumber || "б/н") + "</div>\n" +
			"</div>\n" +
		"</header>\n" +
		"<div class=\"meta-box\">\n" +
			"<div class=\"meta-row\"><b>Пациент:</b> " + escapeHtml(pkg.patient.fullName) + " (д.р. " + escapeHtml(pkg.patient.birthDate) + ")</div>\n" +
			"<div class=\"meta-row\"><b>Лечащий врач:</b> " + escapeHtml(pkg.doctor.fullName) + " (" + escapeHtml(pkg.doctor.specialty) + ")</div>\n" +
			"<div class=\"meta-row\"><b>Паспорт / Документ:</b> " + escapeHtml(pkg.patient.passport || "Паспорт РФ") + "</div>\n" +
			"<div class=\"meta-row\"><b>Диагноз (МКБ-10):</b> " + escapeHtml(pkg.clinicalContext.diagnosisIcd) + " [Зубы: " + escapeHtml(pkg.clinicalContext.teeth.join(", ")) + "]</div>\n" +
		"</div>\n" +
		docsHtml + "\n" +
		"<div class=\"doc-page-container\" style=\"page-break-inside: avoid;\">\n" +
			"<div class=\"doc-header-box\">\n" +
				"<div class=\"doc-badge-pill\">ПП РФ № 736 • 804н</div>\n" +
				"<h2 class=\"doc-title\">Смета медицинских услуг плана лечения</h2>\n" +
			"</div>\n" +
			"<table class=\"estimate-table\">\n" +
				"<thead>\n" +
					"<tr>\n" +
						"<th style=\"width: 24px; text-align: center;\">№</th>\n" +
						"<th>Наименование услуги</th>\n" +
						"<th style=\"width: 50px; text-align: center;\">Зуб</th>\n" +
						"<th style=\"width: 40px; text-align: center;\">Кол-во</th>\n" +
						"<th style=\"width: 80px; text-align: right;\">Цена</th>\n" +
						"<th style=\"width: 50px; text-align: center;\">Скидка</th>\n" +
						"<th style=\"width: 90px; text-align: right;\">Сумма</th>\n" +
					"</tr>\n" +
				"</thead>\n" +
				"<tbody>\n" + estimateRowsHtml + "\n</tbody>\n" +
			"</table>\n" +
			"<div class=\"total-box\">\n" +
				"<div style=\"display: flex; justify-content: space-between; align-items: baseline;\">\n" +
					"<span style=\"font-weight: 700; font-size: 10pt;\">ИТОГО К ОПЛАТЕ ПО СМЕТЕ:</span>\n" +
					"<span class=\"total-sum\">" + totalSumRubles + "</span>\n" +
				"</div>\n" +
				"<div class=\"total-words\">Сумма прописью: " + escapeHtml(pkg.totalEstimateWords) + "</div>\n" +
			"</div>\n" +
		"</div>\n" +
		signatureBlockHtml + "\n" +
		"</body>\n</html>";
}
