import { generateUuidV7, resolveValidIanaTimeZone, todayDateKeyInTimeZone } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	ensureClinicalStaffAccess,
	requireClinicalMutationContext,
} from "../../security/tenantContext.js";
import { onTenantTxCommit, withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { appointments, visits } from "../../db/schema.js";
import { acceptVisitDraftInDb } from "../../db/visitsQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import { clinicTimeZone } from "../../services/reports/managerReports/timezone.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { buildEffectiveDraft } from "./buildEffectiveDraft.js";
import { computeDoctorTodayEarningsInTx } from "../doctorPortal/todaySummaryQuery.js";
import { executeVisitCompletionSideEffects } from "./visitCompletionEffects.js";
import {
	noActiveVisitId,
	sendVisitDraftMutationError,
	visitDraftNotFoundMessage,
} from "./visitErrors.js";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const completeVisitBodySchema = z
	.object({
		draft: z.record(z.unknown()).optional(),
		diary: z.record(z.unknown()).optional(),
		doctorSummary: z.string().nullable().optional(),
		clientMutationId: z.string().optional(),
		idempotencyKey: z.string().optional(),
	})
	.strict();

export async function handleCompleteVisit(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const context = await requireClinicalMutationContext(
		request,
		reply,
		"visit complete",
	);
	if (!context) return;
	if (!ensureClinicalStaffAccess(request, reply, "завершению приёма")) return;
	const orgId = context.organizationId;
	const { visitId } = request.params as { visitId: string };

	if (!visitId || visitId === noActiveVisitId) {
		return { ok: true, status: "completed", visitId: visitId || null };
	}

	const trimmedVisitId = visitId.trim();
	if (!UUID_PATTERN.test(trimmedVisitId)) {
		reply.code(404);
		return {
			error: "VisitNotFound",
			reason: "visit_not_found",
			message: visitDraftNotFoundMessage,
		};
	}

	const parsedBody = completeVisitBodySchema.safeParse(request.body ?? {});
	if (!parsedBody.success) {
		reply.code(400);
		return {
			error: "ValidationError",
			message: "Некорректные данные завершения приёма.",
			issues: parsedBody.error.issues,
		};
	}

	try {
		const lookup = await withTenantWriteCtx(orgId, async (tx) => {
			const [existingVisit] = await tx
				.select()
				.from(visits)
				.where(and(eq(visits.id, trimmedVisitId), eq(visits.organizationId, orgId)))
				.limit(1);

			if (!existingVisit) {
				return { kind: "not_found" as const };
			}

			if (existingVisit.status === "signed") {
				if (existingVisit.appointmentId) {
					const appointmentId = existingVisit.appointmentId;
					await tx
						.update(appointments)
						.set({ status: "completed" })
						.where(
							and(
								eq(appointments.id, appointmentId),
								eq(appointments.organizationId, orgId),
							),
						);
					onTenantTxCommit(() => {
						wsBroker.broadcastToOrganization(orgId, {
							type: "APPOINTMENT_UPDATED",
							payload: {
								appointmentId,
								visitId: trimmedVisitId,
								status: "completed",
							},
						});
					});
				}
				return { kind: "already_signed" as const, visit: existingVisit };
			}

			return { kind: "ready" as const, visit: existingVisit };
		});

		if (lookup.kind === "not_found") {
			reply.code(404);
			return {
				error: "VisitNotFound",
				reason: "visit_not_found",
				message: visitDraftNotFoundMessage,
			};
		}

		if (lookup.kind === "already_signed") {
			return {
				ok: true,
				status: "completed",
				visit: lookup.visit,
				alreadySigned: true,
			};
		}

		const existingVisit = lookup.visit;
		const body = parsedBody.data;
		const rawDraft = body.draft ?? body.diary ?? {};
		const effectiveDraft = buildEffectiveDraft(rawDraft, existingVisit);

		const acceptInput = {
			visitId,
			draft: effectiveDraft,
			doctorSummary:
				body.doctorSummary !== undefined
					? body.doctorSummary
					: existingVisit.doctorSummary ?? null,
			clientMutationId:
				typeof body.clientMutationId === "string" && body.clientMutationId.trim()
					? body.clientMutationId.trim()
					: generateUuidV7(),
			baseRevision: existingVisit.revision,
			clientSavedAt: new Date().toISOString(),
		};

		const result = await withTenantWriteCtx(orgId, () =>
			acceptVisitDraftInDb(orgId, acceptInput),
		);

		let doctorEarningsDeltaKopecks: number | undefined;
		let doctorTodayTotalKopecks: number | undefined;

		if (result?.visit) {
			const identity = getRequestIdentity(request);
			await executeVisitCompletionSideEffects({
				orgId,
				visit: result.visit,
				doctorId: identity.userId ?? null,
				log: request.log,
			});

			let doctorUserIdForSummary = identity.userId ?? null;
			const visitAppointmentId = result.visit.appointmentId;
			if (!doctorUserIdForSummary && visitAppointmentId) {
				const apptRow = await withTenantReadCtx(orgId, async (tx) =>
					tx
						.select({ doctorUserId: appointments.doctorUserId })
						.from(appointments)
						.where(
							and(
								eq(appointments.organizationId, orgId),
								eq(appointments.id, visitAppointmentId),
							),
						)
						.limit(1),
				);
				doctorUserIdForSummary = apptRow[0]?.doctorUserId ?? null;
			}

			if (doctorUserIdForSummary) {
				try {
					const computed = await withTenantReadCtx(orgId, async (tx) => {
						const tz = resolveValidIanaTimeZone(await clinicTimeZone(orgId, tx));
						const todayIso = todayDateKeyInTimeZone(tz);
						return computeDoctorTodayEarningsInTx({
							tx,
							organizationId: orgId,
							doctorId: doctorUserIdForSummary,
							dateIso: todayIso,
							visitIdForDelta: trimmedVisitId,
						});
					});
					doctorEarningsDeltaKopecks = computed.visitEarningsDeltaKopecks;
					doctorTodayTotalKopecks = computed.summary.earnedTodayKopecks;
				} catch (earningsErr) {
					request.log.warn(
						{ err: earningsErr, visitId: trimmedVisitId },
						"Не удалось рассчитать дневной заработок врача после завершения приёма",
					);
				}
			}
		}

		return {
			ok: true,
			status: "completed",
			visit: result.visit,
			saveReceipt: result.saveReceipt,
			...(doctorEarningsDeltaKopecks !== undefined ? { doctorEarningsDeltaKopecks } : {}),
			...(doctorTodayTotalKopecks !== undefined ? { doctorTodayTotalKopecks } : {}),
		};
	} catch (error) {
		request.log.error(error, "Ошибка в обработчике завершения приёма /complete");
		return sendVisitDraftMutationError(error, reply, "accept");
	}
}
