import type { UiPreferences } from "@dental/shared";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { type TenantDb, withTenantCtx } from "../rls.js";
import * as schema from "../schema.js";
import {
	UiPreferencesConcurrentSaveError,
	type UiPreferencesSaveOutcome,
	useInMemory,
} from "./types.js";

const memoryUiPreferences = new Map<string, UiPreferences>();
const UI_PREFERENCES_SAVE_ATTEMPTS = 5;

function memoryKey(organizationId: string, userId?: string | null): string {
	return userId ? `${organizationId}:${userId}` : organizationId;
}

/**
 * НАСТРОЙКИ РАБОЧЕГО МЕСТА: УСТАРЕВШАЯ КОПИЯ НЕ ИМЕЕТ ПРАВА ЗАТИРАТЬ СВЕЖУЮ.
 * Обе ветки (БД и in-memory) проверяют время сохранения через stampedUiPreferencesSavedAt
 * и uiPreferencesSaveIsSuperseded, защищая настройки от перезаписи старой вкладкой.
 */
export function stampedUiPreferencesSavedAt(
	savedAt: string | null | undefined,
): string {
	return savedAt && Number.isFinite(Date.parse(savedAt))
		? savedAt
		: new Date().toISOString();
}

export function uiPreferencesSaveIsSuperseded(
	storedSavedAt: string | null | undefined,
	incomingSavedAt: string | null | undefined,
): boolean {
	if (!storedSavedAt || !incomingSavedAt) return false;
	if (!Number.isFinite(Date.parse(storedSavedAt))) return false;
	return (
		Date.parse(stampedUiPreferencesSavedAt(incomingSavedAt)) <
		Date.parse(storedSavedAt)
	);
}

async function uiPreferencesRow(
	tx: TenantDb,
	organizationId: string,
	userId?: string | null,
): Promise<{ id: string; uiPreferences: unknown } | null> {
	if (userId) {
		const [exactUser] = await tx
			.select({ id: schema.users.id, uiPreferences: schema.users.uiPreferences })
			.from(schema.users)
			.where(
				and(
					eq(schema.users.organizationId, organizationId),
					eq(schema.users.id, userId),
				),
			)
			.limit(1);
		if (exactUser) return exactUser;
	}

	const [row] = await tx
		.select({ id: schema.users.id, uiPreferences: schema.users.uiPreferences })
		.from(schema.users)
		.where(eq(schema.users.organizationId, organizationId))
		.orderBy(
			sql`${schema.users.uiPreferences} is null`,
			asc(schema.users.createdAt),
			asc(schema.users.id),
		)
		.limit(1);
	return row ?? null;
}

export async function getUiPreferencesFromDb(
	organizationId: string,
	userId?: string | null,
	externalTx?: TenantDb | undefined,
): Promise<UiPreferences | null> {
	if (useInMemory()) {
		return (
			memoryUiPreferences.get(memoryKey(organizationId, userId)) ??
			memoryUiPreferences.get(organizationId) ??
			null
		);
	}
	const run = async (tx: TenantDb) => {
		const row = await uiPreferencesRow(tx, organizationId, userId);
		if (!row?.uiPreferences) return null;
		return row.uiPreferences as UiPreferences;
	};
	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}

export async function saveUiPreferencesInDb(
	organizationId: string,
	prefs: UiPreferences,
	userId?: string | null,
	externalTx?: TenantDb | undefined,
): Promise<UiPreferencesSaveOutcome> {
	if (useInMemory()) {
		const key = memoryKey(organizationId, userId);
		const stored =
			memoryUiPreferences.get(key) ??
			memoryUiPreferences.get(organizationId) ??
			null;
		if (
			stored &&
			uiPreferencesSaveIsSuperseded(stored.savedAt, prefs.savedAt)
		) {
			return { applied: false, stored };
		}
		memoryUiPreferences.set(key, prefs);
		return { applied: true, stored: prefs };
	}

	const run = async (tx: TenantDb): Promise<UiPreferencesSaveOutcome> => {
		for (let attempt = 1; attempt <= UI_PREFERENCES_SAVE_ATTEMPTS; attempt += 1) {
			const row = await uiPreferencesRow(tx, organizationId, userId);
			if (!row) {
				throw new Error("Не найден пользователь для сохранения настроек интерфейса.");
			}
			const stored = (row.uiPreferences ?? null) as UiPreferences | null;
			if (
				stored &&
				uiPreferencesSaveIsSuperseded(stored.savedAt, prefs.savedAt)
			) {
				return { applied: false, stored };
			}

			const written = await tx
				.update(schema.users)
				.set({ uiPreferences: prefs })
				.where(
					and(
						eq(schema.users.id, row.id),
						eq(schema.users.organizationId, organizationId),
						stored === null
							? isNull(schema.users.uiPreferences)
							: sql`${schema.users.uiPreferences} = ${JSON.stringify(stored)}::jsonb`,
					),
				)
				.returning({ id: schema.users.id });
			if (written.length === 0) continue;
			return { applied: true, stored: prefs };
		}

		throw new UiPreferencesConcurrentSaveError();
	};

	return externalTx ? run(externalTx) : withTenantCtx(organizationId, run);
}
