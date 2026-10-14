/**
 * surgeryProtocols.ts — Хирургические протоколы, физиологические нормы операций и мягкий овердрафт склада.
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
 * Быстрое списание хирургических материалов со склада с гарантированным мягким овердрафтом (Мандат 8e).
 * Отправляет реальный сетевой запрос POST /api/inventory/:orgId/quick-writeoff-surgery в PostgreSQL 18.
 * Задержка оприходования накладной поставщика не блокирует врача и операцию.
 */
export async function quickDeductSurgicalMaterials(params: {
	materials: readonly { name: string; unit: string; quantity: number; isWarehouseCritical?: boolean | undefined }[];
	hasWarehouseDelay?: boolean | undefined;
	operationTitle?: string | undefined;
	organizationId?: string | undefined;
	category?: string | undefined;
	protocolId?: string | undefined;
	toothNumber?: number | string | undefined;
	sutureMaterial?: string | undefined;
	hemostatics?: string[] | undefined;
	graft?: string | undefined;
	membrane?: string | undefined;
	hasPins?: boolean | undefined;
	implantBrand?: string | undefined;
}): Promise<SurgicalMaterialDeductionResult> {
	let isOverdraft = Boolean(params.hasWarehouseDelay);
	let deductedItems = params.materials.map((m) => ({
		name: m.name,
		unit: m.unit,
		quantity: m.quantity,
		isOverdraft,
	}));

	let messageRu = isOverdraft
		? `Списано ${params.materials.length} поз. под операцию «${params.operationTitle || "Хирургическое вмешательство"}» в мягкий овердрафт склада без комиссии и блокировки врача.`
		: `Материалы операции «${params.operationTitle || "Хирургическое вмешательство"}» (${params.materials.length} поз.) успешно списаны со склада.`;

	const orgId =
		params.organizationId ||
		(typeof window !== "undefined" && typeof window.localStorage !== "undefined"
			? window.localStorage.getItem("dente_organization_id") || "00000000-0000-0000-0000-000000000001"
			: "00000000-0000-0000-0000-000000000001");

	if (typeof window !== "undefined" && typeof fetch === "function") {
		try {
			const res = await fetch(`/api/inventory/${orgId}/quick-writeoff-surgery`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					category: params.category,
					protocolId: params.protocolId,
					operationTitle: params.operationTitle,
					toothNumber: params.toothNumber,
					sutureMaterial: params.sutureMaterial,
					hemostatics: params.hemostatics,
					graft: params.graft,
					membrane: params.membrane,
					hasPins: params.hasPins,
					implantBrand: params.implantBrand,
					materials: params.materials.map((m) => ({
						name: m.name,
						unit: m.unit,
						quantity: m.quantity,
						isWarehouseCritical: m.isWarehouseCritical,
					})),
				}),
			});

			if (res.ok) {
				const data = await res.json();
				if (data && Array.isArray(data.deductedItems) && data.deductedItems.length > 0) {
					isOverdraft = Boolean(data.isOverdraft);
					deductedItems = data.deductedItems.map((d: any) => ({
						name: d.itemName || d.name,
						unit: d.unit || "шт.",
						quantity: d.quantity || 1,
						isOverdraft: Boolean(d.isOverdraft),
					}));
					if (data.message) {
						messageRu = data.message;
					}
				}
			}
		} catch (err) {
			console.warn("[surgeryProtocols] Network writeoff fallback to soft overdraft:", err);
		}
	}

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
/**
 * Диспатч услуг хирургического протокола в активный счёт/смету визита
 * через глобальную шину CustomEvent `dente-add-services-to-invoice` (Мандаты 8e, 8i, 8k, 8n).
 */
