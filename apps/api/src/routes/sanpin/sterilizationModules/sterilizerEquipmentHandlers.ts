import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { sterilizerEquipments } from "../../../db/schema.js";
import {
	createSterilizerEquipmentDtoSchema,
	updateSterilizerEquipmentDtoSchema,
} from "./sterilizationSchemas.js";

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

export async function handleCreateSterilizerEquipment(
	req: FastifyRequest,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilizer equipment create",
	);
	if (!organizationId) return;

	const parsed = createSterilizerEquipmentDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры аппарата.",
		});
	}
	const data = parsed.data;

	const [created] = await db
		.insert(sterilizerEquipments)
		.values({
			organizationId,
			name: data.name,
			brandModel: data.brandModel,
			serialNumber: data.serialNumber,
			inventoryNumber: data.inventoryNumber ?? null,
			deviceType: data.deviceType,
			deviceClass: data.deviceClass,
			chamberVolumeLiters: String(data.chamberVolumeLiters),
			locationRoom: data.locationRoom,
			verificationExpiryDate: data.verificationExpiryDate ?? null,
			lastMaintenanceDate: data.lastMaintenanceDate ?? null,
			nextMaintenanceDate: data.nextMaintenanceDate ?? null,
			commissioningDate: data.commissioningDate ?? new Date().toISOString().slice(0, 10),
			status: data.status ?? "active",
			isCommissioned: data.status !== "decommissioned",
			notes: data.notes ?? null,
		})
		.returning();

	if (!created) {
		return reply.code(500).send({
			error: "InternalError",
			message: "Не удалось сохранить оборудование стерилизации.",
		});
	}

	return reply.code(201).send({
		...created,
		chamberVolumeLiters: Number(created.chamberVolumeLiters),
	});
}

export async function handleUpdateSterilizerEquipment(
	req: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilizer equipment update",
	);
	if (!organizationId) return;

	const { id } = req.params;
	const parsed = updateSterilizerEquipmentDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры обновления.",
		});
	}
	const body = parsed.data;
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

		if (!updated) {
			return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
		}
		return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
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

		if (!updated) {
			return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
		}
		return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
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

		if (!updated) {
			return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
		}
		return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
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

		if (!updated) {
			return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
		}
		return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
	}

	const [updated] = await db
		.update(sterilizerEquipments)
		.set({
			...(body.name ? { name: body.name } : {}),
			...(body.brandModel ? { brandModel: body.brandModel } : {}),
			...(body.serialNumber ? { serialNumber: body.serialNumber } : {}),
			...(body.inventoryNumber !== undefined ? { inventoryNumber: body.inventoryNumber } : {}),
			...(body.deviceType ? { deviceType: body.deviceType } : {}),
			...(body.deviceClass ? { deviceClass: body.deviceClass } : {}),
			...(body.chamberVolumeLiters ? { chamberVolumeLiters: String(body.chamberVolumeLiters) } : {}),
			...(body.locationRoom ? { locationRoom: body.locationRoom } : {}),
			...(body.verificationExpiryDate !== undefined ? { verificationExpiryDate: body.verificationExpiryDate } : {}),
			...(body.lastMaintenanceDate !== undefined ? { lastMaintenanceDate: body.lastMaintenanceDate } : {}),
			...(body.nextMaintenanceDate !== undefined ? { nextMaintenanceDate: body.nextMaintenanceDate } : {}),
			...(body.commissioningDate !== undefined ? { commissioningDate: body.commissioningDate } : {}),
			...(body.status ? { status: body.status, isCommissioned: body.status !== "decommissioned" } : {}),
			...(body.notes !== undefined ? { notes: body.notes } : {}),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(sterilizerEquipments.id, id),
				eq(sterilizerEquipments.organizationId, organizationId),
			),
		)
		.returning();

	if (!updated) {
		return reply.code(404).send({ error: "NotFound", message: "Аппарат не найден" });
	}

	return { ...updated, chamberVolumeLiters: Number(updated.chamberVolumeLiters) };
}

export async function handleDeleteSterilizerEquipment(
	req: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sterilizer equipment delete",
	);
	if (!organizationId) return;

	const { id } = req.params;
	await db
		.delete(sterilizerEquipments)
		.where(
			and(
				eq(sterilizerEquipments.id, id),
				eq(sterilizerEquipments.organizationId, organizationId),
			),
		);

	return { success: true };
}
