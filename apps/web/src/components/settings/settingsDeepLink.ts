import { type SettingsTab, settingsTabs } from "../../AppConstants";
import { type AppView, viewLabels } from "../../workspaceShell";

/** Часть адреса после `#`: `settings/telegram`. */
export function settingsTabHash(tab: SettingsTab): string {
	return `settings/${tab}`;
}

/**
 * Подпись вкладки — из того же списка, из которого рисуется левое меню.
 *
 * Нужна, чтобы кнопка «Перейти в «Мессенджеры»» и сама кнопка меню назывались
 * одинаково. Переименуют вкладку — подписи не разойдутся, а расхождение подписи
 * и цели перехода человек читает как ошибку в своей голове, а не в программе.
 */
export function settingsTabTitle(tab: SettingsTab): string {
	return settingsTabs.find((item) => item.id === tab)?.title ?? "Настройки";
}

/** Открыть вкладку настроек. В окружении без браузера ничего не делает. */
export function openSettingsTab(tab: SettingsTab): void {
	if (typeof window === "undefined") return;
	window.location.hash = settingsTabHash(tab);
}

/**
 * Вкладка, где по-настоящему сохраняются настройки бота: ссылка на отзыв,
 * задержка просьбы оценить клинику, напоминания.
 *
 * Идентификатор остался историческим («telegram»), а подпись у вкладки давно
 * «Мессенджеры» — за ней живут ещё WhatsApp и MAX. Поэтому в разметке нельзя
 * писать ни то, ни другое руками: подпись берётся из списка вкладок, а
 * идентификатор — отсюда.
 */
export const MESSENGERS_SETTINGS_TAB: SettingsTab = "telegram";

/* ==================================================================== */
/*  ПЕРЕХОД В РАЗДЕЛ РАБОЧЕГО МЕСТА — по тем же правилам                  */
/* ==================================================================== */

/**
 * Открыть раздел рабочего места («Аналитика», «Связь» и прочие).
 *
 * Цель — `AppView`, а не строка: список разделов объявлен в `workspaceShell`, и
 * `viewFromHash` пропускает только перечисленное в нём, а всё остальное молча
 * превращает в «Смену». То есть опечатка отправила бы человека не туда без
 * единого сообщения — ровно как с вкладками настроек.
 */
export function openWorkspaceView(view: AppView): void {
	if (typeof window === "undefined") return;
	window.location.hash = view;
}

/**
 * Подпись раздела — из того же справочника, по которому подписано меню рабочего
 * места. Совет «смотрите в разделе …» обязан называть раздел так, как он назван в
 * меню: «Связь», а не «Сообщения»; «Аналитика», а не «Отчёты».
 */
export function workspaceViewTitle(view: AppView): string {
	return viewLabels[view];
}
