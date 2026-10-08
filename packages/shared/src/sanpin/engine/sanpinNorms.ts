/**
 * ============================================================================
 * SANPIN 3.3686-21 STATUTORY NORMS, CONSTANTS & RUSSIAN FORMATTERS (LAYER 1)
 * ============================================================================
 */

import type {
	ChamberControlPointDefinition,
	ClinicLegalInfo,
	SterilizationRegimeDefinition,
} from "./types.js";

export const STATUTORY_STERILIZATION_REGIMES: readonly SterilizationRegimeDefinition[] = [
	{
		id: "steam_134_5min",
		nameRu: "Паровой 134°C / 5 мин (2.0-2.2 атм / бар) — Скоростной B-класс",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.1,
		exposureTimeMinutes: 5,
		tempToleranceCelsius: { min: 134, max: 138 },
		pressureToleranceBar: { min: 2.0, max: 2.3 },
		recommendedUsageRu: "Текстиль, металлический инструмент в одинарных крафт-пакетах, турбинные наконечники",
		sanpinStandardClauseRu: "СанПиН 3.3686-21 п. 3624 (Таблица 3.13) / Режим I",
	},
	{
		id: "steam_134_20min",
		nameRu: "Паровой 134°C / 20 мин (2.0-2.2 атм / бар) — Стандартный хирургический",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 134,
		targetPressureBar: 2.1,
		exposureTimeMinutes: 20,
		tempToleranceCelsius: { min: 134, max: 138 },
		pressureToleranceBar: { min: 2.0, max: 2.3 },
		recommendedUsageRu: "Хирургические и имплантологические наборы в двойных пакетах и биксах КСПФ",
		sanpinStandardClauseRu: "СанПиН 3.3686-21 п. 3624 / Режим I усиленный",
	},
	{
		id: "steam_121_20min",
		nameRu: "Паровой 121°C / 20 мин (1.1 атм / бар) — Щадящий для термолабильных изделий",
		methodType: "steam_autoclave",
		targetTemperatureCelsius: 121,
		targetPressureBar: 1.1,
		exposureTimeMinutes: 20,
		tempToleranceCelsius: { min: 120, max: 124 },
		pressureToleranceBar: { min: 1.0, max: 1.3 },
		recommendedUsageRu: "Изделия из резины, термостойких полимеров, латекса, оптоволоконные световоды",
		sanpinStandardClauseRu: "СанПиН 3.3686-21 п. 3624 (Таблица 3.13) / Режим II",
	},
	{
		id: "dry_heat_180_60min",
		nameRu: "Воздушный (Сухожаровой) 180°C / 60 мин",
		methodType: "dry_heat",
		targetTemperatureCelsius: 180,
		targetPressureBar: 0,
		exposureTimeMinutes: 60,
		tempToleranceCelsius: { min: 180, max: 185 },
		pressureToleranceBar: { min: 0, max: 0 },
		recommendedUsageRu: "Цельнометаллические боры, щипцы, элеваторы без оптических элементов",
		sanpinStandardClauseRu: "СанПиН 3.3686-21 п. 3626 (Воздушный метод стерилизации)",
	},
];

export const STATUTORY_CHAMBER_5_POINTS: readonly ChamberControlPointDefinition[] = [
	{
		pointIndex: 1,
		code: "КТ-1",
		nameRu: "Верхний передний правый угол",
		locationDescriptionRu: "Верхняя полка у дверцы камеры автоклава",
	},
	{
		pointIndex: 2,
		code: "КТ-2",
		nameRu: "Нижний задний левый угол",
		locationDescriptionRu: "Нижняя полка у задней стенки (наиболее холодная зона)",
	},
	{
		pointIndex: 3,
		code: "КТ-3",
		nameRu: "Геометрический центр камеры",
		locationDescriptionRu: "Центральная полка в толще стерилизуемой загрузки",
	},
	{
		pointIndex: 4,
		code: "КТ-4",
		nameRu: "Зона выхода конденсата / дренаж",
		locationDescriptionRu: "Нижняя точка камеры у сливного патрубка",
	},
	{
		pointIndex: 5,
		code: "КТ-5",
		nameRu: "Верхняя задняя зона",
		locationDescriptionRu: "Верхняя полка у датчика температуры автоклава",
	},
];

export const DEFAULT_CLINIC_LEGAL: ClinicLegalInfo = {
	name: "ООО «Стоматологическая клиника ДЕНТЕ»",
	ogrn: "1027700123456",
	inn: "",
	address: "г. Москва, ул. Клиническая, д. 10",
	chiefDoctor: "Смирнов А. В.",
	headNurse: "Иванова М. П.",
	licenseNumber: "№ ЛО41-01137-77/00368421",
	volumeNumber: 1,
};

export function integerToRussianWords(num: number): string {
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
		return `${hundreds[hundred]} ${integerToRussianWords(rest)}`;
	}

	const thousands = Math.floor(n / 1000);
	const rest = n % 1000;
	let thousandWord = "тысяч";
	if (thousands % 10 === 1 && thousands % 100 !== 11) thousandWord = "тысяча";
	else if (thousands % 10 >= 2 && thousands % 10 <= 4 && (thousands % 100 < 10 || thousands % 100 >= 20))
		thousandWord = "тысячи";

	let thousandPrefix = integerToRussianWords(thousands);
	if (thousands % 10 === 1 && thousands % 100 !== 11) thousandPrefix = thousandPrefix.replace(/один$/, "одна");
	if (thousands % 10 === 2 && thousands % 100 !== 12) thousandPrefix = thousandPrefix.replace(/два$/, "две");

	if (rest === 0) return `${thousandPrefix} ${thousandWord}`;
	return `${thousandPrefix} ${thousandWord} ${integerToRussianWords(rest)}`;
}

export { integerToRussianWords as numberToRussianWords };

export function formatRussianSheetsCount(count: number): {
	readonly count: number;
	readonly countInWords: string;
	readonly declensionRu: string;
	readonly formattedRu: string;
} {
	const n = Math.max(1, Math.floor(Number(count) || 1));
	const countInWords = integerToRussianWords(n);
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

export function escapeCsvField(val: unknown): string {
	if (val === null || val === undefined) return '""';
	const str = String(val).replace(/"/g, '""');
	return `"${str}"`;
}
