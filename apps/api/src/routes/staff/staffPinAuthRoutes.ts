import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { verifyCredential } from "../../utils/cryptoHelper.js";
import { resolveOrganizationId } from "./staffHelpers.js";
import { verifyStaffPinBodySchema } from "./staffSchemas.js";

export async function registerStaffPinAuthRoutes(app: FastifyInstance) {
	/**
	 * POST /api/staff/pin-verify — Быстрая проверка ПИН-кода врача/ассистента для кресла/терминала
	 */
	app.post("/api/staff/pin-verify", async (request, reply) => {
		const auth = await resolveOrganizationId(request, reply);
		if (!auth) return;

		const parsed = verifyStaffPinBodySchema.safeParse(request.body);
		if (!parsed.success) {
			reply.code(400);
			return {
				error: "ValidationError",
				message: "Некорректные параметры проверки ПИН-кода сотрудника.",
			};
		}

		const [user] = await db
			.select({
				id: schema.users.id,
				fullName: schema.users.fullName,
				role: schema.users.role,
				pinCodeHash: schema.users.pinCodeHash,
			})
			.from(schema.users)
			.where(
				and(
					eq(schema.users.id, parsed.data.staffId),
					eq(schema.users.organizationId, auth.orgId),
				),
			)
			.limit(1);

		if (!user) {
			reply.code(404);
			return {
				error: "StaffNotFound",
				message: "Сотрудник не найден в этой клинике.",
			};
		}

		if (!user.pinCodeHash) {
			reply.code(400);
			return {
				error: "PinNotConfigured",
				message: "Для данного сотрудника ПИН-код ещё не установлен.",
			};
		}

		const isMatched = await verifyCredential(parsed.data.pinCode, user.pinCodeHash);
		if (!isMatched) {
			reply.code(401);
			return {
				error: "InvalidPin",
				message: "Неверный ПИН-код сотрудника.",
			};
		}

		return {
			ok: true,
			verified: true,
			staffId: user.id,
			fullName: user.fullName,
			role: user.role,
		};
	});
}
