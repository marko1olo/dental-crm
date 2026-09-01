/**
 * RFC 5545 iCALENDAR / CalDAV SPECIFICATION ENGINE & 152-FZ ANONYMIZER
 * Feature #42: Schedule sync with Yandex Calendar, Google Calendar, Apple Calendar
 *
 * Implements:
 * - RFC 5545 (Internet Calendaring and Scheduling Core Object Specification)
 * - 152-FZ personal data protection (strict patient PII masking, initials & card numbers, NO diagnosis / ICD-10 leaks)
 * - Dynamic VEVENT update sequences, cancellation states, alarms
 * - Comprehensive RFC 5545 compliance validation
 */

import type {
	IcalAppointmentItem,
	IcalCalendarOptions,
	IcalCalendarOptionsInput,
	RFC5545ValidationResult,
} from "./calDavTypes.js";

// ─── 1. SENSITIVE MEDICAL & DIAGNOSIS SANITIZATION (152-ФЗ / Врачебная тайна) ─

const SENSITIVE_MEDICAL_TERMS_REGEX = new RegExp(
	[
		"(?:^|(?<=[\\s,;:(.\\[\\]-]))[A-Za-zА-Яа-яЁё]\\d{2}(?:\\.\\d{1,2})?(?=[\\s,;:.)\\]-]|$)", // МКБ-10 коды (К02.1, К04.0, B20, etc.)
		"вич(-инфекци[а-я]*)?",
		"гепатит[а-я]*",
		"сифилис[а-я]*",
		"онколог[а-я]*",
		"туберкулез[а-я]*",
		"новообразован[а-я]*",
		"сахарн[а-я]*\\s+диабет[а-я]*",
		"психиатр[а-я]*",
		"нарколог[а-я]*",
		"абор[а-я]*",
		"хроническ[а-я]*\\s+заболеван[а-я]*",
	].join("|"),
	"giu",
);

/**
 * Очищает описание причины/услуги от диагнозов МКБ-10 и соматических маркеров
 * для предотвращения раскрытия врачебной тайны во внешних календарях.
 */
export function sanitizeClinicalReasonForCalendar(rawReason?: string | null): string {
	if (!rawReason || typeof rawReason !== "string") {
		return "Приём стоматолога";
	}

	let clean = rawReason.trim();
	if (!clean) return "Приём стоматолога";

	// Удаляем МКБ-10 коды и особо чувствительные диагнозы
	clean = clean.replace(SENSITIVE_MEDICAL_TERMS_REGEX, "").trim();
	// Убираем двойные пробелы и висячие скобки/дефисы
	clean = clean
		.replace(/\(\s*\)/g, "")
		.replace(/\[\s*\]/g, "")
		.replace(/\s{2,}/g, " ")
		.replace(/^[-–—:,;.\s]+|[-–—:,;.\s]+$/g, "")
		.trim();

	if (!clean) {
		return "Приём стоматолога";
	}

	return clean;
}

// ─── 2. 152-FZ PATIENT PII ANONYMIZATION ────────────────────────────────────

/**
 * Анонимизация персональных данных пациента для внешнего календаря (152-ФЗ).
 * Преобразует "Иванов Иван Иванович" -> "Пациент И.И."
 * и опционально добавляет номер карты: "Пациент И.И. (карта № 1042)".
 */
export function anonymizePatientName(
	fullName?: string | null,
	cardNumber?: string | null,
): string {
	let label = "Пациент";

	if (fullName && typeof fullName === "string") {
		const clean = fullName.trim();
		if (clean) {
			if (/^пациент$/i.test(clean)) {
				label = "Пациент";
			} else {
				const cleanWithoutPrefix = clean.replace(/^пациент\s+/i, "").trim();
				if (!cleanWithoutPrefix) {
					label = "Пациент";
				} else {
					const words = cleanWithoutPrefix.split(/[\s.]+/).filter(Boolean);

					if (words.length > 0) {
						const initials = words
							.slice(0, 2)
							.map((w) => {
								const letter = w.replace(/^[^a-zA-Zа-яА-ЯёЁ]/, "")[0];
								return letter ? `${letter.toUpperCase()}.` : "";
							})
							.filter(Boolean)
							.join("");

						if (initials) {
							label = `Пациент ${initials}`;
						}
					}
				}
			}
		}
	}

	if (cardNumber && typeof cardNumber === "string" && cardNumber.trim()) {
		const cleanCard = cardNumber.trim();
		if (!label.includes(cleanCard)) {
			return `${label} (карта № ${cleanCard})`;
		}
	}

	return label;
}

