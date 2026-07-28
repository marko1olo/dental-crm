/**
 * Состояние списка сотрудников на экране разблокировки смены.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ БЕЗ REACT. Здесь нет ни разметки, ни fetch, ни CSS,
 * поэтому «что покажет экран входа» проверяется обычным node:test, а не глазами
 * по снимку. Тот же приём, что в `lib/panelStateText.ts`.
 *
 * ЧТО БЫЛО СЛОМАНО И ПОЧЕМУ ЭТОТ ФАЙЛ ПОЯВИЛСЯ (29.07.2026)
 *
 * В программу нельзя было войти. Экран разблокировки смены утверждал: «В клинике
 * пока нет ни одного действующего сотрудника. Добавьте людей в разделе
 * «Настройки → Кадры» — без сотрудника смену открыть нельзя». Сотрудники в базе
 * были, все действующие. Пройти дальше нельзя: без сотрудника смену не открыть,
 * а значит недоступен ни один раздел программы.
 *
 * Решение о ветке принималось по `activeStaff.length === 0`, а список приходил
 * из `App.tsx` выражением `dashboard.clinicSettings?.staff ?? []`. Этот `?? []`
 * и есть дефект: он превращает «список не прочитан» в «список прочитан и пуст».
 * Ровно та же подмена, что `response.ok ? json : []` в панелях, только на самом
 * входе в программу, где цена ошибки максимальна — экран не показывает отказ, а
 * отправляет заводить людей, которые уже заведены.
 *
 * ПРАВИЛО. Три состояния и никогда не два:
 *   `failed` — список не прочитан (пришло не массивом). Это отказ, и он обязан
 *              называть причину и действие;
 *   `empty`  — список прочитан, действующих сотрудников в нём нет. Только тогда
 *              уместен совет «Настройки → Кадры»;
 *   `ready`  — есть кого выбрать.
 */

import type { PanelSubject } from "../../lib/panelStateText";

/**
 * Что экрану смены нужно от сотрудника. Поля не обязательны намеренно: список
 * приходит с сервера, и запись без имени должна показаться как запись без имени,
 * а не уронить весь экран входа.
 */
export interface StaffUnlockMember {
	readonly id: string;
	readonly fullName?: unknown;
	readonly role?: unknown;
	readonly active?: unknown;
}

export type StaffUnlockListState =
	/** Список не прочитан: пришло не массивом. Причина — у вызывающего. */
	| { readonly phase: "failed" }
	/** Прочитан, действующих сотрудников нет. */
	| { readonly phase: "empty" }
	/** Есть кого выбрать. */
	| { readonly phase: "ready"; readonly activeStaff: StaffUnlockMember[] };

/**
 * Действующий ли сотрудник.
 *
 * `active !== false` — а не `active ?? true` на произвольном значении: поле в
 * ответе сервера булево (`db/domainStateHydration.ts` отдаёт `active:
 * user.isActive`), но запись, пришедшая без него, скрывать нельзя — иначе смену
 * не откроет никто из-за одного отсутствующего поля. Скрывается ровно то, что
 * сервер назвал отключённым.
 */
function isActiveMember(member: StaffUnlockMember): boolean {
	return member.active !== false;
}

/**
 * Годится ли запись в кнопку выбора сотрудника.
 *
 * БЫЛО: `staffMembers.filter(m => m?.active ?? true)`. Для `null` в списке это
 * даёт `true` — `null?.active` равно `undefined`, а `undefined ?? true` равно
 * `true`. То есть дыра в данных превращалась в кнопку без имени и без роли,
 * нажатие на которую отправляло на сервер `userId: undefined`. Запись без
 * идентификатора выбрать нельзя в принципе, поэтому она отбрасывается здесь.
 */
function isSelectableMember(
	candidate: unknown,
): candidate is StaffUnlockMember {
	if (!candidate || typeof candidate !== "object") return false;
	const id = (candidate as { id?: unknown }).id;
	return typeof id === "string" && id.trim().length > 0;
}

/**
 * Состояние списка сотрудников по тому, что реально пришло от вызывающего.
 *
 * `unknown` в подписи — не перестраховка: массив идёт из ответа сервера через
 * `dashboard.clinicSettings?.staff`, где он может отсутствовать целиком. Именно
 * это отсутствие и обязано доехать сюда, а не быть подменённым пустым массивом.
 */
export function resolveStaffUnlockListState(
	staffMembers: unknown,
): StaffUnlockListState {
	if (!Array.isArray(staffMembers)) return { phase: "failed" };
	const activeStaff = staffMembers
		.filter(isSelectableMember)
		.filter(isActiveMember);
	if (activeStaff.length === 0) return { phase: "empty" };
	return { phase: "ready", activeStaff };
}

/**
 * Что показать в области выбора сотрудника.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ `resolvePanelPhase`. У общего правила отказ важнее загрузки,
 * и для панелей это верно. Здесь наоборот: пока сводка клиники ещё едет, список
 * сотрудников отсутствует ЗАКОНОМЕРНО, и называть это отказом — врать в другую
 * сторону. Поэтому загрузка важнее отсутствия списка, а уже пришедшие люди
 * важнее и того и другого: показывать «загружаем» поверх готовых кнопок значило
 * бы прятать единственный способ войти.
 */
export function resolveStaffUnlockPhase(input: {
	readonly isLoading: boolean;
	readonly list: StaffUnlockListState;
}): "loading" | "failed" | "empty" | "ready" {
	if (input.list.phase === "ready") return "ready";
	if (input.isLoading) return "loading";
	return input.list.phase;
}

/**
 * Как называется этот список для общего компонента отказа. Второго языка ошибок
 * на экране входа быть не должно, поэтому текст берётся из общего словаря
 * (`lib/panelStateText.ts`), а здесь лежит только название содержимого.
 */
export const STAFF_UNLOCK_LIST_SUBJECT: PanelSubject = {
	notLoadedTitle: "Список сотрудников не прочитан",
	accusative: "список сотрудников",
	emptyTitle: "В клинике пока нет ни одного действующего сотрудника",
	emptyHint:
		"Добавьте людей в разделе «Настройки → Кадры» — без сотрудника смену открыть нельзя. " +
		"Если сотрудники в клинике есть, выйдите из аккаунта клиники и войдите заново.",
	failureConsequence:
		"Не считайте, что сотрудников нет: список не прочитан. Смену открыть нечем, пока он не прочитается — " +
		"нажмите «Повторить», а если не поможет, выйдите из аккаунта клиники и войдите заново.",
};
