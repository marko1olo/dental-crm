/**
 * missedCallService.ts — Automatic Missed Call Interception & Urgent Task Generator.
 *
 * Implements:
 * 1. Detection of dropped, missed, or unanswered calls across Russian PBX providers (Mango Office, UIS, Zadarma, Asterisk).
 * 2. Automatic patient / lead resolution or creation with concurrent race condition protection (pg_advisory_xact_lock).
 * 3. Urgent Task Creation in communication_tasks (SLA: 60 seconds callback) with 60s duplicate cascade suppression.
 * 4. Proactive Alert generation for Copilot SSE stream and WebSocket broadcast for reception desk.
 */

import { and, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import { onTenantTxCommit, withSavepoint, withTenantCtx } from "../../db/rls.js";
import {
	communicationEvents,
	communicationTasks,
	crmLeads,
	patients,
} from "../../db/schema.js";
import { maskPhoneDisplay } from "@dental/shared";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { normalizePhoneNumber } from "./telephonySecurity.js";
import { wsBroker } from "../websocketBroker.js";

const missedCallLogger = createApiLogger("missedCallService");
const defaultStructuredLogger = {
	warn: (obj: unknown, msg?: string) => missedCallLogger.warn({ details: obj }, msg || ""),
	error: (obj: unknown, msg?: string) => missedCallLogger.error({ details: obj }, msg || ""),
};

function escapeLikePattern(raw: string): string {
	return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export interface MissedCallEventParams {
	organizationId: string;
	phone: string;
	rawPhone?: string | undefined;
	callId?: string | null | undefined;
	provider?: string | undefined;
	reason?: string | undefined;
	timestamp?: Date | string | undefined;
	waitDurationSeconds?: number | undefined;
	logger?: { warn: (obj: unknown, msg?: string) => void; error: (obj: unknown, msg?: string) => void; info?: (obj: unknown, msg?: string) => void } | undefined;
}

export interface MissedCallResult {
	success: boolean;
	taskId?: string | undefined;
	patientId?: string | null | undefined;
	patientName: string;
	phone: string;
	isNewLead: boolean;
	leadId?: string | undefined;
	alertCardId?: string | undefined;
	duplicate?: boolean | undefined;
}

export class MissedCallService {
	/**
	 * Processes a missed or dropped incoming call.
	 * Serializes concurrent requests via PostgreSQL transaction advisory lock,
	 * deduplicates rapid duplicate webhook cascades within a 60-second window,
	 * creates an urgent communication task, logs the communication event,
	 * and broadcasts proactive alerts strictly after commit.
	 */
	public static async handleMissedCall(
		params: MissedCallEventParams,
	): Promise<MissedCallResult> {
		const organizationId = params.organizationId;
		const normalized = normalizePhoneNumber(params.phone || params.rawPhone);
		const callerPhoneE164 = normalized.isValid ? normalized.e164 : params.phone;
		const national10 = normalized.national10;
		const escapedNational10 = escapeLikePattern(national10);
		const callId = (params.callId || "").trim();

		return await withTenantCtx(organizationId, async (tx) => {
			// Serialize concurrent webhooks for this organization and phone/callId
			const lockKey = callId
				? `missed:${organizationId}:call:${callId}`
				: `missed:${organizationId}:phone:${national10 || callerPhoneE164}`;
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`,
			);

			// 1. Check if this exact callId was already processed as a missed call event
			if (callId) {
				const existingEvents = await tx
					.select({
						id: communicationEvents.id,
						patientId: communicationEvents.patientId,
					})
					.from(communicationEvents)
					.where(
						and(
							eq(communicationEvents.organizationId, organizationId),
							eq(communicationEvents.channel, "phone"),
							or(
								eq(communicationEvents.status, "needs_call"),
								eq(communicationEvents.status, "failed"),
							),
							eq(communicationEvents.providerCallId, callId),
						),
					)
					.limit(1);

				const candidateEv = existingEvents[0];
				if (candidateEv) {
					let existingTaskId: string | undefined;
					if (typeof candidateEv.patientId === "string") {
						const existingTasks = await tx
							.select({ id: communicationTasks.id })
							.from(communicationTasks)
							.where(
								and(
									eq(communicationTasks.organizationId, organizationId),
									eq(communicationTasks.workflowCode, "MISSED_CALL_CALLBACK"),
									eq(communicationTasks.patientId, candidateEv.patientId),
								),
							)
							.orderBy(desc(communicationTasks.createdAt))
							.limit(1);
						existingTaskId = existingTasks[0]?.id;
					}

					return {
						success: true,
						duplicate: true,
						taskId: existingTaskId,
						patientId: candidateEv.patientId ?? null,
						patientName: candidateEv.patientId
							? `Пациент (${callerPhoneE164})`
							: `Лид (${maskPhoneDisplay(callerPhoneE164)})`,
						phone: callerPhoneE164,
						isNewLead: !candidateEv.patientId,
					};
				}
			}

			// 2. Find matching patient
			let matchedPatient: typeof patients.$inferSelect | null = null;
			let isNewLead = false;

			if (national10 && national10.length >= 7) {
				const existingPatients = await tx
					.select()
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							or(
								eq(patients.phone, callerPhoneE164),
								ilike(patients.phone, `%${escapedNational10}%`),
								sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${escapedNational10}%`}`,
								sql`regexp_replace(coalesce(${patients.administrativeProfile}->>'legalRepresentativePhone', ''), '[^0-9]', '', 'g') LIKE ${`%${escapedNational10}%`}`,
							),
						),
					)
					.limit(1);

				if (existingPatients.length > 0) {
					matchedPatient = existingPatients[0] ?? null;
				}
			}

			let patientId: string | null = null;
			let patientDisplayName: string = normalized.isValid
				? `Пациент (${callerPhoneE164})`
				: `Лид (${maskPhoneDisplay(callerPhoneE164)})`;
			let createdLeadRecord: typeof crmLeads.$inferSelect | null = null;
			let taskId: string | undefined = undefined;
			let leadId: string | undefined = undefined;
			let duplicateSuppression = false;

			const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

			if (matchedPatient) {
				patientId = matchedPatient.id;
				patientDisplayName =
					matchedPatient.fullName.trim() || `Пациент (${callerPhoneE164})`;

				// Check existing lead for constant patient — update lastContactedAt without creating duplicates
				try {
					createdLeadRecord = await withSavepoint(tx, async (leadTx) => {
						const existingLeads = await leadTx
							.select()
							.from(crmLeads)
							.where(
								and(
									eq(crmLeads.organizationId, organizationId),
									or(
										eq(crmLeads.patientId, matchedPatient.id),
										eq(crmLeads.phone, callerPhoneE164),
									),
								),
							)
							.orderBy(desc(crmLeads.createdAt))
							.limit(1);

						if (existingLeads.length > 0 && existingLeads[0]) {
							const existingLead = existingLeads[0];
							const [updatedLead] = await leadTx
								.update(crmLeads)
								.set({
									lastContactedAt: new Date(),
									notes: sql`coalesce(${crmLeads.notes}, '') || E'\n' || ${`Пропущенный звонок от пациента ${patientDisplayName}: ${new Date().toLocaleString("ru-RU")}`}`,
								})
								.where(
									and(
										eq(crmLeads.id, existingLead.id),
										eq(crmLeads.organizationId, organizationId),
									),
								)
								.returning();
							return updatedLead || existingLead;
						}

						const [createdLead] = await leadTx
							.insert(crmLeads)
							.values({
								organizationId,
								name: `Пропущенный звонок: ${patientDisplayName}`,
								patientName: patientDisplayName,
								patientId: matchedPatient.id,
								phone: callerPhoneE164,
								source: "telephony_missed",
								status: "new",
								notes: `Пропущенный звонок от постоянного пациента ${patientDisplayName} (${callerPhoneE164}). Норматив перезвона 60 секунд.`,
								lastContactedAt: new Date(),
							})
							.returning();
						return createdLead || null;
					});
					leadId = createdLeadRecord?.id;
				} catch (err) {
					const log = params.logger || defaultStructuredLogger;
					log.warn(
						{ err: safeLogError(err), organizationId, patientId },
						"[MissedCallService] Existing patient lead handling notice",
					);
				}

				// 3. Suppress duplicate task cascade if an active callback task already exists within 60 seconds,
				// while still persisting the communication event for distinct callIds.
				const recentTasks = await tx
					.select({ id: communicationTasks.id })
					.from(communicationTasks)
					.where(
						and(
							eq(communicationTasks.organizationId, organizationId),
							eq(communicationTasks.patientId, patientId),
							eq(communicationTasks.workflowCode, "MISSED_CALL_CALLBACK"),
							eq(communicationTasks.status, "needs_call"),
							gt(communicationTasks.createdAt, sixtySecondsAgo),
						),
					)
					.limit(1);

				const existingTask = recentTasks[0];
				if (existingTask) {
					taskId = existingTask.id;
					duplicateSuppression = true;
				} else {
					const dueAt = new Date(Date.now() + 60 * 1000);
					const [createdTask] = await tx
						.insert(communicationTasks)
						.values({
							organizationId,
							patientId,
							assignedRole: "receptionist",
							channel: "phone",
							intent: "general",
							status: "needs_call",
							priority: "urgent",
							dueAt,
							title: "🚨 Пропущенный вызов. Перезвонить за 60 секунд",
							body: `🚨 Пропущенный вызов от ${callerPhoneE164}. Срочно перезвонить!`,
							workflowCode: "MISSED_CALL_CALLBACK",
						})
						.returning();
					taskId = createdTask?.id;
				}
			} else {
				// SANE DOMAIN RULE: DO NOT POLLUTE PATIENTS TABLE WITH UNKNOWN CALLERS!
				// Unknown callers create/update crmLeads only (taskId remains undefined; leadId carries the lead UUID).
				isNewLead = true;

				try {
					const leadOutcome = await withSavepoint(tx, async (leadTx) => {
						const existingLeads = await leadTx
							.select()
							.from(crmLeads)
							.where(
								and(
									eq(crmLeads.organizationId, organizationId),
									eq(crmLeads.phone, callerPhoneE164),
								),
							)
							.orderBy(desc(crmLeads.createdAt))
							.limit(1);

						if (existingLeads.length > 0 && existingLeads[0]) {
							const existingLead = existingLeads[0];
							const wasRecent =
								existingLead.lastContactedAt &&
								new Date(existingLead.lastContactedAt) > sixtySecondsAgo;

							const [updatedLead] = await leadTx
								.update(crmLeads)
								.set({
									lastContactedAt: new Date(),
									status:
										existingLead.status === "won" || existingLead.status === "archived"
											? "new"
											: existingLead.status,
									notes: sql`coalesce(${crmLeads.notes}, '') || E'\n' || ${`Повторный пропущенный звонок от ${callerPhoneE164} (${new Date().toLocaleString("ru-RU")})`}`,
								})
								.where(
									and(
										eq(crmLeads.id, existingLead.id),
										eq(crmLeads.organizationId, organizationId),
									),
								)
								.returning();
							const record = updatedLead || existingLead;
							const displayName =
								existingLead.patientName || existingLead.name || `Лид (${callerPhoneE164})`;

							return {
								isDuplicate: Boolean(wasRecent),
								record,
								displayName,
							};
						}

						const newLeadName = `Лид ${callerPhoneE164}`;
						const [createdLead] = await leadTx
							.insert(crmLeads)
							.values({
								organizationId,
								name: newLeadName,
								patientName: newLeadName,
								phone: callerPhoneE164,
								source: "telephony_missed",
								status: "new",
								priority: "urgent",
								notes: `Пропущенный звонок от ${callerPhoneE164}. Норматив перезвона 60 секунд.`,
								lastContactedAt: new Date(),
							})
							.returning();
						return {
							isDuplicate: false,
							record: createdLead || null,
							displayName: newLeadName,
						};
					});

					if (leadOutcome) {
						createdLeadRecord = leadOutcome.record;
						patientDisplayName = leadOutcome.displayName;
						leadId = leadOutcome.record?.id;
						duplicateSuppression = leadOutcome.isDuplicate;
					}
				} catch (err) {
					const log = params.logger || defaultStructuredLogger;
					log.warn(
						{ err: safeLogError(err), organizationId, callerPhone: callerPhoneE164 },
						"[MissedCallService] Unknown caller lead handling notice",
					);
					patientDisplayName = `Лид (${maskPhoneDisplay(callerPhoneE164)})`;
				}
			}

			// 4. Insert into communicationEvents with onConflictDoNothing for providerCallId idempotency
			if (callId) {
				await tx
					.insert(communicationEvents)
					.values({
						organizationId,
						providerCallId: callId,
						providerName: params.provider || "telephony",
						patientId,
						callerPhone: callerPhoneE164,
						channel: "phone",
						direction: "inbound",
						status: "needs_call",
						message: `🚨 Пропущенный звонок от ${callerPhoneE164}`,
						durationSeconds: 0,
					})
					.onConflictDoNothing({
						target: [communicationEvents.organizationId, communicationEvents.providerCallId],
					});
			} else {
				await tx.insert(communicationEvents).values({
					organizationId,
					providerCallId: null,
					providerName: params.provider || "telephony",
					patientId,
					callerPhone: callerPhoneE164,
					channel: "phone",
					direction: "inbound",
					status: "needs_call",
					message: `🚨 Пропущенный звонок от ${callerPhoneE164}`,
					durationSeconds: 0,
				});
			}

			if (!duplicateSuppression) {
				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(organizationId, {
						type: "TELEPHONY_MISSED_CALL",
						payload: {
							taskId: taskId ?? null,
							leadId: leadId ?? null,
							phone: callerPhoneE164,
							patientId,
							patientName: patientDisplayName,
							callId: callId || null,
							provider: params.provider || "telephony",
							timestamp: new Date().toISOString(),
							priority: "URGENT",
							taskTitle: "🚨 Пропущенный вызов. Перезвонить за 60 секунд",
						},
					});

					if (createdLeadRecord) {
						wsBroker.broadcastToOrganization(organizationId, {
							type: "LEAD_CREATED",
							payload: { lead: createdLeadRecord },
						});
					}
				});
			}

			return {
				success: true,
				taskId,
				leadId,
				patientId,
				patientName: patientDisplayName,
				phone: callerPhoneE164,
				isNewLead,
				...(duplicateSuppression ? { duplicate: true } : {}),
			};
		});
	}
}
