/**
 * marketingArchivedPromosPresets.ts — Archived Promo Offers for Marketing Catalog.
 * Governed by Mandate 8b (<= 120 lines).
 */

import type { MarketingPromo } from "./marketingTypes";

export const DEFAULT_ARCHIVED_PROMOS: readonly MarketingPromo[] = [
	{
		id: "promo-summer-2026",
		title: "Летний имплант Osstem (-15%)",
		badge: "Архив",
		status: "archived",
		category: "Имплантация",
		discountText: "-15% на хирургический этап",
		promoCode: "SUMMER2026",
		validUntil: "31.08.2026",
		minInvoiceRub: 35000,
		description: "Летняя сезонная акция на хирургическую установку имплантатов.",
		conditions: ["Акция завершена 31.08.2026"],
		stats: { reach: 98, delivered: 96, deliveredPercent: 97.9, visits: 19, conversionPercent: 19.4, revenueRub: 665000, budgetSpentRub: 950, romiPercent: 699 },
		templates: { sms: "Акция завершена.", whatsapp: "Акция завершена.", telegram: "Акция завершена." },
		recommendedSegment: "all_active",
		createdAt: "2026-06-01T09:00:00.000Z",
	},
	{
		id: "promo-spring-smile",
		title: "Весенняя ортодонтия: рассрочка 0%",
		badge: "Архив",
		status: "archived",
		category: "Ортодонтия",
		discountText: "Рассрочка 0% на брекет-системы",
		promoCode: "SPRING-SMILE",
		validUntil: "31.05.2026",
		minInvoiceRub: 80000,
		description: "Беспроцентная рассрочка на самолигирующие брекет-системы Damon Q.",
		conditions: ["Акция завершена 31.05.2026"],
		stats: { reach: 115, delivered: 114, deliveredPercent: 99.1, visits: 22, conversionPercent: 19.1, revenueRub: 880000, budgetSpentRub: 1100, romiPercent: 799 },
		templates: { sms: "Акция завершена.", whatsapp: "Акция завершена.", telegram: "Акция завершена." },
		recommendedSegment: "ortho_therapy",
		createdAt: "2026-03-01T09:00:00.000Z",
	},
];
