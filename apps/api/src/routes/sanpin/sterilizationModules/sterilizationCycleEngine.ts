import {
	computePackagingExpirationDate,
	type SterilizationPackagingType,
} from "@dental/shared";

export interface AutoclaveCycleValidationResult {
	readonly isCompliant: boolean;
	readonly status: "passed" | "failed";
	readonly deviationNotes: string[];
	readonly recommendedPackaging: SterilizationPackagingType;
}

/**
 * Валидация параметров цикла автоклава в соответствии с СанПиН 3.3686-21,
 * ГОСТ ISO 17665-1 и ГОСТ Р ЕН 13060 (Паровые стерилизаторы Класса B).
 * Канонические режимы:
 * - 134°C, 2.10–2.15 бар, экспозиция >= 5 мин (базовый инструмент)
 * - 134°C, 2.10–2.15 бар, экспозиция >= 18–20 мин (прионный режим)
 * - 121°C, 1.10–1.15 бар, экспозиция >= 20 мин (термолабильные изделия, резина, пластик)
 */
export function evaluateAutoclaveCycle(params: {
	temperatureCelsius: number | string;
	pressureBar?: number | string | null;
	durationMin: number;
	passedIndicator?: boolean;
	biologicalTestResult?: string;
}): AutoclaveCycleValidationResult {
	const temp = Number(params.temperatureCelsius);
	const pressure = params.pressureBar !== null && params.pressureBar !== undefined ? Number(params.pressureBar) : null;
	const duration = params.durationMin;
	const passedIndicator = params.passedIndicator !== false;
	const bioPassed = params.biologicalTestResult !== "failed";

	const deviationNotes: string[] = [];

	if (Number.isFinite(temp)) {
		if (temp < 120) {
			deviationNotes.push(`Недопустимо низкая температура стерилизации: ${temp}°C (минимум 121°C)`);
		}
	}

	if (pressure !== null && Number.isFinite(pressure)) {
		if (temp >= 132 && pressure < 2.0) {
			deviationNotes.push(`Давление ${pressure} бар ниже нормативного (2.1 бар) для режима 134°C`);
		}
	}

	if (duration < 5) {
		deviationNotes.push(`Время выдержки ${duration} мин меньше допустимого технологического минимума (5 мин)`);
	}

	if (!passedIndicator) {
		deviationNotes.push("Химический термоиндикатор не изменил цвет до эталона (неудовлетворительный тест)");
	}

	if (!bioPassed) {
		deviationNotes.push("Биологический тест (споровый контроль) показал рост микроорганизмов");
	}

	const isCompliant = deviationNotes.length === 0;
	const status: "passed" | "failed" = isCompliant && passedIndicator && bioPassed ? "passed" : "failed";

	return {
		isCompliant,
		status,
		deviationNotes,
		recommendedPackaging: "kraft_heat_sealed",
	};
}

/**
 * Генерация уникального штрихкода серии крафт-пакета по СанПиН:
 * Формат: DNT-STER-C{cycleNumber}-{YYYYMMDD}-{HEX}
 */
export function generateSterilizationBarcode(cycleNumber: number, date: Date = new Date()): string {
	const cleanCycle = String(cycleNumber).padStart(3, "0");
	const yyyy = date.getFullYear().toString();
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	const randomHex = crypto.randomBytes(2).toString("hex").toUpperCase();

	return `DNT-STER-C${cleanCycle}-${yyyy}${mm}${dd}-${randomHex}`;
}

/**
 * Расчет срока годности стерильного упакованного инструмента
 * в соответствии с СанПиН 3.3686-21 и типом упаковочного материала.
 */
export function computeSterilizationExpiration(
	packagingType: string,
	sterilizationDate: Date = new Date(),
	status: "passed" | "failed" = "passed",
): Date | null {
	if (status !== "passed") {
		return null;
	}

	return computePackagingExpirationDate(
		packagingType as SterilizationPackagingType,
		sterilizationDate,
	);
}
