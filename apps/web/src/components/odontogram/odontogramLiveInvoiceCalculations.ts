import { isDeciduousTooth } from "../treatment-plans/treatmentPlanStagesEngine";
import { basisPointsFromPercent, kopecksToRubles, rublesToKopecks, percentageOfKopecks, toExactKopecks } from "@dental/shared";
import type { ToothData } from "./ToothChart";

export interface ClinicServiceCatalogEntry {
	readonly code?: string | null | undefined;
	readonly order804nCode?: string | null | undefined;
	readonly standardCode?: string | null | undefined;
	readonly catalogCode?: string | null | undefined;
	readonly title?: string | null | undefined;
	readonly name?: string | null | undefined;
	readonly priceKopecks?: number | bigint | null | undefined;
	readonly basePriceRub?: number | null | undefined;
	readonly priceRub?: number | null | undefined;
	readonly active?: boolean | null | undefined;
	readonly isActive?: boolean | null | undefined;
}

export interface LiveInvoiceProcedureSpec {
	code: string;
	title: string;
	price: number;
	amountKopecks: number;
	category: string;
}

export interface LiveInvoiceItem {
	toothNumber: number;
	code: string;
	title: string;
	category: string;
	price: number;
	amountKopecks: number;
	quantity: number;
	discountRub?: number | undefined;
}

export interface LiveInvoiceCashierExport {
	patientId?: string | undefined;
	patientName?: string | undefined;
	items: LiveInvoiceItem[];
	grossTotalRub: number;
	discountRub: number;
	netTotalRub: number;
	grossTotalKopecks?: number;
	discountKopecks?: number;
	netTotalKopecks?: number;
	discountPercent: number;
	createdAtIso: string;
}

/**
 * Каталог медицинских услуг стоматологии
 * с поддержкой взрослой терапии, эндодонтии (обработка и обтурация корневых каналов),
 * пародонтологии, детской стоматологии, имплантации и костной пластики.
 * Цены указаны в рублях и точных целочисленных копейках (amountKopecks).
 */
export const ORDER_804N_PROCEDURES: Record<
	string,
	{ code: string; title: string; price: number; amountKopecks: number; category: string }
