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

import { staffRoleSchema } from "@dental/shared";
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
	/*
	 * Зарплата: выплаты врачам, ставки, удержания за материалы.
	 *
	 * ЗАЧЕМ ОТДЕЛЬНОЕ ПРАВО, А НЕ analytics.read. Выплаты нельзя вешать на
	 * аналитику: analytics.read выдан administrator (ресепшен) и НЕ выдан doctor.
	 * На этом праве администратор смены увидел бы зарплаты всех врачей клиники, а
	 * сам врач не увидел бы даже свою. Это ровно наоборот к тому, как зарплата
	 * устроена в клинике.
	 *
	 * payroll.read — выплаты всех врачей клиники. payroll.read.own — только свои
	 * строки, фильтр по doctor_user_id ставится на СЕРВЕРЕ, а не в интерфейсе.
	 */
	"payroll.read",
	"payroll.read.own",
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
		"schedule.read",
		"schedule.write",
		"patients.read",
		"patients.write",
		"clinical.read",
		"finance.read",
		"finance.write",
		"analytics.read",
		// Управляющий считает зарплату врачей — это его работа.
		"payroll.read",
		"inventory.read",
		"inventory.write",
		"settings.read",
		"communications.read",
		"communications.write",
	],

	// Администратор ресепшена: записывает, ведёт картотеку, принимает оплату.
	// Зарплаты врачей не видит — ни чужие, ни свои: он не врач.
	administrator: [
		"schedule.read",
		"schedule.write",
		"patients.read",
		"patients.write",
		"clinical.read",
		"finance.read",
		"finance.write",
		"analytics.read",
		"inventory.read",
		"settings.read",
		"communications.read",
		"communications.write",
	],

	// Врач: ведёт приём и документацию, к кассе и настройкам не допущен.
	doctor: [
		"schedule.read",
		"schedule.write",
		"patients.read",
		"patients.write",
		"clinical.read",
		"clinical.write",
		"inventory.read",
		// Свою выработку и свою выплату врач видит; чужие — нет.
		"payroll.read.own",
		"egisz.submit",
		// Врач видит переписку с пациентом, но рассылки не запускает.
		"communications.read",
	],

	// Ассистент: видит приём и списывает материалы, ничего не решает.
	assistant: [
		"schedule.read",
		"patients.read",
		"clinical.read",
		"inventory.read",
		"inventory.write",
		"communications.read",
	],
};

/**
 * Роли, объявленные в матрице. Нужны проверке полноты русских подписей:
 * без этого списка тест сверял бы подписи с собственной копией ролей, то есть
 * охранял бы себя, а не текст, который читает человек.
 */
export const ROLES_IN_MATRIX: readonly string[] = Object.keys(ROLE_PERMISSIONS);

/** Права роли. Неизвестная роль не получает ничего. */
export function permissionsForRole(
	role: string | null | undefined,
): readonly Permission[] {
	if (!role) return [];
	return ROLE_PERMISSIONS[role.toLowerCase()] ?? [];
}

export function roleHasPermission(
	role: string | null | undefined,
	permission: Permission,
): boolean {
	return permissionsForRole(role).includes(permission);
}

/* ==================================================================== */
/*  ПОЛНОМОЧИЯ В КАРТОЧКЕ СОТРУДНИКА                                     */
/* ==================================================================== */