/**
 * Расширенная анонимизация с поддержкой формата "Фамилия И.О." для календаря врача.
 */
export function anonymizePatientForCalendar(
	fullName?: string | null,
	cardNumber?: string | null,
	options: { format?: "initials" | "surname_initials"; includeCard?: boolean } = {},
): string {
	const { format = "initials", includeCard = true } = options;

	if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
		const base = "Пациент";
		return includeCard && cardNumber ? `${base} (карта № ${cardNumber.trim()})` : base;
	}

	const clean = fullName.trim().replace(/^пациент\s+/i, "").trim();
	const words = clean.split(/\s+/).filter(Boolean);

	if (words.length === 0) {
		return includeCard && cardNumber ? `Пациент (карта № ${cardNumber.trim()})` : "Пациент";
	}

	let label = "Пациент";
	if (format === "surname_initials" && words.length >= 1) {
		const surname = words[0]!;
		const firstInitial = words[1] ? `${words[1].replace(/^[^a-zA-Zа-яА-ЯёЁ]/, "")[0]?.toUpperCase() || ""}.` : "";
		const patronymicInitial = words[2] ? `${words[2].replace(/^[^a-zA-Zа-яА-ЯёЁ]/, "")[0]?.toUpperCase() || ""}.` : "";
		const inits = `${firstInitial}${patronymicInitial}`;
		label = inits ? `${surname} ${inits}` : surname;
	} else {
		label = anonymizePatientName(fullName);
	}

	if (includeCard && cardNumber && typeof cardNumber === "string" && cardNumber.trim()) {
		const card = cardNumber.trim();
		if (!label.includes(card)) {
			return `${label} (карта № ${card})`;
		}
	}

	return label;
}

// ─── 3. RFC 5545 FORMATTING & ESCAPING HELPERS ──────────────────────────────

/**
 * Экранирование спецсимволов RFC 5545 (пункт 3.3.11).
 * Обратный слэш, точка с запятой, запятая и переносы строк обязаны экранироваться.
 */
export function escapeIcalText(text: string): string {
	if (!text) return "";
	return text
		.replace(/\\/g, "\\\\")
		.replace(/;/g, "\\;")
		.replace(/,/g, "\\,")
		.replace(/\r?\n/g, "\\n");
}

/**
 * Форматирование даты в стандартный формат RFC 5545 UTC (YYYYMMDDTHHMMSSZ).
 */
