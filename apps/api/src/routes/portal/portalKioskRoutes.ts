import { createHash, randomInt } from "node:crypto";
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

// Rate limiting store for public kiosk requests (anti brute-force / phone scraping)
export const kioskIpRequestCounts = new Map<string, { count: number; resetAt: number }>();
export const KIOSK_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 минут
export const KIOSK_MAX_ATTEMPTS_PER_IP = 25;

export function resetKioskRateLimitsForTesting(): void {
	kioskIpRequestCounts.clear();
}

/**
 * Privacy Masking (Mandate 8ap): В Kiosk-режиме для защиты персональных данных
 * третьим лицам в холле клиники отображается только Имя и первая буква фамилии («Иван И.» / «Анна С.»).
 */
export function maskPatientName(fullName: string | null | undefined): string {
	if (!fullName || typeof fullName !== "string") return "Пациент";
	const parts = fullName.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "Пациент";
	if (parts.length === 1) return parts[0]!;

	const p0 = parts[0]!;
	const p1 = parts[1]!;

	// В стандартных записях РФ порядок: Фамилия Имя [Отчество] -> "Имя Ф."
	return `${p1} ${p0[0]?.toUpperCase()}.`;
}

/** @deprecated Mandate 8ap: Use maskPatientName */
export const maskPatientName152Fz = maskPatientName;

interface SelfCheckinBody {
	organizationId?: unknown;
	phoneLast4?: unknown;
	patientPhone?: unknown;
	patientId?: unknown;
	checkinCode?: unknown;
	signedConsents?: unknown;
	somaticProfile?: unknown;
	isEmergency?: unknown;
	emergencyChiefComplaint?: unknown;
}

