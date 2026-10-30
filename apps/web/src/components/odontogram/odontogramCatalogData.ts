/**
 * apps/web/src/components/odontogram/odontogramCatalogData.ts
 *
 * DENTE Dental CRM — Canonical Odontogram SSOT Catalog & Price Linkage.
 * Single Source of Truth for FDI 11-48 & 51-85, 5 surfaces, 10 chairside statuses,
 * and seamless 1-click visit estimate recommendations (Mandate 8b: 250-350 lines).
 */

export type OdontogramDentitionMode = "adult" | "pediatric" | "mixed";

export interface ToothSurfaceDefinition {
	readonly id: "V" | "L" | "M" | "D" | "Occ";
	readonly code: string;
	readonly nameRu: string;
	readonly shortRu: string;
	readonly description: string;
}

/** 5 канонических поверхностей зуба (СтАР / ВОЗ / FDI) */
export const CANONICAL_5_SURFACES: readonly ToothSurfaceDefinition[] = Object.freeze([
	{ id: "Occ", code: "O", nameRu: "Окклюзионная", shortRu: "О", description: "Жевательная поверхность / режущий край" },
	{ id: "V", code: "V", nameRu: "Вестибулярная", shortRu: "В", description: "Щёчная или губная поверхность" },
	{ id: "L", code: "L", nameRu: "Оральная", shortRu: "Я", description: "Язычная или нёбная поверхность" },
	{ id: "M", code: "M", nameRu: "Медиальная", shortRu: "М", description: "Передняя контактная поверхность к центру дуги" },
	{ id: "D", code: "D", nameRu: "Дистальная", shortRu: "Д", description: "Задняя контактная поверхность от центра дуги" },
]);

export interface ClinicalStatusEstimatePreset {
	readonly code804n: string;
	readonly serviceTitle: string;
	readonly amountKopecks: number;
	readonly defaultQuantity: number;
	readonly category: string;
}

export interface OdontogramClinicalStatus {
	readonly key: string;
	readonly codeRu: string;
	readonly labelRu: string;
	readonly shortLabel: string;
	readonly colorHex: string;
	readonly bgToken: string;
	readonly borderToken: string;
	readonly textToken: string;
	readonly isPathology: boolean;
	readonly recommendedEstimate?: ClinicalStatusEstimatePreset;
}

