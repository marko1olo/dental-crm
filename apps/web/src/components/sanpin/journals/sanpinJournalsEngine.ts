/**
 * ============================================================================
 * SANPIN 3.3686-21 DISINFECTION & STERILIZATION JOURNAL ENGINE
 * Математический и нормативный движок расчетов качества ПСО (Форма 366/у),
 * наработки УФ-ламп рециркуляторов, графиков генеральных уборок и баланса дезсредств.
 * ============================================================================
 */

import {
	DENTAL_INSTRUMENT_CATEGORIES,
	GENERAL_CLEANING_PRESETS,
	SANPIN_DETERGENTS_CATALOG,
	SANPIN_PSO_CHEMICAL_TESTS,
	UV_RECIRCULATOR_MODELS,
	type DentalInstrumentCategoryDefinition,
	type GeneralCleaningPresetDefinition,
	type PsoChemicalTestId,
	type UvRecirculatorModelDefinition,
} from "./sanpinJournalsPresets.js";

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface PsoJournalRecord {
	readonly id: string;
	readonly timestamp: string;
	readonly instrumentName: string;
	readonly categoryId: string;
	readonly batchItemCount: number;
	readonly testedSampleCount: number;
	readonly testType: PsoChemicalTestId;
	readonly isAzopyramNegative: boolean;
	readonly isPhenolphthaleinNegative: boolean;
	readonly isSudanNegative: boolean;
	readonly detergentBrand: string;
	readonly isBatchApproved: boolean;
	readonly rejectionReason?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly electronicStampVerified: boolean;
	readonly notes?: string | undefined;
}

export interface BactericidalEquipmentRecord {
	readonly id: string;
	readonly roomName: string;
	readonly roomVolumeM3: number;
	readonly deviceBrand: string;
	readonly serialNumber: string;
	readonly deviceType: "recirculator_closed" | "irradiator_open" | "combined";
	readonly lampType: string;
	readonly lampCount: number;
	readonly maxLampHours: number;
	readonly totalOperatingHours: number;
	readonly remainingLampHours: number;
	readonly remainingLampPercent: number;
	readonly lampStatus: "normal" | "warning_replace_soon" | "expired_replace_now";
	readonly isLampCritical: boolean;
	readonly lastLampReplacementDate?: string | undefined;
	readonly notes?: string | undefined;
}

export interface BactericidalSessionRecord {
	readonly id: string;
	readonly equipmentId: string;
	readonly date: string;
	readonly sessionStartTime: string;
	readonly sessionEndTime: string;
	readonly durationMinutes: number;
	readonly durationHours: number;
	readonly operatingMode: "continuous_presence" | "pre_op_preparation" | "post_cleaning" | "intermittent";
	readonly cumulativeHoursAfterSession: number;
	readonly roomName: string;
	readonly deviceBrand: string;
	readonly operatorStaffFullName: string;
	readonly notes?: string | undefined;
}

export interface GeneralCleaningJournalRecord {
	readonly id: string;
	readonly roomType: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility";
	readonly roomName: string;
	readonly scheduledDate: string;
	readonly actualDateTime: string;
	readonly treatedAreaM2: number;
	readonly disinfectantName: string;
	readonly activeIngredient: string;
	readonly solutionConcentrationPercent: number;
	readonly applicationMethodRu: string;
	readonly exposureTimeMinutes: number;
	readonly uvIrradiationMinutes: number;
	readonly ventilationMinutes: number;
	readonly operatorStaffFullName: string;
	readonly inspectorStaffFullName?: string | undefined;
	readonly isInspectorVerified: boolean;
	readonly status: "completed" | "verified_by_inspector" | "rescheduled";
	readonly notes?: string | undefined;
}

export interface DisinfectantStockRecord {
	readonly id: string;
	readonly tradeName: string;
	readonly activeGroup: string;
	readonly unit: "л" | "кг";
	readonly currentStock: number;
	readonly monthlyMinStockRequired: number;
	readonly lastReceiptDate?: string | undefined;
	readonly lastConsumptionDate?: string | undefined;
}

