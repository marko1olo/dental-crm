import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import {
	DEMO_ADMIN_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "../../services/demo/deepDemoSeeder.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "./tokenHelpers.js";

export function registerSessionRoutes(app: FastifyInstance): void {
	// ─── Session Status Check ─────────────────────────────────────────────────────
	app.get(
		"/api/auth/status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const clinicHeader = request.headers["x-dente-clinic-token"];
			const staffHeader = request.headers["x-dente-staff-token"];
			const clinicToken = Array.isArray(clinicHeader)
				? clinicHeader[0]
				: clinicHeader;
			const staffToken = Array.isArray(staffHeader)
				? staffHeader[0]
				: staffHeader;

			const clinicPayload =
				clinicToken &&
				(clinicToken.startsWith("demo-showcase-token") ||
					clinicToken.startsWith("demo-showcase-clinic-token"))
					? { organizationId: DEMO_SHOWCASE_ORG_ID }
					: clinicToken
						? verifyToken(clinicToken, TOKEN_SECRET())
						: null;
			const staffPayload =
				staffToken && staffToken.startsWith("demo-showcase-staff-token")
					? {
							userId:
								staffToken.includes("orthopedist")
									? "01a00000-0000-0000-0003-000000000006"
									: staffToken.includes("orthodontist")
										? "01a00000-0000-0000-0003-000000000002"
										: staffToken.includes("surgeon")
											? "01a00000-0000-0000-0003-000000000003"
											: staffToken.includes("owner")
												? "01a00000-0000-0000-0003-000000000004"
												: staffToken.includes("admin")
													? DEMO_ADMIN_ID
													: DEMO_DOCTOR_1_ID,
							organizationId: DEMO_SHOWCASE_ORG_ID,
						}
					: staffToken
						? verifyToken(staffToken, TOKEN_SECRET())
						: null;

			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			let activeUser: any = null;
			if (staffPayload?.userId && clinicPayload?.organizationId) {
				const [user] = await db
					.select({ id: users.id, fullName: users.fullName, role: users.role })
					.from(users)
					.where(
						and(
							eq(users.id, staffPayload.userId as string),
							eq(users.isActive, true),
						),
					)
					.limit(1);
				activeUser = user ?? null;
			}

			return reply.send({
				clinicUnlocked: !!clinicPayload,
				staffUnlocked: !!staffPayload,
				organizationId: (clinicPayload?.organizationId as string) ?? null,
				activeUser,
			});
		},
	);

	// ─── SaaS User Profile: Get Current User ──────────────────────────────────────
	app.get(
		"/api/auth/user/me",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const staffHeader = request.headers["x-dente-staff-token"];
			const staffToken = Array.isArray(staffHeader)
				? staffHeader[0]
				: staffHeader;
			const payload = staffToken
				? verifyToken(staffToken, TOKEN_SECRET())
				: null;

			if (!payload?.userId)
				return reply
					.code(401)
					.send({ error: "AuthRequired", message: "Требуется авторизация." });

			const [user] = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					role: users.role,
					email: users.email,
					organizationId: users.organizationId,
					isActive: users.isActive,
					yandexCalendarId: users.yandexCalendarId,
					yandexCalendarToken: users.yandexCalendarToken,
				})
				.from(users)
				.where(
					and(eq(users.id, payload.userId as string), eq(users.isActive, true)),
				)
				.limit(1);

			if (!user)
				return reply
					.code(404)
					.send({ error: "NotFound", message: "Пользователь не найден." });

			return reply.send({ ok: true, user });
		},
	);
}
