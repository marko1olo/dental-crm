import { createHash } from "node:crypto";
import { generateUuidV7 } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { idempotencyKeys, labItems, labOrderEvents, labOrders, warrantyCertificates } from "../../../db/schema.js";
import { quickWriteoffOrthopedicProtocol } from "../../../services/treatmentConsumables/bundleWriteoffService.js";

export interface LabOrderMarkInstalledInput {
	readonly clinicalNotes?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly idempotencyKey?: string | undefined;
}

export type LabOrderMarkInstalledResult =
	| { readonly kind: "order_not_found" }
	| { readonly kind: "already_locked" }
	| { readonly kind: "ok"; readonly labOrder: typeof labOrders.$inferSelect };

export async function executeLabOrderMarkInstalled(
	orgId: string,
	orderId: string,
	input: LabOrderMarkInstalledInput,
): Promise<LabOrderMarkInstalledResult> {
	return withTenantCtx(orgId, async (tx) => {
		const [order] = await tx
			.select()
			.from(labOrders)
			.where(and(eq(labOrders.id, orderId), eq(labOrders.organizationId, orgId)))
			.for("update")
			.limit(1);

		if (!order) return { kind: "order_not_found" as const };
		if (order.isLockedInstalled) return { kind: "already_locked" as const };

		const now = new Date();
		const dateStr = now.toLocaleDateString("ru-RU");
		const noteSuffix = input.clinicalNotes ? ` ${input.clinicalNotes}` : "";
		const appendNote = `[${dateStr} INSTALLED]: Конструкция припасована и зафиксирована в полости рта.${noteSuffix}`;
		const finalNotes = order.clinicalNotes ? `${order.clinicalNotes}\n${appendNote}` : appendNote;

		const [updated] = await tx
			.update(labOrders)
			.set({
				status: "completed",
				isLockedInstalled: true,
				installedAt: now,
				completedAt: order.completedAt ?? now,
				clinicalNotes: finalNotes,
				updatedAt: now,
			})
			.where(and(eq(labOrders.id, order.id), eq(labOrders.organizationId, orgId)))
			.returning();

		await tx.insert(labOrderEvents).values({
			organizationId: orgId,
			labOrderId: order.id,
			milestone: "installed",
			actorType: "clinic_doctor",
			actorName: "Врач-ортопед",
			notes: "Ортопедическая конструкция успешно установлена и сдана пациенту. Наряд намертво заблокирован от редактирования.",
		});

		// Сшивание контура гарантийных паспортов (СтАР / Закон РФ № 2300-1)
		if (order.patientId) {
			const items = await tx
				.select()
				.from(labItems)
				.where(and(eq(labItems.labOrderId, order.id), eq(labItems.organizationId, orgId)));

			const baseDate = order.completedAt ?? now;
			const baseYear = baseDate ? new Date(baseDate).getFullYear() : new Date().getFullYear();
			const formattedOrderNum = order.orderNumber && (order.orderNumber.startsWith("ЗТЛ-") || order.orderNumber.startsWith("ЛО-"))
				? order.orderNumber
				: (order.orderNumber ? `ЛО-${baseYear}-${order.orderNumber}` : `ЗТЛ-${baseYear}-${order.id.slice(0, 6).toUpperCase()}`);
			const batchCode = `LOT-${baseYear}-${order.id.slice(0, 8).toUpperCase()}`;
			const orgShortHash = orgId.replace(/-/g, "").slice(0, 6).toUpperCase();
			const certificateNumber = `WP-${orgShortHash}-${formattedOrderNum}`;

			const restorationType = items[0]?.restorationType || "Анатомическая коронка / мостовидный протез";
			const frameworkMaterial = order.material || "Конструкционный стоматологический материал";
			const shade = order.colorVita || "По прейскуранту";

			const itemsPayload = items.length > 0
				? items.map((it) => {
						const toothVal = it.toothFdi ? String(it.toothFdi) : (order.toothFdi || "—");
						const matVal = it.material || frameworkMaterial;
						const shadeVal = it.shadeFinal || shade;
						const workType = it.restorationType || restorationType;
						return {
							id: it.id || generateUuidV7(),
							name: workType,
							clinicalWorkTitle: workType,
							category: "orthopedics",
							tooth: toothVal,
							toothNumber: toothVal,
							material: matVal,
							materialName: matVal,
							color: shadeVal,
							shade: shadeVal,
							vitaShade: shadeVal,
							shadeStump: it.shadeStump || null,
							lot: batchCode,
							lotNumber: batchCode,
							batchCode: batchCode,
							restorationType: workType,
							laboratoryName: order.laboratoryName || "Цифровая зуботехническая лаборатория CAD/CAM",
							cementationProtocol: "Адгезивный протокол двойного отверждения (композитный цемент)",
							warrantyMonths: 24,
							serviceLifeMonths: 60,
						};
					})
				: [
						{
							id: generateUuidV7(),
							name: restorationType,
							clinicalWorkTitle: restorationType,
							category: "orthopedics",
							tooth: order.toothFdi || "—",
							toothNumber: order.toothFdi || "—",
							material: frameworkMaterial,
							materialName: frameworkMaterial,
							color: shade,
							shade: shade,
							vitaShade: shade,
							shadeStump: null,
							lot: batchCode,
							lotNumber: batchCode,
							batchCode: batchCode,
							restorationType,
							laboratoryName: order.laboratoryName || "Цифровая зуботехническая лаборатория CAD/CAM",
							cementationProtocol: "Адгезивный протокол двойного отверждения (композитный цемент)",
							warrantyMonths: 24,
							serviceLifeMonths: 60,
						},
					];

			const expirationDate = new Date(now.getTime());
			expirationDate.setFullYear(expirationDate.getFullYear() + 2);
			const nextRecallDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

			const hashPayload = JSON.stringify({
				organizationId: orgId,
				patientId: order.patientId,
				certificateNumber,
				items: itemsPayload,
				issuedAt: now.toISOString().slice(0, 10),
				expiresAt: expirationDate.toISOString().slice(0, 10),
				batchCode,
			});
			const integritySha256 = createHash("sha256").update(hashPayload).digest("hex");

			await tx
				.insert(warrantyCertificates)
				.values({
					organizationId: orgId,
					patientId: order.patientId,
					visitId: order.appointmentId || null,
					certificateNumber,
					status: "active",
					itemsJson: itemsPayload,
					warrantyMonths: 24,
					serviceLifeMonths: 60,
					issuedAt: now,
					expiresAt: expirationDate,
					nextRecallDate,
					integritySha256,
					notes: `Гарантийный паспорт ортопедической конструкции ${certificateNumber}. Наряд ЗТЛ: ${order.id}. Зафиксирован в полости рта.`,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: warrantyCertificates.certificateNumber,
					set: {
						status: "active",
						itemsJson: itemsPayload,
						warrantyMonths: 24,
						serviceLifeMonths: 60,
						expiresAt: expirationDate,
						nextRecallDate,
						integritySha256,
						notes: `Гарантийный паспорт ортопедической конструкции ${certificateNumber}. Наряд ЗТЛ: ${order.id}. Зафиксирован в полости рта.`,
						updatedAt: now,
					},
				});
		}

		if (!updated) {
			throw new Error("Не удалось зафиксировать установку ортопедической конструкции");
		}

		// Фоновое атомарное списание цементов постоянной фиксации по техкарте (Мандат 8v & 8bo)
		try {
			await quickWriteoffOrthopedicProtocol(tx, {
				organizationId: orgId,
				protocolId: "orthopedics_cementation",
				userId: input.doctorId || order.doctorId,
				visitId: order.appointmentId,
				toothNumber: order.toothFdi,
				notes: `Списание цементов постоянной фиксации для наряда ЗТЛ ${order.orderNumber || order.id}`,
			});
		} catch {
			// Мягкий овердрафт: не блокирует клиническую фиксацию конструкции у кресла (Мандат 8v)
		}

		// Атомарная фиксация ключа идемпотентности внутри транзакции
		if (input.idempotencyKey) {
			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: input.idempotencyKey,
					status: "completed",
					responseCode: 200,
					responseBody: { labOrderId: order.id, status: "completed" },
				})
				.onConflictDoNothing();
		}

		return { kind: "ok" as const, labOrder: updated };
	});
}