> = {
	// Терапия
	Caries: {
		code: "A16.07.002.001",
		title: "Восстановление зуба пломбой (лечение кариеса фотополимером)",
		price: 4500,
		amountKopecks: 450000,
		category: "Терапия",
	},
	Caries1Surface: {
		code: "A16.07.002.001",
		title: "Восстановление зуба пломбой I, V, VI класс по Блэку (1 поверхность)",
		price: 4500,
		amountKopecks: 450000,
		category: "Терапия",
	},
	CariesMultiSurfaces: {
		code: "A16.07.002.002",
		title: "Восстановление зуба пломбой II, III, IV класс по Блэку (2 и более поверхностей)",
		price: 6000,
		amountKopecks: 600000,
		category: "Терапия",
	},
	Crown: {
		code: "A16.07.004.001",
		title: "Восстановление зуба коронкой из диоксида циркония / E.max",
		price: 24000,
		amountKopecks: 2400000,
		category: "Ортопедия",
	},

	// Эндодонтия 804н — Инструментальная и медикаментозная обработка корневых каналов (A16.07.030.001..004)
	EndoPrep1Canal: {
		code: "A16.07.030.001",
		title: "Инструментальная и медикаментозная обработка корневого канала (1-канальный зуб)",
		price: 3500,
		amountKopecks: 350000,
		category: "Эндодонтия",
	},
	EndoPrep2Canals: {
		code: "A16.07.030.002",
		title: "Инструментальная и медикаментозная обработка корневых каналов (2-канальный зуб)",
		price: 5500,
		amountKopecks: 550000,
		category: "Эндодонтия",
	},
	EndoPrep3Canals: {
		code: "A16.07.030.003",
		title: "Инструментальная и медикаментозная обработка корневых каналов (3-канальный зуб)",
		price: 7500,
		amountKopecks: 750000,
		category: "Эндодонтия",
	},
	EndoPrep4Canals: {
		code: "A16.07.030.004",
		title: "Инструментальная и медикаментозная обработка корневых каналов (4-канальный зуб)",
		price: 9500,
		amountKopecks: 950000,
		category: "Эндодонтия",
	},

	// Эндодонтия 804н — Пломбирование / обтурация корневых каналов (A16.07.008.001..004)
	EndoObturation1Canal: {
		code: "A16.07.008.001",
		title: "Пломбирование корневого канала зуба (1-канальный зуб)",
		price: 3000,
		amountKopecks: 300000,
		category: "Эндодонтия",
	},
	EndoObturation2Canals: {
		code: "A16.07.008.002",
		title: "Пломбирование корневых каналов зуба (2-канальный зуб)",
		price: 5000,
		amountKopecks: 500000,
		category: "Эндодонтия",
	},
	EndoObturation3Canals: {
		code: "A16.07.008.003",
		title: "Пломбирование корневых каналов зуба (3-канальный зуб)",
		price: 7000,
		amountKopecks: 700000,
		category: "Эндодонтия",
	},
	EndoObturation4Canals: {
		code: "A16.07.008.004",
		title: "Пломбирование корневых каналов зуба (4-канальный зуб)",
		price: 9000,
		amountKopecks: 900000,
		category: "Эндодонтия",
	},

	// Дополнительные процедуры эндодонтии
	EndoMedicationCaOH2: {
		code: "A16.07.091",
		title: "Временное пломбирование лекарственным препаратом корневого канала (Ca(OH)2)",
		price: 2000,
		amountKopecks: 200000,
		category: "Эндодонтия",
	},
	EndoUnsealing: {
		code: "A16.07.082",
		title: "Распломбирование корневого канала зуба",
		price: 2500,
		amountKopecks: 250000,
		category: "Эндодонтия",
	},

	// Псевдонимы эндодонтии для обратной совместимости
	Pulpitis: {
		code: "A16.07.008.002",
		title: "Эндодонтическое лечение пульпита (обработка и обтурация каналов)",
		price: 10500,
		amountKopecks: 1050000,
		category: "Эндодонтия",
	},
	Periodontitis: {
		code: "A16.07.009.001",
		title: "Лечение апикального периодонтита (распломбирование, дезинфекция и обтурация)",
		price: 12500,
		amountKopecks: 1250000,
		category: "Эндодонтия",
	},

	// Хирургия и Имплантация
	Implant: {
		code: "A16.07.054.001",
		title: "Внутрикостная дентальная имплантация + формирователь десны",
		price: 42000,
		amountKopecks: 4200000,
		category: "Хирургия",
	},
	Planned_Implant: {
		code: "A16.07.054.001",
		title: "Дентальная имплантация (планируемый этап) + формирователь десны",
		price: 42000,
		amountKopecks: 4200000,
		category: "Хирургия",
	},
	Missing: {
		code: "A16.07.054.001",
		title: "Дентальная имплантация (восстановление отсутствующего зуба)",
		price: 35000,
		amountKopecks: 3500000,
		category: "Хирургия",
	},
	Root: {
		code: "A16.07.001.002",
		title: "Удаление фрагмента / разрушенного корня зуба",
		price: 4000,
		amountKopecks: 400000,
		category: "Хирургия",
	},
	Retained: {
		code: "A16.07.001.003",
		title: "Сложное удаление ретинированного / дистопированного зуба",
		price: 8500,
		amountKopecks: 850000,
		category: "Хирургия",
	},
	Impacted: {
		code: "A16.07.001.003",
		title: "Сложное удаление ретинированного / дистопированного зуба",
		price: 8500,
		amountKopecks: 850000,
		category: "Хирургия",
	},
	BoneGrafting: {
		code: "A16.07.041",
		title: "Костная пластика челюстно-лицевой области (НКР / синус-лифтинг)",
		price: 28000,
		amountKopecks: 2800000,
		category: "Хирургия",
	},
	ImplantProsthetics: {
		code: "A16.07.006",
		title: "Протезирование на имплантате (абатмент + циркониевая коронка)",
		price: 34000,
		amountKopecks: 3400000,
		category: "Ортопедия",
	},

	// Пародонтология и Профилактика
	PeriodontalScaling: {
		code: "A16.07.051",
		title: "Скейлинг и сглаживание корней при заболеваниях пародонта (SRP)",
		price: 2500,
		amountKopecks: 250000,
		category: "Пародонтология",
	},
	PeriodontalHygiene: {
		code: "A16.07.050",
		title: "Профессиональная гигиена полости рта (Air-Flow + УЗ-скейлинг)",
		price: 5500,
		amountKopecks: 550000,
		category: "Гигиена",
	},
	PeriodontalCurettage: {
		code: "A16.07.039",
		title: "Закрытый кюретаж пародонтального кармана",
		price: 1800,
		amountKopecks: 180000,
		category: "Пародонтология",
	},
	PeriodontalSplinting: {
		code: "A16.07.019",
		title: "Временное шинирование подвижных зубов (лента Ribbond)",
		price: 4500,
		amountKopecks: 450000,
		category: "Пародонтология",
	},

	// Детская стоматология (временные зубы)
	PediatricCaries: {
		code: "A16.07.002.001",
		title: "Восстановление временного зуба пломбой (лечение кариеса)",
		price: 3200,
		amountKopecks: 320000,
		category: "Детская терапия",
	},
	PediatricPulpitis: {
		code: "A16.07.008.001",
		title: "Пульпотомия временного зуба с биоактивной герметизацией",
		price: 5800,
		amountKopecks: 580000,
		category: "Детская терапия",
	},
	PediatricExtraction: {
		code: "A16.07.001",
		title: "Удаление временного зуба с анестезией",
		price: 1800,
		amountKopecks: 180000,
		category: "Детская хирургия",
	},
	PediatricCrown: {
		code: "A16.07.004.003",
		title: "Восстановление временного зуба защитной коронкой SSC",
		price: 4900,
		amountKopecks: 490000,
		category: "Детская ортопедия",
	},
	PediatricFissureSeal: {
		code: "A16.07.057",
		title: "Запечатывание фиссуры зуба герметиком (Clinpro)",
		price: 2200,
		amountKopecks: 220000,
		category: "Профилактика",
	},
};

