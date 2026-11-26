import type { CreatePatientInput, PatientAdministrativeProfile } from "@dental/shared";
import { and, eq, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import type { PatientDuplicateCandidate } from "../../services/patients/duplicateDetection.js";
import {
	canonicalizeHomoglyphs,
	convertQwertyMistype,
	phoneKey as extractPhoneKey,
	transliterateLatinToCyrillic,
} from "../../services/patients/duplicateFuzzyMetrics.js";
import { withTenantCtx, type TenantDb } from "../rls.js";
import * as schema from "../schema.js";
import {
	createPatientInDb,
	getPatientsFromDb,
	useInMemory,
} from "./patientSearchCore.js";
import type { CreatePatientSafeResult } from "./types.js";

export interface PatientDuplicateCandidateQueryInput {
	readonly fullName?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
	readonly phone?: string | null | undefined;
	readonly email?: string | null | undefined;
	readonly snils?: string | null | undefined;
	readonly administrativeProfile?:
		| PatientAdministrativeProfile
		| Record<string, unknown>
		| null
		| undefined;
}

function escapeSqlLikePattern(raw: string): string {
	return raw.replace(/[\\%_]/g, "\\$&");
}

function buildNameSearchStems(fullName: string): string[] {
	const variants = new Set<string>();
	const trimmed = fullName.trim();
	if (!trimmed) return [];
	variants.add(trimmed);
	variants.add(canonicalizeHomoglyphs(trimmed));
	if (/[a-zA-Z]/.test(trimmed)) {
		const qwerty = convertQwertyMistype(trimmed);
		variants.add(qwerty);
		variants.add(canonicalizeHomoglyphs(qwerty));
		const translit = transliterateLatinToCyrillic(trimmed);
		variants.add(translit);
		variants.add(canonicalizeHomoglyphs(translit));
	}

	const stems = new Set<string>();
	for (const variant of variants) {
		const tokens = variant
			.toLowerCase()
			.split(/[\s,.-]+/)
			.map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
			.filter((t) => t.length >= 2);
		for (const token of tokens) {
			const withYoWildcard = (s: string) => escapeSqlLikePattern(s).replace(/[её]/gi, "_");
			if (token.length >= 4) {
				stems.add(withYoWildcard(token.slice(0, 3)));
				stems.add(withYoWildcard(token.slice(-3)));
			} else {
				stems.add(withYoWildcard(token));
			}
			if (stems.size >= 12) return Array.from(stems);
		}
	}
	return Array.from(stems);
}

/**
 * Точечная выборка кандидатов на дубль пациента в БД (вместо O(N) дампа всей картотеки).
 * Отбирает не более 250 активных необъединённых записей по телефону, СНИЛС, дате рождения,
 * email и нормализованным токенам ФИО (включая QWERTY/транслит/гомоглифы/ё-е).
 */
export async function queryPatientDuplicateCandidates(
	organizationId: string,
	input: PatientDuplicateCandidateQueryInput,
	executor: TenantDb,
	ignoredPatientId?: string,
): Promise<PatientDuplicateCandidate[]> {
	const orConditions: SQL[] = [];

	const rawPhone = input.phone ?? "";
	const rawPhoneDigits = rawPhone.replace(/\D/g, "");
	const pKey = extractPhoneKey(rawPhone);
	const phoneTail = pKey
		? pKey.slice(-7)
		: rawPhoneDigits.length >= 7
			? rawPhoneDigits.slice(-7)
			: "";
	if (phoneTail.length >= 7) {
		orConditions.push(
			sql`regexp_replace(coalesce(${schema.patients.phone}, ''), '\\D', '', 'g') LIKE ${`%${phoneTail}%`}`,
		);
	}

	const directSnils = input.snils ?? null;
	const profileSnils =
		input.administrativeProfile &&
		typeof input.administrativeProfile === "object" &&
		"snils" in input.administrativeProfile &&
		typeof input.administrativeProfile.snils === "string"
			? input.administrativeProfile.snils
			: null;
	const snilsDigits = (directSnils ?? profileSnils ?? "").replace(/\D/g, "");
	if (snilsDigits.length >= 6) {
		orConditions.push(
			sql`regexp_replace(coalesce(${schema.patients.administrativeProfile}->>'snils', ''), '\\D', '', 'g') LIKE ${`%${snilsDigits}%`}`,
		);
	}

	const birthDate = (input.birthDate ?? "").trim();
	if (birthDate.length >= 4) {
		orConditions.push(eq(schema.patients.birthDate, birthDate));
	}

	const email = (input.email ?? "").trim().toLowerCase();
	if (email.length >= 3) {
		orConditions.push(ilike(schema.patients.email, email));
	}

	for (const stem of buildNameSearchStems(input.fullName ?? "")) {
		orConditions.push(ilike(schema.patients.fullName, `%${stem}%`));
	}

	if (orConditions.length === 0) {
		return [];
	}

	const rows = await executor
		.select({
			id: schema.patients.id,
			fullName: schema.patients.fullName,
			birthDate: schema.patients.birthDate,
			phone: schema.patients.phone,
			email: schema.patients.email,
			status: schema.patients.status,
			mergedIntoPatientId: schema.patients.mergedIntoPatientId,
			administrativeProfile: schema.patients.administrativeProfile,
		})
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.status, "active"),
				isNull(schema.patients.mergedIntoPatientId),
				ignoredPatientId ? ne(schema.patients.id, ignoredPatientId) : undefined,
				or(...orConditions),
			),
		)
		.limit(250);

	return rows.map((row) => ({
		id: row.id,
		fullName: row.fullName,
		birthDate: row.birthDate,
		phone: row.phone,
		email: row.email,
		status: row.status,
		mergedIntoPatientId: row.mergedIntoPatientId,
		administrativeProfile:
			row.administrativeProfile && typeof row.administrativeProfile === "object"
				? (row.administrativeProfile as Record<string, unknown>)
				: null,
	}));
}

