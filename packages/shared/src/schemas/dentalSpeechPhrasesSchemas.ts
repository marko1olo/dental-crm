import { type DentalSpecialty } from "./aiAndEgiszSchemas.js";
import { type DentalSpeechNormalization } from "./visitDraftParserProfileSchemas.js";
import { spokenAnatomicToothMap, spokenToothNumberMap } from "./dentalSpeechNumbersSchemas.js";
import { dentalSpeechReplacementMap, spokenToothOrdinalMap } from "./dentalSpeechReplacementSchemas.js";
import { ruleParserSpecialtyLabels } from "./localBridgeAndSpeechTokensSchemas.js";

export const spokenToothPhraseMap: Array<[string, string]> = [
	["один один", "11"],
	["одиннадцатый", "11"],
	["одиннадцатого", "11"],
	["один два", "12"],
	["двенадцатый", "12"],
	["один три", "13"],
	["тринадцатый", "13"],
	["один четыре", "14"],
	["четырнадцатый", "14"],
	["один пять", "15"],
	["пятнадцатый", "15"],
	["один шесть", "16"],
	["шестнадцатый", "16"],
	["один семь", "17"],
	["семнадцатый", "17"],
	["один восемь", "18"],
	["восемнадцатый", "18"],
	["два один", "21"],
	["двадцать первый", "21"],
	["два два", "22"],
	["двадцать второй", "22"],
	["два три", "23"],
	["двадцать третий", "23"],
	["два четыре", "24"],
	["двадцать четвертый", "24"],
	["два пять", "25"],
	["двадцать пятый", "25"],
	["два шесть", "26"],
	["двадцать шестой", "26"],
	["два семь", "27"],
	["двадцать седьмой", "27"],
	["два восемь", "28"],
	["двадцать восьмой", "28"],
	["три один", "31"],
	["тридцать первый", "31"],
	["три два", "32"],
	["тридцать второй", "32"],
	["три три", "33"],
	["тридцать третий", "33"],
	["три четыре", "34"],
	["тридцать четвертый", "34"],
	["три пять", "35"],
	["тридцать пятый", "35"],
	["три шесть", "36"],
	["тридцать шестой", "36"],
	["три семь", "37"],
	["тридцать седьмой", "37"],
	["три восемь", "38"],
	["тридцать восьмой", "38"],
	["четыре один", "41"],
	["сорок первый", "41"],
	["четыре два", "42"],
	["сорок второй", "42"],
	["четыре три", "43"],
	["сорок третий", "43"],
	["четыре четыре", "44"],
	["сорок четвертый", "44"],
	["четыре пять", "45"],
	["сорок пятый", "45"],
	["четыре шесть", "46"],
	["сорок шестой", "46"],
	["четыре семь", "47"],
	["сорок седьмой", "47"],
	["четыре восемь", "48"],
	["сорок восьмой", "48"],
];

