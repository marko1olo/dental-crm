import type { ParserContext } from "./dictationParser.js";
import {
	extractFdiTeethNumbers,
	extractToothSurfaces,
	matchDentalDiagnosis,
	extractDentalAnesthesia,
	extractDentalProcedures,
	synthesizeSoapRecord,
	type ClinicalToothState,
} from "./dentalSpeechGrammar.js";

export interface ToothUpdate {
	code: string;
	state:
		| "treatment"
		| "missing"
		| "watch"
		| "planned"
		| "done"
		| "prosthetics"
		| "implant"
		| "calculus";
	surfaces?: string[] | undefined;
	clinicalState?: ClinicalToothState | undefined;
	diagnosisCode?: string | undefined;
	diagnosisTitle?: string | undefined;
}

export interface EmkUpdates {
	complaint?: string | undefined;
	anamnesis?: string | undefined;
	objectiveStatus?: string | undefined;
	diagnosis?: string | undefined;
	diagnosisIcd10?: string | undefined;
	treatmentPlan?: string | undefined;
	recommendations?: string | undefined;
	costRub?: number | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinical entity
	anesthesia?: any;
	// biome-ignore lint/suspicious/noExplicitAny: clinical entity
	procedures?: any[] | undefined;
}

export interface SmartAction {
	action:
		| "update_tooth"
		| "schedule"
		| "reschedule"
		| "cancel_schedule"
		| "open_card"
		| "add_implant"
		| "create_patient"
		| "complex_llm_fallback";
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	payload?: any;
	toothUpdates?: ToothUpdate[] | undefined;
	emkUpdates?: EmkUpdates | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinical entity
	anesthesia?: any;
	// biome-ignore lint/suspicious/noExplicitAny: clinical entity
	procedures?: any[] | undefined;
}

// ---- HELPER DICTIONARIES & REGEX ----

const MONTHS: Record<string, number> = {
	январ: 1,
	феврал: 2,
	март: 3,
	апрел: 4,
	ма: 5,
	июн: 6,
	июл: 7,
	август: 8,
	сентябр: 9,
	октябр: 10,
	ноябр: 11,
	декабр: 12,
};

const WEEKDAYS: Record<string, number> = {
	понедельник: 1,
	вторник: 2,
	сред: 3,
	четверг: 4,
	пятниц: 5,
	суббот: 6,
	воскресень: 0,
};

const TOOTH_REGEX =
	/(?:^|[^0-9])([1-4][1-8]|[5-8][1-5])(?=[^0-9]|$)(?!\s*[:.-]\s*\d+)/gi;

const STATE_MAPPING: Record<string, ToothUpdate["state"]> = {
	кариес: "treatment",
	пульпит: "treatment",
	периодонтит: "treatment",
	эндодонтия: "treatment",
	лечить: "treatment",
	лечение: "treatment",
	пломба: "treatment",
	отсутствует: "missing",
	удален: "missing",
	удалили: "missing",
	удалить: "missing",
	нет: "missing",
	экстракция: "missing",
	"план на имплант": "planned",
	имплантация: "planned",
	"план имплантации": "planned",
	наблюдать: "watch",
	осмотр: "watch",
	наблюдение: "watch",
	рентген: "watch",
	кт: "watch",
	вылечен: "done",
	здоров: "done",
	санирован: "done",
	коронка: "prosthetics",
	коронку: "prosthetics",
	винир: "prosthetics",
	мост: "prosthetics",
	имплант: "implant",
	имплантат: "implant",
	имплантан: "implant",
	налет: "calculus",
	камень: "calculus",
	"зубной камень": "calculus",
	чистка: "calculus",
	профгигиена: "calculus",
};

