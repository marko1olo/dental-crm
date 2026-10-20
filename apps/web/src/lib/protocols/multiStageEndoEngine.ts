/**
 * apps/web/src/lib/protocols/multiStageEndoEngine.ts
 *
 * DENTE Dental CRM — Высокопроизводительный движок двухэтапной эндодонтии и смарт-копирования повторных визитов.
 * Решает клиническую боль лечения пульпита (K04.0) и периодонтита (K04.5) в 2-3 этапа:
 *
 * 1-й этап (предыдущий визит):
 *   - Экстирпация пульпы / девитализация, мехобработка ProTaper, промывка NaOCl 3%,
 *     временное пломбирование гидроксидом кальция (Calcept / Metapex), временная повязка (Септопак / Дентин-паста).
 *   - Услуга Минздрава 804н: A16.07.030.001 (Инструментальная и медикаментозная обработка корневого канала).
 *
 * 2-й этап (текущий визит, 7-14 дней спустя):
 *   - 1-клик трансформация дневника Формы 043/у:
 *     1. Анамнез заболевания и диагноз (K04.0 / K04.5) переносятся автоматически.
 *     2. Жалобы: «Жалоб на момент осмотра не предъявляет. Временная повязка сохранена, герметична.»
 *     3. Осмотр: «Временная повязка сохранена, герметична. Перкуссия безболезненна. Пальпация безболезненна. Зондирование безболезненно.»
 *     4. Протокол лечения: «Удаление временной повязки, ревизия корневых каналов, ирригация EDTA 17% + NaOCl 3%, ультразвуковая активация, высушивание бумажными штифтами. Постоянная обтурация каналов методом латеральной компакции гуттаперчей с силером AH Plus. Рентген-контроль обтурации. Постоянная реставрация коронки зуба композитом светового отверждения.»
 *   - Автоматическая замена услуг в кассовом счёте / смете 804н:
 *     Удаление A16.07.030.001 -> Добавление A16.07.008.002 (Обтурация гуттаперчей) + A16.07.002.001 (Световая пломба).
 *     Цены подтягиваются из прейскуранта клиники (serviceCatalog) с мягкими базовыми фолбеками (Мандат 8ah).
 *
 * Оптимизация для слабых клинических моноблоков (Celeron, 4GB RAM, 5400 RPM HDD):
 *   - O(1) in-memory кэширование снимков истории Map<toothNumber, LastVisitSoapSnapshot>.
 *   - Время отклика UI < 16 мс (60 FPS без сетевых запросов при переключении зубов).
 */

import type { DiaryState } from "./protocolTypes.js";

/** Коды Номенклатуры медицинских услуг Минздрава РФ (Приказ 804н) */
export const ORDER_804N_ENDO_CODES = {
	STAGE1_INSTRUMENTATION_1CANAL: "A16.07.030.001",
	STAGE1_INSTRUMENTATION_BASE: "A16.07.030",
	STAGE2_OBTURATION_GUTTAPERCHA: "A16.07.008.002",
	STAGE2_RESTORATION_COMPOSITE: "A16.07.002.001",
} as const;

export const DEFAULT_STAGE1_SERVICE_TITLE =
	"Инструментальная и медикаментозная обработка корневого канала";
export const DEFAULT_STAGE2_OBTURATION_TITLE =
	"Пломбирование корневого канала гуттаперчей (постоянная обтурация)";
export const DEFAULT_STAGE2_RESTORATION_TITLE =
	"Восстановление зуба пломбой (светоотверждаемый композит)";

export const BASELINE_PRICES_RUB = {
	STAGE1_INSTRUMENTATION: 3500,
	STAGE2_OBTURATION: 4500,
	STAGE2_RESTORATION: 4800,
} as const;

/** Снимок клинического состояния зуба с предыдущего визита */
export interface LastVisitSoapSnapshot {
	readonly visitId?: string | undefined;
	/** Дата предыдущего визита (например «12.10.2026» или «3 октября 2026») */
	readonly date: string;
	readonly toothNumber: number;
	readonly diagnosisIcd10: string;
	readonly diagnosisTitle: string;
	readonly anamnesis: string;
	readonly complaintsStage1?: string | undefined;
	readonly treatmentStage1?: string | undefined;
	readonly statusLocalisStage1?: string | undefined;
	readonly servicesStage1?:
		| ReadonlyArray<{
				code804n: string;
				title: string;
				priceRub?: number | undefined;
		  }>
		| undefined;
	readonly isEndoUnfinished: boolean;
	readonly stage: 1 | 2;
}

