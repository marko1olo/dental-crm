import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { communicationEvents, patients } from "../../../db/schema.js";
import type { TelephonyWebhookPayload } from "../types.js";

function normalizePhoneNumber(rawPhone: string): string {
	const digits = rawPhone.replace(/\D/g, "");
	if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) return `+7${digits.slice(1)}`;
	if (digits.length === 10) return `+7${digits}`;
	return rawPhone.trim();
}

export async function processTelephonyWebhook(orgId: string, data: TelephonyWebhookPayload) {
	const { callId, callerNumber, direction, status, durationSeconds, recordingUrl, audioFormat, transcriptionText, actorUserId, clinicId } = data;
	const phoneToSearch = normalizePhoneNumber(callerNumber);
	const digits = callerNumber.replace(/\D/g, "");
	const national10 = digits.length >= 10 ? digits.slice(-10) : "";

	if (callId) {
		const [existingCall] = await db.select({ id: communicationEvents.id }).from(communicationEvents).where(
			and(eq(communicationEvents.organizationId, orgId), sql`${communicationEvents.message} LIKE ${`%[callId:${callId}]%`}`),
		).limit(1);
		if (existingCall) return { duplicate: true, event: existingCall };
	}

	const [matchedPatient] = await db.select({ id: patients.id, fullName: patients.fullName }).from(patients).where(
		and(
			eq(patients.organizationId, orgId),
			or(
				eq(patients.phone, phoneToSearch),
				eq(patients.phone, callerNumber),
				...(national10.length === 10 ? [sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${national10}%`}`] : []),
			),
		),
	).limit(1);

	const eventStatus = status === "answered" ? "completed" : status === "missed" ? "needs_call" : status;
	const note = transcriptionText ? `Звонок (${direction}): ${transcriptionText}` : `Звонок (${direction}) от ${callerNumber} [callId:${callId}]`;

	let effectivePatientId = matchedPatient?.id;
	let effectivePatientName = matchedPatient?.fullName ?? null;

	if (!effectivePatientId) {
		const fallbackName = callerNumber ? `Входящий вызов ${callerNumber}` : "Неизвестный абонент";
		const [newPatient] = await db.insert(patients).values({
			organizationId: orgId,
			fullName: fallbackName,
			phone: callerNumber || null,
			notes: `Автоматически создан из телефонии (${direction}${callId ? `, callId: ${callId}` : ""})`,
			status: "active",
		}).returning();
		if (newPatient) {
			effectivePatientId = newPatient.id;
			effectivePatientName = newPatient.fullName;
		}
	}

	if (!effectivePatientId) return { error: "PatientCreationError" };

	const [inserted] = await db.insert(communicationEvents).values({
		organizationId: orgId,
		clinicId: clinicId ?? null,
		patientId: effectivePatientId,
		actorUserId: actorUserId ?? null,
		channel: "phone",
		direction: direction as "inbound" | "outbound",
		status: eventStatus as any,
		message: note,
		recordingUrl: recordingUrl ?? null,
		durationSeconds: durationSeconds ?? null,
		audioFormat: audioFormat ?? "mp3",
	}).returning();

	return {
		success: true,
		event: inserted,
		matchedPatientId: effectivePatientId,
		matchedPatientName: effectivePatientName,
	};
}
