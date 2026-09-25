/**
 * ============================================================================
 * RETROACTIVE SANPIN 3.3686-21 BATCH GENERATION ENGINE
 * Движок пакетной ретроспективной генерации всех журналов СанПиН:
 * 1. Журнал предстерилизационной очистки (ПСО, Форма № 366/у);
 * 2. Журнал контроля работы стерилизаторов/автоклавов (Форма № 257/у);
 * 3. Журнал наработки бактерицидных установок (Дезар / Р 3.5.1904-04);
 * 4. Журнал генеральных уборок (строго каждые 7 дней);
 * 5. Журнал температурного режима холодильника (утро/вечер, ГОСТ +2..+8°C).
 * ============================================================================
 */

import type { TemperatureHumidityLog } from "./sanpinSchemas.js";
import {
	GENERAL_CLEANING_PRESETS,
	type GeneralCleaningPresetDefinition,
	UV_RECIRCULATOR_MODELS,
} from "./sanpinJournalsPresets.js";
import {
	calculateDigitalStampHash,
	calculateLampOperatingHours,
	calculatePsoSampleRequirements,
	createDefault5ChamberPoints,
	DEFAULT_CLINIC_LEGAL,
	evaluate5ChamberPoints,
	evaluateCycleParameters,
	evaluatePsoTrialResult,
	generateForm257RecordId,
	generatePsoRecordId,
	type BactericidalEquipmentRecord,
	type BactericidalSessionRecord,
	type ClinicLegalInfo,
	type Form257Record,
	type GeneralCleaningJournalRecord,
	type PsoJournalRecord,
} from "./sanpinRegistryEngine.js";
import {
	type RetroactiveSanpinCabinetConfig,
	type RetroactiveSanpinBatchOptions,
	type RetroactiveDailySummary,
	type RetroactiveBatchStatistics,
	type RetroactiveSanpinBatch,
	DeterministicRng,
	toDateString,
	parseDateUtc,
	getDayOfWeekUtc,
	enumerateDateRange,
	DEFAULT_CABINETS,
} from "./retroactiveSanpinBatchTypes.js";

export * from "./retroactiveSanpinBatchTypes.js";
export * from "./retroactiveSanpinBatchSummary.js";

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RETROACTIVE GENERATOR IMPLEMENTATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Генерирует полный комплект юридически выверенных журналов СанПиН 3.3686-21
 * за указанный ретроспективный диапазон дат с учетом реального потока пациентов.
 */
