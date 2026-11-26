import type { SpeechTranscriptUtterance } from "@dental/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { communicationEvents, patients, uisCallSpeechTranscripts } from "../../db/schema.js";

function normalizeTranscriptSentiment(raw: string | null | undefined): "neutral" | "positive" | "negative" {
	const v = (raw ?? "").trim().toLowerCase();
	if (v === "positive" || v === "negative") return v;
	return "neutral";
}

function buildTranscriptUtterances(
	rawText: string | null | undefined,
	durationSeconds: number | null | undefined,
	sentimentRaw: string | null | undefined,
): SpeechTranscriptUtterance[] | undefined {
	const cleaned = (rawText ?? "").trim();
	if (!cleaned) return undefined;
	const lines = cleaned
		.split(/\r?\n+/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length === 0) return undefined;
	const totalDur = Math.max(durationSeconds ?? 0, lines.length * 4);
	const slice = Math.max(1, Math.floor(totalDur / lines.length));
	const sentiment = normalizeTranscriptSentiment(sentimentRaw);
	return lines.map((line, idx) => {
		const operatorMatch = line.match(/^(?:оператор|администратор|клиника|operator)\s*:\s*(.+)$/i);
		const patientMatch = line.match(/^(?:пациент|клиент|абонент|patient)\s*:\s*(.+)$/i);
		const speaker: "operator" | "patient" = operatorMatch ? "operator" : "patient";
		const text = (operatorMatch?.[1] || patientMatch?.[1] || line).trim();
		const startTimeSeconds = idx * slice;
		const endTimeSeconds = idx === lines.length - 1 ? totalDur : (idx + 1) * slice;
		return {
			speaker,
			startTimeSeconds,
			endTimeSeconds,
			text,
			confidence: 1,
			sentiment,
		};
	});
}

export async function telephonyCallsListHandler(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Querystring: { limit?: string | number; offset?: string | number };
	}>,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalReadAccess(
			request,
			reply,
			"list telephony calls",
		))
	) {
		return;
	}

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"list telephony calls",
	);
	if (!orgId) return;

	const rawOrgId = request.params?.organizationId;
	if (rawOrgId && rawOrgId !== orgId) {
		return reply.status(403).send({
			error: "OrganizationMismatch",
			message: "Несовпадение идентификатора организации",
		});
	}

	const rawLimit = Number(request.query?.limit);
	const limit =
		Number.isFinite(rawLimit) && rawLimit > 0
			? Math.min(Math.max(1, Math.floor(rawLimit)), 100)
			: 50;

	const rawOffset = Number(request.query?.offset);
	const offset =
		Number.isFinite(rawOffset) && rawOffset >= 0
			? Math.floor(rawOffset)
			: 0;

	const calls = await withTenantCtx(orgId, async (tx) => {
		const rows = await tx
			.select({
				id: communicationEvents.id,
				providerCallId: communicationEvents.providerCallId,
				patientId: communicationEvents.patientId,
				channel: communicationEvents.channel,
				direction: communicationEvents.direction,
				status: communicationEvents.status,
				message: communicationEvents.message,
				recordingUrl: communicationEvents.recordingUrl,
				durationSeconds: communicationEvents.durationSeconds,
				callerPhone: communicationEvents.callerPhone,
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
			.limit(limit)
			.offset(offset);

		const callKeys = Array.from(
			new Set(
				rows.flatMap((r) => [r.id, r.providerCallId].filter((v): v is string => Boolean(v && v.trim()))),
			),
		);

		const transcriptMap = new Map<string, typeof uisCallSpeechTranscripts.$inferSelect>();
		if (callKeys.length > 0) {
			const transcriptRows = await tx
				.select()
				.from(uisCallSpeechTranscripts)
				.where(
					and(
						eq(uisCallSpeechTranscripts.organizationId, orgId),
						inArray(uisCallSpeechTranscripts.callId, callKeys),
					),
				)
				.orderBy(desc(uisCallSpeechTranscripts.createdAt));

			for (const tr of transcriptRows) {
				if (!transcriptMap.has(tr.callId)) {
					transcriptMap.set(tr.callId, tr);
				}
			}
		}

		return rows.map((row) => {
			const tr =
				(row.providerCallId ? transcriptMap.get(row.providerCallId) : undefined) ??
				transcriptMap.get(row.id);
			const utterances = buildTranscriptUtterances(
				tr?.transcript,
				row.durationSeconds ?? tr?.durationSeconds,
				tr?.sentiment,
			);
			return {
				...row,
				transcriptText: tr?.transcript ?? null,
				aiSummary: tr?.aiSummary ?? null,
				sentiment: tr?.sentiment ?? null,
				...(utterances ? { transcript: utterances } : {}),
			};
		});
	});

	return reply.send({
		success: true,
		data: {
			calls,
		},
		calls,
	});
}
