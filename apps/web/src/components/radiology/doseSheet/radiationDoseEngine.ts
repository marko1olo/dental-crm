/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STATUTORY RADIATION DOSE CALCULATION & VALIDATION ENGINE
 * Russian SanPiN 2.6.1.1192-03 · SanPiN 2.6.1.2523-09 (НРБ-99/2009) · МУ 2.6.1.2944-11
 * Form 043/u Official Radiation Insert Generator & RFC 4180 CSV Exporter
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	getStatutoryDosePreset,
	RADIATION_SAFETY_LIMITS_MSV,
	RADIATION_ZONE_DEFINITIONS,
	type RadiationSafetyZone,
	type StatutoryRadiologyModality,
} from "./radiationDosePresets";

/** Запись о проведенном или планируемом рентгенологическом исследовании */
export interface DoseRecord {
	id: string;
	studyDate: string; // Формат YYYY-MM-DD или YYYY-MM-DD HH:mm
	modalityId: StatutoryRadiologyModality | string;
	modalityLabel: string;
	anatomicalArea: string; // например, "Зуб 16", "Сегмент 2.4-2.7", "Обе челюсти"
	teethFdi?: string[] | undefined; // массив номеров зубов по FDI: ["16", "17"]
	apparatusModel?: string | undefined; // модель аппарата
	tubeVoltageKv?: number | undefined; // напряжение на трубке (кВ)
	tubeCurrentMa?: number | undefined; // ток трубки (мА)
	exposureTimeSec?: number | undefined; // экспозиция (сек)
	effectiveDoseMicrosv: number; // мкЗв (например, 2.0 или 65.0)
	effectiveDoseMsv: number; // мЗв (например, 0.002 или 0.065)
	doctorName: string;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	protectionEquipmentUsed?: string[] | undefined; // использованные СИЗ
	isEmergencyJustified?: boolean | undefined; // признак жизненных показаний при превышении лимита
	emergencyJustificationReason?: string | null | undefined; // текст врачебного обоснования
	notes?: string | null | undefined;
}

/** Сводные показатели накопленной лучевой нагрузки пациента */
export interface DoseSummary {
	/** Накопленная эффективная доза за целевой календарный год (мкЗв) */
	annualMicrosv: number;
	/** Накопленная эффективная доза за целевой календарный год (мЗв) */
	annualMsv: number;
	/** Количество процедур за целевой календарный год */
	annualStudiesCount: number;
	/** Общая накопленная эффективная доза за все время (мкЗв) */
	lifetimeMicrosv: number;
	/** Общая накопленная эффективная доза за все время (мЗв) */
	lifetimeMsv: number;
	/** Общее количество процедур за все время */
	lifetimeStudiesCount: number;
	/** Статутарный годовой профилактический лимит (1.0 мЗв) */
	sanpinLimitMsv: number;
	/** Процент использования годового лимита */
	percentOfAnnualLimit: number;
	/** Зона радиационной безопасности (green | yellow | red) */
	safetyZone: RadiationSafetyZone;
	/** Описание текущей зоны безопасности */
	safetyZoneLabel: string;
	/** Рекомендация ответственного за радиационную безопасность */
	recommendation: string;
	/** Заключение о соблюдении принципа ALARA */
	alaraComplianceNotes: string;
	/** Разрезевка по календарным годам */
	yearlyBreakdown: Record<
		number,
		{
			year: number;
			count: number;
			microsv: number;
			msv: number;
			percentOfLimit: number;
			zone: RadiationSafetyZone;
		}
	>;
	/** Разрезевка по модальностям */
	modalityBreakdown: Record<
		string,
		{
			modalityId: string;
			modalityLabel: string;
			count: number;
			microsv: number;
			msv: number;
			percentOfTotal: number;
		}
	>;
}

/** Результат строгой проверки соответствия СанПиН при планировании исследования */
export interface DoseComplianceResult {
	status: "safe" | "warning" | "limit_exceeded";
	zone: RadiationSafetyZone;
	totalAnnualMsv: number;
	limitMsv: number;
	remainingAnnualMsv: number;
	percentOfLimit: number;
	isExceeded: boolean;
	warningMessage: string;
	protocolActionRequired: string;
	/**
	 * Обоснование лечащего врача в амбулаторной карте (форма 043/у) по клиническим показаниям.
	 * Съемка не блокируется софтом (Мандат 8e).
	 */
	requiresDoctorClinicalJustification: boolean;
	/**
	 * @deprecated Мандаты 8e, 8i: в амбулаторной частной клинике нет больничных консилиумов и комиссий.
	 * Всегда false, сохранено для обратной совместимости.
	 */
	requiresMedicalCouncilJustification: boolean;
	recommendedIntervalDays: number;
	/**
	 * Мандат 8e: блокировка кнопки съемки аппарата категорически запрещена.
	 * Врач всегда сохраняет автономность выполнения снимка при острой боли или эндодонтии.
	 */
	isCaptureBlocked: boolean;
}