const NUMBER_WORDS: Record<string, number> = {
	ноль: 0,
	один: 1,
	одна: 1,
	первого: 1,
	первый: 1,
	первое: 1,
	два: 2,
	две: 2,
	второго: 2,
	второй: 2,
	второе: 2,
	три: 3,
	третьего: 3,
	третий: 3,
	третье: 3,
	четыре: 4,
	четвертого: 4,
	четвертый: 4,
	четвертое: 4,
	пять: 5,
	пятого: 5,
	пятый: 5,
	пятое: 5,
	шесть: 6,
	шестого: 6,
	шестой: 6,
	шестое: 6,
	семь: 7,
	седьмого: 7,
	седьмой: 7,
	седьмое: 7,
	восемь: 8,
	восьмого: 8,
	восьмой: 8,
	восьмое: 8,
	девять: 9,
	девятого: 9,
	девятый: 9,
	девятое: 9,
	десять: 10,
	десятого: 10,
	десятый: 10,
	десятое: 10,
	одиннадцать: 11,
	одиннадцатого: 11,
	одиннадцатый: 11,
	одиннадцатое: 11,
	двенадцать: 12,
	двенадцатого: 12,
	двенадцатый: 12,
	двенадцатое: 12,
	тринадцать: 13,
	тринадцатого: 13,
	тринадцатый: 13,
	тринадцатое: 13,
	четырнадцать: 14,
	четырнадцатого: 14,
	четырнадцатый: 14,
	четырнадцатое: 14,
	пятнадцать: 15,
	пятнадцатого: 15,
	пятнадцатый: 15,
	пятнадцатое: 15,
	шестнадцать: 16,
	шестнадцатого: 16,
	шестнадцатый: 16,
	шестнадцатое: 16,
	семнадцать: 17,
	семнадцатого: 17,
	семнадцатый: 17,
	семнадцатое: 17,
	восемнадцать: 18,
	восемнадцатого: 18,
	восемнадцатый: 18,
	восемнадцатое: 18,
	девятнадцать: 19,
	девятнадцатого: 19,
	девятнадцатый: 19,
	девятнадцатое: 19,
	двадцать: 20,
	двадцатого: 20,
	двадцатый: 20,
	двадцатое: 20,
	тридцать: 30,
	тридцатого: 30,
	тридцатый: 30,
	тридцатое: 30,
	сорок: 40,
	пятьдесят: 50,
	шестьдесят: 60,
	семьдесят: 70,
	восемьдесят: 80,
	девяносто: 90,
	сто: 100,
	двести: 200,
	триста: 300,
	четыреста: 400,
	пятьсот: 500,
};

function parseWordNumber(word: string): number | null {
	return NUMBER_WORDS[word.toLowerCase()] || null;
}

// ---- EXTRACTION FUNCTIONS ----

function extractTime(text: string): string | null {
	// Prevent matching phone numbers like 8 999 123 by ensuring negative lookahead for extra digits
	let m = text.match(/(?:в|на)?\s*(\d{1,2})[:.\s]([0-5]\d)(?!\s*\d)/);
	if (m) {
		let h = parseInt(m[1] as string, 10);
		const min = m[2];
		if (text.includes("дня") && h < 12) h += 12;
		if (text.includes("вечера") && h < 12) h += 12;
		return `${h.toString().padStart(2, "0")}:${min}`;
	}

	// Fix 'полпервого' / 'пол первого'
	m = text.match(/(пол(?:овин[аеу])?[\s-]*|четверть\s+)([а-яё]+)/i);
	if (m) {
		const isQuarter = (m[1] ?? "").includes("четверть");
		const word = (m[2] ?? "").substring(0, 3);
		const hourMap: Record<string, number> = {
			пер: 12,
			вто: 13,
			тре: 14,
			чет: 15,
			пят: 16,
			шес: 17,
			сед: 18,
			вос: 19,
			дев: 20,
			дес: 21,
			оди: 10,
			две: 11,
		};
		if (hourMap[word]) return `${hourMap[word]}:${isQuarter ? "15" : "30"}`;
	}

	// Match word pairs like 'в пятнадцать тридцать', 'в десять сорок пять'
	const prepRegex = /(?:^|[\s,.:;])(в|на)\s+/gi;
	let pMatch: RegExpExecArray | null;
	while ((pMatch = prepRegex.exec(text)) !== null) {
		const afterStr = text.slice(pMatch.index + pMatch[0].length).trim();
		const rawWords = afterStr.split(/\s+/).slice(0, 3);
		const word0 = rawWords[0];
		const word1 = rawWords[1];
		if (word0 && word1) {
			const w0 = word0.replace(/[^\wа-яё]/gi, "");
			const w1 = word1.replace(/[^\wа-яё]/gi, "");
			let h: number | null = parseInt(w0, 10);
			if (Number.isNaN(h)) h = parseWordNumber(w0);
			let min: number | null = parseInt(w1, 10);
			if (Number.isNaN(min)) min = parseWordNumber(w1);

			const word2 = rawWords[2];
			if (word2) {
				const w2 = word2.replace(/[^\wа-яё]/gi, "");
				const min2 = parseWordNumber(w2);
				if (min !== null && min2 !== null && min >= 20 && min <= 50 && min2 >= 1 && min2 <= 9) {
					min = min + min2;
				}
			}

			if (h !== null && h >= 0 && h <= 24 && min !== null && min >= 0 && min < 60) {
				let hour = h;
				if ((text.includes("дня") || text.includes("вечера")) && hour < 12) hour += 12;
				return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
			}
		}
	}

	// Fix explicit word matching 'в 10 утра' / 'в 5 часов'
	const matches = text.matchAll(
		/(?:в|на)\s*(\d{1,2}|[а-яё]+)(?:\s*(?:часов|часа|час|утра|дня|вечера))?(?!\s*\d)/gi,
	);
	for (const match of matches) {
		let h = parseInt(match[1] as string, 10);
		if (Number.isNaN(h)) h = parseWordNumber(match[1] as string) || 0;
		if (h > 0 && h <= 24) {
			if ((text.includes("дня") || text.includes("вечера")) && h < 12) h += 12;
			return `${h.toString().padStart(2, "0")}:00`;
		}
	}
	return null;
}