export function formatIcalDateTime(date: Date | string | number): string {
	const d = new Date(date);
	if (Number.isNaN(d.getTime())) {
		return "19700101T000000Z";
	}
	const pad = (n: number) => n.toString().padStart(2, "0");
	const year = d.getUTCFullYear();
	const month = pad(d.getUTCMonth() + 1);
	const day = pad(d.getUTCDate());
	const hours = pad(d.getUTCHours());
	const minutes = pad(d.getUTCMinutes());
	const seconds = pad(d.getUTCSeconds());
	return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Разбивка длинных строк iCalendar по стандарту RFC 5545 (пункт 3.1: не более 75 октетов на строку).
 * Перенос осуществляется последовательностью CRLF и одного пробела (\r\n ).
 */
export function foldIcalLine(line: string, maxLen = 75): string {
	if (line.length <= maxLen) return line;
	const parts: string[] = [];
	let remaining = line;
	let isFirst = true;
	while (remaining.length > 0) {
		const chunkLen = isFirst ? maxLen : maxLen - 1;
		parts.push(remaining.slice(0, chunkLen));
		remaining = remaining.slice(chunkLen);
		isFirst = false;
	}
	return parts.join("\r\n ");
}

// ─── 4. STATUS & REASON MAPPINGS ────────────────────────────────────────────

const RFC5545_STATUS_MAP: Record<string, string> = {
	planned: "TENTATIVE",
	scheduled: "TENTATIVE",
	confirmed: "CONFIRMED",
	in_treatment: "CONFIRMED",
	completed: "CONFIRMED",
	cancelled: "CANCELLED",
	no_show: "CANCELLED",
};

const STATUS_RU_LABELS: Record<string, string> = {
	planned: "Запланирован",
	scheduled: "Запланирован",
	confirmed: "Подтвержден",
	in_treatment: "В кресле (идёт приём)",
	completed: "Завершен",
	cancelled: "Отменен",
	no_show: "Пациент не явился",
};

// ─── 5. iCALENDAR GENERATOR ENGINE ──────────────────────────────────────────

/**
 * Генерация строгого RFC 5545 iCalendar (.ics) расписания приёмов врача.
 * Поддерживает Яндекс Календарь, Google Calendar, Apple Calendar (iOS/macOS).
 */
export function generateDoctorIcsFeed(options: IcalCalendarOptionsInput): string {
	const {
		doctorName,
		clinicName = "Стоматологическая клиника DENTE",
		appointments = [],
		refreshIntervalMinutes = 15,
		alarmMinutesBefore = 15,
		includeAlarms = true,
		calendarColorHex = "#0ea5e9",
		anonymizePatient = true,
		includeCardNumber = true,
	} = options;

	const nowUtc = formatIcalDateTime(new Date());
	const calName = `Расписание врача — ${doctorName}`;
	const calDesc = `Календарь приёмов стоматологической клиники. Врач: ${doctorName}. Обновляется автоматически.`;

	const rawLines: string[] = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Dente Dental CRM//Doctor Schedule RFC 5545//RU",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		`X-WR-CALNAME:${escapeIcalText(calName)}`,
		`X-WR-CALDESC:${escapeIcalText(calDesc)}`,
		"X-WR-TIMEZONE:UTC",
		`REFRESH-INTERVAL;VALUE=DURATION:PT${refreshIntervalMinutes}M`,
		`X-PUBLISHED-TTL:PT${refreshIntervalMinutes}M`,
		`X-APPLE-CALENDAR-COLOR:${calendarColorHex}`,
	];

	for (const apt of appointments) {
		const start = formatIcalDateTime(apt.startsAt);
		const end = formatIcalDateTime(apt.endsAt);
		const patientLabel = anonymizePatient
			? anonymizePatientName(apt.patientFullName, includeCardNumber ? apt.patientCardNumber : null)
			: apt.patientFullName || "Пациент";

		const sanitizedReason = sanitizeClinicalReasonForCalendar(apt.reason);
		const isEmergency = apt.isEmergency || sanitizedReason.toLowerCase().includes("острая боль") || sanitizedReason.toLowerCase().includes("cito");

		let summary = isEmergency ? `[CITO Острая боль] ${sanitizedReason}` : `Приём: ${sanitizedReason}`;
		if (patientLabel) {
			summary = `${summary} (${patientLabel})`;
		}

		const icalStatus = RFC5545_STATUS_MAP[apt.status.toLowerCase()] || "CONFIRMED";
		const statusText = STATUS_RU_LABELS[apt.status.toLowerCase()] || apt.status;

		const descLines: string[] = [
			`Пациент: ${patientLabel}`,
			`Статус: ${statusText}`,
		];

		if (apt.chairName) {
			descLines.push(`Кресло/Кабинет: ${apt.chairName}`);
		}
		descLines.push(`Процедура/Тип приёма: ${sanitizedReason}`);
		if (apt.patientPhoneMasked) {
			descLines.push(`Телефон: ${apt.patientPhoneMasked}`);
		}
		descLines.push(`Клиника: ${clinicName}`);
		descLines.push("Защита 152-ФЗ: Диагнозы и персональные данные строго маскированы.");

		const description = descLines.join("\n");
		const location = apt.chairName ? `${apt.chairName}, ${clinicName}` : clinicName;
		const sequence = typeof apt.sequence === "number" && apt.sequence >= 0 ? apt.sequence : 0;

		rawLines.push("BEGIN:VEVENT");
		rawLines.push(`UID:appointment-${apt.id}@dental-crm`);
		rawLines.push(`DTSTAMP:${nowUtc}`);
		rawLines.push(`DTSTART:${start}`);
		rawLines.push(`DTEND:${end}`);
		rawLines.push(`SEQUENCE:${sequence}`);
		rawLines.push(`SUMMARY:${escapeIcalText(summary)}`);
		rawLines.push(`DESCRIPTION:${escapeIcalText(description)}`);
		rawLines.push(`LOCATION:${escapeIcalText(location)}`);
		rawLines.push(`STATUS:${icalStatus}`);
		rawLines.push("CATEGORIES:СТОМАТОЛОГИЯ,ПРИЕМ");

		if (apt.updatedAt) {
			rawLines.push(`LAST-MODIFIED:${formatIcalDateTime(apt.updatedAt)}`);
		}

		// Optional reminder VALARM
		if (includeAlarms && alarmMinutesBefore > 0 && icalStatus !== "CANCELLED") {
			rawLines.push("BEGIN:VALARM");
			rawLines.push(`TRIGGER:-PT${alarmMinutesBefore}M`);
			rawLines.push("ACTION:DISPLAY");
			rawLines.push(`DESCRIPTION:${escapeIcalText(`Приём через ${alarmMinutesBefore} мин: ${patientLabel}`)}`);
			rawLines.push("END:VALARM");
		}

		rawLines.push("END:VEVENT");
	}

	rawLines.push("END:VCALENDAR");

	// Fold all lines to RFC 5545 75-char limit and ensure CRLF line endings
	return rawLines.map((line) => foldIcalLine(line)).join("\r\n") + "\r\n";
}

