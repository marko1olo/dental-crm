import type { FastifyReply, FastifyRequest } from "fastify";
import { unguardedBypassAllowed } from "../../accessGuard.js";
import {
	ServiceCatalogItemNotFoundError,
	ServiceCatalogStorageDisabledError,
} from "../../db/pricelistQuery.js";
import {
	ProtocolTemplateNotFoundError,
	ProtocolTemplateStorageDisabledError,
} from "../../db/protocolTemplateQuery.js";
import { withSuperuserBypass } from "../../db/rls.js";
import * as schema from "../../db/schema.js";
import {
	StaffAuthorityRevocationUnsupportedError,
	StaffAuthorityStaffNotFoundError,
	StaffAuthorityStorageDisabledError,
} from "../../db/staffAuthorityQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import { repairMojibakeDeep } from "../../text/repairMojibake.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";
import {
	chairWorkingHoursConflictMessage,
	chairWorkingHoursNotFoundMessage,
	chairWorkingHoursRejectedMessage,
	clinicProfileMutationRejectedMessage,
	clinicProfileScheduleConflictMessage,
	clinicProfileTimezoneMessage,
	denteAdminSecretHeader,
	type SettingsPayloadSchema,
	staffAuthorityFlagTitles,
	staffAuthorityNotFoundMessage,
	staffAuthorityRejectedMessage,
	staffWorkingHoursConflictMessage,
	staffWorkingHoursNotFoundMessage,
	staffWorkingHoursRejectedMessage,
} from "./types.js";

export function parseSettingsPayload<T>(
	schema: SettingsPayloadSchema<T>,
	value: unknown,
) {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		console.error(
			"SMOKE TEST DEBUG: parseSettingsPayload failed validation:",
			parsed.error?.format(),
		);
		return null;
	}
	return parsed.data;
}

export function settingsDomainMessage(error: unknown): string {
	if (!(error instanceof Error)) return "";
	return repairMojibakeDeep(error.message);
}

export function hasActiveScheduleConflict(message: string): boolean {
	return (
		message.includes("активная запись") || message.includes("активные записи")
	);
}

/**
 * ФОРМА ОТВЕТА В ЭТОМ ФАЙЛЕ: КОД СТАВИМ, ЗНАЧЕНИЕ ВОЗВРАЩАЕМ.
 *
 * `return reply.code(N).send(x)` возвращает из обработчика сам `reply`, а он
 * thenable: `Reply.prototype.then` (fastify/lib/reply.js:466) разрешается по
 * `eos(reply.raw)` — когда ответ уже ушёл клиенту. server.ts (хук onRoute)
 * оборачивает КАЖДЫЙ обработчик в withTenantCtx, то есть в транзакцию, и ждёт
 * разрешения его промиса, чтобы зафиксировать её: COMMIT уходил ПОСЛЕ ответа.
 * Замерено поллером pg_stat_activity на живом сервере — дельта «коммит минус
 * заголовки» положительная во всех прогонах. При отказе на самом COMMIT клиент
 * уже держит 2xx, и fastify может только записать ошибку в журнал
 * (lib/wrap-thenable.js:63): «сохранено» на экране при нуле строк в базе.
 *
 * Здесь это видно на POST /api/settings/staff/:staffId/credentials —
 * SettingsStaffTab.tsx сразу после него перечитывает GET /api/dashboard.
 *
 * Возврат значения снимает это: fastify зовёт `reply.send(payload)` уже после
 * разрешения промиса (lib/wrap-thenable.js:14), то есть после COMMIT.
 *
 * НЕ ПЕРЕВЕДЕНО: три отказа внутри `requireSettingsAccess`. Эта функция
 * возвращает `string | null` (организацию либо «ответ уже отправлен»), поэтому
 * вернуть из неё тело ответа нельзя, не переписав контракт всех её вызовов.
 * Записи до этих отказов не происходит: это барьер доступа, он стоит первой
 * строкой каждого обработчика.
 */

// Экспортируется ради теста settings.test.ts: он импортирует эту функцию, а она
// была объявлена без export, и весь файл теста падал при загрузке с
// «does not provide an export named 'clinicProfileMutationRejection'».
export function clinicProfileMutationRejection(
	reply: FastifyReply,
	error: unknown,
) {
	const message = settingsDomainMessage(error);
	if (message.includes("часовой пояс")) {
		reply.code(409);
		return {
			error: "ClinicProfileMutationRejected",
			reason: "clinic_time_zone_invalid",
			message: clinicProfileTimezoneMessage,
		};
	}
	if (hasActiveScheduleConflict(message)) {
		reply.code(409);
		return {
			error: "ClinicProfileMutationRejected",
			reason: "active_schedule_conflict",
			message: clinicProfileScheduleConflictMessage,
		};
	}
	reply.code(409);
	return {
		error: "ClinicProfileMutationRejected",
		reason: "clinic_profile_rejected",
		message: clinicProfileMutationRejectedMessage,
	};
}