function extractDate(text: string): {
	dayString?: string;
	relativeDays?: number;
	targetWeekday?: number;
} | null {
	if (text.includes("сегодня")) return { relativeDays: 0 };
	if (text.includes("послезавтра")) return { relativeDays: 2 };
	if (text.includes("завтра")) return { relativeDays: 1 };

	const m = text.match(/(\d{1,2}|[а-яё]+)\s*([а-яё]+)/i);
	if (m) {
		let day = parseInt(m[1] as string, 10);
		if (Number.isNaN(day)) day = parseWordNumber(m[1] as string) || 0;

		if (day > 0 && day <= 31) {
			const monthWord = (m[2] ?? "").substring(0, 5);
			let month = -1;
			for (const [key, val] of Object.entries(MONTHS)) {
				if (key.startsWith(monthWord)) {
					month = val;
					break;
				}
			}
			if (month !== -1) {
				const year = new Date().getFullYear();
				return {
					dayString: `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
				};
			}
			if ((m[2] ?? "").startsWith("числ")) {
				const d = new Date();
				return {
					dayString: `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
				};
			}
		}
	}

	for (const [word, wd] of Object.entries(WEEKDAYS)) {
		if (text.includes(word)) return { targetWeekday: wd };
	}
	return null;
}

function formatPatientName(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(" ");
}

function extractPatientName(
	text: string,
	actionRegexStr: string,
): string | null {
	// 1. Прямой маркер «пациент ФИО» / «пациента ФИО»
	const patientPrefixMatch = text.match(
		/пациент(?:а)?\s+([а-яё]+(?:\s+[а-яё]+){1,2})/i,
	);
	if (patientPrefixMatch && patientPrefixMatch[1]) {
		const name = patientPrefixMatch[1].trim();
		if (name.length > 2) return formatPatientName(name);
	}

	// 2. Имя между действием и предлогами времени/даты
	const regex = new RegExp(
		`(?:${actionRegexStr})\\s+(.*?)(?=\\s+(?:на|в|к|телефон|с|завтра|сегодня|послезавтра)(?:\\s|$)|\\s+\\d|$)`,
		"i",
	);
	const match = text.match(regex);
	if (match && match[1] !== undefined && match[1].length > 2) {
		const cleanName = match[1]
			.replace(/^(?:для|запись|прием|пациента|пациент)\s+/i, "")
			.replace(/^(?:для|запись|прием|пациента|пациент)\s+/i, "")
			.trim();
		if (cleanName.length > 2) return formatPatientName(cleanName);
	}
	return null;
}

