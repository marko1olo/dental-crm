import { calculateKraftSterilityExpiration } from "../calculations.js";
import { STATUTORY_PACKAGING_TYPES, type KraftPackageItem } from "../types.js";

export function createDailyShiftKraftPackages(dateStr: string, operatorName: string): KraftPackageItem[] {
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

	return kraftPackages;
}