export interface DisinfectantJournalRecord {
	readonly id: string;
	readonly timestamp: string;
	readonly operationType: "receipt" | "consumption";
	readonly tradeName: string;
	readonly amount: number;
	readonly unit: "л" | "кг";
	readonly invoiceOrObjectInfo: string;
	readonly batchOrExpirationDate?: string | undefined;
	readonly solutionPreparedLiters?: number | undefined;
	readonly concentrationPercent?: number | undefined;
	readonly resultingStockBalance: number;
	readonly operatorStaffFullName: string;
	readonly notes?: string | undefined;
}

export interface ClinicLegalInfo {
	readonly name: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly address: string;
	readonly chiefDoctor: string;
	readonly headNurse: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PSO SAMPLING & AZOPYRAM EVALUATION MATH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Расчет минимального объема выборки по СанПиН 3.3686-21:
 * Требование: 1% от одновременно обработанной партии, но не менее 3–5 единиц каждого наименования.
 */
export function calculatePsoSampleRequirements(
	batchCount: number,
	isCriticalSurgical = false,
): {
	minSampleCount: number;
	formulaDescriptionRu: string;
	ruleRefRu: string;
} {
	const count = Math.max(1, Math.floor(Number(batchCount) || 1));
	const absoluteMin = isCriticalSurgical ? 5 : 3;
	const onePercent = Math.ceil(count * 0.01);
	const minSampleCount = Math.max(absoluteMin, onePercent);

	return {
		minSampleCount,
		formulaDescriptionRu: `max(${absoluteMin}, ceil(${count} × 1%)) = ${minSampleCount} шт.`,
		ruleRefRu: "СанПиН 3.3686-21 п. 3584: 1% от партии изделий, не менее 3–5 единиц каждого наименования",
	};
}

/**
 * Валидация результатов химических проб ПСО (Азопирам, Фенолфталеин, Судан III)
 */
export function evaluatePsoTrialResult(params: {
	batchCount: number;
	testedSampleCount: number;
	isAzopyramNegative: boolean;
	isPhenolphthaleinNegative: boolean;
	isSudanNegative?: boolean;
	isCriticalSurgical?: boolean;
}): {
	isBatchApproved: boolean;
	minSampleRequired: number;
	samplingSatisfied: boolean;
	rejectionReason: string | null;
	complianceNoteRu: string;
} {
	const { minSampleCount } = calculatePsoSampleRequirements(params.batchCount, params.isCriticalSurgical);
	const samplingSatisfied = params.testedSampleCount >= minSampleCount;

	if (!samplingSatisfied) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: false,
			rejectionReason: `Недостаточный объем выборки ПСО: проверено ${params.testedSampleCount} шт. из минимум ${minSampleCount} шт. (норма 1% по СанПиН 3.3686-21).`,
			complianceNoteRu: "Отказ: нарушение минимального объема выборочного контроля",
		};
	}

	if (!params.isAzopyramNegative) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК: Положительная азопирамовая проба (обнаружена скрытая кровь / гемоглобин). Вся партия подлежит повторной дезинфекции и предстерилизационной очистке!",
			complianceNoteRu: "Брак ПСО: обнаружены следы крови",
		};
	}

	if (!params.isPhenolphthaleinNegative) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК: Положительная фенолфталеиновая проба (остатки щелочных моющих средств). Вся партия подлежит повторному ополаскиванию дистиллированной водой!",
			complianceNoteRu: "Брак ПСО: обнаружены остатки моющего средства",
		};
	}

	if (params.isSudanNegative === false) {
		return {
			isBatchApproved: false,
			minSampleRequired: minSampleCount,
			samplingSatisfied: true,
			rejectionReason:
				"БРАК: Положительная проба с Суданом III (масляные/жировые загрязнения наконечников). Партия направляется на повторное обезжиривание!",
			complianceNoteRu: "Брак ПСО: обнаружены масляные загрязнения",
		};
	}

	return {
		isBatchApproved: true,
		minSampleRequired: minSampleCount,
		samplingSatisfied: true,
		rejectionReason: null,
		complianceNoteRu: "Партия полностью соответствует СанПиН 3.3686-21 и допущена к автоклавированию / стерилизации",
	};
}

/**
 * Генерация уникального регистрационного номера записи ПСО
 */