/**
 * Три флага полномочий, которые уходят клиенту в каждой карточке сотрудника
 * (`staffMemberSchema` в `packages/shared/src/index.ts`: canSignMedicalRecords,
 * canManageMoney, canManageImports).
 *
 * ЧТО БЫЛО. Одно и то же решение — «кто может подписать медицинскую карту, кто
 * допущен к кассе, кто имеет право на перенос данных» — принималось в трёх
 * местах тремя разными способами:
 *
 *   • `db/settingsQuery.ts` отдавал ЖЁСТКОЕ `true` во всех трёх полях КАЖДОМУ
 *     сотруднику. Ассистент приезжал на клиент с правом подписи ЭМК, с доступом
 *     к кассе и к импорту. Это ответ трёх маршрутов — GET
 *     `/api/settings/clinic`, POST `/api/settings/clinic/mode`, PUT
 *     `/api/settings/clinic/profile`, — а ответ двух последних клиент кладёт
 *     целиком в `dashboard.clinicSettings` (`apps/web/src/useAppLogic.tsx`,
 *     changeClinicMode и saveClinicProfileFromDraft). То есть выдуманное «true
 *     для всех» не оставалось внутри сервера: после смены режима клиники или
 *     сохранения её реквизитов оно затирало на экране honest-значения,
 *     посчитанные по роли на пути сводки.
 *   • `db/domainStateHydration.ts` считал их по роли, но своим набором условий:
 *     деньги и импорт получали только owner и administrator, а управляющий
 *     (manager) терял и то и другое.
 *   • `sampleData.ts` (`permissionsForRole`, путь без базы) имел ТРЕТИЙ набор
 *     условий: там деньги и импорт доставались ещё и manager.
 *
 * Ни одно из трёх мест не читало колонки `users.can_sign_medical_records`,
 * `users.can_manage_money`, `users.can_manage_imports`. Колонки существуют
 * (миграция `drizzle/0000_freezing_randall_flagg.sql`, таблица `users`,
 * `boolean DEFAULT false NOT NULL`) и в живой базе заполнены `false` у всех
 * сотрудников, но модель Drizzle (`db/schema.ts`, `users`) их не объявляет,
 * поэтому прочитать их не может никто, а записать — тем более: ни
 * `createStaffMemberSchema`, ни один маршрут настроек их не принимает.
 * Читать их «как есть» значило бы снять право подписи ЭМК со всех врачей и
 * владельца сразу, не дав ни одного экрана, где право можно вернуть.
 *
 * ЧТО ЗДЕСЬ. Один вывод из ТОЙ ЖЕ матрицы `ROLE_PERMISSIONS`, по которой
 * `requirePermission` решает судьбу запроса на маршруте. Флаг в карточке и
 * отказ на маршруте больше не могут разойтись: интерфейс, погасивший кнопку по
 * флагу, гасит её ровно там, где сервер всё равно ответил бы 403.
 *
 * Соответствие флагов правам:
 *   • canSignMedicalRecords → `clinical.write` («заполнять медицинскую
 *     документацию»): владелец, admin, врач.
 *   • canManageMoney → `finance.write` («проводить оплаты и возвраты»):
 *     владелец, admin, управляющий, администратор ресепшена. Врач — нет.
 *   • canManageImports → `settings.write` («менять настройки клиники»):
 *     владелец и admin. Узко, и это выбор, а не недосмотр: экран импорта живёт
 *     во вкладке настроек, а массовый перенос из прежней программы
 *     перезаписывает картотеку целиком.
 *     ДОЛГ: отдельного права на импорт в матрице нет, а маршрут переноса
 *     (`routes/smartImports.ts:5729`) охраняется секретом периметра
 *     (`requireClinicalMutationAccess`), а не правом роли. Пока роль на этом
 *     маршруте не решает ничего, флаг обязан быть узким, а не догадливым:
 *     расширять его до администратора ресепшена значило бы объявить
 *     полномочие, которого сервер не проверяет.
 *
 * Роль передаётся СЫРОЙ, как она лежит в `users.role`, а не после сведения к
 * `staffRoleSchema`. Причина: сводящие обёртки в двух путях чтения падают в
 * РАЗНЫЕ значения по умолчанию — `settingsQuery.narrowStaffRole` в «assistant»,
 * а `domainStateHydration` в «doctor» (`staffRoleSchema.catch("doctor")`).
 * Второе выдало бы неизвестной роли право подписи ЭМК, то есть fail-open в
 * самом чувствительном флаге. `roleHasPermission` для роли вне матрицы
 * возвращает пустой набор, поэтому неизвестная, пустая и отсутствующая роль
 * получают здесь три `false` — это закреплено тестом
 * «неизвестная роль не получает прав (fail closed)».
 */
