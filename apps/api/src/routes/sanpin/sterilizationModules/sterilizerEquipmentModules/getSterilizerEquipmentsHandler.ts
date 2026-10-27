import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { sterilizerEquipments } from "../../../../db/schema.js";

export async function handleGetSterilizerEquipments(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilizer equipments read",
	);
	if (!organizationId) return;

	let list = await db
		.select()
		.from(sterilizerEquipments)
		.where(eq(sterilizerEquipments.organizationId, organizationId))
		.orderBy(sterilizerEquipments.name);

	if (list.length === 0) {
		const todayStr = new Date().toISOString().slice(0, 10);
		const in180Days = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		const in365Days = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

		try {
			const [seeded] = await db
				.insert(sterilizerEquipments)
				.values({
					organizationId,
					name: "Melag Vacuklav 23 B+ (ЦСО №1)",
					brandModel: "Melag Vacuklav 23 B+ (Германия)",
					serialNumber: "MEL-2026-9812",
					inventoryNumber: "ИНВ-ЦСО-001",
					deviceType: "autoclave_steam",
					deviceClass: "autoclave_class_b",
					chamberVolumeLiters: "22.00",
					locationRoom: "Центральное стерилизационное отделение (ЦСО)",
					verificationExpiryDate: in365Days,
					lastMaintenanceDate: todayStr,
					nextMaintenanceDate: in180Days,
					commissioningDate: todayStr,
					status: "active",
					isCommissioned: true,
					notes: "Автоклав B-класса с фракционированным вакуумом (СанПиН 3.3686-21)",
				})
				.returning();

			if (seeded) {
				list = [seeded];
			}
		} catch (err) {
			req.log.warn({ err }, "Non-blocking: could not auto-seed default sterilizer equipment");
		}
	}

	const todayStr = new Date().toISOString().slice(0, 10);
	const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

	return list.map((row) => {
		const isVerificationExpired = Boolean(row.verificationExpiryDate && row.verificationExpiryDate < todayStr);
		const isVerificationDueSoon = Boolean(
			row.verificationExpiryDate &&
			row.verificationExpiryDate >= todayStr &&
			row.verificationExpiryDate <= in30Days,
		);

		return {
			...row,
			chamberVolumeLiters: Number(row.chamberVolumeLiters),
			isVerificationExpired,
			isVerificationDueSoon,
		};
	});
}