/**
 * Backward compatibility alias for generateIcsCalendar.
 */
export function generateIcsCalendar(params: {
	doctorName: string;
	appointments: IcalAppointmentItem[];
	clinicName?: string;
	organizationName?: string;
}): string {
	return generateDoctorIcsFeed({
		clinicName: params.clinicName || "Стоматология DENTE",
		organizationName: params.organizationName || "DENTE",
		doctorName: params.doctorName,
		appointments: params.appointments,
	});
}

// ─── 6. SUBSCRIPTION URL BUILDERS ───────────────────────────────────────────

/**
 * Преобразует HTTP/HTTPS ссылку на iCal фид в WebCal протокол (webcal://).
 */
export function buildWebcalUrl(httpFeedUrl: string, origin?: string): string {
	if (!httpFeedUrl) return "";
	let fullUrl = httpFeedUrl;
	if (origin && !httpFeedUrl.startsWith("http://") && !httpFeedUrl.startsWith("https://") && !httpFeedUrl.startsWith("webcal://")) {
		const cleanOrigin = origin.replace(/\/+$/, "");
		const cleanPath = httpFeedUrl.startsWith("/") ? httpFeedUrl : `/${httpFeedUrl}`;
		fullUrl = `${cleanOrigin}${cleanPath}`;
	}
	return fullUrl.replace(/^https?:\/\//i, "webcal://");
}

/**
 * Формирует ссылку для добавления подписки в Яндекс Календарь.
 */
export function buildYandexCalendarSubscriptionUrl(feedUrl: string, origin?: string): string {
	let fullUrl = feedUrl;
	if (origin && !feedUrl.startsWith("http://") && !feedUrl.startsWith("https://")) {
		const cleanOrigin = origin.replace(/\/+$/, "");
		const cleanPath = feedUrl.startsWith("/") ? feedUrl : `/${feedUrl}`;
		fullUrl = `${cleanOrigin}${cleanPath}`;
	}
	return `https://calendar.yandex.ru/custom-import?url=${encodeURIComponent(fullUrl)}`;
}

/**
 * Формирует ссылку для добавления подписки в Google Calendar.
 */
export function buildGoogleCalendarSubscriptionUrl(feedUrl: string, origin?: string): string {
	const webcal = buildWebcalUrl(feedUrl, origin);
	return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;
}

// ─── 7. RFC 5545 VALIDATOR ENGINE ───────────────────────────────────────────

/**
 * Строгий валидатор соответствия стандарту RFC 5545 iCalendar.
 */
export function validateIcsRFC5545(icsContent: string): RFC5545ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!icsContent || typeof icsContent !== "string") {
		return {
			isValid: false,
			eventCount: 0,
			errors: ["Пустой или некорректный контент iCalendar"],
			warnings: [],
			hasValidLineEndings: false,
			hasProperLineFolding: false,
		};
	}

	// 1. Проверка окончаний строк CRLF
	const hasValidLineEndings = icsContent.includes("\r\n");
	if (!hasValidLineEndings && icsContent.includes("\n")) {
		warnings.push("Предупреждение: iCalendar использует LF вместо обязательного стандарта CRLF (\\r\\n).");
	}

	const normalizedLines = icsContent.split(/\r?\n/);
	const lines = normalizedLines[normalizedLines.length - 1] === "" ? normalizedLines.slice(0, -1) : normalizedLines;

	if (lines.length < 2) {
		errors.push("Слишком короткий файл iCalendar.");
		return {
			isValid: false,
			eventCount: 0,
			errors,
			warnings,
			hasValidLineEndings,
			hasProperLineFolding: false,
		};
	}

	// 2. Проверка VCALENDAR обертки
	if (lines[0] !== "BEGIN:VCALENDAR") {
		errors.push(`Файл должен начинаться с BEGIN:VCALENDAR, получено: "${lines[0]}"`);
	}
	if (lines[lines.length - 1] !== "END:VCALENDAR") {
		errors.push(`Файл должен заканчиваться на END:VCALENDAR, получено: "${lines[lines.length - 1]}"`);
	}

	// 3. Проверка длины строк (Line folding max 75 octets)
	let hasProperLineFolding = true;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]!;
		if (line.length > 75 && !line.startsWith(" ") && !line.startsWith("\t")) {
			const byteLen = new TextEncoder().encode(line).length;
			if (byteLen > 75) {
				hasProperLineFolding = false;
				warnings.push(`Строка ${i + 1} превышает 75 октетов без переноса (длина: ${byteLen}).`);
			}
		}
	}

	// 4. Unfolding lines for semantic validation
	const unfoldedLines: string[] = [];
	for (const line of lines) {
		if ((line.startsWith(" ") || line.startsWith("\t")) && unfoldedLines.length > 0) {
			unfoldedLines[unfoldedLines.length - 1] += line.slice(1);
		} else {
			unfoldedLines.push(line);
		}
	}

	// 5. Проверка обязательных свойств VCALENDAR
	let versionFound = false;
	let prodIdFound = false;
	let prodId = "";
	let calName = "";

	let inEvent = false;
	let inAlarm = false;
	let currentEventProps: Set<string> = new Set();
	let eventCount = 0;

	for (let i = 0; i < unfoldedLines.length; i++) {
		const line = unfoldedLines[i]!;
		const colonIdx = line.indexOf(":");
		const semicolonIdx = line.indexOf(";");
		const delimiterIdx = (colonIdx === -1) ? semicolonIdx : (semicolonIdx === -1 ? colonIdx : Math.min(colonIdx, semicolonIdx));

		const propName = (delimiterIdx !== -1 ? line.slice(0, delimiterIdx) : line).trim().toUpperCase();
		const propValue = delimiterIdx !== -1 ? line.slice(delimiterIdx + 1).trim() : "";

		if (propName === "VERSION") {
			if (propValue === "2.0") {
				versionFound = true;
			} else {
				errors.push(`Неподдерживаемая версия iCalendar: ${propValue}. Требуется VERSION:2.0`);
			}
		} else if (propName === "PRODID") {
			prodIdFound = true;
			prodId = propValue;
		} else if (propName === "X-WR-CALNAME") {
			calName = propValue;
		} else if (propName === "BEGIN" && propValue.toUpperCase() === "VEVENT") {
			if (inEvent) {
				errors.push(`Вложенный BEGIN:VEVENT на строке ${i + 1}`);
			}
			inEvent = true;
			currentEventProps = new Set();
			eventCount++;
		} else if (propName === "END" && propValue.toUpperCase() === "VEVENT") {
			if (!inEvent) {
				errors.push(`END:VEVENT без предшествующего BEGIN:VEVENT на строке ${i + 1}`);
			} else {
				if (!currentEventProps.has("UID")) errors.push(`Событие #${eventCount} не содержит UID`);
				if (!currentEventProps.has("DTSTAMP")) errors.push(`Событие #${eventCount} не содержит DTSTAMP`);
				if (!currentEventProps.has("DTSTART")) errors.push(`Событие #${eventCount} не содержит DTSTART`);
				if (!currentEventProps.has("DTEND")) errors.push(`Событие #${eventCount} не содержит DTEND`);
				if (!currentEventProps.has("SUMMARY")) errors.push(`Событие #${eventCount} не содержит SUMMARY`);
			}
			inEvent = false;
		} else if (propName === "BEGIN" && propValue.toUpperCase() === "VALARM") {
			inAlarm = true;
		} else if (propName === "END" && propValue.toUpperCase() === "VALARM") {
			inAlarm = false;
		} else if (inEvent && !inAlarm) {
			currentEventProps.add(propName);

			if (propName === "DTSTART" || propName === "DTEND" || propName === "DTSTAMP" || propName === "LAST-MODIFIED") {
				if (!/^\d{8}T\d{6}Z?$/.test(propValue)) {
					errors.push(`Некорректный формат даты в свойстве ${propName}: "${propValue}"`);
				}
			}

			if (propName === "STATUS") {
				const statusUpper = propValue.toUpperCase();
				if (!["TENTATIVE", "CONFIRMED", "CANCELLED"].includes(statusUpper)) {
					errors.push(`Недопустимый STATUS в VEVENT: "${propValue}"`);
				}
			}
		}
	}

	if (inEvent) {
		errors.push("Незакрытый блок VEVENT в конце файла.");
	}
	if (!versionFound) {
		errors.push("Отсутствует обязательное свойство VERSION:2.0");
	}
	if (!prodIdFound) {
		errors.push("Отсутствует обязательное свойство PRODID");
	}

	return {
		isValid: errors.length === 0,
		eventCount,
		errors,
		warnings,
		prodId,
		calName,
		hasValidLineEndings,
		hasProperLineFolding,
	};
}
