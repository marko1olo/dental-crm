/**
 * @dental/api/routes/anesthesia/logsCreateRoute.ts
 * Create Anesthesia Protocol with Stock Overdraft & Estimate Sync (Mandate 8b, <= 120 lines)
 */

import { calculateAnestheticSafety } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { anesthesiaLogs, patients, serviceCatalogItems, treatmentItems, users, visits } from "../../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { TreatmentConsumablesService } from "../../services/treatmentConsumablesService.js";
import { createAnesthesiaLogBodySchema } from "./schemas.js";

export function registerLogsCreateRoute(app: FastifyInstance): void {
	app.post("/api/anesthesia/patients/:patientId/logs", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? (request as unknown as { user?: { role?: string | null } }).user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({ error: "PermissionDenied", permission: "clinical.anesthesia.write", role: staffRole, message: `Отказ в создании протокола: ${evalAccess.reason}` });
		}

		const { patientId } = request.params as { patientId: string };
		const parsed = createAnesthesiaLogBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ message: "Некорректные параметры протокола анестезии", errors: parsed.error.format() });
		}
		const data = parsed.data;

		return withTenantCtx(orgId, async () => {
			const [patient] = await db.select({ id: patients.id }).from(patients).where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId))).limit(1);
			if (!patient) return reply.status(404).send({ message: "Пациент не найден" });

			if (data.visitId) {
				const [visit] = await db.select({ id: visits.id, patientId: visits.patientId }).from(visits).where(and(eq(visits.organizationId, orgId), eq(visits.id, data.visitId))).limit(1);
				if (!visit) return reply.status(404).send({ message: "Приём не найден в текущей клинике" });
				if (visit.patientId !== patientId) return reply.status(400).send({ message: "Приём принадлежит другому пациенту" });
			}

			if (data.doctorId) {
				const [doctor] = await db.select({ id: users.id }).from(users).where(and(eq(users.organizationId, orgId), eq(users.id, data.doctorId))).limit(1);
				if (!doctor) return reply.status(404).send({ message: "Врач не найден в текущей клинике" });
			}

			const safety = calculateAnestheticSafety({ drug: data.drug, concentrationPct: data.concentrationPct, vasoconstrictor: data.vasoconstrictor, carpuleVolumeMl: data.carpuleVolumeMl, carpulesAdministered: data.carpulesAdministered, patientWeightKg: data.patientWeightKg, patientAgeYears: data.patientAgeYears, asaClass: data.asaClass, hasCardiovascularDisease: data.hasCardiovascularDisease });

			const [record] = await db.insert(anesthesiaLogs).values({
				organizationId: orgId, patientId, visitId: data.visitId || null, doctorId: data.doctorId || null, technique: data.technique, drug: data.drug, drugBrandName: data.drugBrandName, concentrationPct: String(data.concentrationPct), vasoconstrictor: data.vasoconstrictor, carpuleVolumeMl: String(data.carpuleVolumeMl), carpulesAdministered: String(data.carpulesAdministered), totalDoseMg: String(safety.totalAnestheticMg), maxAllowedDoseMg: String(safety.maxRecommendedAnestheticMg), epinephrineMg: String(safety.totalEpinephrineMg), maxEpinephrineMg: String(safety.maxRecommendedEpinephrineMg), aspirationTestPositive: data.aspirationTestPositive, toothNumbers: data.toothNumbers, injectionSite: data.injectionSite || null, lotNumber: data.lotNumber || null, expirationDate: data.expirationDate || null, vitalsPre: data.vitalsPre || null, vitalsIntra: data.vitalsIntra || null, vitalsPost: data.vitalsPost || null, notes: data.notes || null, complications: data.complications || null,
			}).returning();

			let inventoryDeduction: any = null;
			if (data.autoDeductInventory && data.carpulesAdministered > 0) {
				try {
					inventoryDeduction = await TreatmentConsumablesService.quickWriteoffCarpules(db, { organizationId: orgId, carpulesCount: data.carpulesAdministered, drugName: data.drugBrandName, userId: data.doctorId || null, visitId: data.visitId || null, notes: `Списание карпул (${data.drugBrandName}) через протокол анестезии` });
				} catch (invErr) { request.log.warn({ err: invErr }, "Auto-deduction warning"); }
			}

			let treatmentItemResult: any = null;
			if (data.visitId && data.addToVisitEstimate) {
				try {
					const allServices = await db.select().from(serviceCatalogItems).where(and(eq(serviceCatalogItems.organizationId, orgId), eq(serviceCatalogItems.isActive, true))).limit(50);
					const anesthesiaService = allServices.find((s) => s.order804nCode === "A16.07.030" || s.code === "A16.07.030" || s.title.toLowerCase().includes("анестези")) ?? null;
					const unitPrice = anesthesiaService ? Number(anesthesiaService.priceRub || anesthesiaService.basePriceRub) : 950;
					const techTitle = data.technique === "mandibular_block" || data.technique === "tuberal_block" ? "проводниковая" : "инфильтрационная";
					const [tItem] = await db.insert(treatmentItems).values({ organizationId: orgId, patientId, visitId: data.visitId, serviceId: anesthesiaService?.id ?? null, toothCode: data.toothNumbers.length > 0 ? data.toothNumbers.join(", ") : null, title: `Анестезия ${techTitle} (${data.drugBrandName} 1.7 мл)`, quantity: String(data.carpulesAdministered), unitPriceRub: unitPrice, priceRub: unitPrice * data.carpulesAdministered, discountRub: 0, status: "completed", plannedDoctorUserId: data.doctorId || null }).returning();
					treatmentItemResult = tItem ?? null;
				} catch (tErr) { request.log.warn({ err: tErr }, "Estimate addition warning"); }
			}

			return reply.status(201).send({ success: true, id: record?.id || "anesthesia-logged", safety, log: record, inventoryDeduction, treatmentItem: treatmentItemResult });
		});
	});
}
