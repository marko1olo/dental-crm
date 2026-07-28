/**
 * Роли, на которые можно пригласить сотрудника, и разбор ответа сервера.
 *
 * ЧТО БЫЛО СЛОМАНО — ЭТО ПРАВА ДОСТУПА, А НЕ ПОДПИСЬ В СПИСКЕ.
 *
 * Список ролей в форме приглашения был написан руками:
 *
 *     <option value="doctor">Врач</option>
 *     <option value="admin">Администратор</option>     ← такой роли не существует
 *     <option value="assistant">Ассистент</option>
 *     <option value="owner">Владелец</option>          ← «Управляющего» нет вовсе
 *
 * Единственный настоящий список ролей — `staffRoleSchema` в
 * `packages/shared/src/index.ts`: owner, doctor, administrator, assistant,
 * manager. По этим же ключам собраны подписи (`workspaceUiLabels.staffRoleLabels`)
 * и права на разделы (`workspaceShell.getFilteredAppViews`). Значения
 * «administrator» в форме не было ни в одном варианте — было «admin».
 *
 * ЧТО ИЗ ЭТОГО СЛЕДОВАЛО, ПО ШАГАМ И ПРОВЕРЕНО ПО КОДУ:
 *
 * 1. `POST /api/auth/invites/create` (routes/auth.ts) роль НЕ проверяет: пишет
 *    присланную строку в `user_invitations.role` как есть.
 * 2. `POST /api/auth/invites/accept` копирует `invite.role` в `users.role` — тоже
 *    как есть.
 * 3. Значит человек, приглашённый «Администратором», получал роль `admin`.
 * 4. `staffRoleLabels["admin"]` — undefined: там, где интерфейс печатает роль
 *    сотрудника, у него не было подписи вообще.
 * 5. Хуже: `getFilteredAppViews("admin")` не совпадает ни с одной ветвью и
 *    доходит до `return Array.from(appViews)` — ВСЕ разделы. Администратору по
 *    роли открыто девять разделов, а приглашённый через эту форму получал все
 *    четырнадцать, то есть права владельца. Список работает ещё и охранником
 *    маршрута, поэтому это не косметика меню, а фактический доступ.
 * 6. «Управляющего» пригласить было нельзя: роль есть в системе, права для неё
 *    описаны, а в форме её не было.
 *
 * ЧТО СТАЛО. Список ролей собирается из тех же подписей, по которым интерфейс
 * печатает роль сотрудника, а тип значения — `StaffRole`. Роль вне схемы теперь
 * невозможно ни выбрать, ни отправить: это ошибка сборки, а не тихая выдача
 * лишних прав.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И ЭТО ДОЛГ СЕРВЕРА. `routes/auth.ts:573` проверяет права
 * приглашающего как `role !== 'owner' && role !== 'admin'` — по тому самому
 * несуществующему написанию. То есть настоящий «administrator» получит 403 на
 * попытку пригласить сотрудника, а приглашать может только владелец. Правка на
 * стороне сервера, отсюда её сделать нельзя; список ролей от неё не зависит.
 */

import type { StaffRole } from "@dental/shared";

import { staffRoleLabels } from "../../workspaceUiLabels";

/**
 * Кого можно пригласить, в порядке от самой частой роли к самой редкой.
 *
 * Тип `StaffRole` здесь не украшение: он берётся из `staffRoleSchema`, поэтому
 * опечатка вроде «admin» не доходит до сервера — она не собирается.
 *
 * «Владелец» оставлен, как было: второго владельца заводят при передаче клиники,
 * и запрещать это здесь — отдельное решение, а не побочный итог правки списка.
 */
export const INVITABLE_STAFF_ROLES: readonly StaffRole[] = [
	"doctor",
	"administrator",
	"assistant",
	"manager",
	"owner",
];

/**
 * Подпись роли для человека — из того же справочника, по которому интерфейс
 * печатает роль сотрудника в других местах. Отдельного набора подписей здесь
 * нет намеренно: два справочника одних и тех же ролей разойдутся.
 */
export function inviteRoleTitle(role: StaffRole): string {
	return staffRoleLabels[role];
}

/** Итог создания приглашения без fetch и DOM: разбирается и проверяется отдельно. */
export type InviteCreationOutcome =
	| { readonly ok: true; readonly inviteLink: string }
	/** `message` — текст сервера по-русски, если он его прислал. */
	| { readonly ok: false; readonly status: number; readonly message: string | null };

function asRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function textOrNull(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

/**
 * Разбор ответа `POST /api/auth/invites/create` из УЖЕ прочитанного тела.
 *
 * БЫЛО: `const data = await response.json()` ДО проверки `response.ok`. На
 * пустом теле и на HTML от прокси (502, 504) `res.json()` бросает исключение, и
 * `showToast(err.message)` печатал администратору английское
 * «Unexpected token '<', "<html>"... is not valid JSON». То же при обрыве связи:
 * «Failed to fetch». Тело поэтому читается строкой, а решение принимается здесь.
 *
 * Успешный ответ без `inviteLink` — тоже отказ: кнопка «Копировать» скопировала
 * бы адрес вида `https://клиника/undefined`, и администратор отправил бы его
 * новому сотруднику.
 */
export function parseInviteCreationPayload(
	status: number,
	rawBody: string,
): InviteCreationOutcome {
	let payload: unknown = null;
	try {
		payload = rawBody.trim().length > 0 ? JSON.parse(rawBody) : null;
	} catch {
		payload = null;
	}
	const record = asRecord(payload);
	if (status < 200 || status >= 300) {
		// Сервер приглашений отвечает на отказ телом {error,message} по-русски —
		// его и показываем; иначе причину назовёт общий модуль по коду ответа.
		return { ok: false, status, message: textOrNull(record?.message) };
	}
	const inviteLink = textOrNull(record?.inviteLink);
	if (!inviteLink) {
		return { ok: false, status, message: null };
	}
	return { ok: true, inviteLink };
}

/**
 * Полный адрес приглашения. Сервер отдаёт путь от корня (`/#/auth/accept-invite…`),
 * поэтому адрес клиники дописывается здесь — на то же окно, в котором работает
 * администратор.
 */
export function inviteLinkForClipboard(origin: string, inviteLink: string): string {
	return `${origin}${inviteLink}`;
}