export interface StaffAuthorityFlags {
	canSignMedicalRecords: boolean;
	canManageMoney: boolean;
	canManageImports: boolean;
}

export function staffAuthorityFlags(
	role: string | null | undefined,
): StaffAuthorityFlags {
	return {
		canSignMedicalRecords: roleHasPermission(role, "clinical.write"),
		canManageMoney: roleHasPermission(role, "finance.write"),
		canManageImports: roleHasPermission(role, "settings.write"),
	};
}

/* ==================================================================== */
/*  ТЕКСТ ОТКАЗА ДЛЯ ЧЕЛОВЕКА                                            */
/* ==================================================================== */

/**
 * Русские подписи ролей.
 *
 * ЧТО БЫЛО. Отказ по роли — самая частая надпись отказа в продукте (обе функции
 * ниже вызываются с десятков маршрутов) — звучал как
 * `Роль «doctor» не имеет права «finance.write».` То есть называл КЛЮЧ БАЗЫ
 * (`users.role`) и ВНУТРЕННИЙ ИДЕНТИФИКАТОР права. Вред двойной, и второй хуже
 * первого: латинское слово из шести и более букв целиком гасит фразу фильтром
 * клиента (`apps/web/src/AppHelpers.tsx`, `technicalWorkflowFailurePattern` под
 * флагом `/i`), поэтому до экрана не доходило вообще ничего, и человек получал
 * подсказку по коду 403 — «войдите в смену заново». Повторный вход прав не
 * добавляет никогда: это ложное указание, а не безликий текст.
 *
 * Полнота словаря проверяется тестом против `ROLE_PERMISSIONS`: роль, добавленная
 * в матрицу без подписи здесь, роняет набор, а не возвращает ключ базы на экран.
 */
const ROLE_LABELS: Record<string, string> = {
	owner: "владелец клиники",
	admin: "администратор с полным доступом",
	manager: "управляющий",
	administrator: "администратор ресепшена",
	doctor: "врач",
	assistant: "ассистент",
};

/**
 * Что право РАЗРЕШАЕТ ДЕЛАТЬ, словами сотрудника. Ключ права в текст не попадает
 * — он остаётся отдельным машинным полем ответа, которым клиент различает
 * состояния. Тип `Record<Permission, string>` закрыт: новое право не
 * скомпилируется без подписи.
 */
const PERMISSION_ACTIONS: Record<Permission, string> = {
	"schedule.read": "смотреть расписание приёмов",
	"schedule.write": "менять расписание приёмов",
	"patients.read": "смотреть картотеку пациентов",
	"patients.write": "менять картотеку пациентов",
	"clinical.read": "смотреть медицинскую документацию",
	"clinical.write": "заполнять медицинскую документацию",
	"finance.read": "смотреть оплаты и кассу",
	"finance.write": "проводить оплаты и возвраты",
	"analytics.read": "смотреть отчёты клиники",
	"payroll.read": "смотреть выплаты врачам клиники",
	"payroll.read.own": "смотреть свои выплаты",
	"inventory.read": "смотреть склад материалов",
	"inventory.write": "менять остатки на складе",
	"settings.read": "смотреть настройки клиники",
	"settings.write": "менять настройки клиники",
	"egisz.submit": "отправлять документы в ЕГИСЗ",
	"communications.read": "смотреть переписку с пациентами",
	"communications.write": "отправлять сообщения и рассылки пациентам",
};

/**
 * Роли, которые клиника действительно может назначить сотруднику.
 *
 * ЗАЧЕМ ФИЛЬТР, А НЕ ВСЯ МАТРИЦА. В матрице есть легаси-написание `admin` (полные
 * права), которого нет в `staffRoleSchema` — той самой схеме, по которой
 * `/api/auth/invites/create` отвергает роль (`routes/auth.ts`, тест
 * `tests/routes/inviteRoleGuard.test.ts`). Назвать эту роль в подсказке значило
 * бы отправить человека к сотруднику, которого в его клинике не бывает: экран
 * приглашения такую должность не предлагает. Права роль сохраняет, в подсказке
 * не участвует.
 */
