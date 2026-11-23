import type { FastifyInstance } from "fastify";
import { PRIMARY_TEETH_SET } from "@dental/shared";

export const PRIMARY_TEETH = PRIMARY_TEETH_SET;
export { PRIMARY_TEETH_SET };

export interface PediatricPresetDto {
	readonly id: string;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly subtitleRu: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisNameRu: string;
	readonly serviceCode: string;
	readonly serviceName: string;
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
		serviceCode: "B01.064.001",
		serviceName: "Прием (осмотр, консультация) врача-стоматолога детского первичный",
		materials: ["Циркулярная щеточка со сладкой пастой", "Защитный реминерализующий лак", "Диплом за храбрость"],
		defaultMaterial: "Диплом за храбрость",
		defaultSurfaces: [],
		allowsSurfaces: false,
		defaultToothFindingState: "Healthy",
	},
	{
		id: "icon_infiltration",
		titleRu: "Инфильтрация кариеса ICON (без бормашины)",
		shortLabelRu: "ICON (инфильтрация)",
		subtitleRu: "15% HCl Icon-Etch 2 мин, Icon-Dry 30с, Icon-Infiltrant 3 мин + полимеризация 40с",
		diagnosisIcd10: "K02.0",
		diagnosisNameRu: "Кариес эмали / стадия пятна без образования полости (K02.0)",
		serviceCode: "A16.07.051",
		serviceName: "Инфильтрация кариозного пятна препаратом Icon (без препарирования)",
		materials: [
			"Icon-Etch (15% HCl)",
			"Icon-Dry (этанол)",
			"Icon-Infiltrant (TEGDMA матрикс)",
			"Коффердам / раббердам",
		],
		defaultMaterial: "Icon-Infiltrant (TEGDMA матрикс)",
		defaultSurfaces: ["V"],
		allowsSurfaces: true,
		defaultToothFindingState: "Watch",
	},
	{
		id: "fissure_sealing",
		titleRu: "Герметизация фиссур",
		shortLabelRu: "Герметизация (Fissurit)",
		subtitleRu: "Неинвазивная / инвазивная герметизация моляров светоотверждаемым герметиком",
		diagnosisIcd10: "K02.0",
		diagnosisNameRu: "Профилактика кариеса ямок и фиссур (K02.0 / Z29.8)",
		serviceCode: "A16.07.057",
		serviceName: "Запечатывание фиссуры зуба герметиком (Fissurit FX / Helioseal)",
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
		serviceCode: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой I, V, VI класс с использованием материалов из фотополимеров / СИЦ",
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
		serviceCode: "A16.07.009",
		serviceName: "Пульпотомия (ампутация коронковой пульпы временного зуба)",
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
		serviceCode: "A11.07.012",
		serviceName: "Глубокое фторирование твердых тканей зубов / серебрение временных зубов",
		materials: ["Сафорайд 38% (Saforide)", "Глуфторед (Gluftored)", "Тифенфлюорид (Tiefenfluorid)", "Аргенат 30%"],
		defaultMaterial: "Сафорайд 38% (Saforide)",
		defaultSurfaces: ["V"],
		allowsSurfaces: false,
		defaultToothFindingState: "Watch",
	},
	{
		id: "extraction_primary_exfoliation",
		titleRu: "Удаление молочного зуба при физиологической смене",
		shortLabelRu: "Удаление (смена корней)",
		subtitleRu: "Аппликационный гель (вишня), детские щипцы, марлевый тампон",
		diagnosisIcd10: "K08.8",
		diagnosisNameRu: "Физиологическая резорбция корней временного зуба (K08.8)",
		serviceCode: "A16.07.001.001",
		serviceName: "Удаление временного зуба при физиологической смене",
		materials: ["Аппликационный гель Дисилан / Лидоксор (вишня)", "Инфильтрация Артикаин 1:200 000 (по показаниям)"],
		defaultMaterial: "Аппликационный гель Дисилан / Лидоксор (вишня)",
		defaultSurfaces: [],
		allowsSurfaces: false,
		defaultToothFindingState: "Extracted",
	},
	{
		id: "standard_crown",
		titleRu: "Восстановление стандартной защитной коронкой",
		shortLabelRu: "Коронка (Hall / SSC)",
		subtitleRu: "Металл / Цирконий, методика Hall, СИЦ Fuji Plus / Ketac Cem",
		diagnosisIcd10: "K02.1",
		diagnosisNameRu: "Кариес дентина / разрушение коронки временного моляра (K02.1 / K04.0)",
		serviceCode: "A16.07.004.001",
		serviceName: "Восстановление зуба стандартной защитной коронкой (металл / цирконий, методика Hall)",
		materials: [
			"Стандартная стальная коронка SSC (3M ESPE)",
			"Циркониевая коронка NuSmile ZR",
			"Коронка Kids-e-Crown",
			"СИЦ Fuji Plus (GC фиксация)",
			"Ketac Cem Easymix (3M)",
		],
		defaultMaterial: "Стандартная стальная коронка SSC (3M ESPE)",
		defaultSurfaces: ["O"],
		allowsSurfaces: false,
		defaultToothFindingState: "Crown",
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
