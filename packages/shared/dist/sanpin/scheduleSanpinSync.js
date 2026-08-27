/**
 * ============================================================================
 * SANPIN 3.3686-21 SCHEDULE & APPOINTMENTS SYNCHRONIZATION ENGINE
 * Сопоставление расписания клиники с реальной стерилизационной нагрузкой:
 * - Подсчет пациентов по профилям: терапия, хирургия, ортопедия;
 * - Нормативный расчет инструментария (лотки, боры, наконечники, щипцы, элеваторы);
 * - Формирование точного числа крафт-пакетов и циклов автоклава под каждое кресло;
 * - Ретроспективная генерация записей журналов ПСО (366/у) и Автоклава (257/у).
 * ============================================================================
 */
import { generateKraftBatchRecords, getKraftMaterialDefinition, } from "./kraftPackageGenerator.js";
import { calculateDigitalStampHash, calculatePsoSampleRequirements, createDefault5ChamberPoints, generateForm257RecordId, generatePsoRecordId, } from "./sanpinRegistryEngine.js";
/**
 * Нормативные коэффициенты расхода инструментов и крафт-пакетов на 1 приём по СанПиН:
 * - Терапия: 1 базовый лоток (100x200) + 1 набор боров (75x150) + 2 наконечника (75x150/100x200) -> 4 пакета;
 * - Хирургия: 1 хирургический лоток (150x250) + 1 щипцы (150x250) + 1 элеваторы (150x250) + 1 шприц (100x200) -> 4 пакета;
 * - Ортопедия: 1 лоток (100x200) + 1 комплект слепочных ложек (150x250) -> 2 пакета.
 */
export const SANPIN_VISIT_CONSUMPTION_STANDARDS = {
    therapy: {
        specialty: "therapy",
        titleRu: "Терапевтический приём",
        basicTraysCount: 1,
        burSetsCount: 1,
        handpiecesCount: 2,
        surgicalTraysCount: 0,
        forcepsCount: 0,
        elevatorsCount: 0,
        syringesCount: 0,
        orthopedicTraysCount: 0,
        impressionTraysCount: 0,
        totalInstrumentsCount: 4,
        totalKraftPackagesCount: 4,
        kraftPackagesBySize: {
            size_75x150: 2, // 1 набор боров + 1 турбинный наконечник
            size_100x200: 2, // 1 базовый смотровой лоток + 1 микромоторный наконечник
            size_150x250: 0,
            size_200x300: 0,
        },
    },
    surgery: {
        specialty: "surgery",
        titleRu: "Хирургический приём",
        basicTraysCount: 0,
        burSetsCount: 0,
        handpiecesCount: 0,
        surgicalTraysCount: 1,
        forcepsCount: 1,
        elevatorsCount: 1,
        syringesCount: 1,
        orthopedicTraysCount: 0,
        impressionTraysCount: 0,
        totalInstrumentsCount: 4,
        totalKraftPackagesCount: 4,
        kraftPackagesBySize: {
            size_75x150: 0,
            size_100x200: 1, // 1 карпульный шприц / ирригатор
            size_150x250: 3, // 1 хирургический лоток + 1 щипцы + 1 элеваторы
            size_200x300: 0,
        },
    },
    orthopedics: {
        specialty: "orthopedics",
        titleRu: "Ортопедический приём",
        basicTraysCount: 0,
        burSetsCount: 0,
        handpiecesCount: 0,
        surgicalTraysCount: 0,
        forcepsCount: 0,
        elevatorsCount: 0,
        syringesCount: 0,
        orthopedicTraysCount: 1,
        impressionTraysCount: 1,
        totalInstrumentsCount: 2,
        totalKraftPackagesCount: 2,
        kraftPackagesBySize: {
            size_75x150: 0,
            size_100x200: 1, // 1 ортопедический смотровой лоток
            size_150x250: 1, // 1 комплект слепочных ложек
            size_200x300: 0,
        },
    },
};
// ─────────────────────────────────────────────────────────────────────────────
// 2. SPECIALTY CLASSIFICATION & NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────
const SURGERY_REGEX = /хирург|удален|экстракц|имплант|синус|резекц|костн.*пластик|апикал|кюретаж|лунк|швы|лоскут|распатор|синуслифт/i;
const ORTHOPEDICS_REGEX = /ортопед|коронк|протез|мост|винир|вкладк|слепок|оттиск|окклюз|бюгел|абатмент|примерк|культев|накладк|акрил|бюгель/i;
const THERAPY_REGEX = /терап|кариес|пульпит|периодонтит|пломб|реставрац|чистк|гигиен|отбеливан|эндо|детск|осмотр|консультац|аирфло|air-flow|скейлинг|герметизац/i;
/**
 * Интеллектуальная классификация визита по специализации на основе:
 * 1. Явного поля `specialty` / `category`;
 * 2. Маппинга врача `doctorSpecialtyMap`;
 * 3. Семантического анализа причины приёма (`reason`), комментария (`comment`) и названия услуги (`serviceTitle`).
 */
