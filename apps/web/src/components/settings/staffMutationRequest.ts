/**
 * Один путь для всех изменений сотрудника: заголовки, отправка, разбор ответа.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ. Во вкладке «Сотрудники» лежали ЧЕТЫРЕ почти
 * одинаковых блока по 25 строк — заведение сотрудника, правка телефона, смена
 * PIN-кода и смена пароля. Два последних адресованы ОДНОМУ И ТОМУ ЖЕ маршруту
 * `POST /api/settings/staff/:staffId/credentials` и различались только полем
 * тела и текстом уведомления. Каждый блок сам читал токен из localStorage, сам
 * собирал заголовки, сам разбирал тело, сам ловил обрыв связи. Четыре копии
 * одного решения — это четыре места, где придётся вспомнить про заголовок,
 * когда охрана маршрута изменится; ровно так заголовок и потерялся (ниже).
 *
 * ГЛАВНОЕ, ЧТО ЭТОТ ФАЙЛ ПОЧИНИЛ, И ЭТО НЕ ДУБЛИРОВАНИЕ.
 *
 * Все маршруты `/api/settings/staff*` закрыты охраной `requireSettingsAccess`
 * (`apps/api/src/routes/settings.ts:559`). Она сравнивает заголовок
 * `x-dente-admin-secret` с `DENTE_SETTINGS_ADMIN_SECRET` и отвечает 403, если не
 * совпало. Пропускает запрос без секрета она ровно в одном случае: секрет на
 * сервере НЕ ЗАДАН и включена лазейка `DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS`,
 * которая живёт только пока `NODE_ENV !== "production"`.
 *
 * Все четыре блока посылали `x-dente-clinic-token` и НИ ОДИН не посылал
 * `x-dente-admin-secret`. Общая обёртка `lib/apiAuthFetch.ts` его тоже не
 * добавляет — она подставляет только токен кабинета и токен сотрудника (:86-87),
 * и это записано в её собственном разборе. То есть на машине разработчика
 * вкладка зелёная, а в клинике с заданным секретом настроек мертва целиком:
 * сотрудника не завести, телефон не исправить, PIN и пароль не выдать. Класс
 * дефекта тот же, что уже ловили в `SettingsProtocolsTab.tsx:107` — там токен
 * клиники отправляли ПОД ВИДОМ секрета администратора.
 *
 * Поэтому заголовки здесь берутся у того же помощника, что и во всех остальных
 * вкладках настроек: `auth.settingsAccessHeaders` отправляет сессионный секрет
 * домена настроек плюс оба токена, каждый в своём заголовке.
 *
 * ЗДЕСЬ НЕТ НИ React, НИ DOM — поэтому решение о том, что отправить и что
 * показать человеку, проверяется обычным `node:test`, а не глазами по скриншоту.
 * Тот же приём, что в `settingsInviteRoles.ts` и `lib/panelStateText.ts`.
 */

import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";
import { parseStaffMutationPayload } from "./settingsInviteRoles";

/**
 * Сборщик заголовков домена настроек — `auth.settingsAccessHeaders` из
 * `hooks/domains/useAuthLogic.ts`. Приходит через мешок пропсов вкладки, поэтому
 * тип объявлен здесь, а не импортирован: мешок объявлен как `Record<string, any>`.
 */
export type SettingsAccessHeaders = (
	extra?: Record<string, string>,
	adminSecretOverride?: string,
) => Record<string, string>;

/**
 * Итог изменения сотрудника.
 *
 * `status: null` означает «до сервера не дошли вовсе» — обрыв связи, выключенная
 * программа клиники. Это ОТДЕЛЬНОЕ состояние, а не код 0: `actionFailureToast`
 * и `requestFailureCause` (`lib/panelStateText.ts`) дают на него свой текст, и
 * путать его с отказом сервера нельзя — человеку нужны разные следующие шаги.
 */
export type StaffMutationResult =
	| { readonly ok: true }
	| {
			readonly ok: false;
			readonly status: number | null;
			readonly message: string | null;
	  };

export interface StaffMutationRequest {
	/** Адрес маршрута. Остаётся на вызывающей стороне: он часть смысла действия. */
	readonly url: string;
	readonly method: "POST" | "PUT" | "DELETE";
	/** Тело запроса. `undefined` — тела нет вовсе (например, отключение сотрудника). */
	readonly body?: unknown;
	/**
	 * `auth.settingsAccessHeaders`. Без него секрет администратора не уйдёт.
	 *
	 * `| undefined` записано явно: в проекте включён `exactOptionalPropertyTypes`,
	 * и без этого вызывающая сторона не смогла бы передать сюда значение из мешка
	 * пропсов, которого может не оказаться.
	 */
	readonly accessHeaders?: SettingsAccessHeaders | undefined;
	/** Что именно не получилось — для журнала разработчика, не для экрана. */
	readonly logLabel: string;
}

/**
 * Заголовки запроса к домену настроек.
 *
 * ПОЧЕМУ ОТСУТСТВИЕ ПОМОЩНИКА НЕ МОЛЧИТ. `auth` приходит из мешка пропсов и
 * формально может не прийти. Одиннадцать компонентов в этом дереве прикрывались
 * от этого записью `auth ? auth.denteClinicalReadHeaders() : {}` и уходили на
 * сервер БЕЗ заголовков — разбор в `useAppLogic.tsx` над возвратом `auth`. Тихий
 * запрос без секрета выглядит как отказ по правам, и искать причину будут в
 * правах, а не в отсутствующем помощнике. Поэтому запасной путь оставляет
 * поведение прежним (токены кабинета и сотрудника уходят), но говорит вслух.
 */
