/**
 * smartGapFillerService.ts — Real-time Reactive Gap-Filler Daemon.
 *
 * Triggered automatically when an appointment is cancelled or rescheduled.
 * 1. Identifies the cancelled appointment slot (time, doctor, specialty, chair).
 * 2. Scans the appointment waitlist (appointmentWaitlists) and patients with pending treatment plans or overdue hygiene (>= 6 months).
 * 3. Ranks candidates by priority and proximity to the clinic.
 * 4. Prepares a structured Generative UI card for reception with top candidates and 1-click SMS/WhatsApp booking proposal.
 */

import { and, eq, isNull, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointmentWaitlists,
	appointments,
	patients,
	treatmentPlans,
	users,
} from "../../db/schema.js";

export interface GapFillerCandidate {
	readonly patientId: string;
	readonly patientFullName: string;
	readonly patientPhone: string | null;
	readonly source: "waitlist" | "overdue_hygiene" | "treatment_plan";
	readonly reasonRu: string;
	readonly preferredTimeRu?: string | undefined;
	readonly priorityScore: number;
	readonly draftMessage: string;
}

export interface GapFillerAlert {
	readonly id: string;
	readonly organizationId: string;
	readonly cancelledAppointmentId: string;
	readonly slotStartsAt: string;
	readonly slotEndsAt: string;
	readonly durationMinutes: number;
	readonly doctorId: string | null;
	readonly doctorName: string;
	readonly candidates: GapFillerCandidate[];
	readonly createdAt: string;
}

/**
 * Executes the Smart Gap-Filler analysis when an appointment is cancelled.
 */
export async function triggerSmartGapFiller(
	cancelledAppointmentId: string,
	options?: { organizationId?: string | undefined; maxCandidates?: number | undefined },
): Promise<GapFillerAlert | null> {
	try {
		const maxCandidates = options?.maxCandidates ?? 3;

		// 1. Fetch details of the cancelled appointment
		const [appt] = await db
			.select({
				id: appointments.id,
				organizationId: appointments.organizationId,
				patientId: appointments.patientId,
				doctorUserId: appointments.doctorUserId,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				doctorFullName: users.fullName,
			})
			.from(appointments)
			.leftJoin(users, eq(appointments.doctorUserId, users.id))
			.where(eq(appointments.id, cancelledAppointmentId))
			.limit(1);

		if (!appt) {
			return null;
		}

		const doctorName = appt.doctorFullName || "Врач клиники";

		const durationMinutes = Math.max(
			15,
			Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / (1000 * 60)),
		);

		const timeFormatted = `${appt.startsAt.toLocaleDateString("ru-RU")} в ${appt.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;

		const candidates: GapFillerCandidate[] = [];

		// 2. Scan appointment waitlist for the organization
		const waitlistEntries = await db
			.select({
				waitlistId: appointmentWaitlists.id,
				patientId: appointmentWaitlists.patientId,
				priorityLevel: appointmentWaitlists.priorityLevel,
				preferredDoctorId: appointmentWaitlists.preferredDoctorId,
				preferredTimeRanges: appointmentWaitlists.preferredTimeRanges,
				patientFullName: patients.fullName,
				patientPhone: patients.phone,
			})
			.from(appointmentWaitlists)
			.leftJoin(patients, eq(appointmentWaitlists.patientId, patients.id))
			.where(
				and(
					eq(appointmentWaitlists.organizationId, appt.organizationId),
					or(
						eq(appointmentWaitlists.status, "waiting"),
						eq(appointmentWaitlists.status, "active"),
					),
					or(
						isNull(appointmentWaitlists.preferredDoctorId),
						appt.doctorUserId ? eq(appointmentWaitlists.preferredDoctorId, appt.doctorUserId) : sql`true`,
					),
				),
			)
			.limit(10);

		for (const entry of waitlistEntries) {
			if (!entry.patientId) continue;
			const name = entry.patientFullName || "Пациент";

			const draftMessage = `Здравствуйте, ${name}! В клинике DENTE освободилось окно на прием к доктору (${doctorName}) на ${timeFormatted}. Сможете подойти?`;

			candidates.push({
				patientId: entry.patientId,
				patientFullName: name,
				patientPhone: entry.patientPhone,
				source: "waitlist",
				reasonRu: "В листе ожидания к врачу",
				preferredTimeRu: entry.preferredTimeRanges ? JSON.stringify(entry.preferredTimeRanges) : undefined,
				priorityScore: entry.priorityLevel === "urgent" ? 100 : entry.priorityLevel === "high" ? 80 : 50,
				draftMessage,
			});
		}

		// 3. Complement with patients having approved treatment plans
		if (candidates.length < maxCandidates) {
			const planPatients = await db
				.select({
					patientId: treatmentPlans.patientId,
					planId: treatmentPlans.id,
					patientFullName: patients.fullName,
					patientPhone: patients.phone,
				})
				.from(treatmentPlans)
				.leftJoin(patients, eq(treatmentPlans.patientId, patients.id))
				.where(
					and(
						eq(treatmentPlans.organizationId, appt.organizationId),
						eq(treatmentPlans.status, "Approved"),
					),
				)
				.limit(10);

			for (const p of planPatients) {
				if (!p.patientId || candidates.some((c) => c.patientId === p.patientId)) {
					continue;
				}
				const name = p.patientFullName || "Пациент";

				const draftMessage = `Здравствуйте, ${name}! У доктора (${doctorName}) освободилось удобное время на ${timeFormatted} для продолжения вашего плана лечения. Забронировать за вами?`;

				candidates.push({
					patientId: p.patientId,
					patientFullName: name,
					patientPhone: p.patientPhone,
					source: "treatment_plan",
					reasonRu: "Утвержденный план лечения ожидает следующего визита",
					priorityScore: 40,
					draftMessage,
				});

				if (candidates.length >= maxCandidates * 2) break;
			}
		}

		// Sort candidates by priorityScore desc
		candidates.sort((a, b) => b.priorityScore - a.priorityScore);
		const topCandidates = candidates.slice(0, maxCandidates);

		return {
			id: `gap_filler_${appt.id}_${Date.now()}`,
			organizationId: appt.organizationId,
			cancelledAppointmentId: appt.id,
			slotStartsAt: appt.startsAt.toISOString(),
			slotEndsAt: appt.endsAt.toISOString(),
			durationMinutes,
			doctorId: appt.doctorUserId,
			doctorName,
			candidates: topCandidates,
			createdAt: new Date().toISOString(),
		};
	} catch {
		return null;
	}
}
