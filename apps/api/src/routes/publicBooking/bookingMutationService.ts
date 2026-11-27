import { and, eq, gt, ilike, inArray, lt, notInArray, or } from "drizzle-orm";
import { withSavepoint } from "../../db/rls.js";
import {
	appointments,
	chairs,
	patientArchiveReasonsAndBlacklists,
	patientConsents,
	patients,
	users,
} from "../../db/schema.js";
import { isPatientBookingBlocked } from "../../db/patientArchiveReasonsAndBlacklistsQuery.js";
import {
	acquireCanonicalScheduleAdvisoryLocks,
	findConflictingTimeReservation,
} from "../../db/appointmentsQueryModules/scheduleReservationLockHelpers.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import {
	nameFuzzySimilarity,
	nameKey,
} from "../../services/patients/duplicateDetection.js";
import { FREED_APPOINTMENT_STATUSES } from "../appointmentErrors.js";
import { normalizePhone } from "@dental/shared";
import { normalizePhoneDigits } from "./slotAvailabilityEngine.js";

const logger = createApiLogger("bookingMutationService");

export interface BookingMutationParams {
	organizationId: string;
	doctorId: string;
	startDate: Date;
	endDate: Date;
	patientName: string;
	patientPhone: string;
	patientId?: string | undefined;
	comment?: string | undefined;
	source?: string | undefined;
	utmSource?: string | undefined;
	utmCampaign?: string | undefined;
	utmMedium?: string | undefined;
	idempotencyKey?: string | undefined;
	status?: "planned" | "confirmed" | undefined;
	hasAgreedToPrivacy?: boolean | undefined;
}

export type BookingMutationResult =
	| { conflict: true }
	| {
			conflict: false;
			blocked: true;
			status: number;
			error: string;
			message: string;
	  }
	| {
			conflict: false;
			blocked?: false;
			appointment: typeof appointments.$inferSelect;
			patientId?: string;
	  };

export type BookingTx =
	| Parameters<Parameters<typeof import("../../db/client.js").db.transaction>[0]>[0]
	| Parameters<Parameters<import("../../db/rls.js").TenantDb["transaction"]>[0]>[0]
	| import("../../db/rls.js").TenantDb;

/**
 * Executes the atomic booking transaction with canonical resource lock hierarchy:
 * Chair (Level 1) -> Doctor (Level 2) -> Patient (Level 3)
 */
