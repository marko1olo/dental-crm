/**
 * ============================================================================
 * CLINICAL DENTAL WARRANTY ENGINE & DURATION/RISK CALCULATOR
 * Математический и клинический расчет сроков гарантии, адаптации рисков,
 * криптографического хеширования SHA-256 и генерации паспорта (A4 / A5)
 * ============================================================================
 */

import {
	getWarrantyDefectTemplate, getWarrantyPreset,
	type WarrantyCategory, type WarrantyDefectType, type WarrantyRemediationMaterialItem,
} from "./warrantyPresets.js";
export type { WarrantyCategory, WarrantyDefectType, WarrantyRemediationMaterialItem };
import { generateQrCodeSvg, sha256Hex } from "@dental/shared";

export interface WarrantyRiskFactors {
	/** Гигиенический индекс Green-Vermillion (OHI-S: 0.0 - 6.0) */
	hygieneScore: number;
	/** Индекс КПУ (кариозные, пломбированные, удаленные) */
	kpuIndex?: number | undefined;
	/** Наличие бруксизма / парафункции жевательных мышц */
	bruxism: boolean;
	/** Назначена ли индивидуальная окклюзионная защитная каппа */
	nightGuardPrescribed: boolean;
	/** Пациент подтверждает регулярное ношение каппы */
	nightGuardUsed: boolean;
	/** Статус курения */
	smoking: "none" | "light" | "heavy";
	/** Сахарный диабет */
	diabetes: "none" | "compensated" | "decompensated";
	/** Патология прикуса / глубокий травматический прикус */
	malocclusion: boolean;
	/** Степень тяжести генерализованного пародонтита */
	periodontitis: "none" | "mild" | "moderate" | "severe";
	/** Нарушение графика визитов / низкая комплаентность в прошлом */
	poorCompliance?: boolean | undefined;
	/** Наличие остеопороза / прием бисфосфонатов (для имплантатов) */
	osteoporosis?: boolean | undefined;
}

export interface WarrantyItem {
	id: string;
	toothNumber: string;
	category: WarrantyCategory;
	clinicalWorkTitle: string;
	materialName: string;
	manufacturer: string;
	country: string;
	vitaShade?: string | undefined;
	lotNumber?: string | undefined;
	serviceCode804n?: string | undefined;
	labOrderNumber?: string | undefined;
	implantDiameterMm?: number | undefined;
	implantLengthMm?: number | undefined;
	baseWarrantyMonths: number;
	baseServiceLifeMonths: number;
	customWarrantyMonths?: number | undefined;
	customServiceLifeMonths?: number | undefined;
}

export interface AppliedRiskFactor {
	factor: string;
	multiplier: number;
	description: string;
	severity: "info" | "warning" | "danger";
}

export interface CheckupScheduleItem {
	index: number;
	dueDate: string;
	formattedDate: string;
	recommendedProcedures: string[];
	isMandatory: boolean;
}

export interface WarrantyCalculationResult {
	baseWarrantyMonths: number;
	baseServiceLifeMonths: number;
	adjustedWarrantyMonths: number;
	adjustedServiceLifeMonths: number;
	totalRiskMultiplier: number;
	riskLevel: "low" | "moderate" | "high" | "critical";
	warrantyStatus: "full" | "conditional" | "reduced" | "void_risk";
	checkupIntervalMonths: number;
	issueDate: string;
	warrantyExpirationDate: string;
	serviceLifeExpirationDate: string;
	nextCheckupDueDateDate?: string | undefined;
	nextCheckupDueDate: string;
	checkupSchedule: CheckupScheduleItem[];
	riskFactorsApplied: AppliedRiskFactor[];
	clinicalRationale: string[];
	specialProvisions: string[];
}