export * from "./radiationDoseExport";


/**
 * Нормализация и безопасное приведение записи к валидному DoseRecord
 */
export function normalizeDoseRecord(record: Partial<DoseRecord>, index = 0): DoseRecord {
	const preset = getStatutoryDosePreset(record.modalityId || "visiography_intraoral");
	const rawMicrosv =
		typeof record.effectiveDoseMicrosv === "number" && !Number.isNaN(record.effectiveDoseMicrosv)
			? record.effectiveDoseMicrosv
			: typeof record.effectiveDoseMsv === "number" && !Number.isNaN(record.effectiveDoseMsv)
				? record.effectiveDoseMsv * 1000
				: preset.typicalDoseMicrosv;

	const effectiveDoseMicrosv = Number(rawMicrosv.toFixed(2));
	const effectiveDoseMsv =
		typeof record.effectiveDoseMsv === "number" && !Number.isNaN(record.effectiveDoseMsv)
			? Number(record.effectiveDoseMsv.toFixed(4))
			: Number((effectiveDoseMicrosv / 1000).toFixed(4));

	const nowIso = new Date().toISOString().slice(0, 10);
	const studyDate = record.studyDate ? String(record.studyDate).trim() : nowIso;

	return {
		id: record.id || `dose-rec-${Date.now()}-${index}`,
		studyDate,
		modalityId: record.modalityId || preset.id,
		modalityLabel: record.modalityLabel || preset.shortNameRu,
		anatomicalArea: record.anatomicalArea || "Область зубов",
		teethFdi: Array.isArray(record.teethFdi) ? record.teethFdi : [],
		apparatusModel: record.apparatusModel || "Дентальный цифровой рентген-аппарат",
		tubeVoltageKv: record.tubeVoltageKv ?? preset.defaultKv,
		tubeCurrentMa: record.tubeCurrentMa ?? preset.defaultMa,
		exposureTimeSec: record.exposureTimeSec ?? preset.defaultExposureSec,
		effectiveDoseMicrosv,
		effectiveDoseMsv,
		doctorName: record.doctorName || "Врач-стоматолог",
		doctorSpecialty: record.doctorSpecialty ?? undefined,
		clinicName: record.clinicName ?? undefined,
		protectionEquipmentUsed: record.protectionEquipmentUsed || [
			"Защитный воротник для щитовидной железы",
			"Фартук 0.35 мм Pb",
		],
		isEmergencyJustified: Boolean(record.isEmergencyJustified),
		emergencyJustificationReason: record.emergencyJustificationReason ?? undefined,
		notes: record.notes ?? undefined,
	};
}

/**
 * Создание новой записи исследования с автоматическим заполнением параметров из пресета
 */
export function createDoseRecord(params: Partial<DoseRecord>): DoseRecord {
	return normalizeDoseRecord(params);
}

/**
 * Извлечение года из строки даты
 */
export function extractYear(dateStr: string, fallbackYear: number): number {
	if (!dateStr) return fallbackYear;
	const match = dateStr.match(/^(\d{4})/);
	if (match && match[1]) {
		const y = Number.parseInt(match[1], 10);
		if (!Number.isNaN(y) && y >= 1990 && y <= 2100) return y;
	}
	return fallbackYear;
}

/**
 * 1. Расчет суммарной накопленной дозы пациента за календарный год и за все время
 * @param records Список проведенных исследований
 * @param targetYear Целевой отчетный год (по умолчанию текущий)
 */
