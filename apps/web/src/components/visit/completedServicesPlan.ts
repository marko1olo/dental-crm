/**
 * КАКИЕ ПОЗИЦИИ ПЛАНА ЛЕЧЕНИЯ МОЖНО ОТМЕЧАТЬ В ОТКРЫТОМ ПРИЁМЕ.
 *
 * БЫЛО: список выполненного брал позиции из контекстного
 * `activeTreatmentPlanItems`, а тот отфильтрован по `documentPatient`
 * (useAppLogic.tsx:4949), где `documentPatient = selectedPatient ?? activePatient`,
 * а `selectedPatient` — это пациент, выбранный в разделе «Пациенты»
 * (hooks/domains/usePatientLogic.ts:136-145). Выбор переживает уход из своего
 * раздела, приём его не сбрасывает.
 *
 * Врач вёл приём пациента А, в списке пациентов открытым оставался пациент Б — и
 * внутри карты приёма пациента А перечислялся план лечения ПАЦИЕНТА Б с его
 * ценами. Галочка дописывала «Выполнено: <услуга пациента Б> — 4 500,00 ₽» в
 * поле «План» приёма пациента А, откуда строка уходила в его ЭМК и в кассу.
 *
 * Правило вынесено сюда, чтобы его держал тест, а не внимательность: соблазн
 * вернуться к готовому `activeTreatmentPlanItems` останется у любого, кто будет
 */
import { money } from "../../utils/financeUtils";

/**
 * Позиции плана, которые принадлежат пациенту ОТКРЫТОГО приёма и ещё не
 * отменены. Без идентификатора пациента приёма отмечать нельзя ничего: строка
 * «Выполнено…» уходит в карту конкретного человека, и ошибиться тут нечем
 * оправдать.
 */
export function visitOwnedPlanItems(
	treatmentPlanItems: unknown,
	visitPatientId: string | null,
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
): any[] {
	if (!visitPatientId) return [];
	if (!Array.isArray(treatmentPlanItems)) return [];
	return treatmentPlanItems.filter(
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		(item: any) =>
			item?.patientId === visitPatientId && item?.status !== "cancelled",
	);
}