export interface WarrantyRemediationOrder {
	readonly id: string;
	readonly orderNumber: string; // e.g. "ГП-2026-1049" (Гарантийная Переделка)
	readonly certificateId: string; // Linked warranty passport serial
	readonly toothNumber: string; // Linked tooth (e.g. "1.6")
	readonly originalWorkTitle: string;
	readonly defectType: WarrantyDefectType;
	readonly defectTitle: string;
	readonly clinicalFinding: string;
	readonly remediationAction: string;
	readonly costToPatientRub: 0; // Strictly 0 ₽ (Mandate 8e: 1-click free warranty rework)
	readonly discountPercent: 100; // Strictly 100% discount
	readonly isFreeWarrantyService: true;
	readonly requiresMasterPassword: false; // Ironclad: no admin/chief passwords
	readonly warehouseDeductOnExecution: true; // Automatically deduct materials from warehouse
	readonly materialsDeducted: readonly WarrantyRemediationMaterialItem[];
	readonly doctorName: string;
	readonly doctorSpecialty?: string | undefined;
	readonly patientFullName: string;
	readonly patientCardNumber: string;
	readonly clinicName: string;
	readonly performedAtIso: string;
	readonly status: "completed" | "in_progress";
	readonly doctorNotes?: string | undefined;
	readonly integrityHash?: string | undefined;
}

export interface WarrantyCertificateData {
	certificateId: string;
	issueDate: string;
	patient: {
		fullName: string;
		birthDate?: string | undefined;
		cardNumber: string;
		phone?: string | undefined;
		snils?: string | undefined;
	};
	doctor: {
		fullName: string;
		specialty: string;
	};
	clinic: {
		name: string;
		legalName: string;
		licenseNumber: string;
		address: string;
		phone: string;
		website?: string | undefined;
	};
	items: WarrantyItem[];
	calculation: WarrantyCalculationResult;
	verificationUrl: string;
	qrCodeSvg: string;
	integrityHash: string;
	signedByDoctor: boolean;
	signedByChief: boolean;
	attachedToForm043u: boolean;
	remediations?: WarrantyRemediationOrder[] | undefined;
}

/**
 * Безопасное добавление месяцев к дате с учетом переходов через год и високосных лет
 */
export function addMonthsToDate(baseDateInput: string | Date, months: number): string {
	const base = typeof baseDateInput === "string" ? new Date(baseDateInput) : new Date(baseDateInput.getTime());
	if (Number.isNaN(base.getTime())) {
		const now = new Date();
		return now.toISOString().slice(0, 10);
	}

	const originalDay = base.getUTCDate();
	const targetMonth = base.getUTCMonth() + months;

	base.setUTCMonth(targetMonth);

	// Коррекция переполнения дней месяца (например 31 января + 1 мес -> 28 февраля)
	if (base.getUTCDate() < originalDay) {
		base.setUTCDate(0);
	}

	return base.toISOString().slice(0, 10);
}

/**
 * Форматирование ISO даты в русский текстовый формат (22 августа 2026 г.)
 */
export function formatRussianDate(isoDateString: string): string {
	if (!isoDateString) return "—";
	const parts = isoDateString.split("-");
	if (parts.length !== 3) return isoDateString;

	const year = parts[0];
	const monthNum = parseInt(parts[1] ?? "1", 10);
	const day = parseInt(parts[2] ?? "1", 10);

	const monthsGenitive = [
		"января", "февраля", "марта", "апреля", "мая", "июня",
		"июля", "августа", "сентября", "октября", "ноября", "декабря",
	];

	const monthName = monthsGenitive[monthNum - 1] ?? "";
	return `${day} ${monthName} ${year} г.`;
}

/**
 * Форматирование даты в краткий вид DD.MM.YYYY
 */
