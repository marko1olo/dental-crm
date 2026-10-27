/**
 * @file emergencyProtocolsTool.ts
 * @description Протоколы экстренной помощи у кресла: анафилаксия, гипохлоритная авария, облом эндофайла, перфорация.
 */
import { z } from "zod";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const chairsideEmergencySchema = z.object({
	emergencyType: z.enum(["hypochlorite_accident", "separated_instrument", "root_perforation", "anaphylactic_shock", "swallowed_foreign_body"]).describe("Тип экстренной ситуации"),
	toothNumber: z.number().min(11).max(48).optional().describe("Номер зуба"),
	details: z.string().optional().describe("Клинические подробности"),
});

export type ChairsideEmergencyInput = z.infer<typeof chairsideEmergencySchema>;

export interface ChairsideEmergencyResult {
	readonly emergencyType: string;
	readonly urgencyLevel: "CRITICAL_RESUSCITATION" | "URGENT_CLINICAL";
	readonly immediateActions: readonly string[];
	readonly pharmacotherapy: readonly string[];
	readonly prognosisAndCommunication: string;
}

const EMERGENCY_MAP: Record<string, Omit<ChairsideEmergencyResult, "emergencyType">> = {
	anaphylactic_shock: {
		urgencyLevel: "CRITICAL_RESUSCITATION",
		immediateActions: [
			"1. НЕМЕДЛЕННО ПРЕКРАТИТЬ ВВЕДЕНИЕ АЛЛЕРГЕНА / АНЕСТЕТИКА!",
			"2. Вызвать реанимационную бригаду скорой помощи (112).",
			"3. Уложить пациента горизонтально с приподнятыми ногами под углом 30-45° (положение Тренделенбурга). Повернуть голову набок при рвоте.",
			"4. ВВЕСТИ ЭПИНЕФРИН (АДРЕНАЛИН 0.1%): 0.5 мл (0.5 мг) В/М В ПЕРЕДНЕБОКОВУЮ ПОВЕРХНОСТЬ СРЕДНЕЙ ТРЕТИ БЕДРА! При отсутствии эффекта повторить через 5 минут.",
			"5. Обеспечить проходимость дыхательных путей, подача 100% увлажненного кислорода через маску (10-15 л/мин).",
			"6. Обеспечить надежный периферический венозный доступ (катетер G16-G18), инфузия 0.9% NaCl 1000 мл струйно.",
		],
		pharmacotherapy: [
			"Адреналин 0.1% — 0.5 мг в/м в бедро (препарат первого выбора, без задержек!).",
			"Преднизолон 90-120 мг в/в (или Дексаметазон 8-16 мг в/в) — для блокирования поздней фазы шока.",
			"Инфузионная терапия: 0.9% NaCl 1000-2000 мл для устранения относительной гиповолемии.",
		],
		prognosisAndCommunication: "Жизнеугрожающее состояние. Пациент подлежит обязательной экстренной госпитализации в отделение реанимации.",
	},
	hypochlorite_accident: {
		urgencyLevel: "URGENT_CLINICAL",
		immediateActions: [
			"1. НЕМЕДЛЕННО прекратить ирригацию гипохлоритом натрия!",
			"2. Аспирировать раствор из корневого канала.",
			"3. Промыть канал обильным количеством стерильного физиологического раствора (0.9% NaCl) для разведения NaOCl.",
			"4. Провести анестезию для купирования острейшего болевого синдрома.",
			"5. Холод на пораженную сторону лица (лед через салфетку интервалами по 15 минут) для ограничения отека.",
			"6. Оставить канал открытым под ватный шарик на 24 часа для дренирования экссудата.",
		],
		pharmacotherapy: [
			"Аналгезия: Кеторол 30 мг в/м или Декскетопрофен (Дексалгин) 50 мг в/м.",
			"Кортикостероиды: Дексаметазон 4-8 мг в/м для купирования токсического тканевого отека.",
			"Антигистаминные: Супрастин / Тавегил 1-2 мл в/м.",
			"Антибиотикотерапия широкого спектра: Амоксиклав 1000 мг 2 р/сут (или Клиндамицин 300 мг 3 р/сут при аллергии) на 5-7 дней для профилактики вторичного некроза.",
		],
		prognosisAndCommunication: "Успокоить пациента. Предупредить о формировании обширной гематомы мягких тканей лица в течение 5-7 дней. Ежедневный очный осмотр.",
	},
	separated_instrument: {
		urgencyLevel: "URGENT_CLINICAL",
		immediateActions: [
			"1. Не паниковать! Категорически запрещено проталкивать инструмент апикально ручными файлами.",
			"2. Сообщить пациенту об инциденте спокойно и профессионально (Мандат 8e / правовая защита).",
			"3. Провести диагностическую прицельную радиовизиографию (локализация: коронковая, средняя или апикальная треть канала, до изгиба или за изгибом).",
			"4. Тактика байпаса (Bypass): попытка обойти фрагмент тонким K-файлом №06/№08 с гелем ЭДТА по внутренней кривизне.",
			"5. Тактика извлечения: при локализации в прямой части канала — ультразвуковая активация (насадки Start-X / ProUltra) без водяного охлаждения под контролем микроскопа.",
			"6. Если извлечение несет риск перфорации корня — обтурация канала вместе с фрагментом (байпас) с последующим рентген-наблюдением.",
		],
		pharmacotherapy: [
			"Гель ЭДТА (RC-Prep, Glyde) для смазки при байпасе.",
			"Гипохлорит натрия 3% + 17% жидкая ЭДТА для медикаментозной дезинфекции стенок канала вокруг отломка.",
		],
		prognosisAndCommunication: "Фрагмент инструмента стерилен. При успешном байпасе или надежной обтурации прогноз благоприятный в 80-90% случаев.",
	},
	root_perforation: {
		urgencyLevel: "URGENT_CLINICAL",
		immediateActions: [
			"1. Остановка кровотечения из зоны перфорации стерильными бумажными штифтами и раствором адреналина 1:1000.",
			"2. Исключить использование гипохлорита натрия высокой концентрации в зоне перфорации! Промывание 2% хлоргексидином.",
			"3. Немедленное герметичное закрытие дефекта материалом ProRoot MTA (Mineral Trioxide Aggregate) или биокерамическим цементом Biodentine.",
			"4. Контрольная рентгенография плотности краевого прилегания МТА.",
		],
		pharmacotherapy: [
			"МТА (Mineral Trioxide Aggregate) / Biodentine / Bio-C Repair — остеоиндуктивные биосовместимые материалы.",
			"НПВС (Нимесил 100 мг) при постманипуляционном дискомфорте.",
		],
		prognosisAndCommunication: "При закрытии перфорации в первые часы прогноз благоприятный. При застарелых перфорациях — риск формирования пародонтального кармана.",
	},
	swallowed_foreign_body: {
		urgencyLevel: "URGENT_CLINICAL",
		immediateActions: ["1. Прекратить манипуляции.", "2. Оценить проходимость дыхательных путей (кашель, стридор, цианоз).", "3. При аспирации — прием Геймлиха, вызов скорой.", "4. При проглатывании — направить на обзорную рентгенографию брюшной полости."],
		pharmacotherapy: ["Симптоматическая терапия."],
		prognosisAndCommunication: "Контроль эвакуации инородного тела.",
	},
};

export async function handleChairsideEmergency(args: ChairsideEmergencyInput, _context: DentalToolContext): Promise<ChairsideEmergencyResult> {
	const type = args.emergencyType;
	const data = EMERGENCY_MAP[type] ?? EMERGENCY_MAP.swallowed_foreign_body!;
	return { emergencyType: type, ...data };
}

export const chairsideEmergencyTool: DentalToolEntry<typeof chairsideEmergencySchema> = {
	name: "chairside_emergency_rescue",
	description: "Экспресс-протоколы экстренной помощи у кресла: анафилактический шок (адреналин 0.5 мг в/м в бедро), гипохлоритная авария, облом инструмента в канале, перфорация корня (МТА).",
	schema: chairsideEmergencySchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("chairside_emergency_rescue", "Протоколы неотложной помощи: анафилаксия, гипохлоритная авария, облом эндофайла, перфорация корня.", chairsideEmergencySchema),
	handler: handleChairsideEmergency,
};

export const emergencyProtocolsTool = chairsideEmergencyTool;
