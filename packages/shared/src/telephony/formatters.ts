import type { SpeechTranscriptUtterance } from "./types.js";

/**
 * Normalizes phone string to clean numeric digits.
 */
export function normalizePhoneDigits(phone: string | null | undefined): string {
	if (!phone) return "";
	return phone.replace(/\D/g, "");
}

/**
 * Extracts the 10-digit national number suffix for Russian and standard phone numbers.
 * E.g., "+7 (916) 123-45-67" -> "9161234567"
 *       "89269876543"        -> "9269876543"
 *       "9161234567"         -> "9161234567"
 */
export function getNationalPhoneDigits(phone: string | null | undefined): string {
	const digits = normalizePhoneDigits(phone);
	if (digits.length >= 10) {
		return digits.slice(-10);
	}
	return digits;
}

/**
 * Performs fuzzy phone number matching across different notations:
 * +7 / 8 / 7 / no prefix, spaces, brackets, dashes, leading zero-padding.
 */
export function fuzzyMatchPhone(
	phoneA: string | null | undefined,
	phoneB: string | null | undefined,
): boolean {
	if (!phoneA || !phoneB) return false;
	const digitsA = normalizePhoneDigits(phoneA);
	const digitsB = normalizePhoneDigits(phoneB);

	if (digitsA.length === 0 || digitsB.length === 0) return false;

	// Exact digits match
	if (digitsA === digitsB) return true;

	// National 10-digit suffix match (Russia +7 / 8 prefix handling)
	const natA = getNationalPhoneDigits(phoneA);
	const natB = getNationalPhoneDigits(phoneB);

	if (natA.length === 10 && natB.length === 10 && natA === natB) {
		return true;
	}

	// 7-digit local number match if both numbers are at least 7 digits and equal
	if (digitsA.length >= 7 && digitsB.length >= 7) {
		const suffix7A = digitsA.slice(-7);
		const suffix7B = digitsB.slice(-7);
		if (suffix7A === suffix7B && digitsA.length <= 11 && digitsB.length <= 11) {
			if (natA.length === 10 && natB.length === 10) {
				return natA === natB;
			}
			return true;
		}
	}

	return false;
}

/**
 * Formats a phone number for clinical UI presentation.
 * Example: "79991234567" -> "+7 (999) 123-45-67"
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
	if (!phone) return "—";
	const digits = normalizePhoneDigits(phone);
	if (digits.length === 11) {
		const country = digits.startsWith("8") ? "+7" : `+${digits[0]}`;
		const area = digits.slice(1, 4);
		const p1 = digits.slice(4, 7);
		const p2 = digits.slice(7, 9);
		const p3 = digits.slice(9, 11);
		return `${country} (${area}) ${p1}-${p2}-${p3}`;
	}
	if (digits.length === 10) {
		const area = digits.slice(0, 3);
		const p1 = digits.slice(3, 6);
		const p2 = digits.slice(6, 8);
		const p3 = digits.slice(8, 10);
		return `+7 (${area}) ${p1}-${p2}-${p3}`;
	}
	return phone.trim();
}

/**
 * Extracts 2-letter uppercase initials from full name.
 * Example: "Иванов Иван Иванович" -> "ИИ"
 */
export function formatPatientInitials(fullName: string | null | undefined): string {
	if (!fullName || !fullName.trim()) return "??";
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "??";
	if (parts.length === 1) {
		const single = parts[0] ?? "";
		return single.slice(0, 2).toUpperCase();
	}
	const first = parts[0] ?? "";
	const second = parts[1] ?? "";
	if (first[0] && second[0]) {
		return (first[0] + second[0]).toUpperCase();
	}
	return (first.slice(0, 2) || "??").toUpperCase();
}

/**
 * Deterministic color palette generation for patient avatar.
 */
