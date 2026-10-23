/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/dailyAutoclaveTestHandlers.ts
 *
 * Ежедневный контроль автоклавов (Bowie-Dick, Вакуум-тест).
 * Мандат 8b: строго <= 120 строк.
 */

import { createAutoclaveDailyTestSchema } from "@dental/shared";
import { desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { autoclaveDailyTests, users } from "../../../../db/schema.js";

export async function handleGetDailyTests(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "read daily tests");
	if (!organizationId) return;

	return db
		.select({
			id: autoclaveDailyTests.id,
			organizationId: autoclaveDailyTests.organizationId,
			autoclaveId: autoclaveDailyTests.autoclaveId,
			testType: autoclaveDailyTests.testType,
			cycleTemperatureCelsius: autoclaveDailyTests.cycleTemperatureCelsius,
			cyclePressureBar: autoclaveDailyTests.cyclePressureBar,
			vacuumLeakRateMbarPerMin: autoclaveDailyTests.vacuumLeakRateMbarPerMin,
			colorChangeVerified: autoclaveDailyTests.colorChangeVerified,
			testResult: autoclaveDailyTests.testResult,
			operatorId: autoclaveDailyTests.operatorId,
			operatorName: users.fullName,
			notes: autoclaveDailyTests.notes,
			timestamp: autoclaveDailyTests.timestamp,
			createdAt: autoclaveDailyTests.createdAt,
		})
		.from(autoclaveDailyTests)
		.leftJoin(users, eq(users.id, autoclaveDailyTests.operatorId))
		.where(eq(autoclaveDailyTests.organizationId, organizationId))
		.orderBy(desc(autoclaveDailyTests.timestamp));
}

export async function handleCreateDailyTest(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sterilization daily test");
	if (!organizationId) return;

	const parsed = createAutoclaveDailyTestSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры ежедневного теста автоклава.",
			details: parsed.error.format(),
		});
	}
	const data = parsed.data;
	const testResult = data.colorChangeVerified ? "passed" : "failed";

	const [log] = await db
		.insert(autoclaveDailyTests)
		.values({
			organizationId,
			autoclaveId: data.autoclaveId,
			testType: data.testType,
			cycleTemperatureCelsius: String(data.cycleTemperatureCelsius),
			cyclePressureBar: String(data.cyclePressureBar),
			vacuumLeakRateMbarPerMin: data.vacuumLeakRateMbarPerMin ? String(data.vacuumLeakRateMbarPerMin) : null,
			colorChangeVerified: data.colorChangeVerified,
			testResult,
			operatorId: data.operatorId ?? null,
			notes: data.notes ?? null,
			timestamp: new Date(),
		})
		.returning();

	return reply.code(201).send({ success: true, test: log });
}