export async function executeBookingTransaction(
	tx: BookingTx,
	params: BookingMutationParams,
): Promise<BookingMutationResult> {
	const {
		organizationId,
		doctorId,
		startDate,
		endDate,
		patientName,
		patientPhone,
		comment,
	} = params;

	// 1. Canonical Resource Lock Hierarchy: Advisory -> Chairs (all active, sorted) -> Doctor -> Patient
	// Lock all active chairs before Doctor/Patient so alternate-chair fallback never inverts lock order (40P01).
	const activeChairs = await tx
		.select({ id: chairs.id, name: chairs.name })
		.from(chairs)
		.where(
			and(
				eq(chairs.organizationId, organizationId),
				eq(chairs.isActive, true),
			),
		);

	const sortedChairs = [...activeChairs].sort((a, b) =>
		a.id.localeCompare(b.id),
	);
	await acquireCanonicalScheduleAdvisoryLocks(tx, organizationId, {
		chairIds: sortedChairs.map((c) => c.id),
		doctorUserId: doctorId,
	});

	if (sortedChairs.length > 0) {
		await tx
			.select({ id: chairs.id })
			.from(chairs)
			.where(
				and(
					eq(chairs.organizationId, organizationId),
					inArray(chairs.id, sortedChairs.map((c) => c.id)),
				),
			)
			.orderBy(chairs.id)
			.for("update");
	}

	let selectedChairId: string | null = null;
	if (sortedChairs.length > 0) {
		for (const chair of sortedChairs) {
			const reserved = await findConflictingTimeReservation(tx, organizationId, {
				startsAt: startDate,
				endsAt: endDate,
				chairId: chair.id,
				chairName: chair.name,
			});
			if (reserved) continue;

			const [occupied] = await tx
				.select({ id: appointments.id })
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, organizationId),
						eq(appointments.chairId, chair.id),
						lt(appointments.startsAt, endDate),
						gt(appointments.endsAt, startDate),
						notInArray(appointments.status, [
							...FREED_APPOINTMENT_STATUSES,
						]),
					),
				)
				.limit(1);

			if (!occupied) {
				selectedChairId = chair.id;
				break;
			}
		}

		if (!selectedChairId) {
			return { conflict: true as const };
		}
	} else {
		const reserved = await findConflictingTimeReservation(tx, organizationId, {
			startsAt: startDate,
			endsAt: endDate,
		});
		if (reserved) {
			return { conflict: true as const };
		}
	}

	// 2. Identify and lock/create patient
	let patientId = params.patientId;
	let patientStatus: string | undefined;
	const phoneDigits = normalizePhoneDigits(patientPhone);

	if (patientId) {
		const [p] = await tx
			.select({ id: patients.id, status: patients.status, phone: patients.phone })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					eq(patients.id, patientId),
				),
			)
			.limit(1);
		const existingDigits = p?.phone ? normalizePhoneDigits(p.phone) : "";
		const incomingLast10 = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;
		const existingLast10 = existingDigits.length >= 10 ? existingDigits.slice(-10) : existingDigits;
		const phoneMatches =
			!incomingLast10 || !existingLast10 || incomingLast10 === existingLast10;
		if (p && phoneMatches) {
			patientStatus = p.status;
		} else {
			patientId = undefined;
		}
	}

	if (!patientId && patientPhone.trim().length >= 5) {
		const [existingByPhone] = await tx
			.select({ id: patients.id, status: patients.status })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					or(
						eq(patients.phone, patientPhone),
						...(phoneDigits.length >= 5 ? [eq(patients.phone, phoneDigits)] : []),
					),
				),
			)
			.limit(1);

		patientId = existingByPhone?.id;
		patientStatus = existingByPhone?.status;
	}

	if (!patientId) {
		const last10 = phoneDigits.slice(-10);
		if (last10.length === 10) {
			const candidates = await tx
				.select({ id: patients.id, phone: patients.phone, status: patients.status })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						ilike(patients.phone, `%${last10}%`),
					),
				)
				.limit(10);

			const matched = candidates.find(
				(candidate) =>
					normalizePhoneDigits(candidate.phone ?? "") === phoneDigits,
			);
			if (matched) {
				patientId = matched.id;
				patientStatus = matched.status;
			}
		}
	}

	// Охрана: если пациент найден и находится в архиве или в чёрном списке — онлайн-запись запрещена!
	if (patientId) {
		if (patientStatus === "archived") {
			return {
				conflict: false as const,
				blocked: true as const,
				status: 403,
				error: "PatientArchived",
				message: "Запись невозможна: карта пациента находится в архиве. Пожалуйста, обратитесь в клинику по телефону.",
			};
		}
		const isBlocked = await isPatientBookingBlocked(organizationId, patientId, tx);
		if (isBlocked) {
			return {
				conflict: false as const,
				blocked: true as const,
				status: 403,
				error: "BookingBlocked",
				message: "Онлайн-запись для данного пациента заблокирована. Пожалуйста, свяжитесь с клиникой по телефону.",
			};
		}
	}

	// Также проверяем, не внесено ли ФИО в чёрный список по организации (с защитой от опечаток, гомоглифов и смены регистра)
	const blockedEntries = await tx
		.select({
			id: patientArchiveReasonsAndBlacklists.id,
			patientName: patientArchiveReasonsAndBlacklists.patientName,
		})
		.from(patientArchiveReasonsAndBlacklists)
		.where(
			and(
				eq(
					patientArchiveReasonsAndBlacklists.organizationId,
					organizationId,
				),
				eq(patientArchiveReasonsAndBlacklists.isBookingBlocked, true),
			),
		);

	const nameBlocked = blockedEntries.find((entry) => {
		if (!entry.patientName) return false;
		if (entry.patientName.trim().toLowerCase() === patientName.trim().toLowerCase()) return true;
		if (nameKey(entry.patientName) === nameKey(patientName)) return true;
		return nameFuzzySimilarity(entry.patientName, patientName) >= 0.85;
	});

	if (nameBlocked) {
		return {
			conflict: false as const,
			blocked: true as const,
			status: 403,
			error: "BookingBlocked",
			message: "Онлайн-запись для данного пациента заблокирована. Пожалуйста, свяжитесь с клиникой по телефону.",
		};
	}

	// Также проверяем, нет ли среди архивных пациентов совпадения по ФИО (защита от обхода архива через смену номера телефона)
	const archivedRows = await tx
		.select({ id: patients.id, fullName: patients.fullName })
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, organizationId),
				eq(patients.status, "archived"),
			),
		)
		.limit(100);

	const archivedNameMatch = archivedRows.find((p) => {
		if (!p.fullName) return false;
		if (p.fullName.trim().toLowerCase() === patientName.trim().toLowerCase()) return true;
		if (nameKey(p.fullName) === nameKey(patientName)) return true;
		return nameFuzzySimilarity(p.fullName, patientName) >= 0.85;
	});

	if (archivedNameMatch) {
		return {
			conflict: false as const,
			blocked: true as const,
			status: 403,
			error: "PatientArchived",
			message: "Запись невозможна: карта пациента находится в архиве. Пожалуйста, обратитесь в клинику по телефону.",
		};
	}

	// 3. Acquire Doctor (Level 2) -> Patient (Level 3) locks (all active chairs already locked at Level 1)
	await tx
		.select({ id: users.id })
		.from(users)
		.where(
			and(
				eq(users.organizationId, organizationId),
				eq(users.id, doctorId),
			),
		)
		.limit(1)
		.for("update");

	if (patientId) {
		await tx
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					eq(patients.id, patientId),
				),
			)
			.limit(1)
			.for("update");
	}

	// 4. Create or update patient entity (strictly AFTER resource locks are acquired)
	if (!patientId) {
		const effectiveSource = params.utmSource || params.source || "online_booking";
		const [createdPatient] = await tx
			.insert(patients)
			.values({
				organizationId,
				fullName: patientName,
				phone: phoneDigits.length >= 5 ? (normalizePhone(patientPhone) ?? patientPhone) : null,
				status: "active",
				administrativeProfile: {
					leadSource: effectiveSource,
					utmSource: params.utmSource || null,
					utmCampaign: params.utmCampaign || null,
					utmMedium: params.utmMedium || null,
				},
			})
			.returning({ id: patients.id });
		if (!createdPatient) throw new Error("patient_insert_failed");
		patientId = createdPatient.id;
	} else if (params.utmSource || params.source) {
		// Update patient's marketing attributes if not already set
		const [existingPatient] = await tx
			.select({ administrativeProfile: patients.administrativeProfile })
			.from(patients)
			.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
			.limit(1);

		const existingProfile =
			(existingPatient?.administrativeProfile as Record<string, unknown> | null) || {};
		if (existingPatient && !existingProfile.utmSource) {
			await tx
				.update(patients)
				.set({
					administrativeProfile: {
						...existingProfile,
						leadSource: (existingProfile.leadSource as string | undefined) || params.utmSource || params.source || "online_booking",
						utmSource: (existingProfile.utmSource as string | undefined) || params.utmSource || null,
						utmCampaign: (existingProfile.utmCampaign as string | undefined) || params.utmCampaign || null,
						utmMedium: (existingProfile.utmMedium as string | undefined) || params.utmMedium || null,
					},
					updatedAt: new Date(),
				})
				.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)));
		}
	}

	// 4b. Record patient consent under 152-FZ if explicitly granted (DEF-PB-01)
	if (params.hasAgreedToPrivacy && patientId) {
		try {
			await withSavepoint(tx, async (spTx) => {
				await spTx.insert(patientConsents).values({
					organizationId,
					patientId,
					kind: "personal_data_processing",
					grantedAt: new Date(),
				});
			});
		} catch (consentErr) {
			logger.warn(
				{ err: safeLogError(consentErr), organizationId, patientId },
				"Non-blocking patient consent insert failed inside savepoint",
			);
		}
	}

	// 5. Overlap checks across Doctor, Patient, and Chair
	const resourceMatchConditions = [
		eq(appointments.doctorUserId, doctorId),
	];
	if (patientId) {
		resourceMatchConditions.push(eq(appointments.patientId, patientId));
	}
	if (selectedChairId) {
		resourceMatchConditions.push(
			eq(appointments.chairId, selectedChairId),
		);
	}

	const overlapping = await tx
		.select()
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, organizationId),
				or(...resourceMatchConditions),
				lt(appointments.startsAt, endDate),
				gt(appointments.endsAt, startDate),
				notInArray(appointments.status, [
					...FREED_APPOINTMENT_STATUSES,
				]),
			),
		)
		.limit(1);

	if (overlapping.length > 0) {
		const existing = overlapping[0];
		// Double-click guard & idempotency check (Mandates 8e, 8n):
		// Match only when idempotencyKey matches (if present on existing) or same patient + doctor + exact timestamp
		const existingIdempMatch =
			!params.idempotencyKey ||
			!existing?.comment?.includes("[idempotency:") ||
			existing.comment.includes(`[idempotency:${params.idempotencyKey}]`);
		if (
			existing &&
			patientId &&
			existing.patientId === patientId &&
			existing.doctorUserId === doctorId &&
			new Date(existing.startsAt).getTime() === startDate.getTime() &&
			existingIdempMatch
		) {
			return { conflict: false as const, appointment: existing, patientId };
		}

		// DEF-40-11: Проверяем, вызван ли конфликт только выбранным креслом.
		// Если врач и пациент свободны, а занято только текущее selectedChairId — перебираем другие активные кресла!
		const isDoctorConflict = existing?.doctorUserId === doctorId;
		const isPatientConflict = Boolean(patientId && existing?.patientId === patientId);

		if (!isDoctorConflict && !isPatientConflict && sortedChairs.length > 1) {
			const otherChairs = sortedChairs.filter((c) => c.id !== selectedChairId);

			let alternateChairFound = false;
			for (const altChair of otherChairs) {
				const altReserved = await findConflictingTimeReservation(tx, organizationId, {
					startsAt: startDate,
					endsAt: endDate,
					chairId: altChair.id,
					chairName: altChair.name,
				});
				if (altReserved) continue;

				const [altOccupied] = await tx
					.select({ id: appointments.id })
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							eq(appointments.chairId, altChair.id),
							lt(appointments.startsAt, endDate),
							gt(appointments.endsAt, startDate),
							notInArray(appointments.status, [...FREED_APPOINTMENT_STATUSES]),
						),
					)
					.limit(1);

				if (!altOccupied) {
					selectedChairId = altChair.id;
					alternateChairFound = true;
					break;
				}
			}

			if (!alternateChairFound) {
				return { conflict: true as const };
			}
		} else {
			return { conflict: true as const };
		}
	}

	const appointmentComment = [
		comment ? `[Онлайн-запись] ${comment}` : "Онлайн-запись через виджет на сайте",
		params.idempotencyKey ? `[idempotency:${params.idempotencyKey}]` : null,
	]
		.filter(Boolean)
		.join(" ");

	const [created] = await tx
		.insert(appointments)
		.values({
			organizationId,
			patientId,
			doctorUserId: doctorId,
			chairId: selectedChairId ?? null,
			status: params.status || "planned",
			startsAt: startDate,
			endsAt: endDate,
			reason: "Онлайн-запись через сайт",
			comment: appointmentComment,
		})
		.returning();
	if (!created) throw new Error("appointment_insert_failed");
	return { conflict: false as const, appointment: created, patientId };
}