/**
 * Определение анатомического количества корневых каналов по стандарту FDI ISO 3950:
 * - Резцы и клыки (11..13, 21..23, 31..33, 41..43): 1 канал
 * - Верхние 1-е премоляры (14, 24): 2 канала (щечный B + небный P)
 * - Верхние 2-е премоляры (15, 25): 1 канал
 * - Нижние премоляры (34, 35, 44, 45): 1 канал
 * - Нижние моляры (36, 37, 46, 47, 38, 48): 3 канала (MB, ML, Distal) или 4 канала
 * - Верхние моляры (16, 17, 26, 27, 18, 28): 4 канала (MB1, MB2, DB, Palatal) или 3 канала
 * - Временные резцы/клыки (51..53, 61..63, 71..73, 81..83): 1 канал
 * - Временные моляры (54, 55, 64, 65): 3 канала; (74, 75, 84, 85): 2 канала
 */
export function getAnatomicalRootCanalCount(
	toothNumber: number,
	clinicalCanalCount?: number,
): number {
	if (
		typeof clinicalCanalCount === "number" &&
		Number.isFinite(clinicalCanalCount) &&
		clinicalCanalCount > 0
	) {
		return Math.min(4, Math.max(1, Math.round(clinicalCanalCount)));
	}

	const isDeciduous = isDeciduousTooth(toothNumber);
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const isUpper =
		quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;

	// Временный прикус
	if (isDeciduous) {
		if (pos <= 3) return 1;
		if (isUpper) return 3;
		return 2;
	}

	// Постоянный прикус
	// Резцы и клыки: 11..13, 21..23, 31..33, 41..43 -> 1 канал
	if (pos >= 1 && pos <= 3) {
		return 1;
	}

	// Премоляры:
	if (pos === 4) {
		// Верхний 1-й премоляр (14, 24) -> 2 канала (B, P)
		if (isUpper) return 2;
		// Нижний 1-й премоляр (34, 44) -> 1 канал
		return 1;
	}

	if (pos === 5) {
		// Верхний 2-й премоляр (15, 25) и нижний 2-й премоляр (35, 45) -> 1 канал
		return 1;
	}

	// Моляры: 6, 7, 8
	if (pos >= 6 && pos <= 8) {
		if (isUpper) {
			// Верхние моляры (16, 17, 26, 27, 18, 28): 4 канала (MB1, MB2, DB, Palatal)
			return 4;
		}
		// Нижние моляры (36, 37, 46, 47, 38, 48): 3 канала (MB, ML, Distal)
		return 3;
	}

	return 1;
}

