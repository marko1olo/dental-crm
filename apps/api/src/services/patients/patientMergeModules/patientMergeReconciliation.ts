import type { PatientAdministrativeProfile } from "@dental/shared";
import { and, eq, or, sql } from "drizzle-orm";
import { familyGroups, patientReferrals, patients } from "../../../db/schema.js";
import { rowCount, type UNIQUE_CONFLICT_TABLES } from "./patientReferenceInspector.js";

export interface PatientRecord {
	id: string;
	fullName: string;
	phone: string | null;
	email: string | null;
	birthDate: string | null;
	notes: string | null;
	status: string;
	mergedInto: string | null;
	weightKg: string | null;
	familyGroupId: string | null;
	administrativeProfile: PatientAdministrativeProfile | null;
}

export interface PatientFillPayload {
	fullName?: string;
	phone?: string;
	email?: string;
	birthDate?: string;
	weightKg?: string;
	familyGroupId?: string;
	administrativeProfile?: PatientAdministrativeProfile | null;
}

/**
 * Снятие конфликтов уникальности последовательно в транзакции.
 * При конфликте побеждает запись основной карточки.
 */
export async function resolveUniqueConflicts(
	inner: { execute: (query: any) => Promise<unknown> },
	primaryPatientId: string,
	duplicatePatientId: string,
	existingConflictTables: typeof UNIQUE_CONFLICT_TABLES,
): Promise<Record<string, number>> {
	const droppedConflicts: Record<string, number> = {};

	for (const conflict of existingConflictTables) {
		const scopeMatch =
			conflict.scope.length === 0
				? sql`true`
				: sql.join(
						conflict.scope.map(
							(column) =>
								sql`d.${sql.identifier(column)} = p.${sql.identifier(column)}`,
						),
						sql` and `,
					);

		const deleted = await inner.execute(sql`
			delete from ${sql.identifier(conflict.table)} d
			where d.${sql.identifier(conflict.column)} = ${duplicatePatientId}
				and exists (
					select 1 from ${sql.identifier(conflict.table)} p
					where p.${sql.identifier(conflict.column)} = ${primaryPatientId}
						and ${scopeMatch}
				)
			returning d.${sql.identifier(conflict.column)}
		`);
		const count = rowCount(deleted);
		if (count > 0) droppedConflicts[conflict.table] = count;
	}

	return droppedConflicts;
}

/**
 * Объединение бонусных баллов перед удалением строки дубля.
 */
export async function mergeBonusBalances(
	inner: { execute: (query: any) => Promise<unknown> },
	primaryPatientId: string,
	duplicatePatientId: string,
	organizationId: string,
): Promise<void> {
	await inner.execute(sql`
		update patient_bonus_balances p
		set 
			active_points = p.active_points + d.active_points,
			pending_points = p.pending_points + d.pending_points,
			lifetime_earned_points = p.lifetime_earned_points + d.lifetime_earned_points,
			lifetime_spent_points = p.lifetime_spent_points + d.lifetime_spent_points,
			updated_at = now()
		from patient_bonus_balances d
		where p.patient_id = ${primaryPatientId}
			and d.patient_id = ${duplicatePatientId}
			and p.organization_id = ${organizationId}
			and d.organization_id = ${organizationId}
	`);
}

/**
 * Снятие кольцевых и самореферальных связей между объединяемыми карточками.
 */
export async function removeSelfReferralLoops(
	inner: any,
	primaryPatientId: string,
	duplicatePatientId: string,
	organizationId: string,
): Promise<void> {
	await inner
		.delete(patientReferrals)
		.where(
			and(
				eq(patientReferrals.organizationId, organizationId),
				or(
					and(
						eq(patientReferrals.referrerPatientId, primaryPatientId),
						eq(patientReferrals.refereePatientId, duplicatePatientId),
					),
					and(
						eq(patientReferrals.referrerPatientId, duplicatePatientId),
						eq(patientReferrals.refereePatientId, primaryPatientId),
					),
				),
			),
		);
}

/**
 * Согласование семейных групп и балансов кошельков при слиянии.
 */
export async function reconcileFamilyGroups(
	inner: any,
	primary: PatientRecord,
	duplicate: PatientRecord,
	organizationId: string,
	filledFields: string[],
): Promise<string | undefined> {
	if (!primary.familyGroupId && duplicate.familyGroupId) {
		filledFields.push("семейная группа");
		return duplicate.familyGroupId;
	}

	if (
		primary.familyGroupId &&
		duplicate.familyGroupId &&
		primary.familyGroupId !== duplicate.familyGroupId
	) {
		const [firstFamId, secondFamId] =
			duplicate.familyGroupId < primary.familyGroupId
				? [duplicate.familyGroupId, primary.familyGroupId]
				: [primary.familyGroupId, duplicate.familyGroupId];

		const lockedFamilyRows = await inner
			.select()
			.from(familyGroups)
			.where(
				and(
					or(
						eq(familyGroups.id, firstFamId),
						eq(familyGroups.id, secondFamId),
					),
					eq(familyGroups.organizationId, organizationId),
				),
			)
			.orderBy(familyGroups.id)
			.for("update");

		const dupFamily = lockedFamilyRows.find(
			(f: { id: string }) => f.id === duplicate.familyGroupId,
		);
		const primFamily = lockedFamilyRows.find(
			(f: { id: string }) => f.id === primary.familyGroupId,
		);

		if (dupFamily && primFamily) {
			const dupFamilyBal = Number(dupFamily.balance ?? 0);
			if (dupFamilyBal > 0) {
				const primFamilyBal = Number(primFamily.balance ?? 0);
				const combinedFamilyBal = (primFamilyBal + dupFamilyBal).toFixed(2);
				await inner
					.update(familyGroups)
					.set({ balance: combinedFamilyBal, updatedAt: new Date() })
					.where(
						and(
							eq(familyGroups.id, primary.familyGroupId),
							eq(familyGroups.organizationId, organizationId),
						),
					);
				// Обнуляем баланс поглощенной семейной группы
				await inner
					.update(familyGroups)
					.set({ balance: "0.00", updatedAt: new Date() })
					.where(
						and(
							eq(familyGroups.id, duplicate.familyGroupId),
							eq(familyGroups.organizationId, organizationId),
						),
					);
				filledFields.push(
					`семейный кошелек (${dupFamilyBal.toFixed(2)} ₽ перенесено в основную группу)`,
				);
			}

			// Переносим всех оставшихся членов семьи из поглощенной группы в основную
			await inner
				.update(patients)
				.set({ familyGroupId: primary.familyGroupId, updatedAt: new Date() })
				.where(
					and(
						eq(patients.familyGroupId, duplicate.familyGroupId),
						eq(patients.organizationId, organizationId),
					),
				);
		}
	}

	return undefined;
}

