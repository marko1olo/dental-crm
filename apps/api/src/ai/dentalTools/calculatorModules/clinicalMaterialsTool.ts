/**
 * @file clinicalMaterialsTool.ts
 * @description Сравнительный доказательный анализ стоматологических материалов и протоколов (EBM).
 */
import { z } from "zod";
import { type DentalToolContext, type DentalToolEntry, createOpenAIToolDefinition } from "../types.js";

export const compareDentalMaterialsSchema = z.object({
	comparisonCategory: z.enum([
		"bulk_fill_vs_layering", "gic_vs_sandwich", "bioceramics_vs_epoxy_sealer", "zirconia_vs_emax", "composite_vs_ceramic_inlay",
	]).describe("Категория сравниваемых материалов"),
	clinicalContext: z.string().optional().describe("Клиническая ситуация"),
});

export type CompareDentalMaterialsInput = z.infer<typeof compareDentalMaterialsSchema>;

export interface CompareDentalMaterialsResult {
	readonly category: string;
	readonly materialA: string;
	readonly materialB: string;
	readonly clinicalVerdict: string;
	readonly comparisonTable: readonly {
		readonly criterion: string;
		readonly materialAVal: string;
		readonly materialBVal: string;
		readonly winner: "A" | "B" | "tie";
	}[];
	readonly keyRecommendation: string;
}

const COMPARISONS: Record<string, Omit<CompareDentalMaterialsResult, "category">> = {
	bulk_fill_vs_layering: {
		materialA: "Bulk Fill композиты (SDR Plus, Filtek One Bulk Fill)",
		materialB: "Традиционная послойная реставрация (Estelite Asteria, Enamel Plus)",
		clinicalVerdict: "Bulk Fill превосходит в скорости и адаптации на дне глубоких полостей I и II классов (порции до 4 мм со сниженным C-фактором усадки), но уступает традиционным композитам в высокоэстетичной оптике фронтальной группы.",
		comparisonTable: [
			{ criterion: "Толщина порции полимеризации", materialAVal: "До 4-5 мм за один цикл", materialBVal: "Строго до 2 мм", winner: "A" },
			{ criterion: "Полимеризационный стресс / C-фактор", materialAVal: "Крайне низкий за счет мономеров релаксации", materialBVal: "Высокий (требует косой послойной укладки)", winner: "A" },
			{ criterion: "Оптическая полихроматичность и эстетика", materialAVal: "Полупрозрачные, монохромные оттенки", materialBVal: "Высокая (дентин, опак, эмаль, транспарант)", winner: "B" },
			{ criterion: "Скорость работы у кресла", materialAVal: "Быстро (сокращение времени на 40%)", materialBVal: "Длительно (микропослойное моделирование)", winner: "A" },
		],
		keyRecommendation: "Идеальный клинический симбиоз: основа полости II класса до окклюзионного уровня выполняется Bulk Fill материалом (SDR), а окклюзионный финишный слой (1.5 мм) — высоконаполненным пакуемым композитом.",
	},
	bioceramics_vs_epoxy_sealer: {
		materialA: "Биокерамические силеры на основе силикатов кальция (BioRoot RCS, TotalFill BC Sealer)",
		materialB: "Эпоксидно-аминовые силеры (AH Plus, Adseal)",
		clinicalVerdict: "Биокерамика обеспечивает непревзойденную биосовместимость, антибактериальную щелочную среду (pH > 12) и образование гидроксиапатита при взаимодействии с дентинной жидкостью, но затрудняет распломбировку при повторном эндолечении.",
		comparisonTable: [
			{ criterion: "Биосовместимость и остеоиндукция", materialAVal: "Превосходная (активация цементобластов)", materialBVal: "Инертная, слабая цитотоксичность до полимеризации", winner: "A" },
			{ criterion: "Усадка при затвердевании", materialAVal: "Отсутствует (слабое расширение 0.1%)", materialBVal: "Минимальная усадка (<1%)", winner: "A" },
			{ criterion: "Возможность перелечивания (Retreatment)", materialAVal: "Сложная (твердость сопоставима с дентином)", materialBVal: "Хорошо растворяется сольвентами (эвкалиптол)", winner: "B" },
		],
		keyRecommendation: "Биокерамические силеры показаны при первичном эндолечении с широкими апексами, резорбциях и кистогранулемах. AH Plus остается золотым стандартом гибридной латеральной и вертикальной конденсации.",
	},
	zirconia_vs_emax: {
		materialA: "Диоксид циркония (Katana Multi-Layered / 3Y-5Y ZrO2)",
		materialB: "Дисиликат лития (IPS e.max CAD/Press)",
		clinicalVerdict: "e.max идеален для виниров и одиночных коронок фронтальной группы благодаря адгезивной фиксации к эмали; цирконий незаменим для жевательных коронок при бруксизме и протяженных мостовидных протезов.",
		comparisonTable: [
			{ criterion: "Прочность на изгиб", materialAVal: "800–1200 МПа", materialBVal: "400–500 МПа", winner: "A" },
			{ criterion: "Адгезивная фиксация (бондинг плавиковой кислотой)", materialAVal: "Не протравливается HF (требуется пескоструй MDP)", materialBVal: "Великолепный бондинг с силанизацией", winner: "B" },
			{ criterion: "Оптическая прозрачность (Translucency)", materialAVal: "Хорошая у 5Y-циркония, но уступает стеклу", materialBVal: "Идентична естественной зубной эмали", winner: "B" },
		],
		keyRecommendation: "Фронтальная зона (13-23) и виниры — e.max; моляры, мосты и абатменты имплантатов — монолитный диоксид циркония.",
	},
	gic_vs_sandwich: {
		materialA: "Стеклоиономерный цемент (Fuji IX, Ketac Molar)",
		materialB: "Сэндвич-техника (СИЦ база + световой композит)",
		clinicalVerdict: "Чистый СИЦ уступает в истираемости и эстетике, но незаменим у детей и при высоком кариесогенном статусе. Сэндвич-техника объединяет фторидную защиту СИЦ с прочностью композита.",
		comparisonTable: [
			{ criterion: "Выделение фтора и кариесостатичность", materialAVal: "Постоянное выделение фтора", materialBVal: "Выделение фтора в поддесневой зоне", winner: "tie" },
			{ criterion: "Механическая прочность к истиранию", materialAVal: "Низкая", materialBVal: "Высокая", winner: "B" },
		],
		keyRecommendation: "При глубоких пришеечных полостях V класса и полостях II класса с выходом за эмалево-цементную границу применять открытую или закрытую сэндвич-технику.",
	},
};

export async function handleCompareDentalMaterials(args: CompareDentalMaterialsInput, _context: DentalToolContext): Promise<CompareDentalMaterialsResult> {
	const cat = args.comparisonCategory;
	const item = COMPARISONS[cat] ?? COMPARISONS.gic_vs_sandwich!;
	return { category: cat, ...item };
}

export const compareDentalMaterialsTool: DentalToolEntry<typeof compareDentalMaterialsSchema> = {
	name: "compare_dental_materials",
	description: "Сравнительный доказательный анализ стоматологических материалов (Bulk Fill против послойного композита, биокерамика против AH Plus, диоксид циркония против e.max, СИЦ).",
	schema: compareDentalMaterialsSchema,
	supportedModes: ["web_browser", "desktop_native"],
	definition: createOpenAIToolDefinition("compare_dental_materials", "Сравнительный анализ стоматологических материалов под клинический случай.", compareDentalMaterialsSchema),
	handler: handleCompareDentalMaterials,
};

export const clinicalMaterialsTool = compareDentalMaterialsTool;