/** 10 базовых кресельных клинических статусов зубной формулы DENTE */
export const CLINICAL_STATUSES_SSOT: readonly OdontogramClinicalStatus[] = Object.freeze([
	{
		key: "Healthy",
		codeRu: "З",
		labelRu: "Интактный / Здоров",
		shortLabel: "Норма",
		colorHex: "#10b981",
		bgToken: "var(--emerald-surface, rgba(16, 185, 129, 0.12))",
		borderToken: "var(--emerald, #10b981)",
		textToken: "var(--emerald-ink, #065f46)",
		isPathology: false,
	},
	{
		key: "Caries",
		codeRu: "К",
		labelRu: "Кариес",
		shortLabel: "Кариес",
		colorHex: "#f59e0b",
		bgToken: "var(--amber-surface, rgba(245, 158, 11, 0.14))",
		borderToken: "var(--amber, #f59e0b)",
		textToken: "var(--amber-ink, #92400e)",
		isPathology: true,
		recommendedEstimate: {
			code804n: "A16.07.002.001",
			serviceTitle: "Лечение кариеса с постановкой светоотверждаемой пломбы",
			amountKopecks: 450000,
			defaultQuantity: 1,
			category: "Терапевтическая стоматология",
		},
	},
	{
		key: "Pulpitis",
		codeRu: "П",
		labelRu: "Пульпит",
		shortLabel: "Пульпит",
		colorHex: "#ef4444",
		bgToken: "var(--rose-surface, rgba(239, 68, 68, 0.14))",
		borderToken: "var(--rose, #ef4444)",
		textToken: "var(--rose-ink, #991b1b)",
		isPathology: true,
		recommendedEstimate: {
			code804n: "A16.07.030.001",
			serviceTitle: "Эндодонтическое лечение пульпита (инструментальная и медикаментозная обработка)",
			amountKopecks: 650000,
			defaultQuantity: 1,
			category: "Эндодонтия",
		},
	},
	{
		key: "Periodontitis",
		codeRu: "Пт",
		labelRu: "Периодонтит",
		shortLabel: "Периодонтит",
		colorHex: "#dc2626",
		bgToken: "var(--danger-soft, rgba(220, 38, 38, 0.15))",
		borderToken: "var(--danger, #dc2626)",
		textToken: "var(--danger-ink, #7f1d1d)",
		isPathology: true,
		recommendedEstimate: {
			code804n: "A16.07.008.001",
			serviceTitle: "Лечение деструктивных форм периодонтита с временной обтурацией",
			amountKopecks: 780000,
			defaultQuantity: 1,
			category: "Эндодонтия",
		},
	},
	{
		key: "Filled",
		codeRu: "Пл",
		labelRu: "Пломба",
		shortLabel: "Пломба",
		colorHex: "#3b82f6",
		bgToken: "var(--sky-surface, rgba(59, 130, 246, 0.12))",
		borderToken: "var(--sky, #3b82f6)",
		textToken: "var(--sky-ink, #1e40af)",
		isPathology: false,
		recommendedEstimate: {
			code804n: "A16.07.002.002",
			serviceTitle: "Полировка и коррекция реставрации",
			amountKopecks: 150000,
			defaultQuantity: 1,
			category: "Терапевтическая стоматология",
		},
	},
	{
		key: "Crown",
		codeRu: "Кр",
		labelRu: "Искусственная коронка",
		shortLabel: "Коронка",
		colorHex: "#8b5cf6",
		bgToken: "var(--purple-surface, rgba(139, 92, 246, 0.12))",
		borderToken: "var(--purple-accent, #8b5cf6)",
		textToken: "var(--purple-ink, #5b21b6)",
		isPathology: false,
		recommendedEstimate: {
			code804n: "A16.07.004.001",
			serviceTitle: "Восстановление зуба коронкой (диоксид циркония/металлокерамика)",
			amountKopecks: 1800000,
			defaultQuantity: 1,
			category: "Ортопедическая стоматология",
		},
	},
	{
		key: "Implant",
		codeRu: "Имп",
		labelRu: "Имплант",
		shortLabel: "Имплант",
		colorHex: "#0d9488",
		bgToken: "var(--teal-subtle, rgba(13, 148, 136, 0.12))",
		borderToken: "var(--teal, #0d9488)",
		textToken: "var(--teal-ink, #115e59)",
		isPathology: false,
		recommendedEstimate: {
			code804n: "A16.07.006.001",
			serviceTitle: "Операция дентальной имплантации титанового имплантата",
			amountKopecks: 3500000,
			defaultQuantity: 1,
			category: "Хирургическая стоматология",
		},
	},
	{
		key: "Missing",
		codeRu: "О",
		labelRu: "Отсутствует / Удален",
		shortLabel: "Удален",
		colorHex: "#64748b",
		bgToken: "var(--paper-subtle, rgba(100, 116, 139, 0.12))",
		borderToken: "var(--line, #94a3b8)",
		textToken: "var(--ink-muted, #475569)",
		isPathology: true,
		recommendedEstimate: {
			code804n: "A16.07.001.001",
			serviceTitle: "Удаление постоянного зуба (типичное / сложное)",
			amountKopecks: 350000,
			defaultQuantity: 1,
			category: "Хирургическая стоматология",
		},
	},
	{
		key: "Retained",
		codeRu: "Р",
		labelRu: "Ретинированный зуб",
		shortLabel: "Ретинирован",
		colorHex: "#d97706",
		bgToken: "var(--amber-surface, rgba(217, 119, 6, 0.14))",
		borderToken: "var(--amber, #d97706)",
		textToken: "var(--amber-ink, #78350f)",
		isPathology: true,
		recommendedEstimate: {
			code804n: "A16.07.001.002",
			serviceTitle: "Хирургическое удаление ретинированного/дистопированного зуба",
			amountKopecks: 800000,
			defaultQuantity: 1,
			category: "Хирургическая стоматология",
		},
	},
	{
		key: "Root",
		codeRu: "Рз",
		labelRu: "Разрушен корень",
		shortLabel: "Корень",
		colorHex: "#b91c1c",
		bgToken: "var(--danger-soft, rgba(185, 28, 28, 0.15))",
		borderToken: "var(--danger, #b91c1c)",
		textToken: "var(--danger-ink, #450a0a)",
		isPathology: true,
		recommendedEstimate: {
			code804n: "A16.07.001.003",
			serviceTitle: "Удаление корня разрушенного зуба с выкраиванием лоскута",
			amountKopecks: 280000,
			defaultQuantity: 1,
			category: "Хирургическая стоматология",
		},
	},
]);