/**
 * Проверка, является ли зуб анатомически многокорневым (моляры 16..18, 26..28, 36..38, 46..48, верхние первые премоляры 14, 24, молочные моляры)
 */
export function isMultiRootedTooth(toothNumber: number): boolean {
	return getAnatomicalRootCanalCount(toothNumber) >= 2;
}

/**
 * Получить услугу инструментальной и медикаментозной обработки каналов (A16.07.030.001..004)
 */
export function getEndoPreparationProcedure(canalsCount: number): {
	code: string;
	title: string;
	price: number;
	amountKopecks: number;
	category: string;
} {
	const clamped = Math.min(4, Math.max(1, Math.round(canalsCount)));
	const key = `EndoPrep${clamped}Canal${clamped > 1 ? "s" : ""}`;
	const base = ORDER_804N_PROCEDURES[key];
	if (base) return base;

	const price = 3500 + (clamped - 1) * 2000;
	return {
		code: `A16.07.030.00${clamped}`,
		title: `Инструментальная и медикаментозная обработка корневых каналов (${clamped}-канальный зуб)`,
		price,
		amountKopecks: rublesToKopecks(price),
		category: "Эндодонтия",
	};
}

/**
 * Получить услугу пломбирования / обтурации корневых каналов (A16.07.008.001..004)
 */
export function getEndoObturationProcedure(canalsCount: number): {
	code: string;
	title: string;
	price: number;
	amountKopecks: number;
	category: string;
} {
	const clamped = Math.min(4, Math.max(1, Math.round(canalsCount)));
	const key = `EndoObturation${clamped}Canal${clamped > 1 ? "s" : ""}`;
	const base = ORDER_804N_PROCEDURES[key];
	if (base) return base;

	const price = 3000 + (clamped - 1) * 2000;
	return {
		code: `A16.07.008.00${clamped}`,
		title: `Пломбирование корневых каналов зуба (${clamped}-канальный зуб)`,
		price,
		amountKopecks: rublesToKopecks(price),
		category: "Эндодонтия",
	};
}

/**
 * Строит быстрый индекс услуг клиники по коду прайса (804н / внутренний код).
 */
export function buildClinicCatalogLookupMap(
	clinicServiceCatalog?: readonly ClinicServiceCatalogEntry[] | undefined,
): Map<string, ClinicServiceCatalogEntry> {
	const map = new Map<string, ClinicServiceCatalogEntry>();
	if (!Array.isArray(clinicServiceCatalog) || clinicServiceCatalog.length === 0) {
		return map;
	}
	for (const entry of clinicServiceCatalog) {
		if (!entry) continue;
		if (entry.active === false || entry.isActive === false) continue;
		const keys = [
			entry.order804nCode,
			entry.standardCode,
			entry.catalogCode,
			entry.code,
		];
		for (const rawKey of keys) {
			if (typeof rawKey === "string" && rawKey.trim() !== "") {
				const normalized = rawKey.trim().toUpperCase();
				if (!map.has(normalized)) {
					map.set(normalized, entry);
				}
			}
		}
	}
	return map;
}

