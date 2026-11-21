/**
 * apps/api/src/services/periodontogram/periodontogramDemoHelper.ts
 *
 * Patient ID resolution, doctor identity lookup, and demo context isolation.
 * Mandate 8b: File <= 120 lines.
 */

import crypto from "node:crypto";
import { isDemoEntityId, isDemoOrganizationId } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { patients, users } from "../../db/schema.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function deterministicUuid(seed: string): string {
	const hash = crypto.createHash("sha256").update(seed).digest("hex");
	return [
		hash.slice(0, 8),
		hash.slice(8, 12),
		"4" + hash.slice(13, 16),
		((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
		hash.slice(20, 32),
	].join("-");
}

export function isPerioDemoContext(
	orgId?: string | null,
	patientId?: string | null,
	rawPatientId?: string | null,
): boolean {
	if (process.env.DENTE_DEMO_MODE === "true" || process.env.IS_DEMO_SHOWCASE === "true") return true;
	// Только для демо-организации клиники или в тестовом окружении допускается создание синтетических демо-профилей
	if (orgId && (isDemoOrganizationId(orgId) || orgId.toLowerCase().includes("demo"))) {
		return true;
	}
	if (process.env.NODE_ENV === "test") {
		if (patientId && (isDemoEntityId(patientId) || patientId.toLowerCase().startsWith("demo") || patientId.toLowerCase().startsWith("sample_"))) return true;
		if (rawPatientId && (rawPatientId.toLowerCase().startsWith("demo") || rawPatientId.toLowerCase().startsWith("sample_"))) return true;
	}
	if (patientId && isDemoEntityId(patientId)) return true;
	return false;
}

export async function ensurePerioPatientExists(
	executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
	orgId: string,
	patientId: string,
	rawPatientId?: string | null,
) {
	const [existing] = await executor
		.select({ id: patients.id })
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
		.limit(1);
	if (existing) return;

	// В боевом режиме несуществующий пациент не должен создаваться втихую поддельным именем (Мандат 8z / 8wy)
	if (!isPerioDemoContext(orgId, patientId, rawPatientId)) {
		const err = new Error("Пациент не найден") as Error & { statusCode?: number; code?: string };
		err.statusCode = 404;
		err.code = "PatientNotFound";
		throw err;
	}

	// Исключительно в изолированном демонстрационном режиме создаем витринного демо-пациента
	await executor
		.insert(patients)
		.values({
			id: patientId,
			organizationId: orgId,
			fullName: "Демо Пациент Пародонтологии",
			notes: "Демонстрационный профиль для витрины пародонтологической карты",
		})
		.onConflictDoNothing();
}

/**
 * Разрешает идентификатор пациента (поддерживает UUID, client demo и tenant id).
 * Проверяет принадлежность пациента организации (BOLA/IDOR Guard).
 * Чистая функция чтения без мутации базы данных на GET-запросах (Mandates 8e, 8n).
 */
export async function resolvePerioPatientId(
	orgId: string,
	rawPatientId?: string | null,
): Promise<string> {
	const trimmed = typeof rawPatientId === "string" ? rawPatientId.trim() : "";
	if (!trimmed) {
		if (isPerioDemoContext(orgId, null, rawPatientId)) {
			return deterministicUuid(`${orgId}:default-perio-patient`);
		}
		const err = new Error("Некорректный идентификатор пациента") as Error & {
			statusCode?: number;
			code?: string;
		};
		err.statusCode = 400;
		err.code = "InvalidPatientId";
		throw err;
	}

	if (UUID_REGEX.test(trimmed)) {
		// BOLA/IDOR Guard: проверяем физическое существование пациента в текущей организации
		const [existing] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(and(eq(patients.id, trimmed), eq(patients.organizationId, orgId)))
			.limit(1);

		if (existing) {
			return existing.id;
		}

		// Если пациент не найден в организации, проверяем демо-контекст
		if (!isPerioDemoContext(orgId, trimmed, rawPatientId)) {
			const err = new Error("Пациент не найден в данной организации") as Error & {
				statusCode?: number;
				code?: string;
			};
			err.statusCode = 404;
			err.code = "PatientNotFound";
			throw err;
		}

		return trimmed;
	}

	// Для не-UUID строковых идентификаторов (демо-режим / тесты)
	if (isPerioDemoContext(orgId, null, rawPatientId)) {
		return deterministicUuid(`${orgId}:${trimmed}`);
	}

	const err = new Error("Пациент не найден в данной организации") as Error & {
		statusCode?: number;
		code?: string;
	};
	err.statusCode = 404;
	err.code = "PatientNotFound";
	throw err;
}

/**
 * Разрешает идентификатор пользователя/врача (staff), проверяя наличие в таблице users.
 * Если передан ID организации или несуществующий пользователь, возвращает null
 * для исключения ошибки PostgreSQL 23503 foreign_key_violation на periodontogram_snapshots.
 */
export async function resolveExistingPerioUserId(
	orgId: string,
	rawUserId?: string | null,
): Promise<string | null> {
	const trimmed = typeof rawUserId === "string" ? rawUserId.trim() : "";
	if (!trimmed) return null;
	try {
		const [user] = await db
			.select({ id: users.id })
			.from(users)
			.where(and(eq(users.id, trimmed), eq(users.organizationId, orgId)))
			.limit(1);
		return user?.id ?? null;
	} catch {
		return null;
	}
}