/** Постоянный прикус: 32 зуба по международной формуле FDI */
export const ADULT_TEETH_SSOT: readonly number[] = Object.freeze([
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, // Верхняя челюсть (Q1, Q2)
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38, // Нижняя челюсть (Q4, Q3)
]);

/** Молочный (детский) прикус: 20 зубов по формуле FDI */
export const PEDIATRIC_TEETH_SSOT: readonly number[] = Object.freeze([
	55, 54, 53, 52, 51, 61, 62, 63, 64, 65, // Верхняя молочная (Q5, Q6)
	85, 84, 83, 82, 81, 71, 72, 73, 74, 75, // Нижняя молочная (Q8, Q7)
]);

export interface ToothCatalogItem {
	readonly toothNumber: number;
	readonly isPediatric: boolean;
	readonly isUpper: boolean;
	readonly quadrant: number;
	readonly standardNameRu: string;
}

export function isPediatricTooth(num: number): boolean {
	return num >= 51 && num <= 85;
}

export function isUpperJawTooth(num: number): boolean {
	const q = Math.floor(num / 10);
	return q === 1 || q === 2 || q === 5 || q === 6;
}

export function getToothQuadrant(num: number): number {
	return Math.floor(num / 10);
}

export function getToothStandardNameRu(num: number): string {
	const isPed = isPediatricTooth(num);
	const pos = num % 10;
	const jaw = isUpperJawTooth(num) ? "верхний" : "нижний";
	const side = (getToothQuadrant(num) % 2 === 1) ? "правый" : "левый";

	if (isPed) {
		const pedNames = ["", "центральный резец", "боковой резец", "клык", "первый моляр", "второй моляр"];
		return `${pedNames[pos] || "зуб"} (${jaw} ${side}, молочный #${num})`;
	}

	const adultNames = [
		"",
		"центральный резец",
		"боковой резец",
		"клык",
		"первый премоляр",
		"второй премоляр",
		"первый моляр",
		"второй моляр",
		"третий моляр (зуб мудрости)",
	];
	return `${adultNames[pos] || "зуб"} (${jaw} ${side}, #${num})`;
}

export interface OdontogramToothEntry {
	toothNumber: number;
	state: string;
	surfaces: string[];
	mobility?: number;
	rootResorption?: number;
	notes?: string;
}

/** Создание карты 100% интактных зубов (физиологическая норма в 1 клик, Мандат 8e) */
export function createIntactDentition(mode: OdontogramDentitionMode = "adult"): Record<number, OdontogramToothEntry> {
	const result: Record<number, OdontogramToothEntry> = {};
	const teethList = mode === "pediatric" ? PEDIATRIC_TEETH_SSOT : ADULT_TEETH_SSOT;

	for (const num of teethList) {
		result[num] = {
			toothNumber: num,
			state: "Healthy",
			surfaces: [],
			mobility: 0,
			rootResorption: 0,
		};
	}

	if (mode === "mixed") {
		// Сменный прикус: постоянные резцы и первые моляры, молочные клыки и моляры
		for (const num of PEDIATRIC_TEETH_SSOT) {
			result[num] = {
				toothNumber: num,
				state: "Healthy",
				surfaces: [],
				mobility: 0,
			};
		}
	}

	return result;
}

export function getStatusDefinition(keyOrCode: string): OdontogramClinicalStatus {
	const found = CLINICAL_STATUSES_SSOT.find(
		(s) => s.key.toLowerCase() === keyOrCode.toLowerCase() || s.codeRu.toLowerCase() === keyOrCode.toLowerCase(),
	);
	return found || CLINICAL_STATUSES_SSOT[0]!;
}

export function getRecommendedEstimateForStatus(statusKey: string): ClinicalStatusEstimatePreset | undefined {
	const def = getStatusDefinition(statusKey);
	return def.recommendedEstimate;
}
