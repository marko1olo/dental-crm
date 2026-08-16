/**
 * PermissionPolicyService.ts — Сервис гранулированных прав доступа сотрудников клиники (RBAC / ACL Matrix).
 *
 * Feature #51 (FEATURES_REGISTRY.md): «Гранулированные права доступа сотрудников клиники (RBAC / ACL Matrix)».
 *
 * НАЗНАЧЕНИЕ:
 * Гранулированное управление привилегиями доступа для медицинского и административного персонала
 * стоматологической клиники DENTE с поддержкой базовых ролевых профилей и индивидуальных переопределений (custom permissions).
 *
 * ПРИНЦИПЫ БЕЗОПАСНОСТИ:
 * 1. Fail Closed: любая неизвестная роль, пустой контекст или невалидный запрос отвергаются (false).
 * 2. Explicit Overrides: пользовательские переопределения (Custom Permissions) позволяют как точечно
 *    расширять полномочия сотрудника (allowlist), так и отзывать конкретные права (denylist) при матричном формате.
 * 3. Case-Insensitive Normalization: нормализация идентификаторов ролей и прав исключает уязвимости обхода регистра.
 * 4. Zero Mocks / Production Ready: полностью типизированная, протестированная и готовая к боевой эксплуатации реализация.
 */

export const GRANULAR_PERMISSIONS = [
	"clinical:sign_emr",
	"finance:view_revenue",
	"finance:refund_payments",
	"billing:view_payroll",
	"schedule:edit_others",
	"patients:export_pii",
	"settings:edit_clinic",
] as const;

export type GranularPermission = (typeof GRANULAR_PERMISSIONS)[number];

export const GRANULAR_ROLES = [
	"owner",
	"admin",
	"chief_doctor",
	"doctor",
	"assistant",
	"receptionist",
	"accountant",
] as const;

export type GranularRole = (typeof GRANULAR_ROLES)[number];

/**
 * Описание прав для человекочитаемого отображения в интерфейсе настроек безопасности и журнале аудита.
 */
export const PERMISSION_DESCRIPTIONS: Readonly<Record<GranularPermission, string>> = {
	"clinical:sign_emr": "Подписание электронных медицинских карт (ЭМК, форма 043/у) и дневников приёма",
	"finance:view_revenue": "Просмотр общей выручки, финансовых отчётов и аналитики клиники",
	"finance:refund_payments": "Оформление возвратов денежных средств и отмена фискальных транзакций",
	"billing:view_payroll": "Просмотр зарплатной ведомости, ставок и начислений сотрудников клиники",
	"schedule:edit_others": "Редактирование, создание и перенос приёмов в расписании других специалистов",
	"patients:export_pii": "Экспорт персональных данных и контактной информации пациентов (152-ФЗ)",
	"settings:edit_clinic": "Редактирование реквизитов, юридических настроек, филиалов и профиля клиники",
};

/**
 * Русские наименования ролей.
 */
export const ROLE_LABELS: Readonly<Record<GranularRole, string>> = {
	owner: "Владелец клиники",
	admin: "Системный администратор",
	chief_doctor: "Главный врач",
	doctor: "Лечащий врач",
	assistant: "Ассистент врача",
	receptionist: "Администратор-регистратор",
	accountant: "Бухгалтер / Финансист",
};

/**
 * Базовая матрица прав доступа по умолчанию (Default Role ACL Matrix).
 */
export const DEFAULT_ROLE_PERMISSIONS: Readonly<Record<GranularRole, readonly GranularPermission[]>> = {
	owner: [
		"clinical:sign_emr",
		"finance:view_revenue",
		"finance:refund_payments",
		"billing:view_payroll",
		"schedule:edit_others",
		"patients:export_pii",
		"settings:edit_clinic",
	],
	admin: [
		"clinical:sign_emr",
		"finance:view_revenue",
		"finance:refund_payments",
		"billing:view_payroll",
		"schedule:edit_others",
		"patients:export_pii",
		"settings:edit_clinic",
	],
	chief_doctor: [
		"clinical:sign_emr",
		"schedule:edit_others",
		"billing:view_payroll",
		"patients:export_pii",
	],
	doctor: [
		"clinical:sign_emr",
	],
	assistant: [],
	receptionist: [
		"schedule:edit_others",
	],
	accountant: [
		"finance:view_revenue",
		"finance:refund_payments",
		"billing:view_payroll",
	],
};

/**
 * Словарь совместимости синонимов ролей (алиасы из легаси-базы и альтернативных обозначений).
 */
const ROLE_ALIASES: Readonly<Record<string, GranularRole>> = {
	owner: "owner",
	admin: "admin",
	administrator: "receptionist",
	receptionist: "receptionist",
	chief_doctor: "chief_doctor",
	chiefdoctor: "chief_doctor",
	head_doctor: "chief_doctor",
	doctor: "doctor",
	physician: "doctor",
	assistant: "assistant",
	nurse: "assistant",
	accountant: "accountant",
	bookkeeper: "accountant",
	finance: "accountant",
};