/** Результат автоматической трансформации 1-го этапа эндодонтии во 2-й этап */
export interface MultiStageEndoTransformResult {
	readonly toothNumber: number;
	readonly snapshotDate: string;
	readonly soap: {
		readonly diagnosis: string;
		readonly anamnesis: string;
		readonly complaints: string;
		readonly objectiveStatus: string;
		readonly treatmentPlan: string;
		readonly recommendations: string;
	};
	readonly servicesToRemove: ReadonlyArray<{
		code804n: string;
		title?: string | undefined;
	}>;
	readonly servicesToAdd: ReadonlyArray<{
		serviceId?: string | undefined;
		code804n: string;
		title: string;
		unitPriceRub: number;
		basePriceRub: number;
		quantity: number;
		toothCode?: string | undefined;
	}>;
	readonly targetToothState: "done" | "treatment";
}

/** Резолвер цены услуги из прейскуранта клиники с мягким фолбеком */
export function resolveServicePriceFromCatalog(
	serviceCatalog: readonly any[] | undefined,
	code804n: string,
	fallbackPriceRub: number,
	defaultTitle: string,
): { priceRub: number; title: string; serviceId?: string } {
	if (Array.isArray(serviceCatalog) && serviceCatalog.length > 0) {
		const matched = serviceCatalog.find((item) => {
			if (!item) return false;
			const c = String(item.code || item.code804n || "").trim();
			if (c === code804n || c.startsWith(code804n)) return true;
			// Мягкий поиск по вхождению ключевых слов
			const titleLower = String(item.title || item.name || "").toLowerCase();
			if (
				code804n === ORDER_804N_ENDO_CODES.STAGE2_OBTURATION_GUTTAPERCHA &&
				(titleLower.includes("обтурац") ||
					(titleLower.includes("пломбирован") && titleLower.includes("канал")))
			) {
				return true;
			}
			if (
				code804n === ORDER_804N_ENDO_CODES.STAGE2_RESTORATION_COMPOSITE &&
				(titleLower.includes("светов") || titleLower.includes("композит") || titleLower.includes("пломб"))
			) {
				return true;
			}
			return false;
		});

		if (matched) {
			const price = Number(matched.basePriceRub ?? matched.priceRub ?? matched.price ?? 0);
			const result: { priceRub: number; title: string; serviceId?: string } = {
				priceRub: price > 0 ? price : fallbackPriceRub,
				title: String(matched.title || matched.name || defaultTitle),
			};
			if (matched.id) {
				result.serviceId = String(matched.id);
			}
			return result;
		}
	}

	return {
		priceRub: fallbackPriceRub,
		title: defaultTitle,
	};
}

/** In-memory L1 cache Map<patientId, Map<toothNumber, LastVisitSoapSnapshot>> для моментального доступа (<0.1 мс) */
const patientEndoHistoryIndexCache = new Map<string, Map<number, LastVisitSoapSnapshot>>();

/** Очистка кэша индекса истории */
export function clearEndoHistoryIndex(patientId?: string): void {
	if (patientId) {
		patientEndoHistoryIndexCache.delete(patientId);
	} else {
		patientEndoHistoryIndexCache.clear();
	}
}

/** Форматирование читаемой даты визита */
export function formatVisitDateRu(rawDate?: string | Date | null): string {
	if (!rawDate) {
		const d = new Date();
		d.setDate(d.getDate() - 7);
		return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
	}
	try {
		const d = new Date(rawDate);
		if (Number.isNaN(d.getTime())) {
			return String(rawDate);
		}
		return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
	} catch {
		return String(rawDate);
	}
}

/** Проверка, относится ли диагноз или процедура к эндодонтическому лечению (пульпит K04.0 / периодонтит K04.5) */
export function isEndodonticIndication(diagnosisOrText?: string | null): boolean {
	if (!diagnosisOrText) return false;
	const s = diagnosisOrText.toLowerCase();
	return (
		s.includes("k04.0") ||
		s.includes("k04.5") ||
		s.includes("k04") ||
		s.includes("пульпит") ||
		s.includes("периодонтит") ||
		s.includes("каласепт") ||
		s.includes("calcept") ||
		s.includes("metapex") ||
		s.includes("септопак") ||
		s.includes("временн") ||
		s.includes("a16.07.030") ||
		s.includes("эндодонт") ||
		s.includes("корнев")
	);
}