export function calculatePatientCumulativeDose(
	records: readonly Partial<DoseRecord>[],
	targetYear: number = new Date().getFullYear(),
): DoseSummary {
	const normalized = records.map((r, i) => normalizeDoseRecord(r, i));

	let annualMicrosv = 0;
	let annualMsv = 0;
	let annualStudiesCount = 0;

	let lifetimeMicrosv = 0;
	let lifetimeMsv = 0;
	const lifetimeStudiesCount = normalized.length;

	const yearlyMap = new Map<
		number,
		{ count: number; microsv: number; msv: number }
	>();
	const modalityMap = new Map<
		string,
		{ modalityId: string; modalityLabel: string; count: number; microsv: number; msv: number }
	>();

	for (const rec of normalized) {
		const recYear = extractYear(rec.studyDate || "", targetYear);

		// Lifetime accumulators
		lifetimeMicrosv += rec.effectiveDoseMicrosv;
		lifetimeMsv += rec.effectiveDoseMsv;

		// Annual accumulator for target year
		if (recYear === targetYear) {
			annualMicrosv += rec.effectiveDoseMicrosv;
			annualMsv += rec.effectiveDoseMsv;
			annualStudiesCount += 1;
		}

		// Yearly breakdown accumulator
		const curYearData = yearlyMap.get(recYear) || { count: 0, microsv: 0, msv: 0 };
		curYearData.count += 1;
		curYearData.microsv += rec.effectiveDoseMicrosv;
		curYearData.msv += rec.effectiveDoseMsv;
		yearlyMap.set(recYear, curYearData);

		// Modality breakdown accumulator
		const modKey = String(rec.modalityId || "other");
		const curModData = modalityMap.get(modKey) || {
			modalityId: modKey,
			modalityLabel: rec.modalityLabel || modKey,
			count: 0,
			microsv: 0,
			msv: 0,
		};
		curModData.count += 1;
		curModData.microsv += rec.effectiveDoseMicrosv;
		curModData.msv += rec.effectiveDoseMsv;
		modalityMap.set(modKey, curModData);
	}

	annualMicrosv = Number(annualMicrosv.toFixed(2));
	annualMsv = Number(annualMsv.toFixed(4));
	lifetimeMicrosv = Number(lifetimeMicrosv.toFixed(2));
	lifetimeMsv = Number(lifetimeMsv.toFixed(4));

	const sanpinLimitMsv = RADIATION_SAFETY_LIMITS_MSV.ANNUAL_PREVENTIVE_LIMIT_MSV;
	const percentOfAnnualLimit = Math.min(
		Number(((annualMsv / sanpinLimitMsv) * 100).toFixed(1)),
		9999,
	);

	// Safety Zone Evaluation
	let safetyZone: RadiationSafetyZone = "green";
	if (annualMsv >= RADIATION_SAFETY_LIMITS_MSV.CRITICAL_EXCEEDED_THRESHOLD_MSV) {
		safetyZone = "red";
	} else if (annualMsv >= RADIATION_SAFETY_LIMITS_MSV.WARNING_THRESHOLD_MSV) {
		safetyZone = "yellow";
	}

	const zoneDef = RADIATION_ZONE_DEFINITIONS[safetyZone];

	// ALARA principle text
	let alaraComplianceNotes =
		"Принцип ALARA (As Low As Reasonably Achievable) соблюден. Лучевая нагрузка минимальна, используются цифровые низкодозовые приемники и защитные СИЗ.";
	if (safetyZone === "red") {
		alaraComplianceNotes =
			"Внимание: Годовой профилактический порог 1.0 мЗв превышен. Обязательна запись обоснования по жизненным показаниям в форме 043/у.";
	} else if (safetyZone === "yellow") {
		alaraComplianceNotes =
			"Накопленная доза умеренная. Рекомендуется ограничить объемные КЛКТ 3D и отдавать приоритет прицельным визиограммам с коллимацией.";
	}

	// Format yearly breakdown object
	const yearlyBreakdown: DoseSummary["yearlyBreakdown"] = {};
	for (const [y, data] of yearlyMap.entries()) {
		const yMsv = Number(data.msv.toFixed(4));
		const yPercent = Number(((yMsv / sanpinLimitMsv) * 100).toFixed(1));
		let yZone: RadiationSafetyZone = "green";
		if (yMsv >= 1.0) yZone = "red";
		else if (yMsv >= 0.5) yZone = "yellow";

		yearlyBreakdown[y] = {
			year: y,
			count: data.count,
			microsv: Number(data.microsv.toFixed(2)),
			msv: yMsv,
			percentOfLimit: yPercent,
			zone: yZone,
		};
	}

	// Ensure targetYear exists in yearly breakdown even if 0
	if (!yearlyBreakdown[targetYear]) {
		yearlyBreakdown[targetYear] = {
			year: targetYear,
			count: 0,
			microsv: 0,
			msv: 0,
			percentOfLimit: 0,
			zone: "green",
		};
	}

	// Format modality breakdown object
	const modalityBreakdown: DoseSummary["modalityBreakdown"] = {};
	for (const [modKey, data] of modalityMap.entries()) {
		const totalLifetime = lifetimeMsv > 0 ? lifetimeMsv : 1;
		const msvVal = Number(data.msv.toFixed(4));
		const percentOfTotal = Number(((msvVal / totalLifetime) * 100).toFixed(1));

		modalityBreakdown[modKey] = {
			modalityId: data.modalityId,
			modalityLabel: data.modalityLabel,
			count: data.count,
			microsv: Number(data.microsv.toFixed(2)),
			msv: msvVal,
			percentOfTotal,
		};
	}

	return {
		annualMicrosv,
		annualMsv,
		annualStudiesCount,
		lifetimeMicrosv,
		lifetimeMsv,
		lifetimeStudiesCount,
		sanpinLimitMsv,
		percentOfAnnualLimit,
		safetyZone,
		safetyZoneLabel: zoneDef.labelRu,
		recommendation: zoneDef.recommendationRu,
		alaraComplianceNotes,
		yearlyBreakdown,
		modalityBreakdown,
	};
}