function resolveCatalogEntryPriceKopecks(entry: ClinicServiceCatalogEntry): number | null {
	if (entry.priceKopecks !== null && entry.priceKopecks !== undefined) {
		const kop = Number(entry.priceKopecks);
		if (Number.isFinite(kop) && kop > 0) {
			return Math.round(kop);
		}
	}
	const rubCandidate = entry.priceRub ?? entry.basePriceRub;
	if (rubCandidate !== null && rubCandidate !== undefined) {
		const rub = Number(rubCandidate);
		if (Number.isFinite(rub) && rub > 0) {
			return rublesToKopecks(rub);
		}
	}
	return null;
}

/**
 * Разрешает цену и наименование процедуры по реальному прайсу клиники,
 * сохраняя базовую ставку ORDER_804N_PROCEDURES строго как fallback.
 */
export function resolveProcedureWithClinicCatalog(
	baseProcedure: LiveInvoiceProcedureSpec,
	catalogMap?: ReadonlyMap<string, ClinicServiceCatalogEntry> | undefined,
): LiveInvoiceProcedureSpec {
	if (!catalogMap || catalogMap.size === 0) {
		return baseProcedure;
	}
	const matched = catalogMap.get(baseProcedure.code.trim().toUpperCase());
	if (!matched) {
		return baseProcedure;
	}
	const resolvedKopecks = resolveCatalogEntryPriceKopecks(matched);
	const resolvedTitle = (matched.title || matched.name || "").trim();
	const amountKopecks =
		resolvedKopecks !== null ? resolvedKopecks : baseProcedure.amountKopecks;
	const price =
		resolvedKopecks !== null
			? kopecksToRubles(amountKopecks)
			: baseProcedure.price;

	return {
		...baseProcedure,
		title: resolvedTitle || baseProcedure.title,
		price,
		amountKopecks,
	};
}

/**
 * Разрешает процедуру для состояния зуба с учётом актуального прайса клиники.
 */
export function resolveClinicProcedureForState(
	state: string,
	clinicServiceCatalog?: readonly ClinicServiceCatalogEntry[] | undefined,
): LiveInvoiceProcedureSpec | undefined {
	const base = ORDER_804N_PROCEDURES[state];
	if (!base) return undefined;
	const catalogMap = buildClinicCatalogLookupMap(clinicServiceCatalog);
	return resolveProcedureWithClinicCatalog(base, catalogMap);
}

/**
 * Чистый клинико-финансовый расчет позиций живой сметы по одонтограмме.
 */
