/**
 * Режимы, в которых вообще допустимо обсуждать обход охраны клинических данных.
 * Список ЗАКРЫТЫЙ и перечисляет режимы по имени.
 */
const namedDevelopmentModes = new Set(["development", "test"]);

/**
 * namedDevelopmentModeActive — включён ли ЯВНО НАЗВАННЫЙ режим разработки.
 *
 * ПОЧЕМУ БЕЛЫЙ СПИСОК, А НЕ `NODE_ENV !== "production"`.
 * Прежнее условие было `process.env.NODE_ENV !== "production"`, и оно истинно,
 * когда NODE_ENV НЕ ЗАДАН ВОВСЕ. Безопасность по умолчанию была перевёрнута:
 * охраняло не наличие запрета, а наличие правильно выставленной настройки.
 * Пустое окружение — типовое состояние production-развёртывания: `apps/api/package.json`
 * объявляет `"start": "node dist/server.js"` и NODE_ENV не задаёт, ни один Dockerfile
 * тоже. То есть на настоящем сервере условие «мы не в production» было ИСТИННЫМ,
 * и от раздачи карт пациентов без секрета администратора защищало только то, что
 * второй флаг где-то не выставлен. Система держалась на отсутствии второго условия,
 * а не на первом.
 *
 * Теперь обход требует ЯВНОГО разрешения с двух сторон: названный режим разработки
 * ПЛЮС флаг. Незаданный, пустой или незнакомый NODE_ENV ("staging", "prod", "qa",
 * опечатка в имени) больше не разрешает ничего — он просто не режим разработки.
 * Ошибка в имени режима теперь закрывает доступ, а не открывает его.
 *
 * ЭКСПОРТИРУЕТСЯ НАМЕРЕННО. Тот же перевёрнутый предикат скопирован ещё в четыре
 * места, и каждое даёт обход секрета администратора:
 *   apps/api/src/routes/imaging.ts   — dicomWebSettingsUnguardedAllowed
 *   apps/api/src/routes/schedule.ts  — scheduleUnguardedMutationsAllowed
 *   apps/api/src/routes/settings.ts  — settingsUnguardedMutationsAllowed
 *   apps/api/src/routes/telegram.ts  — isExplicitlyUnguardedControlPlaneAllowed
 * Их должен переписать владелец соответствующих файлов — на этот предикат, а не на
 * пятую копию. Пять копий условия безопасности — это то, как следующая инверсия
 * проникает незамеченной: правку внесут в одну, а остальные останутся открытыми.
 */
export function namedDevelopmentModeActive(): boolean {
	const mode = process.env.NODE_ENV?.trim().toLowerCase();
	return mode !== undefined && namedDevelopmentModes.has(mode);
}

/**
 * unguardedBypassAllowed — единственная законная форма проверки «разрешено ли
 * работать без секрета администратора»: названный режим разработки ПЛЮС явно
 * выставленный флаг.
 *
 * Имя переменной окружения передаётся строкой, чтобы одно и то же условие
 * обслуживало все участки и нигде не переписывалось заново. Опечатка в имени
 * флага здесь безопасна: неизвестная переменная читается как undefined, условие
 * становится ложным и доступ ЗАКРЫВАЕТСЯ. Ошибка в этой функции не может открыть
 * данные, только закрыть — направление отказа выбрано осознанно.
 */
export function unguardedBypassAllowed(
	flagEnvironmentVariable: string,
): boolean {
	return (
		namedDevelopmentModeActive() && process.env[flagEnvironmentVariable] === "1"
	);
}