/**
 * 2. Оценка соответствия нормам СанПиН 2.6.1.1192-03 при планировании или добавлении исследования
 * @param currentAnnualDoseMsv Текущая накопленная годовая доза в мЗв
 * @param prospectiveStudyDoseMsv Доза планируемого исследования в мЗв
 */
export function evaluateDoseCompliance(
	currentAnnualDoseMsv: number,
	prospectiveStudyDoseMsv = 0,
): DoseComplianceResult {
	const limitMsv = RADIATION_SAFETY_LIMITS_MSV.ANNUAL_PREVENTIVE_LIMIT_MSV;
	const totalAfterStudyMsv = Number((currentAnnualDoseMsv + prospectiveStudyDoseMsv).toFixed(4));
	const remainingAnnualMsv = Number(Math.max(0, limitMsv - totalAfterStudyMsv).toFixed(4));
	const percentOfLimit = Number(((totalAfterStudyMsv / limitMsv) * 100).toFixed(1));
	const isExceeded = totalAfterStudyMsv >= limitMsv;

	let status: DoseComplianceResult["status"] = "safe";
	let zone: RadiationSafetyZone = "green";
	let warningMessage = "Лучевая нагрузка находится в оптимальных нормативных границах СанПиН 2.6.1.2523-09.";
	let protocolActionRequired = "Стандартный протокол: применение СИЗ (воротник 0.35 мм Pb), запись в лист дозовых нагрузок формы 043/у.";
	let requiresDoctorClinicalJustification = false;
	let recommendedIntervalDays = 0;
	// Мандат 8e: аппаратная съемка НИКОГДА не блокируется
	const isCaptureBlocked = false;

	if (totalAfterStudyMsv >= RADIATION_SAFETY_LIMITS_MSV.CRITICAL_EXCEEDED_THRESHOLD_MSV) {
		status = "limit_exceeded";
		zone = "red";
		warningMessage = `Клиническое предупреждение (СанПиН 2.6.1.1192-03): Суммарная доза (${totalAfterStudyMsv} мЗв) достигла или превысила профилактический лимит (${limitMsv} мЗв). Согласно Мандату 8e, блокировка аппарата ЗАПРЕЩЕНА: исследование выполняется по клиническим показаниям под личную ответственность лечащего врача с записью в карту 043/у.`;
		protocolActionRequired =
			"Автономия врача (Мандат 8e): съемка не блокируется. Врач вносит клиническое обоснование в форму 043/у (по острой боли, контроль пломбирования каналов или хирургический контроль). Никаких стационарных комиссий и начмедов.";
		requiresDoctorClinicalJustification = true;
		recommendedIntervalDays = RADIATION_SAFETY_LIMITS_MSV.RECOMMENDED_CBCT_INTERVAL_DAYS;
	} else if (totalAfterStudyMsv >= RADIATION_SAFETY_LIMITS_MSV.WARNING_THRESHOLD_MSV) {
		status = "warning";
		zone = "yellow";
		warningMessage = `Предупреждение: Накопленная доза (${totalAfterStudyMsv} мЗв) составила ${percentOfLimit}% от годового лимита СанПиН.`;
		protocolActionRequired =
			"Протокол повышенного контроля: рекомендована оптимизация рентген-назначений и использование узкого поля облучения (коллимации). Съемка не блокируется.";
		requiresDoctorClinicalJustification = false;
		recommendedIntervalDays = 30;
	}

	return {
		status,
		zone,
		totalAnnualMsv: totalAfterStudyMsv,
		limitMsv,
		remainingAnnualMsv,
		percentOfLimit,
		isExceeded,
		warningMessage,
		protocolActionRequired,
		requiresDoctorClinicalJustification,
		requiresMedicalCouncilJustification: false, // Мандат 8e, 8i: исключены стационарные комиссии
		recommendedIntervalDays,
		isCaptureBlocked,
	};
}

/**
 * 3. Расчет ориентировочной эффективной дозы по физическим параметрам трубки (кВ, мА, с)
 * Согласно методическим указаниям МУ 2.6.1.2944-11
 */