function extractCost(text: string): number | null {
	const m = text.match(
		/(?:стоимость|цена|оплата|взяли|с пациента|оплатила|оплатил)\s*(\d+(?:[.,]\d+)?)\s*(тысяч|тыс|руб|р|₽)?/i,
	);
	if (m) {
		let val = parseFloat((m[1] as string).replace(",", "."));
		if (m[2]?.startsWith("тыс")) val *= 1000;
		if (val < 100 && !m[2]) val *= 1000;
		return val;
	}

	const mWord = text.match(
		/(?:стоимость|цена|оплата|взяли|с пациента|оплатила|оплатил)\s+([а-яё\s]+)\s*(тысяч|тыс|руб|р|₽)/i,
	);
	if (mWord) {
		let sum = 0;
		let hasHalf = false;
		for (const w of (mWord[1] as string).split(/\s+/)) {
			if (w.startsWith("полов")) hasHalf = true;
			const num = parseWordNumber(w);
			if (num) sum += num;
		}
		if (sum > 0) {
			if (hasHalf) sum += 0.5;
			if (
				(mWord[2] as string).startsWith("тыс") ||
				(mWord[1] as string).includes("тысяч") ||
				(mWord[1] as string).includes("тыс")
			) {
				sum *= 1000;
			}
			return sum;
		}
	}

	const standalone = text.match(/\b([1-9]\d{2,5})\b/);
	if (standalone) {
		return parseInt(standalone[1] ?? "", 10);
	}
	return null;
}

function extractEmkSections(text: string, updates: EmkUpdates) {
	// Tokenize the string to look for clinical section keywords (even without colons).
	// Use (^|[^а-яё]) instead of \b because \b breaks on Cyrillic in JS
	const tokens = text.split(
		/(^|[^а-яё])(жалоб[а-я]*|анамнез[а-я]*|объективн[а-я]*|осмотр[а-я]*|диагноз[а-я]*|лечени[а-я]*|план[а-я]*|рекомендаци[а-я]*|проведен[а-я]*)([^а-яё]|$)/i,
	);

	let currentSection: keyof EmkUpdates | null = null;
	let currentContent = "";

	for (let i = 0; i < tokens.length; i++) {
		const token = (tokens[i] || "").trim();
		if (!token || token.length === 1) continue; // Skip empty tokens or single non-word delimiters

		const lowerToken = token.toLowerCase().replace(/[:-]/g, "");
		let matchedSection: keyof EmkUpdates | null = null;

		// Strictly check if the token IS the keyword, not just starts with it (which swallowed long text blocks)
		const isKeyword =
			/^(жалоб[а-я]*|анамнез[а-я]*|объективн[а-я]*|осмотр[а-я]*|диагноз[а-я]*|лечени[а-я]*|план[а-я]*|рекомендаци[а-я]*|проведен[а-я]*)$/i.test(
				lowerToken,
			);

		if (isKeyword) {
			if (lowerToken.startsWith("жалоб")) matchedSection = "complaint";
			else if (lowerToken.startsWith("анамнез")) matchedSection = "anamnesis";
			else if (
				lowerToken.startsWith("объектив") ||
				lowerToken.startsWith("осмотр")
			)
				matchedSection = "objectiveStatus";
			else if (lowerToken.startsWith("диагноз")) matchedSection = "diagnosis";
			else if (
				lowerToken.startsWith("лечен") ||
				lowerToken.startsWith("план") ||
				lowerToken.startsWith("рекомендац") ||
				lowerToken.startsWith("проведен")
			)
				matchedSection = "treatmentPlan";
		}

		if (matchedSection) {
			// Avoid wiping content if consecutive keywords map to the same section (e.g. 'План лечения')
			if (matchedSection !== currentSection) {
				// Save previous section if exists
				if (currentSection && currentContent.trim()) {
					updates[currentSection] =
						(updates[currentSection] ? `${updates[currentSection]} ` : "") +
						currentContent
							.trim()
							.replace(/^[:-]+/, "")
							.trim();
				}
				currentSection = matchedSection;
				currentContent = "";
			}
		} else {
			if (currentSection) {
				currentContent += ` ${token}`;
			}
		}
	}

	// Finalize the last section
	if (currentSection && currentContent.trim()) {
		updates[currentSection] =
			(updates[currentSection] ? `${updates[currentSection]} ` : "") +
			currentContent
				.trim()
				.replace(/^[:-]+/, "")
				.trim();
	}
}

