/**
 * permissionChecks.ts — проверки прав ролей и формирование человекочитаемых отказов.
 */

import { staffRoleSchema } from "@dental/shared";
import {
	type Permission,
	ROLE_PERMISSIONS,
} from "./permissionMatrix.js";

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
/*  ТЕКСТ ОТКАЗА ДЛЯ ЧЕЛОВЕКА                                            */
/* ==================================================================== */

/**
 * Русские подписи ролей.
 *
 * ЧТО БЫЛО. Отказ по роли — самая частая надпись отказа в продукте — звучал как
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
	curator: "куратор лечения",
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
	"agent.read": "управлять ИИ-ассистентом клиники",
	"agent.write": "настраивать сценарии ИИ-ассистента",
	"workstation.read": "просматривать файлы рабочей станции",
	"workstation.write": "управлять оборудованием и файлами рабочей станции",
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
	return text.length === 0 ? text : text[0]?.toUpperCase() + text.slice(1);
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