export function formatShortDate(isoDateString: string): string {
	if (!isoDateString) return "—";
	const parts = isoDateString.split("-");
	if (parts.length !== 3) return isoDateString;
	return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/**
 * Расчет индивидуальных гарантийных сроков и адаптации рисков
 */
export function calculateWarrantyTerms(input: {
	category: WarrantyCategory;
	baseWarrantyMonths?: number | undefined;
	baseServiceLifeMonths?: number | undefined;
	issueDate?: string | Date | undefined;
	riskFactors: WarrantyRiskFactors;
	teethCount?: number | undefined;
}): WarrantyCalculationResult {
	const preset = getWarrantyPreset(input.category);
	const baseWarranty = input.baseWarrantyMonths ?? preset.baseWarrantyMonths;
	const baseServiceLife = input.baseServiceLifeMonths ?? preset.baseServiceLifeMonths;

	const issueDateIso = input.issueDate
		? typeof input.issueDate === "string"
			? input.issueDate.slice(0, 10)
			: input.issueDate.toISOString().slice(0, 10)
		: new Date().toISOString().slice(0, 10);

	const rf = input.riskFactors;
	const appliedFactors: AppliedRiskFactor[] = [];
	const clinicalRationale: string[] = [];
	const specialProvisions: string[] = [];

	let totalMultiplier = 1.0;

	// 1. Корректировка по гигиеническому индексу Green-Vermillion (OHI-S)
	if (rf.hygieneScore <= 0.6) {
		// Отличная гигиена
		appliedFactors.push({
			factor: "Индекс OHI-S <= 0.6 (Отличная гигиена)",
			multiplier: 1.0,
			description: "Оптимальный уровень гигиены полости рта. Гарантия сохраняется в полном объеме.",
			severity: "info",
		});
		clinicalRationale.push("Отличный гигиенический статус полости рта благоприятствует долговечности реставраций.");
	} else if (rf.hygieneScore <= 1.2) {
		// Хорошая гигиена (базовая норма)
		appliedFactors.push({
			factor: "Индекс OHI-S 0.7–1.2 (Хорошая гигиена)",
			multiplier: 1.0,
			description: "Хороший уровень гигиены. Соответствует базовым нормам СтАР.",
			severity: "info",
		});
	} else if (rf.hygieneScore <= 1.8) {
		// Удовлетворительная гигиена (-15%)
		const m = 0.85;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Индекс OHI-S 1.3–1.8 (Удовлетворительная гигиена)",
			multiplier: m,
			description: "Умеренный налет. Повышенный риск краевой пигментации и гингивита (-15% к сроку).",
			severity: "warning",
		});
		clinicalRationale.push("Рекомендована профессиональная гигиена и подбор межзубных ершиков/ирригатора.");
	} else if (rf.hygieneScore <= 2.5) {
		// Неудовлетворительная гигиена (-35%)
		const m = 0.65;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Индекс OHI-S 1.9–2.5 (Неудовлетворительная гигиена)",
			multiplier: m,
			description: "Обильный мягкий налет и зубной камень. Высокий риск рецидива кариеса (-35% к сроку).",
			severity: "danger",
		});
		clinicalRationale.push("Неудовлетворительная гигиена существенно снижает срок службы композитов и повышает риск мукозита.");
		specialProvisions.push("Обязательный контрольный осмотр и профгигиена каждые 3 месяца.");
	} else {
		// Плохая гигиена (> 2.5) -> (-50% или условная гарантия)
		const m = 0.5;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Индекс OHI-S > 2.5 (Плохая / Критическая гигиена)",
			multiplier: m,
			description: "Критический уровень зубных отложений. Гарантия переводится в условный статус (-50%).",
			severity: "danger",
		});
		clinicalRationale.push("При сохранении критического уровня налета клиника не может гарантировать сохранение краевого прилегания.");
		specialProvisions.push("Условная гарантия: сохраняется только при подтвержденной нормализации гигиены на контрольных осмотрах.");
	}

	// 2. Корректировка по бруксизму и парафункциям жевательных мышц
	if (rf.bruxism) {
		if (rf.nightGuardUsed) {
			const m = 0.9;
			totalMultiplier *= m;
			appliedFactors.push({
				factor: "Бруксизм (с регулярным ношением ночной каппы)",
				multiplier: m,
				description: "Гипертонус мышц компенсируется разгрузочной каппой. Риск сколов минимизирован (-10%).",
				severity: "info",
			});
			clinicalRationale.push("Пациент дисциплинированно применяет защитную каппу, снижая окклюзионную перегрузку.");
		} else {
			const m = input.category === "implant_fixture" || input.category === "removable_prosthesis" ? 0.75 : 0.6;
			totalMultiplier *= m;
			appliedFactors.push({
				factor: "Бруксизм (без защитной ночной каппы)",
				multiplier: m,
				description: "Критическая ночная перегрузка конструкций. Высокий риск сколов керамики и пломб (-40%).",
				severity: "danger",
			});
			clinicalRationale.push("Высокая окклюзионная нагрузка при бруксизме без каппы ведет к усталостным сколам керамики и пломб.");
			specialProvisions.push("Настоятельно предписано изготовление и ношение окклюзионного сплинт-аппарата.");
		}
	}

	// 3. Корректировка по статусу курения
	if (rf.smoking === "light") {
		const m = input.category === "implant_fixture" || input.category === "periodontal_splinting" ? 0.85 : 0.95;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Курение табака (до 10 сигарет в день)",
			multiplier: m,
			description: "Умеренная вазоконстрикция слизистой оболочки и ускоренное образование пигментированного налета.",
			severity: "warning",
		});
	} else if (rf.smoking === "heavy") {
		const m = input.category === "implant_fixture" ? 0.65 : 0.8;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Интенсивное курение (> 10 сигарет в день)",
			multiplier: m,
			description: "Выраженная гипоксия тканей пародонта и периимплантатной зоны. Риск периимплантита (-35%).",
			severity: "danger",
		});
		clinicalRationale.push("Интенсивное курение в 2.5 раза увеличивает риск резорбции краевой кости вокруг имплантатов.");
		specialProvisions.push("Рекомендовано сокращение курения в ранний постоперационный период остеоинтеграции.");
	}

	// 4. Корректировка по сахарному диабету
	if (rf.diabetes === "compensated") {
		const m = 0.9;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Сахарный диабет (компенсированный, HbA1c < 7.0%)",
			multiplier: m,
			description: "Удовлетворительный метаболический контроль. Незначительное замедление регенерации (-10%).",
			severity: "info",
		});
	} else if (rf.diabetes === "decompensated") {
		const m = input.category === "implant_fixture" || input.category === "periodontal_splinting" ? 0.5 : 0.7;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Сахарный диабет (декомпенсированный / субкомпенсированный)",
			multiplier: m,
			description: "Микроангиопатия и снижение иммунного ответа. Критический фактор риска для остеоинтеграции (-50%).",
			severity: "danger",
		});
		clinicalRationale.push("Декомпенсированный диабет нарушает микроциркуляцию и остеогенез.");
		specialProvisions.push("Обязателен эндокринологический контроль и регулярная сдача гликированного гемоглобина (HbA1c).");
	}

	// 5. Корректировка по патологии прикуса (малокклюзии)
	if (rf.malocclusion && input.category !== "orthodontic_aligners") {
		const m = 0.85;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Патология прикуса / травматическая окклюзия",
			multiplier: m,
			description: "Аномальное распределение жевательного давления на отдельные зубы (-15%).",
			severity: "warning",
		});
		clinicalRationale.push("Неправильный прикус создает зоны точечной гипернагрузки на реставрации и коронки.");
	}

	// 6. Корректировка по пародонтиту
	if (rf.periodontitis === "mild") {
		const m = 0.95;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Хронический пародонтит легкой степени",
			multiplier: m,
			description: "Начальная резорбция кости до 1/3 длины корня. Требуется контроль глубины зубодесневых карманов.",
			severity: "info",
		});
	} else if (rf.periodontitis === "moderate") {
		const m = 0.8;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Хронический генерализованный пародонтит средней степени",
			multiplier: m,
			description: "Резорбция костной ткани до 1/2 длины корня, подвижность зубов 1-2 степени (-20%).",
			severity: "warning",
		});
		clinicalRationale.push("Пародонтит требует сокращения интервала между профилактическими чистками до 3–4 месяцев.");
	} else if (rf.periodontitis === "severe") {
		const m = 0.55;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Хронический генерализованный пародонтит тяжелой степени",
			multiplier: m,
			description: "Выраженная подвижность зубов и деструкция кости > 1/2. Высокий риск потери зубов (-45%).",
			severity: "danger",
		});
		clinicalRationale.push("Тяжелый пародонтит переводит гарантию на ортопедию и пломбы в разряд условной.");
		specialProvisions.push("Обязательное поддерживающее пародонтологическое лечение раз в 3 месяца.");
	}

	// 7. Остеопороз (для имплантатов)
	if (rf.osteoporosis && input.category === "implant_fixture") {
		const m = 0.75;
		totalMultiplier *= m;
		appliedFactors.push({
			factor: "Системный остеопороз / прием антирезорбтивных препаратов",
			multiplier: m,
			description: "Снижение плотности трабекулярной кости и замедление остеоинтеграции (-25%).",
			severity: "warning",
		});
	}

	// Ограничение диапазона итогового коэффициента
	const clampedMultiplier = Math.max(0.25, Math.min(1.2, totalMultiplier));
	const roundedMultiplier = Math.round(clampedMultiplier * 100) / 100;

	// Расчет скорректированного гарантийного срока (с ограничением минимального законного предела)
	const rawAdjustedWarranty = Math.round(baseWarranty * roundedMultiplier);
	const adjustedWarrantyMonths = Math.max(preset.minWarrantyMonths, Math.min(preset.maxWarrantyMonths, rawAdjustedWarranty));

	// Расчет скорректированного срока службы
	const rawAdjustedServiceLife = Math.round(baseServiceLife * Math.max(0.35, Math.min(1.25, roundedMultiplier * 1.05)));
	const adjustedServiceLifeMonths = Math.max(
		preset.minServiceLifeMonths,
		Math.min(preset.maxServiceLifeMonths, rawAdjustedServiceLife),
	);

	// Определение уровня риска
	let riskLevel: "low" | "moderate" | "high" | "critical" = "low";
	let warrantyStatus: "full" | "conditional" | "reduced" | "void_risk" = "full";

	if (roundedMultiplier >= 0.95) {
		riskLevel = "low";
		warrantyStatus = "full";
	} else if (roundedMultiplier >= 0.75) {
		riskLevel = "moderate";
		warrantyStatus = "full";
	} else if (roundedMultiplier >= 0.5) {
		riskLevel = "high";
		warrantyStatus = "reduced";
	} else {
		riskLevel = "critical";
		warrantyStatus = "conditional";
	}

	// Определение периодичности контрольных осмотров
	let checkupIntervalMonths = preset.standardCheckupIntervalMonths;
	if (riskLevel === "critical" || rf.periodontitis === "severe" || rf.smoking === "heavy") {
		checkupIntervalMonths = 3;
	} else if (riskLevel === "high" || rf.periodontitis === "moderate" || rf.hygieneScore > 1.8) {
		checkupIntervalMonths = 4;
	} else {
		checkupIntervalMonths = preset.standardCheckupIntervalMonths;
	}

	// Расчет контрольных дат
	const warrantyExpirationDate = addMonthsToDate(issueDateIso, adjustedWarrantyMonths);
	const serviceLifeExpirationDate = addMonthsToDate(issueDateIso, adjustedServiceLifeMonths);
	const nextCheckupDueDate = addMonthsToDate(issueDateIso, checkupIntervalMonths);

	// Формирование графика контрольных осмотров на весь гарантийный период
	const checkupSchedule: CheckupScheduleItem[] = [];
	const totalCheckupsCount = Math.max(1, Math.floor(adjustedWarrantyMonths / checkupIntervalMonths));

	for (let i = 1; i <= Math.min(12, totalCheckupsCount + 1); i++) {
		const dueDate = addMonthsToDate(issueDateIso, i * checkupIntervalMonths);
		checkupSchedule.push({
			index: i,
			dueDate,
			formattedDate: formatShortDate(dueDate),
			recommendedProcedures: [
				"Контрольный осмотр и окклюзионный контроль",
				"Оценка краевого прилегания и целостности конструкций",
				"Профессиональная ультразвуковая чистка и AirFlow",
				"Определение гигиенического индекса OHI-S",
			],
			isMandatory: true,
		});
	}

	return {
		baseWarrantyMonths: baseWarranty,
		baseServiceLifeMonths: baseServiceLife,
		adjustedWarrantyMonths,
		adjustedServiceLifeMonths,
		totalRiskMultiplier: roundedMultiplier,
		riskLevel,
		warrantyStatus,
		checkupIntervalMonths,
		issueDate: issueDateIso,
		warrantyExpirationDate,
		serviceLifeExpirationDate,
		nextCheckupDueDate,
		checkupSchedule,
		riskFactorsApplied: appliedFactors,
		clinicalRationale,
		specialProvisions,
	};
}

