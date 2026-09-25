/**
 * surgeryProtocols.ts — Хирургические протоколы, 1-клик нормы операций и мягкий овердрафт склада.
 * Стандарт: «Софт для врача, а не врач для софта. Любой барьер или лишний клик — это брак».
 */

export * from "./surgeryNormsCatalog";
import type {
	SurgicalService804n,
	SurgicalOperationNorm,
	SurgicalWarehouseOverdraftStatus,
} from "./surgeryNormsCatalog";

/**
 * Проверка мягкого овердрафта склада (Мандат 8e):
 * Если накладная поставщика задерживается (включая шовный материал или гемостатическую губку),
 * врач НИКОГДА не блокируется. Система фиксирует статус мягкого овердрафта (canProceed: true)
 * и формирует предупреждение старшей медсестре для оприходования без остановки приёма.
 */
export function evaluateWarehouseOverdraft(
	materials: readonly { name: string; isWarehouseCritical?: boolean }[],
	forceWarehouseDelay = false,
	specificDelayedItems?: readonly string[],
): SurgicalWarehouseOverdraftStatus {
	const pending =
		specificDelayedItems && specificDelayedItems.length > 0
			? [...specificDelayedItems]
			: forceWarehouseDelay
				? materials.map((m) => m.name)
				: [];

	if (pending.length > 0) {
		return {
			hasOverdraft: true,
			warningRu: "Задержка оприходования накладной склада",
			detailsRu:
				`Компоненты (${pending.join(", ")}) ещё не проведены во входящей накладной. ` +
				"Операция не блокируется: списание зафиксировано в мягкий овердрафт с уведомлением старшей медсестры.",
			pendingItems: pending,
			canProceed: true,
		};
	}

	return {
		hasOverdraft: false,
		warningRu: "Складской учет в норме",
		detailsRu: "Все компоненты и стерильные расходники списаны штатно со склада кабинета.",
		pendingItems: [],
		canProceed: true,
	};
}

export interface SurgicalMaterialDeductionResult {
	readonly success: boolean;
	readonly isOverdraft: boolean;
	readonly deductedItems: readonly {
		readonly name: string;
		readonly unit: string;
		readonly quantity: number;
		readonly isOverdraft: boolean;
	}[];
	readonly messageRu: string;
}

/**
 * 1-клик списание хирургических материалов со склада с гарантированным мягким овердрафтом (Мандат 8e).
 * Задержка оприходования накладной поставщика не блокирует врача и операцию.
 */
export function quickDeductSurgicalMaterials(params: {
	materials: readonly { name: string; unit: string; quantity: number; isWarehouseCritical?: boolean }[];
	hasWarehouseDelay?: boolean;
	operationTitle?: string;
}): SurgicalMaterialDeductionResult {
	const isOverdraft = Boolean(params.hasWarehouseDelay);
	const deductedItems = params.materials.map((m) => ({
		name: m.name,
		unit: m.unit,
		quantity: m.quantity,
		isOverdraft,
	}));

	const messageRu = isOverdraft
		? `Списано ${params.materials.length} поз. под операцию «${params.operationTitle || "Хирургическое вмешательство"}» в мягкий овердрафт склада (Мандат 8e: без комиссии и блокировки врача).`
		: `Материалы операции «${params.operationTitle || "Хирургическое вмешательство"}» (${params.materials.length} поз.) успешно списаны со склада в 1 клик.`;

	try {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-quick-writeoff-surgical-materials", {
					detail: {
						materials: deductedItems,
						isOverdraft,
						operationTitle: params.operationTitle,
						timestamp: new Date().toISOString(),
					},
				}),
			);
		}
	} catch {
		// fallback
	}

	return {
		success: true,
		isOverdraft,
		deductedItems,
		messageRu,
	};
}

/**
 * Генерация полного хирургического дневника для Формы 043/у.
 */
export function buildSurgicalDiaryEntry(params: {
	patientName?: string;
	patientId?: string;
	doctorName?: string;
	toothFdi?: number;
	protocolText: string;
	recommendations?: string;
	implantDetails?: {
		brand: string;
		diameterMm: number;
		lengthMm: number;
		torqueNcm: number;
		lot?: string;
	};
}): string {
	const toothStr = params.toothFdi ? `Зуб FDI #${params.toothFdi}` : "Область вмешательства";
	const nowStr = new Date().toLocaleDateString("ru-RU");

	let implantBlock = "";
	if (params.implantDetails) {
		implantBlock =
			`\nСПЕЦИФИКАЦИЯ ИМПЛАНТАТА:\n` +
			`Система: ${params.implantDetails.brand} Ø ${params.implantDetails.diameterMm} x ${params.implantDetails.lengthMm} мм\n` +
			`Торк первичной стабильности: ${params.implantDetails.torqueNcm} Н·см\n` +
			(params.implantDetails.lot ? `LOT / Партия: ${params.implantDetails.lot}\n` : "");
	}

	const recoBlock = params.recommendations
		? `\nНАЗНАЧЕНИЯ И РЕКОМЕНДАЦИИ:\n${params.recommendations}`
		: "";

	return (
		`ХИРУРГИЧЕСКИЙ ПРОТОКОЛ ОПЕРАЦИИ (${toothStr})\n` +
		`Дата: ${nowStr} · Врач: ${params.doctorName || "Хирург"}\n\n` +
		`ХОД ОПЕРАЦИИ:\n` +
		`${params.protocolText.trim()}\n` +
		implantBlock +
		recoBlock
	);
}

