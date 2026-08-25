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
	readonly licenseNumber?: string | undefined;
	readonly volumeNumber?: number | string | undefined;
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
	licenseNumber: "№ ЛО41-01137-77/00368421",
	volumeNumber: 1,
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

// ─────────────────────────────────────────────────────────────────────────────
// 6. TEMPERATURE & HUMIDITY MONITORING (ORDER 706n / 646n)
// ─────────────────────────────────────────────────────────────────────────────

export interface TemperatureHumidityLogRecord {
	readonly id: string;
	readonly measurementDate: string;
	readonly measurementPeriod: "morning" | "evening" | string;
	readonly equipmentName: string;
	readonly equipmentType?: string | undefined;
	readonly location: string;
	readonly meterDeviceName: string;
	readonly meterSerialNumber?: string | undefined;
	readonly temperatureCelsius: number;
	readonly relativeHumidityPercent?: number | undefined;
	readonly targetTempMinCelsius: number;
	readonly targetTempMaxCelsius: number;
	readonly isWithinNorm: boolean;
	readonly deviationReason?: string | undefined;
	readonly correctiveAction?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly notes?: string | undefined;
}

export function exportTemperatureHumidityJournalToCsv(records: readonly TemperatureHumidityLogRecord[]): string {
	const headers = [
		"ID",
		"Дата замера",
		"Период",
		"Объект контроля",
		"Место установки",
		"Прибор учета",
		"Фактическая T° (°C)",
		"Влажность (%)",
		"Норматив T° (°C)",
		"В пределах нормы",
		"Причина отклонения / Меры",
		"Ответственный",
		"Примечания",
	];

	const rows = records.map((r) => [
		`"${r.id}"`,
		`"${r.measurementDate}"`,
		`"${r.measurementPeriod === "morning" ? "Утро (09:00)" : r.measurementPeriod === "evening" ? "Вечер (18:00)" : r.measurementPeriod}"`,
		`"${r.equipmentName}"`,
		`"${r.location}"`,
		`"${r.meterSerialNumber ? `${r.meterDeviceName} (№${r.meterSerialNumber})` : r.meterDeviceName}"`,
		`"${r.temperatureCelsius}"`,
		`"${r.relativeHumidityPercent !== undefined && r.relativeHumidityPercent !== null ? r.relativeHumidityPercent : ""}"`,
		`"${r.targetTempMinCelsius}..${r.targetTempMaxCelsius}"`,
		`"${r.isWithinNorm ? "ДА" : "ОТКЛОНЕНИЕ"}"`,
		`"${r.correctiveAction || r.deviationReason || ""}"`,
		`"${r.operatorStaffFullName}"`,
		`"${r.notes || ""}"`,
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}

export function generateTemperatureHumidityJournalPrintHtml(params: {
	records: readonly TemperatureHumidityLogRecord[];
	clinicInfo?: ClinicLegalInfo | undefined;
	periodLabelRu?: string | undefined;
}): string {
	const clinic = params.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const period = params.periodLabelRu || `Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`;

	const rowsHtml = params.records
		.map((r, i) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.measurementDate}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.measurementPeriod === "morning" ? "Утро (09:00)" : r.measurementPeriod === "evening" ? "Вечер (18:00)" : r.measurementPeriod}</td>
				<td style="border: 1px solid #000; padding: 4px;">
					<strong>${r.equipmentName}</strong><br>
					<span style="font-size: 7.5pt; color: #444;">${r.location} (Прибор: ${r.meterDeviceName}${r.meterSerialNumber ? ` №${r.meterSerialNumber}` : ""})</span>
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isWithinNorm ? "#000" : "#dc2626"};">
					${r.temperatureCelsius}°C
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">
					${r.relativeHumidityPercent !== undefined && r.relativeHumidityPercent !== null ? `${r.relativeHumidityPercent}%` : "—"}
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-size: 8pt;">
					${r.targetTempMinCelsius}..${r.targetTempMaxCelsius}°C
				</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isWithinNorm ? "#059669" : "#dc2626"};">
					${r.isWithinNorm ? "Норма" : "ОТКЛОНЕНИЕ"}
					${r.correctiveAction ? `<br><span style="font-size: 7pt; font-weight: normal; color: #dc2626;">${r.correctiveAction}</span>` : ""}
				</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
					${r.operatorStaffFullName}
				</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Журнал регистрации температурного режима холодильников (Приказ 706н)</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 8.5pt; line-height: 1.2; color: #000; }
		.header { text-align: center; margin-bottom: 8px; }
		.clinic-name { font-size: 11pt; font-weight: bold; }
		.title { font-size: 11.5pt; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
		.subtitle { font-size: 8pt; color: #333; }
		table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 8pt; }
		th { border: 1px solid #000; padding: 4px 2px; background: #f2f2f2; font-size: 7.5pt; text-align: center; font-weight: bold; }
		.signatures { display: flex; justify-content: space-between; margin-top: 20px; font-size: 8.5pt; }
		.sign-col { width: 45%; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-name">${clinic.name}</div>
		<div style="font-size: 7.5pt;">ИНН ${clinic.inn} | ОГРН ${clinic.ogrn} | Лицензия ${clinic.licenseNumber || "№ ЛО41-01137-77/00368421"} | ${clinic.address}</div>
		<div class="title">ЖУРНАЛ РЕГИСТРАЦИИ ТЕМПЕРАТУРНОГО РЕЖИМА И ВЛАЖНОСТИ В ХОЛОДИЛЬНИКАХ И ЗОНАХ ХРАНЕНИЯ ЛЕКАРСТВЕННЫХ СРЕДСТВ</div>
		<div class="subtitle">(Приказ Минздравсоцразвития РФ № 706н / Приказ Минздрава РФ № 646н • ${period})</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 25px;">№</th>
				<th style="width: 70px;">Дата</th>
				<th style="width: 75px;">Период</th>
				<th>Объект контроля (холодильник, место, прибор)</th>
				<th style="width: 60px;">Факт T°</th>
				<th style="width: 60px;">Влажность</th>
				<th style="width: 70px;">Норма T°</th>
				<th style="width: 90px;">Результат контроля</th>
				<th style="width: 110px;">Ответственное лицо</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 15px; border: 1px solid #000;">Записи температурного режима отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="signatures">
		<div class="sign-col">
			Ответственное лицо: ________________ / ${clinic.headNurse} /
		</div>
		<div class="sign-col" style="text-align: right;">
			Главный врач: ________________ / ${clinic.chiefDoctor} /
		</div>
	</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CONSOLIDATED PRODUCTION CONTROL JOURNAL BINDER (ROSPOTREBNADZOR DOSSIER)
// ─────────────────────────────────────────────────────────────────────────────

export interface ChamberPointEvaluation {
	readonly pointIndex: 1 | 2 | 3 | 4 | 5;
	readonly code: string;
	readonly nameRu: string;
	readonly indicatorId: string;
	readonly indicatorTradeNameRu: string;
	readonly status: "passed" | "failed" | "untested";
	readonly initialColorRu: string;
	readonly actualColorRu: string;
	readonly notes?: string | undefined;
}

export interface Form257Record {
	readonly id: string;
	readonly date: string;
	readonly cycleNumber: number;
	readonly sterilizerId: string;
	readonly sterilizerCode: string;
	readonly sterilizerBrandModel: string;
	readonly sterilizerSerialNumber: string;
	readonly regimeId: string;
	readonly regimeNameRu: string;
	readonly targetTemperatureCelsius: number;
	readonly targetPressureBar: number;
	readonly targetExposureMinutes: number;
	readonly actualTemperatureCelsius: number;
	readonly actualPressureBar: number;
	readonly actualExposureMinutes: number;
	readonly itemsDescriptionRu: string;
	readonly packsCount: number;
	readonly packagingType: string;
	readonly packagingNameRu: string;
	readonly shelfLifeDays: number;
	readonly chamberPoints: readonly ChamberPointEvaluation[];
	readonly areAllPointsPassed: boolean;
	readonly chemicalIndicatorNameRu: string;
	readonly bioTestId?: string | undefined;
	readonly bioTestResult?: "sterile_passed" | "growth_failed" | "pending" | undefined;
	readonly isCyclePassed: boolean;
	readonly status: "sterile_passed" | "rejected_defect" | "quarantine";
	readonly rejectionReason?: string | undefined;
	readonly operatorStaffFullName: string;
	readonly operatorStaffPosition: string;
	readonly headNurseSignatureFullName?: string | undefined;
	readonly isHeadNurseVerified: boolean;
	readonly verificationTimestamp?: string | undefined;
	readonly digitalStampHash: string;
	readonly notes?: string | undefined;
	readonly createdAt: string;
}

export interface ConsolidatedSanpinJournalData {
	readonly clinicInfo?: ClinicLegalInfo | undefined;
	readonly periodLabelRu?: string | undefined;
	readonly dateRange?: { readonly from: string; readonly to: string } | undefined;
	readonly volumeNumber?: number | string | undefined;
	readonly totalPagesCount?: number | undefined;
	// Раздел 1: Журнал предстерилизационной очистки (Форма № 366/у)
	readonly psoRecords: readonly PsoJournalRecord[];
	// Раздел 2: Журнал работы стерилизаторов (Форма № 257/у)
	readonly form257Records: readonly Form257Record[];
	// Раздел 3: Журнал бактерицидных установок и генеральных уборок
	readonly bactericidalSessions: readonly BactericidalSessionRecord[];
	readonly bactericidalEquipments?: readonly BactericidalEquipmentRecord[] | undefined;
	readonly generalCleanings: readonly GeneralCleaningJournalRecord[];
	// Раздел 4: Журнал температурного режима холодильников
	readonly temperatureLogs: readonly TemperatureHumidityLogRecord[];
}

export function numberToRussianWords(num: number): string {
	const n = Math.max(0, Math.floor(num));
	if (n === 0) return "ноль";

	const units = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const teens = [
		"десять",
		"одиннадцать",
		"двенадцать",
		"тринадцать",
		"четырнадцать",
		"пятнадцать",
		"шестнадцать",
		"семнадцать",
		"восемнадцать",
		"девятнадцать",
	];
	const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
	const hundreds = [
		"",
		"сто",
		"двести",
		"триста",
		"четыреста",
		"пятьсот",
		"шестьсот",
		"семьсот",
		"восемьсот",
		"девятьсот",
	];

	if (n < 10) return units[n]!;
	if (n < 20) return teens[n - 10]!;
	if (n < 100) {
		const ten = Math.floor(n / 10);
		const unit = n % 10;
		return unit === 0 ? tens[ten]! : `${tens[ten]} ${units[unit]}`;
	}
	if (n < 1000) {
		const hundred = Math.floor(n / 100);
		const rest = n % 100;
		if (rest === 0) return hundreds[hundred]!;
		return `${hundreds[hundred]} ${numberToRussianWords(rest)}`;
	}

	const thousands = Math.floor(n / 1000);
	const rest = n % 1000;
	let thousandWord = "тысяч";
	if (thousands % 10 === 1 && thousands % 100 !== 11) thousandWord = "тысяча";
	else if (thousands % 10 >= 2 && thousands % 10 <= 4 && (thousands % 100 < 10 || thousands % 100 >= 20))
		thousandWord = "тысячи";

	let thousandPrefix = numberToRussianWords(thousands);
	if (thousands % 10 === 1 && thousands % 100 !== 11) thousandPrefix = thousandPrefix.replace(/один$/, "одна");
	if (thousands % 10 === 2 && thousands % 100 !== 12) thousandPrefix = thousandPrefix.replace(/два$/, "две");

	if (rest === 0) return `${thousandPrefix} ${thousandWord}`;
	return `${thousandPrefix} ${thousandWord} ${numberToRussianWords(rest)}`;
}

export function formatRussianSheetsCount(count: number): {
	readonly count: number;
	readonly countInWords: string;
	readonly declensionRu: string;
	readonly formattedRu: string;
} {
	const n = Math.max(1, Math.floor(Number(count) || 1));
	const countInWords = numberToRussianWords(n);
	const mod10 = n % 10;
	const mod100 = n % 100;

	let declensionRu = "листов";
	if (mod10 === 1 && mod100 !== 11) {
		declensionRu = "лист";
	} else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
		declensionRu = "листа";
	}

	return {
		count: n,
		countInWords,
		declensionRu,
		formattedRu: `${n} (${countInWords}) ${declensionRu}`,
	};
}

/**
 * Генератор сшива журналов «Сводный журнал производственного контроля СанПиН за период» (А4 Альбомная):
 * - Титульный лист с реквизитами клиники, лицензии № ЛО41-01137-77/00368421, номером тома и подписью главного врача;
 * - Раздел 1: Журнал предстерилизационной очистки (Форма № 366/у);
 * - Раздел 2: Журнал работы стерилизаторов (Форма № 257/у);
 * - Раздел 3: Журнал бактерицидных установок и генеральных уборок;
 * - Раздел 4: Журнал температурного режима холодильников;
 * - Лист сшива и заверения («В настоящем журнале пронумеровано, прошнуровано и скреплено печатью X листов»).
 */
export function generateSanpinConsolidatedInspectionHtml(data: ConsolidatedSanpinJournalData): string {
	const clinic = data.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const license = clinic.licenseNumber || "№ ЛО41-01137-77/00368421";
	const volume = data.volumeNumber || clinic.volumeNumber || 1;
	const periodLabel = data.periodLabelRu
		? data.periodLabelRu
		: data.dateRange
			? `с ${data.dateRange.from} по ${data.dateRange.to}`
			: `за текущий отчетный период (${new Date().toLocaleDateString("ru-RU")})`;

	// Calculate sheet count if not explicitly given
	const psoSheets = Math.max(1, Math.ceil(data.psoRecords.length / 14));
	const f257Sheets = Math.max(1, Math.ceil(data.form257Records.length / 10));
	const bacSheets = Math.max(1, Math.ceil(data.bactericidalSessions.length / 14));
	const cleanSheets = Math.max(1, Math.ceil(data.generalCleanings.length / 12));
	const tempSheets = Math.max(1, Math.ceil(data.temperatureLogs.length / 14));
	const computedTotalSheets = 1 + psoSheets + f257Sheets + bacSheets + cleanSheets + tempSheets + 1;
	const totalSheets = data.totalPagesCount || computedTotalSheets;
	const sheetsFormatted = formatRussianSheetsCount(totalSheets);

	// Section 1: PSO rows
	const psoRowsHtml = data.psoRecords
		.map((r, i) => `<tr>
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
		</tr>`)
		.join("\n");

	// Section 2: Form 257 rows
	const f257RowsHtml = data.form257Records
		.map((rec, index) => {
			const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "+" : "-";
			const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "+" : "-";
			const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "+" : "-";
			const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "+" : "-";
			const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "+" : "-";
			const verdictLabel = rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК";

			return `<tr>
				<td style="border: 1px solid #000; text-align:center; font-weight:600;">${index + 1}</td>
				<td style="border: 1px solid #000; text-align:center; white-space:nowrap;">
					${rec.date}<br/>
					<span style="font-size:7.5pt; color:#475569;">Цикл №${rec.cycleNumber}</span>
				</td>
				<td style="border: 1px solid #000;">
					<strong>${rec.sterilizerCode}</strong> (${rec.sterilizerBrandModel})<br/>
					<span style="font-size:7pt; color:#64748b;">Зав. № ${rec.sterilizerSerialNumber}</span>
				</td>
				<td style="border: 1px solid #000;">${rec.itemsDescriptionRu}</td>
				<td style="border: 1px solid #000; text-align:center;">
					${rec.packsCount}<br/>
					<span style="font-size:7pt; color:#64748b;">${rec.packagingNameRu}</span>
				</td>
				<td style="border: 1px solid #000; text-align:center; white-space:nowrap;">
					${rec.actualTemperatureCelsius}°C / ${rec.actualPressureBar} бар<br/>
					<strong>${rec.actualExposureMinutes} мин</strong>
				</td>
				<td style="border: 1px solid #000; font-size:7.5pt;">
					${rec.chemicalIndicatorNameRu}<br/>
					<span style="font-family:monospace; font-weight:bold;">КТ: [${pt1}][${pt2}][${pt3}][${pt4}][${pt5}]</span>
				</td>
				<td style="border: 1px solid #000; text-align:center; font-weight:bold; color:${rec.isCyclePassed ? "#000" : "#d00"};">
					${verdictLabel}
					${rec.rejectionReason ? `<br/><span style="font-size:7pt; font-weight:normal; color:#dc2626;">${rec.rejectionReason}</span>` : ""}
				</td>
				<td style="border: 1px solid #000; font-size:7.5pt;">
					${rec.operatorStaffFullName}<br/>
					<span style="font-size:6.5pt; color:#64748b;">${rec.operatorStaffPosition}</span>
				</td>
				<td style="border: 1px solid #000; font-size:7pt; text-align:center;">
					${rec.isHeadNurseVerified ? `<strong style="color:#059669;">Заверено</strong><br/>${rec.headNurseSignatureFullName || ""}` : "—"}
				</td>
			</tr>`;
		})
		.join("\n");

	// Section 3.1: Bactericidal sessions
	const bacRowsHtml = data.bactericidalSessions
		.map((s, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.date}</td>
			<td style="border: 1px solid #000; padding: 4px;"><strong>${s.roomName}</strong> (${s.deviceBrand})</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${s.sessionStartTime} — ${s.sessionEndTime}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.durationMinutes} мин (${s.durationHours} ч)</td>
			<td style="border: 1px solid #000; padding: 4px;">
				${s.operatingMode === "continuous_presence" ? "В присутствии людей" : s.operatingMode === "pre_op_preparation" ? "Предоперационный" : s.operatingMode === "post_cleaning" ? "После генеральной уборки" : "Периодический"}
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold;">${s.cumulativeHoursAfterSession} ч</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${s.operatorStaffFullName}</td>
		</tr>`)
		.join("\n");

	// Section 3.2: General cleaning rows
	const cleanRowsHtml = data.generalCleanings
		.map((r, i) => `<tr>
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
		</tr>`)
		.join("\n");

	// Section 4: Temperature logs
	const tempRowsHtml = data.temperatureLogs
		.map((r, i) => `<tr>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.measurementDate}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.measurementPeriod === "morning" ? "Утро (09:00)" : r.measurementPeriod === "evening" ? "Вечер (18:00)" : r.measurementPeriod}</td>
			<td style="border: 1px solid #000; padding: 4px;">
				<strong>${r.equipmentName}</strong><br>
				<span style="font-size: 7.5pt; color: #444;">${r.location} (Прибор: ${r.meterDeviceName}${r.meterSerialNumber ? ` №${r.meterSerialNumber}` : ""})</span>
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isWithinNorm ? "#000" : "#dc2626"};">
				${r.temperatureCelsius}°C
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">
				${r.relativeHumidityPercent !== undefined && r.relativeHumidityPercent !== null ? `${r.relativeHumidityPercent}%` : "—"}
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-size: 8pt;">
				${r.targetTempMinCelsius}..${r.targetTempMaxCelsius}°C
			</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; color: ${r.isWithinNorm ? "#059669" : "#dc2626"};">
				${r.isWithinNorm ? "Норма" : "ОТКЛОНЕНИЕ"}
				${r.correctiveAction ? `<br><span style="font-size: 7pt; font-weight: normal; color: #dc2626;">${r.correctiveAction}</span>` : ""}
			</td>
			<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">
				${r.operatorStaffFullName}
			</td>
		</tr>`)
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Сводный журнал производственного контроля СанПиН (Том №${volume}) — ${clinic.name}</title>
	<style>
		@page {
			size: A4 landscape;
			margin: 12mm 10mm 12mm 10mm;
			@bottom-right {
				content: "Том №${volume} • Лист " counter(page);
				font-family: 'Times New Roman', serif;
				font-size: 8pt;
			}
		}
		body {
			font-family: 'Times New Roman', Times, serif;
			font-size: 8.5pt;
			line-height: 1.2;
			color: #000;
			background: #fff;
			margin: 0;
			padding: 0;
		}
		.page-break {
			page-break-after: always;
			break-after: page;
		}
		.cover-page {
			height: 175mm;
			display: flex;
			flex-direction: column;
			justify-content: space-between;
			border: 2px double #000;
			padding: 12mm;
			box-sizing: border-box;
			text-align: center;
		}
		.cover-gov {
			font-size: 9pt;
			text-transform: uppercase;
			letter-spacing: 0.5px;
			font-weight: bold;
			border-bottom: 1px solid #000;
			padding-bottom: 4px;
			margin-bottom: 8px;
		}
		.cover-clinic {
			font-size: 13pt;
			font-weight: bold;
			margin-top: 4px;
		}
		.cover-legal {
			font-size: 8.5pt;
			color: #222;
			margin-top: 2px;
		}
		.cover-license-badge {
			display: inline-block;
			border: 1px solid #000;
			padding: 3px 10px;
			font-weight: bold;
			font-size: 9pt;
			margin-top: 6px;
			background: #fbfbfb;
		}
		.cover-main-title {
			font-size: 16pt;
			font-weight: bold;
			text-transform: uppercase;
			letter-spacing: 1px;
			margin: 14px 0 6px 0;
			line-height: 1.25;
		}
		.cover-volume {
			font-size: 14pt;
			font-weight: bold;
			color: #000;
			margin: 6px 0;
		}
		.cover-period {
			font-size: 10.5pt;
			font-weight: 600;
			margin-top: 4px;
		}
		.cover-subrules {
			font-size: 8.5pt;
			color: #333;
			max-width: 80%;
			margin: 6px auto;
		}
		.cover-approvals {
			display: flex;
			justify-content: space-between;
			text-align: left;
			font-size: 9pt;
			margin-top: 15px;
			padding: 0 10px;
		}
		.cover-footer-city {
			font-size: 9.5pt;
			font-weight: bold;
			margin-top: 10px;
		}
		.section-header {
			text-align: center;
			margin-bottom: 8px;
			border-bottom: 1px solid #000;
			padding-bottom: 4px;
		}
		.section-number {
			font-size: 9pt;
			font-weight: bold;
			color: #444;
			text-transform: uppercase;
		}
		.section-title {
			font-size: 11.5pt;
			font-weight: bold;
			text-transform: uppercase;
			margin: 2px 0;
		}
		.section-legal-ref {
			font-size: 7.5pt;
			color: #333;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 6px;
			font-size: 8pt;
		}
		th {
			border: 1px solid #000;
			padding: 4px 2px;
			background: #f2f2f2;
			font-size: 7.5pt;
			text-align: center;
			font-weight: bold;
		}
		td {
			border: 1px solid #000;
			padding: 3px 2px;
		}
		.cert-sheet-container {
			height: 175mm;
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
			box-sizing: border-box;
		}
		.cert-sheet-box {
			width: 190mm;
			border: 2px solid #000;
			padding: 15mm;
			text-align: center;
			background: #fafafa;
			box-shadow: inset 0 0 0 1px #000;
		}
		.cert-title {
			font-size: 13pt;
			font-weight: bold;
			text-transform: uppercase;
			letter-spacing: 1px;
			margin-bottom: 15px;
			border-bottom: 1px solid #000;
			padding-bottom: 6px;
		}
		.cert-statement {
			font-size: 11pt;
			line-height: 1.6;
			margin: 15px 0 25px 0;
			text-align: justify;
		}
		.cert-signatures {
			display: flex;
			justify-content: space-between;
			margin-top: 25px;
			font-size: 9.5pt;
			text-align: left;
		}
		.stamp-place {
			display: inline-block;
			border: 1px dashed #555;
			padding: 10px 18px;
			font-size: 8.5pt;
			color: #444;
			font-weight: bold;
			margin-top: 15px;
		}
	</style>
</head>
<body>

	<!-- ===================================================================== -->
	<!-- 1. ТИТУЛЬНЫЙ ЛИСТ С РЕКВИЗИТАМИ И ЛИЦЕНЗИЕЙ (COVER PAGE)               -->
	<!-- ===================================================================== -->
	<div class="cover-page">
		<div>
			<div class="cover-gov">МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ • ОРГАНЫ ГОСУДАРСТВЕННОГО САНИТАРНО-ЭПИДЕМИОЛОГИЧЕСКОГО НАДЗОРА</div>
			<div class="cover-clinic">${clinic.name}</div>
			<div class="cover-legal">ИНН: ${clinic.inn} | ОГРН: ${clinic.ogrn} | Адрес: ${clinic.address}</div>
			<div class="cover-license-badge">Лицензия на медицинскую деятельность: ${license}</div>
		</div>

		<div>
			<div class="cover-main-title">
				СВОДНЫЙ ЖУРНАЛ ПРОИЗВОДСТВЕННОГО КОНТРОЛЯ<br>
				СОБЛЮДЕНИЯ САНИТАРНО-ПРОТИВОЭПИДЕМИЧЕСКОГО РЕЖИМА
			</div>
			<div class="cover-volume">ТОМ № ${volume}</div>
			<div class="cover-period">Отчетный период: <strong>${periodLabel}</strong></div>
			<div class="cover-subrules">
				В соответствии с требованиями Федерального закона № 52-ФЗ «О санитарно-эпидемиологическом благополучии населения»,
				СанПиН 3.3686-21, СанПиН 2.1.3684-21, Приказа Минздравсоцразвития РФ № 706н и Приказа Минздрава РФ № 646н.
			</div>
		</div>

		<div>
			<div class="cover-approvals">
				<div style="width: 48%;">
					<strong>УТВЕРЖДАЮ:</strong><br>
					Главный врач клиники<br>
					___________________ / ${clinic.chiefDoctor} /<br>
					<span style="font-size: 8pt; color: #444;">«___» ____________ 2026 г. [ М.П. ]</span>
				</div>
				<div style="width: 48%; text-align: right;">
					<strong>ОТВЕТСТВЕННЫЙ ЗА КОНТРОЛЬ:</strong><br>
					Главная медицинская сестра<br>
					___________________ / ${clinic.headNurse} /<br>
					<span style="font-size: 8pt; color: #444;">«___» ____________ 2026 г.</span>
				</div>
			</div>
			<div class="cover-footer-city">г. Москва, 2026 год</div>
		</div>
	</div>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 2. РАЗДЕЛ 1: ЖУРНАЛ ПСО (ФОРМА № 366/у)                                -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 1 • СанПиН 3.3686-21 (п. 3584)</div>
		<div class="section-title">ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/у)</div>
		<div class="section-legal-ref">Азопирамовая, фенолфталеиновая и масляная пробы (выборка 1% от партии изделий, не менее 3–5 единиц) • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 75px;">Дата и время</th>
				<th>Наименование изделий (партия)</th>
				<th style="width: 40px;">В партии</th>
				<th style="width: 40px;">Проб</th>
				<th style="width: 65px;">Азопирам (кровь)</th>
				<th style="width: 65px;">Фенолфталеин</th>
				<th>Моющее / дез. средство</th>
				<th style="width: 65px;">Результат</th>
				<th style="width: 105px;">Исполнитель / ЭЦП</th>
			</tr>
		</thead>
		<tbody>
			${psoRowsHtml || '<tr><td colspan="10" style="text-align: center; padding: 15px;">Записи за отчетный период отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 3. РАЗДЕЛ 2: ЖУРНАЛ РАБОТЫ СТЕРИЛИЗАТОРОВ (ФОРМА № 257/у)             -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 2 • СанПиН 3.3686-21 (п. 3624, Таблица 3.13)</div>
		<div class="section-title">ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ (ФОРМА № 257/у)</div>
		<div class="section-legal-ref">Физический, химический (5 точек камеры КТ 1–5) и бактериологический контроль стерилизации • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 65px;">Дата / Цикл</th>
				<th style="width: 110px;">Стерилизатор (марка, №)</th>
				<th>Стерилизуемые изделия</th>
				<th style="width: 65px;">Кол-во / Упаковка</th>
				<th style="width: 75px;">Режим (T°, P, время)</th>
				<th style="width: 110px;">Индикаторы (5 точек)</th>
				<th style="width: 65px;">Результат</th>
				<th style="width: 85px;">Оператор ЦСО</th>
				<th style="width: 70px;">Заверка</th>
			</tr>
		</thead>
		<tbody>
			${f257RowsHtml || '<tr><td colspan="10" style="text-align:center; padding:15px;">Записи циклов стерилизации отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 4. РАЗДЕЛ 3: БАКТЕРИЦИДНЫЕ УСТАНОВКИ И ГЕНЕРАЛЬНЫЕ УБОРКИ              -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 3 • Часть 1 • Руководство Р 3.5.1904-04 / СанПиН 3.3686-21</div>
		<div class="section-title">ЖУРНАЛ РЕГИСТРАЦИИ И КОНТРОЛЯ РАБОТЫ БАКТЕРИЦИДНЫХ УСТАНОВОК</div>
		<div class="section-legal-ref">Учет наработки часов ультрафиолетовых ламп и режимов обеззараживания воздуха помещений • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 65px;">Дата</th>
				<th>Помещение и марка аппарата</th>
				<th style="width: 85px;">Время вкл/выкл</th>
				<th style="width: 75px;">Длительность</th>
				<th>Режим обеззараживания</th>
				<th style="width: 75px;">Наработка</th>
				<th style="width: 100px;">Оператор</th>
			</tr>
		</thead>
		<tbody>
			${bacRowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 15px;">Сеансы работы установок отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div style="margin-top: 12px;" class="section-header">
		<div class="section-number">Раздел 3 • Часть 2 • СанПиН 3.3686-21 (раздел IV)</div>
		<div class="section-title">ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК И ЗАКЛЮЧИТЕЛЬНОЙ ДЕЗИНФЕКЦИИ</div>
		<div class="section-legal-ref">График 1 раз в 7 дней для клинических кабинетов и ЦСО • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 65px;">План</th>
				<th style="width: 65px;">Факт</th>
				<th>Помещение / Кабинет</th>
				<th style="width: 40px;">Площадь</th>
				<th>Дезсредство (%)</th>
				<th style="width: 45px;">Эксп.</th>
				<th style="width: 40px;">УФ</th>
				<th style="width: 45px;">Проветр.</th>
				<th style="width: 90px;">Исполнитель</th>
				<th style="width: 60px;">Контроль</th>
			</tr>
		</thead>
		<tbody>
			${cleanRowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 15px;">Записи генеральных уборок отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 5. РАЗДЕЛ 4: ТЕМПЕРАТУРНЫЙ РЕЖИМ ХОЛОДИЛЬНИКОВ (ПРИКАЗ 706н)           -->
	<!-- ===================================================================== -->
	<div class="section-header">
		<div class="section-number">Раздел 4 • Приказ Минздравсоцразвития РФ № 706н / Приказ Минздрава РФ № 646н</div>
		<div class="section-title">ЖУРНАЛ РЕГИСТРАЦИИ ТЕМПЕРАТУРНОГО РЕЖИМА И ВЛАЖНОСТИ В ХОЛОДИЛЬНИКАХ</div>
		<div class="section-legal-ref">Ежедневный двукратный контроль условий хранения лекарственных средств и термолабильных препаратов • ${clinic.name}</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 20px;">№</th>
				<th style="width: 70px;">Дата</th>
				<th style="width: 75px;">Период</th>
				<th>Объект контроля (холодильник, место, прибор)</th>
				<th style="width: 60px;">Факт T°</th>
				<th style="width: 55px;">Влажность</th>
				<th style="width: 70px;">Норма T°</th>
				<th style="width: 85px;">Результат</th>
				<th style="width: 105px;">Ответственный</th>
			</tr>
		</thead>
		<tbody>
			${tempRowsHtml || '<tr><td colspan="9" style="text-align: center; padding: 15px;">Записи температурного режима отсутствуют</td></tr>'}
		</tbody>
	</table>

	<div class="page-break"></div>

	<!-- ===================================================================== -->
	<!-- 6. ЛИСТ СШИВА И ЗАВЕРЕНИЯ ТОМА (CERTIFICATION SHEET)                   -->
	<!-- ===================================================================== -->
	<div class="cert-sheet-container">
		<div class="cert-sheet-box">
			<div class="cert-title">ЗАВЕРИТЕЛЬНАЯ НАДПИСЬ СШИВА ТОМА № ${volume}</div>
			<div class="cert-statement">
				В настоящем Сводном журнале производственного контроля соблюдения санитарно-противоэпидемического режима
				(СанПиН 3.3686-21, СанПиН 2.1.3684-21, Приказ 706н) за период <strong>${periodLabel}</strong><br><br>
				пронумеровано, прошнуровано и скреплено оттиском печати:<br><br>
				<span style="font-size: 14pt; font-weight: bold; text-decoration: underline;">
					${sheetsFormatted.formattedRu}
				</span>
			</div>

			<div class="cert-signatures">
				<div style="width: 48%;">
					Главный врач клиники:<br><br>
					___________________ / ${clinic.chiefDoctor} /
				</div>
				<div style="width: 48%; text-align: right;">
					Главная медицинская сестра:<br><br>
					___________________ / ${clinic.headNurse} /
				</div>
			</div>

			<div style="margin-top: 20px;">
				<div class="stamp-place">
					МЕСТО ДЛЯ ОТТИСКА ПЕЧАТИ [ М.П. ]
				</div>
			</div>

			<div style="margin-top: 15px; font-size: 8pt; color: #444;">
				Медицинская организация: ${clinic.name} (ИНН: ${clinic.inn}, ОГРН: ${clinic.ogrn})<br>
				Лицензия на осуществление медицинской деятельности: ${license}<br>
				Дата оформления и опломбирования сшива: «___» ____________ 2026 г.
			</div>
		</div>
	</div>

</body>
</html>`;
}

