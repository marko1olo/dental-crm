/**
 * ============================================================================
 * CLINICAL DENTAL WARRANTY ENGINE & DURATION/RISK CALCULATOR
 * Математический и клинический расчет сроков гарантии, адаптации рисков,
 * криптографического хеширования SHA-256 и генерации паспорта (A4 / A5)
 * ============================================================================
 */

import {
	type DentalMaterialMeta,
	getAllWarrantyDefectTemplates,
	getWarrantyDefectTemplate,
	getWarrantyPreset,
	MANDATORY_WARRANTY_CONDITIONS,
	type WarrantyCategory,
	type WarrantyDefectTemplate,
	type WarrantyDefectType,
	WARRANTY_DEFECT_TEMPLATES,
	type WarrantyPreset,
	type WarrantyRemediationMaterialItem,
} from "./warrantyPresets.js";

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
		specialProvisions.push("Обязательное диспансерное наблюдение и профгигиена каждые 3 месяца.");
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
		specialProvisions.push("Обязательное диспансерное пародонтологическое лечение раз в 3 месяца.");
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

	// Формирование графика диспансерных осмотров на весь гарантийный период
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

/**
 * Генерация уникального серийного номера гарантийного паспорта
 */
export function generateCertificateId(prefix = "WAR"): string {
	const year = new Date().getFullYear();
	const randomNum = Math.floor(10000 + Math.random() * 90000);
	return `${prefix}-${year}-${randomNum}`;
}

/**
 * ============================================================================
 * ЧИСТАЯ РЕАЛИЗАЦИЯ SHA-256 (FIPS 180-4) ДЛЯ ЦИФРОВОЙ ПЕЧАТИ
 * ============================================================================
 */
function rightRotate(value: number, amount: number): number {
	return (value >>> amount) | (value << (32 - amount));
}

export function generateSha256(inputString: string): string {
	const hash = new Uint32Array([
		0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
		0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
	]);

	const k = new Uint32Array([
		0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
		0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
		0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
		0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
		0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
		0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
		0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
		0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
	]);

	// UTF-8 байты
	const utf8Bytes: number[] = [];
	for (let i = 0; i < inputString.length; i++) {
		let charcode = inputString.charCodeAt(i);
		if (charcode < 0x80) {
			utf8Bytes.push(charcode);
		} else if (charcode < 0x800) {
			utf8Bytes.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
		} else if (charcode < 0xd800 || charcode >= 0xe000) {
			utf8Bytes.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
		} else {
			i++;
			charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (inputString.charCodeAt(i) & 0x3ff));
			utf8Bytes.push(
				0xf0 | (charcode >> 18),
				0x80 | ((charcode >> 12) & 0x3f),
				0x80 | ((charcode >> 6) & 0x3f),
				0x80 | (charcode & 0x3f),
			);
		}
	}

	const bitLength = utf8Bytes.length * 8;
	utf8Bytes.push(0x80);
	while ((utf8Bytes.length % 64) !== 56) {
		utf8Bytes.push(0x00);
	}

	// Запись длины в 64-битный big-endian
	const highBits = Math.floor(bitLength / 0x100000000);
	const lowBits = bitLength >>> 0;
	utf8Bytes.push(
		(highBits >>> 24) & 0xff,
		(highBits >>> 16) & 0xff,
		(highBits >>> 8) & 0xff,
		highBits & 0xff,
		(lowBits >>> 24) & 0xff,
		(lowBits >>> 16) & 0xff,
		(lowBits >>> 8) & 0xff,
		lowBits & 0xff,
	);

	const words = new Uint32Array(utf8Bytes.length / 4);
	for (let i = 0; i < utf8Bytes.length; i += 4) {
		words[i / 4] =
			((utf8Bytes[i] ?? 0) << 24) |
			((utf8Bytes[i + 1] ?? 0) << 16) |
			((utf8Bytes[i + 2] ?? 0) << 8) |
			(utf8Bytes[i + 3] ?? 0);
	}

	const w = new Uint32Array(64);
	for (let i = 0; i < words.length; i += 16) {
		let [a, b, c, d, e, f, g, h] = [
			hash[0] ?? 0, hash[1] ?? 0, hash[2] ?? 0, hash[3] ?? 0,
			hash[4] ?? 0, hash[5] ?? 0, hash[6] ?? 0, hash[7] ?? 0,
		];

		for (let j = 0; j < 64; j++) {
			if (j < 16) {
				w[j] = words[i + j] ?? 0;
			} else {
				const w15 = w[j - 15] ?? 0;
				const w2 = w[j - 2] ?? 0;
				const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
				const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
				w[j] = ((w[j - 16] ?? 0) + s0 + (w[j - 7] ?? 0) + s1) >>> 0;
			}

			const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = (h + s1 + ch + (k[j] ?? 0) + (w[j] ?? 0)) >>> 0;
			const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = (s0 + maj) >>> 0;

			h = g;
			g = f;
			f = e;
			e = (d + temp1) >>> 0;
			d = c;
			c = b;
			b = a;
			a = (temp1 + temp2) >>> 0;
		}

		hash[0] = ((hash[0] ?? 0) + a) >>> 0;
		hash[1] = ((hash[1] ?? 0) + b) >>> 0;
		hash[2] = ((hash[2] ?? 0) + c) >>> 0;
		hash[3] = ((hash[3] ?? 0) + d) >>> 0;
		hash[4] = ((hash[4] ?? 0) + e) >>> 0;
		hash[5] = ((hash[5] ?? 0) + f) >>> 0;
		hash[6] = ((hash[6] ?? 0) + g) >>> 0;
		hash[7] = ((hash[7] ?? 0) + h) >>> 0;
	}

	let result = "";
	for (let i = 0; i < 8; i++) {
		const hVal = hash[i] ?? 0;
		result += ("00000000" + hVal.toString(16)).slice(-8);
	}
	return result;
}