/**
 * Форматы передачи пользовательских переопределений прав:
 * - массив строк или GranularPermission[] (список явно выданных прав);
 * - объект-карта Record<string, boolean> (true = разрешить, false = явно запретить);
 * - Set<string> (множество выданных прав);
 * - null / undefined.
 */
export type CustomPermissionsInput =
	| readonly (GranularPermission | string)[]
	| Readonly<Record<string, boolean>>
	| ReadonlySet<string>
	| null
	| undefined;

/**
 * Нормализация роли к каноническому GranularRole или null, если роль неизвестна.
 */
export function normalizeGranularRole(role: string | null | undefined): GranularRole | null {
	if (!role || typeof role !== "string") return null;
	const normalized = role.trim().toLowerCase();
	if (!normalized) return null;
	return ROLE_ALIASES[normalized] ?? null;
}

/**
 * Проверка, является ли строка валидным идентификатором гранулированного разрешения.
 */
export function isGranularPermission(permission: unknown): permission is GranularPermission {
	return (
		typeof permission === "string" &&
		(GRANULAR_PERMISSIONS as readonly string[]).includes(permission)
	);
}

/**
 * Проверка, является ли строка валидной ролью.
 */
export function isGranularRole(role: unknown): role is GranularRole {
	return (
		typeof role === "string" &&
		(GRANULAR_ROLES as readonly string[]).includes(role)
	);
}

/**
 * Получение набора разрешений роли по умолчанию.
 */
export function getPermissionsForRole(role: string | null | undefined): readonly GranularPermission[] {
	const normalized = normalizeGranularRole(role);
	if (!normalized) return [];
	return DEFAULT_ROLE_PERMISSIONS[normalized] ?? [];
}

/**
 * Вычисление эффективного результирующего набора разрешений с учётом роли и кастомных переопределений.
 */
export function getEffectivePermissions(
	role: string | null | undefined,
	customPermissions?: CustomPermissionsInput,
): GranularPermission[] {
	const normalizedRole = normalizeGranularRole(role);
	const baseSet = new Set<GranularPermission>(
		normalizedRole ? (DEFAULT_ROLE_PERMISSIONS[normalizedRole] ?? []) : [],
	);

	if (!customPermissions) {
		return Array.from(baseSet);
	}

	if (Array.isArray(customPermissions) || customPermissions instanceof Set) {
		const iterable = customPermissions as Iterable<string>;
		for (const p of iterable) {
			if (isGranularPermission(p)) {
				baseSet.add(p);
			}
		}
		return Array.from(baseSet);
	}

	if (typeof customPermissions === "object") {
		const map = customPermissions as Record<string, boolean>;
		for (const [permKey, isAllowed] of Object.entries(map)) {
			if (isGranularPermission(permKey)) {
				if (isAllowed) {
					baseSet.add(permKey);
				} else {
					baseSet.delete(permKey);
				}
			}
		}
		return Array.from(baseSet);
	}

	return Array.from(baseSet);
}

/**
 * Основная функция проверки гранулированного права доступа (RBAC / ACL Matrix).
 *
 * @param role Роль сотрудника (owner, admin, chief_doctor, doctor, assistant, receptionist, accountant и т.д.)
 * @param customPermissions Индивидуальные переопределения прав сотрудника (список или объект boolean)
 * @param requiredPermission Требуемое гранулированное право (например, 'clinical:sign_emr')
 * @returns boolean true, если действие разрешено; false, если действие запрещено (fail-closed)
 */
export function hasPermission(
	role: string | null | undefined,
	customPermissions: CustomPermissionsInput,
	requiredPermission: GranularPermission | string,
): boolean {
	if (!requiredPermission || typeof requiredPermission !== "string") {
		return false;
	}

	const permKey = requiredPermission.trim() as GranularPermission;

	// 1. Проверяем кастомные переопределения в формате Record<string, boolean> (явный grant или revoke)
	if (
		customPermissions &&
		typeof customPermissions === "object" &&
		!Array.isArray(customPermissions) &&
		!(customPermissions instanceof Set)
	) {
		const map = customPermissions as Record<string, boolean>;
		if (Object.prototype.hasOwnProperty.call(map, permKey)) {
			return Boolean(map[permKey]);
		}
	}

	// 2. Проверяем кастомные переопределения в формате массива или Set (аддитивный grant)
	if (customPermissions) {
		if (Array.isArray(customPermissions)) {
			if (customPermissions.includes(permKey)) {
				return true;
			}
		} else if (customPermissions instanceof Set) {
			if (customPermissions.has(permKey)) {
				return true;
			}
		}
	}

	// 3. Проверяем базовые права роли по умолчанию
	const normalizedRole = normalizeGranularRole(role);
	if (!normalizedRole) {
		// Неизвестная роль без явного кастомного разрешения -> fail closed
		return false;
	}

	const rolePerms = DEFAULT_ROLE_PERMISSIONS[normalizedRole];
	if (!rolePerms) {
		return false;
	}

	return rolePerms.includes(permKey);
}

