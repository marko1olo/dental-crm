/**
 * permissions.ts — модель прав доступа по ролям.
 *
 * ЧТО БЫЛО
 * Единственной «авторизацией» на защищённых маршрутах был общий статический
 * секрет: requireClinicalReadAccess и requireClinicalMutationAccess обе
 * сравнивали заголовок x-dente-admin-secret с одним и тем же значением
 * (accessGuard.ts: configuredClinicalMutationSecret просто вызывает
 * configuredClinicalAccessSecret). То есть чтение и запись неотличимы: кто
 * может посмотреть расписание, тот может провести оплату, изменить историю
 * болезни и настройки клиники. Ролей не было вовсе — за исключением одной
 * жёстко зашитой проверки `identity.role === "doctor"` в requireNonDoctorAccess.
 *
 * При этом настоящая личность в запросе есть: security/identity.ts достаёт из
 * подписанного токена userId, organizationId и role. Она просто не
 * использовалась для решений о доступе.
 *
 * ЧТО ЗДЕСЬ
 * Явная матрица «роль → набор прав» и функция requirePermission. Секрет
 * остаётся отдельным ортогональным барьером (защита периметра), а права решают,
 * что конкретный сотрудник может делать внутри своей клиники.
 *
 * Принципы:
 *  • список прав закрытый — опечатка в имени права не компилируется;
 *  • неизвестная роль не получает ничего (fail closed), а не «всё»;
 *  • право выдаётся ролям явно, наследования нет: цепочки вроде
 *    «owner наследует admin наследует doctor» скрывают, кто что реально может.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { getRequestIdentity } from "./identity.js";

export const PERMISSIONS = [
	// Расписание и приёмы
	"schedule.read",
	"schedule.write",
	// Карточки пациентов
	"patients.read",
	"patients.write",
	// Медицинская документация: осмотры, дневники, планы лечения
	"clinical.read",
	"clinical.write",
	// Деньги: оплаты, касса, семейный кошелёк, возвраты
	"finance.read",
	"finance.write",
	// Отчёты и аналитика
	"analytics.read",
	// Склад и лаборатория
	"inventory.read",
	"inventory.write",
	// Настройки клиники, интеграции, сотрудники
	"settings.read",
	"settings.write",
	// Выгрузка медицинских документов в ЕГИСЗ
	"egisz.submit",
	// Переписка с пациентами: шаблоны, очередь отправки, согласия, рассылки.
	// Отдельно от patients.*: смотреть карточку и рассылать сообщения — разные
	// полномочия, и цена ошибки в рассылке измеряется в штрафах ФАС.
	"communications.read",
	"communications.write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

/**
 * Матрица прав. Роли берутся из users.role — в базе сейчас встречаются
 * owner, administrator, doctor, assistant; admin и manager объявлены в
 * StaffRole и поддержаны здесь же.
 */
const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
	owner: ALL,
	admin: ALL,

	// Управляющий: всё, кроме врачебной документации и выгрузки в ЕГИСЗ.
	manager: [
		"schedule.read", "schedule.write",
		"patients.read", "patients.write",
		"clinical.read",
		"finance.read", "finance.write",
		"analytics.read",
		"inventory.read", "inventory.write",
		"settings.read",
		"communications.read", "communications.write",
	],

	// Администратор ресепшена: записывает, ведёт картотеку, принимает оплату.
	// Медицинскую документацию не правит.
	administrator: [
		"schedule.read", "schedule.write",
		"patients.read", "patients.write",
		"clinical.read",
		"finance.read", "finance.write",
		"analytics.read",
		"inventory.read",
		"settings.read",
		"communications.read", "communications.write",
	],

	// Врач: ведёт приём и документацию, к кассе и настройкам не допущен.
	doctor: [
		"schedule.read", "schedule.write",
		"patients.read", "patients.write",
		"clinical.read", "clinical.write",
		"inventory.read",
		"egisz.submit",
		// Врач видит переписку с пациентом, но рассылки не запускает.
		"communications.read",
	],

	// Ассистент: видит приём и списывает материалы, ничего не решает.
	assistant: [
		"schedule.read",
		"patients.read",
		"clinical.read",
		"inventory.read", "inventory.write",
		"communications.read",
	],
};

/** Права роли. Неизвестная роль не получает ничего. */
export function permissionsForRole(role: string | null | undefined): readonly Permission[] {
	if (!role) return [];
	return ROLE_PERMISSIONS[role.toLowerCase()] ?? [];
}

export function roleHasPermission(
	role: string | null | undefined,
	permission: Permission,
): boolean {
	return permissionsForRole(role).includes(permission);
}

/**
 * Требует у запроса конкретное право. Возвращает организацию и сотрудника либо
 * null, отправив ответ клиенту.
 *
 * 401 — сотрудник не опознан (нет токена), 403 — опознан, но роль не даёт права.
 * Различать важно: интерфейс в первом случае предлагает войти, во втором —
 * объясняет, что действие не положено этой роли.
 */
export async function requirePermission(
	request: FastifyRequest,
	reply: FastifyReply,
	permission: Permission,
): Promise<{ organizationId: string; userId: string; role: string } | null> {
	const identity = getRequestIdentity(request);

	if (!identity.organizationId) {
		reply.code(401).send({
			error: "AuthRequired",
			message: "Требуется авторизация рабочего кабинета клиники.",
		});
		return null;
	}
	if (!identity.userId || !identity.role) {
		reply.code(401).send({
			error: "StaffAuthRequired",
			message: "Требуется вход сотрудника: действие выполняется от конкретного лица.",
		});
		return null;
	}
	if (!roleHasPermission(identity.role, permission)) {
		reply.code(403).send({
			error: "PermissionDenied",
			permission,
			role: identity.role,
			message: `Роль «${identity.role}» не имеет права «${permission}».`,
		});
		return null;
	}

	return {
		organizationId: identity.organizationId,
		userId: identity.userId,
		role: identity.role,
	};
}

/**
 * Мягкий режим: проверяет право ТОЛЬКО если сотрудник опознан.
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ФУНКЦИЯ. Часть рабочих процессов сейчас идёт под токеном
 * кабинета без входа конкретного сотрудника (userId в токене нет). Если сразу
 * потребовать личность на всех маршрутах, эти сценарии перестанут работать.
 * Поэтому права внедряются в два шага: сначала запрет для тех, кто опознан и
 * не имеет права (врач у кассы, ассистент в настройках) — это ловит реальные
 * злоупотребления и ничего не ломает; и только потом, когда вход сотрудника
 * станет обязательным везде, вызовы заменяются на requirePermission.
 *
 * Возвращает false, если ответ клиенту уже отправлен.
 */
export function enforcePermissionWhenStaffKnown(
	request: FastifyRequest,
	reply: FastifyReply,
	permission: Permission,
): boolean {
	const identity = getRequestIdentity(request);
	// Сотрудник не опознан — решение принимают прежние барьеры (секрет + токен
	// кабинета). Здесь мы не ужесточаем.
	if (!identity.userId || !identity.role) return true;

	if (!roleHasPermission(identity.role, permission)) {
		reply.code(403).send({
			error: "PermissionDenied",
			permission,
			role: identity.role,
			message: `Роль «${identity.role}» не имеет права «${permission}».`,
		});
		return false;
	}
	return true;
}
