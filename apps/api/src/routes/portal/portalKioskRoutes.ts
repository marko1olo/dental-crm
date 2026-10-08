import { randomInt } from "node:crypto";
import { and, eq, gte, lt, notInArray, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	chairs,
	organizations,
	patientConsents,
	patientDrugAllergies,
	patients,
	users,
} from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";

export async function registerPortalKioskRoutes(server: FastifyInstance): Promise<void> {
	// Kiosk Self-Checkin Endpoint (1-Touch Arrival, Statutory Consents, Somatic Profile)
	const handleSelfCheckin = async (
		request: FastifyRequest<{
			Body: {
				organizationId?: unknown;
				phoneLast4?: unknown;
				patientPhone?: unknown;
				patientId?: unknown;
				checkinCode?: unknown;
				signedConsents?: unknown;
				somaticProfile?: unknown;
			};
		}>,
		reply: FastifyReply,
	) => {
		const rawBody = request.body || {};
		const rawPhoneLast4 =
			typeof rawBody.phoneLast4 === "string" ? rawBody.phoneLast4.trim().replace(/\D/g, "") : "";
		const rawPhone =
			typeof rawBody.patientPhone === "string" ? rawBody.patientPhone.trim() : "";
		const rawPatientId =
			typeof rawBody.patientId === "string" ? rawBody.patientId.trim() : "";
		const rawOrgId =
			typeof rawBody.organizationId === "string" ? rawBody.organizationId.trim() : "";
		const signedConsents = Array.isArray(rawBody.signedConsents)
			? rawBody.signedConsents.filter((c): c is string => typeof c === "string")
			: [];
		const somaticProfile =
			rawBody.somaticProfile && typeof rawBody.somaticProfile === "object"
				? (rawBody.somaticProfile as Record<string, unknown>)
				: null;

		// 1. Resolve Organization ID
		let organizationId = rawOrgId;
		if (!organizationId) {
			const [firstOrg] = await db
				.select({ id: organizations.id })
				.from(organizations)
				.limit(1);
			if (firstOrg) {
				organizationId = firstOrg.id;
			}
		}

		if (!organizationId) {
			reply.status(404);
			return {
				success: false,
				error: "OrganizationNotFound",
				message: "Клиника не найдена в системе.",
			};
		}

		// 2. Resolve Patient
		let targetPatient: {
			id: string;
			fullName: string | null;
			phone: string | null;
			organizationId: string;
		} | null = null;

		if (rawPatientId) {
			const [p] = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					organizationId: patients.organizationId,
				})
				.from(patients)
				.where(and(eq(patients.id, rawPatientId), eq(patients.organizationId, organizationId)))
				.limit(1);
			if (p) targetPatient = p;
		}

		if (!targetPatient && rawPhone) {
			const phoneDigits = rawPhone.replace(/\D/g, "");
			const [p] = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					organizationId: patients.organizationId,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						or(eq(patients.phone, rawPhone), eq(patients.phone, phoneDigits)),
					),
				)
				.limit(1);
			if (p) targetPatient = p;
		}

		// If searching by phoneLast4:
		if (!targetPatient && rawPhoneLast4.length === 4) {
			const candidates = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
					organizationId: patients.organizationId,
				})
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						sql`RIGHT(REGEXP_REPLACE(${patients.phone}, '\\D', '', 'g'), 4) = ${rawPhoneLast4}`,
					),
				)
				.limit(10);

			if (candidates.length === 1 && candidates[0]) {
				targetPatient = candidates[0];
			} else if (candidates.length > 1) {
				const now = new Date();
				const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
				const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

				for (const cand of candidates) {
					const [apt] = await db
						.select({ id: appointments.id })
						.from(appointments)
						.where(
							and(
								eq(appointments.organizationId, organizationId),
								eq(appointments.patientId, cand.id),
								gte(appointments.startsAt, startOfDay),
								lt(appointments.startsAt, endOfDay),
								notInArray(appointments.status, ["cancelled"]),
							),
						)
						.limit(1);
					if (apt) {
						targetPatient = cand;
						break;
					}
				}
				if (!targetPatient && candidates[0]) {
					targetPatient = candidates[0];
				}
			}
		}

		// 3. Find Today's Appointment
		const now = new Date();
		const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
		const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

		let appointment: {
			id: string;
			startsAt: Date;
			endsAt: Date;
			status: string;
			doctorUserId: string | null;
			chairId: string | null;
		} | null = null;

		if (targetPatient) {
			const [apt] = await db
				.select({
					id: appointments.id,
					startsAt: appointments.startsAt,
					endsAt: appointments.endsAt,
					status: appointments.status,
					doctorUserId: appointments.doctorUserId,
					chairId: appointments.chairId,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, organizationId),
						eq(appointments.patientId, targetPatient.id),
						gte(appointments.startsAt, startOfDay),
						lt(appointments.startsAt, endOfDay),
						notInArray(appointments.status, ["cancelled"]),
					),
				)
				.orderBy(appointments.startsAt)
				.limit(1);

			if (apt) {
				appointment = apt;
			}
		}

		// Doctor & Chair details
		let doctorName = "Дежурный врач-стоматолог";
		let cabinetName = "Кабинет 1";

		if (appointment?.doctorUserId) {
			const [doc] = await db
				.select({ fullName: users.fullName })
				.from(users)
				.where(
					and(
						eq(users.id, appointment.doctorUserId),
						eq(users.organizationId, organizationId),
					),
				)
				.limit(1);
			if (doc?.fullName) {
				doctorName = doc.fullName;
			}
		}

		if (appointment?.chairId) {
			const [chair] = await db
				.select({ name: chairs.name })
				.from(chairs)
				.where(
					and(
						eq(chairs.id, appointment.chairId),
						eq(chairs.organizationId, organizationId),
					),
				)
				.limit(1);
			if (chair?.name) {
				cabinetName = chair.name;
			}
		}

		// Generate Queue Ticket
		const ticketSuffix = appointment
			? appointment.id.slice(-2).toUpperCase()
			: randomInt(10, 100).toString();
		const queueTicket = `Талон № А-${ticketSuffix}`;

		// 4. Update Appointment status to 'arrived' if found
		if (appointment) {
			await withTenantCtx(organizationId, async () => {
				await db
					.update(appointments)
					.set({ status: "arrived" })
					.where(
						and(
							eq(appointments.id, appointment.id),
							eq(appointments.organizationId, organizationId),
						),
					);
			});

			try {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						id: appointment.id,
						patientId: targetPatient?.id,
						status: "arrived",
						updatedAt: new Date().toISOString(),
					},
				});
			} catch {
				// non-blocking broadcast
			}
		}

		// 5. Persist statutory consents if signed
		if (targetPatient && signedConsents.length > 0) {
			await withTenantCtx(organizationId, async () => {
				for (const consentKind of signedConsents) {
					await db.insert(patientConsents).values({
						organizationId,
						patientId: targetPatient.id,
						kind: consentKind,
						grantedAt: new Date(),
					});
				}
			});
		}

		// 6. Persist allergies if reported in somatic profile
		if (targetPatient && somaticProfile) {
			const allergies = somaticProfile.allergies as Record<string, unknown> | undefined;
			const detailsStr = typeof allergies?.details === "string" ? allergies.details.trim() : "";
			if (allergies?.hasAllergies && detailsStr) {
				await withTenantCtx(organizationId, async () => {
					await db.insert(patientDrugAllergies).values({
						organizationId,
						patientId: targetPatient.id,
						allergenGroup: "dental_anesthetics_or_antibiotics",
						reactionSeverity: "high",
						clinicalManifestations: detailsStr.slice(0, 255),
						notes: "Самочекин терминал",
					});
				});
			}
		}

		const apptTimeStr = appointment
			? `Сегодня в ${appointment.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} (${cabinetName})`
			: "Сегодня (приём по очереди)";

		return {
			success: true,
			arrived: Boolean(appointment),
			patientId: targetPatient?.id || rawPatientId || "",
			patientName: targetPatient?.fullName || "Пациент",
			appointmentTime: apptTimeStr,
			doctorName,
			cabinetName,
			queueTicket,
			visitStatus: appointment ? "В холле / Ожидает приёма" : "Ожидает администратора",
		};
	};

	server.post("/self-checkin", handleSelfCheckin);
	server.post("/kiosk/checkin", handleSelfCheckin);
}
