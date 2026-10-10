import { type SanpinClinicalSpecialty, type SanpinAppointmentSource, SANPIN_VISIT_CONSUMPTION_STANDARDS, type SanpinAppointmentLoadItem, type SanpinChairDailyLoad, type SanpinProposedAutoclaveCycle, type SanpinDailyLoad, type SanpinScheduleDailyLoadReport, type SanpinDateRangeInput, type SanpinSyncOptions } from './types.js';
import { classifyAppointmentSpecialty, extractIsoDateString, generateDateSequence } from './quartzVentilationEngine.js';
import { calculatePsoSampleRequirements, type SterilizationRegimeId } from '../sanpinRegistryEngine.js';

const RU_DAY_NAMES = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
// ─────────────────────────────────────────────────────────────────────────────
// 3. CORE CALCULATION ENGINE: mapScheduleAppointmentsToSanpinDailyLoad
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Главная функция сопоставления расписания визитов и расчета суточной стерилизационной нагрузки:
 * 1. Фильтрует визиты по диапазону дат и статусам (исключая cancelled/no_show);
 * 2. Классифицирует визиты по профилям (терапия, хирургия, ортопедия);
 * 3. Рассчитывает точный расход лотков, боров, наконечников, щипцов и элеваторов;
 * 4. Формирует крафт-пакеты по типоразмерам и рассчитывает необходимое число циклов автоклава под каждое кресло.
 */