/**
 * Согласование профилей пациентов: перенос незаполненных полей,
 * деанонимизация, объединение заметок и административного профиля.
 */
export function reconcilePatientProfiles(
	primary: PatientRecord,
	duplicate: PatientRecord,
	filledFields: string[],
): { fill: PatientFillPayload; nextNotes: string } {
	const fill: PatientFillPayload = {};

	// Деанонимизация: если основная карта была временным анонимом (UUID_ANON),
	// а дубликат несет подтвержденное ФИО — восстанавливаем паспортное ФИО
	if (
		primary.fullName.startsWith("UUID_ANON") &&
		duplicate.fullName &&
		!duplicate.fullName.startsWith("UUID_ANON")
	) {
		fill.fullName = duplicate.fullName;
		filledFields.push("ФИО (деанонимизация)");
	}

	if (!primary.phone?.trim() && duplicate.phone?.trim()) {
		fill.phone = duplicate.phone.trim();
		filledFields.push("телефон");
	}
	if (!primary.email?.trim() && duplicate.email?.trim()) {
		fill.email = duplicate.email.trim();
		filledFields.push("почта");
	}
	if (!primary.birthDate?.trim() && duplicate.birthDate?.trim()) {
		fill.birthDate = duplicate.birthDate.trim();
		filledFields.push("дата рождения");
	}
	if (!primary.weightKg && duplicate.weightKg) {
		fill.weightKg = duplicate.weightKg;
		filledFields.push("вес (кг)");
	}

	let nextAdminProfile: PatientAdministrativeProfile | null = primary.administrativeProfile
		? { ...primary.administrativeProfile }
		: null;
	const dupAdmin = duplicate.administrativeProfile;
	if (dupAdmin && typeof dupAdmin === "object") {
		if (!nextAdminProfile) {
			nextAdminProfile = { ...dupAdmin };
			if (dupAdmin.snils) filledFields.push("СНИЛС");
			if (dupAdmin.identityDocument) filledFields.push("документ / паспорт");
			if (dupAdmin.insurancePolicyNumber) filledFields.push("полис ОМС/ДМС");
			if (dupAdmin.taxpayerInn) filledFields.push("ИНН");
			if (dupAdmin.registrationAddress || dupAdmin.residentialAddress) filledFields.push("адрес");
		} else {
			for (const [key, value] of Object.entries(dupAdmin)) {
				const curVal = (nextAdminProfile as Record<string, unknown>)[key];
				const isCurEmpty =
					curVal === null ||
					curVal === undefined ||
					(typeof curVal === "string" && curVal.trim() === "");
				const isValNonEmpty =
					value !== null &&
					value !== undefined &&
					(typeof value !== "string" || value.trim() !== "");
				if (isCurEmpty && isValNonEmpty) {
					(nextAdminProfile as Record<string, unknown>)[key] = value;
					if (key === "snils") filledFields.push("СНИЛС");
					else if (key === "identityDocument") filledFields.push("документ / паспорт");
					else if (key === "insurancePolicyNumber") filledFields.push("полис ОМС/ДМС");
					else if (key === "taxpayerInn") filledFields.push("ИНН");
					else if (key === "registrationAddress" || key === "residentialAddress") filledFields.push("адрес");
					else if (key === "curatorId") filledFields.push("куратор лечения");
					else if (key === "loyaltyTier") filledFields.push("уровень лояльности");
				}
			}
			// Если основная карта была анонимной, а дубликат неанонимный - снимаем флаг анонимности
			if (primary.administrativeProfile?.isAnonymous && !dupAdmin.isAnonymous) {
				nextAdminProfile.isAnonymous = false;
			}
		}
	}
	if (nextAdminProfile) {
		fill.administrativeProfile = nextAdminProfile;
	}

	// Заметки не заменяются, а дописываются: в них бывает важное.
	const duplicateNotes = duplicate.notes?.trim();
	const mergedNote = `Объединено из карточки «${duplicate.fullName}»${duplicateNotes ? `. Заметки оттуда: ${duplicateNotes}` : ""}`;
	const nextNotes = primary.notes?.trim()
		? `${primary.notes.trim()}\n${mergedNote}`
		: mergedNote;

	return { fill, nextNotes };
}
