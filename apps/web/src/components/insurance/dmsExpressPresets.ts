/**
 * dmsExpressPresets.ts — Модели и 1-клик шаблоны экспресс-прикрепления гарантийного письма ДМС.
 * Избавляет врача и регистратуру от ручного заполнения 20 полей.
 */

/**
 * Модель гарантийного письма пациента для UI-компонентов и калькулятора ДМС
 */
export interface PatientGuaranteeLetter {
	readonly id: string;
	readonly letterNumber: string;
	readonly insurerKey: string;
	readonly insurerName: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly issueDate: string; // YYYY-MM-DD
	readonly validFrom: string; // YYYY-MM-DD
	readonly validUntil: string; // YYYY-MM-DD
	readonly maxCoverageKopecks: number;
	readonly usedAmountKopecks: number;
	readonly franchisePct: number; // 0..100%
	readonly franchiseType: "percent" | "fixed_kopecks";
	readonly franchiseFixedKopecks: number;
	readonly approvedTeethFdi: readonly string[];
	readonly approvedServiceCodes804n: readonly string[];
	readonly approvedDiagnosisMkb10: readonly string[];
	readonly curatorFullName: string;
	readonly curatorPhone: string;
	readonly curatorEmail?: string | undefined;
	readonly notes?: string | undefined;
	readonly status: "active" | "exhausted" | "expired" | "cancelled";
}

/**
 * Строка счета для сплит-калькулятора ДМС
 */
export interface BillItemToSplit {
	readonly id: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly discountPercent?: number | undefined;
}

/** Типовые диагнозы МКБ-10 в стоматологии */
export const COMMON_DENTAL_ICD10_DIAGNOSES = [
	{ code: "K02.1", title: "Кариес дентина", name: "Кариес дентина" },
	{ code: "K02.2", title: "Кариес цемента", name: "Кариес цемента" },
	{ code: "K04.0", title: "Пульпит (острый/хронический)", name: "Пульпит (острый/хронический)" },
	{ code: "K04.4", title: "Острый апикальный периодонтит", name: "Острый апикальный периодонтит" },
	{ code: "K04.5", title: "Хронический апикальный периодонтит", name: "Хронический апикальный периодонтит" },
	{ code: "K05.1", title: "Хронический гингивит", name: "Хронический гингивит" },
	{ code: "K05.3", title: "Хронический пародонтит", name: "Хронический пародонтит" },
	{ code: "K01.1", title: "Дистопия/ретенция зуба мудрости", name: "Дистопия/ретенция зуба мудрости" },
	{ code: "K08.1", title: "Потеря зубов вследствие удаления/травмы", name: "Потеря зубов вследствие удаления/травмы" },
] as const;

/** Зубная формула FDI: Взрослый прикус 18..11, 21..28 (верхняя челюсть), 48..41, 31..38 (нижняя челюсть) */
export const FDI_ADULT_TEETH_UPPER = [
	"1.8", "1.7", "1.6", "1.5", "1.4", "1.3", "1.2", "1.1",
	"2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8",
] as const;

export const FDI_ADULT_TEETH_LOWER = [
	"4.8", "4.7", "4.6", "4.5", "4.4", "4.3", "4.2", "4.1",
	"3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8",
] as const;

/** Демо-позиции визита для сплит-калькулятора */
export const DEFAULT_BILL_ITEMS_TO_SPLIT: readonly BillItemToSplit[] = [
	{
		id: "bill-1",
		serviceCode804n: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой световой (I класс)",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 450000,
	},
	{
		id: "bill-2",
		serviceCode804n: "A11.07.010",
		serviceName: "Инфильтрационная анестезия",
		toothNumber: "1.6",
		quantity: 1,
		unitPriceKopecks: 95000,
	},
	{
		id: "bill-3",
		serviceCode804n: "A16.07.050",
		serviceName: "Клиническое отбеливание зубов Zoom 4",
		toothNumber: undefined,
		quantity: 1,
		unitPriceKopecks: 2600000,
	},
];

