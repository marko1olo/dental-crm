/**
 * Сервер отказал в изменении расписания и требует секрет администратора.
 *
 * Маршруты расписания отвечают `ScheduleAdminSecretRequired`, когда секрет
 * задан в окружении и не совпал, и `ScheduleAdminSecretMissing`, когда секрет
 * на сервере не задан вовсе, а незащищённые изменения запрещены. Только в этих
 * двух случаях у пользователя имеет смысл спрашивать секрет.
 */
export async function scheduleAdminSecretRefusal(
	response: Response,
): Promise<string | null> {
	if (response.status !== 403 && response.status !== 503) return null;
	try {
		const payload = (await response.clone().json()) as {
			error?: unknown;
			message?: unknown;
		};
		const code = typeof payload.error === "string" ? payload.error : "";
		if (
			code !== "ScheduleAdminSecretRequired" &&
			code !== "ScheduleAdminSecretMissing"
		)
			return null;
		return code;
	} catch {
		return null;
	}
}
