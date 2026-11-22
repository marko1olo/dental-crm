/**
 * missedCallService.ts — Automatic Missed Call Interception & Urgent Task Generator.
 *
 * Implements:
 * 1. Detection of dropped, missed, or unanswered calls across Russian PBX providers (Mango Office, UIS, Zadarma, Asterisk).
 * 2. Automatic patient / lead resolution or creation with concurrent race condition protection (pg_advisory_xact_lock).
 * 3. Urgent Task Creation in communication_tasks (SLA: 60 seconds callback) with 60s duplicate cascade suppression.
 * 4. Proactive Alert generation for Copilot SSE stream and WebSocket broadcast for reception desk.
 */

import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	communicationEvents,
	communicationTasks,
	crmLeads,
	patients,
} from "../../db/schema.js";
import { maskPhoneDisplay } from "@dental/shared";
import { normalizePhoneNumber } from "./telephonySecurity.js";
import { wsBroker } from "../websocketBroker.js";

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
	 * and broadcasts proactive alerts to WebSocket and Copilot SSE streams.
	 */
	public static async handleMissedCall(
		params: MissedCallEventParams,
	): Promise<MissedCallResult> {
		const organizationId = params.organizationId;
		const normalized = normalizePhoneNumber(params.phone || params.rawPhone);
		const callerPhoneE164 = normalized.isValid ? normalized.e164 : params.phone;
		const national10 = normalized.national10;
		const callId = (params.callId || "").trim();

		return await db.transaction(async (tx) => {
			// Serialize concurrent webhooks for this organization and phone/callId
			const lockKey = callId
				? `missed:${organizationId}:call:${callId}`
				: `missed:${organizationId}:phone:${national10 || callerPhoneE164}`;
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`,
			);

			// 1. Check if this callId was already processed as a missed call event
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
							or(
								eq(communicationEvents.providerCallId, callId),
								ilike(communicationEvents.message, `%${callId}%`),
							),
						),
					)
					.limit(1);

				const candidateEv = existingEvents[0];
				if (candidateEv && typeof candidateEv.patientId === "string") {
					const existingPatientId: string = candidateEv.patientId;
					const existingTasks = await tx
						.select({
							id: communicationTasks.id,
							patientId: communicationTasks.patientId,
						})
						.from(communicationTasks)
						.where(
							and(
								eq(communicationTasks.organizationId, organizationId),
								eq(communicationTasks.workflowCode, "MISSED_CALL_CALLBACK"),
								eq(communicationTasks.patientId, existingPatientId),
							),
						)
						.orderBy(desc(communicationTasks.createdAt))
						.limit(1);

					return {
						success: true,
						duplicate: true,
						taskId: existingTasks[0]?.id,
						patientId: existingPatientId,
						patientName: `Пациент (${callerPhoneE164})`,
						phone: callerPhoneE164,
						isNewLead: false,
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
								ilike(patients.phone, `%${national10}%`),
								sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${national10}%`}`,
								sql`regexp_replace(coalesce(${patients.administrativeProfile}->>'legalRepresentativePhone', ''), '[^0-9]', '', 'g') LIKE ${`%${national10}%`}`,
							),
						),
					)
					.limit(1);

				if (existingPatients.length > 0) {
					matchedPatient = existingPatients[0] ?? null;
				}
			}

			let patientId: string | null = null;
			let patientDisplayName: string;
			let createdLeadRecord: typeof crmLeads.$inferSelect | null = null;
			let taskId: string | undefined = undefined;

			const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);

			if (matchedPatient) {
				patientId = matchedPatient.id;
				patientDisplayName =
					matchedPatient.fullName.trim() || `Пациент (${callerPhoneE164})`;

				// Check existing lead for constant patient — update lastContactedAt without creating duplicates
				try {
					const existingLeads = await tx
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
						const [updatedLead] = await tx
							.update(crmLeads)
							.set({
								lastContactedAt: new Date(),
								notes: sql`coalesce(${crmLeads.notes}, '') || E'\n' || ${`Пропущенный звонок от пациента ${patientDisplayName}: ${new Date().toLocaleString("ru-RU")}`}`,
							})
							.where(eq(crmLeads.id, existingLead.id))
							.returning();
						createdLeadRecord = updatedLead || existingLead;
					} else {
						const [createdLead] = await tx
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
						createdLeadRecord = createdLead || null;
					}
				} catch (err) {
					if (params.logger) {
						params.logger.warn({ err, organizationId, patientId }, "[MissedCallService] Existing patient lead handling notice");
					} else {
						process.stderr.write(`[MissedCallService] Existing patient lead handling notice: ${String(err)}\n`);
					}
				}

				// 3. Suppress duplicate task cascade if an active callback task already exists within 60 seconds
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
					return {
						success: true,
						duplicate: true,
						taskId: existingTask.id,
						patientId,
						patientName: patientDisplayName,
						phone: callerPhoneE164,
						isNewLead: false,
						leadId: createdLeadRecord?.id,
					};
				}

				// Create URGENT task in communicationTasks for registered patient (60-second callback SLA)
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
			} else {
				// SANE DOMAIN RULE: DO NOT POLLUTE PATIENTS TABLE WITH UNKNOWN SPAM CALLS!
				// Only create/update crmLeads entry for the marketing & reception desk funnel.
				isNewLead = true;

				try {
					const existingLeads = await tx
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

						const [updatedLead] = await tx
							.update(crmLeads)
							.set({
								lastContactedAt: new Date(),
								status:
									existingLead.status === "won" || existingLead.status === "archived"
										? "new"
										: existingLead.status,
								notes: sql`coalesce(${crmLeads.notes}, '') || E'\n' || ${`Повторный пропущенный звонок от ${callerPhoneE164} (${new Date().toLocaleString("ru-RU")})`}`,
							})
							.where(eq(crmLeads.id, existingLead.id))
							.returning();
						createdLeadRecord = updatedLead || existingLead;
						patientDisplayName =
							existingLead.patientName || existingLead.name || `Лид (${callerPhoneE164})`;
						taskId = existingLead.id;

						if (wasRecent) {
							return {
								success: true,
								duplicate: true,
								taskId: existingLead.id,
								patientId: null,
								patientName: patientDisplayName,
								phone: callerPhoneE164,
								isNewLead: true,
								leadId: existingLead.id,
							};
						}
					} else {
						const newLeadName = `Лид ${callerPhoneE164}`;
						const [createdLead] = await tx
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
						createdLeadRecord = createdLead || null;
						patientDisplayName = newLeadName;
						taskId = createdLead?.id;
					}
				} catch (err) {
					if (params.logger) {
						params.logger.warn({ err, organizationId, callerPhone: callerPhoneE164 }, "[MissedCallService] Unknown caller lead handling notice");
					} else {
						process.stderr.write(`[MissedCallService] Unknown caller lead handling notice: ${String(err)}\n`);
					}
					patientDisplayName = `Лид (${maskPhoneDisplay(callerPhoneE164)})`;
				}
			}

			// 4. Insert into communicationEvents (patientId is null for unknown leads, callerPhone is preserved)
			await tx.insert(communicationEvents).values({
				organizationId,
				providerCallId: callId || null,
				providerName: params.provider || "telephony",
				patientId,
				callerPhone: callerPhoneE164,
				channel: "phone",
				direction: "inbound",
				status: "needs_call",
				message: `🚨 Пропущенный звонок от ${callerPhoneE164}`,
				durationSeconds: 0,
			});

			// 6. WebSocket Broadcast for Reception Desk (Quiet Backoffice & Zero Chairside Distraction — Mandate 8v & 8e)
			wsBroker.broadcastToOrganization(organizationId, {
				type: "TELEPHONY_MISSED_CALL",
				payload: {
					taskId,
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
					payload: {
						lead: createdLeadRecord,
					},
				});
			}

			// Doctor Sterile Zone & Quiet Backoffice (Mandates 8e & 8v):
			// Missed calls are operational reception tasks, NEVER clinical emergencies in doctor copilot!

			return {
				success: true,
				taskId,
				patientId,
				patientName: patientDisplayName,
				phone: callerPhoneE164,
				isNewLead,
			};
		});
	}
}
