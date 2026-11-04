import type { FastifyReply, FastifyRequest } from "fastify";
import { unguardedBypassAllowed } from "../../../accessGuard.js";
import { withSuperuserBypass } from "../../../db/rls.js";
import * as schema from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import {
	enforcePermissionWhenStaffKnown,
	roleHasPermission,
	type Permission,
} from "../../../security/permissions.js";
import { timingSafeSecretEqual } from "../../../utils/timingSafeSecretEqual.js";
import { denteAdminSecretHeader } from "../types.js";

export function configuredSettingsAdminSecret(): string | null {
	return process.env.DENTE_SETTINGS_ADMIN_SECRET?.trim() || null;
}

/**
 * Послабление для разработки на всех 23 обработчиках настроек клиники, каждый
 * из которых начинается с `await requireSettingsAccess(request, reply)`
 * (пересчитано 2026-08-06; цифра гниёт — пересчитывай, прежде чем ссылаться):
 * работает ТОЛЬКО при явно названном режиме разработки и ТОЛЬКО при явно
 * выставленном флаге.
 *
 * ПОЧЕМУ ЗДЕСЬ ОБЩИЙ ПРЕДИКАТ, А НЕ ПРЕЖНЕЕ `NODE_ENV !== "production"`.
 * Прежнее условие истинно, когда NODE_ENV НЕ ЗАДАН ВОВСЕ, а незаданный NODE_ENV —
 * типовое состояние настоящего сервера: `apps/api/package.json` объявляет
 * `"start": "node dist/server.js"` и режим не задаёт. Значит у заказчика,
 * поднявшего сервер этой командой, «мы не в production» было ИСТИНОЙ, и от
 * правки прайс-листа, состава сотрудников, их полномочий и учётных данных без
 * секрета администратора защищало только то, что второй флаг где-то не
 * выставлен. Замерено на этом дереве до правки: пустой NODE_ENV +
 * DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS=1 → охрана снята, маршрут доходил до
 * разбора тела (400 по существу вместо 503).
 *
 * `accessGuard.ts` разбирает эту инверсию подробно и НАЗЫВАЕТ ЭТОТ ФАЙЛ как одну
 * из четырёх копий, которую должен переписать владелец. Пятой копии условия
 * безопасности здесь не будет: одно условие в одном месте — единственный способ
 * не оставить следующую инверсию незамеченной.
 *
 * Смысл послабления не изменился: `development`/`test` плюс
 * `DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS=1`. Закрылся ровно один случай —
 * пустой или незнакомый NODE_ENV («staging», «prod», опечатка) больше не
 * считается разработкой.
 *
 * ВЕРНУТЬ «КАК БЫЛО» — значит снова открыть настройки клиники на боевом
 * сервере. Если нужно работать без секрета локально, задайте
 * NODE_ENV=development, а не возвращайте отрицание.
 */
export function settingsUnguardedMutationsAllowed(): boolean {
	return unguardedBypassAllowed("DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS");
}

/**
 * Барьер доступа к настройкам: секрет администратора клиники плюс организация
 * запроса, либо `null` — значит ответ уже отправлен и обработчику остаётся выйти.
 *
 * ЧЕТЫРЕ `reply.send` НИЖЕ ОСТАЮТСЯ И ЭТО НЕ ПРОПУСК. Контракт функции —
 * `Promise<string | null>`: вернуть отсюда тело ответа нельзя, не переписав
 * форму вызова во всех двадцати с лишним обработчиках файла. Отложенного COMMIT
 * на этих ветках не возникает по существу: барьер стоит ПЕРВОЙ строкой каждого
 * обработчика, до него не выполнено ни одного запроса на запись, и откладывать
 * фиксацию нечего.
 */
