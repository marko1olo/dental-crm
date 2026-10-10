/**
 * protocolCompletenessRules.ts — FDI Tooth Utilities, StAR Form 043/у SOAP Diary,
 * and Statutory Order 804n Billing Package Calculator.
 *
 * Layer 2: Pure Domain Logic & Protocol Completeness Rules.
 */

import {
	getAnatomicalRootCanalCount,
	multiplyKopecks,
	parseKopecks,
} from "@dental/shared";
import type {
	ChairsideOrder804nItem,
	ChairsideSoapDiary,
	ClinicalCategoryDetectionResult,
	Order804nCalculationParams,
	SoapDiaryGenerationParams,
} from "./types.js";

/**
 * Normalizes FDI tooth input: handles 26, "26", 2.6, "2.6", "зуб 2.6", etc.
 */
export function parseFdiTooth(input?: number | string | null): number | null {
	if (input === undefined || input === null) return null;
	if (typeof input === "number") {
		const str = input.toString();
		if (str.includes(".")) {
			const [q, p] = str.split(".");
			if (q !== undefined && p !== undefined) {
				const qNum = Number.parseInt(q, 10);
				const pNum = Number.parseInt(p, 10);
				if (!Number.isNaN(qNum) && !Number.isNaN(pNum)) return qNum * 10 + pNum;
			}
		}
		return Math.round(input);
	}

	const clean = input.trim().replace(",", ".");
	const match = clean.match(
		/(?:зуб[аеы]?\s*)?([1-4][1-8]|[5-8][1-5]|[1-4]\.[1-8]|[5-8]\.[1-5])/i,
	);
	if (match && match[1]) {
		const val = match[1];
		if (val.includes(".")) {
			const [q, p] = val.split(".");
			if (q !== undefined && p !== undefined) {
				return Number.parseInt(q, 10) * 10 + Number.parseInt(p, 10);
			}
		}
		return Number.parseInt(val, 10);
	}

	const num = Number.parseInt(clean, 10);
	return Number.isNaN(num) ? null : num;
}

/**
 * Formats tooth number to dot-notation (e.g. 26 -> "2.6") and standard FDI ("26").
 */
export function formatFdiTooth(toothNumber: number | null): string {
	if (!toothNumber) return "Не указан";
	const q = Math.floor(toothNumber / 10);
	const p = toothNumber % 10;
	return `${q}.${p} (${toothNumber})`;
}

/**
 * Determines anatomical root canal count for standard FDI tooth.
 */
export function getCanalsForTooth(toothNumber: number | null): number {
	if (!toothNumber) return 1;
	try {
		return getAnatomicalRootCanalCount(toothNumber);
	} catch {
		const q = Math.floor(toothNumber / 10);
		const pos = toothNumber % 10;
		if (pos >= 6) return 3;
		if ((q === 1 || q === 2) && pos === 4) return 2;
		return 1;
	}
}

/**
 * Detects clinical category and primary ICD-10 diagnosis from complaints and diagnoses.
 */
export function detectClinicalCategory(
	diagnoses?: string[],
	complaints?: string,
): ClinicalCategoryDetectionResult {
	const allText = `${(diagnoses || []).join(" ")} ${complaints || ""}`.toLowerCase();

	if (/k04\.0|k04\.1|k04\.2|k04\.3|пульпит/i.test(allText)) {
		return {
			primaryIcd10: "K04.0",
			diagnosisName: "K04.0 Пульпит (острый очаговый/диффузный)",
			clinicalCategory: "pulpitis",
		};
	}
	if (/k04\.4|k04\.5|k04\.6|k04\.7|k04\.8|периодонтит/i.test(allText)) {
		return {
			primaryIcd10: "K04.5",
			diagnosisName: "K04.5 Хронический апикальный периодонтит",
			clinicalCategory: "periodontitis",
		};
	}
	if (/k02\.|кариес/i.test(allText)) {
		return {
			primaryIcd10: "K02.1",
			diagnosisName: "K02.1 Кариес дентина (глубокий / средний)",
			clinicalCategory: "caries",
		};
	}
	if (/k08\.1|k01\.1|удалени|экстракц/i.test(allText)) {
		return {
			primaryIcd10: "K08.1",
			diagnosisName: "K08.1 Потеря зубов вследствие удаления",
			clinicalCategory: "surgery",
		};
	}
	if (/k05\.|z01\.2|гигиен|чистк|профгигиен|осмотр/i.test(allText)) {
		return {
			primaryIcd10: "Z01.2",
			diagnosisName: "Z01.2 Стоматологическое обследование / Профгигиена",
			clinicalCategory: "hygiene",
		};
	}

	return {
		primaryIcd10: "Z01.2",
		diagnosisName: "Z01.2 Стоматологическое обследование (Здоров)",
		clinicalCategory: "preventive",
	};
}