/**
 * Получение перечня услуг Номенклатуры 804н для хирургической нормы.
 */
export function getSurgicalServices804n(
	norm: SurgicalOperationNorm,
	toothFdi?: number,
): readonly SurgicalService804n[] {
	const effectiveTooth = toothFdi ?? norm.defaultToothFdi;
	if (norm.order804nServices && norm.order804nServices.length > 0) {
		return norm.order804nServices.map((s) => ({
			...s,
			toothNumber: effectiveTooth,
		}));
	}

	if (norm.code804n) {
		return [
			{
				code: norm.code804n,
				nameRu: norm.service804nTitle || norm.title,
				name: norm.service804nTitle || norm.title,
				priceRub: 3500,
				quantity: 1,
				suggestedPriceRub: 3500,
				toothNumber: effectiveTooth,
				stageKind: "stage_2_surgery",
				isPrimary: true,
			},
		];
	}

	return [];
}

/**
 * Диспатч услуг хирургического протокола в активный счёт/смету визита
 * через глобальную шину CustomEvent `dente-add-services-to-invoice` (Мандаты 8e, 8i, 8k, 8n).
 */
export function dispatchSurgicalServicesToInvoice(params: {
	norm: SurgicalOperationNorm;
	toothFdi?: number | undefined;
	customServices?: readonly SurgicalService804n[] | undefined;
	onAddToInvoice?: ((services: readonly SurgicalService804n[]) => void) | undefined;
}): readonly SurgicalService804n[] {
	const effectiveTooth = params.toothFdi ?? params.norm.defaultToothFdi;
	const services =
		params.customServices && params.customServices.length > 0
			? params.customServices.map((s) => ({ ...s, toothNumber: s.toothNumber ?? effectiveTooth }))
			: getSurgicalServices804n(params.norm, effectiveTooth);

	if (params.onAddToInvoice) {
		try {
			params.onAddToInvoice(services);
		} catch (err) {
			console.warn("onAddToInvoice callback error:", err);
		}
	}

	try {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-add-services-to-invoice", {
					detail: {
						toothNumber: effectiveTooth,
						teethNumbers: effectiveTooth ? [effectiveTooth] : [],
						services,
					},
				}),
			);
		}
	} catch (err) {
		console.warn("dente-add-services-to-invoice dispatch error:", err);
	}

	return services;
}

/**
 * Номенклатура 804н — Канонические коды хирургической экстракции зубов (Мандат 8e).
 */
export const EXTRACTION_804N_CODES = {
	SIMPLE: "A16.07.001.001", // Удаление постоянного зуба простое
	COMPLEX_SEPARATION: "A16.07.001.002", // Удаление зуба сложное с разъединением корней
	IMPACTED_DYSTOPIC: "A16.07.001.003", // Операция удаления ретинированного / дистопированного зуба
	CURETTAGE: "A16.07.026", // Кюретаж лунки удаленного зуба
	SUTURE_VICRYL: "A16.07.097", // Наложение шва на слизистую оболочку рта (Викрил 4-0)
	ANESTHESIA_INFILTRATION: "A11.07.015", // Инфильтрационная анестезия
	ANESTHESIA_CONDUCTION: "A11.07.016", // Проводниковая (торусальная) анестезия
} as const;

export type ExtractionComplexity = "simple" | "complex" | "impacted_dystopic";
export type SurgicalHemostasisMethod = "alvogyl" | "hemostatic_sponge" | "vicryl_suture" | "tampon";

export interface SurgicalHemostasisOption {
	readonly id: SurgicalHemostasisMethod;
	readonly nameRu: string;
	readonly shortBadge: string;
	readonly descriptionRu: string;
}

/**
 * Варианты гемостаза лунки удаленного зуба в 1 клик (Мандат 8e).
 */
