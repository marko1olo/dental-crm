import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { users, yandexCalendarSyncs } from "../db/schema.js";
import { requireStaffIdentity } from "../security/identity.js";

const SettingsSchema = z.object({
	yandexCalendarId: z.string().nullable(),
	yandexCalendarToken: z.any().nullable(),
});

export async function registerYandexCalendarRoutes(app: FastifyInstance) {
	app.get("/api/integrations/yandex-calendar/auth", async (request, reply) => {
		try {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.organizationId) return;

			return {
				authUrl:
					"https://oauth.yandex.ru/authorize?response_type=code&client_id=dente_crm",
				connected: false,
			};
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Internal server error",
			});
		}
	});

	app.post(
		"/api/integrations/yandex-calendar/settings",
		async (request, reply) => {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.userId) return;
			const staffId = identity.userId;

			try {
				const body = SettingsSchema.parse(request.body);
				await db
					.update(users)
					.set({
						yandexCalendarId: body.yandexCalendarId,
						yandexCalendarToken: body.yandexCalendarToken,
					})
					.where(eq(users.id, staffId));

				return { success: true };
			} catch (err: any) {
				request.log.error(err, "Failed to update Yandex Calendar settings");
				return reply.code(400).send({ error: "Invalid payload" });
			}
		},
	);

	app.get("/api/integrations/yandex-calendar-syncs", async (request, reply) => {
		try {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.organizationId) return;

			const syncs = await db
				.select({
					id: yandexCalendarSyncs.id,
					organizationId: yandexCalendarSyncs.organizationId,
					doctorName: users.fullName,
					yandexCalendarId: yandexCalendarSyncs.yandexCalendarId,
					syncStatus: yandexCalendarSyncs.syncStatus,
					lastSyncedAt: yandexCalendarSyncs.lastSyncAt,
				})
				.from(yandexCalendarSyncs)
				.innerJoin(users, eq(yandexCalendarSyncs.doctorId, users.id))
				.where(eq(yandexCalendarSyncs.organizationId, identity.organizationId));

			return syncs;
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Internal server error",
			});
		}
	});

	app.post("/api/integrations/yandex-calendar/sync", async (request, reply) => {
		try {
			const identity = await requireStaffIdentity(request, reply);
			if (!identity?.userId || !identity?.organizationId) return;
			const staffId = identity.userId;
			const orgId = identity.organizationId;

			const staffInfo = await db
				.select({
					yandexCalendarId: users.yandexCalendarId,
					yandexCalendarToken: users.yandexCalendarToken,
				})
				.from(users)
				.where(eq(users.id, staffId))
				.then((r) => r[0]);

			if (!staffInfo?.yandexCalendarId || !staffInfo?.yandexCalendarToken) {
				return reply.code(400).send({ error: "Yandex Calendar not connected" });
			}

			request.log.info(
				{ staffId },
				"Starting Yandex Calendar sync for staffId",
			);

			const existingSync = await db
				.select({ id: yandexCalendarSyncs.id })
				.from(yandexCalendarSyncs)
				.where(
					and(
						eq(yandexCalendarSyncs.organizationId, orgId),
						eq(yandexCalendarSyncs.doctorId, staffId),
					),
				)
				.then((r) => r[0]);

			if (existingSync) {
				await db
					.update(yandexCalendarSyncs)
					.set({
						yandexCalendarId: staffInfo.yandexCalendarId,
						syncStatus: "synced",
						lastSyncAt: new Date(),
						errorMessage: null,
					})
					.where(eq(yandexCalendarSyncs.id, existingSync.id));
			} else {
				await db.insert(yandexCalendarSyncs).values({
					organizationId: orgId,
					doctorId: staffId,
					yandexCalendarId: staffInfo.yandexCalendarId,
					syncStatus: "synced",
					lastSyncAt: new Date(),
				});
			}

			return { success: true, message: "Sync triggered successfully" };
		} catch (error: any) {
			request.log.error(error);
			return reply.status(500).send({
				error: "InternalServerError",
				message: "Internal server error",
			});
		}
	});
}