/** Копейки не теряем и не выдумываем: 1500,505 ₽ не бывает. */
export function roundToKopecks(value: number): number {
	return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

/**
 * РУБЛИ ИЗ ОТВЕТА СЕРВЕРА. Возвращает null, когда числа там нет.
 *
 * БЫЛО: `Number(item?.unitPriceRub ?? 0)`. Любое непрочитанное значение
 * превращалось в НОЛЬ и печаталось как «0 ₽» — то есть услуга с неизвестной ценой
 * выглядела бесплатной, и её ноль ещё и складывался в итог «К оплате по
 * отмеченному». Врач называл пациенту сумму, в которой не хватало позиций.
 * Непрочитанным значение бывает не только у пустой цены: numeric из drizzle
 * приходит СТРОКОЙ, данные дашборда на клиенте схемой не проверяются, а
 * «1500,50» с запятой Number() не принимает вовсе.
 *
 * Запятую принимаем: в русской локали её вводят руками и она приходит из
 * переносов из других программ. Разделитель тысяч (пробел, узкий пробел,
 * неразрывный пробел) убираем. А вот строку, где есть И запятая, И точка,
 * разбирать не берёмся: «1,500.50» и «1.500,50» — это разные числа, и угадывать
 * в деньгах нельзя. Такая строка честно возвращает null.
 */
export function parseRubAmount(value: unknown): number | null {
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value !== "string") return null;
	// В классе ниже стоят три знака: обычный пробел (через \s), неразрывный
	// U+00A0 и узкий неразрывный U+202F. Именно ими разделяют тысячи в русских
	// выгрузках и в тексте, скопированном из другой программы. Невидимые знаки
	// в исходнике оставлены сознательно: \s в JavaScript их и так покрывает, но
	// явный перечень не даст «причесать пробелы» и молча сменить поведение.
	const cleaned = value.replace(/[\s  ]/g, "");
	if (!cleaned) return null;
	if (cleaned.includes(",") && cleaned.includes(".")) return null;
	const normalized = cleaned.replace(",", ".");
	if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Количество в позиции плана. Отсутствие количества — это одна единица (так
 * считает и смета), а вот ноль, отрицательное и нечитаемое значение — это не
 * количество, и цену по нему считать нельзя.
 */
export function planLineQuantity(item: unknown): number | null {
	const raw = (item as { quantity?: unknown } | null)?.quantity;
	if (raw === null || raw === undefined || raw === "") return 1;
	const parsed = parseRubAmount(raw);
	if (parsed === null || parsed <= 0) return null;
	return parsed;
}

/**
 * Итог строки плана: цена × количество − скидка, не ниже нуля. Формула ровно та
 * же, что в смете (useAppLogic.tsx) и в ленте оплат (FinanceLedger.tsx).
 *
 * null означает «посчитать нельзя»: цены нет, количество нечитаемо или скидка
 * нечитаема. Ноль вместо null был бы ложью про деньги.
 */
export function planLineTotalRub(item: unknown): number | null {
	const unit = parseRubAmount(
		(item as { unitPriceRub?: unknown } | null)?.unitPriceRub,
	);
	if (unit === null) return null;
	const quantity = planLineQuantity(item);
	if (quantity === null) return null;
	const rawDiscount = (item as { discountRub?: unknown } | null)?.discountRub;
	const discount =
		rawDiscount === null || rawDiscount === undefined || rawDiscount === ""
			? 0
			: parseRubAmount(rawDiscount);
	if (discount === null) return null;
	return Math.max(0, roundToKopecks(unit * quantity - discount));
}

/** Цена не указана — так и пишем. Ноль вместо неё был бы ложью про деньги. */
export const PRICE_UNKNOWN_TEXT = "цена не указана";

/**
 * 9 ЭКСПРЕСС-УСЛУГ У КРЕСЛА (1 клик, Номенклатура 804н).
 * Заполняют пробел между ручным вводом и 4 крупными пакетами:
 * снимки, анестезия, коффердам, осмотр, снятие швов, временная пломба.
 */
export interface ChairsideExpressService {
	id: string;
	code804n: string;
	title: string;
	priceRub: number;
}

export const CHAIRSIDE_EXPRESS_SERVICES: readonly ChairsideExpressService[] = [
	{
		id: "intraoral_xray",
		code804n: "A06.07.001",
		title: "Прицельный рентгеновский снимок",
		priceRub: 450,
	},
	{
		id: "local_anesthesia_articaine",
		code804n: "A25.07.001",
		title: "Местная анестезия (Артикаин)",
		priceRub: 800,
	},
	{
		id: "conduction_anesthesia",
		code804n: "A25.07.002",
		title: "Проводниковая анестезия",
		priceRub: 950,
	},
	{
		id: "consultation_inspection",
		code804n: "A01.07.001",
		title: "Осмотр и консультация",
		priceRub: 1000,
	},
	{
		id: "cofferdam_isolation",
		code804n: "A16.07.051",
		title: "Изоляция коффердамом",
		priceRub: 800,
	},
	{
		id: "suture_removal",
		code804n: "A16.07.097",
		title: "Снятие швов",
		priceRub: 600,
	},
	{
		id: "temp_filling",
		code804n: "A16.07.002.099",
		title: "Временная пломба",
		priceRub: 700,
	},
	{
		id: "dental_deposits_removal_1_tooth",
		code804n: "A16.07.050.001",
		title: "Снятие назубных отложений (1 зуб)",
		priceRub: 350,
	},
	{
		id: "optg_panoramic",
		code804n: "A06.07.002",
		title: "ОПТГ / Панорамный снимок",
		priceRub: 1200,
	},
];

/** 32 зуба взрослой зубной формулы по классификации FDI World Dental Federation */
export const FDI_UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const FDI_LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;
export const ALL_FDI_TEETH = [...FDI_UPPER_TEETH, ...FDI_LOWER_TEETH] as const;

/** Удаляет эмодзи из текста для гарантии номенклатурной чистоты бланков 804н (Мандаты 8d / 8e). */
export function stripEmojis(text: string): string {
	if (!text) return "";
	return text
		.replace(
			/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/gu,
			"",
		)
		.replace(/\s{2,}/g, " ")
		.trim();
}

/** Параметры для формирования строки выполненной услуги */
export interface FormatCompletedServiceParams {
	code804n?: string | null;
	title: string;
	priceRub: number | null;
	toothCode?: string | number | null;
	quantity?: number | null;
}

/**
 * Формирует строку выполненной услуги для поля treatmentPlan карты приёма.
 * Строго гарантирует отсутствие эмодзи и сохранение копеек.
 */
export function formatCompletedServiceLine({
	code804n,
	title,
	priceRub,
	toothCode,
	quantity,
}: FormatCompletedServiceParams): string {
	const cleanTitle = stripEmojis(title.trim()) || "Услуга";
	const cleanCode = code804n ? stripEmojis(code804n.trim()) : "";
	const codePart = cleanCode ? `[${cleanCode}] ` : "";

	const toothStr =
		toothCode !== undefined && toothCode !== null ? String(toothCode).trim() : "";
	const toothPart =
		toothStr &&
		toothStr.toLowerCase() !== "none" &&
		toothStr !== "0" &&
		toothStr.toLowerCase() !== "без зуба"
			? ` (зуб ${toothStr})`
			: "";

	const q =
		quantity !== undefined && quantity !== null && quantity > 1
			? `, ${quantity} шт.`
			: "";

	const pricePart =
		priceRub === null || !Number.isFinite(priceRub)
			? PRICE_UNKNOWN_TEXT
			: money(roundToKopecks(priceRub));

	return `Выполнено: ${codePart}${cleanTitle}${toothPart}${q} — ${pricePart}`;
}

/** Результат разбора строки выполненной услуги */
export interface ParsedCompletedLine {
	rawLine: string;
	code804n?: string | undefined;
	title: string;
	toothCode?: string | undefined;
	quantity: number;
	priceRub: number | null;
}

/**
 * Разбирает строку «Выполнено: ...» из текста карты приёма.
 * Возвращает null, если строка не начинается с «Выполнено:».
 */
export function parseCompletedServiceLine(
	rawLine: string,
): ParsedCompletedLine | null {
	if (typeof rawLine !== "string") return null;
	const trimmed = rawLine.trim();
	if (!trimmed.toLowerCase().startsWith("выполнено:")) return null;

	const content = trimmed.substring("выполнено:".length).trim();
	if (!content) return null;

	// Разделение по последнему тире (эмитируется em-dash «—», en-dash «–» или « - »)
	let lastDashIdx = content.lastIndexOf("—");
	if (lastDashIdx === -1) lastDashIdx = content.lastIndexOf("–");
	if (lastDashIdx === -1) {
		const spaceDash = content.lastIndexOf(" - ");
		if (spaceDash !== -1) lastDashIdx = spaceDash + 1;
	}

	let headPart = content;
	let priceRub: number | null = null;

	if (lastDashIdx !== -1) {
		headPart = content.slice(0, lastDashIdx).trim();
		const priceStr = content.slice(lastDashIdx + 1).replace(/₽/g, "").trim();
		if (
			priceStr &&
			priceStr.toLowerCase() !== PRICE_UNKNOWN_TEXT.toLowerCase()
		) {
			priceRub = parseRubAmount(priceStr);
		}
	}

	// Извлекаем код 804н в квадратных скобках [A06.07.001]
	let code804n: string | undefined;
	const codeMatch = headPart.match(/^\[([A-Za-z0-9.]+)\]\s*/);
	if (codeMatch) {
		code804n = codeMatch[1];
		headPart = headPart.slice(codeMatch[0].length).trim();
	}

	// Извлекаем количество: «, 2 шт.»
	let quantity = 1;
	const qMatch = headPart.match(/,\s*(\d+)\s*шт\.?$/i);
	if (qMatch && qMatch[1]) {
		quantity = Math.max(1, Number.parseInt(qMatch[1], 10) || 1);
		headPart = headPart.slice(0, qMatch.index).trim();
	}

	// Извлекаем зуб: «(зуб 26)»
	let toothCode: string | undefined;
	const toothMatch = headPart.match(/\(зуб\s+([A-Za-z0-9.]+)\)$/i);
	if (toothMatch) {
		toothCode = toothMatch[1];
		headPart = headPart.slice(0, toothMatch.index).trim();
	}

	const title = stripEmojis(headPart.trim());

	return {
		rawLine: trimmed,
		code804n,
		title,
		toothCode,
		quantity,
		priceRub,
	};
}

/** Отфильтрованная позиция прейскуранта клиники */
export interface FilteredCatalogService {
	id: string;
	code: string;
	title: string;
	priceRub: number;
	category?: string;
}

/**
 * Быстрый поиск по прейскуранту клиники (dashboard.serviceCatalog).
 * Моментальная фильтрация по названию и коду 804н, нечувствительная к регистру.
 */
export function filterServiceCatalog(
	catalog: unknown,
	query: string,
	limit = 20,
): FilteredCatalogService[] {
	if (!Array.isArray(catalog)) return [];
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return [];

	const results: FilteredCatalogService[] = [];

	for (const item of catalog) {
		if (!item || typeof item !== "object") continue;
		// biome-ignore lint/suspicious/noExplicitAny: dynamic catalog item
		const anyItem = item as any;
		if (anyItem.active === false) continue;

		const code = typeof anyItem.code === "string" ? anyItem.code.trim() : "";
		const title = typeof anyItem.title === "string" ? anyItem.title.trim() : "";
		const rawPrice =
			anyItem.basePriceRub ?? anyItem.priceRub ?? anyItem.price;
		const priceRub = parseRubAmount(rawPrice) ?? 0;

		const matchCode = code.toLowerCase().includes(trimmed);
		const matchTitle = title.toLowerCase().includes(trimmed);

		if (matchCode || matchTitle) {
			results.push({
				id: String(anyItem.id || code || title),
				code: code || "804н",
				title: title || "Услуга без названия",
				priceRub,
				category:
					typeof anyItem.category === "string" ? anyItem.category : undefined,
			});
			if (results.length >= limit) break;
		}
	}

	return results;
}

/** Итог по всем выполненным услугам приёма */
export interface CompletedServicesSummary {
	totalRub: number;
	count: number;
	unpricedCount: number;
	servicesForInvoice: Array<{
		code: string;
		title: string;
		price: number;
		quantity: number;
		toothCode?: string | undefined;
	}>;
}

/**
 * Считает сводку по всем выполненным услугам в тексте карты приёма
 * (как отмеченным по предварительному плану, так и добавленным экспресс-услугам,
 * пакетам и позициям прейскуранта).
 */
export function calculateCompletedServicesSummary(
	treatmentPlanText: unknown,
): CompletedServicesSummary {
	const rawText =
		typeof treatmentPlanText === "string" ? treatmentPlanText : "";
	const lines = rawText.split("\n").map((l) => (l ?? "").trim());

	const completedLines = lines.filter((l) =>
		l.toLowerCase().startsWith("выполнено:"),
	);

	let totalRub = 0;
	let unpricedCount = 0;
	const servicesForInvoice: CompletedServicesSummary["servicesForInvoice"] = [];

	for (const line of completedLines) {
		const parsed = parseCompletedServiceLine(line);
		if (!parsed) continue;

		if (parsed.priceRub === null) {
			unpricedCount++;
		} else {
			totalRub += parsed.priceRub;
		}

		servicesForInvoice.push({
			code: parsed.code804n || "804н",
			title: parsed.title,
			price: parsed.priceRub ?? 0,
			quantity: parsed.quantity,
			toothCode: parsed.toothCode,
		});
	}

	return {
		totalRub: roundToKopecks(totalRub),
		count: completedLines.length,
		unpricedCount,
		servicesForInvoice,
	};
}