export const SURGICAL_HEMOSTASIS_OPTIONS: readonly SurgicalHemostasisOption[] = [
	{
		id: "alvogyl",
		nameRu: "Альвожил (паста/губка)",
		shortBadge: "Альвожил",
		descriptionRu: "Антисептический обезболивающий компресс с йодоформом в лунку",
	},
	{
		id: "hemostatic_sponge",
		nameRu: "Гемостатическая коллагеновая губка",
		shortBadge: "Губка",
		descriptionRu: "Рассасывающаяся коллагеновая губка для надежного тромбообразования",
	},
	{
		id: "vicryl_suture",
		nameRu: "Шов Викрил 4-0 (ушивание)",
		shortBadge: "Викрил 4-0",
		descriptionRu: "Сближение краев лунки узловыми рассасывающимися швами",
	},
	{
		id: "tampon",
		nameRu: "Давящий марлевый тампон 20 мин",
		shortBadge: "Тампон 20 мин",
		descriptionRu: "Марлевый гемостатический тампон для компрессии лунки",
	},
];

export interface ExtractionComplexityOption {
	readonly id: ExtractionComplexity;
	readonly code804n: string;
	readonly labelRu: string;
	readonly badge: string;
	readonly normId: string;
	readonly defaultPriceRub: number;
}

/**
 * Степени сложности экстракции зуба в 1 клик по номенклатуре 804н (Мандат 8e).
 */
export const EXTRACTION_COMPLEXITY_OPTIONS: readonly ExtractionComplexityOption[] = [
	{
		id: "simple",
		code804n: EXTRACTION_804N_CODES.SIMPLE,
		labelRu: "Простое удаление постоянного зуба (щипцы / элеватор)",
		badge: "Простое (A16.07.001.001)",
		normId: "surgery_extraction_simple",
		defaultPriceRub: 3500,
	},
	{
		id: "complex",
		code804n: EXTRACTION_804N_CODES.COMPLEX_SEPARATION,
		labelRu: "Сложное удаление с разъединением корней бором Lindemann",
		badge: "Сложное (A16.07.001.002)",
		normId: "surgery_extraction_complex",
		defaultPriceRub: 6000,
	},
	{
		id: "impacted_dystopic",
		code804n: EXTRACTION_804N_CODES.IMPACTED_DYSTOPIC,
		labelRu: "Удаление ретинированного / дистопированного зуба с лоскутом",
		badge: "Ретинированный (A16.07.001.003)",
		normId: "surgery_extraction_atypical",
		defaultPriceRub: 9500,
	},
];

export interface StandardExtractionParams {
	readonly toothFdi?: number | undefined;
	readonly complexity?: ExtractionComplexity | undefined;
	readonly hemostasis?: readonly SurgicalHemostasisMethod[] | undefined;
	readonly sutureMaterial?: string | undefined;
	readonly anesthesia?: string | undefined;
	readonly postOpXray?: boolean | undefined;
}

/**
 * 1-клик генератор протокола операции экстракции зуба (Мандаты 8e, 8k, 8i).
 * Поддерживает простое, сложное с разъединением корней и атипичное удаление
 * с 1-клик выбором гемостаза (Альвожил, гемостатическая губка, шов Викрил 4-0).
 */
export function buildStandardExtractionProtocolText(
	params: StandardExtractionParams = {},
): string {
	const toothStr = params.toothFdi ? `зуба FDI #${params.toothFdi}` : "зуба";
	const complexity = params.complexity ?? "simple";
	const hemo = params.hemostasis ?? ["alvogyl", "tampon"];
	const suture = params.sutureMaterial || "Викрил 4-0";

	const hemoParts: string[] = [];
	if (hemo.includes("alvogyl")) {
		hemoParts.push("в лунку внесен антисептический компресс Альвожил");
	}
	if (hemo.includes("hemostatic_sponge")) {
		hemoParts.push("лунка заполнена рассасывающейся гемостатической коллагеновой губкой");
	}
	if (hemo.includes("vicryl_suture") || complexity === "complex" || complexity === "impacted_dystopic") {
		hemoParts.push(`края раны сближены, наложены узловые швы (${suture})`);
	}
	if (hemo.includes("tampon")) {
		hemoParts.push("наложен давящий марлевый тампон на 20 минут");
	}
	const hemostasisText =
		hemoParts.length > 0
			? `Местный гемостаз: ${hemoParts.join(", ")}.`
			: "Местный гемостаз: в лунку внесен Альвожил, наложен давящий марлевый тампон.";

	const xrayText =
		params.postOpXray
			? " Выполнен контрольный радиовизиографический снимок: остатков корней и инородных тел в лунке нет."
			: "";

	if (complexity === "complex") {
		const anesth =
			params.anesthesia ||
			"Инфильтрационная и проводниковая анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл.";
		return (
			`${anesth} Разрез слизистой оболочки в области ${toothStr}, отслаивание слизисто-надкостничного лоскута. ` +
			`Сепарация корней твердосплавным бором Lindemann с водяным охлаждением физраствором. ` +
			`Атравматичная люксация фрагментов корней элеватором, удаление корней щипцами. ` +
			`Тщательный кюретаж лунки острой ложкой, удаление грануляций, ревизия костных стенок. ` +
			`Антисептическая обработка 0.05% раствором хлоргексидина. ` +
			`${hemostasisText} Гемостаз полный.${xrayText} Рекомендации даны.`
		);
	}

	if (complexity === "impacted_dystopic") {
		const anesth =
			params.anesthesia ||
			"Проводниковая торусальная и инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 3.4 мл.";
		return (
			`${anesth} Разрез слизистой оболочки в проекции ретинированного ${toothStr}, выкраивание слизисто-надкостничного лоскута. ` +
			`Трепанация кортикальной пластинки, сепарация коронки и корней бором Lindemann с водяным охлаждением. ` +
			`Атравматичная люксация элеватором и извлечение фрагментов. Тщательный кюретаж лунки острой ложкой, удаление грануляций. ` +
			`Антисептическая обработка 0.05% хлоргексидином. ` +
			`${hemostasisText} Гемостаз полный.${xrayText} Рекомендации даны.`
		);
	}

	// Simple extraction
	const anesth =
		params.anesthesia ||
		"Инфильтрационная анестезия Sol. Articaini 4% 1:100 000 — 1.7 мл.";
	return (
		`${anesth} Круговая связка ${toothStr} отслоена гладилкой. ` +
		`Наложены щипцы / элеватор, продвинуты под десну, фиксированы. Люксация элеватором и ротация щипцами. ` +
		`Тракция зуба из альвеолы. Тщательный кюретаж лунки острой ложкой, ревизия костных стенок, удаление грануляций. ` +
		`Антисептическая обработка 0.05% хлоргексидином. ` +
		`${hemostasisText} Гемостаз полный.${xrayText} Рекомендации даны.`
	);
}