export function mapScheduleAppointmentsToSanpinDailyLoad(
	appointments: readonly SanpinAppointmentSource[],
	dateRange: SanpinDateRangeInput,
	options: SanpinSyncOptions = {},
): SanpinScheduleDailyLoadReport {
	const autoclaveCapacity = Math.max(1, Math.min(100, options.autoclaveCapacityPacks ?? 14));
	const allowedStatuses = new Set(
		options.allowedStatuses ?? ["completed", "in_progress", "scheduled", "confirmed"],
	);
	const defaultRegime: SterilizationRegimeId = options.defaultAutoclaveRegime ?? "steam_134_5min";
	const defaultAutoclaveCode = options.defaultAutoclaveCode ?? "АК-01";

	const allDates = generateDateSequence(dateRange.startDate, dateRange.endDate);

	// Индексация визитов по датам
	const appointmentsByDate = new Map<string, SanpinAppointmentSource[]>();
	for (const d of allDates) {
		appointmentsByDate.set(d, []);
	}

	for (const app of appointments) {
		const status = (app.status || "scheduled").toLowerCase();
		if (!allowedStatuses.has(status)) {
			continue;
		}
		const dateStr = extractIsoDateString(app.startsAt);
		if (appointmentsByDate.has(dateStr)) {
			appointmentsByDate.get(dateStr)!.push(app);
		}
	}

	const dailyLoads: SanpinDailyLoad[] = [];

	let totalRangeAppointments = 0;
	let totalRangeTherapy = 0;
	let totalRangeSurgery = 0;
	let totalRangeOrthopedics = 0;

	let totalRangeInstruments = 0;
	let totalRangeBasicTrays = 0;
	let totalRangeBurSets = 0;
	let totalRangeHandpieces = 0;
	let totalRangeSurgicalTrays = 0;
	let totalRangeForceps = 0;
	let totalRangeElevators = 0;
	let totalRangeSyringes = 0;
	let totalRangeOrthopedicTrays = 0;
	let totalRangeImpressionTrays = 0;

	let totalRangeKraftPackages = 0;
	let totalRangeAutoclaveCycles = 0;
	let totalRangePsoSamples = 0;
	let totalRangeChemicalIndicators = 0;

	for (const dateStr of allDates) {
		const dayAppointments = appointmentsByDate.get(dateStr) || [];
		const dateObj = new Date(`${dateStr}T12:00:00.000Z`);
		const dayOfWeekIndex = dateObj.getUTCDay();
		const dayOfWeekRu = RU_DAY_NAMES[dayOfWeekIndex] || "Будний день";

		// Группировка по креслам (chairId)
		const chairBuckets = new Map<string, SanpinAppointmentLoadItem[]>();

		for (const app of dayAppointments) {
			const specialty = classifyAppointmentSpecialty(app, options.doctorSpecialtyMap);
			const standard = SANPIN_VISIT_CONSUMPTION_STANDARDS[specialty];
			const chairId = app.chairId || "chair-default";
			const chairName =
				options.chairNameMap?.[chairId] ||
				(chairId === "chair-default" ? "Стоматологическая установка № 1" : `Кресло ${chairId.slice(0, 8)}`);

			const loadItem: SanpinAppointmentLoadItem = {
				id: app.id,
				startsAt: app.startsAt,
				endsAt: app.endsAt || app.startsAt,
				patientId: app.patientId ?? null,
				doctorUserId: app.doctorUserId ?? null,
				chairId: app.chairId ?? null,
				chairName,
				specialty,
				status: app.status || "scheduled",
				reason: app.reason ?? null,
				comment: app.comment ?? null,
				kraftPackagesCount: standard.totalKraftPackagesCount,
			};

			if (!chairBuckets.has(chairId)) {
				chairBuckets.set(chairId, []);
			}
			chairBuckets.get(chairId)!.push(loadItem);
		}

		// Расчет нагрузки по каждому креслу
		const chairsRecord: Record<string, SanpinChairDailyLoad> = {};
		const chairList: SanpinChairDailyLoad[] = [];

		let dayTherapyCount = 0;
		let daySurgeryCount = 0;
		let dayOrthopedicsCount = 0;

		let dayBasicTrays = 0;
		let dayBurSets = 0;
		let dayHandpieces = 0;
		let daySurgicalTrays = 0;
		let dayForceps = 0;
		let dayElevators = 0;
		let daySyringes = 0;
		let dayOrthopedicTrays = 0;
		let dayImpressionTrays = 0;

		let dayKraft75x150 = 0;
		let dayKraft100x200 = 0;
		let dayKraft150x250 = 0;
		let dayKraft200x300 = 0;

		for (const [chairId, items] of chairBuckets.entries()) {
			let chairTherapy = 0;
			let chairSurgery = 0;
			let chairOrthopedics = 0;

			let chairBasicTrays = 0;
			let chairBurSets = 0;
			let chairHandpieces = 0;
			let chairSurgicalTrays = 0;
			let chairForceps = 0;
			let chairElevators = 0;
			let chairSyringes = 0;
			let chairOrthopedicTrays = 0;
			let chairImpressionTrays = 0;

			let chairKraft75x150 = 0;
			let chairKraft100x200 = 0;
			let chairKraft150x250 = 0;
			let chairKraft200x300 = 0;

			for (const item of items) {
				const std = SANPIN_VISIT_CONSUMPTION_STANDARDS[item.specialty];
				if (item.specialty === "therapy") chairTherapy++;
				else if (item.specialty === "surgery") chairSurgery++;
				else if (item.specialty === "orthopedics") chairOrthopedics++;

				chairBasicTrays += std.basicTraysCount;
				chairBurSets += std.burSetsCount;
				chairHandpieces += std.handpiecesCount;
				chairSurgicalTrays += std.surgicalTraysCount;
				chairForceps += std.forcepsCount;
				chairElevators += std.elevatorsCount;
				chairSyringes += std.syringesCount;
				chairOrthopedicTrays += std.orthopedicTraysCount;
				chairImpressionTrays += std.impressionTraysCount;

				chairKraft75x150 += std.kraftPackagesBySize.size_75x150;
				chairKraft100x200 += std.kraftPackagesBySize.size_100x200;
				chairKraft150x250 += std.kraftPackagesBySize.size_150x250;
				chairKraft200x300 += std.kraftPackagesBySize.size_200x300;
			}

			const chairTotalPatients = chairTherapy + chairSurgery + chairOrthopedics;
			const chairTotalInstruments =
				chairBasicTrays +
				chairBurSets +
				chairHandpieces +
				chairSurgicalTrays +
				chairForceps +
				chairElevators +
				chairSyringes +
				chairOrthopedicTrays +
				chairImpressionTrays;
			const chairTotalKraft = chairKraft75x150 + chairKraft100x200 + chairKraft150x250 + chairKraft200x300;
			const chairAutoclaveCycles = Math.ceil(chairTotalKraft / autoclaveCapacity);

			const chairName = items[0]?.chairName || `Кресло ${chairId}`;

			const chairLoad: SanpinChairDailyLoad = {
				chairId,
				chairName,
				therapyPatientsCount: chairTherapy,
				surgeryPatientsCount: chairSurgery,
				orthopedicsPatientsCount: chairOrthopedics,
				totalPatientsCount: chairTotalPatients,

				basicTraysCount: chairBasicTrays,
				burSetsCount: chairBurSets,
				handpiecesCount: chairHandpieces,
				surgicalTraysCount: chairSurgicalTrays,
				forcepsCount: chairForceps,
				elevatorsCount: chairElevators,
				syringesCount: chairSyringes,
				orthopedicTraysCount: chairOrthopedicTrays,
				impressionTraysCount: chairImpressionTrays,
				totalInstrumentsCount: chairTotalInstruments,

				kraftPackagesCount: chairTotalKraft,
				kraftPackagesBySize: {
					size_75x150: chairKraft75x150,
					size_100x200: chairKraft100x200,
					size_150x250: chairKraft150x250,
					size_200x300: chairKraft200x300,
				},

				autoclaveCyclesCount: chairAutoclaveCycles,
				appointments: items,
			};

			chairsRecord[chairId] = chairLoad;
			chairList.push(chairLoad);

			dayTherapyCount += chairTherapy;
			daySurgeryCount += chairSurgery;
			dayOrthopedicsCount += chairOrthopedics;

			dayBasicTrays += chairBasicTrays;
			dayBurSets += chairBurSets;
			dayHandpieces += chairHandpieces;
			daySurgicalTrays += chairSurgicalTrays;
			dayForceps += chairForceps;
			dayElevators += chairElevators;
			daySyringes += chairSyringes;
			dayOrthopedicTrays += chairOrthopedicTrays;
			dayImpressionTrays += chairImpressionTrays;

			dayKraft75x150 += chairKraft75x150;
			dayKraft100x200 += chairKraft100x200;
			dayKraft150x250 += chairKraft150x250;
			dayKraft200x300 += chairKraft200x300;
		}

		const dayTotalPatients = dayTherapyCount + daySurgeryCount + dayOrthopedicsCount;
		const dayTotalInstruments =
			dayBasicTrays +
			dayBurSets +
			dayHandpieces +
			daySurgicalTrays +
			dayForceps +
			dayElevators +
			daySyringes +
			dayOrthopedicTrays +
			dayImpressionTrays;

		const dayTotalKraftPackages = dayKraft75x150 + dayKraft100x200 + dayKraft150x250 + dayKraft200x300;
		const dayAutoclaveCyclesCount = Math.ceil(dayTotalKraftPackages / autoclaveCapacity);

		// Формирование детализированных циклов стерилизации для автоклава
		const proposedAutoclaveCycles: SanpinProposedAutoclaveCycle[] = [];
		let remainingPacksToPack = dayTotalKraftPackages;

		for (let c = 1; c <= dayAutoclaveCyclesCount; c++) {
			const cyclePacks = Math.min(remainingPacksToPack, autoclaveCapacity);
			remainingPacksToPack -= cyclePacks;

			const cleanDate = dateStr.replace(/-/g, "");
			const cycleCode = `CYC-${cleanDate}-${defaultAutoclaveCode}-#${c}`;

			const cycleItemsList: string[] = [];
			if (dayBasicTrays > 0) cycleItemsList.push(`Базовые терапевтические лотки (до ${dayBasicTrays} шт.)`);
			if (dayHandpieces > 0) cycleItemsList.push(`Стоматологические наконечники KaVo/NSK (${dayHandpieces} шт.)`);
			if (daySurgicalTrays > 0) cycleItemsList.push(`Хирургические лотки и кассеты (${daySurgicalTrays} шт.)`);
			if (dayForceps + dayElevators > 0)
				cycleItemsList.push(`Экстракционные щипцы и элеваторы (${dayForceps + dayElevators} шт.)`);
			if (dayImpressionTrays > 0) cycleItemsList.push(`Слепочные ложки (${dayImpressionTrays} компл.)`);

			proposedAutoclaveCycles.push({
				cycleNumber: c,
				cycleCode,
				autoclaveRegime: defaultRegime,
				targetTemperatureCelsius: 134,
				targetPressureBar: 2.1,
				exposureTimeMinutes: 5,
				packagesCount: cyclePacks,
				descriptionRu: `Стерилизация дневной партии визитов (#${c} из ${dayAutoclaveCyclesCount})`,
				itemsListRu: cycleItemsList,
				chemicalIndicatorsCount: 5, // 5 обязательных контрольных точек камеры КТ-1..КТ-5
			});
		}

		// Расчет контроля ПСО (Форма № 366/у)
		const isCriticalSurgicalDay = daySurgeryCount > 0;
		const { minSampleCount } = calculatePsoSampleRequirements(dayTotalInstruments, isCriticalSurgicalDay);
		const psoAzopyramReagentMl = Number((minSampleCount * 0.5).toFixed(1));
		const psoPhenolphthaleinMl = Number((minSampleCount * 0.5).toFixed(1));
		const estimatedDetergentSolutionLiters = Number(((dayBasicTrays + daySurgicalTrays + dayOrthopedicTrays) * 1.5).toFixed(1));

		// Расчет химических индикаторов (5 на каждый цикл + 1 на каждый крафт-пакет)
		const totalChemicalIndicatorsCount = dayAutoclaveCyclesCount * 5 + dayTotalKraftPackages;

		const isWorkingDay = dayTotalPatients > 0;

		const dailyLoad: SanpinDailyLoad = {
			date: dateStr,
			dayOfWeekRu,
			isWorkingDay,
			therapyPatientsCount: dayTherapyCount,
			surgeryPatientsCount: daySurgeryCount,
			orthopedicsPatientsCount: dayOrthopedicsCount,
			totalPatientsCount: dayTotalPatients,

			totalBasicTraysCount: dayBasicTrays,
			totalBurSetsCount: dayBurSets,
			totalHandpiecesCount: dayHandpieces,
			totalSurgicalTraysCount: daySurgicalTrays,
			totalForcepsCount: dayForceps,
			totalElevatorsCount: dayElevators,
			totalSyringesCount: daySyringes,
			totalOrthopedicTraysCount: dayOrthopedicTrays,
			totalImpressionTraysCount: dayImpressionTrays,
			totalInstrumentsCount: dayTotalInstruments,

			totalKraftPackagesCount: dayTotalKraftPackages,
			kraftPackagesBySize: {
				size_75x150: dayKraft75x150,
				size_100x200: dayKraft100x200,
				size_150x250: dayKraft150x250,
				size_200x300: dayKraft200x300,
			},

			autoclaveCapacityPacks: autoclaveCapacity,
			totalAutoclaveCyclesCount: dayAutoclaveCyclesCount,
			proposedAutoclaveCycles,

			psoBatchTotalCount: dayTotalInstruments,
			psoMinSampleRequired: isWorkingDay ? minSampleCount : 0,
			psoAzopyramReagentMl: isWorkingDay ? psoAzopyramReagentMl : 0,
			psoPhenolphthaleinMl: isWorkingDay ? psoPhenolphthaleinMl : 0,
			estimatedDetergentSolutionLiters,

			totalChemicalIndicatorsCount: isWorkingDay ? totalChemicalIndicatorsCount : 0,

			chairs: chairsRecord,
			chairList,
		};

		dailyLoads.push(dailyLoad);

		totalRangeAppointments += dayAppointments.length;
		totalRangeTherapy += dayTherapyCount;
		totalRangeSurgery += daySurgeryCount;
		totalRangeOrthopedics += dayOrthopedicsCount;

		totalRangeInstruments += dayTotalInstruments;
		totalRangeBasicTrays += dayBasicTrays;
		totalRangeBurSets += dayBurSets;
		totalRangeHandpieces += dayHandpieces;
		totalRangeSurgicalTrays += daySurgicalTrays;
		totalRangeForceps += dayForceps;
		totalRangeElevators += dayElevators;
		totalRangeSyringes += daySyringes;
		totalRangeOrthopedicTrays += dayOrthopedicTrays;
		totalRangeImpressionTrays += dayImpressionTrays;

		totalRangeKraftPackages += dayTotalKraftPackages;
		totalRangeAutoclaveCycles += dayAutoclaveCyclesCount;
		totalRangePsoSamples += isWorkingDay ? minSampleCount : 0;
		totalRangeChemicalIndicators += isWorkingDay ? totalChemicalIndicatorsCount : 0;
	}

	const activeWorkingDaysCount = dailyLoads.filter((d) => d.isWorkingDay).length;

	return {
		dateRange: {
			startDate: extractIsoDateString(dateRange.startDate),
			endDate: extractIsoDateString(dateRange.endDate),
		},
		totalDays: allDates.length,
		activeWorkingDaysCount,
		summary: {
			totalAppointments: totalRangeAppointments,
			totalTherapyPatients: totalRangeTherapy,
			totalSurgeryPatients: totalRangeSurgery,
			totalOrthopedicsPatients: totalRangeOrthopedics,

			totalInstruments: totalRangeInstruments,
			totalBasicTrays: totalRangeBasicTrays,
			totalBurSets: totalRangeBurSets,
			totalHandpieces: totalRangeHandpieces,
			totalSurgicalTrays: totalRangeSurgicalTrays,
			totalForceps: totalRangeForceps,
			totalElevators: totalRangeElevators,
			totalSyringes: totalRangeSyringes,
			totalOrthopedicTrays: totalRangeOrthopedicTrays,
			totalImpressionTrays: totalRangeImpressionTrays,

			totalKraftPackages: totalRangeKraftPackages,
			totalAutoclaveCycles: totalRangeAutoclaveCycles,
			totalPsoSamplesRequired: totalRangePsoSamples,
			totalChemicalIndicators: totalRangeChemicalIndicators,
		},
		dailyLoads,
	};
}
