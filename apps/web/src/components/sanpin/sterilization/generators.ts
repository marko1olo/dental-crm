/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION & PSO: DAILY SHIFT & MONTHLY AUTO-GENERATORS
 * (Layer 2: Daily shift nurse log bundle and Rospotrebnadzor monthly inspection dossier)
 * ============================================================================
 */

import {
	calculateKraftSterilityExpiration,
	createDefaultChamberPoints,
	generateDigitalStampHash,
} from "./calculations.js";
import {
	exportForm257ToCsv,
	exportPsoToCsv,
} from "./csvExporters.js";
import {
	generateCombinedInspectionDossierHtml,
	generateForm257PrintHtml,
	generatePso366PrintHtml,
} from "./htmlRenderers.js";
import {
	DEFAULT_CLINIC_REQUISITES,
	STATUTORY_PACKAGING_TYPES,
	STATUTORY_REGIMES,
	STATUTORY_STERILIZERS,
	type ClinicRequisites,
	type DailyShiftSanpinLogBundle,
	type Form257CycleRecord,
	type KraftPackageItem,
	type MonthlySanpinGenerationOptions,
	type MonthlySanpinJournalBundle,
	type PsoTestRecord,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 5. DAILY SHIFT & MONTHLY INSPECTION AUTO-GENERATORS
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES_RU = [
	"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
	"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function generateDailyShiftSanpinLog(params: {
	date?: string;
	operatorFullName?: string;
	shiftNumber?: number;
	clinicInfo?: ClinicRequisites;
}): DailyShiftSanpinLogBundle {
	const now = new Date();
	const pad2 = (n: number) => String(n).padStart(2, "0");
	const dateStr = params.date || `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
	const operatorName = params.operatorFullName || "Медсестра ЦСО";
	const shiftNum = params.shiftNumber || 1;

	const melag = STATUTORY_STERILIZERS[0]!;
	const euronda = STATUTORY_STERILIZERS[1]!;

	const cycles: Form257CycleRecord[] = [
		{
			id: `cyc-${dateStr}-1`,
			date: dateStr,
			time: "08:35",
			cycleNumber: 1,
			sterilizerId: melag.id,
			sterilizerCode: melag.code,
			sterilizerBrandModel: melag.brandModel,
			regimeId: "steam_134_5min",
			regimeNameRu: "Паровой 134°C / 5 мин (2.15 бар) — Скоростной B-класс",
			itemsDescriptionRu: "Терапевтические смотровые наборы (12 шт), турбинные наконечники Ti-Max (6 шт)",
			packsCount: 18,
			packagingType: "kraft_heat_sealed",
			actualTemperatureCelsius: 134.6,
			actualPressureBar: 2.16,
			actualExposureMinutes: 5.2,
			indicatorClass: "class5_integrating",
			indicatorTradeNameRu: "Интетест-В-134/5 (Внутренний)",
			chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 1, operatorFullName: operatorName }),
			notes: "Утренний базовый цикл, тест Бови-Дика пройден перед сменой",
			createdAt: `${dateStr}T08:35:00.000Z`,
		},
		{
			id: `cyc-${dateStr}-2`,
			date: dateStr,
			time: "11:45",
			cycleNumber: 2,
			sterilizerId: melag.id,
			sterilizerCode: melag.code,
			sterilizerBrandModel: melag.brandModel,
			regimeId: "steam_134_20min_prion",
			regimeNameRu: "Паровой 134°C / 20 мин (2.15 бар) — Хирургический / Прионный",
			itemsDescriptionRu: "Хирургический имплантологический сет (элеваторы, щипцы, костные распаторы, кюреты Лукаса)",
			packsCount: 8,
			packagingType: "laminated_heat_sealed",
			actualTemperatureCelsius: 134.5,
			actualPressureBar: 2.15,
			actualExposureMinutes: 20.4,
			indicatorClass: "class5_integrating",
			indicatorTradeNameRu: "Интетест-В-134/5 (Внутренний)",
			chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 2, operatorFullName: operatorName }),
			notes: "Хирургический протокол, двойной барьерный шов термосварки",
			createdAt: `${dateStr}T11:45:00.000Z`,
		},
		{
			id: `cyc-${dateStr}-3`,
			date: dateStr,
			time: "15:20",
			cycleNumber: 3,
			sterilizerId: euronda.id,
			sterilizerCode: euronda.code,
			sterilizerBrandModel: euronda.brandModel,
			regimeId: "steam_121_20min",
			regimeNameRu: "Паровой 121°C / 20 мин (1.15 бар) — Щадящий (термолабильные)",
			itemsDescriptionRu: "Слепочные ложки металлические (4 шт), ретракторы OptraGate (8 шт), эндодонтические кассеты",
			packsCount: 12,
			packagingType: "kraft_self_adhesive",
			actualTemperatureCelsius: 121.4,
			actualPressureBar: 1.15,
			actualExposureMinutes: 20.0,
			indicatorClass: "class4_multivariable",
			indicatorTradeNameRu: "Стеритест-В-121/20 (Многопеременный)",
			chamberPoints: createDefaultChamberPoints("Стеритест-В-121/20", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 3, operatorFullName: operatorName }),
			notes: "Вечерний деликатный цикл перед закрытием смены",
			createdAt: `${dateStr}T15:20:00.000Z`,
		},
	];

	const psoRecords: PsoTestRecord[] = [
		{
			id: `pso-${dateStr}-1`,
			date: dateStr,
			time: "08:15",
			instrumentName: "Терапевтический инструментарий (зеркала, зонды, гладилки-штопферы)",
			batchItemCount: 120,
			testedSampleCount: 4,
			minSampleRequired: 3,
			isSamplingSufficient: true,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "«Дезодент» (концентрат 1.5%) + УЗ-ванна",
			isBatchApproved: true,
			rejectionReason: null,
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 101, operatorFullName: operatorName, secretSalt: "PSO" }),
			notes: "Утренний контроль перед первым циклом. Азопирам и фенолфталеин отрицательные.",
			createdAt: `${dateStr}T08:15:00.000Z`,
		},
		{
			id: `pso-${dateStr}-2`,
			date: dateStr,
			time: "11:20",
			instrumentName: "Хирургический инструментарий (элеваторы, распаторы, щипцы)",
			batchItemCount: 45,
			testedSampleCount: 5,
			minSampleRequired: 5,
			isSamplingSufficient: true,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "«Ника-Экстра М» (энзимный комплекс)",
			isBatchApproved: true,
			rejectionReason: null,
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 102, operatorFullName: operatorName, secretSalt: "PSO" }),
			notes: "Хирургическая серия, повышенная выборка 5 шт. Очистка 100% норма.",
			createdAt: `${dateStr}T11:20:00.000Z`,
		},
		{
			id: `pso-${dateStr}-3`,
			date: dateStr,
			time: "14:50",
			instrumentName: "Стоматологические наконечники и эндодонтический инструмент",
			batchItemCount: 75,
			testedSampleCount: 3,
			minSampleRequired: 3,
			isSamplingSufficient: true,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "«Эстилодез» (щелочной состав)",
			isBatchApproved: true,
			rejectionReason: null,
			operatorFullName: operatorName,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: 103, operatorFullName: operatorName, secretSalt: "PSO" }),
			notes: "Судан III отрицательный (масляные загрязнения смыты).",
			createdAt: `${dateStr}T14:50:00.000Z`,
		},
	];

	const kraftPackages: KraftPackageItem[] = [];
	const dateCompact = dateStr.replace(/-/g, "");

	const expTherapy = calculateKraftSterilityExpiration(dateStr, "kraft_heat_sealed");
	for (let i = 1; i <= 6; i++) {
		const barcode = `DNT-AK01-D${dateCompact}-S${String(i).padStart(3, "0")}-${expTherapy.expDateFormatted.replace(/-/g, "")}`;
		kraftPackages.push({
			id: `kp-${dateStr}-c1-${i}`,
			barcode,
			batchNumber: `D${dateCompact}`,
			packageSerialNumber: i,
			toolSetNameRu: "Набор смотровой терапевтический",
			itemsIncluded: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет", "Гладилка-штопфер"],
			packagingType: "kraft_heat_sealed",
			packagingNameRu: STATUTORY_PACKAGING_TYPES.kraft_heat_sealed.nameRu,
			sterilizerCode: "АК-01",
			cycleNumber: 1,
			packDate: dateStr,
			expDate: expTherapy.expDateFormatted,
			daysLifespan: expTherapy.daysLifespan,
			daysRemaining: expTherapy.daysRemaining,
			status: expTherapy.status,
			operatorFullName: operatorName,
			indicatorVerified: true,
			notes: "Шов термосварки >= 8 мм",
			createdAt: `${dateStr}T08:40:00.000Z`,
		});
	}

	const expSurgery = calculateKraftSterilityExpiration(dateStr, "laminated_heat_sealed");
	for (let i = 1; i <= 4; i++) {
		const barcode = `DNT-AK01-S${dateCompact}-S${String(i).padStart(3, "0")}-${expSurgery.expDateFormatted.replace(/-/g, "")}`;
		kraftPackages.push({
			id: `kp-${dateStr}-c2-${i}`,
			barcode,
			batchNumber: `S${dateCompact}`,
			packageSerialNumber: i,
			toolSetNameRu: "Хирургический имплантологический сет",
			itemsIncluded: ["Элеватор прямой", "Элеватор штыковидный", "Распатор костный", "Кюрета Лукаса"],
			packagingType: "laminated_heat_sealed",
			packagingNameRu: STATUTORY_PACKAGING_TYPES.laminated_heat_sealed.nameRu,
			sterilizerCode: "АК-01",
			cycleNumber: 2,
			packDate: dateStr,
			expDate: expSurgery.expDateFormatted,
			daysLifespan: expSurgery.daysLifespan,
			daysRemaining: expSurgery.daysRemaining,
			status: expSurgery.status,
			operatorFullName: operatorName,
			indicatorVerified: true,
			notes: "Комбинированная упаковка пленка/бумага",
			createdAt: `${dateStr}T11:50:00.000Z`,
		});
	}

	const summaryTextRu = `Смена № ${shiftNum} за ${dateStr} успешно зафиксирована. Проведено 3 цикла автоклавирования (38 упаковок), 3 серии ПСО (100% норма), сгенерировано ${kraftPackages.length} маркированных крафт-пакетов. Подпись: ${operatorName}`;

	return {
		date: dateStr,
		shiftNumber: shiftNum,
		operatorFullName: operatorName,
		operatorPosition: "Медсестра ЦСО",
		electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: shiftNum, operatorFullName: operatorName }),
		cycles,
		psoRecords,
		kraftPackages,
		summaryTextRu,
	};
}

export function generateMonthlySanpinJournal(
	options: MonthlySanpinGenerationOptions,
): MonthlySanpinJournalBundle {
	const {
		year,
		month,
		clinicInfo = DEFAULT_CLINIC_REQUISITES,
		primaryOperatorFullName = "Медсестра ЦСО",
		secondaryOperatorFullName = "Оператор стерилизационной",
		includeSaturdays = true,
		includeSundays = false,
		dailyPatientLoadLevel = "standard",
	} = options;

	const pad2 = (n: number) => String(n).padStart(2, "0");
	const monthFormattedRu = `${MONTH_NAMES_RU[month - 1] || "Месяц"} ${year} г.`;

	const daysInMonth = new Date(year, month, 0).getDate();
	const workingDates: string[] = [];

	for (let d = 1; d <= daysInMonth; d++) {
		const dateObj = new Date(year, month - 1, d);
		const dayOfWeek = dateObj.getDay();
		const isSunday = dayOfWeek === 0;
		const isSaturday = dayOfWeek === 6;

		if (isSunday && !includeSundays) continue;
		if (isSaturday && !includeSaturdays) continue;

		workingDates.push(`${year}-${pad2(month)}-${pad2(d)}`);
	}

	const allCycles: Form257CycleRecord[] = [];
	const allPsoRecords: PsoTestRecord[] = [];
	const allKraftPackages: KraftPackageItem[] = [];

	let globalCycleCounter = 1;
	let globalPsoCounter = 1;

	const loadMultiplier = dailyPatientLoadLevel === "high" ? 1.3 : dailyPatientLoadLevel === "moderate" ? 0.8 : 1.0;

	for (let dayIdx = 0; dayIdx < workingDates.length; dayIdx++) {
		const dateStr = workingDates[dayIdx]!;
		const isAltShift = dayIdx % 2 === 1;
		const operator = isAltShift ? secondaryOperatorFullName : primaryOperatorFullName;

		const c1Packs = Math.round(16 * loadMultiplier);
		allCycles.push({
			id: `cyc-${year}${pad2(month)}-${globalCycleCounter}`,
			date: dateStr,
			time: "08:30",
			cycleNumber: (dayIdx % 4) + 1,
			sterilizerId: STATUTORY_STERILIZERS[0]!.id,
			sterilizerCode: STATUTORY_STERILIZERS[0]!.code,
			sterilizerBrandModel: STATUTORY_STERILIZERS[0]!.brandModel,
			regimeId: "steam_134_5min",
			regimeNameRu: STATUTORY_REGIMES[0]!.nameRu,
			itemsDescriptionRu: "Терапевтические смотровые наборы (зеркала, зонды, гладилки), турбинные наконечники NSK",
			packsCount: c1Packs,
			packagingType: "kraft_heat_sealed",
			actualTemperatureCelsius: +(134.4 + (dayIdx % 5) * 0.1).toFixed(1),
			actualPressureBar: +(2.14 + (dayIdx % 4) * 0.01).toFixed(2),
			actualExposureMinutes: 5.1,
			indicatorClass: "class5_integrating",
			indicatorTradeNameRu: "Интетест-В-134/5 (Внутренний)",
			chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operator,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: globalCycleCounter, operatorFullName: operator }),
			notes: "Утренний цикл, тест Бови-Дика пройден",
			createdAt: `${dateStr}T08:30:00.000Z`,
		});

		const c2Packs = Math.round(8 * loadMultiplier);
		allCycles.push({
			id: `cyc-${year}${pad2(month)}-${globalCycleCounter + 1}`,
			date: dateStr,
			time: "11:30",
			cycleNumber: (dayIdx % 4) + 2,
			sterilizerId: STATUTORY_STERILIZERS[0]!.id,
			sterilizerCode: STATUTORY_STERILIZERS[0]!.code,
			sterilizerBrandModel: STATUTORY_STERILIZERS[0]!.brandModel,
			regimeId: "steam_134_20min_prion",
			regimeNameRu: STATUTORY_REGIMES[1]!.nameRu,
			itemsDescriptionRu: "Хирургический имплантологический набор (элеваторы, костные распаторы, кюреты, шовный набор)",
			packsCount: c2Packs,
			packagingType: "laminated_heat_sealed",
			actualTemperatureCelsius: +(134.5 + (dayIdx % 3) * 0.1).toFixed(1),
			actualPressureBar: 2.15,
			actualExposureMinutes: 20.4,
			indicatorClass: "class5_integrating",
			indicatorTradeNameRu: "Интетест-В-134/5 (Внутренний)",
			chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operator,
			operatorPosition: "Медсестра ЦСО",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: globalCycleCounter + 1, operatorFullName: operator }),
			notes: "Хирургический протокол, двойной барьерный шов",
			createdAt: `${dateStr}T11:30:00.000Z`,
		});

		const c3Packs = Math.round(12 * loadMultiplier);
		allCycles.push({
			id: `cyc-${year}${pad2(month)}-${globalCycleCounter + 2}`,
			date: dateStr,
			time: "15:15",
			cycleNumber: (dayIdx % 4) + 3,
			sterilizerId: STATUTORY_STERILIZERS[1]!.id,
			sterilizerCode: STATUTORY_STERILIZERS[1]!.code,
			sterilizerBrandModel: STATUTORY_STERILIZERS[1]!.brandModel,
			regimeId: "steam_121_20min",
			regimeNameRu: STATUTORY_REGIMES[2]!.nameRu,
			itemsDescriptionRu: "Слепочные ложки металлические, ретракторы OptraGate, эндодонтические кассеты",
			packsCount: c3Packs,
			packagingType: "kraft_self_adhesive",
			actualTemperatureCelsius: 121.4,
			actualPressureBar: 1.15,
			actualExposureMinutes: 20.0,
			indicatorClass: "class4_multivariable",
			indicatorTradeNameRu: "Стеритест-В-121/20 (Многопеременный)",
			chamberPoints: createDefaultChamberPoints("Стеритест-В-121/20", true),
			areAllIndicatorsPassed: true,
			cycleStatus: "passed",
			failureReasons: [],
			operatorFullName: operator,
			operatorPosition: "Медсестра стерилизационной",
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: globalCycleCounter + 2, operatorFullName: operator }),
			notes: "Деликатный режим полимеров",
			createdAt: `${dateStr}T15:15:00.000Z`,
		});

		globalCycleCounter += 3;

		allPsoRecords.push(
			{
				id: `pso-${year}${pad2(month)}-${globalPsoCounter}`,
				date: dateStr,
				time: "08:10",
				instrumentName: "Терапевтический инструментарий (зеркала, зонды, гладилки-штопферы)",
				batchItemCount: Math.round(110 * loadMultiplier),
				testedSampleCount: 4,
				minSampleRequired: 3,
				isSamplingSufficient: true,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
				detergentBrand: "«Дезодент» (концентрат 1.5%) + УЗ-мойка",
				isBatchApproved: true,
				rejectionReason: null,
				operatorFullName: operator,
				operatorPosition: "Медсестра ЦСО",
				electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: globalPsoCounter, operatorFullName: operator, secretSalt: "PSO" }),
				notes: "Утренний контроль перед автоклавированием. Обе пробы отрицательные.",
				createdAt: `${dateStr}T08:10:00.000Z`,
			},
			{
				id: `pso-${year}${pad2(month)}-${globalPsoCounter + 1}`,
				date: dateStr,
				time: "11:15",
				instrumentName: "Хирургический инструментарий (элеваторы, щипцы, кюреты)",
				batchItemCount: Math.round(45 * loadMultiplier),
				testedSampleCount: 5,
				minSampleRequired: 5,
				isSamplingSufficient: true,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
				detergentBrand: "«Ника-Экстра М» (энзимный комплекс)",
				isBatchApproved: true,
				rejectionReason: null,
				operatorFullName: operator,
				operatorPosition: "Медсестра ЦСО",
				electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: globalPsoCounter + 1, operatorFullName: operator, secretSalt: "PSO" }),
				notes: "Хирургия, повышена выборка до 5 шт. Качество ПСО 100%.",
				createdAt: `${dateStr}T11:15:00.000Z`,
			},
		);

		globalPsoCounter += 2;

		const expTherapy = calculateKraftSterilityExpiration(dateStr, "kraft_heat_sealed");
		const expSurgery = calculateKraftSterilityExpiration(dateStr, "laminated_heat_sealed");
		const dateCompact = dateStr.replace(/-/g, "");

		for (let k = 1; k <= 3; k++) {
			allKraftPackages.push({
				id: `kp-${year}${pad2(month)}-${dayIdx + 1}-t${k}`,
				barcode: `DNT-AK01-D${dateCompact}-S${String(k).padStart(3, "0")}-${expTherapy.expDateFormatted.replace(/-/g, "")}`,
				batchNumber: `D${dateCompact}`,
				packageSerialNumber: k,
				toolSetNameRu: "Набор смотровой терапевтический",
				itemsIncluded: ["Зеркало стоматологическое", "Зонд угловой", "Пинцет анатомический"],
				packagingType: "kraft_heat_sealed",
				packagingNameRu: STATUTORY_PACKAGING_TYPES.kraft_heat_sealed.nameRu,
				sterilizerCode: "АК-01",
				cycleNumber: 1,
				packDate: dateStr,
				expDate: expTherapy.expDateFormatted,
				daysLifespan: expTherapy.daysLifespan,
				daysRemaining: expTherapy.daysRemaining,
				status: expTherapy.status,
				operatorFullName: operator,
				indicatorVerified: true,
				notes: "Шов термосварки 10 мм",
				createdAt: `${dateStr}T08:35:00.000Z`,
			});
		}

		allKraftPackages.push({
			id: `kp-${year}${pad2(month)}-${dayIdx + 1}-s1`,
			barcode: `DNT-AK01-S${dateCompact}-S001-${expSurgery.expDateFormatted.replace(/-/g, "")}`,
			batchNumber: `S${dateCompact}`,
			packageSerialNumber: 1,
			toolSetNameRu: "Хирургический имплантологический сет",
			itemsIncluded: ["Элеватор прямой", "Элеватор штыковидный", "Распатор костный"],
			packagingType: "laminated_heat_sealed",
			packagingNameRu: STATUTORY_PACKAGING_TYPES.laminated_heat_sealed.nameRu,
			sterilizerCode: "АК-01",
			cycleNumber: 2,
			packDate: dateStr,
			expDate: expSurgery.expDateFormatted,
			daysLifespan: expSurgery.daysLifespan,
			daysRemaining: expSurgery.daysRemaining,
			status: expSurgery.status,
			operatorFullName: operator,
			indicatorVerified: true,
			notes: "Прозрачная сторона для быстрой идентификации",
			createdAt: `${dateStr}T11:35:00.000Z`,
		});
	}

	const totalPacksCount = allCycles.reduce((acc, c) => acc + c.packsCount, 0);
	const csv257 = exportForm257ToCsv(allCycles);
	const csv366 = exportPsoToCsv(allPsoRecords);
	const printHtml257 = generateForm257PrintHtml(allCycles, clinicInfo);
	const printHtml366 = generatePso366PrintHtml(allPsoRecords, clinicInfo);
	const combinedDossierHtml = generateCombinedInspectionDossierHtml({
		monthFormattedRu,
		cycles: allCycles,
		psoRecords: allPsoRecords,
		clinicInfo,
	});

	return {
		year,
		month,
		monthFormattedRu,
		workingDaysCount: workingDates.length,
		totalCyclesCount: allCycles.length,
		totalPsoTestsCount: allPsoRecords.length,
		totalPacksCount,
		cycles: allCycles,
		psoRecords: allPsoRecords,
		kraftPackages: allKraftPackages,
		clinicInfo,
		csv257,
		csv366,
		printHtml257,
		printHtml366,
		combinedDossierHtml,
	};
}