/**
 * Расчет гарантийных сроков для сводного набора позиций паспорта
 */
export function calculateMultiItemWarrantyTerms(
	items: WarrantyItem[],
	riskFactors: WarrantyRiskFactors,
	issueDateInput?: string | Date,
): WarrantyCalculationResult {
	if (items.length === 0) {
		return calculateWarrantyTerms({
			category: "composite_restoration",
			riskFactors,
			issueDate: issueDateInput,
		});
	}

	// Если есть импланты или коронки, они определяют базовый интервал осмотра
	let primaryCategory: WarrantyCategory = items[0]?.category ?? "composite_restoration";
	const hasImplants = items.some((it) => it.category === "implant_fixture");
	const hasCeramics = items.some((it) => it.category === "ceramic_crown_veneer");
	const hasOrtho = items.some((it) => it.category === "orthodontic_aligners");

	if (hasImplants) {
		primaryCategory = "implant_fixture";
	} else if (hasCeramics) {
		primaryCategory = "ceramic_crown_veneer";
	} else if (hasOrtho) {
		primaryCategory = "orthodontic_aligners";
	}

	return calculateWarrantyTerms({
		category: primaryCategory,
		riskFactors,
		issueDate: issueDateInput,
		teethCount: items.length,
	});
}

let certificateSequenceCounter = 0;

