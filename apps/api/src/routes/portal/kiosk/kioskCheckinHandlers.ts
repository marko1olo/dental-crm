/**
 * apps/api/src/routes/portal/kiosk/kioskCheckinHandlers.ts
 *
 * Обработка чекина пациента у терминала: обновление статуса, ПЭП-согласия, талон очереди
 * (Мандаты 8e: 1 клик, 8n: малая клиника без бюрократии, 8ap: маскирование ПДн).
 */

import { createHash } from "node:crypto";
import type { PatientAdministrativeProfile } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	generatedDocuments,
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
	createFirstTimeAppointment,
	getDoctorAndCabinetInfo,
	kioskCheckinSchema,
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

	// 0a. Строгая валидация входящих параметров через Zod (Мандат 8be: предотвратить Postgres 22P02)
	const parseResult = kioskCheckinSchema.safeParse(request.body ?? {});
	if (!parseResult.success) {
		reply.status(400);
		return {
			success: false,
			error: "ValidationError",
			message: "Некорректные параметры запроса к терминалу самообслуживания.",
			details: parseResult.error.issues,
		};
	}
	const validBody = parseResult.data;

	const rawPhoneLast4 =
		typeof validBody.phoneLast4 === "string" ? validBody.phoneLast4.trim().replace(/\D/g, "") : "";
	const rawPhone =
		typeof validBody.patientPhone === "string" ? validBody.patientPhone.trim() : "";
	const rawCheckinCode =
		typeof validBody.checkinCode === "string" ? validBody.checkinCode.trim() : "";
	const rawPatientId =
		typeof validBody.patientId === "string" ? validBody.patientId.trim() : "";
	const rawOrgId =
		typeof validBody.organizationId === "string" ? validBody.organizationId.trim() : "";
	const isEmergency = isEmergencyOverride || Boolean(validBody.isEmergency);
	const isFirstTime = Boolean(validBody.isFirstTime) || validBody.kioskMode === "first_time";
	const patientFullName =
		typeof validBody.patientFullName === "string" ? validBody.patientFullName.trim() : "";
	const emergencyChiefComplaint =
		typeof validBody.emergencyChiefComplaint === "string" && validBody.emergencyChiefComplaint.trim()
			? validBody.emergencyChiefComplaint.trim()
			: "Острая зубная боль / Экстренный приём";

	const signedConsents = Array.isArray(validBody.signedConsents)
		? validBody.signedConsents.filter((c): c is string => typeof c === "string")
		: [];
	const somaticProfile =
		validBody.somaticProfile && typeof validBody.somaticProfile === "object"
			? (validBody.somaticProfile as Record<string, unknown>)
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
		isFirstTime,
		patientFullName,
	});

	if (!targetPatient) {
		reply.status(404);
		return {
			success: false,
			error: "PatientNotFound",
			message: "Пациент не найден в системе клиники. Пожалуйста, обратитесь к администратору на стойке регистрации.",
		};
	}

	// 3. Поиск приёма на сегодня или экстренное/первичное назначение
	let appointment: KioskAppointmentRecord | null = null;
	appointment = await lookupTodayAppointment(organizationId, targetPatient.id);

	if (!appointment && isEmergency) {
		appointment = await createEmergencyAppointment(
			organizationId,
			targetPatient.id,
			emergencyChiefComplaint,
		);
	}

	if (!appointment && isFirstTime) {
		appointment = await createFirstTimeAppointment(
			organizationId,
			targetPatient.id,
			patientFullName || targetPatient.fullName || "Первичный визит",
		);
	}

	if (!appointment) {
		reply.status(404);
		return {
			success: false,
			arrived: false,
			error: "AppointmentNotFound",
			message: "На сегодня активная запись на приём не найдена. Пожалуйста, обратитесь к администратору на стойке регистрации.",
		};
	}

	// 4. Определение кабинета и врача
	const { doctorName, cabinetName } = await getDoctorAndCabinetInfo(
		organizationId,
		appointment.doctorUserId,
		appointment.chairId,
	);

	const apptTimeStr = isEmergency
		? `Экстренный приём прямо сейчас (${cabinetName})`
		: isFirstTime
			? `Первичный приём прямо сейчас (${cabinetName})`
			: `Сегодня в ${appointment.startsAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} (${cabinetName})`;

	// SEV-2: Защита от ложной явки при совпадении только 4 цифр телефона
	// Требуем подтверждения: полный номер телефона, код подтверждения, либо экстренный/первичный поток
	const hasFullPhone = Boolean(rawPhone && rawPhone.replace(/\D/g, "").length >= 10);
	const hasCheckinCode = Boolean(rawCheckinCode && rawCheckinCode.length >= 4);
	const isVerifiedIdentity = isEmergency || isFirstTime || Boolean(rawPatientId) || hasFullPhone || hasCheckinCode;

	if (!isVerifiedIdentity) {
		return {
			success: true,
			arrived: false,
			requiresVerification: true,
			patientName: maskPatientName(targetPatient.fullName),
			appointmentTime: apptTimeStr,
			doctorName,
			cabinetName,
			message: "Для подтверждения явки введите полный номер телефона или 4-значный код записи из SMS.",
		};
	}

	// 5. Генерация талона очереди (Э-xx для острой боли, П-xx для первичных, А-xx для плановых)
	const ticketPrefix = isEmergency ? "Э" : isFirstTime ? "П" : "А";
	const ticketSuffix = appointment.id.slice(-2).toUpperCase();
	const queueTicket = `Талон № ${ticketPrefix}-${ticketSuffix}`;

	// 6. Обновление статуса визита на 'arrived' и оповещение WebSocket
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
				patientId: targetPatient.id,
				status: "arrived",
				isEmergency,
				isFirstTime,
				chiefComplaint: isEmergency
					? emergencyChiefComplaint
					: isFirstTime
						? "Первичный визит / Осмотр и консультация"
						: undefined,
				patientMaskedName: maskPatientName(targetPatient.fullName),
				cabinetName,
				doctorName,
				queueTicket,
				updatedAt: new Date().toISOString(),
			},
		});
	} catch {
		// non-blocking broadcast
	}

	// 7. Сохранение согласий с ПЭП аудитом (63-ФЗ)
	if (signedConsents.length > 0) {
		await persistKioskConsents(
			organizationId,
			targetPatient,
			signedConsents,
			clientIp,
			request.headers["user-agent"] || "kiosk_tablet",
		);
	}

	// 8. Сохранение аллергий из соматической анкеты
	if (somaticProfile) {
		await persistKioskAllergies(organizationId, targetPatient.id, somaticProfile);
	}

	// SEV-2: Ноль утечки сырого patientId в клиентский ответ терминала
	return {
		success: true,
		arrived: true,
		isEmergency,
		isFirstTime,
		patientName: maskPatientName(targetPatient.fullName),
		appointmentTime: apptTimeStr,
		doctorName,
		cabinetName,
		queueTicket,
		visitStatus: isEmergency
			? "⚡ В холле / Ожидает экстренного врача"
			: isFirstTime
				? "🆕 В холле / Ожидает первичного осмотра и оформления"
				: "✓ Пациент в клинике / ожидает приёма",
	};
}