export async function requireSettingsAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<string | null> {
	// Авторизация сотрудника / кабинета клиники по подписанному токену сессии
	const identity = getRequestIdentity(request);
	if (identity.organizationId && identity.verified) {
		return identity.organizationId;
	}

	const adminSecret = configuredSettingsAdminSecret();
	let hasAdminSecretAccess = false;

	if (adminSecret) {
		const providedSecret = request.headers[denteAdminSecretHeader];
		const normalizedProvidedSecret = Array.isArray(providedSecret)
			? providedSecret[0]
			: providedSecret;
		if (
			timingSafeSecretEqual(
				typeof normalizedProvidedSecret === "string"
					? normalizedProvidedSecret
					: null,
				adminSecret,
			)
		) {
			hasAdminSecretAccess = true;
		}
	}

	if (!hasAdminSecretAccess) {
		if (settingsUnguardedMutationsAllowed()) {
			hasAdminSecretAccess = true;
		} else if (!adminSecret) {
			reply.code(503).send({
				error: "SettingsAdminSecretMissing",
				message:
					"На сервере не задан секрет администратора клиники для изменения настроек клиники.",
			});
			return null;
		} else {
			reply.code(403).send({
				error: "SettingsAdminSecretRequired",
				message:
					"Для изменения настроек клиники нужен действующий секрет администратора клиники.",
			});
			return null;
		}
	}

	// Организация запроса: если токен был передан (включая dev-заголовок при admin bypass)
	const tokenOrganizationId = identity.organizationId;
	if (tokenOrganizationId) return tokenOrganizationId;

	if (process.env.DENTAL_STATE_PERSISTENCE === "off") {
		return "00000000-0000-0000-0000-000000000001";
	}

	// Фолбэк для однокликовой установки MVP: единственная организация в базе.
	const orgs = await withSuperuserBypass(async (tx) =>
		tx
			.select({ id: schema.organizations.id })
			.from(schema.organizations)
			.limit(2),
	);
	if (orgs.length > 1) {
		reply.code(401).send({
			error: "AuthRequired",
			message:
				"В базе несколько клиник — войдите в кабинет, чтобы изменить настройки.",
		});
		return null;
	}
	const org = orgs[0];
	if (!org) {
		reply.code(500).send({
			error: "NoOrganizationFound",
			message: "Не найдена организация в базе данных.",
		});
		return null;
	}
	return org.id;
}

/**
 * Барьер ИЗМЕНЕНИЯ настроек: то же, что requireSettingsAccess, плюс право роли.
 *
 * ЧТО БЫЛО. requireSettingsAccess проверяет периметр (подписанный токен клиники
 * или секрет администратора), но НЕ роль: любой сотрудник с личным токеном —
 * ассистент, куратор, врач — проходил на POST/PUT/DELETE профиля клиники,
 * прайса, кресел, шаблонов протоколов и сотрудников. Роль проверял только
 * интерфейс (кнопки скрыты), а маршрут был открыт любому токену клиники.
 *
 * ЧТО ЗДЕСЬ. Мягкий режим из permissions.ts (enforcePermissionWhenStaffKnown):
 * сотрудник ОПОЗНАН и роль не даёт права — отказ 403 с человеческим текстом;
 * запрос без личности (секрет/токен кабинета) решают прежние барьеры. Это
 * заранее заявленный staged-переход: когда вход сотрудника станет обязательным
 * везде, вызовы меняются на строгий requirePermission без смены мест вызова.
 *
 * Право: settings.write — владелец и admin (матрица ROLE_PERMISSIONS). Ставится
 * ТОЛЬКО на мутации; чтения (кресла для расписания, реквизиты для печати,
 * темы интерфейса) нужны всем ролям и гардом не трогаются.
 */
export async function requireSettingsMutationAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<string | null> {
	if (!enforcePermissionWhenStaffKnown(request, reply, "settings.write")) {
		return null;
	}
	return requireSettingsAccess(request, reply);
}

/**
 * Барьер изменения каталога услуг и прейскуранта:
 * В отличие от общих настроек клиники (requireSettingsMutationAccess / settings.write),
 * прейскурант и клинический каталог услуг ДОЛЖЕН быть доступен врачу у кресла
 * (Мандаты 8e / 8n / Автономия врача). Врач имеет право создавать разовые клинические позиции,
 * корректировать услуги и спецификации процедур без блокировки 403 Forbidden.
 * Разрешено: owner, admin, manager, administrator, doctor (или любое право из clinical.write / finance.write / settings.write).
 * Запрещено: assistant, curator и неавторизованные роли.
 */
export async function requireCatalogMutationAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<string | null> {
	const identity = getRequestIdentity(request);
	if (identity.userId && identity.role) {
		const allowedRoles = new Set([
			"owner",
			"admin",
			"manager",
			"administrator",
			"doctor",
		]);
		const hasAccess =
			allowedRoles.has(identity.role) ||
			roleHasPermission(identity.role, "clinical.write") ||
			roleHasPermission(identity.role, "finance.write") ||
			roleHasPermission(identity.role, "settings.write");

		if (!hasAccess) {
			reply.code(403).send({
				error: "PermissionDenied",
				permission: "catalog.write",
				role: identity.role,
				message:
					"Для изменения прейскуранта и каталога услуг требуются полномочия врача, администратора или руководства клиники.",
			});
			return null;
		}
	}
	return requireSettingsAccess(request, reply);
}

/**
 * Барьер чтения чувствительного: настройки, которые не нужны рядовым ролям
 * (например, список резервных копий). Мягкий режим, право settings.read.
 */
export async function requireSettingsSensitiveReadAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<string | null> {
	if (!enforcePermissionWhenStaffKnown(request, reply, "settings.read")) {
		return null;
	}
	return requireSettingsAccess(request, reply);
}

export type SettingsPermission = Permission;