export function generatePsoRecordId(
	dateStr: string = new Date().toISOString().slice(0, 10),
	seq: number = Math.floor(100 + Math.random() * 900),
): string {
	const cleanDate = dateStr.replace(/[^0-9]/g, "").slice(0, 8);
	return `PSO-${cleanDate}-${seq.toString().padStart(4, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. BACTERICIDAL LAMP HOURS & FLEET ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Расчет наработки часов бактерицидных ламп и пороговых предупреждений
 */
export function calculateLampOperatingHours(
	currentOperatingHours: number,
	sessionDurationMinutes: number,
	maxHours = 8000,
): {
	sessionHours: number;
	cumulativeHoursAfterSession: number;
	remainingHours: number;
	remainingPercent: number;
	lampStatus: "normal" | "warning_replace_soon" | "expired_replace_now";
	isCritical: boolean;
	warningMessage: string | null;
} {
	const curHours = Math.max(0, Number(currentOperatingHours) || 0);
	const durationMin = Math.max(0, Number(sessionDurationMinutes) || 0);
	const sessionHours = Math.round((durationMin / 60) * 100) / 100;
	const cumulativeHoursAfterSession = Math.round((curHours + sessionHours) * 100) / 100;

	const remainingHours = Math.max(0, Math.round((maxHours - cumulativeHoursAfterSession) * 100) / 100);
	const remainingPercent = Number(
		Math.max(0, Math.min(100, (remainingHours / maxHours) * 100)).toFixed(1),
	);

	if (cumulativeHoursAfterSession >= maxHours) {
		return {
			sessionHours,
			cumulativeHoursAfterSession,
			remainingHours: 0,
			remainingPercent: 0,
			lampStatus: "expired_replace_now",
			isCritical: true,
			warningMessage: `РЕСУРС ЛАМП ПОЛНОСТЬЮ ИСЧЕРПАН (${cumulativeHoursAfterSession}/${maxHours} ч). Эксплуатация облучателя запрещена СанПиН 3.3686-21 / Р 3.5.1904-04! Бактерицидный поток УФ-излучения упал ниже нормы. Требуется немедленная замена ламп!`,
		};
	}

	if (cumulativeHoursAfterSession >= maxHours * 0.9) {
		return {
			sessionHours,
			cumulativeHoursAfterSession,
			remainingHours,
			remainingPercent,
			lampStatus: "warning_replace_soon",
			isCritical: false,
			warningMessage: `Предупреждение: выработано ${cumulativeHoursAfterSession} ч из ${maxHours} ч (${remainingPercent}% остатка). Запланируйте закупку и замену бактерицидных ламп.`,
		};
	}

	return {
		sessionHours,
		cumulativeHoursAfterSession,
		remainingHours,
		remainingPercent,
		lampStatus: "normal",
		isCritical: false,
		warningMessage: null,
	};
}

/**
 * Расчет необходимого времени обеззараживания объема помещения (Руководство Р 3.5.1904-04):
 * Формула: T = (Кратность воздухообмена × Объем помещения V) / Производительность рециркулятора Q × 60 мин
 */
export function calculateAirDecontaminationDuration(
	roomVolumeM3: number,
	productivityM3PerHour: number,
	targetEfficiencyPercent: 95 | 99 | 99.9 = 99,
): {
	requiredDurationMinutes: number;
	recommendedDurationMinutes: number;
	airExchangesCount: number;
	formulaExplanationRu: string;
} {
	const vol = Math.max(1, Number(roomVolumeM3) || 1);
	const prod = Math.max(1, Number(productivityM3PerHour) || 1);

	// Кратность воздухообмена K для достижения бактерицидной эффективности:
	// 95% (III категория) -> K = 2.3
	// 99% (II категория, терапия/ортопедия) -> K = 4.6
	// 99.9% (I категория, хирургия/операционная) -> K = 6.9
	let k = 4.6;
	if (targetEfficiencyPercent === 95) k = 2.3;
	if (targetEfficiencyPercent === 99.9) k = 6.9;

	const exactMinutes = (k * vol / prod) * 60;
	const requiredDurationMinutes = Math.ceil(exactMinutes);
	// Округление до стандартного 15-минутного интервала
	const recommendedDurationMinutes = Math.max(15, Math.ceil(requiredDurationMinutes / 15) * 15);

	return {
		requiredDurationMinutes,
		recommendedDurationMinutes,
		airExchangesCount: k,
		formulaExplanationRu: `T = (${k} × ${vol} м³ / ${prod} м³/ч) × 60 = ${requiredDurationMinutes} мин (рекомендовано ${recommendedDurationMinutes} мин)`,
	};
}

/**
 * Сводный аудит состояния парка рециркуляторов клиники
 */
export function evaluateLampFleetHealth(
	equipments: readonly {
		id: string;
		deviceBrand: string;
		roomName: string;
		totalOperatingHours: number;
		maxLampHours: number;
	}[],
): {
	totalEquipments: number;
	normalCount: number;
	warningCount: number;
	expiredCount: number;
	overallHealthStatus: "optimal" | "attention_needed" | "critical_violation";
	summaryMessageRu: string;
} {
	const totalEquipments = equipments.length;
	let normalCount = 0;
	let warningCount = 0;
	let expiredCount = 0;

	for (const eq of equipments) {
		const res = calculateLampOperatingHours(eq.totalOperatingHours, 0, eq.maxLampHours);
		if (res.lampStatus === "expired_replace_now") expiredCount++;
		else if (res.lampStatus === "warning_replace_soon") warningCount++;
		else normalCount++;
	}

	let overallHealthStatus: "optimal" | "attention_needed" | "critical_violation" = "optimal";
	let summaryMessageRu = "Все бактерицидные установки работают в штатном режиме (ресурс ламп в норме)";

	if (expiredCount > 0) {
		overallHealthStatus = "critical_violation";
		summaryMessageRu = `КРИТИЧЕСКОЕ НАРУШЕНИЕ: ${expiredCount} облучателя имеют исчерпанный ресурс ламп (>100%). Необходима немедленная замена!`;
	} else if (warningCount > 0) {
		overallHealthStatus = "attention_needed";
		summaryMessageRu = `Внимание: ${warningCount} облучателя приближаются к лимиту наработки (>90% ресурса). Запланируйте закупку ламп.`;
	}

	return {
		totalEquipments,
		normalCount,
		warningCount,
		expiredCount,
		overallHealthStatus,
		summaryMessageRu,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GENERAL CLEANING SCHEDULE & COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Расчет следующей плановой даты генеральной уборки (строго через 7 дней для стоматологических кабинетов)
 */
export function calculateNextGeneralCleaningDate(
	lastCleaningDate: string,
	roomType: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility" = "therapeutic",
): string {
	const baseDate = new Date(lastCleaningDate);
	if (Number.isNaN(baseDate.getTime())) {
		const d = new Date();
		d.setDate(d.getDate() + 7);
		return d.toISOString().slice(0, 10);
	}

	const preset = GENERAL_CLEANING_PRESETS.find((p) => p.roomType === roomType);
	const intervalDays = preset?.statutoryFrequencyDays || 7;

	const nextDate = new Date(baseDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
	return nextDate.toISOString().slice(0, 10);
}

/**
 * Проверка соблюдения графика генеральных уборок
 */
export function validateCleaningScheduleCompliance(
	scheduledDate: string,
	actualDateTime: string,
	roomType: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility" = "therapeutic",
	previousCleaningDate?: string,
): {
	isCompliant: boolean;
	daysDifference: number;
	status: "on_schedule" | "early" | "overdue" | "critical_overdue";
	statusMessageRu: string;
} {
	const sched = new Date(scheduledDate).getTime();
	const actual = new Date(actualDateTime).getTime();

	if (Number.isNaN(sched) || Number.isNaN(actual)) {
		return {
			isCompliant: false,
			daysDifference: 0,
			status: "on_schedule",
			statusMessageRu: "Некорректная дата уборки",
		};
	}

	const diffDays = Math.round((actual - sched) / (1000 * 60 * 60 * 24));

	if (diffDays <= 0) {
		return {
			isCompliant: true,
			daysDifference: diffDays,
			status: diffDays === 0 ? "on_schedule" : "early",
			statusMessageRu: diffDays === 0 ? "Уборка выполнена строго по графику" : `Уборка выполнена досрочно (на ${Math.abs(diffDays)} дн. раньше плана)`,
		};
	}

	if (diffDays <= 2) {
		return {
			isCompliant: false,
			daysDifference: diffDays,
			status: "overdue",
			statusMessageRu: `Внимание: генеральная уборка просрочена на ${diffDays} дн. (требование СанПиН: 1 раз в 7 дней)`,
		};
	}

	return {
		isCompliant: false,
		daysDifference: diffDays,
		status: "critical_overdue",
		statusMessageRu: `КРИТИЧЕСКАЯ ПРОСРОЧКА: генеральная уборка просрочена на ${diffDays} дн.! Нарушение санитарно-эпидемиологического режима.`,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DISINFECTANT STOCK & SOLUTION MATH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Расчет приготовления рабочего раствора дезинфицирующего средства
 * Формула: V(раствора) = V(концентрата) / (C% / 100)
 */
export function calculateDisinfectantSolutionMath(
	concentrateLiters: number,
	targetConcentrationPercent: number,
): {
	solutionVolumeLiters: number;
	waterVolumeLiters: number;
	activeAgentVolumeLiters: number;
	formulaRu: string;
} {
	const conc = Math.max(0.001, Number(concentrateLiters) || 0);
	const targetPct = Math.max(0.01, Number(targetConcentrationPercent) || 0.01);

	const solutionVolumeLiters = Math.round((conc / (targetPct / 100)) * 100) / 100;
	const waterVolumeLiters = Math.round(Math.max(0, solutionVolumeLiters - conc) * 100) / 100;
	const activeAgentVolumeLiters = Math.round(conc * 100) / 100;

	return {
		solutionVolumeLiters,
		waterVolumeLiters,
		activeAgentVolumeLiters,
		formulaRu: `${conc} л концентрата + ${waterVolumeLiters} л воды = ${solutionVolumeLiters} л ${targetPct}% рабочего раствора`,
	};
}

/**
 * Расчет количества концентрата, необходимого для приготовления заданного объема раствора
 */
export function calculateRequiredConcentrateForVolume(
	desiredSolutionVolumeLiters: number,
	targetConcentrationPercent: number,
): {
	concentrateLiters: number;
	concentrateMilliliters: number;
	waterLiters: number;
	formulaRu: string;
} {
	const vol = Math.max(0.1, Number(desiredSolutionVolumeLiters) || 0);
	const targetPct = Math.max(0.01, Number(targetConcentrationPercent) || 0.01);

	const concentrateLiters = Math.round((vol * (targetPct / 100)) * 1000) / 1000;
	const concentrateMilliliters = Math.round(concentrateLiters * 1000);
	const waterLiters = Math.round((vol - concentrateLiters) * 1000) / 1000;

	return {
		concentrateLiters,
		concentrateMilliliters,
		waterLiters,
		formulaRu: `Для приготовления ${vol} л ${targetPct}% раствора: ${concentrateMilliliters} мл концентрата + ${waterLiters} л воды`,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. OFFICIAL PRINTABLE HTML GENERATORS (SANPIN 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CLINIC_LEGAL: ClinicLegalInfo = {
	name: "ООО «Стоматологическая клиника ДЕНТЕ»",
	ogrn: "1027700123456",
	inn: "7701234567",
	address: "г. Москва, ул. Клиническая, д. 10",
	chiefDoctor: "Смирнов А. В.",
	headNurse: "Иванова М. П.",
};

/**
 * Генерация официального листа Журнала учета качества ПСО (Форма № 366/у)
 */
export function generatePsoJournalPrintHtml(params: {
	records: readonly PsoJournalRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
	dateRange?: { from: string; to: string } | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const range = params.dateRange
		? `Период: с ${params.dateRange.from} по ${params.dateRange.to}`
		: `Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`;

	const rowsHtml = params.records
		.map((r, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; white-space: nowrap;">${new Date(r.timestamp).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.instrumentName}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.batchItemCount}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.testedSampleCount}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.isAzopyramNegative ? "Отрицат." : "ПОЛОЖИТ. (Кровь)"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.isPhenolphthaleinNegative ? "Отрицат." : "ПОЛОЖИТ. (Щелочь)"}</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.detergentBrand || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: bold; text-align: center; color: ${r.isBatchApproved ? "#000" : "#d00"};">
					${r.isBatchApproved ? "Допущено" : "БРАК"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${r.operatorStaffFullName}<br>
					<span style="font-size: 7pt; color: #444;">${r.electronicStampVerified ? "[ЭЦП заверен]" : ""}</span>
				</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал качества ПСО (Форма № 366/у)</title>
	<style>
		@page { size: A4 landscape; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 12px; }
		.clinic-name { font-size: 11pt; font-weight: bold; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
		.subtitle { font-size: 8pt; color: #333; margin-top: 2px; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
		th { border: 1px solid #000; padding: 4px; background: #f2f2f2; font-size: 8pt; text-align: center; }
		.signatures { display: flex; justify-content: space-between; margin-top: 25px; font-size: 9pt; }
		.sign-col { width: 45%; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-name">${clinic.name}</div>
		<div style="font-size: 8pt;">ИНН ${clinic.inn} | ОГРН ${clinic.ogrn} | ${clinic.address}</div>
		<div class="title">ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/у)</div>
		<div class="subtitle">В соответствии с требованиями СанПиН 3.3686-21 «Профилактика инфекционных болезней» (раздел IV)</div>
		<div style="margin-top: 4px; font-size: 8.5pt;"><strong>${range}</strong></div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№ п/п</th>
				<th style="width: 75px;">Дата и время</th>
				<th>Наименование изделий (партия)</th>
				<th style="width: 45px;">Кол-во в партии</th>
				<th style="width: 45px;">Кол-во проб (1%)</th>
				<th style="width: 65px;">Азопирам (кровь)</th>
				<th style="width: 65px;">Фенолфталеин (щелочь)</th>
				<th>Моющее/дез. средство</th>
				<th style="width: 70px;">Результат контроля</th>
				<th style="width: 120px;">Подпись лица, проводившего пробу</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи за выбранный период отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="signatures">
		<div class="sign-col">
			Главная медицинская сестра: ________________ / ${clinic.headNurse} /
		</div>
		<div class="sign-col" style="text-align: right;">
			Главный врач: ________________ / ${clinic.chiefDoctor} /
		</div>
	</div>
</body>
</html>`;
}