/**
 * 1-клик шаблоны экспресс-прикрепления гарантийного письма ДМС
 * Избавляет врача и регистратуру от ручного заполнения 20 полей.
 */
export interface ExpressDmsGuaranteePreset {
	readonly id: string;
	readonly labelRu: string;
	readonly insurerKey: string;
	readonly insurerNameRu: string;
	readonly maxCoverageRub: number;
	readonly franchisePct: number;
	readonly approvedServiceCodes804n: readonly string[];
	readonly approvedDiagnosisMkb10: readonly string[];
	readonly noteRu: string;
}

export const EXPRESS_GUARANTEE_LETTER_PRESETS: readonly ExpressDmsGuaranteePreset[] = [
	{
		id: "express_sogaz_therapy",
		labelRu: "СОГАЗ • Терапия и анестезия (50 000 ₽)",
		insurerKey: "sogaz",
		insurerNameRu: "АО «СОГАЗ»",
		maxCoverageRub: 50000,
		franchisePct: 0,
		approvedServiceCodes804n: [
			"A16.07.002.001", // Пломба световая
			"A16.07.030.001", // Лечение пульпита
			"A16.07.008.001", // Периодонтит
			"A11.07.010",     // Анестезия
			"A06.07.004",     // Прицельный снимок
		],
		approvedDiagnosisMkb10: ["K02.1", "K04.0"],
		noteRu: "Экспресс-прикрепление: Базовое терапевтическое лечение кариеса и пульпита по согласованию СОГАЗ.",
	},
	{
		id: "express_ingos_surgery",
		labelRu: "Ингосстрах • Хирургия и острая боль (35 000 ₽)",
		insurerKey: "ingosstrakh",
		insurerNameRu: "СПАО «Ингосстрах»",
		maxCoverageRub: 35000,
		franchisePct: 15,
		approvedServiceCodes804n: [
			"A16.07.001.002", // Сложное удаление зуба
			"A11.07.010",     // Анестезия
			"A06.07.004",     // Визиография
		],
		approvedDiagnosisMkb10: ["K01.1", "K04.4"],
		noteRu: "Экспресс-прикрепление: Хирургическое лечение по острой боли (сооплата франшизы 15%).",
	},
	{
		id: "express_alfa_hygiene_therapy",
		labelRu: "АльфаСтрахование • Комплекс + Гигиена (60 000 ₽)",
		insurerKey: "alfastrakhovanie",
		insurerNameRu: "АО «АльфаСтрахование»",
		maxCoverageRub: 60000,
		franchisePct: 10,
		approvedServiceCodes804n: [
			"A16.07.002.001", // Пломба световая
			"A16.07.051",     // УЗ снятие зубных отложений (гигиена)
			"A11.07.010",     // Анестезия
			"B01.003.004.001",// Первичный осмотр
		],
		approvedDiagnosisMkb10: ["K02.1", "K05.1"],
		noteRu: "Экспресс-прикрепление: Терапевтический осмотр, лечение кариеса и гигиена полости рта.",
	},
	{
		id: "express_reso_emergency",
		labelRu: "РЕСО-Гарантия • Неотложная помощь (25 000 ₽)",
		insurerKey: "reso_garantiya",
		insurerNameRu: "СПАО «РЕСО-Гарантия»",
		maxCoverageRub: 25000,
		franchisePct: 0,
		approvedServiceCodes804n: [
			"A11.07.010",     // Анестезия
			"A16.07.001.001", // Удаление постоянного зуба
			"A16.07.030.001", // Неотложная эндодонтия
			"A06.07.004",     // Снимок
		],
		approvedDiagnosisMkb10: ["K04.0", "K04.4"],
		noteRu: "Экспресс-прикрепление: Купирование болевого синдрома и острая стоматологическая помощь.",
	},
];