export interface PostExtractionMemoParams {
	readonly patientName?: string | undefined;
	readonly toothFdi?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly complexity?: ExtractionComplexity | undefined;
	readonly hasSutures?: boolean | undefined;
	readonly sutureRemovalDays?: number | undefined;
	readonly clinicPhone?: string | undefined;
}

/**
 * 1-клик формирование памятки пациенту после удаления для мессенджеров WhatsApp / Telegram
 * (Мандаты 8k, 8e, 8d). Строгий полиграфический вид БЕЗ мультяшных эмодзи.
 * Включает канонические клинические пункты:
 * «Холод 15 мин, не греть, не полоскать, марлевый тампон сплюнуть через 20 мин».
 */
export function buildPostExtractionMemoText(params: PostExtractionMemoParams = {}): string {
	const toothStr = params.toothFdi ? ` (зуб #${params.toothFdi})` : "";
	const greeting = params.patientName ? `Уважаемый(ая) ${params.patientName}!\n\n` : "";
	const docStr = params.doctorName ? `\nЛечащий врач: ${params.doctorName}` : "";
	const phoneStr = params.clinicPhone ? `\nТелефон клиники: ${params.clinicPhone}` : "";
	const suturesStr =
		params.hasSutures || params.complexity === "complex" || params.complexity === "impacted_dystopic"
			? `\n7. ШВЫ: Наложены швы. Снятие швов через ${params.sutureRemovalDays ?? "7-10"} дней. Не трогать швы языком и зубочистками.`
			: "";

	return (
		`${greeting}ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ УДАЛЕНИЯ ЗУБА${toothStr}\n\n` +
		`Для благополучного заживления лунки строго соблюдайте следующие правила:\n\n` +
		`1. МАРЛЕВЫЙ ТАМПОН: Сплюнуть через 20 минут после окончания операции.\n` +
		`2. ХОЛОД: Прикладывать сухой холод к щеке на 15 минут с перерывами 30-40 минут в первые 2-3 часа.\n` +
		`3. НЕ ГРЕТЬ: Категорически запрещено греть щеку, прикладывать компрессы, посещать баню, сауну и принимать горячую ванну 3 дня.\n` +
		`4. НЕ ПОЛОСКАТЬ: Не полоскать полость рта в первые 24 часа, чтобы не вымыть кровяной сгусток из лунки. Не пить через трубочку, не сплевывать активно.\n` +
		`5. ПИТАНИЕ: Прием пищи через 2 часа после операции (когда полностью отойдет анестезия). Исключить твердое, горячее и острое на 3 дня. Жевать на противоположной стороне.\n` +
		`6. ОБЕЗБОЛИВАНИЕ: При болях принять назначенный препарат (Нимесил 1 пакетик или Ибупрофен 400 мг) после еды.` +
		suturesStr +
		`\n\nПри продолжающемся кровотечении, нарастающем отеке или температуре выше 38°C немедленно обратитесь в клинику.` +
		docStr +
		phoneStr
	).trim();
}


