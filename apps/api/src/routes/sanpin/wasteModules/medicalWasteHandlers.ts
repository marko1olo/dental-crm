/**
 * apps/api/src/routes/sanpin/wasteModules/medicalWasteHandlers.ts
 * Обработчики учета медицинских отходов классов А и Б.
 * Мандат 8b: строго <= 120 строк.
 */

import { createMedicalWasteLogDtoSchema } from "@dental/shared";
import { desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { medicalWasteLogs, users } from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";

export async function handleGetMedicalWaste(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"waste read",
	);
	if (!organizationId) return;

	const logs = await db
		.select({
			id: medicalWasteLogs.id,
			organizationId: medicalWasteLogs.organizationId,
			operationType: medicalWasteLogs.operationType,
			logDate: medicalWasteLogs.logDate,
			wasteClass: medicalWasteLogs.wasteClass,
			wasteDescription: medicalWasteLogs.wasteDescription,
			packageType: medicalWasteLogs.packageType,
			packageCount: medicalWasteLogs.packageCount,
			weightKg: medicalWasteLogs.weightKg,
			volumeLiters: medicalWasteLogs.volumeLiters,
			disinfectionMethod: medicalWasteLogs.disinfectionMethod,
			disinfectantUsed: medicalWasteLogs.disinfectantUsed,
			disposalCompany: medicalWasteLogs.disposalCompany,
			contractNumber: medicalWasteLogs.contractNumber,
			transferActNumber: medicalWasteLogs.transferActNumber,
			responsibleStaffId: medicalWasteLogs.responsibleStaffId,
			responsibleStaffName: users.fullName,
			notes: medicalWasteLogs.notes,
			createdAt: medicalWasteLogs.createdAt,
		})
		.from(medicalWasteLogs)
		.leftJoin(users, eq(users.id, medicalWasteLogs.responsibleStaffId))
		.where(eq(medicalWasteLogs.organizationId, organizationId))
		.orderBy(desc(medicalWasteLogs.logDate));

	return logs.map((l) => ({
		...l,
		weightKg: Number(l.weightKg),
		volumeLiters: l.volumeLiters ? Number(l.volumeLiters) : null,
	}));
}

export async function handlePostMedicalWaste(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"waste create",
	);
	if (!organizationId) return;

	const parsed = createMedicalWasteLogDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры учета отходов.",
		});
	}
	const data = parsed.data;

	const [log] = await db
		.insert(medicalWasteLogs)
		.values({
			organizationId,
			operationType: data.operationType,
			logDate: new Date(data.logDate),
			wasteClass: data.wasteClass,
			wasteDescription: data.wasteDescription,
			packageType: data.packageType,
			packageCount: data.packageCount,
			weightKg: String(data.weightKg),
			volumeLiters: data.volumeLiters ? String(data.volumeLiters) : null,
			disinfectionMethod: data.disinfectionMethod,
			disinfectantUsed: data.disinfectantUsed ?? null,
			disposalCompany: data.disposalCompany ?? null,
			contractNumber: data.contractNumber ?? null,
			transferActNumber: data.transferActNumber ?? null,
			responsibleStaffId: data.responsibleStaffId ?? null,
			notes: data.notes ?? null,
		})
		.returning();

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_WASTE_LOG_ADDED",
		payload: log,
	});

	return reply.code(201).send(log);
}

export async function handlePostMedicalWasteQuickShiftBundle(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"waste quick-shift create",
	);
	if (!organizationId) return;

	const now = new Date();
	const newLogs = await db
		.insert(medicalWasteLogs)
		.values([
			{
				organizationId,
				operationType: "accumulation",
				logDate: now,
				wasteClass: "class_A",
				wasteDescription: "Эпидемиологически безопасные отходы смены (упаковка стоматологических материалов, картон, бумага, чистые бахилы)",
				packageType: "white_bag",
				packageCount: 1,
				weightKg: "3.200",
				volumeLiters: "40.00",
				disinfectionMethod: "none_centralized",
				disinfectantUsed: null,
				responsibleStaffId: (req as any).user?.id ?? null,
				notes: "1-клик фиксация отходов смены Класса А (брутто 3.25 кг, тара 0.05 кг, нетто 3.20 кг)",
			},
			{
				organizationId,
				operationType: "accumulation",
				logDate: now,
				wasteClass: "class_B",
				wasteDescription: "Мягкие эпидемиологически опасные отходы смены (перчатки, маски, салфетки, валики, слюноотсосы)",
				packageType: "yellow_bag",
				packageCount: 1,
				weightKg: "2.500",
				volumeLiters: "30.00",
				disinfectionMethod: "chemical_soaking",
				disinfectantUsed: "Бриллиант Классик 2% (экспозиция 60 мин)",
				responsibleStaffId: (req as any).user?.id ?? null,
				notes: "1-клик фиксация отходов смены (брутто 2.55 кг, тара 0.05 кг, нетто 2.50 кг)",
			},
			{
				organizationId,
				operationType: "accumulation",
				logDate: now,
				wasteClass: "class_B",
				wasteDescription: "Острые эпидемиологически опасные отходы смены (пустые карпулы анестетиков, инъекционные иглы, скальпели)",
				packageType: "yellow_sharps_container",
				packageCount: 1,
				weightKg: "0.800",
				volumeLiters: "2.00",
				disinfectionMethod: "steam_autoclave",
				disinfectantUsed: "Аппаратное автоклавирование 134°C (5 мин, 2.15 бар)",
				responsibleStaffId: (req as any).user?.id ?? null,
				notes: "1-клик фиксация острых отходов смены в желтом непрокалываемом контейнере (брутто 0.95 кг, тара 0.15 кг, нетто 0.80 кг)",
			},
		])
		.returning();

	for (const log of newLogs) {
		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_WASTE_LOG_ADDED",
			payload: log,
		});
	}

	return reply.code(201).send({
		message: "Отходы смены (Класс А и Класс Б) успешно зафиксированы",
		records: newLogs,
	});
}
