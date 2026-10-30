/**
 * treatmentEstimateTool.ts — Treatment & Service Estimate Calculation Tool.
 *
 * Adheres to:
 * - Exact integer kopecks arithmetic (@dental/shared). Zero float drift.
 * - Mandate 8e: Doctor autonomy (unrestricted doctor discounts 0..100%).
 * - Mandate 8x & 8ap: Clean clinical domain language (NO Soviet decree numbers like 804n).
 */

import { formatKopecksRu, multiplyKopecks, parseKopecks } from "@dental/shared";
import { z } from "zod";
import {
	formatFdiTooth,
	getCanalsForTooth,
	parseFdiTooth,
} from "../../chairsideSentinelEngine.js";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";

export const calculateTreatmentEstimateSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	toothNumber: z.union([z.number(), z.string()]).optional().describe("Номер зуба FDI"),
	category: z
		.enum(["therapy", "endodontics", "surgery", "orthopedics", "hygiene", "preventive"])
		.optional()
		.describe("Клиническая категория лечения"),
	serviceCodes: z.array(z.string()).optional().describe("Массив кодов услуг (например, ['A16.07.002.001', 'A16.07.030'])"),
	customItems: z
		.array(
			z.object({
				code: z.string(),
				title: z.string(),
				priceRub: z.number().nonnegative(),
				quantity: z.number().int().positive().default(1),
			}),
		)
		.optional()
		.describe("Пользовательские или дополнительные позиции прайса клиники"),
	discountPercent: z
		.number()
		.min(0, "Скидка не может быть отрицательной")
		.max(100, "Скидка не может превышать 100%")
		.default(0)
		.describe("Скидка лечащего врача в процентах (0-100%, свобода скидок врача)"),
	priceModifiers: z
		.array(
			z.object({
				name: z.string(),
				percentDelta: z.number(),
			}),
		)
		.optional()
		.describe("Модификаторы цены (например, сложность +10%, гарантия -100%)"),
});

export type CalculateTreatmentEstimateInput = z.infer<typeof calculateTreatmentEstimateSchema>;

// Semantic Clean Alias (Mandate 8ap)
export const calculateServicesEstimateSchema = calculateTreatmentEstimateSchema;
export type CalculateServicesEstimateInput = CalculateTreatmentEstimateInput;

export interface EstimateLineItem {
	code: string;
	title: string;
	basePriceRub: number;
	basePriceKopecks: number;
	quantity: number;
	finalPriceRub: number;
	finalPriceKopecks: number;
}

export interface CalculateTreatmentEstimateResult {
	patientId: string;
	toothNumber: number | null;
	fdiToothFormatted: string;
	items: EstimateLineItem[];
	subtotalRub: number;
	subtotalKopecks: number;
	discountPercent: number;
	discountRub: number;
	discountKopecks: number;
	totalRub: number;
	totalKopecks: number;
	formattedTotal: string;
	doctorAutonomyApplied: true;
}

export type CalculateServicesEstimateResult = CalculateTreatmentEstimateResult;

export const calculateTreatmentEstimateTool: ToolDefinition<
	typeof calculateTreatmentEstimateSchema,
	CalculateTreatmentEstimateResult