export function dispatchSurgicalServicesToInvoice(params: {
	norm?: SurgicalOperationNorm | undefined;
	toothFdi?: number | undefined;
	customServices?: readonly SurgicalService804n[] | undefined;
	onAddToInvoice?: ((services: readonly SurgicalService804n[]) => void) | undefined;
}): readonly SurgicalService804n[] {
	const effectiveTooth = params.toothFdi ?? params.norm?.defaultToothFdi;
	const services =
		params.customServices && params.customServices.length > 0
			? params.customServices.map((s) => ({ ...s, toothNumber: s.toothNumber ?? effectiveTooth }))
			: params.norm
				? getSurgicalServices804n(params.norm, effectiveTooth)
				: [];

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

			// Direct update to useVisitStore if available
			const winAny = window as any;
			const visitStore = winAny.__useVisitStore?.getState?.();
			if (visitStore?.applyServicesToToothState) {
				visitStore.applyServicesToToothState({
					toothNumber: effectiveTooth,
					toothCode: effectiveTooth ? String(effectiveTooth) : undefined,
					services: services.map((s) => ({
						code: s.code,
						code804n: s.code,
						title: s.nameRu || s.name,
						price: s.priceRub,
						unitPriceRub: s.priceRub,
						toothNumber: effectiveTooth,
					})),
				});
			}
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
	SIMPLE: "A16.07.001", // Удаление постоянного зуба простое
	COMPLEX_SEPARATION: "A16.07.001.001", // Удаление зуба сложное с разъединением корней
	IMPACTED_DYSTOPIC: "A16.07.001.002", // Операция удаления ретинированного / дистопированного зуба
	SINUS_LIFT: "A16.07.041.001", // Синус-лифтинг закрытый/открытый
	BONE_GRAFT: "A16.07.041", // Костная пластика альвеолярного отростка
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
 * Варианты гемостаза лунки удаленного зуба (Мандат 8e).
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
 * Степени сложности экстракции зуба по номенклатуре 804н (Мандат 8e).
 */
export const EXTRACTION_COMPLEXITY_OPTIONS: readonly ExtractionComplexityOption[] = [
	{
		id: "simple",
		code804n: EXTRACTION_804N_CODES.SIMPLE,
		labelRu: "Простое удаление постоянного зуба (щипцы / элеватор)",
		badge: "Простое (A16.07.001)",
		normId: "surgery_extraction_simple",
		defaultPriceRub: 3500,
	},
	{
		id: "complex",
		code804n: EXTRACTION_804N_CODES.COMPLEX_SEPARATION,
		labelRu: "Сложное удаление с разъединением корней бором Lindemann",
		badge: "Сложное (A16.07.001.001)",
		normId: "surgery_extraction_complex",
		defaultPriceRub: 6000,
	},
	{
		id: "impacted_dystopic",
		code804n: EXTRACTION_804N_CODES.IMPACTED_DYSTOPIC,
		labelRu: "Удаление ретинированного / дистопированного зуба с лоскутом",
		badge: "Ретинированный (A16.07.001.002)",
		normId: "surgery_extraction_atypical",
		defaultPriceRub: 9500,
	},
];

/**
 * Получение перечня услуг Номенклатуры 804н для операции удаления зуба.
 */
export function getExtractionServices804n(params: {
	complexity: ExtractionComplexity;
	toothFdi?: number;
	hemostasis?: readonly SurgicalHemostasisMethod[];
	sutureMaterial?: string;
}): readonly SurgicalService804n[] {
	const tooth = params.toothFdi;
	const comp = params.complexity;
	const hemo = params.hemostasis || [];

	const primary =
		comp === "complex"
			? {
					code: EXTRACTION_804N_CODES.COMPLEX_SEPARATION,
					nameRu: "Удаление зуба сложное с разъединением корней",
					name: "Удаление зуба сложное с разъединением корней",
					priceRub: 6000,
					quantity: 1,
					suggestedPriceRub: 6000,
					toothNumber: tooth,
					stageKind: "stage_2_surgery" as const,
					isPrimary: true,
			  }
			: comp === "impacted_dystopic"
				? {
						code: EXTRACTION_804N_CODES.IMPACTED_DYSTOPIC,
						nameRu: "Операция удаления ретинированного / дистопированного зуба",
						name: "Операция удаления ретинированного / дистопированного зуба",
						priceRub: 9500,
						quantity: 1,
						suggestedPriceRub: 9500,
						toothNumber: tooth,
						stageKind: "stage_2_surgery" as const,
						isPrimary: true,
				  }
				: {
						code: EXTRACTION_804N_CODES.SIMPLE,
						nameRu: "Удаление постоянного зуба (простое)",
						name: "Удаление постоянного зуба (простое)",
						priceRub: 3500,
						quantity: 1,
						suggestedPriceRub: 3500,
						toothNumber: tooth,
						stageKind: "stage_2_surgery" as const,
						isPrimary: true,
				  };

	const items: SurgicalService804n[] = [primary];

	// Кюретаж лунки
	items.push({
		code: EXTRACTION_804N_CODES.CURETTAGE,
		nameRu: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
		name: "Кюретаж лунки удаленного зуба (ревизия и гемостаз)",
		priceRub: 1200,
		quantity: 1,
		suggestedPriceRub: 1200,
		toothNumber: tooth,
		stageKind: "stage_2_surgery" as const,
	});

	// Наложение шва, если сложное/ретинированное или выбран шов
	if (comp === "complex" || comp === "impacted_dystopic" || hemo.includes("vicryl_suture")) {
		const sutName = params.sutureMaterial || "Викрил 4-0";
		items.push({
			code: EXTRACTION_804N_CODES.SUTURE_VICRYL,
			nameRu: `Наложение шва на слизистую оболочку рта (${sutName})`,
			name: `Наложение шва на слизистую оболочку рта (${sutName})`,
			priceRub: 1500,
			quantity: 1,
			suggestedPriceRub: 1500,
			toothNumber: tooth,
			stageKind: "stage_2_surgery" as const,
		});
	}

	// Анестезия
	items.push({
		code: comp === "impacted_dystopic" ? EXTRACTION_804N_CODES.ANESTHESIA_CONDUCTION : EXTRACTION_804N_CODES.ANESTHESIA_INFILTRATION,
		nameRu: comp === "impacted_dystopic"
			? "Проводниковая (торусальная) анестезия (Артикаин)"
			: "Инфильтрационная анестезия (Артикаин 1:100 000)",
		name: comp === "impacted_dystopic"
			? "Проводниковая (торусальная) анестезия (Артикаин)"
			: "Инфильтрационная анестезия (Артикаин 1:100 000)",
		priceRub: comp === "impacted_dystopic" ? 1200 : 900,
		quantity: 1,
		suggestedPriceRub: comp === "impacted_dystopic" ? 1200 : 900,
		toothNumber: tooth,
		stageKind: "stage_2_surgery" as const,
	});

	return items;
}

/**
 * Получение перечня услуг Номенклатуры 804н для синус-лифтинга и костной пластики.
 */
export function getSinusGbrServices804n(params: {
	isClosedSinus: boolean;
	toothFdi?: number;
	membrane?: string;
	hasPins?: boolean;
}): readonly SurgicalService804n[] {
	const tooth = params.toothFdi;
	const isClosed = params.isClosedSinus;

	if (isClosed) {
		return [
			{
				code: EXTRACTION_804N_CODES.SINUS_LIFT,
				nameRu: "Синус-лифтинг закрытый (трансальвеолярный)",
				name: "Синус-лифтинг закрытый (трансальвеолярный)",
				priceRub: 18000,
				quantity: 1,
				suggestedPriceRub: 18000,
				toothNumber: tooth,
				stageKind: "stage_2_surgery" as const,
				isPrimary: true,
			},
			{
				code: EXTRACTION_804N_CODES.SUTURE_VICRYL,
				nameRu: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				name: "Наложение шва на слизистую оболочку рта (ПГА 4-0)",
				priceRub: 1500,
				quantity: 1,
				suggestedPriceRub: 1500,
				toothNumber: tooth,
				stageKind: "stage_2_surgery" as const,
			},
			{
				code: EXTRACTION_804N_CODES.ANESTHESIA_INFILTRATION,
				nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
				priceRub: 900,
				quantity: 1,
				suggestedPriceRub: 900,
				toothNumber: tooth,
				stageKind: "stage_2_surgery" as const,
			},
		];
	}

	return [
		{
			code: EXTRACTION_804N_CODES.BONE_GRAFT,
			nameRu: "Костная пластика альвеолярного отростка (латеральный синус-лифтинг & НКР)",
			name: "Костная пластика альвеолярного отростка (латеральный синус-лифтинг & НКР)",
			priceRub: 35000,
			quantity: 1,
			suggestedPriceRub: 35000,
			toothNumber: tooth,
			stageKind: "stage_2_surgery" as const,
			isPrimary: true,
		},
		{
			code: EXTRACTION_804N_CODES.SINUS_LIFT,
			nameRu: "Внесение остеопластического материала (ксенографт) и мембраны",
			name: "Внесение остеопластического материала (ксенографт) и мембраны",
			priceRub: 18000,
			quantity: 1,
			suggestedPriceRub: 18000,
			toothNumber: tooth,
			stageKind: "stage_2_surgery" as const,
		},
		{
			code: EXTRACTION_804N_CODES.SUTURE_VICRYL,
			nameRu: "Наложение шва на слизистую оболочку рта (ПГА/Викрил 4-0)",
			name: "Наложение шва на слизистую оболочку рта (ПГА/Викрил 4-0)",
			priceRub: 1500,
			quantity: 1,
			suggestedPriceRub: 1500,
			toothNumber: tooth,
			stageKind: "stage_2_surgery" as const,
		},
		{
			code: EXTRACTION_804N_CODES.ANESTHESIA_INFILTRATION,
			nameRu: "Инфильтрационная анестезия (Артикаин 1:100 000)",
			name: "Инфильтрационная анестезия (Артикаин 1:100 000)",
			priceRub: 900,
			quantity: 1,
			suggestedPriceRub: 900,
			toothNumber: tooth,
			stageKind: "stage_2_surgery" as const,
		},
	];
}

export interface StandardExtractionParams {
	readonly toothFdi?: number | undefined;
	readonly complexity?: ExtractionComplexity | undefined;
	readonly hemostasis?: readonly SurgicalHemostasisMethod[] | undefined;
	readonly sutureMaterial?: string | undefined;
	readonly anesthesia?: string | undefined;
	readonly postOpXray?: boolean | undefined;
}

/**
 * Генератор протокола операции экстракции зуба (Мандаты 8e, 8k, 8i).
 * Поддерживает простое, сложное с разъединением корней и атипичное удаление
 * с выбором гемостаза (Альвожил, гемостатическая губка, шов Викрил 4-0).
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
 * Формирование памятки пациенту после удаления для мессенджеров WhatsApp / Telegram
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


