/**
 * telephonyAndCallWebhookHandlers.ts — Layer 2: PBX Telephony Webhooks & Call Recording Handlers.
 *
 * Implements:
 * - PBX inbound/outbound call webhooks (Mango Office, UIS/CoMagic, Zadarma, Asterisk)
 * - Automatic phone number normalization and patient card matching
 * - Secure call audio recording metadata and streaming proxy
 * - Telephony call logs with strict tenant isolation
 */

import { and, desc, eq, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { communicationEvents, patients } from "../../db/schema.js";
import { telephonyWebhookSchema } from "./types.js";

/**
 * Normalizes phone numbers to digits only or canonical E.164-like representation.
 */
function normalizePhoneNumber(rawPhone: string): string {
	const digits = rawPhone.replace(/\D/g, "");
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
		return `+7${digits.slice(1)}`;
	}
	if (digits.length === 10) {
		return `+7${digits}`;
	}
	return rawPhone.trim();
}

export async function registerTelephonyAndCallWebhookHandlers(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * GET /api/communications/recordings/:id
	 * Получение метаданных аудиозаписи звонка
	 */
	app.get("/api/communications/recordings/:id", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		const [event] = await db
			.select()
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.id, id),
					eq(communicationEvents.organizationId, orgId),
				),
			)
			.limit(1);

		if (!event) {
			return reply.code(404).send({ error: "NotFound" });
		}

		if (!event.recordingUrl) {
			return reply.code(404).send({
				error: "NoRecording",
				message: "К этому событию не прикреплена аудиозапись.",
			});
		}

		return reply.send({
			id: event.id,
			recordingUrl: event.recordingUrl,
			durationSeconds: event.durationSeconds,
			audioFormat: event.audioFormat,
		});
	});

	/**
	 * GET /api/communications/recordings/:id/stream
	 * Стриминг или редирект на аудиозапись звонка
	 */
	app.get(
		"/api/communications/recordings/:id/stream",
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const { id } = request.params as { id: string };
			const [event] = await db
				.select()
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.id, id),
						eq(communicationEvents.organizationId, orgId),
					),
				)
				.limit(1);

			if (!event?.recordingUrl) {
				return reply.code(404).send({ error: "NotFound" });
			}

			// Simple redirect proxy for now
			return reply.redirect(event.recordingUrl);
		},
	);

	/**
	 * POST /api/communications/telephony/webhook
	 * Входящий вебхук от облачной АТС (UIS, Mango, Zadarma, Asterisk)
	 */
	app.post(
		"/api/communications/telephony/webhook",
		async (request, reply) => {
			// Организация может определяться из токена либо из специального заголовка АТС
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"telephony webhook",
			);
			if (!orgId) return;

			const parsed = telephonyWebhookSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат данных вебхука телефонии.",
					details: parsed.error.issues,
				});
			}

			const {
				callId,
				callerNumber,
				destinationNumber,
				direction,
				status,
				durationSeconds,
				recordingUrl,
				audioFormat,
				transcriptionText,
				actorUserId,
				clinicId,
			} = parsed.data;

			const phoneToSearch = normalizePhoneNumber(callerNumber);

			// Поиск пациента по номеру телефона
			const [matchedPatient] = await db
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, orgId),
						or(
							eq(patients.phone, phoneToSearch),
							eq(patients.phone, callerNumber),
						),
					),
				)
				.limit(1);

			const eventStatus =
				status === "answered"
					? "completed"
					: status === "missed"
						? "needs_call"
						: status;

			const note = transcriptionText
				? `Звонок (${direction}): ${transcriptionText}`
				: `Звонок (${direction}) от ${callerNumber} [callId:${callId}]`;

			const [inserted] = await db
				.insert(communicationEvents)
				.values({
					organizationId: orgId,
					clinicId: clinicId ?? null,
					patientId: matchedPatient?.id ?? null,
					actorUserId: actorUserId ?? null,
					channel: "phone",
					direction: direction as "inbound" | "outbound",
					status: eventStatus as any,
					message: note,
					recordingUrl: recordingUrl ?? null,
					durationSeconds: durationSeconds ?? null,
					audioFormat: audioFormat ?? "mp3",
				})
				.returning();

			return reply.code(201).send({
				success: true,
				event: inserted,
				matchedPatientId: matchedPatient?.id ?? null,
				matchedPatientName: matchedPatient?.fullName ?? null,
			});
		},
	);

	/**
	 * GET /api/communications/telephony/calls
	 * Журнал последних звонков клиники
	 */
	app.get(
		"/api/communications/telephony/calls",
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"list telephony calls",
				))
			)
				return;

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"list telephony calls",
			);
			if (!orgId) return;

			const calls = await db
				.select({
					id: communicationEvents.id,
					patientId: communicationEvents.patientId,
					channel: communicationEvents.channel,
					direction: communicationEvents.direction,
					status: communicationEvents.status,
					message: communicationEvents.message,
					recordingUrl: communicationEvents.recordingUrl,
					durationSeconds: communicationEvents.durationSeconds,
					createdAt: communicationEvents.createdAt,
					patientName: patients.fullName,
					patientPhone: patients.phone,
				})
				.from(communicationEvents)
				.leftJoin(patients, eq(patients.id, communicationEvents.patientId))
				.where(
					and(
						eq(communicationEvents.organizationId, orgId),
						eq(communicationEvents.channel, "phone"),
					),
				)
				.orderBy(desc(communicationEvents.createdAt))
				.limit(50);

			return reply.send({
				success: true,
				calls,
			});
		},
	);
}
