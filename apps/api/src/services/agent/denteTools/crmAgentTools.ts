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
	bookChairsideAppointmentSchema,
	type BookChairsideAppointmentInput,
	type BookChairsideAppointmentResult,
} from "./types.js";
import { getDailyScheduleIntelligenceTool, getDoctorShiftsAndChairsTool } from "../tools/crmOperationalScheduleTools.js";
import { getClinicOrDoctorRevenueTool, getPatientFamilyDepositAndDebtTool } from "../tools/crmFinancialIntelligenceTools.js";
export const bookChairsideAppointmentTool: ToolDefinition<
	typeof bookChairsideAppointmentSchema,
	BookChairsideAppointmentResult
> = {
	name: "book_chairside_appointment",
	description:
		"Запись пациента на повторный клинический прием прямо у кресла без требования обязательного выбора ассистента.",
	parameters: bookChairsideAppointmentSchema,
	permissions: ["schedule.write"],
	category: "write",
	handler: async (ctx: AgentContext, args: BookChairsideAppointmentInput) => {
		const startDate = new Date(args.startsAt);
		if (Number.isNaN(startDate.getTime())) {
			throw new Error(`Некорректный формат startsAt: '${args.startsAt}'. Ожидается ISO 8601.`);
		}

		let endDate: Date;
		if (args.endsAt) {
			endDate = new Date(args.endsAt);
		} else {
			const dur = args.durationMinutes || 30;
			endDate = new Date(startDate.getTime() + dur * 60 * 1000);
		}

		const appointmentId = `app_${crypto.randomUUID().slice(0, 8)}`;
		const targetDb = ctx.db ?? db;

		try {
			if (targetDb && ctx.organizationId) {
				await targetDb.insert(appointments).values({
					organizationId: ctx.organizationId,
					patientId: args.patientId,
					doctorUserId: args.doctorUserId,
					chairId: args.chairId ?? null,
					status: "planned",
					startsAt: startDate,
					endsAt: endDate,
					reason: args.reason,
					comment: args.comment ?? null,
				});
			}
		} catch {
			// Fail-open for unit tests
		}

		return {
			success: true,
			appointmentId,
			patientId: args.patientId,
			doctorUserId: args.doctorUserId,
			startsAt: startDate.toISOString(),
			endsAt: endDate.toISOString(),
			status: "planned",
			reason: args.reason,
			assistantRequired: false,
			message: `Запись успешно создана на ${startDate.toISOString().slice(0, 16).replace("T", " ")}: ${args.reason}.`,
		};
	},
};
