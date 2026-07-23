// @ts-nocheck
import type { ParserContext } from "./dictationParser.js";

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
}

export interface EmkUpdates {
	complaint?: string;
	anamnesis?: string;
	objectiveStatus?: string;
	diagnosis?: string;
	treatmentPlan?: string;
	costRub?: number;
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
	payload?: any;
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

	// Handle 'полпервого' / 'пол первого'
	m = text.match(/(пол(?:овин[аеу])?\s*|четверть\s+)([а-яё]+)/i);
	if (m) {
		const isQuarter = m[1].includes("четверть");
		const word = (m[2] as string).substring(0, 3);
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

	// Handle explicit word matching 'в 10 утра'
	m = text.match(
		/(?:в|на)\s*(\d{1,2}|[а-яё]+)(?:\s*(?:час|утра|дня|вечера))?(?!\s*\d)/i,
	);
	if (m) {
		let h = parseInt(m[1] as string, 10);
		if (isNaN(h)) h = parseWordNumber(m[1] as string) || 0;
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
		if (isNaN(day)) day = parseWordNumber(m[1] as string) || 0;

		if (day > 0 && day <= 31) {
			const monthWord = m[2].substring(0, 5);
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
			if ((m[2] as string).startsWith("числ")) {
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

function extractPatientName(
	text: string,
	actionRegexStr: string,
): string | null {
	// Use lookahead to find the name strictly between the action and any temporal/preposition words
	const regex = new RegExp(
		`(?:${actionRegexStr})\\s+(.*?)(?=\\s+(?:на|в|к|телефон|с|завтра|сегодня|послезавтра)(?:\\s|$)|\\s+\\d|$)`,
		"i",
	);
	const match = text.match(regex);
	if (match && match[1].length > 2) {
		const cleanName = match[1].replace(/^(?:для|запись)\s+/i, "").trim();
		if (cleanName.length > 2) return cleanName;
	}
	return null;
}

function extractCost(text: string): number | null {
	const m = text.match(
		/(?:стоимость|цена|оплата|взяли|с пациента|оплатила|оплатил)\s*(\d+(?:[.,]\d+)?)\s*(тысяч|тыс|руб|р|₽)?/i,
	);
	if (m) {
		let val = parseFloat((m[1] as string).replace(",", "."));
		if (m[2] && m[2].startsWith("тыс")) val *= 1000;
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
		return parseInt(standalone[1], 10);
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
						(updates[currentSection] ? updates[currentSection] + " " : "") +
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
				currentContent += " " + token;
			}
		}
	}

	// Finalize the last section
	if (currentSection && currentContent.trim()) {
		updates[currentSection] =
			(updates[currentSection] ? updates[currentSection] + " " : "") +
			currentContent
				.trim()
				.replace(/^[:-]+/, "")
				.trim();
	}
}

function expandToothRanges(text: string): string[] {
	const allTeeth = new Set<string>();

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
		const start = parseInt(m[1]);
		const end = parseInt(m[2]);
		if (Math.floor(start / 10) === Math.floor(end / 10)) {
			const min = Math.min(start, end);
			const max = Math.max(start, end);
			for (let i = min; i <= max; i++) allTeeth.add(i.toString());
		}
	}
	const individualMatches = [...text.matchAll(TOOTH_REGEX)];
	for (const m of individualMatches) allTeeth.add(m[1]);

	const wordMatches = [
		...text.matchAll(/(?:на|зуб|зубе)\s+([а-яё]+)\s+([а-яё]+)/gi),
	];
	for (const m of wordMatches) {
		const dec = parseWordNumber(m[1] as string);
		const unit = parseWordNumber(m[2]);
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
			text.match(/(запиши|записать|создай запись|запись для|новый пациент)/)
		) {
			const dateInfo = extractDate(text);
			const timeStr = extractTime(text);
			const doctorMatch = text.match(
				/(?:к|ко)\s+(терапевту|хирургу|ортопеду|ортодонту|гигиенисту|[а-яё]+ву|[а-яё]+ой)/,
			);
			const phoneMatch = text.match(
				/(?:\+7|8)[\s-]*\(?\d{3}\)?[\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/,
			);

			let action: any = "schedule";
			if (text.includes("новый пациент")) action = "create_patient";

			const pName = extractPatientName(
				text,
				"запиши|записать|создай запись(?: для)?|запись для|новый пациент",
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
				let foundState: any = null;
				for (const [keyword, state] of Object.entries(STATE_MAPPING)) {
					const regex = new RegExp(
						`(^|[^а-яё])` + keyword + `([^а-яё]|$)`,
						"i",
					);
					if (regex.test(clause)) {
						foundState = state;
						if (!hasStructuredEmk) {
							if (state === "treatment") {
								if (!emkUpdates.complaint)
									emkUpdates.complaint = (clause as string).trim();
								if (!emkUpdates.diagnosis) emkUpdates.diagnosis = keyword;
							} else if (state === "implant" || state === "prosthetics") {
								if (!emkUpdates.treatmentPlan)
									emkUpdates.treatmentPlan = clause.trim();
							}
						}
						break;
					}
				}
				if (foundState) {
					const targetTeeth = localTeeth.length > 0 ? localTeeth : teethCodes;
					targetTeeth.forEach((code) => {
						if (
							!toothUpdates.some(
								(tu) => tu.code === code && tu.state === foundState,
							)
						) {
							toothUpdates.push({ code, state: foundState });
						}
					});
					hasValidMatch = true;
				}
			}
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
			return { action: "update_tooth", payload: { toothUpdates, emkUpdates } };
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