export function estimateDoseFromExposureParams(params: {
	modalityId?: string | undefined;
	kv: number;
	ma: number;
	exposureSec: number;
	isDigital?: boolean | undefined;
}): { estimatedDoseMsv: number; estimatedDoseMicrosv: number; calculationMethod: string } {
	const { kv, ma, exposureSec, isDigital = true } = params;
	const mAs = ma * exposureSec;

	// Empirical dose-area-product / conversion coefficient based on modality
	const preset = getStatutoryDosePreset(params.modalityId || "visiography_intraoral");
	let baseK = 0.0035; // base mSv / (kV * mAs normalized)

	if (preset.id.startsWith("cbct")) {
		baseK = 0.00065;
		if (preset.id === "cbct_maxillofacial") baseK = 0.00075;
		else if (preset.id === "cbct_segmental") baseK = 0.00055;
	} else if (preset.id === "optg_panoramic") {
		baseK = 0.00015;
	} else if (preset.id.startsWith("teleradiography")) {
		baseK = 0.0012;
	} else if (preset.id === "film_intraoral_legacy") {
		baseK = 0.0048;
	}

	// Voltage non-linear scaling factor (kV / nominal)^2
	const kvFactor = Math.pow(Math.max(40, kv) / Math.max(40, preset.defaultKv), 1.8);
	const rawMsv = baseK * mAs * kvFactor * (isDigital ? 1.0 : 3.5);

	// Clamp to safe physiological limits of the modality
	const estimatedDoseMsv = Number(Math.max(0.0005, Math.min(0.5, rawMsv)).toFixed(4));
	const estimatedDoseMicrosv = Number((estimatedDoseMsv * 1000).toFixed(2));

	return {
		estimatedDoseMsv,
		estimatedDoseMicrosv,
		calculationMethod: `МУ 2.6.1.2944-11 (kV=${kv}, mAs=${mAs.toFixed(2)}, сенсор=${isDigital ? "цифровой" : "пленка"})`,
	};
}

/**
 * 4. Форматирование эффективной дозы излучения для UI
 */
export function formatRadiationDoseDisplay(doseMicrosv: number): {
	microsvText: string;
	msvText: string;
	fullText: string;
	safetyZone: RadiationSafetyZone;
	badgeClass: string;
} {
	const microsv = Number(doseMicrosv.toFixed(1));
	const msv = Number((doseMicrosv / 1000).toFixed(4));

	let safetyZone: RadiationSafetyZone = "green";
	let badgeClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";

	if (msv >= 0.5) {
		safetyZone = "red";
		badgeClass = "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
	} else if (msv >= 0.05) {
		safetyZone = "yellow";
		badgeClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
	}

	return {
		microsvText: `${microsv} мкЗв`,
		msvText: `${msv} мЗв`,
		fullText: `${microsv} мкЗв (${msv} мЗв)`,
		safetyZone,
		badgeClass,
	};
}



/**
 * 7. Фильтрация и поиск записей лучевых нагрузок
 */
export function filterDoseRecords(
	records: readonly Partial<DoseRecord>[],
	filters: {
		year?: number | undefined;
		modalityId?: string | undefined;
		search?: string | undefined;
		startDate?: string | undefined;
		endDate?: string | undefined;
	},
): DoseRecord[] {
	const normalized = records.map((r, i) => normalizeDoseRecord(r, i));

	return normalized.filter((rec) => {
		if (typeof filters.year === "number" && filters.year > 0) {
			const recYear = extractYear(rec.studyDate, filters.year);
			if (recYear !== filters.year) return false;
		}

		if (filters.modalityId && filters.modalityId !== "all") {
			if (rec.modalityId !== filters.modalityId) return false;
		}

		if (filters.startDate) {
			if (rec.studyDate < filters.startDate) return false;
		}

		if (filters.endDate) {
			if (rec.studyDate > filters.endDate) return false;
		}

		if (filters.search && filters.search.trim().length > 0) {
			const q = filters.search.toLowerCase().trim();
			const inArea = rec.anatomicalArea.toLowerCase().includes(q);
			const inDoctor = rec.doctorName.toLowerCase().includes(q);
			const inModality = rec.modalityLabel.toLowerCase().includes(q);
			const inTeeth = rec.teethFdi ? rec.teethFdi.some((t) => t.includes(q)) : false;
			const inNotes = rec.notes ? rec.notes.toLowerCase().includes(q) : false;
			if (!inArea && !inDoctor && !inModality && !inTeeth && !inNotes) return false;
		}

		return true;
	});
}