function expandToothRanges(text: string): string[] {
	const allTeeth = new Set<string>();

	const grammarTeeth = extractFdiTeethNumbers(text);
	for (const t of grammarTeeth) {
		allTeeth.add(t.toString());
	}

	if (
		text.includes("все зубы") ||
		text.includes("обе челюсти") ||
		text.includes("санаци")
	) {
		for (let i = 11; i <= 18; i++) allTeeth.add(i.toString());
		for (let i = 21; i <= 28; i++) allTeeth.add(i.toString());
		for (let i = 31; i <= 38; i++) allTeeth.add(i.toString());
		for (let i = 41; i <= 48; i++) allTeeth.add(i.toString());
		return Array.from(allTeeth);
	}

	if (text.includes("верхняя челюсть") || text.includes("вч")) {
		for (let i = 11; i <= 18; i++) allTeeth.add(i.toString());
		for (let i = 21; i <= 28; i++) allTeeth.add(i.toString());
	}

	if (text.includes("нижняя челюсть") || text.includes("нч")) {
		for (let i = 31; i <= 38; i++) allTeeth.add(i.toString());
		for (let i = 41; i <= 48; i++) allTeeth.add(i.toString());
	}

	if (text.includes("фронтальн") || text.includes("зона улыбки")) {
		for (let i = 11; i <= 13; i++) allTeeth.add(i.toString());
		for (let i = 21; i <= 23; i++) allTeeth.add(i.toString());
		for (let i = 31; i <= 33; i++) allTeeth.add(i.toString());
		for (let i = 41; i <= 43; i++) allTeeth.add(i.toString());
	}

	const rangeMatches = [
		...text.matchAll(
			/(?:с|от)\s*([1-4][1-8]|[5-8][1-5])\s*(?:по|до)\s*([1-4][1-8]|[5-8][1-5])/gi,
		),
	];
	for (const m of rangeMatches) {
		const start = parseInt(m[1] ?? "", 10);
		const end = parseInt(m[2] ?? "", 10);
		if (Math.floor(start / 10) === Math.floor(end / 10)) {
			const min = Math.min(start, end);
			const max = Math.max(start, end);
			for (let i = min; i <= max; i++) allTeeth.add(i.toString());
		}
	}
	const individualMatches = [...text.matchAll(TOOTH_REGEX)];
	for (const m of individualMatches) {
		if (m[1] !== undefined) allTeeth.add(m[1]);
	}

	const wordMatches = [
		...text.matchAll(/(?:на|зуб|зубе)\s+([а-яё]+)\s+([а-яё]+)/gi),
	];
	for (const m of wordMatches) {
		const dec = parseWordNumber(m[1] as string);
		const unit = parseWordNumber(m[2] ?? "");
		if (dec && unit && dec >= 10 && dec <= 80 && unit >= 1 && unit <= 8) {
			allTeeth.add((dec + unit).toString());
		}
	}

	return Array.from(allTeeth);
}