/**
 * Generates Form 043/у SOAP diary draft according to StAR clinical protocols.
 */
export function generateSoapDiary(params: SoapDiaryGenerationParams): ChairsideSoapDiary {
	const {
		toothNumber,
		canalCount,
		primaryIcd10,
		diagnosisName,
		clinicalCategory,
		complaints,
		somaticStatus,
		allergiesStatus,
	} = params;

	const toothStr = toothNumber ? `${toothNumber}` : "зуб";
	const fdiFormatted = formatFdiTooth(toothNumber);

	let subComplaints = complaints?.trim() || "";
	let subAnamnesisMorbi = "";
	let objStatusLocalis = "";
	let objPercussion = "Перкуссия безболезненная.";
	let objColdTest = "Термопроба индифферентна.";
	let objProbing = "Зондирование безболезненное.";
	let procedureProtocol = "";
	let recommendations = "";

	switch (clinicalCategory) {
		case "pulpitis":
			if (!subComplaints) {
				subComplaints = `Жалобы на острую самопроизвольную приступообразную боль в области зуба ${toothStr}, усиливающуюся в ночное время и от температурных раздражителей (холодное, горячее). Иррадиация по ходу ветвей тройничного нерва.`;
			}
			subAnamnesisMorbi = "Боли появились 2 суток назад, усилились прошедшей ночью. Прием анальгетиков дает кратковременный эффект. Ранее зуб не лечен.";
			objStatusLocalis = `На жевательной/контактной поверхности зуба ${toothStr} глубокая кариозная полость, сообщающаяся с полостью зуба в одной точке. Зондирование вскрытой точки резко болезненное, кровоточивость пульпы.`;
			objPercussion = "Перкуссия зуба слабо чувствительная / безболезненная.";
			objColdTest = "Холодовая проба вызывает резкую длительную боль (> 1 мин).";
			objProbing = "Зондирование дна полости резко болезненное.";
			procedureProtocol = `1. Инфильтрационная/проводниковая анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл (A16.07.030).
2. Изоляция рабочего поля коффердамом (A16.07.082).
3. Препарирование кариозной полости, формирование эндодонтического доступа к полости зуба ${toothStr}.
4. Экстирпация пульпы из ${canalCount} корневых каналов.
5. Определение рабочей длины корневых каналов апекслокатором с контролем RVG.
6. Инструментальная и медикаментозная обработка ${canalCount} корневых каналов машинными Ni-Ti инструментами под обильной ирригацией 3% NaOCl и 17% ЭДТА с ультразвуковой активацией (A16.07.030.00${canalCount}).
7. Высушивание каналов стерильными бумажными штифтами.
8. Пломбирование ${canalCount} корневых каналов гуттаперчевыми штифтами с эпоксидным силером AH Plus методом латеральной компакции (A16.07.008.00${canalCount}).
9. Рентген-контроль обтурации: каналы запломбированы плотно, гомогенно до физиологического верхушечного отверстия.
10. Восстановление зуба пломбой из светоотверждаемого композита с моделированием анатомической формы бугров (A16.07.002.001). Шлифовка, зеркальная полировка.`;
			recommendations = "Щадящая диета на стороне лечения 24 часа. При ноющих постоперационных болях — прием Ибупрофена 400 мг / Нимесулида 100 мг. Контрольный осмотр через 6 месяцев.";
			break;

		case "caries":
			if (!subComplaints) {
				subComplaints = `Жалобы на кратковременные боли от температурных и химических раздражителей (холодное, сладкое) в области зуба ${toothStr}, быстро проходящие после устранения раздражителя. Застревание пищи.`;
			}
			subAnamnesisMorbi = "Дефект обнаружен пациентом около 1–2 месяцев назад. Ранее зуб не лечен.";
			objStatusLocalis = `На окклюзионной/контактной поверхности зуба ${toothStr} кариозная полость в пределах дентина, выполненная размягченным пигментированным дентином.`;
			objPercussion = "Перкуссия отрицательная.";
			objColdTest = "Термопроба кратковременно положительная, проходит сразу.";
			objProbing = "Зондирование дна безболезненное, по стенкам слабо чувствительное.";
			procedureProtocol = `1. Инфильтрационная анестезия Sol. Articaini 4% — 1.0 мл (A16.07.030).
2. Наложение коффердама (A16.07.082).
3. Препарирование кариозной полости, полная некрэктомия под водно-воздушным охлаждением.
4. Медикаментозная обработка 2% раствором хлоргексидина биглюконата.
5. Адгезивный протокол: тотальное травление эмали 15 сек, нанесение адгезива светового отверждения, полимеризация 20 сек.
6. Восстановление зуба пломбой I, V, VI класс по Блэку светоотверждаемым нанокомпозитом (A16.07.002.001) с анатомической моделировкой фиссур.
7. Шлифовка, полировка дисками и полировочными головками. Окклюзионный контроль артикуляционной бумагой 40 мкм.`;
			recommendations = "Щадящая диета 2 часа, соблюдение гигиены полости рта. Контрольный осмотр через 6 месяцев.";
			break;

		case "periodontitis":
			if (!subComplaints) {
				subComplaints = `Жалобы на ноющие боли при накусывании на зуб ${toothStr}, чувство «выросшего зуба».`;
			}
			subAnamnesisMorbi = "Зуб ранее лечен по поводу кариеса/пульпита.";
			objStatusLocalis = `Коронка зуба ${toothStr} изменена в цвете, пломба с нарушением краевого прилегания.`;
			objPercussion = "Перкуссия положительная (+).";
			objColdTest = "Термопроба отрицательная.";
			objProbing = "Зондирование устьев каналов безболезненное.";
			procedureProtocol = `1. Анестезия Sol. Articaini 4% (A16.07.030).
2. Изоляция коффердамом (A16.07.082).
3. Эндодонтический доступ, распломбирование и механическая обработка ${canalCount} каналов.
4. Ирригация 3% NaOCl и ЭДТА, временная лечебная обтурация гидроксидом кальция Calasept на 14 дней.
5. Герметичная временная пломба.`;
			recommendations = "Назначен повторный визит для окончательной обтурации. При болях — НПВП.";
			break;

		case "surgery":
			if (!subComplaints) {
				subComplaints = `Жалобы на разрушение коронковой части зуба ${toothStr}, невозможность накусывания.`;
			}
			subAnamnesisMorbi = "Коронка зуба разрушилась ниже уровня десны вследствие кариозного процесса.";
			objStatusLocalis = `Зуб ${toothStr} разрушен ниже уровня десны, корни подвижны, костная резорбция.`;
			procedureProtocol = `1. Анестезия проводниковая/инфильтрационная (A16.07.030).
2. Синдесмотомия циркулярной связки, люксация элеватором, аккуратное удаление зуба ${toothStr}.
3. Кюретаж лунки, формирование кровяного сгустка, гемостатическая губка.`;
			recommendations = "Холод на щеку, не полоскать рот 24 часа. Исключить тепловые процедуры на 3 дня.";
			break;

		case "hygiene":
		case "preventive":
		default:
			if (!subComplaints) {
				subComplaints = "Жалоб нет. Обратился для планового профилактического осмотра и санации полости рта.";
			}
			subAnamnesisMorbi = "Регулярно проходит профилактические осмотры 1 раз в 6 месяцев. Соматически здоров.";
			objStatusLocalis = "Слизистая оболочка полости рта бледно-розового цвета, чистая, влажная. Десна бледно-розовая, плотно охватывает шейки зубов, не кровоточит. Зубные ряды интактные, прикус физиологический (ортогнатический).";
			objPercussion = "Перкуссия безболезненная во всех отделах.";
			objColdTest = "Термопробы физиологические.";
			objProbing = "Зондирование борозд и шеек безболезненное.";
			procedureProtocol = "Проведен комплексный стоматологический осмотр, индекс гигиены OHI-S = 0.5 (хороший). Полость рта санирована.";
			recommendations = "Контрольный осмотр и профессиональная гигиена полости рта через 6 месяцев.";
			break;
	}

	const renderedText043 = `ДНЕВНИК КЛИНИЧЕСКОГО ПРИЕМА (ФОРМА 043/У)
Зуб: ${fdiFormatted} | Диагноз: ${diagnosisName}
--------------------------------------------------------------------------------
ЖАЛОБЫ (S): ${subComplaints}
АНАМНЕЗ (S): ${subAnamnesisMorbi} Соматический статус: ${somaticStatus}. Аллергоанамнез: ${allergiesStatus}.
ОБЪЕКТИВНО (O): ${objStatusLocalis} ${objPercussion} ${objColdTest} ${objProbing}
ДИАГНОЗ (A): ${diagnosisName} в области зуба ${fdiFormatted}
ПРОТОКОЛ ЛЕЧЕНИЯ (P):
${procedureProtocol}
РЕКОМЕНДАЦИИ (P): ${recommendations}
--------------------------------------------------------------------------------
[ЧЕРНОВИК СОЗДАН АВТОНОМНО — ВРАЧ ПРАВИТ ТОЛЬКО ПАТОЛОГИЮ]`;

	return {
		subjective: {
			complaints: subComplaints,
			anamnesisMorbi: subAnamnesisMorbi,
			anamnesisVitae: `Соматический статус: ${somaticStatus}. Аллергоанамнез: ${allergiesStatus}.`,
		},
		objective: {
			statusLocalis: objStatusLocalis,
			teethFormulaState: `Зуб ${fdiFormatted}`,
			percussion: objPercussion,
			coldTest: objColdTest,
			probing: objProbing,
		},
		assessment: {
			icd10Code: primaryIcd10,
			icd10Name: diagnosisName,
			toothNumber,
			fdiToothFormatted: fdiFormatted,
		},
		plan: { procedureProtocol, recommendations },
		renderedText043,
	};
}