export const dentalSpeechPhraseMap: Array<[string, string, string]> = [
	["к л к т", "КЛКТ", "КЛКТ"],
	["клкт", "КЛКТ", "КЛКТ"],
	["конусно лучевая компьютерная томография", "КЛКТ", "КЛКТ"],
	["к т", "КТ", "КТ"],
	["кт", "КТ", "КТ"],
	["о п т г", "ОПТГ", "ОПТГ"],
	["оптг", "ОПТГ", "ОПТГ"],
	["р в г", "RVG", "RVG"],
	["эр вэ гэ", "RVG", "RVG"],
	["рвг", "RVG", "RVG"],
	["э о д", "ЭОД", "ЭОД"],
	["е о д", "ЭОД", "ЭОД"],
	["эод", "ЭОД", "ЭОД"],
	["еод", "ЭОД", "ЭОД"],
	["ди эс", "DS", "DS"],
	["д с", "DS", "DS"],
	["ди икс", "Dx", "Dx"],
	["д икс", "Dx", "Dx"],
	["эм ка бэ", "МКБ-10", "МКБ-10"],
	["м к б", "МКБ-10", "МКБ-10"],
	["ка ноль два точка один", "K02.1", "K02.1"],
	["к ноль два точка один", "K02.1", "K02.1"],
	["ка ноль четыре точка ноль", "K04.0", "K04.0"],
	["к ноль четыре точка ноль", "K04.0", "K04.0"],
	["ка ноль четыре точка пять", "K04.5", "K04.5"],
	["к ноль четыре точка пять", "K04.5", "K04.5"],
	["си би си ти", "CBCT", "CBCT"],
	["cbct", "CBCT", "CBCT"],
	["кофердам", "коффердам", "коффердам"],
	["кофедам", "коффердам", "коффердам"],
	["кофирдам", "коффердам", "коффердам"],
	["раббер дам", "коффердам", "коффердам"],
	["эйр флоу", "Air Flow", "Air Flow"],
	["айр флоу", "Air Flow", "Air Flow"],
	["air flow", "Air Flow", "Air Flow"],
	["airflow", "Air Flow", "Air Flow"],
	["е макс", "E.max", "E.max"],
	["и макс", "E.max", "E.max"],
	["emax", "E.max", "E.max"],
	["пульпид", "пульпит", "пульпит"],
	["периодантит", "периодонтит", "периодонтит"],
	["переодонтит", "периодонтит", "периодонтит"],
	["пародантит", "пародонтит", "пародонтит"],
	["парадонтит", "пародонтит", "пародонтит"],
	["кариес дентин", "кариес дентина", "кариес дентина"],
	["кариозная поласть", "кариозная полость", "кариозная полость"],
	["зандирование", "зондирование", "зондирование"],
	["перкусия", "перкуссия", "перкуссия"],
	["пальпацыя", "пальпация", "пальпация"],
	["адгизивный протокол", "адгезивный протокол", "адгезивный протокол"],
	["рестоврация", "реставрация", "реставрация"],
	["пламба", "пломба", "пломба"],
	["холодовая проба", "холодовая проба", "холодовая проба"],
	["термо проба", "холодовая проба", "холодовая проба"],
	["визиография", "прицельный снимок", "прицельный снимок"],
	["апрокс имальная", "апроксимальная", "апроксимальная поверхность"],
	["апроксималная", "апроксимальная", "апроксимальная поверхность"],
	["контактный пунт", "контактный пункт", "контактный пункт"],
	["контактный пукнт", "контактный пункт", "контактный пункт"],
	["и р о п з", "ИРОПЗ", "ИРОПЗ"],
	["иропз", "ИРОПЗ", "ИРОПЗ"],
	["к п у", "КПУ", "КПУ"],
	["с и ц", "СИЦ", "СИЦ"],
	["стекло иономерный", "стеклоиономерный", "стеклоиономерный цемент"],
	["м т а", "MTA", "MTA"],
	["фесура", "фиссура", "фиссура"],
	["гермитизация", "герметизация", "герметизация"],
	["мастер штифт", "мастер-штифт", "мастер-штифт"],
	["м о д", "МОД", "МОД"],
	["эм о дэ", "МОД", "МОД"],
	["мезиально окклюзиально дистальная", "МОД", "МОД"],
	["мезиально окклюзиальная", "МО", "МО"],
	["дистально окклюзиальная", "ОД", "ОД"],
	["второго класса по блэку", "II класс по Блэку", "класс по Блэку"],
	["второго класса по блеку", "II класс по Блэку", "класс по Блэку"],
	["финишная обработка", "финирование", "финирование"],
	["полеровка", "полировка", "полировка"],
	["корекция оклюзии", "коррекция окклюзии", "коррекция окклюзии"],
	["коррекция оклюзии", "коррекция окклюзии", "коррекция окклюзии"],
	["пришлифовка", "шлифовка", "шлифовка"],
	["иригация", "ирригация", "ирригация"],
	["пломбировка каналов", "пломбирование каналов", "пломбирование каналов"],
	["диоксид циркония", "диоксид циркония", "диоксид циркония"],
	["циркон", "цирконий", "цирконий"],
	["металлокерамика", "металлокерамика", "металлокерамика"],
	["пмма", "PMMA", "PMMA"],
	["композитный винир", "композитный винир", "композитный винир"],
	["керамический винир", "керамический винир", "керамический винир"],
	["инлей", "inlay", "inlay"],
	["онлей", "onlay", "onlay"],
	["оверлей", "overlay", "overlay"],
	["эндокоронка", "эндокоронка", "эндокоронка"],
	["абатмент", "абатмент", "абатмент"],
	["формирователь десны", "формирователь десны", "формирователь десны"],
	["синус лифтинг", "синус-лифтинг", "синус-лифтинг"],
	["костная пластика", "костная пластика", "костная пластика"],
	["навигационный шаблон", "навигационный шаблон", "навигационный шаблон"],
	["айтеро", "iTero", "iTero"],
	["медит", "Medit", "Medit"],
	["три шейп", "3Shape", "3Shape"],
	["обьективно", "объективно", "объективно"],
	["объективна", "объективно", "объективно"],
	["статус презенс", "status praesens", "status praesens"],
	["статус локалис", "status localis", "status localis"],
	["анастезия", "анестезия", "анестезия"],
	["анистезия", "анестезия", "анестезия"],
	["ортопантомограмма", "ОПТГ", "ОПТГ"],
	["ортопантомограмму", "ОПТГ", "ОПТГ"],
];

