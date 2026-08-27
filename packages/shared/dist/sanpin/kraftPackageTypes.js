import { z } from "zod";
export const KRAFT_PACKAGE_MATERIALS = [
    {
        id: "paper_self_seal_single",
        nameRu: "Крафт-пакет бумажный самоклеящийся одинарный",
        shortLabelRu: "Крафт-пакет одинарный (50 сут.)",
        statutoryShelfLifeDays: 50,
        sealingMethodRu: "Встроенная самоклеящаяся лента с защитным лайнером",
        sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
        gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / ГОСТ 10354",
        descriptionRu: "Однослойный бумажный крафт-пакет с термовлагостойким клеевым слоем. Для базового терапевтического и смотрового инструментария.",
        recommendedSterilizationMethod: "steam_autoclave_134",
        isHeatSealed: false,
        isTransparentFilm: false,
    },
    {
        id: "paper_self_seal_double",
        nameRu: "Крафт-пакет бумажный двойной (двойная упаковка)",
        shortLabelRu: "Крафт-пакет двойной (60 сут.)",
        statutoryShelfLifeDays: 60,
        sealingMethodRu: "Последовательная закладка в два независимых самоклеящихся пакета",
        sanpinClauseRu: "СанПиН 3.3686-21 п. 3634",
        gostStandardRu: "ГОСТ Р ИСО 11607-1-2018",
        descriptionRu: "Двойной барьер из крафт-бумаги. Повышенная надежность стерильности при межкабинетной транспортировке и длительном хранении.",
        recommendedSterilizationMethod: "steam_autoclave_134",
        isHeatSealed: false,
        isTransparentFilm: false,
    },
    {
        id: "paper_plastic_pouch",
        nameRu: "Комбинированный пакет бумага + прозрачная пленка термосварочный",
        shortLabelRu: "Комби-пакет бумага+пленка (180 сут. / 6 мес.)",
        statutoryShelfLifeDays: 180,
        sealingMethodRu: "Термосварочный аппарат (ширина герметичного шва >= 8 мм)",
        sanpinClauseRu: "СанПиН 3.3686-21 п. 3632 (Таблица 3.14)",
        gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-5",
        descriptionRu: "Многослойный ламинат (PET/PP) с медицинской бумагой. Максимальный барьерный срок 6 месяцев при температуре 180–200°C запайки.",
        recommendedSterilizationMethod: "steam_autoclave_134",
        isHeatSealed: true,
        isTransparentFilm: true,
    },
    {
        id: "crepe_paper_wrap",
        nameRu: "Крепированная бумага стерилизационная (2 слоя)",
        shortLabelRu: "Креп-бумага 2 слоя (60 сут.)",
        statutoryShelfLifeDays: 60,
        sealingMethodRu: "Конвертное двухслойное обертывание с фиксацией индикаторным скотчем",
        sanpinClauseRu: "СанПиН 3.3686-21 п. 3633",
        gostStandardRu: "ГОСТ Р ИСО 11607-1-2018 / EN 868-2",
        descriptionRu: "Мягкая воздухопроницаемая крепированная бумага высокой плотности (60 г/м²). Для тяжелых хирургических лотков и кассет.",
        recommendedSterilizationMethod: "steam_autoclave_134",
        isHeatSealed: false,
        isTransparentFilm: false,
    },
    {
        id: "bix_with_filter",
        nameRu: "Стерилизационная коробка (Бикс КСПФ с антибактериальным фильтром)",
        shortLabelRu: "Бикс КСПФ с фильтром (20 сут.)",
        statutoryShelfLifeDays: 20,
        sealingMethodRu: "Механические замки крышки с хлопчатобумажным фильтром",
        sanpinClauseRu: "СанПиН 3.3686-21 п. 3631",
        gostStandardRu: "ГОСТ Р 51574 / ТУ 9451-002",
        descriptionRu: "Многоразовый металлический бикс с фильтрами в крышке и дне. Срок сохранения стерильности без вскрытия — 20 суток (после вскрытия — 24 ч).",
        recommendedSterilizationMethod: "steam_autoclave_134",
        isHeatSealed: false,
        isTransparentFilm: false,
    },
];
export const KRAFT_PACKAGE_SIZES = [
    {
        id: "size_75x150",
        dimensionsMmRu: "75 × 150 мм",
        widthMm: 75,
        heightMm: 150,
        titleRu: "Компактный (для боров, файлов и мелкого инструмента)",
        recommendedUsageRu: "Эндодонтические файлы, алмазные и твердосплавные боры, ультразвуковые насадки, полиры",
        typicalCapacityItemsCount: 6,
    },
    {
        id: "size_100x200",
        dimensionsMmRu: "100 × 200 мм",
        widthMm: 100,
        heightMm: 200,
        titleRu: "Стандартный (для смотрового набора и щипцов)",
        recommendedUsageRu: "Базовый смотровой терапевтический лоток, экстракционные щипцы, элеваторы, пинцеты",
        typicalCapacityItemsCount: 5,
    },
    {
        id: "size_150x250",
        dimensionsMmRu: "150 × 250 мм",
        widthMm: 150,
        heightMm: 250,
        titleRu: "Средний хирургический / пародонтологический",
        recommendedUsageRu: "Набор кюрет Грейси, хирургические ложки, распаторы, наконечники KaVo/NSK",
        typicalCapacityItemsCount: 8,
    },
    {
        id: "size_200x300",
        dimensionsMmRu: "200 × 300 мм",
        widthMm: 200,
        heightMm: 300,
        titleRu: "Крупный лоточный / кассетный",
        recommendedUsageRu: "Сетчатые кассеты имплантологии, полные ортопедические наборы, роторасширители, кламмеры",
        typicalCapacityItemsCount: 15,
    },
];
// ─── ZOD SCHEMAS ─────────────────────────────────────────────────────────────
export const kraftPackageMaterialIdSchema = z.enum([
    "paper_self_seal_single",
    "paper_self_seal_double",
    "paper_plastic_pouch",
    "crepe_paper_wrap",
    "bix_with_filter",
]);
export const kraftPackageSizeIdSchema = z.enum([
    "size_75x150",
    "size_100x200",
    "size_150x250",
    "size_200x300",
]);
export const thermalLabelSizeSchema = z.enum(["58x40", "43x25"]);
export const thermalPrinterProtocolSchema = z.enum(["zpl", "tspl", "escpos"]);
export const thermalPrinterConfigSchema = z.object({
    host: z.string().min(1, "Укажите IP-адрес или хост термопринтера"),
    port: z.number().int().min(1).max(65535).default(9100),
    protocol: thermalPrinterProtocolSchema.default("tspl"),
    modelName: z.string().optional(),
    dpi: z.union([z.literal(203), z.literal(300)]).default(203),
    timeoutMs: z.number().int().positive().default(5000),
});
export const thermalPrintJobDtoSchema = z.object({
    printerConfig: thermalPrinterConfigSchema,
    labelSize: thermalLabelSizeSchema.default("58x40"),
    packageRecordIds: z.array(z.string()).min(1, "Выберите хотя бы один крафт-пакет для печати"),
    copiesPerLabel: z.number().int().min(1).max(10).default(1),
    clinicName: z.string().optional(),
});
export function getKraftMaterialDefinition(id) {
    const found = KRAFT_PACKAGE_MATERIALS.find((m) => m.id === id);
    return found || KRAFT_PACKAGE_MATERIALS[0];
}
export function getKraftSizeDefinition(id) {
    const found = KRAFT_PACKAGE_SIZES.find((s) => s.id === id);
    return found || KRAFT_PACKAGE_SIZES[1];
}
