import { and, eq, gt, ilike, lt, notInArray, or } from "drizzle-orm";
import {
	appointments,
	chairs,
	patientArchiveReasonsAndBlacklists,
	patients,
	users,
} from "../../db/schema.js";
import { isPatientBookingBlocked } from "../../db/patientArchiveReasonsAndBlacklistsQuery.js";
import {
	nameFuzzySimilarity,
	nameKey,
} from "../../services/patients/duplicateDetection.js";
import { FREED_APPOINTMENT_STATUSES } from "../../services/schedule/scheduleConflictService.js";
import { normalizePhoneDigits } from "./slotAvailabilityEngine.js";

export interface BookingMutationParams {
	organizationId: string;
	doctorId: string;
	startDate: Date;
	endDate: Date;
	patientName: string;
	patientPhone: string;
	comment?: string | undefined;
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
	  };

/**
 * Executes the atomic booking transaction with canonical resource lock hierarchy:
 * Chair (Level 1) -> Doctor (Level 2) -> Patient (Level 3)
 */
export async function executeBookingTransaction(
	tx: Parameters<Parameters<typeof import("../../db/client.js").db.transaction>[0]>[0],
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

	// 1. Canonical Resource Lock Hierarchy: Chair -> Doctor -> Patient
	// Discover and lock available chair first to prevent 40P01 deadlocks with CRM
	const activeChairs = await tx
		.select({ id: chairs.id })
		.from(chairs)
		.where(
			and(
				eq(chairs.organizationId, organizationId),
				eq(chairs.isActive, true),
			),
		);

	let selectedChairId: string | null = null;
	if (activeChairs.length > 0) {
		const sortedChairs = [...activeChairs].sort((a, b) =>
			a.id.localeCompare(b.id),
		);
		for (const chair of sortedChairs) {
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
	}

	// 2. Identify and lock/create patient
	const phoneDigits = normalizePhoneDigits(patientPhone);
	const [existingByPhone] = await tx
		.select({ id: patients.id, status: patients.status })
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, organizationId),
				or(
					eq(patients.phone, patientPhone),
					eq(patients.phone, phoneDigits),
				),
			),
		)
		.limit(1);

	let patientId = existingByPhone?.id;
	let patientStatus = existingByPhone?.status;

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
		const isBlocked = await isPatientBookingBlocked(organizationId, patientId);
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

	if (!patientId) {
		const [createdPatient] = await tx
			.insert(patients)
			.values({
				organizationId,
				fullName: patientName,
				phone: patientPhone,
				status: "active",
			})
			.returning({ id: patients.id });
		if (!createdPatient) throw new Error("patient_insert_failed");
		patientId = createdPatient.id;
	}

	// 3. Acquire locks in STRICT CANONICAL ORDER: Chair (Level 1) -> Doctor (Level 2) -> Patient (Level 3)
	if (selectedChairId) {
		await tx
			.select({ id: chairs.id })
			.from(chairs)
			.where(
				and(
					eq(chairs.organizationId, organizationId),
					eq(chairs.id, selectedChairId),
				),
			)
			.limit(1)
			.for("update");
	}

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

	// 4. Overlap checks across Doctor, Patient, and Chair
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
		.select({ id: appointments.id })
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
		return { conflict: true as const };
	}

	const [created] = await tx
		.insert(appointments)
		.values({
			organizationId,
			patientId,
			doctorUserId: doctorId,
			chairId: selectedChairId ?? null,
			status: "planned",
			startsAt: startDate,
			endsAt: endDate,
			reason: "Онлайн-запись через сайт",
			comment: comment ? `[Онлайн-запись] ${comment}` : "Онлайн-запись через виджет на сайте",
		})
		.returning();
	if (!created) throw new Error("appointment_insert_failed");
	return { conflict: false as const, appointment: created };
}
