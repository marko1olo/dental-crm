/**
 * permissionChecks.ts — проверки прав ролей и формирование человекочитаемых отказов.
 */

import { normalizeStaffRoleToCanonical, staffRoleSchema } from "@dental/shared";
import {
	type Permission,
	ROLE_PERMISSIONS,
	ROLES_IN_MATRIX,
} from "./permissionMatrix.js";

/**
 * Соответствие прав Fastify бэкенда гранулярным ключам веб-интерфейса матрицы прав.
 */
export const BACKEND_TO_GRANULAR_PERMISSIONS_MAP: Record<Permission, readonly string[]> = {
	"schedule.read": ["schedule.view"],
	"schedule.write": ["schedule.manage"],
	"patients.read": ["patients.view_basic", "patients.pii_full"],
	"patients.write": ["patients.manage"],
	"clinical.read": ["clinical.records.view"],
	"clinical.write": ["clinical.records.write", "clinical.treatment_plans.manage"],
	"finance.read": ["finance.cashier_operations", "finance.reports_pnl", "finance.tariffs_manage"],
	"finance.write": ["finance.cashier_operations", "finance.refunds", "finance.tariffs_manage"],
	"analytics.read": ["finance.reports_pnl"],
	"payroll.read": ["payroll.view_all_staff"],
	"payroll.read.own": ["payroll.view_own"],
	"inventory.read": ["inventory.materials_writeoff", "inventory.warehouse_manage", "inventory.sanpin_journals"],
	"inventory.write": ["inventory.materials_writeoff", "inventory.warehouse_manage", "inventory.sanpin_journals"],
	"settings.read": ["settings.clinic_manage", "settings.staff_authority"],
	"settings.write": ["settings.clinic_manage", "settings.staff_authority"],
	"egisz.submit": ["egisz.send_records"],
	"communications.read": ["communications.send_messages"],
	"communications.write": ["communications.send_messages"],
	"agent.read": ["agent.read"],
	"agent.write": ["agent.write"],
	"workstation.read": ["workstation.read"],
	"workstation.write": ["workstation.write"],
};

/** Права роли. Неизвестная роль не получает ничего. */
export function permissionsForRole(
	role: string | null | undefined,
): readonly Permission[] {
	if (!role) return [];
	const normalized = role.toLowerCase().trim();
	const direct = ROLE_PERMISSIONS[normalized];
	if (direct) return direct;
	const canonical = normalizeStaffRoleToCanonical(normalized);
	if (canonical && canonical !== "unknown") {
		return ROLE_PERMISSIONS[canonical] ?? [];
	}
	return [];
}

export function roleHasPermission(
	role: string | null | undefined,
	permission: Permission,
): boolean {
	return permissionsForRole(role).includes(permission);
}

/**
 * Проверка прав роли с учетом сохраненных в БД переопределений матрицы прав (roleMatrixOverrides).
 * Поддерживает как прямые ключи backend-прав (e.g. "finance.write"), так и гранулярные ключи UI.
 */
export function roleHasPermissionWithOverrides(
	role: string | null | undefined,
	permission: Permission,
	overrides?: Record<string, Record<string, string | boolean>> | null,
): boolean {
	if (!role) return false;
	const normalizedRole = role.toLowerCase().trim();

	// Владелец и суперадминистратор обладают безусловным доступом (Мандат 8e / 8n)
	if (normalizedRole === "owner" || normalizedRole === "admin") {
		return true;
	}

	if (overrides && typeof overrides === "object") {
		const canonical = normalizeStaffRoleToCanonical(normalizedRole);
		const roleRules =
			overrides[normalizedRole] ??
			(canonical !== "unknown" ? overrides[canonical] : undefined);

		if (roleRules && typeof roleRules === "object") {
			// 1. Проверяем прямое совпадение по имени backend-права (например "clinical.write")
			const directVal = roleRules[permission];
			if (directVal !== undefined) {
				if (directVal === "none" || directVal === false) return false;
				if (
					directVal === "full" ||
					directVal === true ||
					(permission.endsWith(".read") && (directVal === "read" || directVal === "own"))
				) {
					return true;
				}
			}

			// 2. Проверяем соответствие гранулярным ключам интерфейса
			const granularKeys = BACKEND_TO_GRANULAR_PERMISSIONS_MAP[permission] ?? [];
			if (granularKeys.length > 0) {
				const values = granularKeys
					.map((k) => roleRules[k])
					.filter((v): v is string | boolean => v !== undefined);

				if (values.length > 0) {
					const hasFull = values.some(
						(v) => v === "full" || v === true,
					);
					const hasRead = values.some(
						(v) => v === "read" || v === "own" || v === "full" || v === true,
					);
					const allNone = values.every(
						(v) => v === "none" || v === false,
					);

					if (allNone) return false;
					if (permission.endsWith(".read") && hasRead) return true;
					if (hasFull) return true;
				}
			}
		}
	}

	// По умолчанию проверяем базовую матрицу прав
	return roleHasPermission(role, permission);
}

/* ==================================================================== */
/*  ТЕКСТ ОТКАЗА ДЛЯ ЧЕЛОВЕКА                                            */
/* ==================================================================== */

/**
 * Русские подписи ролей.
 */
const ROLE_LABELS: Record<string, string> = {
	owner: "владелец клиники",
	admin: "администратор с полным доступом",
	head_doctor: "главный врач",
	manager: "управляющий",
	accountant: "бухгалтер",
	senior_admin: "старший администратор",
	administrator: "администратор ресепшена",
	registrar: "регистратор ресепшена",
	doctor: "врач",
	senior_nurse: "старшая медсестра",
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
	ROLES_IN_MATRIX.filter((role) => role !== "admin"),
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