export async function registerPortalKioskRoutes(server: FastifyInstance): Promise<void> {
	// Kiosk Self-Checkin Endpoint (1-Touch Arrival, Statutory Consents, Somatic Profile)
	const handleSelfCheckin = async (
		request: FastifyRequest<{ Body: SelfCheckinBody }>,
		reply: FastifyReply,
	) => {
		// 0. Anti Brute-Force Rate Limiting
		const clientIp = request.ip || request.headers["x-forwarded-for"]?.toString() || "127.0.0.1";
		const nowTime = Date.now();
		const currentLimit = kioskIpRequestCounts.get(clientIp);

		if (currentLimit && nowTime < currentLimit.resetAt) {
			if (currentLimit.count >= KIOSK_MAX_ATTEMPTS_PER_IP) {
				reply.status(429);
				return {
					success: false,
					error: "TooManyRequests",
					message: "Превышен лимит запросов к терминалу. Пожалуйста, обратитесь к администратору на ресепшене.",
				};
			}
			currentLimit.count += 1;
		} else {
			kioskIpRequestCounts.set(clientIp, { count: 1, resetAt: nowTime + KIOSK_RATE_LIMIT_WINDOW_MS });
		}

		const rawBody = request.body || {};
		const rawPhoneLast4 =
			typeof rawBody.phoneLast4 === "string" ? rawBody.phoneLast4.trim().replace(/\D/g, "") : "";
		const rawPhone =
			typeof rawBody.patientPhone === "string" ? rawBody.patientPhone.trim() : "";
		const rawPatientId =
			typeof rawBody.patientId === "string" ? rawBody.patientId.trim() : "";
		const rawOrgId =
			typeof rawBody.organizationId === "string" ? rawBody.organizationId.trim() : "";
		const isEmergency = Boolean(rawBody.isEmergency);
		const emergencyChiefComplaint =
			typeof rawBody.emergencyChiefComplaint === "string"
				? rawBody.emergencyChiefComplaint.trim()
				: "Острая зубная боль / Экстренный приём";

		const signedConsents = Array.isArray(rawBody.signedConsents)
			? rawBody.signedConsents.filter((c): c is string => typeof c === "string")
			: [];
		const somaticProfile =
			rawBody.somaticProfile && typeof rawBody.somaticProfile === "object"
				? (rawBody.somaticProfile as Record<string, unknown>)
				: null;

		// 1. Resolve Organization ID with Strict Tenant Isolation
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

		// If emergency and no patient found — create or find guest emergency patient
		if (!targetPatient && isEmergency) {
			await withTenantCtx(organizationId, async () => {
				const [newEmergencyPatient] = await db
					.insert(patients)
					.values({
						organizationId,
						fullName: "Пациент Экстренный",
						phone: rawPhone || (rawPhoneLast4 ? `+7 (000) 000-${rawPhoneLast4}` : null),
						notes: `Саморегистрация через терминал: ${emergencyChiefComplaint}`,
					})
					.returning({
						id: patients.id,
						fullName: patients.fullName,
						phone: patients.phone,
						organizationId: patients.organizationId,
					});
				if (newEmergencyPatient) {
					targetPatient = newEmergencyPatient;
				}
			});
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

		// Handle Emergency Appointment Creation if patient has no scheduled appointment today
		if (!appointment && isEmergency && targetPatient) {
			await withTenantCtx(organizationId, async () => {
				const emergencyEnds = new Date(now.getTime() + 30 * 60 * 1000);
				const [createdAppt] = await db
					.insert(appointments)
					.values({
						organizationId,
						patientId: targetPatient!.id,
						status: "arrived",
						startsAt: now,
						endsAt: emergencyEnds,
						comment: `⚡ ОСТРАЯ БОЛЬ (Экстренный приём с терминала): ${emergencyChiefComplaint}`,
					})
					.returning({
						id: appointments.id,
						startsAt: appointments.startsAt,
						endsAt: appointments.endsAt,
						status: appointments.status,
						doctorUserId: appointments.doctorUserId,
						chairId: appointments.chairId,
					});
				if (createdAppt) {
					appointment = createdAppt;
				}
			});
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

		// Generate Queue Ticket (Э-xx for emergency, А-xx for standard)
		const ticketPrefix = isEmergency ? "Э" : "А";
		const ticketSuffix = appointment
			? appointment.id.slice(-2).toUpperCase()
			: randomInt(10, 100).toString();
		const queueTicket = `Талон № ${ticketPrefix}-${ticketSuffix}`;

		// 4. Update Appointment status to 'arrived' if found
		if (appointment) {
			await withTenantCtx(organizationId, async () => {
				await db
					.update(appointments)
					.set({ status: "arrived" })
					.where(
						and(
							eq(appointments.id, appointment!.id),
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
						isEmergency,
						chiefComplaint: isEmergency ? emergencyChiefComplaint : undefined,
						patientMaskedName: maskPatientName(targetPatient?.fullName),
						cabinetName,
						doctorName,
						queueTicket,
						updatedAt: new Date().toISOString(),
					},
				});
			} catch {
				// non-blocking broadcast
			}
		}

		// 5. Persist statutory consents with 63-FZ / 152-FZ Simple Electronic Signature (ПЭП) Audit Trail
		if (targetPatient && signedConsents.length > 0) {
			const nowConsent = new Date();
			const nowConsentIso = nowConsent.toISOString();
			const userAgent = request.headers["user-agent"] || "kiosk_tablet";

			await withTenantCtx(organizationId, async () => {
				for (const consentKind of signedConsents) {
					// Check existing
					const existing = await db
						.select({ id: patientConsents.id })
						.from(patientConsents)
						.where(
							and(
								eq(patientConsents.patientId, targetPatient!.id),
								eq(patientConsents.organizationId, organizationId),
								eq(patientConsents.kind, consentKind),
							),
						)
						.limit(1);

					if (existing.length > 0 && existing[0]) {
						await db
							.update(patientConsents)
							.set({ grantedAt: nowConsent, revokedAt: null })
							.where(
								and(
									eq(patientConsents.id, existing[0].id),
									eq(patientConsents.organizationId, organizationId),
								),
							);
					} else {
						await db.insert(patientConsents).values({
							organizationId,
							patientId: targetPatient!.id,
							kind: consentKind,
							grantedAt: nowConsent,
						});
					}
				}

				// Update administrative profile with touchscreen PEP signature audit
				const [patientRow] = await db
					.select({ administrativeProfile: patients.administrativeProfile })
					.from(patients)
					.where(
						and(
							eq(patients.id, targetPatient!.id),
							eq(patients.organizationId, organizationId),
						),
					)
					.limit(1);

				const currentProfile =
					(patientRow?.administrativeProfile as Record<string, unknown> | null) || {};
				const currentConsentSignatures =
					(currentProfile.consentSignatures as Record<string, unknown> | undefined) || {};

				const updatedSignatures = { ...currentConsentSignatures };
				for (const consentKind of signedConsents) {
					const integrityHash = createHash("sha256")
						.update(`${targetPatient!.id}:${consentKind}:${nowConsentIso}:${clientIp}`)
						.digest("hex");

					updatedSignatures[consentKind] = {
						consentId: consentKind,
						signatureMethod: "touchscreen_kiosk_pep",
						clientIp,
						ipAddress: clientIp,
						integrityHash,
						signedAtIso: nowConsentIso,
						deviceMeta: userAgent,
					};
				}

				await db
					.update(patients)
					.set({
						administrativeProfile: {
							...currentProfile,
							consentSignatures: updatedSignatures,
						} as any,
						updatedAt: nowConsent,
					})
					.where(
						and(
							eq(patients.id, targetPatient!.id),
							eq(patients.organizationId, organizationId),
						),
					);
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
						patientId: targetPatient!.id,
						allergenGroup: "dental_anesthetics_or_antibiotics",
						reactionSeverity: "high",
						clinicalManifestations: detailsStr.slice(0, 255),
						notes: "Самочекин терминал",
					});
				});
			}
		}

		const apptTimeStr = appointment
			? isEmergency
				? `Экстренный приём прямо сейчас (${cabinetName})`
				: `Сегодня в ${appointment.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} (${cabinetName})`
			: isEmergency
				? "Экстренный приём (вызов дежурного врача)"
				: "Сегодня (приём по очереди)";

		const maskedName = maskPatientName(targetPatient?.fullName);

		return {
			success: true,
			arrived: Boolean(appointment),
			isEmergency,
			patientId: targetPatient?.id || rawPatientId || "",
			// 152-ФЗ Masked Name: strictly no full passport / card leaks on reception display
			patientName: maskedName,
			appointmentTime: apptTimeStr,
			doctorName,
			cabinetName,
			queueTicket,
			visitStatus: isEmergency
				? "⚡ В холле / Ожидает экстренного врача"
				: appointment
					? "✓ Пациент в клинике / ожидает приёма"
					: "Ожидает администратора",
		};
	};

	server.post("/self-checkin", handleSelfCheckin);
	server.post("/kiosk/checkin", handleSelfCheckin);
	server.post("/kiosk/emergency-checkin", async (request, reply) => {
		const body = (request.body || {}) as SelfCheckinBody;
		return handleSelfCheckin(
			Object.assign(request, { body: { ...body, isEmergency: true } }),
			reply,
		);
	});
}