export function escapedPhrasePattern(phrase: string): RegExp {
	const escaped = phrase
		.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
		.replace(/\s+/g, "\\s+");
	return new RegExp(
		`(?<![0-9A-Za-zА-Яа-яЁё])${escaped}(?![0-9A-Za-zА-Яа-яЁё])`,
		"gi",
	);
}

export function applyTrackedReplacement(
	text: string,
	pattern: RegExp,
	replacement: string,
	label: string,
	changes: string[],
): string {
	if (!pattern.test(text)) return text;
	pattern.lastIndex = 0;
	changes.push(label);
	return text.replace(pattern, replacement);
}

export function applyTrackedPhraseReplacement(
	text: string,
	phrase: string,
	replacement: string,
	label: string,
	changes: string[],
): string {
	return applyTrackedReplacement(
		text,
		escapedPhrasePattern(phrase),
		replacement,
		label,
		changes,
	);
}

export function normalizeSpeechSections(text: string): string {
	return text
		.replace(/\s+((?:без\s+жалоб|жалобы\s+отрицает)\s*[:-]?)/gi, "\n$1")
		.replace(/(?<!без)\s+(жалоб(?:ы|а)?(?!\s+отрицает)\s*[:-]?)/gi, "\n$1")
		.replace(/\s+((?:пациент\s+)?жалуется\s*[:-]?)/gi, "\n$1")
		.replace(/\s+((?:пациент\s+)?отмечает\s*[:-]?)/gi, "\n$1")
		.replace(/\s+((?:беспокоит|беспокоят)\s*[:-]?)/gi, "\n$1")
		.replace(/\s+(анамнез\s*[:-]?)/gi, "\n$1")
		.replace(
			/\s+((?:аллергологический\s+анамнез|аллерги(?:я|ю)|соматически|соматический\s+статус|препараты|лекарственные\s+препараты|постоянные\s+препараты)\s*[:-]?)/gi,
			"\n$1",
		)
		.replace(/\s+(со слов\s*[:-]?)/gi, "\n$1")
		.replace(
			/\s+((?:из\s+анамнеза|со\s+слов\s+пациента|ранее\s+лечен|ранее\s+лечилась|после\s+лечения)\s*[:-]?)/gi,
			"\n$1",
		)
		.replace(/\s+(объективно\s*[:-]?)/gi, "\n$1")
		.replace(
			/\s+((?:status\s+praesens|status\s+localis|осмотр|при\s+осмотре|на\s+снимке|рентгенологически)\s*[:-]?)/gi,
			"\n$1",
		)
		.replace(/\s+((?:DS|Dx|D\/S)\s*[:-]?)/gi, "\n$1")
		.replace(
			/\s+((?:ds|dx|d\/s|предварительный\s+)?диагноз\s*[:-]?|предварительно\s*[:-]?)/gi,
			"\n$1",
		)
		.replace(/\s+(план\s*[:-]?)/gi, "\n$1")
		.replace(
			/\s+((?:лечение|показано|проведен(?:о|а|ы)?|выполнен(?:о|а|ы)?|сделан(?:о|а|ы)?|назначен(?:о|а|ы)?|рекомендован(?:о|а|ы)?)\s*[:-]?)/gi,
			"\n$1",
		)
		.replace(/\s+(рекомендации\s*[:-]?)/gi, "\n$1")
		.replace(/\n{3,}/g, "\n\n");
}

