import { and, eq } from "drizzle-orm";
import { db } from "../../../../db/client.js";
import { sterilizerEquipments } from "../../../../db/schema.js";

export async function executeEquipmentLifecycleAction(
	id: string,
	organizationId: string,
	body: {
		action: "put_in_maintenance" | "return_to_service" | "decommission" | "recommission" | "update_verification";
		notes?: string | null | undefined;
		decommissionReason?: string | null | undefined;
		decommissioningDate?: string | null | undefined;
	},
) {
	const today = new Date().toISOString().slice(0, 10);

	if (body.action === "put_in_maintenance") {
		const [updated] = await db
			.update(sterilizerEquipments)
			.set({
				status: "in_maintenance",
				lastMaintenanceDate: today,
				notes: body.notes !== undefined ? body.notes : undefined,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(sterilizerEquipments.id, id),
					eq(sterilizerEquipments.organizationId, organizationId),
				),
			)
			.returning();
		return updated || null;
	}

	if (body.action === "return_to_service") {
		const next6Months = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		const [updated] = await db
			.update(sterilizerEquipments)
			.set({
				status: "active",
				isCommissioned: true,
				lastMaintenanceDate: today,
				nextMaintenanceDate: next6Months,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(sterilizerEquipments.id, id),
					eq(sterilizerEquipments.organizationId, organizationId),
				),
			)
			.returning();
		return updated || null;
	}

	if (body.action === "decommission") {
		const [updated] = await db
			.update(sterilizerEquipments)
			.set({
				status: "decommissioned",
				isCommissioned: false,
				decommissioningDate: body.decommissioningDate || today,
				notes: body.notes || (body.decommissionReason ? `Списан: ${body.decommissionReason}` : undefined),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(sterilizerEquipments.id, id),
					eq(sterilizerEquipments.organizationId, organizationId),
				),
			)
			.returning();
		return updated || null;
	}

	if (body.action === "recommission") {
		const [updated] = await db
			.update(sterilizerEquipments)
			.set({
				status: "active",
				isCommissioned: true,
				decommissioningDate: null,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(sterilizerEquipments.id, id),
					eq(sterilizerEquipments.organizationId, organizationId),
				),
			)
			.returning();
		return updated || null;
	}

	return null;
}
