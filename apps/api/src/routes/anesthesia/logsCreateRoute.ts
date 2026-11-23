/**
 * @dental/api/routes/anesthesia/logsCreateRoute.ts
 * Create Anesthesia Protocol with Stock Overdraft & Estimate Sync (Mandate 8b, <= 120 lines)
 */

import {
	calculateAnestheticSafety,
	kopecksToRub,
	multiplyKopecks,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { anesthesiaLogs, patients, serviceCatalogItems, treatmentItems, users, visits } from "../../db/schema.js";
import {
	extractIdempotencyKey,
	isValidUuid,
} from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { TreatmentConsumablesService } from "../../services/treatmentConsumablesService.js";
import { calculateSafetyBodySchema, createAnesthesiaLogBodySchema, UUID_REGEX } from "./schemas.js";

type QuickCarpuleDeductionResult = Awaited<ReturnType<typeof TreatmentConsumablesService.quickWriteoffCarpules>>;
type TreatmentItemRecord = typeof treatmentItems.$inferSelect;

export function registerLogsCreateRoute(app: FastifyInstance): void {
	app.post("/api/anesthesia/calculate-safety", async (request, reply) => {
		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({ error: "PermissionDenied", permission: "clinical.anesthesia.write", role: staffRole, message: `Отказ в доступе к калькулятору анестезии: ${evalAccess.reason}` });
		}
		const parsed = calculateSafetyBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ message: "Некорректные параметры расчета безопасности анестетика", errors: parsed.error.format() });
		}
		const calculation = calculateAnestheticSafety(parsed.data);
		return reply.status(200).send({ success: true, calculation });
	});
	const createLogHandler = async (request: FastifyRequest<{ Params?: { patientId?: string } }>, reply: FastifyReply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({ error: "PermissionDenied", permission: "clinical.anesthesia.write", role: staffRole, message: `Отказ в создании протокола: ${evalAccess.reason}` });
		}

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID.",
			});
		}

		const parsed = createAnesthesiaLogBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ message: "Некорректные параметры протокола анестезии", errors: parsed.error.format() });
		}
		const data = parsed.data;
		const reqPatientId = request.params?.patientId || data.patientId;
		if (reqPatientId && !UUID_REGEX.test(reqPatientId)) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID).",
			});
		}

		return withTenantCtx(orgId, async (tx) => {
			const patientId = reqPatientId;
			if (!patientId) {
				return reply.status(400).send({
					error: "PatientRequired",
					message: "Идентификатор пациента обязателен для создания протокола анестезии.",
				});
			}

			const [patient] = await tx.select({ id: patients.id }).from(patients).where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId))).limit(1);
			if (!patient) return reply.status(404).send({ message: "Пациент не найден" });

			if (data.visitId) {
				const [visit] = await tx.select({ id: visits.id, patientId: visits.patientId }).from(visits).where(and(eq(visits.organizationId, orgId), eq(visits.id, data.visitId))).limit(1);
				if (!visit) return reply.status(404).send({ message: "Приём не найден в текущей клинике" });
				if (visit.patientId !== patientId) return reply.status(400).send({ message: "Приём принадлежит другому пациенту" });
			}

			if (data.doctorId) {
				const [doctor] = await tx.select({ id: users.id }).from(users).where(and(eq(users.organizationId, orgId), eq(users.id, data.doctorId))).limit(1);
				if (!doctor) return reply.status(404).send({ message: "Врач не найден в текущей клинике" });
			}

			const safety = calculateAnestheticSafety({ drug: data.drug, concentrationPct: data.concentrationPct, vasoconstrictor: data.vasoconstrictor, carpuleVolumeMl: data.carpuleVolumeMl, carpulesAdministered: data.carpulesAdministered, patientWeightKg: data.patientWeightKg, patientAgeYears: data.patientAgeYears, asaClass: data.asaClass, hasCardiovascularDisease: data.hasCardiovascularDisease });

			const [record] = await tx.insert(anesthesiaLogs).values({
				organizationId: orgId, patientId, visitId: data.visitId || null, doctorId: data.doctorId || null, technique: data.technique, drug: data.drug, drugBrandName: data.drugBrandName, concentrationPct: String(data.concentrationPct), vasoconstrictor: data.vasoconstrictor, carpuleVolumeMl: String(data.carpuleVolumeMl), carpulesAdministered: String(data.carpulesAdministered), totalDoseMg: String(safety.totalAnestheticMg), maxAllowedDoseMg: String(safety.maxRecommendedAnestheticMg), epinephrineMg: String(safety.totalEpinephrineMg), maxEpinephrineMg: String(safety.maxRecommendedEpinephrineMg), aspirationTestPositive: data.aspirationTestPositive, toothNumbers: data.toothNumbers, injectionSite: data.injectionSite || null, lotNumber: data.lotNumber || null, expirationDate: data.expirationDate || null, vitalsPre: data.vitalsPre || null, vitalsIntra: data.vitalsIntra || null, vitalsPost: data.vitalsPost || null, notes: data.notes || null, complications: data.complications || null,
			}).returning();

			let inventoryDeduction: QuickCarpuleDeductionResult | null = null;
			if (data.autoDeductInventory && data.carpulesAdministered > 0) {
				try {
					inventoryDeduction = await TreatmentConsumablesService.quickWriteoffCarpules(tx, { organizationId: orgId, carpulesCount: data.carpulesAdministered, drugName: data.drugBrandName, userId: data.doctorId || null, visitId: data.visitId || null, notes: `Списание карпул (${data.drugBrandName}) через протокол анестезии` });
				} catch (invErr: unknown) { request.log.warn({ err: invErr }, "Auto-deduction warning"); }
			}

			let treatmentItemResult: TreatmentItemRecord | null = null;
			if (data.visitId && data.addToVisitEstimate) {
				try {
					const allServices = await tx.select().from(serviceCatalogItems).where(and(eq(serviceCatalogItems.organizationId, orgId), eq(serviceCatalogItems.isActive, true))).limit(50);
					const anesthesiaService = allServices.find((s) => s.order804nCode === "A16.07.030" || s.code === "A16.07.030" || s.title.toLowerCase().includes("анестези")) ?? null;
					let unitPriceKop = 0;
					if (anesthesiaService) {
						if (typeof anesthesiaService.priceKopecks === "bigint" && anesthesiaService.priceKopecks > 0n) {
							unitPriceKop = Number(anesthesiaService.priceKopecks);
						} else if (typeof anesthesiaService.basePriceKopecks === "bigint" && anesthesiaService.basePriceKopecks > 0n) {
							unitPriceKop = Number(anesthesiaService.basePriceKopecks);
						} else {
							unitPriceKop = rublesToKopecks(Number(anesthesiaService.priceRub || anesthesiaService.basePriceRub || 0));
						}
					}
					const totalKop = multiplyKopecks(unitPriceKop, data.carpulesAdministered);
					const unitPriceRub = kopecksToRub(unitPriceKop);
					const totalRub = kopecksToRub(totalKop);
					const techTitle = data.technique === "mandibular_block" || data.technique === "tuberal_block" ? "проводниковая" : "инфильтрационная";
					const [tItem] = await tx.insert(treatmentItems).values({
						organizationId: orgId,
						patientId,
						visitId: data.visitId,
						serviceId: anesthesiaService?.id ?? null,
						toothCode: data.toothNumbers.length > 0 ? data.toothNumbers.join(", ") : null,
						title: `Анестезия ${techTitle} (${data.drugBrandName} 1.7 мл)`,
						quantity: String(data.carpulesAdministered),
						unitPriceRub,
						priceRub: totalRub,
						unitPriceKopecks: BigInt(unitPriceKop),
						priceKopecks: BigInt(totalKop),
						discountRub: 0,
						discountKopecks: 0n,
						status: "completed",
						plannedDoctorUserId: data.doctorId || null,
					}).returning();
					treatmentItemResult = tItem ?? null;
				} catch (tErr: unknown) { request.log.warn({ err: tErr }, "Estimate addition warning"); }
			}

			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			const responsePayload = JSON.parse(
				JSON.stringify(
					{ success: true, id: record?.id || "anesthesia-logged", safety, log: record, inventoryDeduction, treatmentItem: treatmentItemResult },
					(_, v) => (typeof v === "bigint" ? v.toString() : v),
				),
			);
			return reply.status(201).send(responsePayload);
		});
	};

	app.post("/api/anesthesia/patients/:patientId/logs", createLogHandler);
	app.post("/api/anesthesia/logs", createLogHandler);
}