export function getAvatarColor(name: string | null | undefined): {
	bg: string;
	text: string;
	border: string;
} {
	const palettes = [
		{ bg: "rgba(15, 118, 110, 0.15)", text: "#0f766e", border: "#14b8a6" }, // Teal
		{ bg: "rgba(2, 132, 199, 0.15)", text: "#0284c7", border: "#38bdf8" }, // Sky
		{ bg: "rgba(99, 102, 241, 0.15)", text: "#6366f1", border: "#818cf8" }, // Indigo
		{ bg: "rgba(168, 85, 247, 0.15)", text: "#a855f7", border: "#c084fc" }, // Purple
		{ bg: "rgba(236, 72, 153, 0.15)", text: "#ec4899", border: "#f472b6" }, // Pink
		{ bg: "rgba(245, 158, 11, 0.15)", text: "#d97706", border: "#fbbf24" }, // Amber
		{ bg: "rgba(168, 85, 247, 0.15)", text: "#059669", border: "#34d399" }, // Emerald
	];

	if (!name) return palettes[0]!;
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = (hash << 5) - hash + name.charCodeAt(i);
		hash |= 0;
	}
	const index = Math.abs(hash) % palettes.length;
	return palettes[index] ?? palettes[0]!;
}

/**
 * Formats duration in seconds to MM:SS string (or HH:MM:SS if >= 1 hour).
 */