export function parseDictationLocally(
	transcript: string,
	context: ParserContext,
): SmartAction | null {
	const text = transcript.toLowerCase().trim();

	if (context === "schedule" || text.includes("пациент")) {
		if (text.match(/(отмени|удали).*(запись|прием)|отмени/)) {
			const pName = extractPatientName(
				text,
				"отмени|удали(?:ть)?\\s*(?:запись|прием)?",
			);
			if (!pName) return null; // Force LLM fallback if we can't extract the name confidently
			return { action: "cancel_schedule", payload: { patientName: pName } };
		}
		if (text.match(/(перенеси|перенести)/)) {
			const dateInfo = extractDate(text);
			const timeStr = extractTime(text);
			const pName = extractPatientName(text, "перенеси|перенести");
			if (pName && (dateInfo || timeStr)) {
				return {
					action: "reschedule",
					payload: {
						patientName: pName,
						dayOffset: dateInfo?.relativeDays,
						targetWeekday: dateInfo?.targetWeekday,
						exactDate: dateInfo?.dayString,
						time: timeStr,
					},
				};
			}
			return null; // Fallback to LLM
		}
		if (
			text.match(/(запиши|записать|создай запись|запись на|запись для|запись|новый пациент)/)
		) {
			const dateInfo = extractDate(text);
			const timeStr = extractTime(text);
			const doctorMatch = text.match(
				/(?:к|ко)\s+(терапевту|хирургу|ортопеду|ортодонту|гигиенисту|[а-яё]+ву|[а-яё]+ой)/,
			);
			const phoneMatch = text.match(
				/(?:\+7|8)[\s-]*\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/,
			);

			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			let action: any = "schedule";
			if (text.includes("новый пациент")) action = "create_patient";

			const pName = extractPatientName(
				text,
				"запиши|записать|создай запись(?: для)?|запись для|запись на|запись|новый пациент",
			);
			if (!pName) return null; // Without a patient name, scheduling is impossible locally. Fallback to LLM.

			return {
				action: action,
				payload: {
					patientName: pName,
					phone: phoneMatch ? phoneMatch[0].replace(/[\s-()]/g, "") : undefined,
					dayOffset: dateInfo?.relativeDays,
					targetWeekday: dateInfo?.targetWeekday,
					exactDate: dateInfo?.dayString,
					time: timeStr,
					doctorOrSpecialty: doctorMatch ? doctorMatch[1] : null,
				},
			};
		}
	}

	const openCardMatch = text.match(
		/(?:открой карточку|карточка|открой)\s+(.*)/i,
	);
	if (openCardMatch && ((openCardMatch[1] as string)?.length ?? 0) > 3) {
		return {
			action: "open_card",
			payload: { patientName: (openCardMatch[1] as string)?.trim() },
		};
	}

	const implantMatch = text.match(
		/(?:поставь|добавь)?\s*имплант(?:ат)?\s*(\d+[.,]?\d*)\s*(?:на|x|х)\s*(\d+[.,]?\d*)/i,
	);
	if (implantMatch && !text.includes("зуб")) {
		return {
			action: "add_implant",
			payload: {
				diameter: parseFloat(
					(implantMatch[1] as string)?.replace(",", ".") || "0",
				),
				length: parseFloat(
					(implantMatch[2] as string)?.replace(",", ".") || "0",
				),
			},
		};
	}

	if (context === "visit") {
		const teethCodes = expandToothRanges(text);
		const clauses = text.split(/[.,;!?]/).filter(Boolean);
		const toothUpdates: ToothUpdate[] = [];
		const emkUpdates: EmkUpdates = {};
		let hasValidMatch = false;

		const cost = extractCost(text);
		if (cost) emkUpdates.costRub = cost;

		const anesthesia = extractDentalAnesthesia(text);
		const procedures = extractDentalProcedures(
			text,
			teethCodes.length > 0 ? Number(teethCodes[0]) : undefined,
		);
		const globalSurfaces = extractToothSurfaces(text);
		const globalDiag = matchDentalDiagnosis(text);

		extractEmkSections(text, emkUpdates);
		const hasStructuredEmk = !!(
			emkUpdates.complaint ||
			emkUpdates.objectiveStatus ||
			emkUpdates.diagnosis ||
			emkUpdates.treatmentPlan
		);

		if (teethCodes.length > 0) {
			for (const clause of clauses) {
				const localTeeth = expandToothRanges(clause);
				const clauseDiag = matchDentalDiagnosis(clause);
				const clauseSurfaces = extractToothSurfaces(clause);

				let foundState: ToothUpdate["state"] | null = null;
				let clinicalState: ClinicalToothState | undefined;
				let diagCode: string | undefined;
				let diagTitle: string | undefined;

				if (clauseDiag) {
					foundState = clauseDiag.toothState;
					clinicalState = clauseDiag.clinicalState;
					diagCode = clauseDiag.code;
					diagTitle = clauseDiag.title;
				} else {
					for (const [keyword, state] of Object.entries(STATE_MAPPING)) {
						const regex = new RegExp(`(^|[^а-яё])${keyword}([^а-яё]|$)`, "i");
						if (regex.test(clause)) {
							foundState = state;
							break;
						}
					}
				}

				if (!foundState && globalDiag) {
					foundState = globalDiag.toothState;
					clinicalState = globalDiag.clinicalState;
					diagCode = globalDiag.code;
					diagTitle = globalDiag.title;
				}

				if (foundState) {
					const targetTeeth = localTeeth.length > 0 ? localTeeth : teethCodes;
					const effectiveSurfaces =
						clauseSurfaces.length > 0
							? clauseSurfaces
							: globalSurfaces.length > 0
								? globalSurfaces
								: undefined;

					targetTeeth.forEach((code) => {
						if (
							!toothUpdates.some(
								(tu) => tu.code === code && tu.state === foundState,
							)
						) {
							toothUpdates.push({
								code,
								state: foundState!,
								surfaces: effectiveSurfaces,
								clinicalState,
								diagnosisCode: diagCode,
								diagnosisTitle: diagTitle,
							});
						}
					});
					hasValidMatch = true;
				}
			}
		}

		if (anesthesia) {
			emkUpdates.anesthesia = anesthesia;
			hasValidMatch = true;
		}

		if (procedures.length > 0) {
			emkUpdates.procedures = procedures;
			hasValidMatch = true;
		}

		if (globalDiag && !emkUpdates.diagnosis) {
			emkUpdates.diagnosis = `${globalDiag.code} ${globalDiag.title}`;
			emkUpdates.diagnosisIcd10 = globalDiag.code;
			hasValidMatch = true;
		}

		// If we don't have structured EMK from doctor's section headers, synthesize a clean SOAP 043/u record
		if (!hasStructuredEmk && (teethCodes.length > 0 || globalDiag || anesthesia || procedures.length > 0)) {
			const synth = synthesizeSoapRecord(
				text,
				teethCodes.map(Number),
				globalSurfaces,
				globalDiag,
				anesthesia,
				procedures,
			);
			if (!emkUpdates.complaint && synth.complaint) emkUpdates.complaint = synth.complaint;
			if (!emkUpdates.anamnesis && synth.anamnesis) emkUpdates.anamnesis = synth.anamnesis;
			if (!emkUpdates.objectiveStatus && synth.objectiveStatus) emkUpdates.objectiveStatus = synth.objectiveStatus;
			if (!emkUpdates.diagnosis && synth.diagnosis) emkUpdates.diagnosis = synth.diagnosis;
			if (!emkUpdates.diagnosisIcd10 && synth.diagnosisIcd10) emkUpdates.diagnosisIcd10 = synth.diagnosisIcd10;
			if (!emkUpdates.treatmentPlan && synth.treatmentPlan) emkUpdates.treatmentPlan = synth.treatmentPlan;
			if (!emkUpdates.recommendations && synth.recommendations) emkUpdates.recommendations = synth.recommendations;
		}

		// If we couldn't match a specific tooth or emk section, try a broader fallback
		if (!hasValidMatch && text.length > 10 && !hasStructuredEmk) {
			if (text.includes("жалоб")) emkUpdates.complaint = text;
			else if (text.includes("анамнез")) emkUpdates.anamnesis = text;
			else if (text.includes("диагноз")) emkUpdates.diagnosis = text;
			else return null; // If it's a completely generic string, let the LLM sort it out
			hasValidMatch = true;
		}

		if (hasValidMatch || cost || hasStructuredEmk) {
			if (emkUpdates.complaint && !hasStructuredEmk)
				emkUpdates.complaint =
					emkUpdates.complaint.charAt(0).toUpperCase() +
					emkUpdates.complaint.slice(1);
			return {
				action: "update_tooth",
				payload: {
					toothUpdates,
					emkUpdates,
					anesthesia: anesthesia || undefined,
					procedures: procedures.length > 0 ? procedures : undefined,
				},
				toothUpdates,
				emkUpdates,
				anesthesia: anesthesia || undefined,
				procedures: procedures.length > 0 ? procedures : undefined,
			};
		}
		return null;
	}

	if (context === "patient") {
		const phoneMatch = text.match(
			/(?:\+7|8)[\s-]*\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/,
		);
		const nameMatch = text.match(/([А-ЯЁ][а-яё]+(?: [А-ЯЁ][а-яё]+){1,2})/);
		if (phoneMatch || nameMatch) {
			return {
				action: "create_patient",
				payload: {
					fullName: nameMatch ? (nameMatch[1] as string) : null,
					phone: phoneMatch ? phoneMatch[0].replace(/[\s-()]/g, "") : null,
					notes: text,
				},
			};
		}
		return null;
	}

	return null;
}
