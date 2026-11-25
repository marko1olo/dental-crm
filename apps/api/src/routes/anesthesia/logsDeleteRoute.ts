/**
 * @dental/api/routes/anesthesia/logsDeleteRoute.ts
 * Anesthesia Protocol Deletion & Annulment with Warehouse Storno and Estimate Rollback (Mandate 8b, <= 120 lines)
 */

import { rublesToKopecks } from "@dental/shared";
import { and, eq, ilike } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { withTenantCtx } from "../../db/rls.js";
import { anesthesiaLogs, inventoryItems, inventoryTransactions, treatmentItems } from "../../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { UUID_REGEX } from "./schemas.js";

interface DeleteAnesthesiaLogParams {
	logId: string;
}

export function registerLogsDeleteRoute(app: FastifyInstance): void {
	app.delete<{ Params: DeleteAnesthesiaLogParams }>("/api/anesthesia/logs/:logId", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.anesthesia.delete",
				role: staffRole,
				message: `Отказ в удалении протокола анестезии: ${evalAccess.reason}`,
			});
		}

		const { logId } = request.params;
		if (!logId || !UUID_REGEX.test(logId)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор записи анестезии (ожидается UUID).",
			});
		}

		const txResult = await withTenantCtx(orgId, async (tx) => {
			const [log] = await tx
				.select()
				.from(anesthesiaLogs)
				.where(and(eq(anesthesiaLogs.organizationId, orgId), eq(anesthesiaLogs.id, logId)))
				.for("update");

			if (!log) {
				return { found: false as const };
			}

			const carpulesCount = Number(log.carpulesAdministered || 0);
			if (carpulesCount > 0) {
				const drugName = log.drugBrandName || log.drug || "Ультракаин Д-С";
				const invItems = await tx
					.select()
					.from(inventoryItems)
					.where(and(eq(inventoryItems.organizationId, orgId), ilike(inventoryItems.name, `%${drugName}%`)))
					.limit(1);
				const inv = invItems[0];
				if (inv) {
					const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
					const newStock = Number((currentStock + carpulesCount).toFixed(4));
					await tx
						.update(inventoryItems)
						.set({ stockQuantity: String(newStock), currentQty: String(newStock), updatedAt: new Date() })
						.where(and(eq(inventoryItems.id, inv.id), eq(inventoryItems.organizationId, orgId)));

					const stornoUnitCostKopecks =
						inv.unitCostKopecks ??
						(inv.pricePerUnitKopecks != null
							? inv.pricePerUnitKopecks
							: BigInt(rublesToKopecks(Number(inv.unitCostRub ?? inv.pricePerUnit ?? 0))));

					await tx.insert(inventoryTransactions).values({
						organizationId: orgId,
						visitId: log.visitId ?? null,
						itemId: inv.id,
						inventoryItemId: inv.id,
						quantityChanged: String(carpulesCount),
						qty: String(carpulesCount),
						unitCostRub: inv.unitCostRub ?? "0",
						unitCostKopecks: stornoUnitCostKopecks,
						transactionType: "storno",
						isOverdraft: false,
						userId: identity.userId ?? log.doctorId ?? null,
						notes: `Сторно списания анестезии (${drugName}) при аннулировании протокола #${log.id.slice(0, 8)}`,
					});
				}
			}

			if (log.visitId) {
				await tx
					.delete(treatmentItems)
					.where(
						and(
							eq(treatmentItems.organizationId, orgId),
							eq(treatmentItems.patientId, log.patientId),
							eq(treatmentItems.visitId, log.visitId),
							ilike(treatmentItems.title, "%Анестезия%"),
						),
					);
			}

			await tx
				.delete(anesthesiaLogs)
				.where(and(eq(anesthesiaLogs.organizationId, orgId), eq(anesthesiaLogs.id, logId)));

			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId: log.patientId,
				action: "DELETE_ANESTHESIA_LOG",
				diagnosis: "Аннулирование записи анестезиологического протокола",
				metadata: { logId },
			});

			const responsePayload = JSON.parse(
				JSON.stringify(
					{ success: true, deletedId: logId, storno: { carpulesReturned: carpulesCount } },
					(_, v) => (typeof v === "bigint" ? v.toString() : v),
				),
			);
			return { found: true as const, responsePayload };
		});

		if (!txResult.found) {
			return reply.status(404).send({ message: "Запись анестезии не найдена" });
		}
		return reply.send(txResult.responsePayload);
	});
}