export function formatDurationTimer(totalSeconds: number): string {
	const sec = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(sec / 3600);
	const minutes = Math.floor((sec % 3600) / 60);
	const remainingSeconds = sec % 60;

	if (hours > 0) {
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
	}
	return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Deterministically generates an array of normalized amplitude bars (0.15 to 1.0)
 * based on a seed string (e.g. callId or recording URL) for audio waveform scrubbing.
 */
export function generateWaveformBars(seed: string | null | undefined, count = 48): number[] {
	const safeSeed = seed || "dente-audio-waveform-seed";
	let hash = 0;
	for (let i = 0; i < safeSeed.length; i++) {
		hash = (hash << 5) - hash + safeSeed.charCodeAt(i);
		hash |= 0;
	}

	const bars: number[] = [];
	for (let i = 0; i < count; i++) {
		const t = i / count;
		const sineFactor = Math.sin(t * Math.PI * 3 + (hash % 10)) * 0.3;
		const noise = Math.abs(Math.sin((hash + i * 37) * 12.9898) * 43758.5453) % 1;
		const envelope = Math.sin(t * Math.PI); // tapering edges
		const amp = Math.max(0.15, Math.min(1.0, 0.2 + (noise * 0.5 + sineFactor) * envelope));
		bars.push(Math.round(amp * 100) / 100);
	}
	return bars;
}

/**
 * Deterministically generates a realistic clinical speech-to-text transcript based on the call seed / context.
 */
export function generateCallTranscript(
	seed: string | null | undefined,
	durationSeconds = 45,
): SpeechTranscriptUtterance[] {
	const safeSeed = seed || "dente-call";
	let hash = 0;
	for (let i = 0; i < safeSeed.length; i++) {
		hash = (hash << 5) - hash + safeSeed.charCodeAt(i);
		hash |= 0;
	}
	const variant = Math.abs(hash) % 4;

	if (variant === 0) {
		return [
			{
				speaker: "operator",
				startTimeSeconds: 1,
				endTimeSeconds: 6,
				text: "Здравствуйте! Стоматологическая клиника DENTE. Администратор Анна, чем могу вам помочь?",
				confidence: 0.98,
				sentiment: "positive",
			},
			{
				speaker: "patient",
				startTimeSeconds: 7,
				endTimeSeconds: 15,
				text: "Добрый день! У меня со вчерашнего вечера сильно разболелся зуб справа сверху, реакция на холодное и горячее. Можно попасть к врачу сегодня?",
				confidence: 0.95,
				sentiment: "negative",
			},
			{
				speaker: "operator",
				startTimeSeconds: 16,
				endTimeSeconds: 24,
				text: "Конечно! С острой болью мы принимаем вне очереди. У нас есть свободное окно у доктора Петрова сегодня в 10:00. Сможете подойти?",
				confidence: 0.99,
				sentiment: "positive",
			},
			{
				speaker: "patient",
				startTimeSeconds: 25,
				endTimeSeconds: 31,
				text: "Да, отлично, в 10:00 я буду. Паспорт с собой брать?",
				confidence: 0.97,
				sentiment: "neutral",
			},
			{
				speaker: "operator",
				startTimeSeconds: 32,
				endTimeSeconds: 42,
				text: "Да, пожалуйста, возьмите паспорт для оформления договора. Записала вас на 10:00 к доктору Петрову. До встречи в клинике!",
				confidence: 0.99,
				sentiment: "positive",
			},
		];
	}

	if (variant === 1) {
		return [
			{
				speaker: "operator",
				startTimeSeconds: 1,
				endTimeSeconds: 5,
				text: "Добрый день! Клиника DENTE, слушаю вас.",
				confidence: 0.97,
				sentiment: "neutral",
			},
			{
				speaker: "patient",
				startTimeSeconds: 6,
				endTimeSeconds: 14,
				text: "Здравствуйте, я хотел бы записаться на профессиональную гигиену полости рта и профилактический осмотр.",
				confidence: 0.96,
				sentiment: "neutral",
			},
			{
				speaker: "operator",
				startTimeSeconds: 15,
				endTimeSeconds: 25,
				text: "Прекрасно! Комплексная гигиена AirFlow с ультразвуком и реминерализацией. Есть свободное время завтра в 11:00 или в 15:30. Как вам удобнее?",
				confidence: 0.98,
				sentiment: "positive",
			},
			{
				speaker: "patient",
				startTimeSeconds: 26,
				endTimeSeconds: 30,
				text: "Завтра в 11:00 будет идеально. Запишите меня, пожалуйста.",
				confidence: 0.98,
				sentiment: "positive",
			},
			{
				speaker: "operator",
				startTimeSeconds: 31,
				endTimeSeconds: 38,
				text: "Записали вас на завтра в 11:00. Направили подтверждение и схему проезда в WhatsApp. Всего доброго!",
				confidence: 0.99,
				sentiment: "positive",
			},
		];
	}

	if (variant === 2) {
		return [
			{
				speaker: "operator",
				startTimeSeconds: 1,
				endTimeSeconds: 6,
				text: "Здравствуйте! Клиника DENTE, администратор на связи.",
				confidence: 0.98,
				sentiment: "positive",
			},
			{
				speaker: "patient",
				startTimeSeconds: 7,
				endTimeSeconds: 16,
				text: "Здравствуйте! Подскажите, вы работаете со страховыми компаниями по полису ДМС СОГАЗ?",
				confidence: 0.96,
				sentiment: "neutral",
			},
			{
				speaker: "operator",
				startTimeSeconds: 17,
				endTimeSeconds: 27,
				text: "Да, мы являемся аккредитованной клиникой СОГАЗ. Терапия и гигиена покрываются на 100%. Назовите, пожалуйста, номер вашего полиса.",
				confidence: 0.98,
				sentiment: "positive",
			},
			{
				speaker: "patient",
				startTimeSeconds: 28,
				endTimeSeconds: 36,
				text: "Полис СОГАЗ-987654. Хочу записаться на консультацию к хирургу-имплантологу.",
				confidence: 0.97,
				sentiment: "neutral",
			},
			{
				speaker: "operator",
				startTimeSeconds: 37,
				endTimeSeconds: 44,
				text: "Полис верифицирован в системе! Записываю вас на консультацию. Ждем вас!",
				confidence: 0.99,
				sentiment: "positive",
			},
		];
	}

	return [
		{
			speaker: "operator",
			startTimeSeconds: 1,
			endTimeSeconds: 5,
			text: "Клиника DENTE, здравствуйте! Чем могу помочь?",
			confidence: 0.98,
			sentiment: "positive",
		},
		{
			speaker: "patient",
			startTimeSeconds: 6,
			endTimeSeconds: 14,
			text: "Здравствуйте, хочу уточнить стоимость установки коронки из диоксида циркония и записаться на приём.",
			confidence: 0.95,
			sentiment: "neutral",
		},
		{
			speaker: "operator",
			startTimeSeconds: 15,
			endTimeSeconds: 26,
			text: "Коронка из диоксида циркония под ключ с цифровым 3D-сканированием и фиксацией. Рекомендую начать с консультации ортопеда.",
			confidence: 0.97,
			sentiment: "positive",
		},
		{
			speaker: "patient",
			startTimeSeconds: 27,
			endTimeSeconds: 33,
			text: "Да, давайте запишемся на консультацию ортопеда на этой неделе.",
			confidence: 0.96,
			sentiment: "positive",
		},
		{
			speaker: "operator",
			startTimeSeconds: 34,
			endTimeSeconds: 42,
			text: "Записали вас на консультацию. Направили информацию в мессенджер. Хорошего дня!",
			confidence: 0.99,
			sentiment: "positive",
		},
	];
}

/**
 * Generates an appointment confirmation message for WhatsApp / SMS.
 */
export function generateAppointmentConfirmationMessage(params: {
	patientName: string;
	doctorName?: string | null;
	appointmentStartsAt: string;
	clinicName?: string;
	clinicAddress?: string | null;
	templateType?: "confirmation" | "reminder" | "urgent";
}): string {
	const dateObj = new Date(params.appointmentStartsAt);
	const formattedDate = dateObj.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		weekday: "short",
	});
	const formattedTime = dateObj.toLocaleTimeString("ru-RU", {
		hour: "2-digit",
		minute: "2-digit",
	});
	const doctor = params.doctorName ? ` к врачу ${params.doctorName}` : "";
	const clinic = params.clinicName || "клинике DENTE";
	const address = params.clinicAddress ? ` (${params.clinicAddress})` : "";

	if (params.templateType === "urgent") {
		return `Здравствуйте, ${params.patientName}! Ждём вас на срочный приём в ${clinic}${address}: ${formattedDate} в ${formattedTime}${doctor}. При себе необходимо иметь паспорт. Подтвердите визит ответным сообщением ДА.`;
	}

	if (params.templateType === "reminder") {
		return `Здравствуйте, ${params.patientName}! Напоминаем о сегодняшнем визите в ${clinic}: ${formattedDate} в ${formattedTime}${doctor}. Пожалуйста, приходите за 5-10 минут до начала приёма.`;
	}

	return `Здравствуйте, ${params.patientName}! Напоминаем о вашей записи в ${clinic}: ${formattedDate} в ${formattedTime}${doctor}. Подтверждаете визит? Ответьте ДА или позвоните нам.`;
}

