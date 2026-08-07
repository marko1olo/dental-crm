import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import { communicationTasks, patients } from "../../db/schema.js";

const flexbePayloadSchema = z
	.object({
		event: z.string().optional(),
		site: z
			.object({
				id: z.coerce.string().optional(),
				name: z.string().optional(),
			})
			.optional(),
		data: z.record(z.any()).optional(),
	})
	.passthrough();

export async function registerFlexbeRoutes(app: FastifyInstance) {
	app.post("/api/integrations/flexbe/webhook", async (req, reply) => {
		const querySchema = z.object({
			organizationId: z.string().uuid(),
		});

		const queryResult = querySchema.safeParse(req.query);
		if (!queryResult.success) {
			return reply.status(400).send({
				error:
					"Missing organizationId in query params. Use ?organizationId=...",
			});
		}
		const organizationId = queryResult.data.organizationId;

		const payload = flexbePayloadSchema.safeParse(req.body);
		if (!payload.success) {
			return reply.status(400).send({ error: "Invalid payload format" });
		}

		const data = payload.data.data || (req.body as any) || {};
		const name = (data.name || "Лид с лендинга").toString();
		const phone = data.phone ? data.phone.toString() : null;

		let patientId: string | null = null;

		if (phone) {
			const existing = await db
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						eq(patients.phone, phone),
					),
				)
				.limit(1);
			if (existing.length > 0) {
				patientId = existing[0]?.id ?? null;
			}
		}

		if (!patientId) {
			const inserted = await db
				.insert(patients)
				.values({
					organizationId,
					fullName: name,
					phone: phone,
				})
				.returning({ id: patients.id });
			patientId = inserted[0]?.id ?? null;
		}

		await db.insert(communicationTasks).values({
			organizationId,
			patientId: patientId as string,
			assignedRole: "admin",
			channel: "phone",
			intent: "general",
			status: "needs_call",
			title: "Лендинг Flexbe: Новая заявка",
			body: `Имя: ${name}\nТелефон: ${phone || "не указан"}\nИсточник: Flexbe`,
			dueAt: new Date(),
		});

		return reply.status(200).send({ success: true });
	});
}