/**
 * Генерация уникального детерминированного серийного номера гарантийного паспорта
 * Формат: WAR-ГГГГ-NNNNN
 */
export function generateCertificateId(prefix = "WAR", seqNumber?: number | string | null | undefined): string {
	const year = new Date().getFullYear();
	let seqStr: string;
	if (seqNumber !== undefined && seqNumber !== null && String(seqNumber).trim() !== "") {
		const numOnly = String(seqNumber).replace(/\D/g, "");
		seqStr = (numOnly || "1").padStart(5, "0").slice(-5);
	} else {
		certificateSequenceCounter = (certificateSequenceCounter + 1) % 100000;
		if (certificateSequenceCounter === 0) certificateSequenceCounter = 1;
		seqStr = String(certificateSequenceCounter).padStart(5, "0");
	}
	return `${prefix}-${year}-${seqStr}`;
}

/**
 * Генерация криптографически надежного RFC 9562 UUIDv7
 * (48-битный timestamp в миллисекундах + версия 7 + вариант 10 + криптографическая энтропия)
 */
export function generateUuidV7(): string {
	const now = Date.now();
	const bytes = new Uint8Array(16);
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < 16; i++) {
			bytes[i] = ((now >> (i * 2)) ^ (i * 37)) & 0xff;
		}
	}

	// 48-bit timestamp
	bytes[0] = (now / 0x10000000000) & 0xff;
	bytes[1] = (now / 0x100000000) & 0xff;
	bytes[2] = (now / 0x1000000) & 0xff;
	bytes[3] = (now / 0x10000) & 0xff;
	bytes[4] = (now / 0x100) & 0xff;
	bytes[5] = now & 0xff;

	// Version 7: 0b0111xxxx
	bytes[6] = (bytes[6]! & 0x0f) | 0x70;
	// Variant: 0b10xxxxxx
	bytes[8] = (bytes[8]! & 0x3f) | 0x80;

	let hex = "";
	for (let i = 0; i < 16; i++) {
		hex += bytes[i]!.toString(16).padStart(2, "0");
	}
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * ============================================================================
 * КРИПТОГРАФИЧЕСКИЙ ХЕШ SHA-256 И ВЕКТОРНЫЙ QR-КОД ISO/IEC 18004
 * Каноническая криптография и валидный сканируемый QR-код из @dental/shared
 * ============================================================================
 */
