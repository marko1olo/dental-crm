import { containsAnyFuzzyRoot, textToNumbers } from "./stringUtils";

export interface ParsedPatientData {
	fullName: string;
	phone: string;
	birthDate: string;
	notes?: string;
	email?: string;
}

/**
 * Существует ли такая календарная дата и не в будущем ли она.
 *
 * Date принимает переполнение: new Date("1990-02-31") даёт 3 марта, поэтому
 * сверяем разобранные части с тем, что получилось. Дата рождения в будущем
 * невозможна и означает ошибку разбора, а не данные пациента.
 */
function isRealPastDateOnly(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return false;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (month < 1 || month > 12 || day < 1 || day > 31) return false;
	const asDate = new Date(year, month - 1, day);
	if (
		asDate.getFullYear() !== year ||
		asDate.getMonth() !== month - 1 ||
		asDate.getDate() !== day
	)
		return false;
	const endOfToday = new Date();
	endOfToday.setHours(23, 59, 59, 999);
	return asDate.getTime() <= endOfToday.getTime();
}

export function parsePatientDictationLocal(input: string): ParsedPatientData {
	const result: ParsedPatientData = { fullName: "", phone: "", birthDate: "" };
	let normalizedInput = textToNumbers(input);

	// Normalize email dictations
	normalizedInput = normalizedInput.replace(
		/(?:^|[^а-яёa-z0-9])(собака|собачка|эт)(?:[^а-яёa-z0-9]|$)/gi,
		"@",
	);
	normalizedInput = normalizedInput.replace(
		/(?:^|[^а-яёa-z0-9])(точка)(?:[^а-яёa-z0-9]|$)/gi,
		".",
	);
	normalizedInput = normalizedInput.replace(
		/(?:^|[^а-яёa-z0-9])(нижнее подчеркивание)(?:[^а-яёa-z0-9]|$)/gi,
		"_",
	);
	normalizedInput = normalizedInput.replace(
		/(?:^|[^а-яёa-z0-9])(тире)(?:[^а-яёa-z0-9]|$)/gi,
		"-",
	);
	normalizedInput = normalizedInput.replace(/\s+@\s+/g, "@");
	normalizedInput = normalizedInput.replace(/\s+\.\s+/g, ".");

	let remaining = " " + normalizedInput + " ";

	// 0. Notes & Tags extraction
	const notesMatch = remaining.match(
		/(?:^|[^а-яёa-z0-9])(заметка|примечание|комментарий|важно|пометка|жалоба|жалобы)\s*[:-]?\s*(.*)/i,
	);
	if (notesMatch && notesMatch[2]) {
		result.notes = notesMatch[2].trim();
		remaining = remaining.substring(0, notesMatch.index);
	}

	const medicalTags: string[] = [];
	const tagRegexes = [
		{
			regex:
				/(?:^|[^а-яёa-z0-9])(аллерги[яик]\s*(?:на\s+[а-я]+)?)(?:[^а-яёa-z0-9]|$)/i,
		},
		{
			regex: /(?:^|[^а-яёa-z0-9])(дмс|по дмс)(?:[^а-яёa-z0-9]|$)/i,
			tag: "ДМС",
		},
		{ regex: /(?:^|[^а-яёa-z0-9])(вип|vip)(?:[^а-яёa-z0-9]|$)/i, tag: "VIP" },
		{
			regex:
				/(?:^|[^а-яёa-z0-9])(боится\s*боли|страх|паник)(?:[^а-яёa-z0-9]|$)/i,
			tag: "Боится боли",
		},
		{
			regex:
				/(?:^|[^а-яёa-z0-9])(опаздывает|задерживается)(?:[^а-яёa-z0-9]|$)/i,
			tag: "Часто опаздывает",
		},
		{
			regex:
				/(?:^|[^а-яёa-z0-9])(сложный\s*пациент|конфликтный)(?:[^а-яёa-z0-9]|$)/i,
			tag: "Сложный пациент",
		},
		{
			regex:
				/(?:^|[^а-яёa-z0-9])(только\s*по\s*выходным|в\s*выходные)(?:[^а-яёa-z0-9]|$)/i,
			tag: "Только по выходным",
		},
		{
			regex:
				/(?:^|[^а-яёa-z0-9])(беременност[ьяи]\s*[1-9]?\s*(?:месяц|недел[яиь]|тримсестр)?)(?:[^а-яёa-z0-9]|$)/i,
			tag: "Беременность",
		},
	];

	for (const t of tagRegexes) {
		const match = remaining.match(t.regex);
		if (match && match[1]) {
			medicalTags.push(
				t.tag ||
					match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase(),
			);
			remaining = remaining.replace(match[1], " ");
		}
	}

	if (medicalTags.length > 0) {
		const tagsString = medicalTags.join(", ");
		result.notes = result.notes ? `${result.notes}, ${tagsString}` : tagsString;
	}

	// 1. Email extraction
	const emailRegex =
		/(?:^|[^a-z0-9._%+-])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})(?:[^a-z0-9._%+-]|$)/i;
	const emailMatch = remaining.match(emailRegex);
	if (emailMatch && emailMatch[1]) {
		result.email = emailMatch[1].trim();
		remaining = remaining.replace(emailMatch[1], " ");
	}

	// 2. Phone extraction
	const phoneRegex =
		/((?:\+7|8|7)?[\s\-()]*[98][\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d[\s\-()]*\d(?:[^0-9]|$))/i;
	const phoneMatch = remaining.match(phoneRegex);
	if (phoneMatch && phoneMatch[1]) {
		const raw = phoneMatch[1];
		let cleaned = raw.replace(/\D/g, "");
		if (cleaned.length === 10) cleaned = "7" + cleaned;
		if (cleaned.length === 11 && cleaned.startsWith("8"))
			cleaned = "7" + cleaned.slice(1);
		if (cleaned.length === 11) {
			result.phone = "+" + cleaned;
			remaining = remaining.replace(raw, " ");
		}
	}

	// 3. Date of birth extraction
	const dobRegexNum =
		/(?:^|[^0-9])(\d{1,2})[./\-\s]+(?:0\s+)?(\d{1,2})[./\-\s]+(?:0\s+)?(\d{2,4})(?:[^0-9]|$)/;
	const dobMatchNum = remaining.match(dobRegexNum);
	if (dobMatchNum && dobMatchNum[1] && dobMatchNum[2] && dobMatchNum[3]) {
		const day = dobMatchNum[1];
		const month = dobMatchNum[2];
		let year = dobMatchNum[3];
		if (year.length === 2) {
			/* БЫЛО: `y > 30 ? 19xx : 20xx` — порог зашит числом 30, поэтому годы
         от 00 до 30 уходили в будущее: «12.05.30» давало 2030-05-12, то есть
         дату рождения, которая ещё не наступила. Порог должен быть текущим
         годом: двузначный год не больше текущего — это наш век, больше —
         предыдущий. Тогда «30» это 1930, а «05» — 2005. */
			const twoDigitYear = parseInt(year, 10);
			const currentTwoDigitYear = new Date().getFullYear() % 100;
			year = twoDigitYear <= currentTwoDigitYear ? `20${year}` : `19${year}`;
		}
		const candidate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
		/* БЫЛО: строка собиралась без проверки, и наружу уходили даты, которых
       не существует: «31.02.1990» -> «1990-02-31», «12.13.1990» ->
       «1990-13-12», «00.05.1990» -> «1990-05-00». Сервер такие значения
       отклоняет, но оператор видел в предпросмотре правдоподобную дату и не
       понимал, за что отказ. Пустое поле честнее подставленной ошибки. */
		if (isRealPastDateOnly(candidate)) {
			result.birthDate = candidate;
			remaining = remaining.replace(dobMatchNum[0].trim(), " ");
		}
	} else {
		const monthRoots = [
			"январ",
			"феврал",
			"март",
			"апрел",
			"мая",
			"май",
			"июн",
			"июл",
			"август",
			"сентябр",
			"октябр",
			"ноябр",
			"декабр",
		];
		const monthMap: Record<string, number> = {
			январ: 1,
			феврал: 2,
			март: 3,
			апрел: 4,
			мая: 5,
			май: 5,
			июн: 6,
			июл: 7,
			август: 8,
			сентябр: 9,
			октябр: 10,
			ноябр: 11,
			декабр: 12,
		};

		const wordsTokens = remaining.split(/[\s,]+/);
		for (let i = 0; i < wordsTokens.length - 1; i++) {
			const w1 = wordsTokens[i] || "";
			const w2 = wordsTokens[i + 1] || "";

			const dayNum = parseInt(w1, 10);
			if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
				let matchedMonth = -1;
				for (const root of monthRoots) {
					if (w2.toLowerCase().startsWith(root.substring(0, 3))) {
						matchedMonth = monthMap[root]!;
						break;
					}
				}

				if (matchedMonth !== -1) {
					let yearStr = "";
					let yearWordIndex = -1;
					for (let k = 1; k <= 3; k++) {
						const potentialYear = wordsTokens[i + 1 + k];
						if (potentialYear && /^\d{2,4}[.,;!?]*$/.test(potentialYear)) {
							yearStr = potentialYear.replace(/[.,;!?]/g, "");
							yearWordIndex = i + 1 + k;
							break;
						}
					}

					if (yearStr) {
						let year = yearStr;
						if (year.length === 2) {
							// Тот же порог по текущему году, что и в числовой ветке выше.
							const twoDigitYear = parseInt(year, 10);
							const currentTwoDigitYear = new Date().getFullYear() % 100;
							year =
								twoDigitYear <= currentTwoDigitYear ? `20${year}` : `19${year}`;
						}
						const candidate = `${year}-${String(matchedMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
						// «31 февраля 1990» существовать не может, как и дата в будущем.
						if (!isRealPastDateOnly(candidate)) continue;
						result.birthDate = candidate;

						const matchedTokensRegex = wordsTokens
							.slice(i, yearWordIndex + 1)
							.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
							.join("\\s+");
						remaining = remaining.replace(
							new RegExp(matchedTokensRegex, "i"),
							" ",
						);
						remaining = remaining.replace(
							/(?:^|[^а-яёa-z0-9])(?:года|год)(?:[^а-яёa-z0-9]|$)/gi,
							" ",
						);
						break;
					}
				}
			}
		}
	}

	// 4. Name extraction & cleanup
	const stopWords = [
		"создай",
		"создать",
		"добавь",
		"добавить",
		"запиши",
		"записать",
		"пациент",
		"пациента",
		"пациентка",
		"карточку",
		"девочку",
		"мальчика",
		"ребенка",
		"пац",
		"поц",
		"новый",
		"нового",
		"новая",
		"новую",
		"пожалуйста",
		"имя",
		"на",
		"в",
		"к",
		"с",
		"доктор",
		"доктора",
		"врач",
		"врача",
		"прием",
		"срочно",
		"запись",
		"отмени",
		"перенеси",
		"передвинь",
		"телефон",
		"мобильный",
		"номер",
		"сотовый",
		"тел",
		"дата",
		"рождения",
		"год",
		"года",
		"зовут",
		"лет",
		"др",
		"почта",
		"email",
		"днюха",
		"днюху",
		"анамнезе",
		"анамнез",
		"заметка",
		"примечание",
		"комментарий",
		"важно",
		"пометка",
		"плюс",
		"плюсом",
		"собака",
		"собачка",
		"точка",
	];
	const stopWordsPattern = new RegExp(
		`(?:^|[^а-яёa-z0-9])(${stopWords.join("|")})(?:[^а-яёa-z0-9]|$)`,
		"gi",
	);

	// Apply multiple times to catch overlapping boundaries like " Новый пациент "
	remaining = remaining.replace(stopWordsPattern, " ");
	remaining = remaining.replace(stopWordsPattern, " ");

	// Clean up punctuation and numbers in names
	remaining = remaining
		.replace(/[0-9.,;!?+@_]/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (remaining.length > 0) {
		result.fullName = remaining
			.split(" ")
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
			.join(" ");
	}

	return result;
}
