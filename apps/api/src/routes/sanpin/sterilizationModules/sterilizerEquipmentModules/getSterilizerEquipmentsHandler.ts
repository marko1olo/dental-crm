import { resolveValidIanaTimeZone, shiftCalendarDay, todayDateKeyInTimeZone } from "@dental/shared";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../../../db/rls.js";
import { sterilizerEquipments } from "../../../../db/schema.js";
import { clinicTimeZone } from "../../../../services/reports/managerReports/timezone.js";

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

	const initialLoad = await withTenantReadCtx(organizationId, async (tx) => {
		const [rows, rawClinicTz] = await Promise.all([
			tx
				.select()
				.from(sterilizerEquipments)
				.where(eq(sterilizerEquipments.organizationId, organizationId))
				.orderBy(sterilizerEquipments.name),
			clinicTimeZone(organizationId, tx),
		]);
		return {
			rows,
			clinicTimeZone: resolveValidIanaTimeZone(rawClinicTz),
		};
	});
	let list = initialLoad.rows;
	const todayStr = todayDateKeyInTimeZone(initialLoad.clinicTimeZone);

	if (list.length === 0) {
		const in180Days = shiftCalendarDay(todayStr, 180);
		const in365Days = shiftCalendarDay(todayStr, 365);

		try {
			const [seeded] = await withTenantWriteCtx(organizationId, async (tx) => {
				return tx
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
			});

			if (seeded) {
				list = [seeded];
			}
		} catch (err) {
			req.log.warn({ err }, "Non-blocking: could not auto-seed default sterilizer equipment");
		}
	}

	const in30Days = shiftCalendarDay(todayStr, 30);

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
