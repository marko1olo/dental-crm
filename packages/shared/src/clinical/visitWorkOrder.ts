/**
 * packages/shared/src/clinical/visitWorkOrder.ts
 *
 * DENTE Dental CRM — Visit Work Order & Plan Items Transfer Contracts.
 * Compliant with:
 * - Постановление Правительства РФ от 11.05.2023 № 736 «Платные медицинские услуги»
 * - Закон РФ от 07.02.1992 № 2300-1 «О защите прав потребителей» (ст. 16 — запрет навязывания услуг)
 * - Приказ Минздрава России от 13.10.2017 № 804н «Номенклатура медицинских услуг»
 * - Федеральный закон от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в РФ»
 */

import { z } from "zod";

export const applyPlanItemsToVisitSchema = z.object({
	planId: z.string().uuid({ message: "planId должен быть валидным UUID." }),
	itemIds: z
		.array(z.string().uuid({ message: "Каждый itemId должен быть валидным UUID." }))
		.min(1, { message: "Необходимо передать как минимум один itemId для переноса в наряд." }),
});
export type ApplyPlanItemsToVisitInput = z.infer<typeof applyPlanItemsToVisitSchema>;

export const appliedVisitWorkOrderItemSchema = z.object({
	id: z.string().uuid(),
	planItemId: z.string().uuid(),
	serviceId: z.string().uuid().nullable(),
	title: z.string(),
	toothCode: z.string().nullable(),
	quantity: z.number().positive(),
	unitPriceRub: z.number().nonnegative(),
	discountRub: z.number().nonnegative(),
	priceRub: z.number().nonnegative(),
	order804nCode: z.string().nullable(),
	status: z.string(),
	isAlreadyApplied: z.boolean(),
});
export type AppliedVisitWorkOrderItem = z.infer<typeof appliedVisitWorkOrderItemSchema>;

export const applyPlanItemsToVisitResponseSchema = z.object({
	visitId: z.string().uuid(),
	planId: z.string().uuid(),
	transferredItemsCount: z.number().int().nonnegative(),
	alreadyAppliedItemsCount: z.number().int().nonnegative(),
	items: z.array(appliedVisitWorkOrderItemSchema),
	planProgress: z.object({
		totalPlanItems: z.number().int().nonnegative(),
		completedOrInProgressItems: z.number().int().nonnegative(),
		completionPercentage: z.number().int().min(0).max(100),
		planStatus: z.string(),
	}),
	totalAddedRub: z.number().nonnegative(),
	totalAddedKopecks: z.number().int().nonnegative(),
});
export type ApplyPlanItemsToVisitResponse = z.infer<typeof applyPlanItemsToVisitResponseSchema>;
