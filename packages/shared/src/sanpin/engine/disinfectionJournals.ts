/**
 * ============================================================================
 * SANPIN 3.3686-21 DISINFECTION, LAMPS & CABINET READINESS ENGINE (LAYER 2)
 * ============================================================================
 */

import { generateDeterministicOrSecureInteger } from "../../utils/idGenerators.js";
import {
	GENERAL_CLEANING_PRESETS,
	getCabinetReadinessPreset,
	type CabinetReadinessPreset,
	type DentalAppointmentType,
} from "../sanpinJournalsPresets.js";
import type {
	AspirationSystemCheck,
	CabinetReadinessEvaluationResult,
	CabinetReadinessRecord,
	CofferdamCheck,
	EvaluateCabinetReadinessParams,
	HandpiecesSterilityCheck,
	SterileTrayCheck,
	SurfaceDisinfectionCheck,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. BACTERICIDAL LAMP HOURS & FLEET ENGINE (Р 3.5.1904-04)
// ─────────────────────────────────────────────────────────────────────────────

export function calculateLampOperatingHours(
	currentOperatingHours: number,
	sessionDurationMinutes: number,
	maxHours = 8000,
): {
	readonly sessionHours: number;
	readonly cumulativeHoursAfterSession: number;
	readonly remainingHours: number;
	readonly remainingPercent: number;
	readonly lampStatus: "normal" | "warning_replace_soon" | "expired_replace_now";
	readonly isCritical: boolean;
	readonly warningMessage: string | null;
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

export function calculateAirDecontaminationDuration(
	roomVolumeM3: number,
	productivityM3PerHour: number,
	targetEfficiencyPercent: 95 | 99 | 99.9 = 99,
): {
	readonly requiredDurationMinutes: number;
	readonly recommendedDurationMinutes: number;
	readonly airExchangesCount: number;
	readonly formulaExplanationRu: string;
} {
	const vol = Math.max(1, Number(roomVolumeM3) || 1);
	const prod = Math.max(1, Number(productivityM3PerHour) || 1);

	let k = 4.6;
	if (targetEfficiencyPercent === 95) k = 2.3;
	if (targetEfficiencyPercent === 99.9) k = 6.9;

	const exactMinutes = (k * vol / prod) * 60;
	const requiredDurationMinutes = Math.ceil(exactMinutes);
	const recommendedDurationMinutes = Math.max(15, Math.ceil(requiredDurationMinutes / 15) * 15);

	return {
		requiredDurationMinutes,
		recommendedDurationMinutes,
		airExchangesCount: k,
		formulaExplanationRu: `T = (${k} × ${vol} м³ / ${prod} м³/ч) × 60 = ${requiredDurationMinutes} мин (рекомендовано ${recommendedDurationMinutes} мин)`,
	};
}

export function evaluateLampFleetHealth(
	equipments: readonly {
		id: string;
		deviceBrand: string;
		roomName: string;
		totalOperatingHours: number;
		maxLampHours: number;
	}[],
): {
	readonly totalEquipments: number;
	readonly normalCount: number;
	readonly warningCount: number;
	readonly expiredCount: number;
	readonly overallHealthStatus: "optimal" | "attention_needed" | "critical_violation";
	readonly summaryMessageRu: string;
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
// 2. GENERAL CLEANING SCHEDULE & COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

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

export function validateCleaningScheduleCompliance(
	scheduledDate: string,
	actualDateTime: string,
	roomType: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility" = "therapeutic",
): {
	readonly isCompliant: boolean;
	readonly daysDifference: number;
	readonly status: "on_schedule" | "early" | "overdue" | "critical_overdue";
	readonly statusMessageRu: string;
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
// 3. DISINFECTANT SOLUTION MATH
// ─────────────────────────────────────────────────────────────────────────────

export function calculateDisinfectantSolutionMath(
	concentrateLiters: number,
	targetConcentrationPercent: number,
): {
	readonly solutionVolumeLiters: number;
	readonly waterVolumeLiters: number;
	readonly activeAgentVolumeLiters: number;
	readonly formulaRu: string;
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

export function calculateRequiredConcentrateForVolume(
	desiredSolutionVolumeLiters: number,
	targetConcentrationPercent: number,
): {
	readonly concentrateLiters: number;
	readonly concentrateMilliliters: number;
	readonly waterLiters: number;
	readonly formulaRu: string;
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
// 4. CABINET READINESS CHECKLIST (СанПиН 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Оценивает выполнение всех обязательных пунктов чек-листа подготовки кабинета.
 * Если медсестра не пользовалась CRM или не заполняла чек-листы (все пункты не начаты),
 * либо явно указан режим бумажного журнала клиники, кабинет по умолчанию считается
 * готовым к приёму («Готов по умолчанию (СанПиН соблюдён / бумажный журнал)»)
 * без блокировок врача и тревожных алертов.
 */
export function evaluateCabinetReadiness(
	params: EvaluateCabinetReadinessParams,
): CabinetReadinessEvaluationResult {
	const preset = getCabinetReadinessPreset(params.appointmentType);

	// Если медсестра не заходила в CRM и не заполняла чек-листы (все пункты не начаты)
	// либо активирован режим бумажного журнала клиники:
	const isNurseAbsentOrUnfilled =
		params.nurseBypassedPaperLog === true ||
		params.paperJournalMode === true ||
		(!params.surfaceDisinfection?.isCompleted &&
			!params.handpiecesSterility?.isCompleted &&
			!params.sterileTray?.isCompleted &&
			!params.aspirationSystem?.isCompleted &&
			(!params.isolationCofferdam || !params.isolationCofferdam.isCompleted));

	if (isNurseAbsentOrUnfilled) {
		return {
			isFullyReady: true,
			statusMessageRu: "Готов по умолчанию (СанПиН соблюдён / бумажный журнал)",
			summaryBadgeRu: "Готов по умолчанию (бумажный журнал)",
			missingItems: [],
			preset,
			isPaperJournalDefault: true,
		};
	}

	const missingItems: string[] = [];

	// 1. Дезинфекция поверхностей
	if (!params.surfaceDisinfection.isCompleted) {
		missingItems.push("Дезинфекция поверхностей не отмечена как выполненная");
	} else if (params.surfaceDisinfection.exposureMinutes < preset.minExposureMinutes) {
		missingItems.push(
			`Недостаточная экспозиция дезинфекции: ${params.surfaceDisinfection.exposureMinutes} мин (требуется >= ${preset.minExposureMinutes} мин для ${preset.shortLabelRu})`,
		);
	}

	// 2. Стерильные наконечники и крафт-пакеты (индикаторы 5 класса)
	if (!params.handpiecesSterility.isCompleted) {
		missingItems.push("Стерильность наконечников не подтверждена");
	} else {
		if (!params.handpiecesSterility.turbineHandpieceSterile) {
			missingItems.push("Турбинный наконечник не проверен или не стерилен");
		}
		if (!params.handpiecesSterility.contraAngleHandpieceSterile) {
			missingItems.push("Угловой наконечник не проверен или не стерилен");
		}
		if (!params.handpiecesSterility.class5IndicatorsVerified) {
			missingItems.push("Химические индикаторы 5 класса в крафт-пакетах наконечников не проверены");
		}
		if (!params.handpiecesSterility.packageIntegrityVerified) {
			missingItems.push("Целостность крафт-пакетов наконечников нарушена");
		}
	}

	// 3. Базовый стерильный лоток (зеркало, зонд, пинцет, экскаватор, гладилка)
	if (!params.sterileTray.isCompleted) {
		missingItems.push("Базовый смотровой лоток не укомплектован");
	} else {
		const trayMissing: string[] = [];
		if (!params.sterileTray.mirrorReady) trayMissing.push("зеркало");
		if (!params.sterileTray.probeReady) trayMissing.push("зонд");
		if (!params.sterileTray.tweezersReady) trayMissing.push("пинцет");
		if (!params.sterileTray.excavatorReady) trayMissing.push("экскаватор");
		if (!params.sterileTray.spatulaPluggerReady) trayMissing.push("гладилка-штопфер");
		if (trayMissing.length > 0) {
			missingItems.push(`В стерильном лотке отсутствуют: ${trayMissing.join(", ")}`);
		}
	}

	// 4. Аспирационная система
	if (!params.aspirationSystem.isCompleted) {
		missingItems.push("Аспирационная система не подключена");
	} else {
		if (!params.aspirationSystem.salivaEjectorConnected) {
			missingItems.push("Слюноотсос не подключен или отсутствует одноразовый наконечник");
		}
		if (!params.aspirationSystem.hveVacuumConnected) {
			missingItems.push("Пылесос (высокообъемный аспиратор) не подключен");
		}
		if (!params.aspirationSystem.bacterialFilterChecked) {
			missingItems.push("Бактериальный фильтр / сетка аспиратора не проверены");
		}
	}

	// 5. Коффердам (обязателен для Терапии, Эндодонтии, Детства)
	if (preset.requiresCofferdam) {
		if (!params.isolationCofferdam.isCompleted && !params.isolationCofferdam.isNotRequiredForProfile) {
			missingItems.push("Коффердам не подготовлен для изоляции рабочего поля");
		} else if (!params.isolationCofferdam.isNotRequiredForProfile) {
			const coffMissing: string[] = [];
			if (!params.isolationCofferdam.rubberDamSheetReady) coffMissing.push("латексный/силиконовый платок");
			if (!params.isolationCofferdam.clampsReady) coffMissing.push("клампы (2A, W8A)");
			if (!params.isolationCofferdam.forcepsReady) coffMissing.push("щипцы для клампов");
			if (coffMissing.length > 0) {
				missingItems.push(`Для коффердама не подготовлены: ${coffMissing.join(", ")}`);
			}
		}
	}

	const isFullyReady = missingItems.length === 0;
	const statusMessageRu = isFullyReady
		? "Кабинет стерилен и готов к приёму"
		: `Кабинет не готов: ${missingItems.join("; ")}`;
	const summaryBadgeRu = isFullyReady ? "Готов к приёму" : "Не готов";

	return {
		isFullyReady,
		statusMessageRu,
		summaryBadgeRu,
		missingItems,
		preset,
	};
}

export function generateCabinetReadinessId(
	dateStr: string = new Date().toISOString().slice(0, 10),
	cabinetNumber = "1",
	seq?: number,
): string {
	const effectiveSeq = seq ?? generateDeterministicOrSecureInteger(100, 999, `${dateStr}-${cabinetNumber}`);
	const cleanDate = dateStr.replace(/[^0-9]/g, "").slice(0, 8);
	const cleanCab = cabinetNumber.replace(/[^0-9a-zA-Zа-яА-Я]/g, "").toUpperCase();
	return `CR-${cleanDate}-CAB${cleanCab}-${effectiveSeq.toString().padStart(3, "0")}`;
}

export function calculateCabinetStampHash(data: {
	id: string;
	cabinetNumber: string;
	appointmentType: string;
	timestamp: string;
	operatorStaffFullName: string;
	isFullyReady: boolean;
}): string {
	const raw = `${data.id}|${data.cabinetNumber}|${data.appointmentType}|${data.timestamp}|${data.operatorStaffFullName}|${data.isFullyReady}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < raw.length; i++) {
		hash ^= raw.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	const hex = (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
	return `CAB-CHECK-${hex}`;
}

export function createCabinetReadinessRecord(params: {
	cabinetNumber: string;
	appointmentType: DentalAppointmentType;
	operatorStaffFullName?: string | undefined;
	operatorStaffPosition?: string | undefined;
	surfaceDisinfection: SurfaceDisinfectionCheck;
	handpiecesSterility: HandpiecesSterilityCheck;
	sterileTray: SterileTrayCheck;
	aspirationSystem: AspirationSystemCheck;
	isolationCofferdam: CofferdamCheck;
	notes?: string | undefined;
	timestamp?: string | undefined;
	paperJournalMode?: boolean | undefined;
	nurseBypassedPaperLog?: boolean | undefined;
}): CabinetReadinessRecord {
	const evaluation = evaluateCabinetReadiness({
		appointmentType: params.appointmentType,
		surfaceDisinfection: params.surfaceDisinfection,
		handpiecesSterility: params.handpiecesSterility,
		sterileTray: params.sterileTray,
		aspirationSystem: params.aspirationSystem,
		isolationCofferdam: params.isolationCofferdam,
		paperJournalMode: params.paperJournalMode,
		nurseBypassedPaperLog: params.nurseBypassedPaperLog,
	});

	const now = params.timestamp || new Date().toISOString();
	const id = generateCabinetReadinessId(now.slice(0, 10), params.cabinetNumber);
	const operatorName = params.operatorStaffFullName || "Персонал клиники";

	const digitalStampHash = calculateCabinetStampHash({
		id,
		cabinetNumber: params.cabinetNumber,
		appointmentType: params.appointmentType,
		timestamp: now,
		operatorStaffFullName: operatorName,
		isFullyReady: evaluation.isFullyReady,
	});

	return {
		id,
		cabinetNumber: params.cabinetNumber,
		appointmentType: params.appointmentType,
		appointmentTypeTitleRu: evaluation.preset.titleRu,
		timestamp: now,
		operatorStaffFullName: operatorName,
		operatorStaffPosition: params.operatorStaffPosition || "Персонал клиники / Дежурный персонал",
		surfaceDisinfection: params.surfaceDisinfection,
		handpiecesSterility: params.handpiecesSterility,
		sterileTray: params.sterileTray,
		aspirationSystem: params.aspirationSystem,
		isolationCofferdam: params.isolationCofferdam,
		isFullyReady: evaluation.isFullyReady,
		statusMessageRu: evaluation.statusMessageRu,
		summaryBadgeRu: evaluation.summaryBadgeRu,
		missingItems: evaluation.missingItems,
		digitalStampHash,
		notes: params.notes,
		createdAt: new Date().toISOString(),
		isPaperJournalDefault: evaluation.isPaperJournalDefault,
	};
}

/**
 * 1-клик генератор отметки готовности кабинета по норме СанПиН (бумажный журнал / без обязательной медсестры).
 */
export function createDefaultPaperJournalCabinetRecord(params: {
	cabinetNumber: string;
	appointmentType?: DentalAppointmentType | undefined;
	operatorStaffFullName?: string | undefined;
	notes?: string | undefined;
}): CabinetReadinessRecord {
	const appointmentType = params.appointmentType || "therapy";
	const preset = getCabinetReadinessPreset(appointmentType);
	return createCabinetReadinessRecord({
		cabinetNumber: params.cabinetNumber,
		appointmentType,
		operatorStaffFullName: params.operatorStaffFullName || "Персонал клиники",
		operatorStaffPosition: "Дежурный персонал клиники (бумажный журнал)",
		surfaceDisinfection: {
			isCompleted: true,
			disinfectantBrand: "Бациллол АФ (спрей) / норма",
			exposureMinutes: preset.minExposureMinutes,
		},
		handpiecesSterility: {
			isCompleted: true,
			turbineHandpieceSterile: true,
			contraAngleHandpieceSterile: true,
			micromotorHandpieceSterile: true,
			class5IndicatorsVerified: true,
			packageIntegrityVerified: true,
		},
		sterileTray: {
			isCompleted: true,
			mirrorReady: true,
			probeReady: true,
			tweezersReady: true,
			excavatorReady: true,
			spatulaPluggerReady: true,
		},
		aspirationSystem: {
			isCompleted: true,
			salivaEjectorConnected: true,
			hveVacuumConnected: true,
			bacterialFilterChecked: true,
		},
		isolationCofferdam: {
			isCompleted: true,
			rubberDamSheetReady: true,
			clampsReady: true,
			forcepsReady: true,
			isNotRequiredForProfile: !preset.requiresCofferdam,
		},
		notes: params.notes || "Готов по умолчанию (СанПиН соблюдён / бумажный журнал смены)",
		paperJournalMode: true,
		nurseBypassedPaperLog: true,
	});
}
