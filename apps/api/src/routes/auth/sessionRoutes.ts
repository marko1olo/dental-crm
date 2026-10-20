import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { users } from "../../db/schema.js";
import {
	DEMO_ADMIN_ID,
	DEMO_DOCTOR_1_ID,
	DEMO_DOCTOR_2_ID,
	DEMO_DOCTOR_ORTHOPEDIST_ID,
	DEMO_DOCTOR_SURGEON_ID,
	DEMO_OWNER_ID,
	DEMO_SHOWCASE_ORG_ID,
} from "../../services/demo/deepDemoSeeder.js";
import { verifyToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "./tokenHelpers.js";

function parseDemoStaffPayload(
	staffToken: string | null | undefined,
): { userId: string; organizationId: string } | null {
	if (!staffToken || typeof staffToken !== "string") return null;
	const isDemoStaff =
		staffToken.startsWith("demo-showcase-staff-token") ||
		staffToken.startsWith("demo-token-");
	if (!isDemoStaff) return null;

	const roleHint = staffToken
		.replace("demo-showcase-staff-token-", "")
		.replace("demo-token-", "")
		.toLowerCase()
		.trim();

	let userId = DEMO_DOCTOR_1_ID;
	if (roleHint.includes("orthopedist")) {
		userId = DEMO_DOCTOR_ORTHOPEDIST_ID;
	} else if (roleHint.includes("orthodontist")) {
		userId = DEMO_DOCTOR_2_ID;
	} else if (roleHint.includes("surgeon")) {
		userId = DEMO_DOCTOR_SURGEON_ID;
	} else if (roleHint.includes("owner")) {
		userId = DEMO_OWNER_ID;
	} else if (roleHint.includes("admin")) {
		userId = DEMO_ADMIN_ID;
	}

	return {
		userId,
		organizationId: DEMO_SHOWCASE_ORG_ID,
	};
}

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
				parseDemoStaffPayload(staffToken) ??
				(staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null);

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
			const payload =
				parseDemoStaffPayload(staffToken) ??
				(staffToken ? verifyToken(staffToken, TOKEN_SECRET()) : null);

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

			if (!user) {
				if (staffToken && staffToken.startsWith("demo-showcase-staff-token")) {
					return reply.send({
						ok: true,
						user: {
							id: payload.userId,
							fullName: staffToken.includes("owner")
								? "Доктор Романов И. В. (Владелец)"
								: staffToken.includes("admin")
									? "Смирнова А. К. (Администратор)"
									: "Д-р Иванов П. С. (Терапевт)",
							role: staffToken.includes("owner")
								? "owner"
								: staffToken.includes("admin")
									? "admin"
									: "doctor",
							email: "demo@dente.pro",
							organizationId: DEMO_SHOWCASE_ORG_ID,
							isActive: true,
							yandexCalendarId: null,
							yandexCalendarToken: null,
						},
					});
				}
				return reply
					.code(404)
					.send({ error: "NotFound", message: "Пользователь не найден." });
			}

			return reply.send({ ok: true, user });
		},
	);
}