/**
 * 1-клик экспорт в единый многостраничный CSV/Excel архив с разделителями страниц и разделов:
 * - Метаданные клиники и лицензии № ЛО41-01137-77/00368421;
 * - Раздел 1: ПСО (Форма № 366/у);
 * - Раздел 2: Автоклавы (Форма № 257/у);
 * - Раздел 3: Бактерицидные установки и Генеральные уборки;
 * - Раздел 4: Температурный режим холодильников;
 * - Лист сшива и заверения тома.
 */
export function exportSanpinConsolidatedArchiveToCsv(data: ConsolidatedSanpinJournalData): string {
	const clinic = data.clinicInfo || DEFAULT_CLINIC_LEGAL;
	const license = clinic.licenseNumber || "№ ЛО41-01137-77/00368421";
	const volume = data.volumeNumber || clinic.volumeNumber || 1;
	const periodLabel = data.periodLabelRu
		? data.periodLabelRu
		: data.dateRange
			? `с ${data.dateRange.from} по ${data.dateRange.to}`
			: `за текущий отчетный период (${new Date().toLocaleDateString("ru-RU")})`;

	const psoSheets = Math.max(1, Math.ceil(data.psoRecords.length / 14));
	const f257Sheets = Math.max(1, Math.ceil(data.form257Records.length / 10));
	const bacSheets = Math.max(1, Math.ceil(data.bactericidalSessions.length / 14));
	const cleanSheets = Math.max(1, Math.ceil(data.generalCleanings.length / 12));
	const tempSheets = Math.max(1, Math.ceil(data.temperatureLogs.length / 14));
	const totalSheets = data.totalPagesCount || (1 + psoSheets + f257Sheets + bacSheets + cleanSheets + tempSheets + 1);
	const sheetsFormatted = formatRussianSheetsCount(totalSheets);

	const lines: string[] = [];

	// HEADER BANNER
	lines.push(`"СВОДНЫЙ ЖУРНАЛ ПРОИЗВОДСТВЕННОГО КОНТРОЛЯ САНПИН (ТОМ № ${volume})"`);
	lines.push(`"Медицинская организация";"${clinic.name}"`);
	lines.push(`"Лицензия на медицинскую деятельность";"${license}"`);
	lines.push(`"Реквизиты";"ИНН ${clinic.inn} | ОГРН ${clinic.ogrn} | ${clinic.address}"`);
	lines.push(`"Отчетный период";"${periodLabel}"`);
	lines.push(`"Главный врач";"${clinic.chiefDoctor}"`);
	lines.push(`"Главная медсестра";"${clinic.headNurse}"`);
	lines.push("");

	// SECTION 1: PSO FORM 366/U
	lines.push(`"=== РАЗДЕЛ 1: ЖУРНАЛ УЧЕТА КАЧЕСТВА ПРЕДСТЕРИЛИЗАЦИОННОЙ ОБРАБОТКИ (ФОРМА № 366/У) ==="`);
	const psoHeaders = [
		"№ п/п",
		"ID записи",
		"Дата и время",
		"Наименование изделий",
		"Количество в партии",
		"Количество проб (1%)",
		"Азопирамовая проба (кровь)",
		"Фенолфталеиновая проба (щелочь)",
		"Проба с Суданом III",
		"Моющее средство",
		"Результат контроля",
		"Причина брака",
		"ФИО исполнителя",
		"ЭЦП заверен",
		"Примечания",
	];
	lines.push(psoHeaders.join(";"));
	data.psoRecords.forEach((r, i) => {
		lines.push([
			(i + 1).toString(),
			`"${r.id}"`,
			`"${r.timestamp}"`,
			`"${r.instrumentName}"`,
			r.batchItemCount.toString(),
			r.testedSampleCount.toString(),
			`"${r.isAzopyramNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Кровь)"}"`,
			`"${r.isPhenolphthaleinNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Щелочь)"}"`,
			`"${r.isSudanNegative ? "Отрицательная (Норма)" : "ПОЛОЖИТЕЛЬНАЯ (Масло)"}"`,
			`"${r.detergentBrand}"`,
			`"${r.isBatchApproved ? "Допущено" : "БРАК"}"`,
			`"${r.rejectionReason ?? ""}"`,
			`"${r.operatorStaffFullName}"`,
			`"${r.electronicStampVerified ? "ДА" : "НЕТ"}"`,
			`"${r.notes ?? ""}"`,
		].join(";"));
	});
	lines.push("");

	// SECTION 2: FORM 257/U
	lines.push(`"=== РАЗДЕЛ 2: ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ АВТОКЛАВОВ (ФОРМА № 257/У) ==="`);
	const f257Headers = [
		"№ п/п",
		"ID Записи",
		"Дата",
		"Номер цикла",
		"Код аппарата",
		"Марка и модель стерилизатора",
		"Заводской номер",
		"Режим стерилизации",
		"T° факт (°C)",
		"Давление факт (бар)",
		"Время выдержки (мин)",
		"Наименование изделий",
		"Кол-во упаковок",
		"Тип упаковки",
		"Хим. индикатор",
		"КТ-1",
		"КТ-2",
		"КТ-3",
		"КТ-4",
		"КТ-5",
		"Все 5 точек ОК",
		"Результат цикла",
		"Причина брака",
		"Медсестра ЦСО",
		"Заверка ст. медсестры",
		"Цифровой штамп ЭЦП",
		"Примечания",
	];
	lines.push(f257Headers.join(";"));
	data.form257Records.forEach((rec, i) => {
		const pt1 = rec.chamberPoints.find((p) => p.pointIndex === 1)?.status === "passed" ? "ОК" : "БРАК";
		const pt2 = rec.chamberPoints.find((p) => p.pointIndex === 2)?.status === "passed" ? "ОК" : "БРАК";
		const pt3 = rec.chamberPoints.find((p) => p.pointIndex === 3)?.status === "passed" ? "ОК" : "БРАК";
		const pt4 = rec.chamberPoints.find((p) => p.pointIndex === 4)?.status === "passed" ? "ОК" : "БРАК";
		const pt5 = rec.chamberPoints.find((p) => p.pointIndex === 5)?.status === "passed" ? "ОК" : "БРАК";

		lines.push([
			(i + 1).toString(),
			`"${rec.id}"`,
			`"${rec.date}"`,
			rec.cycleNumber.toString(),
			`"${rec.sterilizerCode}"`,
			`"${rec.sterilizerBrandModel}"`,
			`"${rec.sterilizerSerialNumber}"`,
			`"${rec.regimeNameRu}"`,
			rec.actualTemperatureCelsius.toString(),
			rec.actualPressureBar.toString(),
			rec.actualExposureMinutes.toString(),
			`"${rec.itemsDescriptionRu}"`,
			rec.packsCount.toString(),
			`"${rec.packagingNameRu}"`,
			`"${rec.chemicalIndicatorNameRu}"`,
			`"${pt1}"`,
			`"${pt2}"`,
			`"${pt3}"`,
			`"${pt4}"`,
			`"${pt5}"`,
			`"${rec.areAllPointsPassed ? "Да" : "Нет"}"`,
			`"${rec.isCyclePassed ? "СТЕРИЛЬНО" : "БРАК"}"`,
			`"${rec.rejectionReason ?? ""}"`,
			`"${rec.operatorStaffFullName}"`,
			`"${rec.isHeadNurseVerified ? `Да (${rec.headNurseSignatureFullName ?? ""})` : "Нет"}"`,
			`"${rec.digitalStampHash}"`,
			`"${rec.notes ?? ""}"`,
		].join(";"));
	});
	lines.push("");

	// SECTION 3.1: BACTERICIDAL
	lines.push(`"=== РАЗДЕЛ 3.1: ЖУРНАЛ РЕГИСТРАЦИИ РАБОТЫ БАКТЕРИЦИДНЫХ УСТАНОВОК (Р 3.5.1904-04) ==="`);
	const bacHeaders = [
		"№ п/п",
		"ID",
		"Дата",
		"Помещение",
		"Марка аппарата",
		"Время начала",
		"Время окончания",
		"Длительность (мин)",
		"Длительность (ч)",
		"Режим работы",
		"Суммарная наработка (ч)",
		"Оператор",
	];
	lines.push(bacHeaders.join(";"));
	data.bactericidalSessions.forEach((s, i) => {
		lines.push([
			(i + 1).toString(),
			`"${s.id}"`,
			`"${s.date}"`,
			`"${s.roomName}"`,
			`"${s.deviceBrand}"`,
			`"${s.sessionStartTime}"`,
			`"${s.sessionEndTime}"`,
			s.durationMinutes.toString(),
			s.durationHours.toString(),
			`"${s.operatingMode}"`,
			s.cumulativeHoursAfterSession.toString(),
			`"${s.operatorStaffFullName}"`,
		].join(";"));
	});
	lines.push("");

	// SECTION 3.2: GENERAL CLEANING
	lines.push(`"=== РАЗДЕЛ 3.2: ЖУРНАЛ ПРОВЕДЕНИЯ ГЕНЕРАЛЬНЫХ УБОРОК (САНПИН 3.3686-21) ==="`);
	const cleanHeaders = [
		"№ п/п",
		"ID",
		"План дата",
		"Факт дата",
		"Помещение",
		"Тип помещения",
		"Площадь (м²)",
		"Дезсредство",
		"Концентрация (%)",
		"Экспозиция (мин)",
		"УФ (мин)",
		"Проветривание (мин)",
		"Исполнитель",
		"Контроль заверен",
	];
	lines.push(cleanHeaders.join(";"));
	data.generalCleanings.forEach((r, i) => {
		lines.push([
			(i + 1).toString(),
			`"${r.id}"`,
			`"${r.scheduledDate}"`,
			`"${r.actualDateTime}"`,
			`"${r.roomName}"`,
			`"${r.roomType}"`,
			r.treatedAreaM2.toString(),
			`"${r.disinfectantName}"`,
			r.solutionConcentrationPercent.toString(),
			r.exposureTimeMinutes.toString(),
			r.uvIrradiationMinutes.toString(),
			r.ventilationMinutes.toString(),
			`"${r.operatorStaffFullName}"`,
			`"${r.isInspectorVerified ? "ДА" : "НЕТ"}"`,
		].join(";"));
	});
	lines.push("");

	// SECTION 4: REFRIGERATOR TEMPERATURE LOGS
	lines.push(`"=== РАЗДЕЛ 4: ЖУРНАЛ ТЕМПЕРАТУРНОГО РЕЖИМА ХОЛОДИЛЬНИКОВ И ХРАНЕНИЯ ЛС (ПРИКАЗ 706Н) ==="`);
	const tempHeaders = [
		"№ п/п",
		"ID",
		"Дата замера",
		"Период",
		"Объект контроля",
		"Место установки",
		"Прибор учета",
		"Фактическая T° (°C)",
		"Влажность (%)",
		"Норматив T° (°C)",
		"В пределах нормы",
		"Причина отклонения / Меры",
		"Ответственный",
	];
	lines.push(tempHeaders.join(";"));
	data.temperatureLogs.forEach((r, i) => {
		lines.push([
			(i + 1).toString(),
			`"${r.id}"`,
			`"${r.measurementDate}"`,
			`"${r.measurementPeriod === "morning" ? "Утро" : r.measurementPeriod === "evening" ? "Вечер" : r.measurementPeriod}"`,
			`"${r.equipmentName}"`,
			`"${r.location}"`,
			`"${r.meterSerialNumber ? `${r.meterDeviceName} (№${r.meterSerialNumber})` : r.meterDeviceName}"`,
			r.temperatureCelsius.toString(),
			`"${r.relativeHumidityPercent !== undefined && r.relativeHumidityPercent !== null ? r.relativeHumidityPercent : ""}"`,
			`"${r.targetTempMinCelsius}..${r.targetTempMaxCelsius}"`,
			`"${r.isWithinNorm ? "ДА" : "ОТКЛОНЕНИЕ"}"`,
			`"${r.correctiveAction || r.deviationReason || ""}"`,
			`"${r.operatorStaffFullName}"`,
		].join(";"));
	});
	lines.push("");

	// SECTION 5: CERTIFICATION SHEET
	lines.push(`"=== ЗАВЕРИТЕЛЬНЫЙ ЛИСТ СШИВА ТОМА № ${volume} ==="`);
	lines.push(`"Заверительная надпись";"В настоящем журнале пронумеровано, прошнуровано и скреплено печатью ${sheetsFormatted.formattedRu}"`);
	lines.push(`"Главный врач";"${clinic.chiefDoctor}"`);
	lines.push(`"Главная медсестра";"${clinic.headNurse}"`);
	lines.push(`"Медицинская лицензия";"${license}"`);
	lines.push(`"Дата заверения";"${new Date().toLocaleDateString("ru-RU")}"`);

	return `\uFEFF${lines.join("\r\n")}`;
}