export { generateQrCodeSvg, sha256Hex };

/**
 * Алиас для криптографического SHA-256 хеширования гарантийных бланков и актов
 */
export function generateSha256(inputString: string): string {
	return sha256Hex(inputString);
}

/**
 * Re-export HTML generators from dedicated module
 */
export {
	generateWarrantyCertificateHtml,
	generateWarrantyRemediationActHtml,
} from "./warrantyCertificateHtml.js";

/**
 * ============================================================================
 * ГЕНЕРАЦИЯ ОФИЦИАЛЬНОЙ ПАМЯТКИ ПАЦИЕНТА ДЛЯ WHATSAPP И TELEGRAM (МАНДАТ 8k)
 * Без мультяшных эмодзи, официальный медицинский текст со всеми условиями
 * ============================================================================
 */
export function generateWarrantyPatientMemo(data: WarrantyCertificateData): string {
	const { patient, clinic, doctor, items, calculation, certificateId, issueDate, verificationUrl } = data;

	const itemsSummary = items
		.map((it) => {
			const months = it.customWarrantyMonths ?? calculation.adjustedWarrantyMonths;
			const expDate = addMonthsToDate(issueDate, months);
			return `• Зуб ${it.toothNumber}: ${it.clinicalWorkTitle} (${it.materialName}) — гарантия ${months} мес. (до ${formatShortDate(expDate)})`;
		})
		.join("\n");

	const serviceLifeYears = (calculation.adjustedServiceLifeMonths / 12).toFixed(1);

	return [
		`ГАРАНТИЙНЫЙ ПАСПОРТ СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ`,
		`Клиника: ${clinic.name}`,
		`Телефон: ${clinic.phone}`,
		`Пациент: ${patient.fullName} (карта № ${patient.cardNumber})`,
		`Лечащий врач: ${doctor.fullName}`,
		`Сертификат: № ${certificateId} от ${formatRussianDate(issueDate)}`,
		``,
		`ВЫПОЛНЕННЫЕ РАБОТЫ И ГАРАНТИЙНЫЕ ОБЯЗАТЕЛЬСТВА:`,
		itemsSummary,
		``,
		`Срок службы конструкций: ${calculation.adjustedServiceLifeMonths} мес. (${serviceLifeYears} г.)`,
		`Следующий обязательный контрольный осмотр (0 ₽): ${formatRussianDate(calculation.nextCheckupDueDate)}`,
		``,
		`ОСНОВНЫЕ УСЛОВИЯ СОХРАНЕНИЯ ГАРАНТИИ (СтАР & Закон РФ № 2300-1):`,
		`1. Плановый контрольный осмотр и профгигиена не реже 1 раза в ${calculation.checkupIntervalMonths} мес.`,
		`2. Соблюдение индивидуальной гигиены полости рта (индекс OHI-S <= 1.2).`,
		`3. Запрет на самостоятельную коррекцию и несогласованное лечение у сторонних врачей.`,
		`4. Обращение в клинику при любом дискомфорте или сколе в течение 3–5 рабочих дней.`,
		``,
		`Проверить статус гарантии онлайн:`,
		verificationUrl,
		``,
		`Контрольный хеш ЭЦП: ${data.integrityHash.slice(0, 16)}...`,
	].join("\n");
}