/**
 * Calculates Order 804n statutory services package in integer kopecks.
 */
export function calculateOrder804nPackage(params: Order804nCalculationParams): ChairsideOrder804nItem[] {
	const { toothNumber, canalCount, clinicalCategory } = params;
	const items: ChairsideOrder804nItem[] = [];

	const createService = (
		code: string,
		title: string,
		category: string,
		priceRub: number,
		quantity = 1,
		isMandatory = true,
		canals?: number | null,
	): ChairsideOrder804nItem => {
		const priceKopecks = parseKopecks(priceRub);
		const totalKopecks = multiplyKopecks(priceKopecks, quantity);
		return {
			code, title, category, quantity, priceRub, priceKopecks,
			totalRub: priceRub * quantity, totalKopecks, isMandatory,
			toothNumber, canalCount: canals ?? null,
		};
	};

	if (clinicalCategory === "pulpitis") {
		const instCode = canalCount === 3 ? "A16.07.030.003" : canalCount === 2 ? "A16.07.030.002" : "A16.07.030.001";
		const instPrice = canalCount === 3 ? 5200 : canalCount === 2 ? 3800 : 2100;
		const obtCode = canalCount === 3 ? "A16.07.008.003" : canalCount === 2 ? "A16.07.008.002" : "A16.07.008.001";
		const obtPrice = canalCount === 3 ? 6000 : canalCount === 2 ? 4200 : 2400;

		items.push(
			createService("A16.07.030", "Анестезия инфильтрационная / проводниковая", "anesthesia", 950),
			createService("A16.07.082", "Изоляция операционного поля (коффердам)", "therapy", 1500),
			createService(instCode, `Инструментальная и медикаментозная обработка корневых каналов (${canalCount}-канальный зуб)`, "endodontics", instPrice, 1, true, canalCount),
			createService(obtCode, `Пломбирование корневых каналов зуба гуттаперчевыми штифтами (${canalCount} канала)`, "endodontics", obtPrice, 1, true, canalCount),
			createService("A16.07.002.001", "Восстановление зуба пломбой I, V, VI класс по Блэку (светоотверждаемый композит)", "therapy", 3800),
		);
	} else if (clinicalCategory === "caries") {
		items.push(
			createService("A16.07.030", "Анестезия инфильтрационная / проводниковая", "anesthesia", 950),
			createService("A16.07.082", "Изоляция операционного поля (коффердам)", "therapy", 1500),
			createService("A16.07.002.001", "Восстановление зуба пломбой I, V, VI класс по Блэку (светоотверждаемый композит)", "therapy", 3800),
		);
	} else if (clinicalCategory === "periodontitis") {
		items.push(
			createService("A16.07.030", "Анестезия инфильтрационная / проводниковая", "anesthesia", 950),
			createService("A16.07.082", "Изоляция операционного поля (коффердам)", "therapy", 1500),
			createService("A16.07.030.003", `Распломбирование и механическая обработка каналов (${canalCount}-канальный зуб)`, "endodontics", 5200, 1, true, canalCount),
		);
	} else if (clinicalCategory === "surgery") {
		items.push(
			createService("A16.07.030", "Анестезия инфильтрационная / проводниковая", "anesthesia", 950),
			createService("A16.07.001.002", "Удаление постоянного зуба простое", "surgery", 3200),
		);
	} else {
		items.push(
			createService("B01.065.001", "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный", "consultation", 1000),
		);
	}

	return items;
}
