/**
 * ============================================================================
 * SANPIN 2.1.3684-21 MEDICAL WASTE MANAGEMENT & ACCUMULATION ENGINE (LAYER 2)
 * Нормы накопления, обезвреживания и учета медицинских отходов классов А, Б, В, Г.
 * ============================================================================
 */

export type MedicalWasteClassCode = "class_A" | "class_B" | "class_C" | "class_D";

export interface StatutoryWasteNormDefinition {
	readonly classCode: MedicalWasteClassCode;
	readonly nameRu: string;
	readonly statutoryColorRu: string;
	readonly descriptionRu: string;
	readonly containerTypeRu: string;
	readonly statutoryDensityKgPerLiter: number;
	readonly maxStorageWithoutColdHours: number;
	readonly sanpinClauseRu: string;
}

export const STATUTORY_WASTE_NORMS: readonly StatutoryWasteNormDefinition[] = [
	{
		classCode: "class_A",
		nameRu: "Класс А — Эпидемиологически безопасные отходы",
		statutoryColorRu: "Белый",
		descriptionRu: "Упаковка медикаментов, картон, бумага, средства гигиены без контакта с биожидкостями, ТКО",
		containerTypeRu: "Многоразовые баки или белые пакеты плотностью не менее 15–20 мкм",
		statutoryDensityKgPerLiter: 0.08,
		maxStorageWithoutColdHours: 24,
		sanpinClauseRu: "СанПиН 2.1.3684-21, п. 165 (Отходы, не имевшие контакта с биологическими жидкостями пациентов)",
	},
	{
		classCode: "class_B",
		nameRu: "Класс Б — Эпидемиологически опасные отходы",
		statutoryColorRu: "Желтый",
		descriptionRu: "Материалы и инструменты, загрязненные кровью/слюной, карпулы, иглы, скальпели, ватные валики",
		containerTypeRu: "Желтые герметичные пакеты / одноразовые непрокалываемые влагостойкие контейнеры для острых предметов",
		statutoryDensityKgPerLiter: 0.12,
		maxStorageWithoutColdHours: 24,
		sanpinClauseRu: "СанПиН 2.1.3684-21, п. 168 (Инфицированные и потенциально инфицированные отходы)",
	},
	{
		classCode: "class_C",
		nameRu: "Класс В — Чрезвычайно эпидемиологически опасные отходы",
		statutoryColorRu: "Красный",
		descriptionRu: "Отходы из инфекционных изоляторов (пациенты с особо опасными инфекциями, туберкулез)",
		containerTypeRu: "Красные герметичные пакеты и непрокалываемые контейнеры с обязательным обеззараживанием",
		statutoryDensityKgPerLiter: 0.15,
		maxStorageWithoutColdHours: 12,
		sanpinClauseRu: "СанПиН 2.1.3684-21, п. 175 (Отходы подразделений фтизиатрического и инфекционного профиля)",
	},
	{
		classCode: "class_D",
		nameRu: "Класс Г — Токсикологически опасные отходы",
		statutoryColorRu: "Черный",
		descriptionRu: "Люминесцентные и бактерицидные ртутьсодержащие лампы, просроченные дезсредства, амальгама",
		containerTypeRu: "Специализированные герметичные маркированные емкости для демеркуризации",
		statutoryDensityKgPerLiter: 0.25,
		maxStorageWithoutColdHours: 720,
		sanpinClauseRu: "СанПиН 2.1.3684-21, п. 182 (Ртутьсодержащие приборы, лампы и фармацевтические отходы)",
	},
];

/**
 * Расчет чистого веса нетто отходов с учетом тары.
 */
export function calculateWasteNetWeight(grossWeightKg: number, tareWeightKg = 0.05): {
	readonly grossWeightKg: number;
	readonly tareWeightKg: number;
	readonly netWeightKg: number;
	readonly formattedNetKg: string;
} {
	const gross = Math.max(0, Number(grossWeightKg) || 0);
	const tare = Math.max(0, Number(tareWeightKg) || 0);
	const net = Math.max(0, Math.round((gross - tare) * 1000) / 1000);

	return {
		grossWeightKg: gross,
		tareWeightKg: tare,
		netWeightKg: net,
		formattedNetKg: net.toFixed(3),
	};
}

/**
 * Валидация условий хранения медотходов класса Б без специализированного холодильника.
 */
export function evaluateWasteStorageCompliance(accumulatedAtIso: string, hasWasteRefrigerator = false): {
	readonly isCompliant: boolean;
	readonly hoursAccumulated: number;
	readonly maxAllowedHours: number;
	readonly alertMessageRu: string | null;
} {
	const date = new Date(accumulatedAtIso);
	if (Number.isNaN(date.getTime())) {
		return {
			isCompliant: true,
			hoursAccumulated: 0,
			maxAllowedHours: 24,
			alertMessageRu: null,
		};
	}

	const elapsedMs = Date.now() - date.getTime();
	const hoursAccumulated = Math.max(0, Math.round((elapsedMs / (1000 * 60 * 60)) * 10) / 10);
	const maxAllowedHours = hasWasteRefrigerator ? 168 : 24; // 7 дней в холодильнике, 24 ч при комнатной температуре

	const isCompliant = hoursAccumulated <= maxAllowedHours;
	let alertMessageRu: string | null = null;

	if (!isCompliant) {
		alertMessageRu = hasWasteRefrigerator
			? `Превышен предельный срок хранения отходов класса Б в холодильнике: ${hoursAccumulated} ч (макс. 168 ч по СанПиН 2.1.3684-21). Требуется передача на утилизацию!`
			: `Превышен предельный срок хранения отходов класса Б без охлаждения: ${hoursAccumulated} ч (макс. 24 ч по СанПиН 2.1.3684-21). Требуется немедленный вывоз или перемещение в холодильник!`;
	}

	return {
		isCompliant,
		hoursAccumulated,
		maxAllowedHours,
		alertMessageRu,
	};
}