function mapConsentKindToDocumentKindAndTitle(consentKind: string): {
	kind:
		| "informed_consent"
		| "anesthesia_consent_log"
		| "personal_data_processing_consent"
		| "procedure_specific_consent_packet";
	title: string;
} {
	const normalized = consentKind.toLowerCase();
	if (normalized.includes("anest") || normalized.includes("анест")) {
		return {
			kind: "anesthesia_consent_log",
			title: "Информированное добровольное согласие на местное обезболивание",
		};
	}
	if (
		normalized.includes("pd") ||
		normalized.includes("пдн") ||
		normalized.includes("152")
	) {
		return {
			kind: "personal_data_processing_consent",
			title: "Согласие на обработку персональных данных (152-ФЗ)",
		};
	}
	if (normalized.includes("packet") || normalized.includes("пакет")) {
		return {
			kind: "procedure_specific_consent_packet",
			title: "Пакет информированных добровольных согласий на медицинские вмешательства",
		};
	}
	return {
		kind: "informed_consent",
		title: "Информированное добровольное согласие на стоматологическое лечение (ст. 20 № 323-ФЗ)",
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
			const docMeta = mapConsentKindToDocumentKindAndTitle(consentKind);
			const integrityHash = createHash("sha256")
				.update(`${targetPatient.id}:${consentKind}:${nowConsentIso}:${clientIp}`)
				.digest("hex");

			const signatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80"><rect width="100%" height="100%" fill="#f0fdf4" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="4,4" rx="8"/><text x="160" y="30" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803d">ПОДПИСАНО ЭЛЕКТРОННО (ПЭП 63-ФЗ)</text><text x="160" y="48" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#166534">Терминал саморегистрации • IP: ${clientIp}</text><text x="160" y="65" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#64748b">${nowConsent.toLocaleString("ru-RU")}</text></svg>`;

			// Физическая генерация документа в таблице generated_documents
			const [createdDoc] = await db
				.insert(generatedDocuments)
				.values({
					organizationId,
					patientId: targetPatient.id,
					kind: docMeta.kind,
					status: "issued",
					title: docMeta.title,
					signatureSvg,
					issuedSnapshotSha256: integrityHash,
					issuedAt: nowConsent,
					issuedSnapshotCreatedAt: nowConsent,
					payloadJson: JSON.stringify({
						consentKind,
						signatureMethod: "touchscreen_kiosk_pep",
						clientIp,
						integrityHash,
						signedAtIso: nowConsentIso,
						deviceMeta: userAgent,
					}),
				})
				.returning({ id: generatedDocuments.id });

			const generatedDocId = createdDoc?.id ?? null;

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
					.set({ grantedAt: nowConsent, revokedAt: null, documentId: generatedDocId })
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
					documentId: generatedDocId,
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

		const currentProfile: Partial<PatientAdministrativeProfile> =
			patientRow?.administrativeProfile ?? {};
		const currentConsentSignatures =
			(currentProfile.consentSignatures as Record<string, unknown> | undefined) || {};

		const updatedSignatures: Record<string, unknown> = { ...currentConsentSignatures };
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
				},
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