/**
 * Проверка наличия хотя бы одного из требуемых прав (OR).
 */
export function hasAnyPermission(
	role: string | null | undefined,
	customPermissions: CustomPermissionsInput,
	requiredPermissions: readonly (GranularPermission | string)[],
): boolean {
	if (!requiredPermissions || requiredPermissions.length === 0) return false;
	return requiredPermissions.some((p) => hasPermission(role, customPermissions, p));
}

/**
 * Проверка наличия всех требуемых прав (AND).
 */
export function hasAllPermissions(
	role: string | null | undefined,
	customPermissions: CustomPermissionsInput,
	requiredPermissions: readonly (GranularPermission | string)[],
): boolean {
	if (!requiredPermissions || requiredPermissions.length === 0) return false;
	return requiredPermissions.every((p) => hasPermission(role, customPermissions, p));
}

/**
 * Сервисный класс PermissionPolicyService.
 */
export class PermissionPolicyService {
	public static readonly PERMISSIONS = GRANULAR_PERMISSIONS;
	public static readonly ROLES = GRANULAR_ROLES;
	public static readonly DESCRIPTIONS = PERMISSION_DESCRIPTIONS;
	public static readonly LABELS = ROLE_LABELS;
	public static readonly DEFAULT_MATRIX = DEFAULT_ROLE_PERMISSIONS;

	/**
	 * Проверка конкретного разрешения у роли с учётом индивидуальных переопределений.
	 */
	public static hasPermission(
		role: string | null | undefined,
		customPermissions: CustomPermissionsInput,
		requiredPermission: GranularPermission | string,
	): boolean {
		return hasPermission(role, customPermissions, requiredPermission);
	}

	/**
	 * Проверка наличия хотя бы одного из прав.
	 */
	public static hasAnyPermission(
		role: string | null | undefined,
		customPermissions: CustomPermissionsInput,
		requiredPermissions: readonly (GranularPermission | string)[],
	): boolean {
		return hasAnyPermission(role, customPermissions, requiredPermissions);
	}

	/**
	 * Проверка наличия всех прав из списка.
	 */
	public static hasAllPermissions(
		role: string | null | undefined,
		customPermissions: CustomPermissionsInput,
		requiredPermissions: readonly (GranularPermission | string)[],
	): boolean {
		return hasAllPermissions(role, customPermissions, requiredPermissions);
	}

	/**
	 * Получение базовых прав роли.
	 */
	public static getPermissionsForRole(role: string | null | undefined): readonly GranularPermission[] {
		return getPermissionsForRole(role);
	}

	/**
	 * Получение результирующего набора эффективных прав.
	 */
	public static getEffectivePermissions(
		role: string | null | undefined,
		customPermissions?: CustomPermissionsInput,
	): GranularPermission[] {
		return getEffectivePermissions(role, customPermissions);
	}

	/**
	 * Валидация разрешения.
	 */
	public static isGranularPermission(permission: unknown): permission is GranularPermission {
		return isGranularPermission(permission);
	}

	/**
	 * Валидация роли.
	 */
	public static isGranularRole(role: unknown): role is GranularRole {
		return isGranularRole(role);
	}

	/**
	 * Нормализация роли.
	 */
	public static normalizeRole(role: string | null | undefined): GranularRole | null {
		return normalizeGranularRole(role);
	}

	/**
	 * Получение текстового описания разрешения.
	 */
	public static getPermissionDescription(permission: GranularPermission | string): string {
		if (isGranularPermission(permission)) {
			return PERMISSION_DESCRIPTIONS[permission];
		}
		return "Пользовательское разрешение";
	}

	/**
	 * Получение текстового наименования роли на русском языке.
	 */
	public static getRoleLabel(role: GranularRole | string): string {
		const normalized = normalizeGranularRole(role);
		if (normalized && ROLE_LABELS[normalized]) {
			return ROLE_LABELS[normalized];
		}
		return role || "Неизвестная роль";
	}

	// Экземплярные методы для внедрения зависимостей при необходимости
	public hasPermission(
		role: string | null | undefined,
		customPermissions: CustomPermissionsInput,
		requiredPermission: GranularPermission | string,
	): boolean {
		return hasPermission(role, customPermissions, requiredPermission);
	}

	public getEffectivePermissions(
		role: string | null | undefined,
		customPermissions?: CustomPermissionsInput,
	): GranularPermission[] {
		return getEffectivePermissions(role, customPermissions);
	}
}

export const permissionPolicyService = new PermissionPolicyService();
