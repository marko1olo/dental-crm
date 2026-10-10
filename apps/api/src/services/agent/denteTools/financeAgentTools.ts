import crypto from "node:crypto";
import { multiplyKopecks, parseKopecks, formatKopecksRu } from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import { appointments, labOrders, patients, users, visits } from "../../../db/schema.js";
import { VALID_FDI_PERMANENT_TEETH, VALID_FDI_PRIMARY_TEETH } from "../../clinical/Icd10ClinicalValidator.js";
import { type ChairsideSafetyAlert, type ChairsideSoapDiary, formatFdiTooth, getCanalsForTooth, parseFdiTooth } from "../chairsideSentinelEngine.js";
import type { AgentContext } from "../context.js";
import type { ToolRegistry } from "../tools/registry.js";
import type { ToolDefinition } from "../tools/tool.js";
import { calculateAnestheticDosageTool, calculateAnestheticDosageSchema, type CalculateAnestheticDosageInput, type CalculateAnestheticDosageResult } from "../tools/anestheticDosageTool.js";
import { generateInformedConsentIdsTool, generateInformedConsentIdsSchema, type GenerateInformedConsentIdsInput, type GenerateInformedConsentIdsResult } from "../tools/informedConsentTool.js";
import { checkWarehouseSuppliesTool, checkWarehouseSuppliesSchema, type CheckWarehouseSuppliesInput, type CheckWarehouseSuppliesResult, type CriticalSupplyItem } from "../tools/warehouseSuppliesTool.js";
import {
	calculate804nEstimateSchema,
	type Calculate804nEstimateResult,
} from "./types.js";
import { getDailyScheduleIntelligenceTool, getDoctorShiftsAndChairsTool } from "../tools/crmOperationalScheduleTools.js";
import { getClinicOrDoctorRevenueTool, getPatientFamilyDepositAndDebtTool } from "../tools/crmFinancialIntelligenceTools.js";
export const calculate804nEstimateTool: ToolDefinition<
	typeof calculate804nEstimateSchema,
	Calculate804nEstimateResult
> = {
	name: "calculate_804n_estimate",
	description:
		"Расчет клинической сметы медицинских услуг в точных целых копейках со свободой скидок врача (0-100%).",
	parameters: calculate804nEstimateSchema,
	permissions: ["billing.calculate"],
	category: "read",
	handler: async (_ctx: AgentContext, args: z.input<typeof calculate804nEstimateSchema>) => {
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

		// 1. If explicit service codes are supplied
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

		// 2. If category specified and no explicit service codes
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

		// 3. Append any custom items
		if (args.customItems) {
			for (const c of args.customItems) {
				addService(c.code, c.title, c.priceRub, c.quantity || 1);
			}
		}

		// Default fallback if empty
		if (items.length === 0) {
			addService("B01.065.001", "Прием (осмотр, консультация) врача-стоматолога", 1000);
		}

		// Exact integer kopeck calculations
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