export function calculateLiveInvoiceItems(
	teethData: readonly ToothData[],
	options?: {
		excludedKeys?: ReadonlySet<string> | undefined;
		quantities?: Record<string, number> | undefined;
		discountPercent?: number | undefined;
		clinicServiceCatalog?: readonly ClinicServiceCatalogEntry[] | undefined;
	},
): LiveInvoiceItem[] {
	const excludedKeys = options?.excludedKeys ?? new Set<string>();
	const quantities = options?.quantities ?? {};
	const discountPercent = options?.discountPercent ?? 0;
	const catalogMap = buildClinicCatalogLookupMap(options?.clinicServiceCatalog);
	const resolveProc = (base: LiveInvoiceProcedureSpec): LiveInvoiceProcedureSpec =>
		resolveProcedureWithClinicCatalog(base, catalogMap);
	const resolveCatalogProc = (key: string): LiveInvoiceProcedureSpec | undefined => {
		const base = ORDER_804N_PROCEDURES[key];
		return base ? resolveProcedureWithClinicCatalog(base, catalogMap) : undefined;
	};

	const items: LiveInvoiceItem[] = [];

	for (const t of teethData) {
		const num = t.toothNumber;
		const state = t.state;
		const isDeciduous = isDeciduousTooth(num);

		// 1. Пародонтологический скрининг
		const hasBoneLoss = Boolean(t.boneLossLevel && t.boneLossLevel > 0);
		const hasMobility = Boolean(t.mobility && t.mobility > 0);
		const hasFurcation = Boolean(t.furcationGrade && t.furcationGrade > 0);

		if (hasBoneLoss || hasMobility || hasFurcation) {
			const prSrp = resolveCatalogProc("PeriodontalScaling");
			if (prSrp) {
				const srpKey = `${num}-${prSrp.code}`;
				if (!excludedKeys.has(srpKey)) {
					const qty = quantities[srpKey] ?? 1;
					const grossKopecks = prSrp.amountKopecks * qty;
					const discKopecks =
						discountPercent > 0
							? percentageOfKopecks(toExactKopecks(grossKopecks), basisPointsFromPercent(discountPercent))
							: 0;
					const netKopecks = grossKopecks - discKopecks;
					const disc = kopecksToRubles(discKopecks);
					items.push({
						toothNumber: num,
						code: prSrp.code,
						title: `Зуб ${num}: ${prSrp.title}`,
						category: prSrp.category,
						price: prSrp.price,
						amountKopecks: netKopecks,
						quantity: qty,
						discountRub: disc,
					});
				}
			}

			if (t.boneLossLevel && t.boneLossLevel >= 2) {
				const prCur = resolveCatalogProc("PeriodontalCurettage");
				if (prCur) {
					const curKey = `${num}-${prCur.code}`;
					if (!excludedKeys.has(curKey)) {
						const qty = quantities[curKey] ?? 1;
						const grossKopecks = prCur.amountKopecks * qty;
						const discKopecks =
							discountPercent > 0
								? percentageOfKopecks(toExactKopecks(grossKopecks), basisPointsFromPercent(discountPercent))
								: 0;
						const netKopecks = grossKopecks - discKopecks;
						const disc = kopecksToRubles(discKopecks);
						items.push({
							toothNumber: num,
							code: prCur.code,
							title: `Зуб ${num}: ${prCur.title}`,
							category: prCur.category,
							price: prCur.price,
							amountKopecks: netKopecks,
							quantity: qty,
							discountRub: disc,
						});
					}
				}
			}

			if (t.mobility && t.mobility >= 2) {
				const prSplint = resolveCatalogProc("PeriodontalSplinting");
				if (prSplint) {
					const splintKey = `${num}-${prSplint.code}`;
					if (!excludedKeys.has(splintKey)) {
						const qty = quantities[splintKey] ?? 1;
						const grossKopecks = prSplint.amountKopecks * qty;
						const discKopecks =
							discountPercent > 0
								? percentageOfKopecks(toExactKopecks(grossKopecks), basisPointsFromPercent(discountPercent))
								: 0;
						const netKopecks = grossKopecks - discKopecks;
						const disc = kopecksToRubles(discKopecks);
						items.push({
							toothNumber: num,
							code: prSplint.code,
							title: `Зуб ${num}: ${prSplint.title}`,
							category: prSplint.category,
							price: prSplint.price,
							amountKopecks: netKopecks,
							quantity: qty,
							discountRub: disc,
						});
					}
				}
			}
		}

		const hasSecondaryCaries =
			Boolean(t.hasSecondaryCaries) ||
			Boolean(
				(t.clinicalData as Record<string, unknown> | undefined)
					?.hasSecondaryCaries,
			) ||
			Boolean(
				(t.clinicalData as Record<string, unknown> | undefined)
					?.secondaryCariesUnderFilling,
			);

		if (!state || state === "Healthy" || (state === "Filled" && !hasSecondaryCaries)) continue;

		// 2. Детская стоматология (Временные зубы 51..85)
		if (isDeciduous) {
			if (state === "Missing") {
				continue;
			}
			let pedKeyName = "PediatricCaries";
			if (state === "Pulpitis") {
				pedKeyName = "PediatricPulpitis";
			} else if (state === "Periodontitis") {
				pedKeyName = "PediatricExtraction";
			} else if (state === "Crown") {
				pedKeyName = "PediatricCrown";
			}
			const pedPr = resolveCatalogProc(pedKeyName);
			if (!pedPr) continue;

			const pedKey = `${num}-${pedPr.code}`;
			if (!excludedKeys.has(pedKey)) {
				const qty = quantities[pedKey] ?? 1;
				const grossKopecks = pedPr.amountKopecks * qty;
				const discKopecks =
					discountPercent > 0
						? percentageOfKopecks(toExactKopecks(grossKopecks), basisPointsFromPercent(discountPercent))
						: 0;
				const netKopecks = grossKopecks - discKopecks;
				const disc = kopecksToRubles(discKopecks);
				items.push({
					toothNumber: num,
					code: pedPr.code,
					title: `Временный зуб ${num}: ${pedPr.title}`,
					category: pedPr.category,
					price: pedPr.price,
					amountKopecks: netKopecks,
					quantity: qty,
					discountRub: disc,
				});
			}
			continue;
		}

		// 3. Взрослая эндодонтия (Пульпит и Периодонтит постоянных зубов 11..48)
		if (state === "Pulpitis" || state === "Periodontitis") {
			const clinicalCanals =
				t.clinicalData &&
				typeof t.clinicalData === "object" &&
				"canals" in t.clinicalData &&
				Array.isArray((t.clinicalData as { canals?: unknown[] }).canals)
					? (t.clinicalData as { canals?: unknown[] }).canals?.length
					: undefined;

			const canalsCount = getAnatomicalRootCanalCount(num, clinicalCanals);
			const prepProc = resolveProc(getEndoPreparationProcedure(canalsCount));
			const obtProc = resolveProc(getEndoObturationProcedure(canalsCount));

			// 3a. Инструментальная и медикаментозная обработка корневых каналов (A16.07.030.001..004)
			const prepKey = `${num}-${prepProc.code}`;
			if (!excludedKeys.has(prepKey)) {
				const qty = quantities[prepKey] ?? 1;
				const grossKopecks = prepProc.amountKopecks * qty;
				const discKopecks =
					discountPercent > 0
						? percentageOfKopecks(toExactKopecks(grossKopecks), basisPointsFromPercent(discountPercent))
						: 0;
				const netKopecks = grossKopecks - discKopecks;
				const disc = kopecksToRubles(discKopecks);
				items.push({
					toothNumber: num,
					code: prepProc.code,
					title: `Зуб ${num}: ${prepProc.title}`,
					category: prepProc.category,
					price: prepProc.price,
					amountKopecks: netKopecks,
					quantity: qty,
					discountRub: disc,
				});
			}

			// 3b. Пломбирование / обтурация корневых каналов
			const obtKey = `${num}-${obtProc.code}`;
			if (!excludedKeys.has(obtKey)) {
				const qty = quantities[obtKey] ?? 1;
				const grossKopecks = obtProc.amountKopecks * qty;
				const discKopecks =
					discountPercent > 0
						? percentageOfKopecks(toExactKopecks(grossKopecks), basisPointsFromPercent(discountPercent))
						: 0;
				const netKopecks = grossKopecks - discKopecks;
				const disc = kopecksToRubles(discKopecks);
				items.push({
					toothNumber: num,
					code: obtProc.code,
					title: `Зуб ${num}: ${obtProc.title}`,
					category: obtProc.category,
					price: obtProc.price,
					amountKopecks: netKopecks,
					quantity: qty,
					discountRub: disc,
				});
			}

			continue;
		}

		// 4. Взрослая терапия (кариес постоянных зубов, включая вторичный кариес и 804н по числу поверхностей)
		const isCariesTreatment = state === "Caries" || (state === "Filled" && hasSecondaryCaries);
		if (isCariesTreatment) {
			let surfaceCount = 1;
			if (Array.isArray(t.surfaces) && t.surfaces.length > 0) {
				surfaceCount = t.surfaces.length;
			} else if (
				t.clinicalData &&
				typeof t.clinicalData === "object" &&
				"defectSurfaces" in t.clinicalData &&
				Array.isArray(
					(t.clinicalData as { defectSurfaces?: unknown[] }).defectSurfaces,
				)
			) {
				surfaceCount = (
					t.clinicalData as { defectSurfaces: unknown[] }
				).defectSurfaces.length;
			}

			const pr = resolveCatalogProc(
				surfaceCount >= 2 ? "CariesMultiSurfaces" : "Caries1Surface",
			);
			if (!pr) continue;

			const itemKey = `${num}-${pr.code}`;
			const qty = quantities[itemKey] ?? 1;

			if (!excludedKeys.has(itemKey)) {
				const itemPrice = pr.price;
				const grossKopecks = pr.amountKopecks * qty;
				const discKopecks =
					discountPercent > 0
						? percentageOfKopecks(
								toExactKopecks(grossKopecks),
								basisPointsFromPercent(discountPercent),
							)
						: 0;
				const netKopecks = grossKopecks - discKopecks;
				const itemDiscount = kopecksToRubles(discKopecks);
				const titleDetail = hasSecondaryCaries
					? `Зуб ${num}: Вторичный кариес под пломбой — ${pr.title}`
					: `Зуб ${num}: ${pr.title}`;

				items.push({
					toothNumber: num,
					code: pr.code,
					title: titleDetail,
					category: pr.category,
					price: itemPrice,
					amountKopecks: netKopecks,
					quantity: qty,
					discountRub: itemDiscount,
				});
			}
			continue;
		}

		// 5. Взрослая ортопедия, хирургия (Crown, Implant, Missing...)
		const stateProc = resolveCatalogProc(state);
		if (stateProc) {
			const itemKey = `${num}-${stateProc.code}`;
			const qty = quantities[itemKey] ?? 1;

			if (!excludedKeys.has(itemKey)) {
				const itemPrice = stateProc.price;
				const grossKopecks = stateProc.amountKopecks * qty;
				const discKopecks =
					discountPercent > 0
						? percentageOfKopecks(toExactKopecks(grossKopecks), basisPointsFromPercent(discountPercent))
						: 0;
				const netKopecks = grossKopecks - discKopecks;
				const itemDiscount = kopecksToRubles(discKopecks);

				items.push({
					toothNumber: num,
					code: stateProc.code,
					title: `Зуб ${num}: ${stateProc.title}`,
					category: stateProc.category,
					price: itemPrice,
					amountKopecks: netKopecks,
					quantity: qty,
					discountRub: itemDiscount,
				});
			}
		}

		// Для отсутствующих зубов при планировании имплантации добавляем костную пластику (при атрофии) и протезирование
		if (state === "Missing" || state === "Planned_Implant") {
			if (t.boneLossLevel && t.boneLossLevel > 0) {
				const prGraft = resolveCatalogProc("BoneGrafting");
				if (prGraft) {
					const graftKey = `${num}-${prGraft.code}`;
					if (!excludedKeys.has(graftKey)) {
						const qty = quantities[graftKey] ?? 1;
						const grossKopecks = prGraft.amountKopecks * qty;
						const discKopecks =
							discountPercent > 0
								? percentageOfKopecks(toExactKopecks(grossKopecks), basisPointsFromPercent(discountPercent))
								: 0;
						const netKopecks = grossKopecks - discKopecks;
						const disc = kopecksToRubles(discKopecks);
						items.push({
							toothNumber: num,
							code: prGraft.code,
							title: `Зуб ${num}: ${prGraft.title}`,
							category: prGraft.category,
							price: prGraft.price,
							amountKopecks: netKopecks,
							quantity: qty,
							discountRub: disc,
						});
					}
				}
			}

			const prProsth = resolveCatalogProc("ImplantProsthetics");
			if (prProsth) {
				const prosthKey = `${num}-${prProsth.code}`;
				if (!excludedKeys.has(prosthKey)) {
					const qty = quantities[prosthKey] ?? 1;
					const grossKopecks = prProsth.amountKopecks * qty;
					const discKopecks =
						discountPercent > 0
							? percentageOfKopecks(toExactKopecks(grossKopecks), basisPointsFromPercent(discountPercent))
							: 0;
					const netKopecks = grossKopecks - discKopecks;
					const disc = kopecksToRubles(discKopecks);
					items.push({
						toothNumber: num,
						code: prProsth.code,
						title: `Зуб ${num}: ${prProsth.title}`,
						category: prProsth.category,
						price: prProsth.price,
						amountKopecks: netKopecks,
						quantity: qty,
						discountRub: disc,
					});
				}
			}
		}
	}

	return items;
}
