import {
	uiPreferencesInputSchema,
	uiPreferencesSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import {
	getUiPreferencesFromDb,
	saveUiPreferencesInDb,
	stampedUiPreferencesSavedAt,
	UiPreferencesConcurrentSaveError,
} from "../../db/settingsQuery.js";
import {
	parseSettingsPayload,
	requireSettingsAccess,
} from "./helpers.js";
import {
	uiPreferencesConcurrentSaveMessage,
	uiPreferencesStaleSaveMessage,
	uiPreferencesValidationMessage,
} from "./types.js";

export function registerUiPreferencesRoutes(app: FastifyInstance): void {
	app.get("/api/settings/preferences", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const prefs = await getUiPreferencesFromDb(orgId);
		return { preferences: prefs ? uiPreferencesSchema.parse(prefs) : null };
	});

	/**
	 * Сохранение настроек рабочего места. Отвечает тем, что ДЕЙСТВИТЕЛЬНО лежит в
	 * хранилище, а не пересказом присланного тела.
	 *
	 * Прежде здесь возвращался собранный на месте объект `updated` — то есть копия
	 * запроса. Даже на ветке без базы, где защита от устаревшей записи в
	 * `sampleData.ts` формально была написана, ответ подтверждал клиенту его
	 * собственную устаревшую копию: хранилище оставляло свежее значение, а маршрут
	 * отвечал старым и с кодом 200. Теперь источник ответа один — итог записи.
	 *
	 * Отметка времени штампуется той же функцией, которой пользуется сравнение
	 * (`stampedUiPreferencesSavedAt`), а не выражением `input.savedAt ?? now`.
	 * Разница видна на неразбираемой строке: прежняя форма записывала её в колонку
	 * как время, и следующее сохранение сравнивать было уже не с чем.
	 */
	app.put("/api/settings/preferences", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(uiPreferencesInputSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: uiPreferencesValidationMessage,
			};
		}
		const updated = {
			...input,
			version: 1 as const,
			savedAt: stampedUiPreferencesSavedAt(input.savedAt),
		};
		let outcome: Awaited<ReturnType<typeof saveUiPreferencesInDb>>;
		try {
			outcome = await saveUiPreferencesInDb(orgId, updated);
		} catch (error) {
			// Проигранная сверка прежнего значения — не ошибка оператора и не сбой
			// базы: писали одновременно. Отвечать 500 значило бы отправить человека к
			// администратору вместо того, чтобы обновить страницу и повторить правку.
			if (error instanceof UiPreferencesConcurrentSaveError) {
				console.error(
					"[настройки] настройки рабочего места не сохранены:",
					error,
				);
				reply.code(409);
				return {
					error: "UiPreferencesConcurrentSave",
					reason: "concurrent_ui_preferences_save",
					message: uiPreferencesConcurrentSaveMessage,
				};
			}
			throw error;
		}
		if (!outcome.applied) {
			// Действующее значение приложено к отказу: клиенту не нужен второй запрос,
			// чтобы показать человеку, чем именно перебита его копия.
			reply.code(409);
			return {
				error: "UiPreferencesStaleSave",
				reason: "stale_ui_preferences_copy",
				message: uiPreferencesStaleSaveMessage,
				preferences: uiPreferencesSchema.parse(outcome.stored),
			};
		}
		return uiPreferencesSchema.parse(outcome.stored);
	});
}