export function staffWorkingHoursRejection(reply: FastifyReply, error: unknown) {
	const message = settingsDomainMessage(error);
	if (message === "Сотрудник не найден.") {
		reply.code(404);
		return {
			error: "StaffScheduleNotFound",
			reason: "staff_not_found",
			message: staffWorkingHoursNotFoundMessage,
		};
	}
	if (hasActiveScheduleConflict(message)) {
		reply.code(409);
		return {
			error: "StaffScheduleRejected",
			reason: "active_schedule_conflict",
			message: staffWorkingHoursConflictMessage,
		};
	}
	reply.code(409);
	return {
		error: "StaffScheduleRejected",
		reason: "schedule_rejected",
		message: staffWorkingHoursRejectedMessage,
	};
}

export function chairWorkingHoursRejection(reply: FastifyReply, error: unknown) {
	const message = settingsDomainMessage(error);
	if (message === "Кресло не найдено.") {
		reply.code(404);
		return {
			error: "ChairScheduleNotFound",
			reason: "chair_not_found",
			message: chairWorkingHoursNotFoundMessage,
		};
	}
	if (hasActiveScheduleConflict(message)) {
		reply.code(409);
		return {
			error: "ChairScheduleRejected",
			reason: "active_schedule_conflict",
			message: chairWorkingHoursConflictMessage,
		};
	}
	reply.code(409);
	return {
		error: "ChairScheduleRejected",
		reason: "schedule_rejected",
		message: chairWorkingHoursRejectedMessage,
	};
}

/**
 * Отказы для карточек сотрудника и кресла. Отдельные тексты на правку и на
 * отключение: оператору важно видеть, какое именно действие не прошло, а не
 * общее «ошибка сервера».
 */
export function staffMutationRejection(
	reply: FastifyReply,
	error: unknown,
	notFoundMessage: string,
	rejectedMessage: string,
	errorCode: string,
) {
	const message = settingsDomainMessage(error);
	if (message === "Сотрудник не найден.") {
		reply.code(404);
		return {
			error: `${errorCode}NotFound`,
			reason: "staff_not_found",
			message: notFoundMessage,
		};
	}
	reply.code(409);
	return {
		error: `${errorCode}Rejected`,
		reason: "staff_mutation_rejected",
		message: rejectedMessage,
	};
}

/**
 * Отказы прайса. Три исхода разведены сознательно: «писать некуда» — это отказ
 * сервера (503), «услуги нет» — отказ по выбору (404), остальное — отказ по
 * переданным полям (409). Свести их в один текст значило бы отправить оператора
 * искать опечатку в цене там, где хранение просто отключено.
 */
export function serviceCatalogMutationRejection(
	reply: FastifyReply,
	error: unknown,
	notFoundMessage: string,
	rejectedMessage: string,
	errorCode: string,
) {
	if (error instanceof ServiceCatalogStorageDisabledError) {
		reply.code(503);
		return {
			error: "ServiceCatalogStorageUnavailable",
			reason: "state_persistence_off",
			message: error.message,
		};
	}
	if (error instanceof ServiceCatalogItemNotFoundError) {
		reply.code(404);
		return {
			error: `${errorCode}NotFound`,
			reason: "service_not_found",
			message: notFoundMessage,
		};
	}
	// Причина уходит в журнал целиком: без записи отказ по прайсу неотличим от
	// опечатки оператора, а разбирать его было бы нечем.
	console.error("[настройки] прайс не изменён:", error);
	reply.code(409);
	return {
		error: `${errorCode}Rejected`,
		reason: "service_mutation_rejected",
		message: rejectedMessage,
	};
}

/**
 * Отказы шаблонов протоколов. Три исхода разведены по той же причине, что у
 * прайса: «писать некуда» (503) — отказ сервера, «шаблона нет» (404) — отказ по
 * выбору, остальное (409) — отказ по переданным полям.
 */