/**
 * Creates a WhatsApp web/app link to trigger 1-click confirmation message.
 */
export function generateWhatsAppConfirmationUrl(phone: string, text: string): string {
	const clean = normalizePhoneDigits(phone);
	const e164 = clean.startsWith("8") ? `7${clean.slice(1)}` : clean;
	return `https://wa.me/${e164}?text=${encodeURIComponent(text)}`;
}

/**
 * Creates an SMS URI to trigger 1-click SMS client.
 */
export function generateSmsConfirmationUrl(phone: string, text: string): string {
	const clean = normalizePhoneDigits(phone);
	const e164 = clean.startsWith("8") ? `+7${clean.slice(1)}` : `+${clean}`;
	return `sms:${e164}?body=${encodeURIComponent(text)}`;
}

/**
 * Creates a Telegram link for appointment confirmation.
 */
export function generateTelegramConfirmationUrl(phone: string, text: string): string {
	const clean = normalizePhoneDigits(phone);
	const e164 = clean.startsWith("8") ? `+7${clean.slice(1)}` : `+${clean}`;
	return `https://t.me/share/url?url=${encodeURIComponent(e164)}&text=${encodeURIComponent(text)}`;
}

/**
 * Opens WhatsApp chat via wa.me link in a browser environment.
 */
export function openWhatsAppChat(phone: string, text: string): void {
	if (typeof globalThis !== "undefined") {
		const g = globalThis as unknown as { window?: { open?: (url: string, target: string) => void } };
		if (g.window?.open) {
			const url = generateWhatsAppConfirmationUrl(phone, text);
			g.window.open(url, "_blank");
		}
	}
}
