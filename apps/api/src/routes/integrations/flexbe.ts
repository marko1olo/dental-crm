import { and, eq, gt, ilike } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import { communicationTasks, patients } from "../../db/schema.js";
import { verifyWebhookSecret } from "../../security/webhookAuth.js";

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
		if (
			!verifyWebhookSecret(req, reply, {
				channel: "flexbe",
				secretEnvNames: ["FLEXBE_WEBHOOK_SECRET", "DENTE_WEBHOOK_SECRET"],
			})
		) {
			return reply;
		}
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

		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const data = payload.data.data || (req.body as any) || {};
		const name = (data.name || "Лид с лендинга").toString();
		const phone = data.phone ? data.phone.toString() : null;

		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const rawTs = data.timestamp ?? data.time ?? (req.body as any)?.timestamp;
		if (rawTs != null) {
			const numTs =
				typeof rawTs === "number" ? rawTs : Number.parseInt(String(rawTs), 10);
			if (!Number.isNaN(numTs) && numTs > 0) {
				const msgTsSec = numTs > 1e11 ? Math.floor(numTs / 1000) : numTs;
				const nowSec = Math.floor(Date.now() / 1000);
				if (Math.abs(nowSec - msgTsSec) > 300) {
					return reply
						.status(400)
						.send({ error: "Timestamp drift window exceeded (>300s)" });
				}
			}
		}

		const subIdRaw =
			data.id ??
			data.submission_id ??
			data.lead_id ??
			data.req_id ??
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			(req.body as any)?.id;
		const subId =
			subIdRaw != null && String(subIdRaw).trim().length > 0
				? String(subIdRaw).trim()
				: null;

		if (subId) {
			const existingTask = await db
				.select({ id: communicationTasks.id })
				.from(communicationTasks)
				.where(
					and(
						eq(communicationTasks.organizationId, organizationId),
						ilike(communicationTasks.body, `%submission_id: ${subId}%`),
					),
				)
				.limit(1);

			if (existingTask.length > 0) {
				req.log.info(
					{ subId, organizationId },
					"Flexbe lead submission already ingested (replay skipped)",
				);
				return reply.status(200).send({ success: true, duplicate: true });
			}
		}

		const fiveMinAgo = new Date(Date.now() - 300 * 1000);
		if (phone) {
			const existingRecent = await db
				.select({ id: communicationTasks.id })
				.from(communicationTasks)
				.where(
					and(
						eq(communicationTasks.organizationId, organizationId),
						eq(communicationTasks.title, "Лендинг Flexbe: Новая заявка"),
						ilike(communicationTasks.body, `%Телефон: ${phone}%`),
						gt(communicationTasks.createdAt, fiveMinAgo),
					),
				)
				.limit(1);

			if (existingRecent.length > 0) {
				req.log.info(
					{ phone, organizationId },
					"Flexbe recent lead submission already ingested (replay skipped)",
				);
				return reply.status(200).send({ success: true, duplicate: true });
			}
		}

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

		const bodyText = `Имя: ${name}\nТелефон: ${phone || "не указан"}\nИсточник: Flexbe${subId ? `\n[submission_id: ${subId}]` : ""}`;

		await db.insert(communicationTasks).values({
			organizationId,
			patientId: patientId as string,
			assignedRole: "admin",
			channel: "phone",
			intent: "general",
			status: "needs_call",
			title: "Лендинг Flexbe: Новая заявка",
			body: bodyText,
			dueAt: new Date(),
		});

		return reply.status(200).send({ success: true });
	});
}