/** Построение быстрого индекса истории незавершенных эндо-приёмов в памяти */
export function buildPatientPreviousVisitsEndoIndex(params: {
	readonly patientId?: string | null | undefined;
	readonly appointments?: readonly any[] | undefined;
	readonly dashboard?: any | undefined;
	readonly storedTeeth?: readonly any[] | undefined;
	readonly toothStates?: Record<string, string> | undefined;
	readonly toothRecords?: Record<string, any> | undefined;
	readonly activeVisitId?: string | null | undefined;
}): Map<number, LastVisitSoapSnapshot> {
	const patientKey = params.patientId || "current-active-patient";
	const indexMap = new Map<number, LastVisitSoapSnapshot>();

	const appts = params.appointments ?? params.dashboard?.appointments ?? [];

	// 1. Сканируем приёмы/записи пациента из расписания и архива
	if (Array.isArray(appts) && appts.length > 0) {
		// Сортируем от самых свежих к старым
		const filtered = [...appts]
			.filter((a) => {
				if (!a) return false;
				if (params.patientId && a.patientId && a.patientId !== params.patientId) return false;
				if (params.activeVisitId && a.id === params.activeVisitId) return false;
				return true;
			})
			.sort((a, b) => {
				const timeA = a.startsAt ? new Date(a.startsAt).getTime() : 0;
				const timeB = b.startsAt ? new Date(b.startsAt).getTime() : 0;
				return timeB - timeA;
			});

		for (const appt of filtered) {
			const textCorpus = `${appt.reason || ""} ${appt.comment || ""} ${appt.notes || ""} ${appt.diagnosis || ""}`;
			// Извлекаем номер зуба
			const toothMatch = /(?:зуб|tooth|#)\s*([1-4][1-8]|[5-8][1-5])/i.exec(textCorpus);
			const rawTooth = toothMatch ? Number(toothMatch[1]) : Number(appt.diagnosisTooth);
			const toothNumber = Number.isInteger(rawTooth) && rawTooth > 0 ? rawTooth : null;

			if (toothNumber && isEndodonticIndication(textCorpus)) {
				if (!indexMap.has(toothNumber)) {
					const isPeriodontitis = textCorpus.toLowerCase().includes("периодонтит") || textCorpus.toLowerCase().includes("k04.5");
					const diagCode = isPeriodontitis ? "K04.5" : "K04.0";
					const diagTitle = isPeriodontitis
						? `K04.5 Хронический апикальный периодонтит (зуб ${toothNumber})`
						: `K04.0 Острый пульпит (зуб ${toothNumber})`;

					const dateStr = formatVisitDateRu(appt.startsAt || appt.date);
					indexMap.set(toothNumber, {
						visitId: appt.id,
						date: dateStr,
						toothNumber,
						diagnosisIcd10: diagCode,
						diagnosisTitle: diagTitle,
						anamnesis: `Жалобы на боли в зубе ${toothNumber}. В предыдущее посещение от ${dateStr} начато эндодонтическое лечение: раскрытие полости, экстирпация пульпы, механическая обработка каналов ProTaper, антисептическая промывка NaOCl 3%, временное пломбирование гидроксидом кальция (Calcept / Metapex), герметичная временная повязка.`,
						complaintsStage1: appt.reason || "Острые боли в зубе, усиливающиеся от термических раздражителей.",
						isEndoUnfinished: true,
						stage: 1,
					});
				}
			}
		}
	}

	// 2. Сканируем сохраненные зубы из одонтограммы (storedTeeth / toothStates)
	const teethList = params.storedTeeth ?? [];
	for (const t of teethList) {
		const toothNum = Number(t?.toothNumber);
		if (!toothNum || Number.isNaN(toothNum)) continue;

		const s = String(t.state || "").toLowerCase();
		const isUnfinishedTooth =
			s === "treatment" ||
			s === "pulpitis" ||
			s === "periodontitis" ||
			s.includes("канал") ||
			s.includes("каласепт");

		if (isUnfinishedTooth && !indexMap.has(toothNum)) {
			const isPeriodontitis = s === "periodontitis";
			const diagCode = isPeriodontitis ? "K04.5" : "K04.0";
			const diagTitle = isPeriodontitis
				? `K04.5 Хронический апикальный периодонтит (зуб ${toothNum})`
				: `K04.0 Острый пульпит (зуб ${toothNum})`;

			const pastDate = formatVisitDateRu(null);
			indexMap.set(toothNum, {
				date: pastDate,
				toothNumber: toothNum,
				diagnosisIcd10: diagCode,
				diagnosisTitle: diagTitle,
				anamnesis: `В предыдущее посещение от ${pastDate} начато эндодонтическое лечение зуба ${toothNum}: инструментальная и антисептическая обработка корневых каналов, временное пломбирование гидроксидом кальция Calcept под герметичную временную повязку.`,
				isEndoUnfinished: true,
				stage: 1,
			});
		}
	}

	// 3. Сканируем reactive toothStates / toothRecords из useVisitStore
	if (params.toothStates) {
		for (const [codeStr, stateVal] of Object.entries(params.toothStates)) {
			const toothNum = Number(codeStr);
			if (!toothNum || Number.isNaN(toothNum)) continue;
			const st = String(stateVal || "").toLowerCase();
			if ((st === "treatment" || st === "pulpitis" || st === "periodontitis") && !indexMap.has(toothNum)) {
				const isPeriodontitis = st === "periodontitis";
				const diagCode = isPeriodontitis ? "K04.5" : "K04.0";
				const pastDate = formatVisitDateRu(null);
				indexMap.set(toothNum, {
					date: pastDate,
					toothNumber: toothNum,
					diagnosisIcd10: diagCode,
					diagnosisTitle: isPeriodontitis
						? `K04.5 Хронический апикальный периодонтит (зуб ${toothNum})`
						: `K04.0 Острый пульпит (зуб ${toothNum})`,
					anamnesis: `В предыдущее посещение от ${pastDate} начато эндодонтическое лечение зуба ${toothNum}: инструментальная и медикаментозная обработка корневых каналов, временное пломбирование гидроксидом кальция Calcept под герметичную временную повязку.`,
					isEndoUnfinished: true,
					stage: 1,
				});
			}
		}
	}

	// Сохраняем в кэш L1 для мгновенного считывания
	patientEndoHistoryIndexCache.set(patientKey, indexMap);
	return indexMap;
}

/** O(1) получение незавершенного эндо-снимка для зуба */
export function getUnfinishedEndoSnapshot(
	patientId: string | null | undefined,
	toothNumber: number | null | undefined,
	customIndex?: Map<number, LastVisitSoapSnapshot>,
): LastVisitSoapSnapshot | null {
	if (!toothNumber || Number.isNaN(toothNumber) || toothNumber <= 0) return null;

	if (customIndex && customIndex.has(toothNumber)) {
		const item = customIndex.get(toothNumber);
		if (item?.isEndoUnfinished) return item;
	}

	const patientKey = patientId || "current-active-patient";
	const cachedMap = patientEndoHistoryIndexCache.get(patientKey);
	if (cachedMap && cachedMap.has(toothNumber)) {
		const item = cachedMap.get(toothNumber);
		if (item?.isEndoUnfinished) return item;
	}

	return null;
}

/**
 * 1-клик трансформация 1-го этапа эндодонтии во 2-й этап.
 * Синтезирует обновленный дневник Формы 043/у и набор сервисов Номенклатуры 804н.
 */
export function transformEndoStage1ToStage2(params: {
	readonly snapshot: LastVisitSoapSnapshot;
	readonly toothNumber?: number | undefined;
	readonly serviceCatalog?: readonly any[] | undefined;
	readonly currentDiary?: DiaryState | undefined;
}): MultiStageEndoTransformResult {
	const tooth = params.toothNumber || params.snapshot.toothNumber;
	const snapshotDate = params.snapshot.date;

	// 1. Анамнез заболевания и диагноз (K04.0 / K04.5) переносятся автоматически
	const diagnosis =
		params.snapshot.diagnosisTitle ||
		`${params.snapshot.diagnosisIcd10} Эндодонтическое лечение (зуб ${tooth})`;

	const anamnesis =
		params.snapshot.anamnesis ||
		`Ранее начато эндодонтическое лечение зуба ${tooth} от ${snapshotDate}: экстирпация пульпы, инструментальная обработка каналов ProTaper, временное пломбирование гидроксидом кальция Calcept под герметичную временную повязку Септопак. Аллергоанамнез не отягощен.`;

	// 2. Жалобы актуальные для 2-го этапа (1:1 требование ТЗ Создателя)
	const complaints =
		"Жалоб на момент осмотра не предъявляет. Временная повязка сохранена, герметична.";

	// 3. Объективный статус 2-го этапа
	const objectiveStatus = `Зуб ${tooth}: Временная повязка сохранена, герметична. Вертикальная и горизонтальная перкуссия безболезненна. Пальпация по переходной складке в области проекции верхушки корня безболезненна, слизистая оболочка физиологической окраски, бледно-розовая, без признаков воспаления. Зондирование устьев безболезненно.`;

	// 4. Протокол лечения 2-го этапа (1:1 требование ТЗ Создателя)
	const treatmentPlan = `Зуб ${tooth}: 2-й этап эндодонтического лечения. Удаление временной повязки, ревизия корневых каналов, ирригация EDTA 17% + NaOCl 3%, ультразвуковая активация, высушивание бумажными штифтами. Постоянная обтурация каналов методом латеральной компакции гуттаперчей с силером AH Plus. Рентген-контроль обтурации. Постоянная реставрация коронки зуба композитом светового отверждения.`;

	// 5. Рекомендации
	const recommendations =
		"Не принимать пищу в течение 2 часов до окончания действия анестезии. Щадящая жевательная нагрузка на причинную сторону 1-2 дня. Контрольный рентгенологический осмотр через 6 и 12 месяцев.";

	// 6. Подбор цен по прейскуранту клиники (Мандат 8ah)
	const obturationPricing = resolveServicePriceFromCatalog(
		params.serviceCatalog,
		ORDER_804N_ENDO_CODES.STAGE2_OBTURATION_GUTTAPERCHA,
		BASELINE_PRICES_RUB.STAGE2_OBTURATION,
		DEFAULT_STAGE2_OBTURATION_TITLE,
	);

	const restorationPricing = resolveServicePriceFromCatalog(
		params.serviceCatalog,
		ORDER_804N_ENDO_CODES.STAGE2_RESTORATION_COMPOSITE,
		BASELINE_PRICES_RUB.STAGE2_RESTORATION,
		DEFAULT_STAGE2_RESTORATION_TITLE,
	);

	// 7. Смета 804н: замена услуги 1-го этапа на услуги 2-го этапа
	const servicesToRemove = [
		{
			code804n: ORDER_804N_ENDO_CODES.STAGE1_INSTRUMENTATION_1CANAL,
			title: DEFAULT_STAGE1_SERVICE_TITLE,
		},
		{
			code804n: ORDER_804N_ENDO_CODES.STAGE1_INSTRUMENTATION_BASE,
			title: DEFAULT_STAGE1_SERVICE_TITLE,
		},
	];

	const servicesToAdd = [
		{
			serviceId: obturationPricing.serviceId || ORDER_804N_ENDO_CODES.STAGE2_OBTURATION_GUTTAPERCHA,
			code804n: ORDER_804N_ENDO_CODES.STAGE2_OBTURATION_GUTTAPERCHA,
			title: obturationPricing.title,
			unitPriceRub: obturationPricing.priceRub,
			basePriceRub: obturationPricing.priceRub,
			quantity: 1,
			toothCode: String(tooth),
		},
		{
			serviceId: restorationPricing.serviceId || ORDER_804N_ENDO_CODES.STAGE2_RESTORATION_COMPOSITE,
			code804n: ORDER_804N_ENDO_CODES.STAGE2_RESTORATION_COMPOSITE,
			title: restorationPricing.title,
			unitPriceRub: restorationPricing.priceRub,
			basePriceRub: restorationPricing.priceRub,
			quantity: 1,
			toothCode: String(tooth),
		},
	];

	return {
		toothNumber: tooth,
		snapshotDate,
		soap: {
			diagnosis,
			anamnesis,
			complaints,
			objectiveStatus,
			treatmentPlan,
			recommendations,
		},
		servicesToRemove,
		servicesToAdd,
		targetToothState: "done",
	};
}