export function protocolTemplateMutationRejection(
	reply: FastifyReply,
	error: unknown,
	notFoundMessage: string,
	rejectedMessage: string,
	errorCode: string,
) {
	if (error instanceof ProtocolTemplateStorageDisabledError) {
		reply.code(503);
		return {
			error: "ProtocolTemplateStorageUnavailable",
			reason: "state_persistence_off",
			message: error.message,
		};
	}
	if (error instanceof ProtocolTemplateNotFoundError) {
		reply.code(404);
		return {
			error: `${errorCode}NotFound`,
			reason: "protocol_template_not_found",
			message: notFoundMessage,
		};
	}
	console.error("[настройки] шаблон протокола не изменён:", error);
	reply.code(409);
	return {
		error: `${errorCode}Rejected`,
		reason: "protocol_template_mutation_rejected",
		message: rejectedMessage,
	};
}

/**
 * Отказы по персональным полномочиям. Четыре исхода разведены, потому что
 * следующий шаг владельца в каждом свой: «писать некуда» (503) — включить базу,
 * «сотрудника нет» (404) — выбрать другого, «это даёт роль» (409) — менять роль,
 * а не галочку, остальное (409) — проверить переданные поля.
 */
export function staffAuthorityMutationRejection(reply: FastifyReply, error: unknown) {
	if (error instanceof StaffAuthorityStorageDisabledError) {
		reply.code(503);
		return {
			error: "StaffAuthorityStorageUnavailable",
			reason: "state_persistence_off",
			message: error.message,
		};
	}
	if (error instanceof StaffAuthorityStaffNotFoundError) {
		reply.code(404);
		return {
			error: "StaffAuthorityNotFound",
			reason: "staff_not_found",
			message: staffAuthorityNotFoundMessage,
		};
	}
	if (error instanceof StaffAuthorityRevocationUnsupportedError) {
		/*
		 * ЭТО НЕ ОШИБКА ОПЕРАТОРА И НЕ ОТКАЗ ХРАНЕНИЯ. Полномочие даёт роль
		 * сотрудника, а колонка умеет только ДОБАВЛЯТЬ к роли: `false` в ней
		 * означает «надбавки нет», а не «запрещено». Записать `false` и ответить 200
		 * значило бы показать владельцу снятую галочку при сохранившемся праве —
		 * ровно тот дефект, из-за которого выбор «кто допущен к кассе» не работал
		 * годами, только теперь с подтверждением на экране.
		 *
		 * Отклонённые поля уходят машинным списком: интерфейсу нужно вернуть именно
		 * их в прежнее положение, а не перечитывать всю карточку.
		 */
		const titles = error.flags
			.map((flag) => staffAuthorityFlagTitles[flag])
			.join(", ");
		reply.code(409);
		return {
			error: "StaffAuthorityRevocationUnsupported",
			reason: "role_grants_authority",
			flags: error.flags,
			message:
				`Полномочия не сохранены: сотруднику это даёт его роль в клинике (${titles}), ` +
				"поэтому отдельной галочкой снять их нельзя — измените роль в карточке сотрудника.",
		};
	}
	// Причина уходит в журнал целиком: наружу идёт текст для человека, но без
	// записи здесь отказ по полномочиям был бы неотличим от опечатки в запросе.
	console.error("[настройки] полномочия сотрудника не сохранены:", error);
	reply.code(409);
	return {
		error: "StaffAuthorityRejected",
		reason: "staff_authority_rejected",
		message: staffAuthorityRejectedMessage,
	};
}

export function chairMutationRejection(
	reply: FastifyReply,
	error: unknown,
	notFoundMessage: string,
	rejectedMessage: string,
	errorCode: string,
) {
	const message = settingsDomainMessage(error);
	if (message === "Кресло не найдено.") {
		reply.code(404);
		return {
			error: `${errorCode}NotFound`,
			reason: "chair_not_found",
			message: notFoundMessage,
		};
	}
	reply.code(409);
	return {
		error: `${errorCode}Rejected`,
		reason: "chair_mutation_rejected",
		message: rejectedMessage,
	};
}

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
	const adminSecret = configuredSettingsAdminSecret();
	let _hasAccess = false;

	if (!adminSecret) {
		if (settingsUnguardedMutationsAllowed()) _hasAccess = true;
		else {
			reply.code(503).send({
				error: "SettingsAdminSecretMissing",
				message:
					"На сервере не задан секрет администратора клиники для изменения настроек клиники.",
			});
			return null;
		}
	} else {
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
			_hasAccess = true;
		} else {
			reply.code(403).send({
				error: "SettingsAdminSecretRequired",
				message:
					"Для изменения настроек клиники нужен действующий секрет администратора клиники.",
			});
			return null;
		}
	}

	// Организация запроса: сначала подписанный токен. Раньше здесь всегда бралась
	// ПЕРВАЯ строка таблицы organizations — при нескольких клиниках в одной базе
	// это означало, что настройки одной клиники правились от имени другой.
	const tokenOrganizationId = getRequestIdentity(request).organizationId;
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
