/**
 * workspaceFlagStorageHelpers.ts — Layer 2: Pure Storage Normalization & Serialization Helpers.
 *
 * Normalizes JSONB records from the database into complete, type-safe WorkspaceFeatureFlags.
 */

import type { WorkspaceFeatureFlags } from "./types.js";
import { DEFAULT_WORKSPACE_FEATURE_FLAGS } from "./workspaceFlagDefaults.js";

/**
 * Привести запись из базы к полному набору признаков.
 *
 * Набор растёт вместе с продуктом: за одну ночь в него добавляли
 * hasBpmWorkflows, hasClinicalRules, hasReferralModule. Поэтому старая запись
 * обязана читаться без ошибки — отсутствующие признаки берутся из умолчаний, а
 * неизвестные ключи отбрасываются, чтобы в ответ не просочилось то, чего в
 * контракте нет.
 *
 * Типы проверяются по значению, а не по вере: в jsonb может лежать что угодно,
 * включая результат ручной правки базы.
 */
export function workspaceFlagsFromStorage(
	stored: unknown,
): WorkspaceFeatureFlags {
	const source =
		stored && typeof stored === "object"
			? (stored as Record<string, unknown>)
			: {};
	const result = { ...DEFAULT_WORKSPACE_FEATURE_FLAGS } as Record<
		string,
		unknown
	>;
	for (const [key, fallback] of Object.entries(
		DEFAULT_WORKSPACE_FEATURE_FLAGS,
	)) {
		const value = source[key];
		if (typeof fallback === "boolean" && typeof value === "boolean")
			result[key] = value;
		else if (typeof fallback === "string" && typeof value === "string" && value)
			result[key] = value;
		// Число проверяется отдельно: numberOfDoctors — единственный числовой
		// признак, и без этой ветки он отбрасывался бы наравне с чужими ключами.
		// NaN и Infinity в jsonb попасть могут (ручная правка базы), но признаком
		// числа доктора быть не могут.
		else if (
			typeof fallback === "number" &&
			typeof value === "number" &&
			Number.isFinite(value)
		)
			result[key] = value;
	}
	return result as unknown as WorkspaceFeatureFlags;
}