export function classifyAppointmentSpecialty(appointment, doctorSpecialtyMap) {
    // 1. Проверка явного поля specialty / category
    const explicit = (appointment.specialty || appointment.category || "").toLowerCase().trim();
    if (explicit) {
        if (explicit.includes("surg") || explicit.includes("хирург") || explicit.includes("implant")) {
            return "surgery";
        }
        if (explicit.includes("ortho") || explicit.includes("ортопед") || explicit.includes("prosth")) {
            return "orthopedics";
        }
        if (explicit.includes("therap") ||
            explicit.includes("терап") ||
            explicit.includes("endo") ||
            explicit.includes("pediatric") ||
            explicit.includes("гигиен")) {
            return "therapy";
        }
    }
    // 2. Проверка специализации доктора
    if (appointment.doctorUserId && doctorSpecialtyMap && doctorSpecialtyMap[appointment.doctorUserId]) {
        const docSpec = String(doctorSpecialtyMap[appointment.doctorUserId]).toLowerCase().trim();
        if (docSpec.includes("surg") || docSpec.includes("хирург") || docSpec.includes("implant")) {
            return "surgery";
        }
        if (docSpec.includes("ortho") || docSpec.includes("ортопед") || docSpec.includes("prosth")) {
            return "orthopedics";
        }
        if (docSpec.includes("therap") ||
            docSpec.includes("терап") ||
            docSpec.includes("endo") ||
            docSpec.includes("pediatric")) {
            return "therapy";
        }
    }
    // 3. Семантический разбор текстовых полей
    const textContent = `${appointment.reason || ""} ${appointment.comment || ""} ${appointment.serviceTitle || ""}`.trim();
    if (textContent) {
        if (ORTHOPEDICS_REGEX.test(textContent)) {
            return "orthopedics";
        }
        if (SURGERY_REGEX.test(textContent)) {
            return "surgery";
        }
        if (THERAPY_REGEX.test(textContent)) {
            return "therapy";
        }
    }
    // 4. Дефолт: терапевтический приём
    return "therapy";
}
/**
 * Извлекает календарную дату в формате YYYY-MM-DD из ISO строки или Date.
 */
export function extractIsoDateString(value) {
    if (typeof value === "string") {
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
        if (match) {
            return `${match[1]}-${match[2]}-${match[3]}`;
        }
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) {
            return d.toISOString().slice(0, 10);
        }
        return value.slice(0, 10);
    }
    return value.toISOString().slice(0, 10);
}
/**
 * Генерирует массив всех календарных дат между startDate и endDate (включительно).
 */