> = {
	name: "calculate_treatment_estimate",
	description:
		"Расчет клинической сметы медицинских услуг в точных целых копейках со свободой скидок врача (0-100%).",
	parameters: calculateTreatmentEstimateSchema,
	permissions: ["billing.calculate"],
	category: "read",
	handler: async (_ctx: AgentContext, args: z.input<typeof calculateTreatmentEstimateSchema>) => {
		const parsedTooth = parseFdiTooth(args.toothNumber);
		const canalCount = getCanalsForTooth(parsedTooth);

		const items: EstimateLineItem[] = [];

		const addService = (code: string, title: string, priceRub: number, qty = 1) => {
			const basePriceKopecks = parseKopecks(priceRub);
			const lineBaseKopecks = multiplyKopecks(basePriceKopecks, qty);
			items.push({
				code,
				title,
				basePriceRub: priceRub,
				basePriceKopecks,
				quantity: qty,
				finalPriceRub: priceRub * qty,
				finalPriceKopecks: lineBaseKopecks,
			});
		};

		if (args.serviceCodes && args.serviceCodes.length > 0) {
			for (const code of args.serviceCodes) {
				if (code === "A16.07.030" || code.startsWith("A16.07.030")) {
					addService(code, "Анестезия инфильтрационная / проводниковая", 950);
				} else if (code === "A16.07.082") {
					addService(code, "Изоляция операционного поля (коффердам)", 1500);
				} else if (code === "A16.07.002.001") {
					addService(code, "Восстановление зуба пломбой I, V, VI класс по Блэку (композит)", 3800);
				} else if (code.startsWith("A16.07.008")) {
					addService(code, `Пломбирование корневых каналов зуба (${canalCount} канала)`, canalCount * 2000);
				} else {
					addService(code, `Медицинская услуга (${code})`, 1200);
				}
			}
		}

		if (items.length === 0 && args.category) {
			if (args.category === "endodontics") {
				addService("A16.07.030", "Анестезия инфильтрационная / проводниковая", 950);
				addService("A16.07.082", "Изоляция операционного поля (коффердам)", 1500);
				const instCode = canalCount >= 3 ? "A16.07.030.003" : canalCount === 2 ? "A16.07.030.002" : "A16.07.030.001";
				const instPrice = canalCount >= 3 ? 5200 : canalCount === 2 ? 3800 : 2100;
				addService(instCode, `Инструментальная и медикаментозная обработка каналов (${canalCount}-канальный зуб)`, instPrice);
				const obtCode = canalCount >= 3 ? "A16.07.008.003" : canalCount === 2 ? "A16.07.008.002" : "A16.07.008.001";
				const obtPrice = canalCount >= 3 ? 6000 : canalCount === 2 ? 4200 : 2400;
				addService(obtCode, `Пломбирование корневых каналов гуттаперчей (${canalCount} канала)`, obtPrice);
				addService("A16.07.002.001", "Восстановление зуба светоотверждаемым композитом", 3800);
			} else if (args.category === "therapy") {
				addService("A16.07.030", "Анестезия инфильтрационная", 950);
				addService("A16.07.082", "Изоляция операционного поля коффердамом", 1500);
				addService("A16.07.002.001", "Восстановление зуба светоотверждаемым нанокомпозитом", 3800);
			} else if (args.category === "surgery") {
				addService("A16.07.030", "Анестезия проводниковая", 950);
				addService("A16.07.001.002", "Удаление постоянного зуба простое", 3200);
			} else if (args.category === "hygiene") {
				addService("A16.07.051", "Профессиональная гигиена полости рта и зубов (Air-Flow + ультразвук)", 5500);
			} else {
				addService("B01.065.001", "Прием (осмотр, консультация) врача-стоматолога первичный", 1000);
			}
		}

		if (args.customItems) {
			for (const c of args.customItems) {
				addService(c.code, c.title, c.priceRub, c.quantity || 1);
			}
		}

		if (items.length === 0) {
			addService("B01.065.001", "Прием (осмотр, консультация) врача-стоматолога", 1000);
		}

		let subtotalKopecks = 0;
		for (const it of items) {
			subtotalKopecks += it.finalPriceKopecks;
		}

		const discountPercent = args.discountPercent ?? 0;
		const discountKopecks = Math.round(subtotalKopecks * (discountPercent / 100));
		const totalKopecks = Math.max(0, subtotalKopecks - discountKopecks);

		const subtotalRub = subtotalKopecks / 100;
		const discountRub = discountKopecks / 100;
		const totalRub = totalKopecks / 100;

		return {
			patientId: args.patientId,
			toothNumber: parsedTooth,
			fdiToothFormatted: formatFdiTooth(parsedTooth),
			items,
			subtotalRub,
			subtotalKopecks,
			discountPercent,
			discountRub,
			discountKopecks,
			totalRub,
			totalKopecks,
			formattedTotal: formatKopecksRu(totalKopecks),
			doctorAutonomyApplied: true,
		};
	},
};

export const calculateServicesEstimateTool: ToolDefinition<
	typeof calculateTreatmentEstimateSchema,
	CalculateTreatmentEstimateResult
> = {
	...calculateTreatmentEstimateTool,
	name: "calculate_services_estimate",
};
