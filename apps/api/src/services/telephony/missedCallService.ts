/**
 * missedCallService.ts — Automatic Missed Call Interception & Urgent Task Generator.
 *
 * Implements:
 * 1. Detection of dropped, missed, or unanswered calls across Russian PBX providers (Mango Office, UIS, Zadarma, Asterisk).
 * 2. Automatic patient / lead resolution or creation.
 * 3. Urgent Task Creation in communication_tasks (SLA: 60 seconds callback).
 * 4. Proactive Alert generation for Copilot SSE stream and WebSocket broadcast for reception desk.
 */

import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	communicationEvents,
	communicationTasks,
	crmLeads,
	patients,
} from "../../db/schema.js";
import { normalizePhoneNumber } from "../../routes/telephony.js";
import { defaultCopilotStreamManager } from "../agent/copilotService.js";
import { wsBroker } from "../websocketBroker.js";

export interface MissedCallEventParams {
	organizationId: string;
	phone: string;
	rawPhone?: string | undefined;
	callId?: string | null | undefined;
	provider?: string | undefined;
	reason?: string | undefined;
	timestamp?: Date | string | undefined;
}

export interface MissedCallResult {
	success: boolean;
	taskId?: string | undefined;
	patientId: string;
	patientName: string;
	phone: string;
	isNewLead: boolean;
	alertCardId?: string | undefined;
}

export class MissedCallService {
	/**
	 * Processes a missed or dropped incoming call.
	 * Creates an urgent communication task, logs the communication event,
	 * and broadcasts proactive alerts to WebSocket and Copilot SSE streams.
	 */
	public static async handleMissedCall(
		params: MissedCallEventParams,
	): Promise<MissedCallResult> {
		const organizationId = params.organizationId;
		const normalized = normalizePhoneNumber(params.phone || params.rawPhone);
		const callerPhoneE164 = normalized.isValid ? normalized.e164 : params.phone;
		const national10 = normalized.national10;

		// 1. Find or create matching patient
		let matchedPatient: typeof patients.$inferSelect | null = null;
		let isNewLead = false;

		if (national10 && national10.length >= 7) {
			const existingPatients = await db
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

		let patientId: string;
		let patientDisplayName: string;

		if (matchedPatient) {
			patientId = matchedPatient.id;
			patientDisplayName = matchedPatient.fullName.trim() || `Пациент (${callerPhoneE164})`;
		} else {
			// Create a patient entry for the missed call
			const newFullName = `Пропущенный вызов ${callerPhoneE164}`;
			const [createdPatient] = await db
				.insert(patients)
				.values({
					organizationId,
					fullName: newFullName,
					phone: callerPhoneE164,
					notes: `Автоматически создан из пропущенного звонка АТС (${params.provider || "телефония"}${params.callId ? `, call_id: ${params.callId}` : ""})`,
					status: "active",
				})
				.returning();

			if (!createdPatient) {
				throw new Error("Не удалось сохранить запись пациента для пропущенного звонка");
			}

			patientId = createdPatient.id;
			patientDisplayName = createdPatient.fullName;
			isNewLead = true;

			// Also record in crmLeads for marketing funnel
			try {
				await db.insert(crmLeads).values({
					organizationId,
					name: `Пропущенный звонок ${callerPhoneE164}`,
					patientName: newFullName,
					phone: callerPhoneE164,
					source: "telephony_missed",
					status: "new",
					notes: `Пропущенный звонок от ${callerPhoneE164}. Норматив перезвона 60 секунд.`,
				});
			} catch (err) {
				console.warn("[MissedCallService] Lead mirror notice:", err);
			}
		}

		// 2. Insert into communicationEvents
		await db.insert(communicationEvents).values({
			organizationId,
			patientId,
			channel: "phone",
			direction: "inbound",
			status: "failed",
			message: params.callId
				? `🚨 Пропущенный звонок от ${callerPhoneE164} (call_id: ${params.callId})`
				: `🚨 Пропущенный звонок от ${callerPhoneE164}`,
			durationSeconds: 0,
		});

		// 3. Create URGENT task in communicationTasks (60-second callback SLA)
		const dueAt = new Date(Date.now() + 60 * 1000);
		const [createdTask] = await db
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

		const taskId = createdTask?.id;

		// 4. WebSocket Broadcast for Reception Desk
		wsBroker.broadcastToOrganization(organizationId, {
			type: "TELEPHONY_MISSED_CALL",
			payload: {
				taskId,
				phone: callerPhoneE164,
				patientId,
				patientName: patientDisplayName,
				callId: params.callId || null,
				provider: params.provider || "telephony",
				timestamp: new Date().toISOString(),
				priority: "URGENT",
				taskTitle: "🚨 Пропущенный вызов. Перезвонить за 60 секунд",
			},
		});

		// 5. Copilot SSE Proactive Alert Broadcast
		const alertCardId = `alert_missed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
		defaultCopilotStreamManager.broadcastProactiveAlert(organizationId, {
			id: alertCardId,
			urgency: "CRITICAL",
			title: "🚨 Пропущенный входящий вызов",
			subtitle: `${patientDisplayName} • ${callerPhoneE164}`,
			description: `Входящий звонок от ${callerPhoneE164} был сброшен или остался без ответа. Норматив перезвона: 60 секунд!`,
			timestamp: new Date().toISOString(),
			patientId,
			patientName: patientDisplayName,
			patientPhone: callerPhoneE164,
			category: "clinical_alert",
			actions: [
				{
					id: "call_back_urgent",
					label: "📞 Перезвонить за 60 сек",
					kind: "danger",
					actionType: "call_patient",
					payload: {
						phone: callerPhoneE164,
						patientId,
						taskId,
					},
				},
			],
		});

		return {
			success: true,
			taskId,
			patientId,
			patientName: patientDisplayName,
			phone: callerPhoneE164,
			isNewLead,
			alertCardId,
		};
	}
}
