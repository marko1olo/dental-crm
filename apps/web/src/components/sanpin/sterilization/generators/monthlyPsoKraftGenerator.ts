import {
	calculateKraftSterilityExpiration,
	generateDigitalStampHash,
} from "../calculations.js";
import {
	STATUTORY_PACKAGING_TYPES,
	type KraftPackageItem,
	type PsoTestRecord,
} from "../types.js";

export function generateDayPsoAndKraft(
	year: number,
	month: number,
	dayIdx: number,
	dateStr: string,
	operator: string,
	loadMultiplier: number,
	startPsoCounter: number,
): { psoRecords: PsoTestRecord[]; kraftPackages: KraftPackageItem[] } {
	const pad2 = (n: number) => String(n).padStart(2, "0");
	const psoRecords: PsoTestRecord[] = [
		{
			id: `pso-${year}${pad2(month)}-${startPsoCounter}`,
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
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: startPsoCounter, operatorFullName: operator, secretSalt: "PSO" }),
			notes: "Утренний контроль перед автоклавированием. Обе пробы отрицательные.",
			createdAt: `${dateStr}T08:10:00.000Z`,
		},
		{
			id: `pso-${year}${pad2(month)}-${startPsoCounter + 1}`,
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
			electronicSignatureHash: generateDigitalStampHash({ date: dateStr, cycleNumber: startPsoCounter + 1, operatorFullName: operator, secretSalt: "PSO" }),
			notes: "Хирургия, повышена выборка до 5 шт. Качество ПСО 100%.",
			createdAt: `${dateStr}T11:15:00.000Z`,
		},
	];

	const kraftPackages: KraftPackageItem[] = [];
	const expTherapy = calculateKraftSterilityExpiration(dateStr, "kraft_heat_sealed");
	const expSurgery = calculateKraftSterilityExpiration(dateStr, "laminated_heat_sealed");
	const dateCompact = dateStr.replace(/-/g, "");

	for (let k = 1; k <= 3; k++) {
		kraftPackages.push({
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

	kraftPackages.push({
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

	return { psoRecords, kraftPackages };
}