const ASSIGNABLE_ROLES: ReadonlySet<string> = new Set<string>(
	staffRoleSchema.options,
);

/**
 * Кого просить — подписями ролей. Источник один: та же матрица `ROLE_PERMISSIONS`,
 * поэтому изменение прав меняет подсказку само, без второго списка. Роль без
 * подписи в список не попадает (латиницы на экране быть не должно), и это ловит
 * тест полноты словаря, а не человек на экране.
 */
export function roleLabelsWithPermission(permission: Permission): string[] {
	const labels: string[] = [];
	for (const role of Object.keys(ROLE_PERMISSIONS)) {
		if (!ASSIGNABLE_ROLES.has(role)) continue;
		if (!ROLE_PERMISSIONS[role]?.includes(permission)) continue;
		const label = ROLE_LABELS[role];
		if (label) labels.push(label);
	}
	return labels;
}

function joinRoleLabels(labels: readonly string[]): string {
	if (labels.length <= 1) return labels[0] ?? "";
	return `${labels.slice(0, -1).join(", ")} и ${labels[labels.length - 1]}`;
}

/**
 * Подписи ролей хранятся строчными, потому что чаще стоят в середине фразы
 * («Это могут владелец клиники и врач»). В начале предложения нужна заглавная —
 * иначе отказ выглядит обрывком чужого текста.
 */
function capitalizeFirst(text: string): string {
	return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

/**
 * Отказ по роли человеческими словами: что нельзя, кому это можно и что делать.
 *
 * Причина не выдумывается. Сервер знает ровно две вещи — какое действие закрыто и
 * какая роль в токене; обе и названы. Если роли в матрице нет (устаревшая или
 * испорченная запись сотрудника), прав у неё нет вовсе — так и сказано, и
 * следующий шаг другой: роль нужно выбрать заново, а не искать коллегу.
 */
export function permissionRefusalMessage(
	role: string | null | undefined,
	permission: Permission,
): string {
	const action = PERMISSION_ACTIONS[permission];
	const roleLabel = role ? ROLE_LABELS[role.toLowerCase()] : undefined;
	if (!roleLabel) {
		return (
			`Ваша роль в клинике не настроена, поэтому ${action} ей не разрешено. ` +
			"Попросите владельца клиники выбрать вам роль в настройках."
		);
	}
	const allowed = roleLabelsWithPermission(permission);
	if (allowed.length === 0) {
		return `Ни одна роль клиники не может ${action}. Обратитесь к владельцу клиники.`;
	}
	/*
	 * Заглавная буква и точка на месте, а слова «действие недоступно» в начале
	 * НЕТ намеренно: клиент подставляет фразу после своего заголовка
	 * (`AppHelpers.responseErrorMessage`: `${fallback}: ${message}`), и с таким
	 * началом получалось «Действие не выполнено: Действие недоступно: …».
	 */
	return (
		`${capitalizeFirst(roleLabel)} не может ${action}. ` +
		`${allowed.length === 1 ? "Это может" : "Это могут"} ${joinRoleLabels(allowed)}. ` +
		"Попросите кого-то из них выполнить действие; если роль указана неверно, её меняет владелец клиники в настройках."
	);
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
			message:
				"Требуется вход сотрудника: действие выполняется от конкретного лица.",
		});
		return null;
	}
	if (!roleHasPermission(identity.role, permission)) {
		reply.code(403).send({
			error: "PermissionDenied",
			permission,
			role: identity.role,
			message: permissionRefusalMessage(identity.role, permission),
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
			message: permissionRefusalMessage(identity.role, permission),
		});
		return false;
	}
	return true;
}