export function staffMutationHeaders(
	accessHeaders?: SettingsAccessHeaders,
): Record<string, string> {
	const extra = { "Content-Type": "application/json" };
	if (typeof accessHeaders === "function") return accessHeaders(extra);
	console.error(
		"[персонал] сборщик заголовков домена настроек не пришёл во вкладку: секрет " +
			"администратора настроек не будет отправлен, и установка с заданным " +
			"DENTE_SETTINGS_ADMIN_SECRET ответит 403 на любое изменение сотрудника",
	);
	return denteAdminSecretRequestHeaders(extra);
}

/**
 * Отправка изменения сотрудника.
 *
 * ТЕЛО ЧИТАЕТСЯ СТРОКОЙ, А НЕ `res.json()`. На пустом теле и на HTML от прокси
 * (502, 504) `res.json()` бросает исключение, и человеку показывали английское
 * «Unexpected token '<' … is not valid JSON» как ответ программы про PIN-код.
 * Решение принимает чистая функция `parseStaffMutationPayload`.
 *
 * НЕДОЧИТАННОЕ ТЕЛО ПРИ УСПЕШНОМ КОДЕ — ЭТО УСПЕХ. Здесь `await res.text()`
 * стоял внутри общего `try`, поэтому обрыв на чтении тела после кода 200
 * сообщался человеку как «не сохранено», хотя сервер изменение уже применил.
 * Теперь код ответа получен раньше тела, и решение принимается по коду.
 */
export async function requestStaffMutation(
	request: StaffMutationRequest,
): Promise<StaffMutationResult> {
	let response: Response;
	try {
		response = await fetch(request.url, {
			method: request.method,
			headers: staffMutationHeaders(request.accessHeaders),
			...(request.body === undefined
				? {}
				: { body: JSON.stringify(request.body) }),
		});
	} catch (error) {
		// Текст исключения наружу не идёт: он английский («Failed to fetch»).
		console.error(
			`[персонал] ${request.logLabel}: запрос не дошёл до сервера`,
			error,
		);
		return { ok: false, status: null, message: null };
	}

	let rawBody = "";
	try {
		rawBody = await response.text();
	} catch (error) {
		console.error(
			`[персонал] ${request.logLabel}: тело ответа не дочитано`,
			error,
		);
	}

	const outcome = parseStaffMutationPayload(response.status, rawBody);
	if (outcome.ok) return { ok: true };
	console.error(
		`[персонал] ${request.logLabel}: сервер ответил ${outcome.status}`,
	);
	return { ok: false, status: outcome.status, message: outcome.message };
}

/**
 * Перечитывание данных клиники после изменения — и честный ответ, вышло ли.
 *
 * ЗАЧЕМ ВОЗВРАЩАЕТСЯ ПРИЗНАК. Список персонала берётся из дашборда, поэтому без
 * перечитывания добавленного человека на экране нет. Раньше `await
 * loadDashboard()` стоял внутри общего `try` обработчика: если перечитывание
 * падало, человек получал «Сотрудник не добавлен» — ЛОЖЬ, сотрудник уже был
 * создан, и администратор заводил его второй раз. Теперь отказ перечитывания
 * меняет только подсказку («обновите страницу»), а не сам факт сохранения.
 */
export async function reloadStaffList(
	loadDashboard: unknown,
): Promise<boolean> {
	if (typeof loadDashboard !== "function") return false;
	try {
		await (loadDashboard as () => unknown)();
		return true;
	} catch (error) {
		console.error(
			"[персонал] список сотрудников не перечитан после изменения",
			error,
		);
		return false;
	}
}

/** Что именно выдают сотруднику. Оба вида идут в один маршрут `/credentials`. */
export type StaffCredentialKind = "pin" | "password";

export type StaffCredentialPlan =
	| { readonly ok: true; readonly body: Record<string, string> }
	/** `warning` — что человек должен исправить в поле ввода до отправки. */
	| { readonly ok: false; readonly warning: string };

/**
 * Проверка введённого доступа и тело запроса для него.
 *
 * Проверки здесь, а не в разметке, потому что они про безопасность, а не про
 * оформление: короткий пароль сервер примет, и сотрудник останется с доступом,
 * который подбирается за минуту. Те же два правила скопированы третий раз в
 * `SettingsClinicTab.tsx:60,72` — эта копия долгом названа, но не тронута: файл
 * принадлежит другой правке.
 */
export function planStaffCredentialUpdate(
	kind: StaffCredentialKind,
	value: string,
): StaffCredentialPlan {
	if (kind === "pin") {
		if (!/^\d{4}$/.test(value)) {
			return {
				ok: false,
				warning: "PIN-код — ровно 4 цифры, без букв и пробелов",
			};
		}
		return { ok: true, body: { pinCode: value } };
	}
	if (value.length < 6) {
		return { ok: false, warning: "Пароль — не короче 6 знаков" };
	}
	return { ok: true, body: { password: value } };
}

/** «PIN-код для «Иванова» не изменён» — первая часть сообщения об отказе. */
export function staffCredentialFailedAction(
	kind: StaffCredentialKind,
	staffName: string,
): string {
	return kind === "pin"
		? `PIN-код для ${staffName} не изменён`
		: `Пароль для ${staffName} не изменён`;
}

/**
 * Сообщение об успехе. Оно обязано сказать, что старый доступ перестал работать:
 * иначе сотрудник придёт к планшету со старым PIN-кодом и решит, что сломалась
 * программа.
 */
export function staffCredentialSavedMessage(
	kind: StaffCredentialKind,
	staffName: string,
): string {
	return kind === "pin"
		? `PIN-код для ${staffName} изменён — сообщите его сотруднику, старый больше не работает`
		: `Пароль для ${staffName} изменён — сообщите его сотруднику, старый больше не работает`;
}