export async function createPatientSafeInDb(
	organizationId: string,
	input: CreatePatientInput,
	duplicateCheckFn: (patients: readonly PatientDuplicateCandidate[], input: CreatePatientInput) => unknown,
	options?: { allowDuplicate?: boolean },
): Promise<CreatePatientSafeResult> {
	if (useInMemory()) {
		if (!options?.allowDuplicate) {
			const dbPatients = await getPatientsFromDb(organizationId);
			const duplicate = duplicateCheckFn(dbPatients, input);
			if (duplicate) return { type: "duplicate", duplicate };
		}
		return {
			type: "success",
			patient: await createPatientInDb(organizationId, input),
		};
	}

	return await withTenantCtx(organizationId, async (tx) => {
		const phoneDigits = (input.phone ?? "").replace(/\D/g, "");
		const phoneKey = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : "";
		const normalizedName = canonicalizeHomoglyphs(input.fullName ?? "")
			.toLowerCase()
			.replace(/ё/g, "е")
			.replace(/-/g, " ")
			.replace(/[^\p{L}\s]/gu, "")
			.split(/\s+/)
			.filter(Boolean)
			.sort()
			.join(" ");

		const directSnils =
			"snils" in input &&
			typeof (input as CreatePatientInput & { snils?: string | null }).snils === "string"
				? (input as CreatePatientInput & { snils?: string | null }).snils
				: null;
		const snilsDigits = (
			directSnils ??
			input.administrativeProfile?.snils ??
			""
		)
			.toString()
			.replace(/\D/g, "");

		if (phoneKey) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', ${organizationId}::text, 'phone', ${phoneKey}::text)))`,
			);
		}
		if (snilsDigits.length >= 11) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', ${organizationId}::text, 'snils', ${snilsDigits}::text)))`,
			);
		}
		if (normalizedName) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(concat_ws(':', ${organizationId}::text, 'name', ${normalizedName}::text)))`,
			);
		}

		if (!options?.allowDuplicate) {
			const candidatePatients = await queryPatientDuplicateCandidates(
				organizationId,
				{
					fullName: input.fullName,
					birthDate: input.birthDate,
					phone: input.phone,
					email: input.email,
					snils: directSnils,
					administrativeProfile: input.administrativeProfile,
				},
				tx,
			);

			const duplicate = duplicateCheckFn(candidatePatients, input);
			if (duplicate) return { type: "duplicate", duplicate };
		}

		const created = await createPatientInDb(organizationId, input, tx);
		return { type: "success", patient: created };
	});
}
