import type { FastifyInstance } from "fastify";

export const PRIMARY_TEETH = new Set([
	51, 52, 53, 54, 55, 61, 62, 63, 64, 65,
	71, 72, 73, 74, 75, 81, 82, 83, 84, 85,
]);

export interface PediatricPresetDto {
	readonly id: string;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly subtitleRu: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisNameRu: string;
	readonly serviceCode804n: string;
	readonly serviceName804n: string;
	readonly materials: readonly string[];
	readonly defaultMaterial: string;
	readonly defaultSurfaces: readonly string[];
	readonly allowsSurfaces: boolean;
	readonly defaultToothFindingState: "Filled" | "EndoTreated" | "Watch" | "Healthy" | "Extracted" | "Crown";
}

export const CANONICAL_PEDIATRIC_PRESETS: readonly PediatricPresetDto[] = [
	{
		id: "adaptation_visit",
		titleRu: "Адаптационный визит (знакомство)",
		shortLabelRu: "Адаптация",
		subtitleRu: "Знакомство с кабинетом, зеркальце, «ветерок», чистка зубок щеточкой, грамота за храбрость",
		diagnosisIcd10: "Z01.2",
		diagnosisNameRu: "Стоматологическое обследование / адаптационный прием",
		serviceCode804n: "A01.07.001",
		serviceName804n: "Прием (осмотр, консультация) врача-стоматолога детского первичный",
		materials: ["Циркулярная щеточка со сладкой пастой", "Защитный реминерализующий лак", "Диплом за храбрость"],
		defaultMaterial: "Диплом за храбрость",
		defaultSurfaces: [],
		allowsSurfaces: false,
		defaultToothFindingState: "Healthy",
	},
	{
		id: "fissure_sealing",
		titleRu: "Герметизация фиссур",
		shortLabelRu: "Герметизация (Fissurit)",
		subtitleRu: "Неинвазивная / инвазивная герметизация моляров светоотверждаемым герметиком",
		diagnosisIcd10: "K02.0",
		diagnosisNameRu: "Профилактика кариеса ямок и фиссур (K02.0 / Z29.8)",
		serviceCode804n: "A16.07.057",
		serviceName804n: "Запечатывание фиссуры зуба герметиком (Fissurit FX / Helioseal)",
		materials: ["Fissurit FX (VOCO)", "Helioseal F (Ivoclar)", "Clinpro Sealant (3M)"],
		defaultMaterial: "Fissurit FX (VOCO)",
		defaultSurfaces: ["O"],
		allowsSurfaces: false,
		defaultToothFindingState: "Healthy",
	},
	{
		id: "caries_primary",
		titleRu: "Лечение кариеса молочного зуба (композит/СИЦ)",
		shortLabelRu: "Кариес (СИЦ / SDR)",
		subtitleRu: "Препарирование, медикаментозная обработка, СИЦ Fuji IX / SDR Flow / Twinky Star",
		diagnosisIcd10: "K02.1",
		diagnosisNameRu: "Кариес дентина временного зуба (K02.1)",
		serviceCode804n: "A16.07.002.001",
		serviceName804n: "Восстановление зуба пломбой I, V, VI класс с использованием материалов из фотополимеров / СИЦ",
		materials: ["СИЦ Fuji IX (GC)", "Twinky Star (цветной компомер VOCO)", "SDR Flow + Filtek Ultimate", "Ketac Molar Easymix (3M)"],
		defaultMaterial: "СИЦ Fuji IX (GC)",
		defaultSurfaces: ["O"],
		allowsSurfaces: true,
		defaultToothFindingState: "Filled",
	},
	{
		id: "pulpotomy_primary",
		titleRu: "Пульпотомия / Лечение пульпита молочного зуба",
		shortLabelRu: "Пульпотомия (Pulpotec)",
		subtitleRu: "Ампутация коронковой пульпы, гемостаз, Pulpotec / Biodentine / MTA, герметичная реставрация",
		diagnosisIcd10: "K04.0",
		diagnosisNameRu: "Пульпит временного зуба обратимый (K04.0)",
		serviceCode804n: "A16.07.030.001",
		serviceName804n: "Пульпотомия (ампутация коронковой пульпы временного зуба)",
		materials: ["Pulpotec (Septodont)", "Biodentine (Septodont)", "MTA ProRoot (Dentsply)"],
		defaultMaterial: "Pulpotec (Septodont)",
		defaultSurfaces: ["O"],
		allowsSurfaces: true,
		defaultToothFindingState: "EndoTreated",
	},
	{
		id: "silvering_deep_fluoridation",
		titleRu: "Серебрение / Фторирование глубокое",
		shortLabelRu: "Серебрение / Фтор",
		subtitleRu: "Глубокое фторирование эмали и дентина / серебрение (Сафорайд/Аргенат)",
		diagnosisIcd10: "K02.0",
		diagnosisNameRu: "Кариес эмали / стадия пятна (K02.0)",
		serviceCode804n: "A11.07.012",
		serviceName804n: "Глубокое фторирование твердых тканей зубов / серебрение временных зубов",
		materials: ["Сафорайд 38% (Saforide)", "Глуфторед (Gluftored)", "Тифенфлюорид (Tiefenfluorid)", "Аргенат 30%"],
		defaultMaterial: "Сафорайд 38% (Saforide)",
		defaultSurfaces: ["V"],
		allowsSurfaces: false,
		defaultToothFindingState: "Watch",
	},
];

export function registerPediatricPresetRoutes(app: FastifyInstance): void {
	app.get("/api/pediatric/presets", async (_request, reply) => {
		return reply.send({
			success: true,
			count: CANONICAL_PEDIATRIC_PRESETS.length,
			presets: CANONICAL_PEDIATRIC_PRESETS,
		});
	});
}