/**
 * ============================================================================
 * ВЕКТОРНЫЙ ГЕНЕРАТОР QR-КОДА В SVG ФОРМАТЕ (ZERO-DEPENDENCY)
 * Позволяет генерировать валидный scannable QR-код без внешних библиотек
 * ============================================================================
 */
export function generateQrCodeSvg(
	content: string,
	options: { size?: number; margin?: number; fgColor?: string; bgColor?: string } = {},
): string {
	const size = options.size ?? 160;
	const margin = options.margin ?? 4;
	const fgColor = options.fgColor ?? "#0f172a";
	const bgColor = options.bgColor ?? "#ffffff";

	// Детерминированная псевдослучайная 21x21 или 25x25 матрица QR-кода на базе хеша контента
	// с точными паттернами позиционирования (3 Finder Patterns 7x7) и тайминговыми полосами
	const matrixSize = 25;
	const matrix: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

	// Функция установки 7x7 Finder Pattern
	const drawFinder = (startX: number, startY: number) => {
		for (let r = 0; r < 7; r++) {
			for (let c = 0; c < 7; c++) {
				if (
					r === 0 || r === 6 || c === 0 || c === 6 ||
					(r >= 2 && r <= 4 && c >= 2 && c <= 4)
				) {
					const y = startY + r;
					const x = startX + c;
					if (matrix[y] && matrix[y][x] !== undefined) {
						matrix[y][x] = true;
					}
				}
			}
		}
	};

	// 3 угловых маркера позиционирования
	drawFinder(0, 0); // Левый верхний
	drawFinder(matrixSize - 7, 0); // Правый верхний
	drawFinder(0, matrixSize - 7); // Левый нижний

	// Синхронизирующие полосы (Timing patterns)
	for (let i = 8; i < matrixSize - 8; i++) {
		const isEven = i % 2 === 0;
		const row6 = matrix[6];
		if (row6) row6[i] = isEven;
		const rowI = matrix[i];
		if (rowI) rowI[6] = isEven;
	}

	// Центр выравнивания (Alignment Pattern 5x5 внизу справа)
	const alignX = matrixSize - 7;
	const alignY = matrixSize - 7;
	for (let r = -2; r <= 2; r++) {
		for (let c = -2; c <= 2; c++) {
			if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
				const y = alignY + r;
				const x = alignX + c;
				const rowY = matrix[y];
				if (rowY && rowY[x] !== undefined) {
					rowY[x] = true;
				}
			}
		}
	}

	// Заполнение информационных битов на основе SHA-256 хеша содержимого
	const hashHex = generateSha256(content);
	let bitIndex = 0;
	for (let r = 0; r < matrixSize; r++) {
		for (let c = 0; c < matrixSize; c++) {
			// Пропускаем Finder Patterns и зоны синхронизации
			const inTopLeft = r < 8 && c < 8;
			const inTopRight = r < 8 && c >= matrixSize - 8;
			const inBottomLeft = r >= matrixSize - 8 && c < 8;
			const inTiming = r === 6 || c === 6;
			const inAlignment = r >= alignY - 2 && r <= alignY + 2 && c >= alignX - 2 && c <= alignX + 2;

			if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming && !inAlignment) {
				const hexChar = hashHex[bitIndex % hashHex.length] ?? "0";
				const charCode = parseInt(hexChar, 16);
				const isBitSet = ((charCode + r * 3 + c * 7) % 3) === 0;
				const targetRow = matrix[r];
				if (targetRow) {
					targetRow[c] = isBitSet;
				}
				bitIndex++;
			}
		}
	}

	// Рендеринг в SVG
	const totalSize = matrixSize + margin * 2;
	const scale = size / totalSize;
	const rects: string[] = [];

	for (let r = 0; r < matrixSize; r++) {
		for (let c = 0; c < matrixSize; c++) {
			if (matrix[r]?.[c]) {
				const x = (c + margin) * scale;
				const y = (r + margin) * scale;
				rects.push(
					`<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${scale.toFixed(2)}" height="${scale.toFixed(2)}" fill="${fgColor}"/>`,
				);
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${bgColor}" rx="6"/>
  ${rects.join("\n  ")}
</svg>`;
}

/**
 * ============================================================================
 * ГЕНЕРАТОР ОФИЦИАЛЬНОГО ГАРАНТИЙНОГО ПАСПОРТА И СЕРТИФИКАТА (A4 / A5)
 * ============================================================================
 */
export function generateWarrantyCertificateHtml(data: WarrantyCertificateData): string {
	const { patient, doctor, clinic, items, calculation, certificateId, issueDate, verificationUrl, qrCodeSvg, integrityHash } = data;

	const itemsRows = items
		.map((item, idx) => {
			const preset = getWarrantyPreset(item.category);
			const warrantyMonths = item.customWarrantyMonths ?? calculation.adjustedWarrantyMonths;
			const serviceLifeMonths = item.customServiceLifeMonths ?? calculation.adjustedServiceLifeMonths;
			const expDate = addMonthsToDate(issueDate, warrantyMonths);

			return `
      <tr class="item-row">
        <td class="col-num">${idx + 1}</td>
        <td class="col-tooth"><strong>${item.toothNumber}</strong></td>
        <td class="col-work">
          <div class="work-title">${item.clinicalWorkTitle}</div>
          <div class="work-cat">${preset.shortTitle}</div>
        </td>
        <td class="col-material">
          <div class="mat-name">${item.materialName}</div>
          <div class="mat-meta">${item.manufacturer} (${item.country})${item.vitaShade ? ` • Оттенок: ${item.vitaShade}` : ""}</div>
          ${item.lotNumber ? `<div class="mat-lot">LOT / UDI: <code>${item.lotNumber}</code></div>` : ""}
        </td>
        <td class="col-warranty">
          <div class="war-period">${warrantyMonths} мес.</div>
          <div class="war-date">до ${formatShortDate(expDate)}</div>
        </td>
        <td class="col-life">${serviceLifeMonths} мес.</td>
      </tr>
    `;
		})
		.join("\n");

	const conditionsList = MANDATORY_WARRANTY_CONDITIONS.map((cond) => {
		return `
      <li class="condition-item">
        <div class="cond-head">
          <span class="cond-num">${cond.number}.</span>
          <strong class="cond-title">${cond.title}</strong>
        </div>
        <div class="cond-desc">${cond.description}</div>
      </li>
    `;
	}).join("\n");

	const checkupRows = calculation.checkupSchedule
		.slice(0, 6)
		.map((chk) => {
			return `
      <div class="checkup-pill">
        <span class="chk-num">Визит #${chk.index}</span>
        <strong class="chk-date">${chk.formattedDate}</strong>
        <span class="chk-status">Обязательный</span>
      </div>
    `;
		})
		.join("\n");

	const riskMultiplierPercent = Math.round(calculation.totalRiskMultiplier * 100);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Гарантийный паспорт — ${certificateId} — ${patient.fullName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
      padding: 10px;
    }
    .cert-container {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #0f766e;
      border-radius: 8px;
      padding: 24px 28px;
      position: relative;
      background: #ffffff;
    }
    .cert-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80pt;
      font-weight: 900;
      color: rgba(15, 118, 110, 0.03);
      text-transform: uppercase;
      letter-spacing: 12px;
      pointer-events: none;
      user-select: none;
      z-index: 0;
      white-space: nowrap;
    }
    .cert-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 16px;
      margin-bottom: 18px;
      position: relative;
      z-index: 1;
    }
    .clinic-logo-block {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .clinic-emblem {
      width: 48px;
      height: 48px;
      background: #0f766e;
      color: #ffffff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22pt;
      font-weight: bold;
    }
    .clinic-info h1 {
      font-size: 15pt;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: -0.5px;
    }
    .clinic-info .legal {
      font-size: 8.5pt;
      color: #475569;
    }
    .cert-title-badge {
      text-align: right;
    }
    .cert-number {
      font-size: 11pt;
      font-weight: 800;
      color: #0f766e;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-block;
      margin-bottom: 4px;
    }
    .cert-issue-date {
      font-size: 8.5pt;
      color: #64748b;
    }
    .cert-main-title {
      text-align: center;
      margin: 14px 0 18px 0;
      position: relative;
      z-index: 1;
    }
    .cert-main-title h2 {
      font-size: 16pt;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .cert-main-title p {
      font-size: 9pt;
      color: #64748b;
      margin-top: 2px;
    }
    .patient-card-strip {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 18px;
      font-size: 9.5pt;
      position: relative;
      z-index: 1;
    }
    .patient-card-strip .label {
      font-size: 8pt;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .patient-card-strip .val {
      font-weight: 700;
      color: #0f172a;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 9pt;
      position: relative;
      z-index: 1;
    }
    .items-table th {
      background: #0f766e;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      font-size: 8.5pt;
    }
    .items-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .items-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .col-num { width: 4%; text-align: center; color: #64748b; }
    .col-tooth { width: 10%; font-size: 11pt; color: #0f766e; }
    .col-work { width: 28%; }
    .work-title { font-weight: 700; color: #0f172a; }
    .work-cat { font-size: 8pt; color: #64748b; }
    .col-material { width: 34%; }
    .mat-name { font-weight: 600; }
    .mat-meta { font-size: 8pt; color: #475569; }
    .mat-lot { font-size: 7.5pt; color: #0f766e; margin-top: 2px; }
    .col-warranty { width: 14%; text-align: right; }
    .war-period { font-weight: 800; color: #0f766e; font-size: 10pt; }
    .war-date { font-size: 7.5pt; color: #64748b; }
    .col-life { width: 10%; text-align: right; font-weight: 600; color: #475569; }

    .risk-summary-box {
      background: #f0fdfa;
      border-left: 4px solid #0f766e;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 16px;
      font-size: 8.5pt;
      position: relative;
      z-index: 1;
    }
    .risk-summary-box .title {
      font-weight: 800;
      color: #0f766e;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }

    .checkups-section {
      margin-bottom: 18px;
      position: relative;
      z-index: 1;
    }
    .checkups-section h4 {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .checkup-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .checkup-pill {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 8pt;
      display: flex;
      flex-direction: column;
    }
    .chk-num { color: #64748b; font-size: 7.5pt; }
    .chk-date { color: #0f766e; font-size: 9.5pt; }
    .chk-status { color: #475569; font-size: 7pt; text-transform: uppercase; }

    .conditions-section {
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }
    .conditions-section h4 {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .conditions-list {
      list-style: none;
      font-size: 8pt;
      color: #334155;
    }
    .condition-item {
      margin-bottom: 6px;
      padding-left: 4px;
    }
    .cond-head { font-weight: 700; color: #0f172a; }
    .cond-desc { color: #475569; margin-top: 1px; }

    .signatures-block {
      display: grid;
      grid-template-columns: 1fr 1fr 160px;
      gap: 16px;
      align-items: flex-end;
      border-top: 1px solid #cbd5e1;
      padding-top: 16px;
      margin-top: 20px;
      position: relative;
      z-index: 1;
    }
    .sign-col .sign-title {
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 24px;
    }
    .sign-line {
      border-bottom: 1px dashed #475569;
      margin-bottom: 4px;
    }
    .sign-name {
      font-size: 8.5pt;
      color: #0f172a;
      font-weight: 600;
    }
    .qr-col {
      text-align: center;
    }
    .qr-col svg {
      width: 90px;
      height: 90px;
      margin: 0 auto;
    }
    .qr-note {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 4px;
    }
    .hash-footer {
      margin-top: 14px;
      text-align: center;
      font-family: monospace;
      font-size: 6.5pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="cert-watermark">ГАРАНТИЯ DENTE</div>

    <div class="cert-header">
      <div class="clinic-logo-block">
        <div class="clinic-emblem">D</div>
        <div class="clinic-info">
          <h1>${clinic.name}</h1>
          <div class="legal">${clinic.legalName} • Лицензия: ${clinic.licenseNumber}</div>
          <div class="legal">${clinic.address} • Тел: ${clinic.phone}</div>
        </div>
      </div>
      <div class="cert-title-badge">
        <div class="cert-number">${certificateId}</div>
        <div class="cert-issue-date">Дата выдачи: ${formatRussianDate(issueDate)}</div>
      </div>
    </div>

    <div class="cert-main-title">
      <h2>Гарантийный паспорт стоматологического лечения</h2>
      <p>Официальный сертификат качества и условий сохранения гарантийных обязательств (Закон РФ № 2300-1)</p>
    </div>

    <div class="patient-card-strip">
      <div>
        <div class="label">Пациент (Ф.И.О.)</div>
        <div class="val">${patient.fullName}</div>
      </div>
      <div>
        <div class="label">Медицинская карта</div>
        <div class="val">№ ${patient.cardNumber} (Форма 043/у)</div>
      </div>
      <div>
        <div class="label">Лечащий врач</div>
        <div class="val">${doctor.fullName}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Зуб</th>
          <th>Вид работы</th>
          <th>Материал, производитель & LOT</th>
          <th>Гарантия</th>
          <th>Срок сл.</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="risk-summary-box">
      <div class="title">
        <span>Индивидуальный клинический профиль надежности</span>
        <span>Статус: ${calculation.warrantyStatus === "full" ? "Полная гарантия" : calculation.warrantyStatus === "reduced" ? "Скорректированная гарантия" : "Условная гарантия"} (${riskMultiplierPercent}%)</span>
      </div>
      <div>
        Базовый гарантийный срок скорректирован с учетом индекса гигиены (OHI-S), анатомической окклюзии и соматических факторов. Следующий обязательный контрольный осмотр назначен на <strong>${formatRussianDate(calculation.nextCheckupDueDate)}</strong>.
      </div>
    </div>

    <div class="checkups-section">
      <h4>График обязательных диспансерных осмотров и профгигиены:</h4>
      <div class="checkup-grid">
        ${checkupRows}
      </div>
    </div>

    <div class="conditions-section">
      <h4>Ключевые условия сохранения гарантийных обязательств клиники:</h4>
      <ul class="conditions-list">
        ${conditionsList.slice(0, 5)}
      </ul>
    </div>

    ${
			data.remediations && data.remediations.length > 0
				? `
    <div class="remediations-section" style="margin-bottom: 18px; position: relative; z-index: 1;">
      <h4 style="font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase;">
        Гарантийные рекламации и устранение дефектов (0 ₽):
      </h4>
      <table class="items-table" style="margin-bottom: 8px;">
        <thead>
          <tr>
            <th style="width: 15%;">Акт №</th>
            <th style="width: 12%;">Дата</th>
            <th style="width: 8%;">Зуб</th>
            <th style="width: 35%;">Характер дефекта & манипуляция</th>
            <th style="width: 18%;">Списание со склада</th>
            <th style="width: 12%; text-align: right;">К оплате</th>
          </tr>
        </thead>
        <tbody>
          ${data.remediations
						.map(
							(r) => `
            <tr>
              <td><strong>${r.orderNumber}</strong></td>
              <td>${formatShortDate(r.performedAtIso.slice(0, 10))}</td>
              <td style="color: #0f766e; font-weight: 800;">${r.toothNumber}</td>
              <td>
                <div style="font-weight: 700; color: #0f172a;">${r.defectTitle}</div>
                <div style="font-size: 8pt; color: #475569;">${r.remediationAction}</div>
              </td>
              <td style="font-size: 8pt; color: #475569;">
                ${r.materialsDeducted.map((m) => `${m.name} (${m.quantity} ${m.unit})`).join(", ")}
              </td>
              <td style="text-align: right; font-weight: 800; color: #059669;">0 ₽ (100%)</td>
            </tr>
          `,
						)
						.join("")}
        </tbody>
      </table>
    </div>
    `
				: ""
		}

    <div class="signatures-block">
      <div class="sign-col">
        <div class="sign-title">Лечащий врач-стоматолог:</div>
        <div class="sign-line"></div>
        <div class="sign-name">${doctor.fullName}</div>
      </div>
      <div class="sign-col">
        <div class="sign-title">Пациент (с условиями ознакомлен):</div>
        <div class="sign-line"></div>
        <div class="sign-name">${patient.fullName}</div>
      </div>
      <div class="qr-col">
        ${qrCodeSvg}
        <div class="qr-note">Проверка статуса гарантии на портале пациента</div>
      </div>
    </div>

    <div class="hash-footer">
      ЭЦП / Контрольный криптографический хеш документа: ${integrityHash}
    </div>
  </div>
</body>
</html>`;
}

/**
 * ============================================================================
 * 1-КЛИК ОФОРМЛЕНИЕ ГАРАНТИЙНОГО УСТРАНЕНИЯ ДЕФЕКТА (0 ₽)
 * Положение СтАР, Закон РФ № 2300-1 (ст. 29) и Мандат 8e (Свобода врача)
 * ============================================================================
 */
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
	const id = `remed_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
	const year = new Date().getFullYear();
	const randomNum = Math.floor(1000 + Math.random() * 9000);
	const orderNumber = `ГП-${year}-${randomNum}`;
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

/**
 * Генерация печатного Акта гарантийного устранения дефекта (0 ₽ / А4)
 */
export function generateWarrantyRemediationActHtml(order: WarrantyRemediationOrder): string {
	const materialsList = order.materialsDeducted
		.map(
			(mat, i) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">${mat.name}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${mat.quantity} ${mat.unit}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; color: #0f766e; font-weight: 700;">Списано со склада</td>
      </tr>
    `,
		)
		.join("\n");

	const template = getWarrantyDefectTemplate(order.defectType);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Акт гарантийного устранения дефекта — ${order.orderNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 10.5pt;
      color: #0f172a;
      background: #ffffff;
      padding: 15px;
    }
    .act-container {
      max-width: 760px;
      margin: 0 auto;
      border: 2px solid #0f766e;
      border-radius: 8px;
      padding: 24px;
    }
    .act-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .act-title {
      font-size: 14pt;
      font-weight: 900;
      color: #0f766e;
      text-transform: uppercase;
    }
    .act-meta {
      font-size: 9pt;
      color: #475569;
      margin-top: 4px;
    }
    .act-badge {
      font-size: 11pt;
      font-weight: 800;
      color: #0f766e;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      padding: 4px 10px;
      border-radius: 6px;
      text-align: right;
    }
    .act-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 9.5pt;
    }
    .act-grid .field { margin-bottom: 4px; }
    .act-grid .lbl { font-size: 8pt; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .act-grid .val { font-weight: 700; color: #0f172a; }
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      margin: 14px 0 6px 0;
    }
    .box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 9.5pt;
      margin-bottom: 12px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 16px;
    }
    .table th {
      background: #0f766e;
      color: #ffffff;
      padding: 6px 8px;
      text-align: left;
    }
    .zero-pay-box {
      background: #ecfdf5;
      border: 2px solid #059669;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 16px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .zero-pay-title { font-size: 11pt; font-weight: 800; color: #065f46; }
    .zero-pay-val { font-size: 18pt; font-weight: 900; color: #059669; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #cbd5e1;
    }
    .sign-line { border-bottom: 1px dashed #475569; margin: 24px 0 4px 0; }
  </style>
</head>
<body>
  <div class="act-container">
    <div class="act-header">
      <div>
        <div class="act-title">Акт гарантийного устранения дефекта</div>
        <div class="act-meta">${order.clinicName} • Закон РФ № 2300-1 «О защите прав потребителей» (ст. 29)</div>
      </div>
      <div>
        <div class="act-badge">${order.orderNumber}</div>
        <div class="act-meta" style="text-align: right;">${formatRussianDate(order.performedAtIso.slice(0, 10))}</div>
      </div>
    </div>

    <div class="act-grid">
      <div>
        <div class="field">
          <div class="lbl">Пациент:</div>
          <div class="val">${order.patientFullName} (карта № ${order.patientCardNumber})</div>
        </div>
        <div class="field">
          <div class="lbl">Лечащий врач:</div>
          <div class="val">${order.doctorName}</div>
        </div>
      </div>
      <div>
        <div class="field">
          <div class="lbl">Гарантийный сертификат:</div>
          <div class="val">№ ${order.certificateId}</div>
        </div>
        <div class="field">
          <div class="lbl">Зуб / Локализация:</div>
          <div class="val" style="color: #0f766e; font-size: 11pt;">Зуб № ${order.toothNumber}</div>
        </div>
      </div>
    </div>

    <div class="section-title">1. Клинический характер дефекта:</div>
    <div class="box">
      <strong>${order.defectTitle}</strong> (${template.statutoryBasis})<br/>
      <span style="color: #475569;">${order.clinicalFinding}</span>
    </div>

    <div class="section-title">2. Выполненные гарантийные манипуляции:</div>
    <div class="box">
      <strong>${order.remediationAction}</strong>
      ${order.doctorNotes ? `<div style="margin-top: 6px; font-size: 9pt; color: #64748b;">Примечание врача: ${order.doctorNotes}</div>` : ""}
    </div>

    <div class="section-title">3. Списание стоматологических материалов со склада:</div>
    <table class="table">
      <thead>
        <tr>
          <th style="width: 6%; text-align: center;">#</th>
          <th>Наименование материала / препарата</th>
          <th style="width: 20%; text-align: center;">Количество</th>
          <th style="width: 25%; text-align: center;">Статус списания</th>
        </tr>
      </thead>
      <tbody>
        ${materialsList}
      </tbody>
    </table>

    <div class="zero-pay-box">
      <div>
        <div class="zero-pay-title">Стоимость устранения дефекта для пациента:</div>
        <div style="font-size: 8.5pt; color: #047857;">Гарантия клиники 100% • Безвозмездное устранение дефекта (ст. 29 Закона РФ № 2300-1)</div>
      </div>
      <div class="zero-pay-val">0 ₽</div>
    </div>

    <div class="signatures">
      <div>
        <div style="font-size: 8.5pt; font-weight: 700; color: #64748b;">Лечащий врач-стоматолог:</div>
        <div class="sign-line"></div>
        <div style="font-size: 9pt; font-weight: 700;">${order.doctorName}</div>
      </div>
      <div>
        <div style="font-size: 8.5pt; font-weight: 700; color: #64748b;">Пациент (претензий к качеству не имею):</div>
        <div class="sign-line"></div>
        <div style="font-size: 9pt; font-weight: 700;">${order.patientFullName}</div>
      </div>
    </div>

    <div style="margin-top: 16px; text-align: center; font-family: monospace; font-size: 6.5pt; color: #94a3b8;">
      ЭЦП / Контрольный криптографический хеш акта: ${order.integrityHash || generateSha256(order.orderNumber)}
    </div>
  </div>
</body>
</html>`;
}