export function generateDateSequence(startDateStr, endDateStr) {
    const start = extractIsoDateString(startDateStr);
    const end = extractIsoDateString(endDateStr);
    if (start > end) {
        return [start];
    }
    const dates = [];
    const current = new Date(`${start}T00:00:00.000Z`);
    const target = new Date(`${end}T00:00:00.000Z`);
    while (current <= target) {
        dates.push(current.toISOString().slice(0, 10));
        current.setUTCDate(current.getUTCDate() + 1);
    }
    return dates;
}
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
export function mapScheduleAppointmentsToSanpinDailyLoad(appointments, dateRange, options = {}) {
    const autoclaveCapacity = Math.max(1, Math.min(100, options.autoclaveCapacityPacks ?? 14));
    const allowedStatuses = new Set(options.allowedStatuses ?? ["completed", "in_progress", "scheduled", "confirmed"]);
    const defaultRegime = options.defaultAutoclaveRegime ?? "steam_134_5min";
    const defaultAutoclaveCode = options.defaultAutoclaveCode ?? "АК-01";
    const allDates = generateDateSequence(dateRange.startDate, dateRange.endDate);
    // Индексация визитов по датам
    const appointmentsByDate = new Map();
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
            appointmentsByDate.get(dateStr).push(app);
        }
    }
    const dailyLoads = [];
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
        const chairBuckets = new Map();
        for (const app of dayAppointments) {
            const specialty = classifyAppointmentSpecialty(app, options.doctorSpecialtyMap);
            const standard = SANPIN_VISIT_CONSUMPTION_STANDARDS[specialty];
            const chairId = app.chairId || "chair-default";
            const chairName = options.chairNameMap?.[chairId] ||
                (chairId === "chair-default" ? "Стоматологическая установка № 1" : `Кресло ${chairId.slice(0, 8)}`);
            const loadItem = {
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
            chairBuckets.get(chairId).push(loadItem);
        }
        // Расчет нагрузки по каждому креслу
        const chairsRecord = {};
        const chairList = [];
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
                if (item.specialty === "therapy")
                    chairTherapy++;
                else if (item.specialty === "surgery")
                    chairSurgery++;
                else if (item.specialty === "orthopedics")
                    chairOrthopedics++;
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
            const chairTotalInstruments = chairBasicTrays +
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
            const chairLoad = {
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
        const dayTotalInstruments = dayBasicTrays +
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
        const proposedAutoclaveCycles = [];
        let remainingPacksToPack = dayTotalKraftPackages;
        for (let c = 1; c <= dayAutoclaveCyclesCount; c++) {
            const cyclePacks = Math.min(remainingPacksToPack, autoclaveCapacity);
            remainingPacksToPack -= cyclePacks;
            const cleanDate = dateStr.replace(/-/g, "");
            const cycleCode = `CYC-${cleanDate}-${defaultAutoclaveCode}-#${c}`;
            const cycleItemsList = [];
            if (dayBasicTrays > 0)
                cycleItemsList.push(`Базовые терапевтические лотки (до ${dayBasicTrays} шт.)`);
            if (dayHandpieces > 0)
                cycleItemsList.push(`Стоматологические наконечники KaVo/NSK (${dayHandpieces} шт.)`);
            if (daySurgicalTrays > 0)
                cycleItemsList.push(`Хирургические лотки и кассеты (${daySurgicalTrays} шт.)`);
            if (dayForceps + dayElevators > 0)
                cycleItemsList.push(`Экстракционные щипцы и элеваторы (${dayForceps + dayElevators} шт.)`);
            if (dayImpressionTrays > 0)
                cycleItemsList.push(`Слепочные ложки (${dayImpressionTrays} компл.)`);
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
        const dailyLoad = {
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
/**
 * Генерирует ретроспективные записи журнала ПСО (Форма № 366/у)
 * на основе рассчитанной суточной нагрузки инструментов по расписанию.
 */
export function generateRetrospectivePsoRecordsFromDailyLoad(dailyLoad, options = {}) {
    if (!dailyLoad.isWorkingDay || dailyLoad.totalInstrumentsCount === 0) {
        return [];
    }
    const operatorName = options.operatorStaffFullName || "Смирнова А.В.";
    const operatorPosition = options.operatorStaffPosition || "Медсестра ЦСО";
    const detergent = options.detergentBrand || "Оптимакс Про 1.0%";
    const records = [];
    let seq = 1;
    // 1. Терапевтический инструментарий (лотки + боры + наконечники)
    if (dailyLoad.totalBasicTraysCount > 0 || dailyLoad.totalBurSetsCount > 0 || dailyLoad.totalHandpiecesCount > 0) {
        const batchCount = dailyLoad.totalBasicTraysCount * 5 + dailyLoad.totalBurSetsCount * 6 + dailyLoad.totalHandpiecesCount;
        const { minSampleCount } = calculatePsoSampleRequirements(batchCount, false);
        records.push({
            id: generatePsoRecordId(dailyLoad.date, seq++),
            timestamp: `${dailyLoad.date}T13:30:00.000Z`,
            instrumentName: "Терапевтический смотровой инструментарий (зеркала, зонды, пинцеты, штопферы, наконечники)",
            categoryId: "therapeutic_kit",
            batchItemCount: batchCount,
            testedSampleCount: minSampleCount,
            testType: "both_standard",
            isAzopyramNegative: true,
            isPhenolphthaleinNegative: true,
            isSudanNegative: true,
            detergentBrand: detergent,
            isBatchApproved: true,
            operatorStaffFullName: operatorName,
            operatorStaffPosition: operatorPosition,
            electronicStampVerified: true,
            notes: `ПСО по расписанию дня: ${dailyLoad.therapyPatientsCount} терапевтических пациентов`,
        });
    }
    // 2. Хирургический инструментарий (щипцы, элеваторы, хирургические лотки)
    if (dailyLoad.totalSurgicalTraysCount > 0 || dailyLoad.totalForcepsCount > 0 || dailyLoad.totalElevatorsCount > 0) {
        const batchCount = dailyLoad.totalSurgicalTraysCount * 5 +
            dailyLoad.totalForcepsCount * 3 +
            dailyLoad.totalElevatorsCount * 3 +
            dailyLoad.totalSyringesCount;
        const { minSampleCount } = calculatePsoSampleRequirements(batchCount, true);
        records.push({
            id: generatePsoRecordId(dailyLoad.date, seq++),
            timestamp: `${dailyLoad.date}T14:15:00.000Z`,
            instrumentName: "Хирургический инструментарий (щипцы экстракционные, элеваторы, кюреты Лукаса, шприцы)",
            categoryId: "surgical_kit",
            batchItemCount: batchCount,
            testedSampleCount: minSampleCount,
            testType: "both_standard",
            isAzopyramNegative: true,
            isPhenolphthaleinNegative: true,
            isSudanNegative: true,
            detergentBrand: detergent,
            isBatchApproved: true,
            operatorStaffFullName: operatorName,
            operatorStaffPosition: operatorPosition,
            electronicStampVerified: true,
            notes: `ПСО хирургической смены: ${dailyLoad.surgeryPatientsCount} хирургических пациентов`,
        });
    }
    // 3. Ортопедический инструментарий (лотки + слепочные ложки)
    if (dailyLoad.totalOrthopedicTraysCount > 0 || dailyLoad.totalImpressionTraysCount > 0) {
        const batchCount = dailyLoad.totalOrthopedicTraysCount * 4 + dailyLoad.totalImpressionTraysCount * 2;
        const { minSampleCount } = calculatePsoSampleRequirements(batchCount, false);
        records.push({
            id: generatePsoRecordId(dailyLoad.date, seq++),
            timestamp: `${dailyLoad.date}T15:00:00.000Z`,
            instrumentName: "Ортопедический инструментарий (лотки препарирования, слепочные металлические ложки)",
            categoryId: "orthopedic_kit",
            batchItemCount: batchCount,
            testedSampleCount: minSampleCount,
            testType: "both_standard",
            isAzopyramNegative: true,
            isPhenolphthaleinNegative: true,
            isSudanNegative: true,
            detergentBrand: detergent,
            isBatchApproved: true,
            operatorStaffFullName: operatorName,
            operatorStaffPosition: operatorPosition,
            electronicStampVerified: true,
            notes: `ПСО ортопедического приёма: ${dailyLoad.orthopedicsPatientsCount} ортопедических пациентов`,
        });
    }
    return records;
}
/**
 * Генерирует ретроспективные записи журнала контроля работы автоклавов (Форма № 257/у)
 * на основе предложенных циклов стерилизации по фактической дневной загрузке.
 */
export function generateRetrospectiveAutoclaveRecordsFromDailyLoad(dailyLoad, options = {}) {
    if (!dailyLoad.isWorkingDay || dailyLoad.totalAutoclaveCyclesCount === 0) {
        return [];
    }
    const operatorName = options.operatorStaffFullName || "Смирнова А.В.";
    const operatorPosition = options.operatorStaffPosition || "Медсестра ЦСО";
    const headNurse = options.headNurseFullName || "Иванова М.П.";
    const sterilizerBrand = options.autoclaveBrandModel || "Melag Vacuklav 23B+";
    const serialNumber = options.autoclaveSerialNumber || "VK-2024-8841";
    const pkgMaterial = options.packageMaterial || "paper_self_seal_single";
    const materialDef = getKraftMaterialDefinition(pkgMaterial);
    const records = [];
    for (const cycle of dailyLoad.proposedAutoclaveCycles) {
        const chamberPoints = createDefault5ChamberPoints("Интеграл-134 (Класс 5)", true);
        const id = generateForm257RecordId(dailyLoad.date, cycle.cycleNumber, "АК-01");
        const stampHash = calculateDigitalStampHash({
            id,
            date: dailyLoad.date,
            cycleNumber: cycle.cycleNumber,
            sterilizerCode: "АК-01",
            actualTemp: 134.4,
            actualPressure: 2.15,
            actualTime: 5,
            isPassed: true,
            operatorName,
        });
        const record = {
            id,
            date: dailyLoad.date,
            cycleNumber: cycle.cycleNumber,
            sterilizerId: "sterilizer-ak01",
            sterilizerCode: "АК-01",
            sterilizerBrandModel: sterilizerBrand,
            sterilizerSerialNumber: serialNumber,
            regimeId: cycle.autoclaveRegime,
            regimeNameRu: "Паровой 134°C / 5 мин (2.1 бар) — Скоростной B-класс",
            targetTemperatureCelsius: 134,
            targetPressureBar: 2.1,
            targetExposureMinutes: 5,
            actualTemperatureCelsius: 134.4,
            actualPressureBar: 2.15,
            actualExposureMinutes: 5,
            itemsDescriptionRu: cycle.itemsListRu.join("; "),
            packsCount: cycle.packagesCount,
            packagingType: pkgMaterial,
            packagingNameRu: materialDef.shortLabelRu,
            shelfLifeDays: materialDef.statutoryShelfLifeDays,
            chamberPoints,
            areAllPointsPassed: true,
            chemicalIndicatorNameRu: "Винар ИнтеТЕСТ-В-134/5 (Класс 5 Интеграл)",
            isCyclePassed: true,
            status: "sterile_passed",
            operatorStaffFullName: operatorName,
            operatorStaffPosition: operatorPosition,
            headNurseSignatureFullName: headNurse,
            isHeadNurseVerified: true,
            verificationTimestamp: `${dailyLoad.date}T18:00:00.000Z`,
            digitalStampHash: stampHash,
            notes: `Стерилизация партии по расписанию дня (${cycle.packagesCount} пакетов на ${dailyLoad.totalPatientsCount} пациентов)`,
            createdAt: `${dailyLoad.date}T18:00:00.000Z`,
        };
        records.push(record);
    }
    return records;
}
/**
 * Генерирует массив крафт-пакетов (KraftPackageRecord) со штрихкодами
 * для всей дневной партии по реальной структуре визитов.
 */
export function generateRetrospectiveKraftPackagesFromDailyLoad(dailyLoad, options = {}) {
    if (!dailyLoad.isWorkingDay || dailyLoad.totalKraftPackagesCount === 0) {
        return [];
    }
    const pkgMaterial = options.packageMaterial || "paper_self_seal_single";
    const operatorName = options.operatorStaffFullName || "Смирнова А.В.";
    const allRecords = [];
    // 1. Терапевтические смотровые лотки
    if (dailyLoad.totalBasicTraysCount > 0) {
        const trayRecords = generateKraftBatchRecords({
            autoclaveId: "АК-01",
            cycleNumber: 1,
            packageType: pkgMaterial,
            packageSize: "size_100x200",
            toolSetId: "set_therapeutic_tray",
            quantity: dailyLoad.totalBasicTraysCount,
            operatorName,
            customPackDate: `${dailyLoad.date}T09:00:00.000Z`,
            customBatchId: `KB-${dailyLoad.date.replace(/-/g, "")}-TER-TRAY`,
            notes: `Базовые смотровые лотки (${dailyLoad.therapyPatientsCount} терапевтических визитов)`,
        });
        allRecords.push(...trayRecords);
    }
    // 2. Наборы боров
    if (dailyLoad.totalBurSetsCount > 0) {
        const burRecords = generateKraftBatchRecords({
            autoclaveId: "АК-01",
            cycleNumber: 1,
            packageType: pkgMaterial,
            packageSize: "size_75x150",
            toolSetId: "set_endodontic_burs",
            quantity: dailyLoad.totalBurSetsCount,
            operatorName,
            customPackDate: `${dailyLoad.date}T09:15:00.000Z`,
            customBatchId: `KB-${dailyLoad.date.replace(/-/g, "")}-BURS`,
            notes: `Наборы боров и фрез (${dailyLoad.totalBurSetsCount} шт.)`,
        });
        allRecords.push(...burRecords);
    }
    // 3. Хирургические наборы
    if (dailyLoad.totalSurgicalTraysCount > 0) {
        const surgRecords = generateKraftBatchRecords({
            autoclaveId: "АК-01",
            cycleNumber: 2,
            packageType: pkgMaterial,
            packageSize: "size_150x250",
            toolSetId: "set_surgical_extraction",
            quantity: dailyLoad.totalSurgicalTraysCount,
            operatorName,
            customPackDate: `${dailyLoad.date}T10:00:00.000Z`,
            customBatchId: `KB-${dailyLoad.date.replace(/-/g, "")}-SURG`,
            notes: `Хирургические экстракционные наборы (${dailyLoad.surgeryPatientsCount} визитов)`,
        });
        allRecords.push(...surgRecords);
    }
    // 4. Ортопедические наборы
    if (dailyLoad.totalOrthopedicTraysCount > 0) {
        const orthoRecords = generateKraftBatchRecords({
            autoclaveId: "АК-01",
            cycleNumber: 2,
            packageType: pkgMaterial,
            packageSize: "size_100x200",
            toolSetId: "set_orthopedic_prep",
            quantity: dailyLoad.totalOrthopedicTraysCount,
            operatorName,
            customPackDate: `${dailyLoad.date}T10:30:00.000Z`,
            customBatchId: `KB-${dailyLoad.date.replace(/-/g, "")}-ORTHO`,
            notes: `Ортопедические наборы (${dailyLoad.orthopedicsPatientsCount} визитов)`,
        });
        allRecords.push(...orthoRecords);
    }
    return allRecords;
}
