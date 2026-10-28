import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { labOrderEvents, labOrders } from "../../../db/schema.js";

export interface LabOrderMarkInstalledInput {
	readonly clinicalNotes?: string;
	readonly doctorId?: string;
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

		return { kind: "ok" as const, labOrder: updated! };
	});
}
