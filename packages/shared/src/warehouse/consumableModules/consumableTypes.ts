import { z } from "zod";
import { consumableUnitSchema, type ConsumableUnit } from "../../inventory/procedureBomEngine.js";
export { consumableUnitSchema, type ConsumableUnit };

export const treatmentConsumableLinkSchema = z.object({
	id: z.string().min(1, "ID связи обязателен"),
	catalogItemId: z.string().min(1, "ID услуги прейскуранта обязателен"), catalogItemName: z.string().optional(),
	inventoryItemId: z.string().min(1, "ID складской позиции обязателен"),
	inventoryItemName: z.string().min(1, "Наименование складской позиции обязательно"),
	unit: z.string().min(1, "Единица измерения обязательна"),
	quantityPerService: z.number().positive("Норма расхода на услугу должна быть больше 0"), note: z.string().optional(),
});
export type TreatmentConsumableLink = z.infer<typeof treatmentConsumableLinkSchema>;

export const treatmentPerformedEventSchema = z.object({
	treatmentReferenceId: z.string().min(1, "ID оказанной услуги / визита обязателен"),
	catalogItemId: z.string().min(1, "ID услуги в каталоге обязателен"),
	serviceQuantity: z.number().positive("Количество оказанных услуг должно быть положительным").optional(),
	performedAt: z.string().min(1, "Дата и время выполнения обязательны"),
	doctorId: z.string().optional(), patientId: z.string().optional(),
});
export type TreatmentPerformedEvent = z.infer<typeof treatmentPerformedEventSchema>;

export const consumableDeductionItemSchema = z.object({
	inventoryItemId: z.string().min(1), inventoryItemName: z.string().min(1), unit: z.string().min(1),
	deductedQuantity: z.number(), currentStock: z.number(), resultingStock: z.number(), isOverdraft: z.boolean(),
});
export type ConsumableDeductionItem = z.infer<typeof consumableDeductionItemSchema>;

export const treatmentDeductionResultSchema = z.object({
	treatmentReferenceId: z.string().min(1), catalogItemId: z.string().min(1),
	items: z.array(consumableDeductionItemSchema), hasOverdraft: z.boolean(), deductionTimestamp: z.string().min(1),
});
export type TreatmentDeductionResult = z.infer<typeof treatmentDeductionResultSchema>;

export interface BatchTreatmentConsumablesResult {
	results: TreatmentDeductionResult[];
	finalStocks: Record<string, number>;
	totalDeductedByItem: Record<string, number>;
}

export const consumableCategorySchema = z.enum([
	"anesthetic", "composite", "suture", "endo_file", "bur",
	"rubber_dam", "hygiene_paste", "disinfectant", "other",
]);
export type ConsumableCategory = z.infer<typeof consumableCategorySchema>;

export const CONSUMABLE_CATEGORY_LABELS: Record<ConsumableCategory, string> = {
	anesthetic: "Анестетики (карпулы / ампулы)", composite: "Композиты и пломбировочные материалы",
	suture: "Шовный материал", endo_file: "Эндодонтические файлы и гуттаперча",
	bur: "Боры и полировочные диски", rubber_dam: "Коффердам / раббердам",
	hygiene_paste: "Пасты и порошки для профгигиены", disinfectant: "Дезинфектанты и антисептики",
	other: "Прочие расходные материалы",
};

export const CONSUMABLE_UNIT_LABELS: Record<ConsumableUnit, string> = {
	карпула: "карпула", шприц_гр: "шприц (г)", ампула: "ампула", шт: "шт.", метр: "м",
	упак: "упак.", pcs: "шт.", carpule: "карпула", gram: "г", ml: "мл",
	pack: "упак.", tube: "туба", dose: "доза", cm: "см",
};

export const consumableItemLinkSchema = z.object({
	id: z.string().min(1, "ID связи обязателен"),
	service804nCode: z.string().min(1, "Код услуги обязателен"), serviceTitle: z.string().min(1, "Наименование услуги обязательно"),
	inventoryItemId: z.string().min(1, "ID складской номенклатуры обязателен"),
	itemName: z.string().min(1, "Наименование расходного материала обязательно"),
	category: consumableCategorySchema.optional().default("other"), unit: consumableUnitSchema,
	quantityPerService: z.number().positive("Норма расхода должна быть больше нуля"),
	isMandatory: z.boolean().optional().default(true),
	costPriceKopecks: z.number().int().nonnegative("Себестоимость в копейках должна быть неотрицательной"),
	notes: z.string().optional().nullable(),
});
export type ConsumableItemLink = z.input<typeof consumableItemLinkSchema>;

export const renderedServiceItemSchema = z.object({
	serviceCode: z.string().min(1, "Код услуги обязателен"), serviceTitle: z.string().optional(),
	quantity: z.number().positive().optional().default(1), toothNumber: z.number().int().min(11).max(85).optional().nullable(),
});
export type RenderedServiceItem = z.input<typeof renderedServiceItemSchema>;

export const consumableDeductionRequestSchema = z.object({
	visitId: z.string().min(1, "ID визита обязателен"), patientId: z.string().min(1, "ID пациента обязателен"),
	patientFullName: z.string().optional(), doctorId: z.string().min(1, "ID врача обязателен"),
	doctorFullName: z.string().optional(), visitDate: z.string().optional(),
	renderedServices: z.array(renderedServiceItemSchema), currentStockMap: z.record(z.string(), z.number()),
	allowOverdraft: z.boolean().optional().default(true),
});
export type ConsumableDeductionRequest = z.input<typeof consumableDeductionRequestSchema>;

export const consumableDeductedItemSchema = z.object({
	inventoryItemId: z.string().min(1), itemName: z.string().min(1),
	category: consumableCategorySchema.optional(), unit: consumableUnitSchema.optional(),
	service804nCode: z.string().optional(), toothNumber: z.number().int().min(11).max(85).optional().nullable(),
	deductedQty: z.number().nonnegative(), remainingQty: z.number(),
	unitCostPriceKopecks: z.number().int().nonnegative(), totalCostPriceKopecks: z.number().int().nonnegative(),
	totalCostPriceRub: z.string(), isOverdraft: z.boolean(), overdraftWarning: z.string().optional(),
});
export type ConsumableDeductedItem = z.infer<typeof consumableDeductedItemSchema>;

export const consumableDeductionResultSchema = z.object({
	visitId: z.string(), patientId: z.string(), doctorId: z.string(),
	totalDeductedItems: z.number().int().nonnegative(), totalCostPriceKopecks: z.number().int().nonnegative(),
	totalCostPriceRub: z.string(), items: z.array(consumableDeductedItemSchema),
	softOverdrafts: z.array(z.string()), hasOverdraft: z.boolean(),
});
export type ConsumableDeductionResult = z.infer<typeof consumableDeductionResultSchema>;

export interface PlannedServiceConsumable {
	linkId: string; service804nCode: string; serviceTitle: string; toothNumber: number | null;
	inventoryItemId: string; itemName: string; category: ConsumableCategory; unit: ConsumableUnit;
	requiredQuantity: number; unitCostPriceKopecks: number; totalCostPriceKopecks: number; isMandatory: boolean;
}
