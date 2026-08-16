import { and, eq, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/client.js";
import { patients } from "../../db/schema.js";

export type PatientIdentityData = {
	readonly id: string;
	readonly fullName: string;
	readonly birthDate: string | null;
	readonly phone: string | null;
	readonly snils: string | null;
	readonly identityDocument: string | null;
};

export class PatientDeduplicationEngine {
	/**
	 * Проверка точного совпадения по уникальным идентификаторам (СНИЛС, Паспорт, Телефон)
	 */
	public static isExactMatch(p1: PatientIdentityData, p2: PatientIdentityData): boolean {
		if (p1.id === p2.id) return false;

		if (p1.snils && p2.snils && p1.snils.replace(/\D/g, "") === p2.snils.replace(/\D/g, "")) {
			return true;
		}

		if (
			p1.identityDocument &&
			p2.identityDocument &&
			p1.identityDocument.replace(/\s/g, "") === p2.identityDocument.replace(/\s/g, "")
		) {
			return true;
		}

		if (
			p1.phone &&
			p2.phone &&
			p1.phone.replace(/\D/g, "").slice(-10) === p2.phone.replace(/\D/g, "").slice(-10)
		) {
			return true;
		}

		return false;
	}

	/**
	 * Проверка нечеткого совпадения по ФИО + Дате рождения
	 */
	public static isFuzzyMatch(p1: PatientIdentityData, p2: PatientIdentityData): boolean {
		if (p1.id === p2.id) return false;
		if (!p1.birthDate || !p2.birthDate || p1.birthDate !== p2.birthDate) return false;

		const norm1 = p1.fullName.trim().toLowerCase().replace(/[^а-яa-z]/gi, "");
		const norm2 = p2.fullName.trim().toLowerCase().replace(/[^а-яa-z]/gi, "");

		if (norm1 === norm2) return true;
		if (norm1.length > 5 && norm2.length > 5 && (norm1.startsWith(norm2.slice(0, 5)) || norm2.startsWith(norm1.slice(0, 5)))) {
			return true;
		}

		return false;
	}

	/**
	 * Точный поиск дубликатов в БД
	 */
	static async findPreciseDuplicates(organizationId: string, patient: PatientIdentityData): Promise<string[]> {
		const conditions: SQL[] = [];

		if (patient.snils) {
			conditions.push(sql`administrative_profile->>'snils' = ${patient.snils}`);
		}

		if (patient.identityDocument) {
			conditions.push(sql`administrative_profile->>'identityDocument' = ${patient.identityDocument}`);
		}

		if (patient.phone) {
			conditions.push(eq(patients.phone, patient.phone));
		}

		if (conditions.length === 0) return [];

		const results = await db
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					eq(patients.status, "active"),
					or(...conditions),
					sql`${patients.id} <> ${patient.id}`,
				),
			);

		return results.map((r) => r.id);
	}
}