/**
 * ============================================================================
 * 1-КЛИК ОФОРМЛЕНИЕ ГАРАНТИЙНОГО УСТРАНЕНИЯ ДЕФЕКТА (0 ₽)
 * Положение СтАР, Закон РФ № 2300-1 (ст. 29) и Мандат 8e (Свобода врача)
 * ============================================================================
 */
let remediationOrderCounter = 0;

/**
 * Генерация регламентного номера наряда на гарантийную переделку/рекламацию
 * Формат: ГП-ГГГГ-NNNN
 */
export function generateRemediationOrderNumber(year = new Date().getFullYear(), seq?: number | string | null | undefined): string {
	let seqStr: string;
	if (seq !== undefined && seq !== null && String(seq).trim() !== "") {
		const numOnly = String(seq).replace(/\D/g, "");
		seqStr = (numOnly || "1").padStart(4, "0").slice(-4);
	} else {
		remediationOrderCounter = (remediationOrderCounter + 1) % 10000;
		if (remediationOrderCounter === 0) remediationOrderCounter = 1;
		seqStr = String(remediationOrderCounter).padStart(4, "0");
	}
	return `ГП-${year}-${seqStr}`;
}

export function createWarrantyRemediationOrder(params: {
	certificateId: string;
	toothNumber: string;
	originalWorkTitle?: string | undefined;
	defectType: WarrantyDefectType;
	doctorName: string;
	doctorSpecialty?: string | undefined;
	patientFullName: string;
	patientCardNumber: string;
	clinicName?: string | undefined;
	customFinding?: string | undefined;
	customAction?: string | undefined;
	materials?: WarrantyRemediationMaterialItem[] | undefined;
	notes?: string | undefined;
}): WarrantyRemediationOrder {
	const template = getWarrantyDefectTemplate(params.defectType);
	const id = `remed_${generateUuidV7()}`;
	const year = new Date().getFullYear();
	const orderNumber = generateRemediationOrderNumber(year);
	const performedAtIso = new Date().toISOString();

	const clinicalFinding = params.customFinding?.trim() || template.clinicalDescription;
	const remediationAction = params.customAction?.trim() || template.recommendedAction;
	const materialsDeducted =
		params.materials && params.materials.length > 0 ? params.materials : template.defaultMaterials;

	const rawDataForHash = `${orderNumber}|${params.certificateId}|${params.toothNumber}|${params.defectType}|${remediationAction}|0|100|${performedAtIso}`;
	const integrityHash = generateSha256(rawDataForHash);

	return {
		id,
		orderNumber,
		certificateId: params.certificateId,
		toothNumber: params.toothNumber,
		originalWorkTitle: params.originalWorkTitle || "Ранее выполненная реставрация / конструкция",
		defectType: params.defectType,
		defectTitle: template.title,
		clinicalFinding,
		remediationAction,
		costToPatientRub: 0,
		discountPercent: 100,
		isFreeWarrantyService: true,
		requiresMasterPassword: false,
		warehouseDeductOnExecution: true,
		materialsDeducted,
		doctorName: params.doctorName,
		doctorSpecialty: params.doctorSpecialty,
		patientFullName: params.patientFullName,
		patientCardNumber: params.patientCardNumber,
		clinicName: params.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
		performedAtIso,
		status: "completed",
		doctorNotes: params.notes,
		integrityHash,
	};
}