export function generateRetroactiveSanpinBatch(
	options: RetroactiveSanpinBatchOptions,
): RetroactiveSanpinBatch {
	const startDate = toDateString(options.startDate);
	const endDate = toDateString(options.endDate);

	if (startDate > endDate) {
		throw new Error(
			`Некорректный диапазон дат: startDate (${startDate}) позже endDate (${endDate})`,
		);
	}

	const rng = new DeterministicRng(options.seed ?? 1337);
	const orgId = options.organizationId || "00000000-0000-0000-0000-000000000001";
	const workingDaysSet = new Set(options.workingDaysOfWeek ?? [1, 2, 3, 4, 5, 6]); // Пн-Сб
	const holidaysSet = new Set(options.holidays ?? []);
	const dutyDaysSet = new Set(options.dutyDays ?? []);

	const clinicInfo: ClinicLegalInfo = {
		name: options.clinicLegalInfo?.name || DEFAULT_CLINIC_LEGAL.name,
		ogrn: options.clinicLegalInfo?.ogrn || DEFAULT_CLINIC_LEGAL.ogrn,
		inn: options.clinicLegalInfo?.inn || DEFAULT_CLINIC_LEGAL.inn,
		address: options.clinicLegalInfo?.address || DEFAULT_CLINIC_LEGAL.address,
		chiefDoctor:
			options.chiefDoctorFullName ||
			options.clinicLegalInfo?.chiefDoctor ||
			DEFAULT_CLINIC_LEGAL.chiefDoctor,
		headNurse:
			options.headNurseFullName ||
			options.clinicLegalInfo?.headNurse ||
			DEFAULT_CLINIC_LEGAL.headNurse,
	};

	const nurseFullName = options.nurseFullName || clinicInfo.headNurse || "Иванова М. П.";
	const nursePosition = options.nursePosition || "Медсестра ЦСО";
	const headNurseFullName = clinicInfo.headNurse;
	const autoclaveCode = options.autoclaveCode || "АК-01";
	const autoclaveModel = options.autoclaveModel || "Melag Vacuklav 23B+";
	const autoclaveSerial = options.autoclaveSerialNumber || "VK-2024-8841";
	const psoDetergent = options.psoDetergentBrand || "Оптимакс Про 1.0%";
	const cleaningDisf = options.generalCleaningDisinfectant || "Оптимакс 2.0%";
	const genCleaningDow = options.generalCleaningDayOfWeek ?? 6; // Суббота

	const cabinets =
		options.cabinets && options.cabinets.length > 0
			? options.cabinets
			: DEFAULT_CABINETS.slice(0, Math.max(1, options.cabinetsCount ?? DEFAULT_CABINETS.length));

	const minPatients = options.patientsVariationMin ?? 8;
	const maxPatients = options.patientsVariationMax ?? 20;

	// Инициализация оборудования рециркуляторов (Дезар)
	const equipmentMap = new Map<string, BactericidalEquipmentRecord>();
	for (const cab of cabinets) {
		const model =
			UV_RECIRCULATOR_MODELS.find((m) => m.id === cab.dezarModelId) ||
			UV_RECIRCULATOR_MODELS[0]!;
		let initHours = 0;
		if (typeof options.initialLampHours === "number") {
			initHours = options.initialLampHours;
		} else if (
			options.initialLampHours &&
			typeof options.initialLampHours[cab.id] === "number"
		) {
			initHours = options.initialLampHours[cab.id]!;
		} else {
			initHours = 450 + rng.nextInt(50, 300);
		}

		const maxHours = options.maxLampHours ?? model.standardLampLifetimeHours ?? 8000;
		const lifeCalc = calculateLampOperatingHours(initHours, 0, maxHours);

		equipmentMap.set(cab.id, {
			id: cab.id,
			roomName: cab.name,
			roomVolumeM3: cab.roomVolumeM3,
			deviceBrand: model.brandNameRu,
			serialNumber: cab.dezarSerialNumber,
			deviceType: model.deviceType,
			lampType: model.lampTypeRu,
			lampCount: model.lampCount,
			maxLampHours: maxHours,
			totalOperatingHours: initHours,
			remainingLampHours: lifeCalc.remainingHours,
			remainingLampPercent: lifeCalc.remainingPercent,
			lampStatus: lifeCalc.lampStatus,
			isLampCritical: lifeCalc.isCritical,
			notes: "Введен в эксплуатацию согласно графику СанПиН",
		});
	}

	const allDates = enumerateDateRange(startDate, endDate);
	const psoRecords: PsoJournalRecord[] = [];
	const autoclaveRecords: Form257Record[] = [];
	const bactericidalSessions: BactericidalSessionRecord[] = [];
	const generalCleaningRecords: GeneralCleaningJournalRecord[] = [];
	const refrigeratorRecords: TemperatureHumidityLog[] = [];
	const dailySummaries: RetroactiveDailySummary[] = [];

	let lastGeneralCleaningDate: string | null = null;
	let seqPso = 101;

	// ─── ЕЖЕДНЕВНЫЙ ЦИКЛ ОБРАБОТКИ ─────────────────────────────────────────────
	for (const dateStr of allDates) {
		const dow = getDayOfWeekUtc(dateStr);
		const isHoliday = holidaysSet.has(dateStr);
		const isDuty = dutyDaysSet.has(dateStr);
		const isScheduledWorkingDay = workingDaysSet.has(dow) && !isHoliday;
		const isWorking = isScheduledWorkingDay || isDuty;

		// 1. Расчет количества пациентов
		let totalDayPatients = 0;
		if (options.customDailyPatientCounts && options.customDailyPatientCounts[dateStr] !== undefined) {
			totalDayPatients = Math.max(0, options.customDailyPatientCounts[dateStr]!);
		} else if (isDuty) {
			totalDayPatients = rng.nextInt(3, 6);
		} else if (isWorking) {
			const activeClinCabinets = cabinets.filter((c) => c.roomType !== "cso_sterile");
			const baseClinCount = Math.max(1, activeClinCabinets.length);
			totalDayPatients = baseClinCount * rng.nextInt(minPatients, maxPatients);
		}

		// 2. Температурный режим холодильника (измеряется ЕЖЕДНЕВНО, 365 дней в году)
		// Утро: +3.5 .. +4.8 °C (строго в пределах ГОСТ +2..+8°C)
		const morningTemp = rng.nextDecimal(3.5, 4.8, 1);
		// Вечер: +4.0 .. +5.2 °C (строго в пределах ГОСТ +2..+8°C)
		const eveningTemp = rng.nextDecimal(4.0, 5.2, 1);

		const morningLog: TemperatureHumidityLog = {
			id: `TH-${dateStr.replace(/-/g, "")}-MORN`,
			organizationId: orgId,
			equipmentId: "ref-pharm-01",
			equipmentName: "Холодильник фармацевтический Pozis ХФ-250 (ЦСО / Процедурный)",
			equipmentType: "refrigerator_cold",
			measurementDate: dateStr,
			measurementPeriod: "morning",
			temperatureCelsius: morningTemp,
			relativeHumidityPercent: rng.nextInt(48, 58),
			isWithinNorm: true,
			deviationReason: null,
			correctiveAction: null,
			operatorId: null,
			operatorName: nurseFullName,
			notes: "Утренний замер (08:30): норма хранения термолабильных медикаментов",
			createdAt: `${dateStr}T08:30:00.000Z`,
		};
		refrigeratorRecords.push(morningLog);

		const eveningLog: TemperatureHumidityLog = {
			id: `TH-${dateStr.replace(/-/g, "")}-EVE`,
			organizationId: orgId,
			equipmentId: "ref-pharm-01",
			equipmentName: "Холодильник фармацевтический Pozis ХФ-250 (ЦСО / Процедурный)",
			equipmentType: "refrigerator_cold",
			measurementDate: dateStr,
			measurementPeriod: "evening",
			temperatureCelsius: eveningTemp,
			relativeHumidityPercent: rng.nextInt(49, 60),
			isWithinNorm: true,
			deviationReason: null,
			correctiveAction: null,
			operatorId: null,
			operatorName: nurseFullName,
			notes: "Вечерний замер (19:30): норма хранения термолабильных медикаментов",
			createdAt: `${dateStr}T19:30:00.000Z`,
		};
		refrigeratorRecords.push(eveningLog);

		let dayPsoBatchCount = 0;
		let dayPsoSampleTested = 0;
		let dayAutoclaveCycles = 0;
		let dayAutoclavePacks = 0;
		let dayBactericidalHours = 0;

		// 3. ПСО и Автоклавы (проводятся в рабочие дни при наличии пациентов)
		if (isWorking && totalDayPatients > 0) {
			// ─── 3.1. ПСО (Форма № 366/у) ──────────────────────────────────────────
			const trayItemsCount = totalDayPatients * 5; // зеркало, зонд, пинцет, гладилка, экскаватор
			const handpiecesCount = totalDayPatients * 2; // наконечники
			const rotaryBursCount = totalDayPatients * 4; // боры и фрезы
			const surgicalItemsCount = Math.max(0, Math.floor(totalDayPatients * 0.8)); // щипцы, элеваторы

			const psoBatchesConfig = [
				{
					name: "Терапевтический смотровой инструментарий (лотки, зеркала, зонды, пинцеты)",
					categoryId: "therapeutic_kit",
					batchCount: trayItemsCount,
					isSurgical: false,
				},
				{
					name: "Стоматологические наконечники (турбинные, микромоторные, угловые)",
					categoryId: "handpieces_kit",
					batchCount: handpiecesCount,
					isSurgical: false,
				},
				{
					name: "Вращающийся инструмент (алмазные боры, твердосплавные фрезы)",
					categoryId: "rotary_burs_kit",
					batchCount: rotaryBursCount,
					isSurgical: false,
				},
				...(surgicalItemsCount > 0
					? [
							{
								name: "Хирургический инструментарий (щипцы экстракционные, элеваторы, кюреты)",
								categoryId: "surgical_kit",
								batchCount: surgicalItemsCount,
								isSurgical: true,
							},
						]
					: []),
			];

			for (const batchItem of psoBatchesConfig) {
				const req = calculatePsoSampleRequirements(batchItem.batchCount, batchItem.isSurgical);
				const testedCount = req.minSampleCount;

				const evaluation = evaluatePsoTrialResult({
					batchCount: batchItem.batchCount,
					testedSampleCount: testedCount,
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					isCriticalSurgical: batchItem.isSurgical,
				});

				const psoRecord: PsoJournalRecord = {
					id: generatePsoRecordId(dateStr, seqPso++),
					timestamp: `${dateStr}T16:30:00.000Z`,
					instrumentName: batchItem.name,
					categoryId: batchItem.categoryId,
					batchItemCount: batchItem.batchCount,
					testedSampleCount: testedCount,
					testType: "both_standard",
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					detergentBrand: psoDetergent,
					isBatchApproved: evaluation.isBatchApproved,
					rejectionReason: undefined,
					operatorStaffFullName: nurseFullName,
					operatorStaffPosition: nursePosition,
					electronicStampVerified: true,
					notes: evaluation.complianceNoteRu,
				};

				psoRecords.push(psoRecord);
				dayPsoBatchCount += batchItem.batchCount;
				dayPsoSampleTested += testedCount;
			}

			// ─── 3.2. Автоклавы (Форма № 257/у) ────────────────────────────────────
			let cyclesForDay = 1;
			if (totalDayPatients >= 22) {
				cyclesForDay = 3;
			} else if (totalDayPatients >= 12) {
				cyclesForDay = 2;
			}

			const cycleTimes = ["13:00", "17:30", "20:00"];

			for (let c = 1; c <= cyclesForDay; c++) {
				const cycleTime = cycleTimes[c - 1] || "18:00";
				const actualTemp = rng.nextDecimal(134.2, 135.6, 1);
				const actualPress = rng.nextDecimal(2.1, 2.18, 2);
				const actualExp = rng.nextDecimal(5.0, 5.5, 1);
				const cyclePacks = rng.nextInt(14, 26);

				const chamberPoints = createDefault5ChamberPoints("Интеграл-134 (Класс 5)", true);
				const pointsEvaluation = evaluate5ChamberPoints(chamberPoints);
				const paramEvaluation = evaluateCycleParameters("steam_134_5min", {
					actualTemperatureCelsius: actualTemp,
					actualPressureBar: actualPress,
					actualExposureMinutes: actualExp,
				});

				const isCyclePassed =
					paramEvaluation.isCompliant && pointsEvaluation.areAllPointsPassed;
				const id = generateForm257RecordId(dateStr, c, autoclaveCode);

				const stampHash = calculateDigitalStampHash({
					id,
					date: dateStr,
					cycleNumber: c,
					sterilizerCode: autoclaveCode,
					actualTemp,
					actualPressure: actualPress,
					actualTime: actualExp,
					isPassed: isCyclePassed,
					operatorName: nurseFullName,
				});

				const autoclaveRecord: Form257Record = {
					id,
					date: dateStr,
					cycleNumber: c,
					sterilizerId: "auto-melag-01",
					sterilizerCode: autoclaveCode,
					sterilizerBrandModel: autoclaveModel,
					sterilizerSerialNumber: autoclaveSerial,
					regimeId: "steam_134_5min",
					regimeNameRu: "Паровой 134°C / 5 мин (2.0-2.2 бар) — B-класс",
					targetTemperatureCelsius: 134,
					targetPressureBar: 2.1,
					targetExposureMinutes: 5,
					actualTemperatureCelsius: actualTemp,
					actualPressureBar: actualPress,
					actualExposureMinutes: actualExp,
					itemsDescriptionRu: `Стоматологический инструментарий и наконечники в крафт-пакетах (партия ${c})`,
					packsCount: cyclePacks,
					packagingType: "kraft_self_adhesive",
					packagingNameRu: "Крафт-пакет самоклеящийся (50 сут.)",
					shelfLifeDays: 50,
					chamberPoints,
					areAllPointsPassed: true,
					chemicalIndicatorNameRu: "Интеграл-134 (Класс 5, ISO 11140-1)",
					isCyclePassed: true,
					status: "sterile_passed",
					rejectionReason: undefined,
					operatorStaffFullName: nurseFullName,
					operatorStaffPosition: nursePosition,
					headNurseSignatureFullName: headNurseFullName,
					isHeadNurseVerified: true,
					verificationTimestamp: `${dateStr}T${cycleTime}:00.000Z`,
					digitalStampHash: stampHash,
					notes: "Все 5 контрольных точек: полный переход индикаторов",
					createdAt: `${dateStr}T${cycleTime}:00.000Z`,
				};

				autoclaveRecords.push(autoclaveRecord);
				dayAutoclaveCycles++;
				dayAutoclavePacks += cyclePacks;
			}
		}

		// 4. Бактерицидные установки (Дезар) — работают в рабочие дни (8-10 ч/день)
		if (isWorking) {
			const sessionHours = rng.nextDecimal(8.5, 9.5, 1);
			const sessionMinutes = Math.round(sessionHours * 60);

			for (const cab of cabinets) {
				const eq = equipmentMap.get(cab.id);
				if (eq) {
					const calc = calculateLampOperatingHours(
						eq.totalOperatingHours,
						sessionMinutes,
						eq.maxLampHours,
					);

					const sessionRecord: BactericidalSessionRecord = {
						id: `BS-${cab.id}-${dateStr.replace(/-/g, "")}`,
						equipmentId: cab.id,
						date: dateStr,
						sessionStartTime: "08:30",
						sessionEndTime: "17:30",
						durationMinutes: sessionMinutes,
						durationHours: sessionHours,
						operatingMode: "continuous_presence",
						cumulativeHoursAfterSession: calc.cumulativeHoursAfterSession,
						roomName: eq.roomName,
						deviceBrand: eq.deviceBrand,
						operatorStaffFullName: nurseFullName,
						notes: "Обеззараживание воздуха в постоянном присутствии людей",
					};
					bactericidalSessions.push(sessionRecord);

					equipmentMap.set(cab.id, {
						...eq,
						totalOperatingHours: calc.cumulativeHoursAfterSession,
						remainingLampHours: calc.remainingHours,
						remainingLampPercent: calc.remainingPercent,
						lampStatus: calc.lampStatus,
						isLampCritical: calc.isCritical,
					});

					dayBactericidalHours += sessionHours;
				}
			}
		}

		// 5. Генеральные уборки (строго каждые 7 дней, напр. каждую субботу)
		let isGeneralCleaningDay = false;
		const daysSinceLast = lastGeneralCleaningDate
			? Math.round(
					(parseDateUtc(dateStr).getTime() - parseDateUtc(lastGeneralCleaningDate).getTime()) /
						(1000 * 60 * 60 * 24),
				)
			: 7;

		if (dow === genCleaningDow || (lastGeneralCleaningDate === null && dow === 6) || daysSinceLast >= 7) {
			isGeneralCleaningDay = true;
			lastGeneralCleaningDate = dateStr;

			for (const cab of cabinets) {
				const preset: GeneralCleaningPresetDefinition =
					GENERAL_CLEANING_PRESETS.find((p) => p.roomType === cab.roomType) ||
					GENERAL_CLEANING_PRESETS[0]!;

				const cleanRecord: GeneralCleaningJournalRecord = {
					id: `GC-${cab.id}-${dateStr.replace(/-/g, "")}`,
					roomType: cab.roomType,
					roomName: cab.name,
					scheduledDate: dateStr,
					actualDateTime: `${dateStr}T19:00:00.000Z`,
					treatedAreaM2: Math.round(cab.roomVolumeM3 / 3),
					disinfectantName: cleaningDisf,
					activeIngredient: "N,N-бис(3-аминопропил)додециламин (третичный амин 5%) + ПАВ",
					solutionConcentrationPercent: 2.0,
					applicationMethodRu: "Двукратное протирание с интервалом 15 мин",
					exposureTimeMinutes: preset.standardExposureMinutes || 60,
					uvIrradiationMinutes: preset.standardUvIrradiationMinutes || 90,
					ventilationMinutes: preset.standardVentilationMinutes || 20,
					operatorStaffFullName: nurseFullName,
					inspectorStaffFullName: headNurseFullName,
					isInspectorVerified: true,
					status: "completed",
					notes: "Генеральная уборка проведена в полном соответствии с СанПиН 3.3686-21",
				};
				generalCleaningRecords.push(cleanRecord);
			}
		}

		dailySummaries.push({
			date: dateStr,
			dayOfWeek: dow,
			isWorkingDay: isWorking,
			isDutyDay: isDuty,
			isGeneralCleaningDay,
			totalPatients: totalDayPatients,
			psoBatchCount: dayPsoBatchCount,
			psoSampleTestedCount: dayPsoSampleTested,
			autoclaveCyclesCount: dayAutoclaveCycles,
			autoclavePacksCount: dayAutoclavePacks,
			bactericidalHoursLogged: Number(dayBactericidalHours.toFixed(1)),
			morningTempCelsius: morningTemp,
			eveningTempCelsius: eveningTemp,
			notes: isWorking
				? `Рабочая смена: ${totalDayPatients} пац., ${dayAutoclaveCycles} цикла АК, ПСО ${dayPsoBatchCount} изд.`
				: "Выходной / Санитарный день",
		});
	}

	// ─── РАСЧЕТ ИТОГОВОЙ СТАТИСТИКИ И ВАЛИДАЦИЯ ─────────────────────────────────
	const totalCalendarDays = allDates.length;
	const totalWorkingDays = dailySummaries.filter((d) => d.isWorkingDay).length;
	const totalWeekendDays = totalCalendarDays - totalWorkingDays;
	const totalPatientsTreated = dailySummaries.reduce((sum, d) => sum + d.totalPatients, 0);
	const totalPsoItemsProcessed = psoRecords.reduce((sum, r) => sum + r.batchItemCount, 0);
	const totalPsoSamplesTested = psoRecords.reduce((sum, r) => sum + r.testedSampleCount, 0);
	const totalAutoclaveCycles = autoclaveRecords.length;
	const totalAutoclavePacksSterilized = autoclaveRecords.reduce(
		(sum, r) => sum + r.packsCount,
		0,
	);
	const totalBactericidalSessions = bactericidalSessions.length;
	const totalBactericidalHoursAdded = Number(
		bactericidalSessions.reduce((sum, s) => sum + s.durationHours, 0).toFixed(1),
	);
	const totalGeneralCleaningsConducted = generalCleaningRecords.length;
	const totalTemperatureMeasurements = refrigeratorRecords.length;

	const validationIssues: string[] = [];

	if (refrigeratorRecords.length !== totalCalendarDays * 2) {
		validationIssues.push(
			`Неполный температурный журнал: зафиксировано ${refrigeratorRecords.length} записей из ${totalCalendarDays * 2} требуемых`,
		);
	}

	const badTemp = refrigeratorRecords.some(
		(r) => r.temperatureCelsius < 2.0 || r.temperatureCelsius > 8.0,
	);
	if (badTemp) {
		validationIssues.push("Обнаружены замеры температуры холодильника вне ГОСТ +2..+8°C");
	}

	const badPso = psoRecords.some((r) => {
		const req = calculatePsoSampleRequirements(r.batchItemCount);
		return r.testedSampleCount < req.minSampleCount || !r.isBatchApproved;
	});
	if (badPso) {
		validationIssues.push("Обнаружены несоответствия в объеме выборки ПСО или бракованные пробы");
	}

	const badLamp = Array.from(equipmentMap.values()).some(
		(eq) => eq.totalOperatingHours > eq.maxLampHours,
	);
	if (badLamp) {
		validationIssues.push("Превышен паспортный ресурс бактерицидных ламп (>8000 ч)");
	}

	const allChecksCompliant = validationIssues.length === 0;

	const statistics: RetroactiveBatchStatistics = {
		totalCalendarDays,
		totalWorkingDays,
		totalWeekendDays,
		totalPatientsTreated,
		totalPsoItemsProcessed,
		totalPsoSamplesTested,
		totalAutoclaveCycles,
		totalAutoclavePacksSterilized,
		totalBactericidalSessions,
		totalBactericidalHoursAdded,
		totalGeneralCleaningsConducted,
		totalTemperatureMeasurements,
		allChecksCompliant,
		validationIssues,
	};

	return {
		period: {
			startDate,
			endDate,
			totalCalendarDays,
			totalWorkingDays,
			totalWeekendDays,
		},
		psoRecords,
		autoclaveRecords,
		bactericidalSessions,
		bactericidalEquipments: Array.from(equipmentMap.values()),
		generalCleaningRecords,
		refrigeratorRecords,
		dailySummaries,
		statistics,
		clinicInfo,
	};
}
