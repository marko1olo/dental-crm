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
	requiresMedicalCouncilJustification: boolean;
	recommendedIntervalDays: number;
}

/** Опции генерации печатного вкладыша Формы 043/у */
export interface DoseSheetHtmlOptions {
	clinicName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicOgrn?: string | null | undefined;
	clinicLicense?: string | null | undefined;
	patientFullName?: string | null | undefined;
	patientBirthDate?: string | null | undefined;
	patientGender?: "male" | "female" | undefined;
	medicalCardNumber?: string | null | undefined;
	reportingYear?: number | undefined;
	responsibleDoctorName?: string | null | undefined;
	responsibleOfficerTitle?: string | null | undefined;
	includeSignatureLine?: boolean | undefined;
	paperFormat?: "A4" | "A5" | undefined;
}

/** Опции экспорта журнала в CSV */
export interface CsvExportOptions {
	clinicName?: string | null | undefined;
	patientFullName?: string | null | undefined;
	medicalCardNumber?: string | null | undefined;
	delimiter?: ";" | "," | undefined;
}

/**
 * Вспомогательная функция для безопасного экранирования HTML
 */
function escapeHtml(str: unknown): string {
	if (str === null || str === undefined) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

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
function extractYear(dateStr: string, fallbackYear: number): number {
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
	let protocolActionRequired = "Стандартный протокол: применение СИЗ (воротник 0.35 мм Pb), запись в лист дозовых нагрузок.";
	let requiresMedicalCouncilJustification = false;
	let recommendedIntervalDays = 0;

	if (totalAfterStudyMsv >= RADIATION_SAFETY_LIMITS_MSV.CRITICAL_EXCEEDED_THRESHOLD_MSV) {
		status = "limit_exceeded";
		zone = "red";
		warningMessage = `Критическое предупреждение: Суммарная доза (${totalAfterStudyMsv} мЗв) достигла или превысила годовой профилактический лимит СанПиН (${limitMsv} мЗв).`;
		protocolActionRequired =
			"Особый протокол: исследование допустимо только по жизненным показаниям. Обязательно письменное заключение консилиума врачей в амбулаторной карте (форма 043/у).";
		requiresMedicalCouncilJustification = true;
		recommendedIntervalDays = RADIATION_SAFETY_LIMITS_MSV.RECOMMENDED_CBCT_INTERVAL_DAYS;
	} else if (totalAfterStudyMsv >= RADIATION_SAFETY_LIMITS_MSV.WARNING_THRESHOLD_MSV) {
		status = "warning";
		zone = "yellow";
		warningMessage = `Предупреждение: Накопленная доза (${totalAfterStudyMsv} мЗв) составила ${percentOfLimit}% от годового лимита СанПиН.`;
		protocolActionRequired =
			"Протокол повышенного контроля: рекомендована оптимизация рентген-назначений и использование узкого поля облучения (коллимации).";
		requiresMedicalCouncilJustification = false;
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
		requiresMedicalCouncilJustification,
		recommendedIntervalDays,
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
 * 5. Формирование официального вкладыша в Медицинскую карту стоматологического больного (Форма № 043/у)
 * «Лист учета дозовых нагрузок пациента при рентгенологических исследованиях»
 * Формат А4 / А5 по ГОСТ Р 7.0.97-2016
 */
export function generateDoseSheetHtml(
	records: readonly Partial<DoseRecord>[],
	options: DoseSheetHtmlOptions = {},
): string {
	const {
		clinicName = 'ООО "Денте Клиник"',
		clinicAddress = "г. Москва, ул. Клиническая, д. 10, стр. 1",
		clinicOgrn = "1127746000000",
		clinicLicense = "ЛО-77-01-012345 от 12.04.2021",
		patientFullName = "Иванов Иван Иванович",
		patientBirthDate = "1990-05-14",
		patientGender = "male",
		medicalCardNumber = "043/у-0012",
		reportingYear = new Date().getFullYear(),
		responsibleDoctorName = "Др. Смирнов А.В.",
		responsibleOfficerTitle = "Врач-рентгенолог / Ответственный за радиационную безопасность",
		includeSignatureLine = true,
		paperFormat = "A4",
	} = options;

	const normalized = records.map((r, i) => normalizeDoseRecord(r, i));
	const summary = calculatePatientCumulativeDose(normalized, reportingYear);

	// Accumulator for cumulative year dose in rows
	let runningYearMsv = 0;

	const rowsHtml =
		normalized.length === 0
			? `<tr><td colspan="10" style="text-align: center; padding: 12px; font-style: italic; color: #64748b;">Нет зарегистрированных рентгенологических исследований за отчетный период.</td></tr>`
			: normalized
					.map((rec, idx) => {
						const recYear = extractYear(rec.studyDate, reportingYear);
						if (recYear === reportingYear) {
							runningYearMsv += rec.effectiveDoseMsv;
						}
						const techParams = `${rec.tubeVoltageKv || 65} кВ / ${rec.tubeCurrentMa || 7} мА / ${rec.exposureTimeSec || 0.08} с`;
						const teethText =
							rec.teethFdi && rec.teethFdi.length > 0 ? ` (FDI: ${rec.teethFdi.join(", ")})` : "";
						const protectionText =
							rec.protectionEquipmentUsed && rec.protectionEquipmentUsed.length > 0
								? rec.protectionEquipmentUsed.join(", ")
								: "Воротник 0.35 мм Pb, фартук";

						return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="white-space: nowrap; font-weight: 600;">${escapeHtml(rec.studyDate)}</td>
          <td><strong>${escapeHtml(rec.modalityLabel)}</strong><br/><span style="font-size: 7.5pt; color: #475569;">${escapeHtml(rec.apparatusModel || "")}</span></td>
          <td>${escapeHtml(rec.anatomicalArea)}${escapeHtml(teethText)}</td>
          <td style="text-align: center; font-size: 7.5pt; font-family: monospace;">${escapeHtml(techParams)}</td>
          <td style="text-align: right; font-weight: bold;">${rec.effectiveDoseMicrosv.toFixed(1)}</td>
          <td style="text-align: right; font-weight: bold; color: #0284c7;">${rec.effectiveDoseMsv.toFixed(4)}</td>
          <td style="text-align: right; font-weight: bold; color: #0f172a;">${runningYearMsv.toFixed(4)}</td>
          <td style="font-size: 7.5pt; color: #334155;">${escapeHtml(protectionText)}</td>
          <td style="font-size: 7.5pt;">${escapeHtml(rec.doctorName)}<br/><span style="color: #64748b;">___________</span></td>
        </tr>`;
					})
					.join("");

	const isRed = summary.safetyZone === "red";
	const isYellow = summary.safetyZone === "yellow";
	const zoneBadgeColor = isRed ? "#dc2626" : isYellow ? "#d97706" : "#059669";
	const zoneBgColor = isRed ? "#fef2f2" : isYellow ? "#fffbeb" : "#ecfdf5";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Лист учета дозовых нагрузок — ${escapeHtml(patientFullName)}</title>
  <style>
    @page {
      size: ${paperFormat === "A5" ? "A5 landscape" : "A4 portrait"};
      margin: 10mm 10mm 12mm 15mm;
      @bottom-right {
        content: "Стр. " counter(page);
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: "PT Astra Serif", "Times New Roman", Times, serif;
      font-size: 8.5pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-container {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
    }
    .header-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5pt solid #0f172a;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .clinic-info {
      width: 60%;
      font-family: Arial, sans-serif;
      font-size: 7.5pt;
      line-height: 1.2;
      color: #334155;
    }
    .clinic-title {
      font-weight: 800;
      font-size: 10pt;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .doc-requisites {
      width: 38%;
      text-align: right;
      font-family: Arial, sans-serif;
      font-size: 7.5pt;
      color: #334155;
    }
    .form-badge {
      display: inline-block;
      font-weight: 800;
      font-size: 8pt;
      text-transform: uppercase;
      border: 1pt solid #0f172a;
      padding: 1pt 4pt;
      background: #f8fafc;
      margin-bottom: 2pt;
    }
    .title-block {
      text-align: center;
      margin: 6px 0 8px 0;
    }
    .main-title {
      font-family: Arial, sans-serif;
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      margin: 0;
    }
    .sub-title {
      font-size: 8pt;
      font-style: italic;
      color: #475569;
      margin: 2px 0 0 0;
    }
    .patient-card {
      background: #f8fafc;
      border: 0.5pt solid #cbd5e1;
      padding: 5px 8px;
      margin-bottom: 8px;
      font-family: Arial, sans-serif;
      font-size: 8pt;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 4px 12px;
    }
    .patient-card strong {
      color: #0f172a;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0 10px 0;
      font-size: 7.5pt;
      line-height: 1.15;
    }
    table.data-table th, table.data-table td {
      border: 0.5pt solid #64748b;
      padding: 3pt 3.5pt;
      vertical-align: middle;
    }
    table.data-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-family: Arial, sans-serif;
      font-weight: bold;
      text-align: center;
      font-size: 7pt;
    }
    table.data-table tr:nth-child(even) td {
      background: #fbfcfe;
    }
    .summary-box {
      border: 1pt solid ${zoneBadgeColor};
      background: ${zoneBgColor};
      padding: 6px 10px;
      margin-top: 6px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-family: Arial, sans-serif;
      font-size: 8pt;
    }
    .summary-title {
      font-weight: bold;
      font-size: 8.5pt;
      color: ${zoneBadgeColor};
      margin-bottom: 3px;
    }
    .summary-metrics {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-weight: bold;
      color: #0f172a;
    }
    .signatures-block {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 14px;
      padding-top: 8px;
      border-top: 0.5pt solid #cbd5e1;
      font-family: Arial, sans-serif;
      font-size: 8pt;
    }
    .signature-col {
      width: 48%;
    }
    .sanpin-footer {
      font-size: 7pt;
      color: #64748b;
      font-style: italic;
      margin-top: 8px;
      text-align: justify;
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <!-- Header -->
    <div class="header-grid">
      <div class="clinic-info">
        <div class="clinic-title">${escapeHtml(clinicName)}</div>
        <div>Адрес: ${escapeHtml(clinicAddress)}</div>
        <div>ОГРН: ${escapeHtml(clinicOgrn)} · Лицензия: ${escapeHtml(clinicLicense)}</div>
      </div>
      <div class="doc-requisites">
        <div class="form-badge">Вкладыш в Форму № 043/у</div>
        <div>Минздрав России</div>
        <div>СанПиН 2.6.1.1192-03 (п. 7.12)</div>
      </div>
    </div>

    <!-- Title -->
    <div class="title-block">
      <h1 class="main-title">ЛИСТ УЧЕТА ДОЗОВЫХ НАГРУЗОК ПАЦИЕНТА</h1>
      <p class="sub-title">при проведении медицинских рентгенологических исследований за ${reportingYear} год</p>
    </div>

    <!-- Patient Details -->
    <div class="patient-card">
      <div><strong>Пациент (ФИО):</strong> ${escapeHtml(patientFullName)}</div>
      <div><strong>Дата рождения:</strong> ${escapeHtml(patientBirthDate)}</div>
      <div><strong>Пол:</strong> ${patientGender === "female" ? "Женский" : "Мужской"}</div>
      <div><strong>Номер мед. карты (043/у):</strong> ${escapeHtml(medicalCardNumber)}</div>
      <div><strong>Отчетный период:</strong> ${reportingYear} г.</div>
      <div><strong>Статус карты:</strong> Активная</div>
    </div>

    <!-- Table of X-Ray Procedures -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 20px;">№</th>
          <th style="width: 60px;">Дата</th>
          <th>Вид исследования / Аппарат</th>
          <th>Область исследования</th>
          <th style="width: 65px;">Режим (кВ/мА/с)</th>
          <th style="width: 45px;">Доза (мкЗв)</th>
          <th style="width: 45px;">Доза (мЗв)</th>
          <th style="width: 55px;">Накопл. (мЗв)</th>
          <th>СИЗ пациента</th>
          <th style="width: 80px;">Врач / Подпись</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <!-- Radiation Safety Summary Box -->
    <div class="summary-box">
      <div class="summary-title">
        ЗАКЛЮЧЕНИЕ ОТВЕТСТВЕННОГО ЗА РАДИАЦИОННУЮ БЕЗОПАСНОСТЬ: ${escapeHtml(summary.safetyZoneLabel.toUpperCase())}
      </div>
      <div class="summary-metrics">
        <span>Суммарная доза за ${reportingYear} г.: <strong>${summary.annualMsv} мЗв (${summary.annualMicrosv} мкЗв)</strong></span>
        <span>Доля от лимита (1.0 мЗв/год): <strong>${summary.percentOfAnnualLimit}%</strong></span>
        <span>Всего за всё время: <strong>${summary.lifetimeMsv} мЗв (${summary.lifetimeStudiesCount} проц.)</strong></span>
      </div>
      <div>${escapeHtml(summary.recommendation)}</div>
    </div>

    <!-- Signatures -->
    ${
			includeSignatureLine
				? `
    <div class="signatures-block">
      <div class="signature-col">
        <div><strong>Ответственный за радиационную безопасность:</strong></div>
        <div style="margin-top: 14px;">____________________ / ${escapeHtml(responsibleDoctorName)} /</div>
        <div style="font-size: 7pt; color: #64748b;">${escapeHtml(responsibleOfficerTitle)}</div>
      </div>
      <div class="signature-col" style="text-align: right;">
        <div><strong>Лечащий врач-стоматолог:</strong></div>
        <div style="margin-top: 14px;">____________________ / ____________________ /</div>
        <div style="font-size: 7pt; color: #64748b;">Личная подпись и печать врача</div>
      </div>
    </div>`
				: ""
		}

    <!-- SanPiN Regulatory Footer -->
    <div class="sanpin-footer">
      * Примечание: В соответствии с п. 7.12–7.13 СанПиН 2.6.1.1192-03 и п. 5.4.1 СанПиН 2.6.1.2523-09 (НРБ-99/2009), годовой предел эффективной дозы при профилактических медицинских исследованиях составляет 1.0 мЗв. Превышение 1.0 мЗв/год переводит исследования в категорию специальных диагностических по строгим клиническим показаниям с обязательной фиксацией в протоколе приема.
    </div>
  </div>
</body>
</html>`;
}

/**
 * 6. Экспорт журнала рентген-кабинета и дозовых нагрузок в CSV (RFC 4180 с UTF-8 BOM)
 */
export function exportDoseJournalToCsv(
	records: readonly Partial<DoseRecord>[],
	options: CsvExportOptions = {},
): string {
	const {
		clinicName = 'ООО "Денте Клиник"',
		patientFullName = "Иванов Иван Иванович",
		medicalCardNumber = "043/у-0012",
		delimiter = ";",
	} = options;

	const normalized = records.map((r, i) => normalizeDoseRecord(r, i));

	const headers = [
		"№ п/п",
		"Дата исследования",
		"Вид исследования",
		"Идентификатор модальности",
		"Анатомическая область",
		"Зубы по FDI",
		"Модель аппарата",
		"Напряжение (кВ)",
		"Ток трубки (мА)",
		"Экспозиция (сек)",
		"Эффективная доза (мкЗв)",
		"Эффективная доза (мЗв)",
		"СИЗ пациента",
		"ФИО врача",
		"Обоснование по жизненным показаниям",
		"Примечания",
	];

	function csvCell(val: unknown): string {
		if (val === null || val === undefined) return '""';
		const str = String(val).replace(/"/g, '""');
		return `"${str}"`;
	}

	const lines: string[] = [];

	// UTF-8 BOM prefix
	const UTF8_BOM = "\uFEFF";

	// Meta info block
	lines.push(`${csvCell("Организация")}${delimiter}${csvCell(clinicName)}`);
	lines.push(
		`${csvCell("Пациент")}${delimiter}${csvCell(patientFullName)}${delimiter}${csvCell("Номер карты")}${delimiter}${csvCell(medicalCardNumber)}`,
	);
	lines.push(
		`${csvCell("Нормативный документ")}${delimiter}${csvCell("СанПиН 2.6.1.1192-03 / СанПиН 2.6.1.2523-09")}`,
	);
	lines.push(""); // empty separator line

	// Header row
	lines.push(headers.map(csvCell).join(delimiter));

	// Data rows
	normalized.forEach((rec, idx) => {
		const row = [
			idx + 1,
			rec.studyDate,
			rec.modalityLabel,
			rec.modalityId,
			rec.anatomicalArea,
			rec.teethFdi ? rec.teethFdi.join(",") : "",
			rec.apparatusModel || "",
			rec.tubeVoltageKv ?? "",
			rec.tubeCurrentMa ?? "",
			rec.exposureTimeSec ?? "",
			rec.effectiveDoseMicrosv.toFixed(2),
			rec.effectiveDoseMsv.toFixed(4),
			rec.protectionEquipmentUsed ? rec.protectionEquipmentUsed.join("; ") : "",
			rec.doctorName,
			rec.isEmergencyJustified ? `Да (${rec.emergencyJustificationReason || "Консилиум"})` : "Нет",
			rec.notes || "",
		];
		lines.push(row.map(csvCell).join(delimiter));
	});

	// Totals summary row
	const totalMicrosv = normalized.reduce((acc, r) => acc + r.effectiveDoseMicrosv, 0);
	const totalMsv = normalized.reduce((acc, r) => acc + r.effectiveDoseMsv, 0);

	lines.push("");
	const totalsRow = [
		"ИТОГО ЗА ВСЁ ВРЕМЯ",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		"",
		totalMicrosv.toFixed(2),
		totalMsv.toFixed(4),
		"",
		"",
		"",
		"",
	];
	lines.push(totalsRow.map(csvCell).join(delimiter));

	return UTF8_BOM + lines.join("\r\n");
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
