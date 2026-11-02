/**
 * apps/api/src/routes/portal/kiosk/kioskCheckinHandlers.ts
 *
 * Обработка чекина пациента у терминала: обновление статуса, ПЭП-согласия, талон очереди
 * (Мандаты 8e: 1 клик, 8n: малая клиника без бюрократии, 8ap: маскирование ПДн).
 */

import { createHash, randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	patientConsents,
	patientDrugAllergies,
	patients,
} from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";
import { checkKioskRateLimit, maskPatientName } from "./kioskRateLimiter.js";
import {
	type KioskAppointmentRecord,
	type KioskPatientRecord,
	type SelfCheckinBody,
	createEmergencyAppointment,
	getDoctorAndCabinetInfo,
	lookupPatient,
	lookupTodayAppointment,
	resolveOrganizationId,
} from "./kioskPatientLookupHandlers.js";

export async function handleKioskCheckinRequest(
	request: FastifyRequest<{ Body: SelfCheckinBody }>,
	reply: FastifyReply,
	isEmergencyOverride = false,
) {
	// 0. Защита от брутфорса и перебора телефонов
	const clientIp = request.ip || request.headers["x-forwarded-for"]?.toString() || "127.0.0.1";
	const rateLimit = checkKioskRateLimit(clientIp);
	if (!rateLimit.allowed) {
		reply.status(429);
		return {
			success: false,
			error: "TooManyRequests",
			message: rateLimit.message,
		};
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
	const isEmergency = isEmergencyOverride || Boolean(rawBody.isEmergency);
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

	// 1. Определение клиники
	const organizationId = await resolveOrganizationId(rawOrgId);
	if (!organizationId) {
		reply.status(404);
		return {
			success: false,
			error: "OrganizationNotFound",
			message: "Клиника не найдена в системе.",
		};
	}

	// 2. Поиск или создание пациента
	const targetPatient = await lookupPatient(organizationId, {
		rawPatientId,
		rawPhone,
		rawPhoneLast4,
		isEmergency,
		emergencyChiefComplaint,
	});

	// 3. Поиск приёма на сегодня или экстренное назначение
	let appointment: KioskAppointmentRecord | null = null;
	if (targetPatient) {
		appointment = await lookupTodayAppointment(organizationId, targetPatient.id);
	}

	if (!appointment && isEmergency && targetPatient) {
		appointment = await createEmergencyAppointment(
			organizationId,
			targetPatient.id,
			emergencyChiefComplaint,
		);
	}

	// 4. Определение кабинета и врача
	const { doctorName, cabinetName } = await getDoctorAndCabinetInfo(
		organizationId,
		appointment?.doctorUserId ?? null,
		appointment?.chairId ?? null,
	);

	// 5. Генерация талона очереди (Э-xx для острой боли, А-xx для плановых)
	const ticketPrefix = isEmergency ? "Э" : "А";
	const ticketSuffix = appointment
		? appointment.id.slice(-2).toUpperCase()
		: randomInt(10, 100).toString();
	const queueTicket = `Талон № ${ticketPrefix}-${ticketSuffix}`;

	// 6. Обновление статуса визита на 'arrived' и оповещение WebSocket
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

	// 7. Сохранение согласий с ПЭП аудитом (63-ФЗ)
	if (targetPatient && signedConsents.length > 0) {
		await persistKioskConsents(
			organizationId,
			targetPatient,
			signedConsents,
			clientIp,
			request.headers["user-agent"] || "kiosk_tablet",
		);
	}

	// 8. Сохранение аллергий из соматической анкеты
	if (targetPatient && somaticProfile) {
		await persistKioskAllergies(organizationId, targetPatient.id, somaticProfile);
	}

	const apptTimeStr = appointment
		? isEmergency
			? `Экстренный приём прямо сейчас (${cabinetName})`
			: `Сегодня в ${appointment.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} (${cabinetName})`
		: isEmergency
			? "Экстренный приём (вызов дежурного врача)"
			: "Сегодня (приём по очереди)";

	return {
		success: true,
		arrived: Boolean(appointment),
		isEmergency,
		patientId: targetPatient?.id || rawPatientId || "",
		patientName: maskPatientName(targetPatient?.fullName),
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
}

async function persistKioskConsents(
	organizationId: string,
	targetPatient: KioskPatientRecord,
	signedConsents: string[],
	clientIp: string,
	userAgent: string,
) {
	const nowConsent = new Date();
	const nowConsentIso = nowConsent.toISOString();

	await withTenantCtx(organizationId, async () => {
		for (const consentKind of signedConsents) {
			const existing = await db
				.select({ id: patientConsents.id })
				.from(patientConsents)
				.where(
					and(
						eq(patientConsents.patientId, targetPatient.id),
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
					patientId: targetPatient.id,
					kind: consentKind,
					grantedAt: nowConsent,
				});
			}
		}

		// Обновление электронно-цифрового следа ПЭП в профиле
		const [patientRow] = await db
			.select({ administrativeProfile: patients.administrativeProfile })
			.from(patients)
			.where(
				and(
					eq(patients.id, targetPatient.id),
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
				.update(`${targetPatient.id}:${consentKind}:${nowConsentIso}:${clientIp}`)
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
					eq(patients.id, targetPatient.id),
					eq(patients.organizationId, organizationId),
				),
			);
	});
}

async function persistKioskAllergies(
	organizationId: string,
	patientId: string,
	somaticProfile: Record<string, unknown>,
) {
	const allergies = somaticProfile.allergies as Record<string, unknown> | undefined;
	const detailsStr = typeof allergies?.details === "string" ? allergies.details.trim() : "";
	if (allergies?.hasAllergies && detailsStr) {
		await withTenantCtx(organizationId, async () => {
			await db.insert(patientDrugAllergies).values({
				organizationId,
				patientId,
				allergenGroup: "dental_anesthetics_or_antibiotics",
				reactionSeverity: "high",
				clinicalManifestations: detailsStr.slice(0, 255),
				notes: "Самочекин терминал",
			});
		});
	}
}
