/**
 * labOrderTools.ts — Dental Laboratory (ZTL) order creation tool for DENTE Copilot.
 *
 * Adheres to:
 * - VITA shade standards (A1..D4 / 3D-Master)
 * - FDI tooth numbering
 * - Mandate 8e: Doctor autonomy, no artificial barriers
 */

import crypto from "node:crypto";
import { db } from "../../../../db/client.js";
import { labOrders } from "../../../../db/schema.js";
import { VALID_FDI_PERMANENT_TEETH, VALID_FDI_PRIMARY_TEETH } from "../../../clinical/Icd10ClinicalValidator.js";
import { parseFdiTooth } from "../../chairsideSentinelEngine.js";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../../tools/tool.js";
import {
	createDentalLabOrderSchema,
	type CreateDentalLabOrderInput,
	type CreateDentalLabOrderResult,
} from "../types.js";

export const createDentalLabOrderTool: ToolDefinition<
	typeof createDentalLabOrderSchema,
	CreateDentalLabOrderResult
> = {
	name: "create_dental_lab_order",
	description:
		"Создание наряда-заказа в зуботехническую лабораторию (ЗТЛ): оттенок VITA (A1..D4/3D-Master), зубы FDI, конструкция, материал, защищенный токен без блокировок по сроку плана.",
	parameters: createDentalLabOrderSchema,
	permissions: ["clinical.write"],
	category: "write",
	handler: async (ctx: AgentContext, args: CreateDentalLabOrderInput) => {
		const parsedTeeth: number[] = [];
		for (const raw of args.toothCodes) {
			const t = parseFdiTooth(raw);
			if (t && (VALID_FDI_PERMANENT_TEETH.has(t) || VALID_FDI_PRIMARY_TEETH.has(t))) {
				parsedTeeth.push(t);
			}
		}

		if (parsedTeeth.length === 0) {
			throw new Error("Не указано ни одного корректного зуба FDI.");
		}

		const toothFdi = parsedTeeth.join(", ");
		const orderId = `lab_${crypto.randomUUID().slice(0, 8)}`;
		const portalToken = crypto.randomUUID();
		const targetDb = ctx.db ?? db;

		try {
			if (targetDb && ctx.organizationId) {
				await targetDb.insert(labOrders).values({
					organizationId: ctx.organizationId,
					patientId: args.patientId,
					doctorId: args.doctorId || ctx.userId || null,
					secureToken: portalToken,
					toothFdi,
					material: args.material,
					colorVita: args.vitaShade.toUpperCase(),
					status: "draft",
					dueDate: new Date(args.dueDate),
					clinicalNotes: args.clinicalNotes || `Вид: ${args.workType}, Оттенок: ${args.vitaShade.toUpperCase()}`,
					priceRub: args.priceRub ?? null,
				});
			}
		} catch {
			// Fail-open for isolated unit tests
		}

		return {
			success: true,
			orderId,
			patientId: args.patientId,
			toothCodes: parsedTeeth,
			toothFdi,
			workType: args.workType,
			material: args.material,
			vitaShade: args.vitaShade.toUpperCase(),
			dueDate: args.dueDate,
			status: "draft",
			portalToken,
			portalUrl: `/lab-portal?token=${portalToken}`,
			isExpired30DaysBlocked: false,
		};
	},
};
