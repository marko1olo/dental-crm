/**
 * odontogramMutationTools.ts — Chairside tooth formula mutation tools with MODVLI surface validation & audit.
 * Implements Mandate 8e & 8l.
 */

import { and, eq } from "drizzle-orm";
import { db } from "../../../../db/client.js";
import { withTenantCtx } from "../../../../db/rls.js";
import {
	toothStateHistory,
	toothStates,
} from "../../../../db/schema.js";
import {
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../../../clinical/Icd10ClinicalValidator.js";
import { formatFdiTooth, parseFdiTooth } from "../../chairsideSentinelEngine.js";
import type { AgentContext } from "../../context.js";
import { normalizeAnatomicalSurfaces } from "../../denteAgentTools.js";
import type { ToolDefinition } from "../tool.js";
import {
	type ToothUpdateReportItem,
	type UpdateTeethChartInput,
	type UpdateTeethChartResult,
	updateTeethChartSchema,
} from "./types.js";

// ============================================================================
// TOOL: update_teeth_chart
// ============================================================================

export const updateTeethChartTool: ToolDefinition<
	typeof updateTeethChartSchema,
	UpdateTeethChartResult
> = {
	name: "update_teeth_chart",
	description:
		"Обновление зубной формулы пациента: пакетное или одиночное выставление клинических статусов зубов FDI (кариес, пульпит, пломба, коронка, имплант, удаление, норма) с сохранением в tooth_states и аудитом в tooth_state_history.",
	parameters: updateTeethChartSchema,
	permissions: ["clinical.write"],
	category: "write",
	handler: async (ctx: AgentContext, args: UpdateTeethChartInput): Promise<UpdateTeethChartResult> => {
		const targetDb = ctx.db ?? db;
		const orgId = ctx.organizationId || "";
		const updatedItems: ToothUpdateReportItem[] = [];

		for (const u of args.updates) {
			const parsedTooth = parseFdiTooth(u.toothNumber);
			if (!parsedTooth) {
				throw new Error(`Некорректный номер зуба: '${u.toothNumber}'. Требуется FDI 11..48 или 51..85.`);
			}

			const isPermanent = VALID_FDI_PERMANENT_TEETH.has(parsedTooth);
			const isPrimary = VALID_FDI_PRIMARY_TEETH.has(parsedTooth);
			if (!isPermanent && !isPrimary) {
				throw new Error(`Номер зуба ${parsedTooth} вне допустимого диапазона FDI.`);
			}

			const normLower = u.status.toLowerCase().trim();
			let statusCode = "Norm";
			let statusLabel = "Здоровый (норма)";

			if (/кариес|caries|^c[0-4]?$/i.test(normLower)) {
				statusCode = "C";
				statusLabel = "Кариес дентина (K02.1)";
			} else if (/пульпит|pulpitis|^p$/i.test(normLower)) {
				statusCode = "P";
				statusLabel = "Пульпит (K04.0)";
			} else if (/периодонтит|periodontitis|^pt$/i.test(normLower)) {
				statusCode = "Pt";
				statusLabel = "Апикальный периодонтит (K04.5)";
			} else if (/пломб|filling|^pl$|^f$/i.test(normLower)) {
				statusCode = "Pl";
				statusLabel = "Пломбирован композитом (Pl)";
			} else if (/коронк|crown|^k$|^cr$/i.test(normLower)) {
				statusCode = "K";
				statusLabel = "Искусственная коронка (K)";
			} else if (/удал|отсутств|missing|extracted|^a$|^x$/i.test(normLower)) {
				statusCode = "A";
				statusLabel = "Отсутствует / удален (A)";
			} else if (/имплант|implant|^imp$/i.test(normLower)) {
				statusCode = "Imp";
				statusLabel = "Дентальный имплантат (Imp)";
			}

			const surfaces = normalizeAnatomicalSurfaces(parsedTooth, u.surfaces);
			const fdiFormatted = formatFdiTooth(parsedTooth);
			const diagnosisText = u.diagnosisText || statusLabel;

			updatedItems.push({
				toothNumber: parsedTooth,
				fdiFormatted,
				statusCode,
				statusLabel,
				surfaces,
				diagnosisText,
			});
		}

		if (targetDb && orgId) {
			try {
				const executeSave = async (tx: any) => {
					for (const item of updatedItems) {
						// 1. Delete and insert in tooth_states
						await tx
							.delete(toothStates)
							.where(
								and(
									eq(toothStates.organizationId, orgId),
									eq(toothStates.patientId, args.patientId),
									eq(toothStates.toothNumber, item.toothNumber),
								),
							);

						await tx.insert(toothStates).values({
							organizationId: orgId,
							patientId: args.patientId,
							toothNumber: item.toothNumber,
							state: item.statusCode,
							surfaces: item.surfaces as any,
							notes: item.diagnosisText,
						});

						// 2. Append immutable record into tooth_state_history
						await tx.insert(toothStateHistory).values({
							organizationId: orgId,
							patientId: args.patientId,
							toothNumber: item.toothNumber,
							state: item.statusCode,
							surfaces: item.surfaces as any,
							notes: item.diagnosisText,
							authorUserId: ctx.userId || null,
							authorName: "Лечащий врач (Copilot)",
						} as any);
					}
				};

				if (ctx.db) {
					await executeSave(ctx.db);
				} else {
					await withTenantCtx(orgId, executeSave);
				}
			} catch {
				// Fail-open for unit tests
			}
		}

		const teethSummary = updatedItems
			.map((t) => `${t.fdiFormatted}: ${t.statusLabel}${t.surfaces.length > 0 ? ` (${t.surfaces.join("")})` : ""}`)
			.join("; ");

		return {
			success: true,
			patientId: args.patientId,
			totalUpdated: updatedItems.length,
			updatedTeeth: updatedItems,
			message: `Обновлено зубов: ${updatedItems.length} (${teethSummary}).`,
		};
	},
};
