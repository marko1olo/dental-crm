/**
 * apps/api/src/routes/surgery/index.ts
 *
 * Dedicated Fastify route plugin for Outpatient Surgery & Dental Implantology.
 * Standards:
 * - Mandate 8e: Doctor & nurse autonomy at the dental chair (zero blocking disabled buttons, 1-click write-offs).
 * - Mandate 8i: Strictly outpatient dental chair bounded context (no hospital bed-days, laparotomy, ICU, transfusion bloat).
 * - Mandate 8s: Universal anti-bloat (single canonical source, zero fake procedural dioramas).
 * - Mandate 8n: Solo doctor & small clinic sovereignty (soft warehouse overdraft, no 3-person commissions).
 * - SanPiN 3.3686-21: Carpule anesthetics are Class B medical waste, disposed in 1 click without narcotic PKU.
 */

import {
	CANONICAL_SURGICAL_OPERATION_NORMS,
	createSurgicalProtocolSchema,
	surgicalQuickDeductSchema,
	evaluateWarehouseOverdraft,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	patients,
	toothStateHistory,
	visits,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { TreatmentConsumablesService } from "../../services/treatmentConsumablesService.js";

export async function registerSurgeryRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * 1. GET /api/surgery/protocols/templates
	 * Возвращает 1-клик шаблоны хирургических протоколов с физиологической нормой по умолчанию
	 * (Номенклатура 804н, Форма 043/у, Мандаты 8e, 8i).
	 */
	app.get("/api/surgery/protocols/templates", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		return reply.send({
			success: true,
			count: CANONICAL_SURGICAL_OPERATION_NORMS.length,
			templates: CANONICAL_SURGICAL_OPERATION_NORMS,
		});
	});

	/**
	 * 2. POST /api/surgery/protocols
	 * Регистрация протокола амбулаторной операции в карте 043/у и приёме (Мандаты 8e, 8i).
	 * Автоматически вносит дневник операции без бюрократических барьеров.
	 */
	app.post("/api/surgery/protocols", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole =
			identity.role ??
			(request as unknown as { user?: { role?: string | null } }).user?.role ??
			null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.surgery.write",
				role: staffRole,
				message: `Отказ в записи протокола операции (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const parsed = createSurgicalProtocolSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "SurgicalProtocolValidationError",
				message: "Некорректные параметры хирургического протокола.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		// Проверка пациента
		const [patient] = await db
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(and(eq(patients.id, input.patientId), eq(patients.organizationId, orgId)))
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в текущей клинике.",
			});
		}

		const norm = CANONICAL_SURGICAL_OPERATION_NORMS.find((n) => n.id === input.normId);

		const result = await db.transaction(async (tx) => {
			let visitUpdated = false;

			// Если передан visitId, обновляем объективный статус / дневник операции приёма
			if (input.visitId) {
				const [visit] = await tx
					.select()
					.from(visits)
					.where(and(eq(visits.id, input.visitId), eq(visits.organizationId, orgId)))
					.limit(1);

				if (visit) {
					const existingObj = visit.objectiveStatus || "";
					const formattedEntry = `[ПРОТОКОЛ ОПЕРАЦИИ: ${norm?.title || input.normId}${input.toothNumberFdi ? ` (FDI #${input.toothNumberFdi})` : ""}]\n${input.protocolText}`;
					const updatedObj = existingObj ? `${existingObj}\n\n${formattedEntry}` : formattedEntry;

					await tx
						.update(visits)
						.set({
							objectiveStatus: updatedObj,
							updatedAt: new Date(),
						})
						.where(and(eq(visits.id, visit.id), eq(visits.organizationId, orgId)));

					visitUpdated = true;
				}
			}

			// Если указан номер зуба, фиксируем факт вмешательства в истории зуба
			if (input.toothNumberFdi) {
				const isImplant = input.normId.toLowerCase().includes("implant");
				await tx.insert(toothStateHistory).values({
					organizationId: orgId,
					patientId: input.patientId,
					toothNumber: input.toothNumberFdi,
					newState: isImplant ? "Implant" : "Extracted",
					newSurfaces: [isImplant ? "implant_site" : "extracted_socket"],
					reason: `Хирургическая операция: ${norm?.title || input.normId}`,
				});
			}

			return {
				patientId: input.patientId,
				visitId: input.visitId,
				normId: input.normId,
				toothNumberFdi: input.toothNumberFdi,
				protocolText: input.protocolText,
				visitUpdated,
				isOverdraftActive: input.isOverdraftActive,
				savedAt: new Date().toISOString(),
			};
		});

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			patientId: input.patientId,
			action: "RECORD_SURGICAL_OPERATION_PROTOCOL",
			diagnosis: norm?.title || input.normId,
		});

		wsBroker.broadcastToOrganization(orgId, {
			type: "UPDATE_SURGICAL_PROTOCOL",
			payload: {
				patientId: input.patientId,
				toothNumberFdi: input.toothNumberFdi,
				protocol: result,
			},
		});

		return reply.code(201).send({
			success: true,
			protocol: result,
		});
	});

	/**
	 * 3. POST /api/surgery/materials/quick-deduct
	 * 1-клик списание хирургических комплектов у кресла (Мандаты 8e, 8s, 8n).
	 * Пустые карпулы анестетиков — отходы Класса Б (СанПиН 3.3686-21) без комиссий.
	 * Мягкий овердрафт склада: задержка накладной никогда не блокирует операцию врача!
	 */
	app.post("/api/surgery/materials/quick-deduct", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const parsed = surgicalQuickDeductSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "SurgicalDeductValidationError",
				message: "Некорректные параметры списания расходных материалов.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		const writeoffResult = await db.transaction(async (tx) => {
			if (input.bundleType === "anesthesia_carpule") {
				// Списание карпул анестетиков медсестрой (Класс Б, СанПиН 3.3686-21, без комиссий)
				return await TreatmentConsumablesService.quickWriteoffCarpules(tx, {
					organizationId: orgId,
					carpulesCount: input.carpulesCount,
					drugName: input.drugBrandName,
					userId: identity.userId,
					visitId: input.visitId,
					notes: input.notes ?? `Списание ${input.carpulesCount} карпул(ы) ${input.drugBrandName} (отходы Класса Б, СанПиН 3.3686-21, 1 клик)`,
				});
			}

			// Маппинг хирургических бандлов на TreatmentConsumablesService
			let visitType: "therapy" | "surgery" | "implant" | "sinus_gbr" = "surgery";
			if (input.bundleType === "implant") {
				visitType = "implant";
			} else if (input.bundleType === "sinus_gbr") {
				visitType = "sinus_gbr";
			} else {
				visitType = "surgery";
			}

			return await TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
				organizationId: orgId,
				visitType,
				userId: identity.userId,
				visitId: input.visitId,
				notes: input.notes ?? `1-клик списание набора «${visitType}» (Мандат 8e, мягкий овердрафт)`,
			});
		});

		return reply.send({
			bundleType: input.bundleType,
			...writeoffResult,
		});
	});

	/**
	 * 4. GET /api/surgery/materials/overdraft-status
	 * Проверка статуса мягкого овердрафта хирургических материалов.
	 * canProceed ВСЕГДА true — врач оперирует без искусственных блокировок.
	 */
	app.get("/api/surgery/materials/overdraft-status", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply);
		if (!orgId) return;

		const items = await db
			.select()
			.from(inventoryItems)
			.where(and(eq(inventoryItems.organizationId, orgId)));

		const overdraftItems = items
			.filter((i) => Number(i.currentQty ?? i.stockQuantity ?? 0) <= 0)
			.map((i) => i.name);

		const status = evaluateWarehouseOverdraft(
			CANONICAL_SURGICAL_OPERATION_NORMS[0]!.requiredMaterials,
			overdraftItems.length > 0,
		);

		return reply.send({
			success: true,
			overdraftStatus: status,
			overdraftItemsCount: overdraftItems.length,
			overdraftItemNames: overdraftItems.slice(0, 10),
			canProceed: true,
		});
	});
}
