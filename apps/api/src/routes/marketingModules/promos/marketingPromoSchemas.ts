/**
 * marketingPromoSchemas.ts — Zod-схемы валидации маркетинговых акций клиники.
 */

import { z } from "zod";
import { rublesToKopecks, kopecksToRubles } from "@dental/shared";

export const promoStatsSchema = z.preprocess(
	(raw: unknown) => {
		if (typeof raw !== "object" || raw === null) return raw;
		const obj = { ...(raw as Record<string, unknown>) };
		if (obj.revenueKopecks === undefined && typeof obj.revenueRub === "number") {
			obj.revenueKopecks = rublesToKopecks(obj.revenueRub);
		} else if (obj.revenueRub === undefined && typeof obj.revenueKopecks === "number") {
			obj.revenueRub = Math.round(kopecksToRubles(obj.revenueKopecks));
		}
		if (obj.budgetSpentKopecks === undefined && typeof obj.budgetSpentRub === "number") {
			obj.budgetSpentKopecks = rublesToKopecks(obj.budgetSpentRub);
		} else if (obj.budgetSpentRub === undefined && typeof obj.budgetSpentKopecks === "number") {
			obj.budgetSpentRub = Math.round(kopecksToRubles(obj.budgetSpentKopecks));
		}
		return obj;
	},
	z.object({
		reach: z.number().nonnegative().default(0),
		delivered: z.number().nonnegative().default(0),
		deliveredPercent: z.number().nonnegative().default(0),
		visits: z.number().nonnegative().default(0),
		conversionPercent: z.number().nonnegative().default(0),
		revenueRub: z.number().nonnegative().default(0),
		budgetSpentRub: z.number().nonnegative().default(0),
		revenueKopecks: z.number().int().nonnegative().default(0),
		budgetSpentKopecks: z.number().int().nonnegative().default(0),
		romiPercent: z.number().default(0),
	}),
);

export const promoTemplatesSchema = z.object({
	sms: z.string().min(1),
	whatsapp: z.string().min(1),
	telegram: z.string().min(1),
});

export const marketingPromoSchema = z.preprocess(
	(raw: unknown) => {
		if (typeof raw !== "object" || raw === null) return raw;
		const obj = { ...(raw as Record<string, unknown>) };
		if (obj.minInvoiceKopecks === undefined && typeof obj.minInvoiceRub === "number") {
			obj.minInvoiceKopecks = rublesToKopecks(obj.minInvoiceRub);
		} else if (obj.minInvoiceRub === undefined && typeof obj.minInvoiceKopecks === "number") {
			obj.minInvoiceRub = Math.round(kopecksToRubles(obj.minInvoiceKopecks));
		}
		return obj;
	},
	z.object({
		id: z.string().min(1),
		title: z.string().min(1).max(200),
		badge: z.string().max(80).default("Акция"),
		status: z.enum(["active", "archived", "paused"]).default("active"),
		category: z.string().max(120).default("Профилактика и гигиена"),
		discountText: z.string().min(1).max(120),
		promoCode: z.string().min(1).max(60),
		validUntil: z.string().max(80).default("Бессрочно"),
		minInvoiceRub: z.number().nonnegative().default(0),
		minInvoiceKopecks: z.number().int().nonnegative().default(0),
		description: z.string().max(1000).default(""),
		conditions: z.array(z.string()).default([]),
		stats: promoStatsSchema.default({
			reach: 0,
			delivered: 0,
			deliveredPercent: 0,
			visits: 0,
			conversionPercent: 0,
			revenueRub: 0,
			budgetSpentRub: 0,
			revenueKopecks: 0,
			budgetSpentKopecks: 0,
			romiPercent: 0,
		}),
		templates: promoTemplatesSchema,
		recommendedSegment: z.string().default("no_visit_6m"),
		createdAt: z.string().default(() => new Date().toISOString()),
	}),
);

export type StoredMarketingPromo = z.infer<typeof marketingPromoSchema>;