/**
 * Генерация официального Журнала регистрации работы бактерицидных установок (Р 3.5.1904-04)
 */
export function generateBactericidalJournalPrintHtml(params: {
	equipment: BactericidalEquipmentRecord;
	sessions: readonly BactericidalSessionRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const eq = params.equipment;

	const rowsHtml = params.sessions
		.map((s, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.date}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.sessionStartTime} — ${s.sessionEndTime}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.durationMinutes} мин (${s.durationHours} ч)</td>
				<td style="border: 1px solid #000; padding: 4px;">
					${s.operatingMode === "continuous_presence" ? "В присутствии людей" : s.operatingMode === "pre_op_preparation" ? "Предоперационный" : s.operatingMode === "post_cleaning" ? "После генеральной уборки" : "Периодический"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.cumulativeHoursAfterSession} ч</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${s.operatorStaffFullName}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал регистрации работы бактерицидной установки — ${eq.roomName}</title>
	<style>
		@page { size: A4 portrait; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9.5pt; line-height: 1.25; color: #000; }
		.header { text-align: center; margin-bottom: 10px; }
		.title { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; }
		.passport-box { border: 1px solid #000; padding: 8px; margin-bottom: 12px; background: #fafafa; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 9pt; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8.5pt; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold;">${clinic.name}</div>
		<div class="title">ЖУРНАЛ РЕГИСТРАЦИИ И КОНТРОЛЯ РАБОТЫ БАКТЕРИЦИДНОЙ УСТАНОВКИ</div>
		<div style="font-size: 8.5pt; color: #333;">(Руководство Р 3.5.1904-04 / СанПиН 3.3686-21)</div>
	</div>

	<div class="passport-box">
		<strong>Паспортные данные установки:</strong><br>
		- Помещение: <strong>${eq.roomName}</strong> (Объем: ${eq.roomVolumeM3} м³)<br>
		- Марка / модель: <strong>${eq.deviceBrand}</strong>, Заводской номер: <strong>${eq.serialNumber}</strong><br>
		- Тип аппарата: ${eq.deviceType === "recirculator_closed" ? "Рециркулятор закрытого типа" : "Открытый облучатель"}<br>
		- Установленные лампы: ${eq.lampType} (${eq.lampCount} шт.), Паспортный ресурс: <strong>${eq.maxLampHours} часов</strong><br>
		- Текущая суммарная наработка: <strong>${eq.totalOperatingHours} часов</strong> (Остаток: ${eq.remainingLampHours} ч / ${eq.remainingLampPercent}%)
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 75px;">Дата сеанса</th>
				<th style="width: 95px;">Время вкл / выкл</th>
				<th style="width: 80px;">Длительность</th>
				<th>Режим обеззараживания</th>
				<th style="width: 90px;">Суммарная наработка</th>
				<th style="width: 110px;">Подпись оператора</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 15px; border: 1px solid #000;">Сеансы работы не зафиксированы</td></tr>'}
		</tbody>
	</table>
</body>
</html>`;
}

/**
 * Генерация Журнала проведения генеральных уборок (СанПиН 3.3686-21)
 */
export function generateGeneralCleaningJournalPrintHtml(params: {
	records: readonly GeneralCleaningJournalRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;

	const rowsHtml = params.records
		.map((r, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.scheduledDate}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${new Date(r.actualDateTime).toLocaleDateString("ru-RU")}</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.roomName}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.treatedAreaM2} м²</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.disinfectantName} (${r.solutionConcentrationPercent}%)</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.exposureTimeMinutes} мин</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.uvIrradiationMinutes} мин</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.ventilationMinutes} мин</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${r.operatorStaffFullName}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt; text-align: center;">${r.isInspectorVerified ? "Заверено" : "—"}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал проведения генеральных уборок</title>
	<style>
		@page { size: A4 landscape; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 12px; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
		th { border: 1px solid #000; padding: 4px; background: #f2f2f2; font-size: 8pt; text-align: center; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold;">${clinic.name}</div>
		<div class="title">ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК И ДЕЗИНФЕКЦИИ ПОМЕЩЕНИЙ</div>
		<div style="font-size: 8pt; color: #333;">(В соответствии с требованиями СанПиН 3.3686-21, разд. IV)</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 70px;">План дата</th>
				<th style="width: 70px;">Факт дата</th>
				<th>Наименование помещения / кабинета</th>
				<th style="width: 45px;">Площадь</th>
				<th>Дезсредство (концентрация %)</th>
				<th style="width: 50px;">Экспозиция</th>
				<th style="width: 45px;">УФ-лучи</th>
				<th style="width: 50px;">Проветривание</th>
				<th style="width: 100px;">Исполнитель</th>
				<th style="width: 75px;">Контроль</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи генеральных уборок отсутствуют</td></tr>'}
		</tbody>
	</table>
</body>
</html>`;
}

/**
 * Генерация Журнала учета получения и расходования дезинфицирующих средств (Роспотребнадзор)
 */
export function generateDisinfectantJournalPrintHtml(params: {
	records: readonly DisinfectantJournalRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;

	const rowsHtml = params.records
		.map((r, i) => {
			const isReceipt = r.operationType === "receipt";
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; white-space: nowrap;">${new Date(r.timestamp).toLocaleDateString("ru-RU")}</td>
				<td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${r.tradeName}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${isReceipt ? "#059669" : "#000"};">
					${isReceipt ? `+${r.amount} ${r.unit}` : "—"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${!isReceipt ? "#dc2626" : "#000"};">
					${!isReceipt ? `-${r.amount} ${r.unit}` : "—"}
				</td>
				<td style="border: 1px solid #000; padding: 4px;">${r.invoiceOrObjectInfo}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.solutionPreparedLiters ? `${r.solutionPreparedLiters} л (${r.concentrationPercent}%)` : "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${r.resultingStockBalance.toFixed(2)} ${r.unit}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${r.operatorStaffFullName}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал учета дезинфицирующих средств</title>
	<style>
		@page { size: A4 landscape; margin: 12mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 12px; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 8.5pt; }
		th { border: 1px solid #000; padding: 4px; background: #f2f2f2; font-size: 8pt; text-align: center; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold;">${clinic.name}</div>
		<div class="title">КНИГА УЧЕТА ПОЛУЧЕНИЯ И РАСХОДА ДЕЗИНФИЦИРУЮЩИХ СРЕДСТВ</div>
		<div style="font-size: 8pt; color: #333;">Форма утверждена Департаментом Госсанэпиднадзора Минздрава России</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 75px;">Дата</th>
				<th>Наименование дезсредства</th>
				<th style="width: 70px;">Приход</th>
				<th style="width: 70px;">Расход</th>
				<th>Накладная (поставщик) / Объект обработки</th>
				<th style="width: 80px;">Приготовлено р-ра</th>
				<th style="width: 75px;">Остаток</th>
				<th style="width: 110px;">Ответственный</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи движения дезсредств отсутствуют</td></tr>'}
		</tbody>
	</table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CSV EXPORTERS (RFC 4180 WITH UTF-8 BOM)
// ─────────────────────────────────────────────────────────────────────────────

export function exportPsoJournalToCsv(records: readonly PsoJournalRecord[]): string {
	const headers = [
		"№ п/п",
		"Дата и время",
		"Наименование инструментария",
		"Объем партии (шт)",
		"Количество проверенных (шт)",
		"Вид пробы",
		"Азопирамовая проба (кровь)",
		"Фенолфталеиновая проба (щелочь)",
		"Судановая проба (жир)",
		"Моющее средство",
		"Результат контроля",
		"Ответственное лицо",
		"ЭЦП",
	];

	const rows = records.map((r, i) => [
		(i + 1).toString(),
		`"${r.timestamp}"`,
		`"${r.instrumentName}"`,
		r.batchItemCount.toString(),
		r.testedSampleCount.toString(),
		`"${r.testType}"`,
		r.isAzopyramNegative ? "Отрицательная" : "Положительная",
		r.isPhenolphthaleinNegative ? "Отрицательная" : "Положительная",
		r.isSudanNegative ? "Отрицательная" : "Положительная",
		`"${r.detergentBrand || ""}"`,
		r.isBatchApproved ? "Допущено" : "Брак",
		`"${r.operatorStaffFullName}"`,
		r.electronicStampVerified ? "Да" : "Нет",
	]);

	const content = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${content}`;
}

export function exportBactericidalJournalToCsv(sessions: readonly BactericidalSessionRecord[]): string {
	const headers = [
		"№ п/п",
		"Дата сеанса",
		"Кабинет",
		"Марка аппарата",
		"Время включения",
		"Время выключения",
		"Длительность (мин)",
		"Длительность (ч)",
		"Режим работы",
		"Наработка после сеанса (ч)",
		"Ответственный",
	];

	const rows = sessions.map((s, i) => [
		(i + 1).toString(),
		s.date,
		`"${s.roomName}"`,
		`"${s.deviceBrand}"`,
		s.sessionStartTime,
		s.sessionEndTime,
		s.durationMinutes.toString(),
		s.durationHours.toFixed(2),
		`"${s.operatingMode}"`,
		s.cumulativeHoursAfterSession.toString(),
		`"${s.operatorStaffFullName}"`,
	]);

	const content = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${content}`;
}

export function exportGeneralCleaningJournalToCsv(records: readonly GeneralCleaningJournalRecord[]): string {
	const headers = [
		"№ п/п",
		"Плановая дата",
		"Фактическая дата",
		"Помещение",
		"Площадь (м2)",
		"Дезсредство",
		"Концентрация (%)",
		"Экспозиция (мин)",
		"УФ-лучи (мин)",
		"Проветривание (мин)",
		"Исполнитель",
		"Статус",
	];

	const rows = records.map((r, i) => [
		(i + 1).toString(),
		r.scheduledDate,
		r.actualDateTime,
		`"${r.roomName}"`,
		r.treatedAreaM2.toString(),
		`"${r.disinfectantName}"`,
		r.solutionConcentrationPercent.toString(),
		r.exposureTimeMinutes.toString(),
		r.uvIrradiationMinutes.toString(),
		r.ventilationMinutes.toString(),
		`"${r.operatorStaffFullName}"`,
		`"${r.status}"`,
	]);

	const content = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${content}`;
}

export function exportDisinfectantJournalToCsv(records: readonly DisinfectantJournalRecord[]): string {
	const headers = [
		"№ п/п",
		"Дата и время",
		"Вид операции",
		"Наименование дезсредства",
		"Количество",
		"Ед. изм.",
		"Накладная / Объект обработки",
		"Объем приготовленного р-ра (л)",
		"Концентрация (%)",
		"Остаток",
		"Ответственный",
	];

	const rows = records.map((r, i) => [
		(i + 1).toString(),
		r.timestamp,
		r.operationType === "receipt" ? "Приход" : "Расход",
		`"${r.tradeName}"`,
		r.amount.toString(),
		r.unit,
		`"${r.invoiceOrObjectInfo}"`,
		(r.solutionPreparedLiters || 0).toString(),
		(r.concentrationPercent || 0).toString(),
		r.resultingStockBalance.toFixed(2),
		`"${r.operatorStaffFullName}"`,
	]);

	const content = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${content}`;
}