export function normalizeDentalSpeechTranscript(
	transcript: string,
	specialty: DentalSpecialty = "universal",
): DentalSpeechNormalization {
	const rawText = transcript;
	let normalizedText = transcript
		.replace(/\r\n?/g, "\n")
		.replace(/[ \t]+/g, " ")
		.replace(/\s+\n/g, "\n")
		.replace(/\n\s+/g, "\n")
		.trim();
	const changedPhrases: string[] = [];

	for (const [phrase, replacement] of spokenToothPhraseMap) {
		normalizedText = applyTrackedPhraseReplacement(
			normalizedText,
			phrase,
			replacement,
			`номер зуба -> ${replacement}`,
			changedPhrases,
		);
	}

	for (const [pattern, replacement] of spokenAnatomicToothMap) {
		normalizedText = applyTrackedReplacement(
			normalizedText,
			pattern,
			replacement,
			`анатомическое название зуба -> ${replacement.replace("зуб ", "")}`,
			changedPhrases,
		);
	}

	for (const [phrase, replacement, label] of dentalSpeechPhraseMap) {
		normalizedText = applyTrackedPhraseReplacement(
			normalizedText,
			phrase,
			replacement,
			label,
			changedPhrases,
		);
	}

	for (const [pattern, replacement] of spokenToothOrdinalMap) {
		normalizedText = applyTrackedReplacement(
			normalizedText,
			pattern,
			replacement,
			`номер зуба -> ${replacement}`,
			changedPhrases,
		);
	}

	for (const [pattern, replacement] of spokenToothNumberMap) {
		normalizedText = applyTrackedReplacement(
			normalizedText,
			pattern,
			replacement,
			`номер зуба -> ${replacement}`,
			changedPhrases,
		);
	}

	for (const [pattern, replacement, label] of dentalSpeechReplacementMap) {
		normalizedText = applyTrackedReplacement(
			normalizedText,
			pattern,
			replacement,
			label,
			changedPhrases,
		);
	}

	normalizedText = normalizeSpeechSections(normalizedText)
		.replace(/\s+([,.;:])/g, "$1")
		.replace(/([,.;:])(?=\S)/g, "$1 ")
		.replace(/\bK(0[0-9])\.\s+([0-9])\b/g, "K$1.$2")
		.replace(/\bE\.\s+max\b/gi, "E.max")
		.replace(/[ \t]{2,}/g, " ")
		.trim();

	const toothCodes = extractToothCodes(normalizedText);
	const lower = normalizedText.toLowerCase();
	const warnings = [
		"Нормализация диктовки только чистит текст и секции, не добавляет клинические факты.",
		`Фокус нормализации: ${ruleParserSpecialtyLabels[specialty]}.`,
	];
	if (changedPhrases.length) {
		warnings.push(
			`Изменены фразы: ${uniqueStrings(changedPhrases).slice(0, 8).join(", ")}.`,
		);
	}
	if (!toothCodes.length) {
		warnings.push(
			"Номер зуба не найден автоматически: врачу нужно проверить запись.",
		);
	}
	if (
		includesAnyText(lower, [
			"диагноз",
			"k01",
			"k02",
			"k04",
			"k05",
			"k08",
			"кариес",
			"пульпит",
			"периодонтит",
			"пародонтит",
		])
	) {
		warnings.push(
			"В тексте есть диагноз/код: система не подтверждает его автоматически.",
		);
	}

	return {
		rawText,
		normalizedText,
		changedPhrases: uniqueStrings(changedPhrases),
		warnings,
	};
}

export function includesAnyText(text: string, tokens: string[]): boolean {
	return tokens.some((token) => text.includes(token));
}

export function uniqueStrings(values: string[]): string[] {
	return Array.from(new Set(values));
}

export const complaintSectionPrefixes = [
	"жалобы",
	"жалоба",
	"без жалоб",
	"жалобы отрицает",
	"повод",
	"пациент жалуется",
	"жалуется",
	"пациент отмечает",
	"отмечает",
	"беспокоит",
	"беспокоят",
];

export const anamnesisSectionPrefixes = [
	"анамнез",
	"аллергологический анамнез",
	"аллергия",
	"аллергию",
	"соматически",
	"соматический статус",
	"препараты",
	"лекарственные препараты",
	"постоянные препараты",
	"из анамнеза",
	"со слов",
	"со слов пациента",
	"ранее лечен",
	"ранее лечилась",
	"после лечения",
];

export const objectiveSectionPrefixes = [
	"объективно",
	"объективный статус",
	"status praesens",
	"status localis",
	"осмотр",
	"при осмотре",
	"на снимке",
	"рентгенологически",
];

export const diagnosisSectionPrefixes = [
	"диагноз",
	"предварительный диагноз",
	"клинический диагноз",
	"предварительно",
	"DS",
	"Dx",
	"D/S",
];

export const planSectionPrefixes = [
	"план",
	"лечение",
	"показано",
	"проведено",
	"проведена",
	"проведены",
	"выполнено",
	"выполнена",
	"выполнены",
	"сделано",
	"сделана",
	"сделаны",
	"рекомендации",
	"рекомендовано",
	"рекомендована",
	"рекомендованы",
	"назначения",
	"назначено",
	"назначена",
	"назначены",
];

export const allSectionPrefixes = [
	...complaintSectionPrefixes,
	...anamnesisSectionPrefixes,
	...objectiveSectionPrefixes,
	...diagnosisSectionPrefixes,
	...planSectionPrefixes,
];

export function cleanRuleParserLine(value: string): string {
	const trimmed = value.trim();
	if (/^(?:без\s+жалоб|жалобы\s+отрицает)\s*[:\-.]?$/i.test(trimmed))
		return "нет";
	return value
		.replace(
			/^(жалобы|жалоба|без жалоб|жалобы отрицает|повод|пациент жалуется|жалуется|пациент отмечает|отмечает|беспокоит|беспокоят|анамнез|аллергологический анамнез|аллергия|аллергию|соматически|соматический статус|препараты|лекарственные препараты|постоянные препараты|из анамнеза|со слов|со слов пациента|ранее лечен|ранее лечилась|после лечения|объективно|объективный статус|status praesens|status localis|осмотр|при осмотре|на снимке|рентгенологически|диагноз|предварительный диагноз|клинический диагноз|предварительно|DS|Dx|D\/S|план|лечение|показано|проведено|проведена|проведены|выполнено|выполнена|выполнены|сделано|сделана|сделаны|рекомендации|рекомендовано|рекомендована|рекомендованы|назначения|назначено|назначена|назначены)\s*[:\-.]?\s*/i,
			"",
		)
		.replace(/[.;]+$/g, "")
		.trim();
}

export function extractToothCodes(text: string): string[] {
	const matches =
		text.match(
			/\b(?:1[1-8]|2[1-8]|3[1-8]|4[1-8]|5[1-5]|6[1-5]|7[1-5]|8[1-5])\b/g,
		) ?? [];
	return uniqueStrings(matches).slice(0, 8);
}
