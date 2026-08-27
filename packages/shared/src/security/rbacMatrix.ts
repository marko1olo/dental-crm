/**
 * rbacMatrix.ts — Гранулярная ролевая матрица и модель прав доступа DENTE CRM.
 *
 * 8 канонических ролей медицинского и административного персонала:
 *  1. owner — Владелец / Директор (полный доступ ко всей клинике, P&L, тарифам, зарплатам и настройкам)
 *  2. head_doctor — Главный врач (начмед) (клинический надзор, ЭМК, протоколы, ЕГИСЗ, аудит качества, расписание, допуск к ПДн)
 *  3. doctor — Врач-клиницист (приёмы, ЭМК, планы лечения, личная сделка; изоляция от общей финансовой отчётности)
 *  4. assistant — Ассистент (списание материалов, помощь на приёме, журналы стерилизации; маскирование ПДн 152-ФЗ, без кассы)
 *  5. senior_nurse — Старшая медсестра (СанПиН, дезинфекция, стерилизация, автоклавы, склад медикаментов и расходников)
 *  6. senior_admin — Старший администратор (расписание, касса, картотека, запись, коммуникации, неэкранированные телефоны; без P&L)
 *  7. registrar — Регистратор (первичная запись, звонки, оформление пациентов, базовый чек; маскирование расширенных ПДн)
 *  8. accountant — Бухгалтер / Финансист (касса, 54-ФЗ, зарплатные ведомости, сверка ЗТЛ, инвентаризация; без права менять ЭМК)
 */

import { z } from "zod";

export const GRANULAR_STAFF_ROLES = [
	"owner",
	"head_doctor",
	"doctor",
	"assistant",
	"senior_nurse",
	"senior_admin",
	"registrar",
	"accountant",
] as const;

export type GranularStaffRole = (typeof GRANULAR_STAFF_ROLES)[number];

export const granularStaffRoleSchema = z.enum(GRANULAR_STAFF_ROLES);

export interface RoleMetadata {
	readonly role: GranularStaffRole;
	readonly title: string;
	readonly shortTitle: string;
	readonly description: string;
	readonly category: "management" | "clinical" | "nursing" | "front_desk" | "finance";
	readonly colorTheme: "purple" | "blue" | "teal" | "emerald" | "amber" | "rose" | "slate" | "indigo";
}

export const ROLE_METADATA_REGISTRY: Record<GranularStaffRole, RoleMetadata> = {
	owner: {
		role: "owner",
		title: "Владелец / Директор",
		shortTitle: "Директор",
		description: "Полный доступ ко всей клинике, P&L отчётности, управлению ставками, зарплатам и настройкам безопасности.",
		category: "management",
		colorTheme: "purple",
	},
	head_doctor: {
		role: "head_doctor",
		title: "Главный врач (начмед)",
		shortTitle: "Начмед",
		description: "Клинический контроль качества, верификация ЭМК, протоколы лечения, аудит, передача в ЕГИСЗ и аналитика приёмов.",
		category: "clinical",
		colorTheme: "blue",
	},
	doctor: {
		role: "doctor",
		title: "Врач-клиницист",
		shortTitle: "Врач",
		description: "Ведение приёма, заполнение ЭМК, составление планов лечения, просмотр личной сдельной выработки. Финансы клиники скрыты.",
		category: "clinical",
		colorTheme: "teal",
	},
	assistant: {
		role: "assistant",
		title: "Ассистент врача",
		shortTitle: "Ассистент",
		description: "Помощь на приёме, списание израсходованных материалов, ведение журналов стерилизации. Доступ к ПДн маскирован.",
		category: "nursing",
		colorTheme: "emerald",
	},
	senior_nurse: {
		role: "senior_nurse",
		title: "Старшая медсестра",
		shortTitle: "Старшая м/с",
		description: "Контроль СанПиН, учёт автоклавов и азопирамовых проб, склад медикаментов, закупка расходных материалов и утилизация.",
		category: "nursing",
		colorTheme: "amber",
	},
	senior_admin: {
		role: "senior_admin",
		title: "Старший администратор",
		shortTitle: "Ст. админ",
		description: "Управление расписанием и сменами, кассовые операции, первичный приём пациентов, маршрутизация звонков и рассылки.",
		category: "front_desk",
		colorTheme: "indigo",
	},
	registrar: {
		role: "registrar",
		title: "Регистратор / Администратор",
		shortTitle: "Регистратор",
		description: "Запись на приём, встреча пациентов, подтверждение визитов, приём базовой оплаты. Доступ к глубокой аналитике закрыт.",
		category: "front_desk",
		colorTheme: "slate",
	},
	accountant: {
		role: "accountant",
		title: "Бухгалтер / Финансист",
		shortTitle: "Бухгалтер",
		description: "Кассовые книги, фискализация 54-ФЗ, расчёт сдельной оплаты и зарплатных ведомостей, акты сверки с ЗТЛ и поставщиками.",
		category: "finance",
		colorTheme: "rose",
	},
};

/**
 * Категории полномочий системы
 */
export const PERMISSION_MODULES = [
	"clinical",
	"schedule",
	"patients",
	"finance_cashier",
	"finance_reports",
	"payroll",
	"inventory",
	"settings",
	"egisz",
	"communications",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export type AccessLevel = "none" | "own" | "read" | "full";

export interface PermissionDefinition {
	readonly key: string;
	readonly module: PermissionModule;
	readonly title: string;
	readonly description: string;
	readonly requiresVerification?: boolean;
}

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
	// Клинический модуль
	{
		key: "clinical.records.view",
		module: "clinical",
		title: "Просмотр медицинских карт (ЭМК)",
		description: "Доступ к просмотру зубных формул, дневников приёма и планов лечения.",
	},
	{
		key: "clinical.records.write",
		module: "clinical",
		title: "Ведение и подписание ЭМК",
		description: "Право вносить клинические протоколы, ставить диагнозы по МКБ-10 и подписывать дневники.",
	},
	{
		key: "clinical.treatment_plans.manage",
		module: "clinical",
		title: "Составление комплексных планов лечения",
		description: "Формирование этапных смет и подбор номенклатуры 804н.",
	},
	// Расписание
	{
		key: "schedule.view",
		module: "schedule",
		title: "Просмотр расписания приёмов",
		description: "Отображение сетки приёмов врачей и кресел клиники.",
	},
	{
		key: "schedule.manage",
		module: "schedule",
		title: "Управление записью и сменами",
		description: "Создание, перенос, отмена визитов и настройка графиков работы врачей.",
	},
	// Пациенты и 152-ФЗ
	{
		key: "patients.view_basic",
		module: "patients",
		title: "Просмотр картотеки пациентов",
		description: "Поиск пациентов в базе и просмотр базовой истории визитов.",
	},
	{
		key: "patients.pii_full",
		module: "patients",
		title: "Полный доступ к персональным данным (152-ФЗ)",
		description: "Отображение неэкранированных номеров телефонов, паспортных данных, адресов и СНИЛС.",
	},
	{
		key: "patients.manage",
		module: "patients",
		title: "Редактирование карточек пациентов",
		description: "Внесение и изменение паспортных данных, адресов, льгот и согласий на обработку ПДн.",
	},
	// Касса и финансы
	{
		key: "finance.cashier_operations",
		module: "finance_cashier",
		title: "Приём оплат и пробитие чеков (54-ФЗ)",
		description: "Проведение наличных, безналичных оплат, использование депозитов и выдача фискальных чеков.",
	},
	{
		key: "finance.refunds",
		module: "finance_cashier",
		title: "Проведение возвратов денежных средств",
		description: "Операции возврата прихода и коррекции ошибочно пробитых чеков.",
	},
	// Финансовая аналитика и отчетность
	{
		key: "finance.reports_pnl",
		module: "finance_reports",
		title: "Финансовый P&L, выручка и маржинальность",
		description: "Сводные финансовые отчёты клиники, показатели среднего чека, рентабельности и маржи.",
	},
	{
		key: "finance.tariffs_manage",
		module: "finance_reports",
		title: "Управление прейскурантом и ценами",
		description: "Редактирование цен, категорий услуг 804н и технологических карт расходов.",
	},
	// Зарплата и мотивация
	{
		key: "payroll.view_own",
		module: "payroll",
		title: "Просмотр собственной сдельной оплаты",
		description: "Детализация личной выработки, начисленного процента от приёма и удержаний за ЗТЛ.",
	},
	{
		key: "payroll.view_all_staff",
		module: "payroll",
		title: "Зарплатные ведомости всех сотрудников",
		description: "Сводный зарплатный табель клиники, оклады, премии и начисления всей команде.",
	},
	{
		key: "payroll.manage_rates",
		module: "payroll",
		title: "Настройка индивидуальных ставок и процентов",
		description: "Установка базовых % от терапевтического/ортопедического приёма и правил списания ЗТЛ.",
	},
	// Склад и СанПиН
	{
		key: "inventory.materials_writeoff",
		module: "inventory",
		title: "Списание материалов на визите",
		description: "Фиксация израсходованных анестетиков, пломбировочных материалов и слепочных масс.",
	},
	{
		key: "inventory.warehouse_manage",
		module: "inventory",
		title: "Складской учёт и приход накладных",
		description: "Оприходование партий, списание по срокам годности, инвентаризация и маркировка Честный ЗНАК.",
	},
	{
		key: "inventory.sanpin_journals",
		module: "inventory",
		title: "Журналы СанПиН и стерилизации",
		description: "Заполнение журналов работы автоклавов, азопирамовых проб, генеральных уборок и дезинфекции.",
	},
	// Настройки и безопасность
	{
		key: "settings.clinic_manage",
		module: "settings",
		title: "Настройки клиники и филиалов",
		description: "Реквизиты юридического лица, интеграции (WhatsApp, Telegram, ЕГИСЗ), режим клиники.",
	},
	{
		key: "settings.staff_authority",
		module: "settings",
		title: "Управление ролями и матрицей прав",
		description: "Назначение должностей персоналу, выдача персональных надбавок и смена PIN-кодов.",
	},
	// ЕГИСЗ
	{
		key: "egisz.send_records",
		module: "egisz",
		title: "Отправка СЭМД в ЕГИСЗ Минздрава РФ",
		description: "Формирование и подписание квалифицированной ЭЦП медицинских документов для РЭМД ЕГИСЗ.",
	},
	// Коммуникации
	{
		key: "communications.send_messages",
		module: "communications",
		title: "Отправка сообщений и напоминаний",
		description: "SMS, WhatsApp и Telegram рассылки с подтверждением записи на приём.",
	},
];

/**
 * Каноническая матрица прав доступа: Роль -> Модуль -> Уровень доступа
 */
export const GRANULAR_ROLE_MATRIX: Record<
	GranularStaffRole,
	Record<string, AccessLevel>
> = {
	owner: {
		"clinical.records.view": "full",
		"clinical.records.write": "full",
		"clinical.treatment_plans.manage": "full",
		"schedule.view": "full",
		"schedule.manage": "full",
		"patients.view_basic": "full",
		"patients.pii_full": "full",
		"patients.manage": "full",
		"finance.cashier_operations": "full",
		"finance.refunds": "full",
		"finance.reports_pnl": "full",
		"finance.tariffs_manage": "full",
		"payroll.view_own": "full",
		"payroll.view_all_staff": "full",
		"payroll.manage_rates": "full",
		"inventory.materials_writeoff": "full",
		"inventory.warehouse_manage": "full",
		"inventory.sanpin_journals": "full",
		"settings.clinic_manage": "full",
		"settings.staff_authority": "full",
		"egisz.send_records": "full",
		"communications.send_messages": "full",
	},
	head_doctor: {
		"clinical.records.view": "full",
		"clinical.records.write": "full",
		"clinical.treatment_plans.manage": "full",
		"schedule.view": "full",
		"schedule.manage": "full",
		"patients.view_basic": "full",
		"patients.pii_full": "full",
		"patients.manage": "full",
		"finance.cashier_operations": "read",
		"finance.refunds": "none",
		"finance.reports_pnl": "read",
		"finance.tariffs_manage": "read",
		"payroll.view_own": "full",
		"payroll.view_all_staff": "read",
		"payroll.manage_rates": "none",
		"inventory.materials_writeoff": "full",
		"inventory.warehouse_manage": "read",
		"inventory.sanpin_journals": "full",
		"settings.clinic_manage": "read",
		"settings.staff_authority": "none",
		"egisz.send_records": "full",
		"communications.send_messages": "read",
	},
	doctor: {
		"clinical.records.view": "full",
		"clinical.records.write": "full",
		"clinical.treatment_plans.manage": "full",
		"schedule.view": "full",
		"schedule.manage": "own",
		"patients.view_basic": "full",
		"patients.pii_full": "full",
		"patients.manage": "read",
		"finance.cashier_operations": "none",
		"finance.refunds": "none",
		"finance.reports_pnl": "none", // Строгая изоляция финансов клиники!
		"finance.tariffs_manage": "read",
		"payroll.view_own": "own", // Видит только свою сдельную выработку
		"payroll.view_all_staff": "none", // Общие зарплаты скрыты!
		"payroll.manage_rates": "none",
		"inventory.materials_writeoff": "full",
		"inventory.warehouse_manage": "none",
		"inventory.sanpin_journals": "read",
		"settings.clinic_manage": "none",
		"settings.staff_authority": "none",
		"egisz.send_records": "full",
		"communications.send_messages": "read",
	},
	assistant: {
		"clinical.records.view": "read",
		"clinical.records.write": "none",
		"clinical.treatment_plans.manage": "none",
		"schedule.view": "full",
		"schedule.manage": "none",
		"patients.view_basic": "read",
		"patients.pii_full": "none", // 152-ФЗ маскирование телефонов и ПДн!
		"patients.manage": "none",
		"finance.cashier_operations": "none",
		"finance.refunds": "none",
		"finance.reports_pnl": "none",
		"finance.tariffs_manage": "none",
		"payroll.view_own": "own",
		"payroll.view_all_staff": "none",
		"payroll.manage_rates": "none",
		"inventory.materials_writeoff": "full",
		"inventory.warehouse_manage": "read",
		"inventory.sanpin_journals": "full",
		"settings.clinic_manage": "none",
		"settings.staff_authority": "none",
		"egisz.send_records": "none",
		"communications.send_messages": "none",
	},
	senior_nurse: {
		"clinical.records.view": "read",
		"clinical.records.write": "none",
		"clinical.treatment_plans.manage": "none",
		"schedule.view": "full",
		"schedule.manage": "none",
		"patients.view_basic": "read",
		"patients.pii_full": "none",
		"patients.manage": "none",
		"finance.cashier_operations": "none",
		"finance.refunds": "none",
		"finance.reports_pnl": "none",
		"finance.tariffs_manage": "none",
		"payroll.view_own": "own",
		"payroll.view_all_staff": "none",
		"payroll.manage_rates": "none",
		"inventory.materials_writeoff": "full",
		"inventory.warehouse_manage": "full",
		"inventory.sanpin_journals": "full",
		"settings.clinic_manage": "none",
		"settings.staff_authority": "none",
		"egisz.send_records": "none",
		"communications.send_messages": "none",
	},
	senior_admin: {
		"clinical.records.view": "read",
		"clinical.records.write": "none",
		"clinical.treatment_plans.manage": "read",
		"schedule.view": "full",
		"schedule.manage": "full",
		"patients.view_basic": "full",
		"patients.pii_full": "full",
		"patients.manage": "full",
		"finance.cashier_operations": "full",
		"finance.refunds": "full",
		"finance.reports_pnl": "none", // P&L клиники и маржа скрыты от ресепшена!
		"finance.tariffs_manage": "read",
		"payroll.view_own": "own",
		"payroll.view_all_staff": "none",
		"payroll.manage_rates": "none",
		"inventory.materials_writeoff": "read",
		"inventory.warehouse_manage": "read",
		"inventory.sanpin_journals": "read",
		"settings.clinic_manage": "read",
		"settings.staff_authority": "none",
		"egisz.send_records": "none",
		"communications.send_messages": "full",
	},
	registrar: {
		"clinical.records.view": "read",
		"clinical.records.write": "none",
		"clinical.treatment_plans.manage": "none",
		"schedule.view": "full",
		"schedule.manage": "full",
		"patients.view_basic": "full",
		"patients.pii_full": "full", // Видит телефон для звонка пациенту
		"patients.manage": "full",
		"finance.cashier_operations": "full",
		"finance.refunds": "none", // Возвраты только через старшего админа/бухгалтера
		"finance.reports_pnl": "none",
		"finance.tariffs_manage": "read",
		"payroll.view_own": "own",
		"payroll.view_all_staff": "none",
		"payroll.manage_rates": "none",
		"inventory.materials_writeoff": "none",
		"inventory.warehouse_manage": "none",
		"inventory.sanpin_journals": "none",
		"settings.clinic_manage": "none",
		"settings.staff_authority": "none",
		"egisz.send_records": "none",
		"communications.send_messages": "full",
	},
	accountant: {
		"clinical.records.view": "read",
		"clinical.records.write": "none",
		"clinical.treatment_plans.manage": "read",
		"schedule.view": "full",
		"schedule.manage": "none",
		"patients.view_basic": "full",
		"patients.pii_full": "full",
		"patients.manage": "read",
		"finance.cashier_operations": "full",
		"finance.refunds": "full",
		"finance.reports_pnl": "full",
		"finance.tariffs_manage": "full",
		"payroll.view_own": "full",
		"payroll.view_all_staff": "full",
		"payroll.manage_rates": "full",
		"inventory.materials_writeoff": "read",
		"inventory.warehouse_manage": "full",
		"inventory.sanpin_journals": "read",
		"settings.clinic_manage": "read",
		"settings.staff_authority": "none",
		"egisz.send_records": "none",
		"communications.send_messages": "none",
	},
};

/**
 * Нормализует строковое значение роли к гранулярному перечислению
 */
export function normalizeStaffRole(rawRole: string | null | undefined): GranularStaffRole {
	if (!rawRole) return "registrar";
	const normalized = rawRole.trim().toLowerCase();
	switch (normalized) {
		case "owner":
		case "director":
		case "admin":
			return "owner";
		case "head_doctor":
		case "chief_medical_officer":
		case "chief_doctor":
			return "head_doctor";
		case "doctor":
		case "clinician":
		case "therapist":
		case "orthopedist":
		case "surgeon":
		case "orthodontist":
		case "periodontist":
		case "hygienist":
		case "pediatric":
		case "implantologist":
			return "doctor";
		case "assistant":
			return "assistant";
		case "senior_nurse":
		case "head_nurse":
		case "nurse":
			return "senior_nurse";
		case "senior_admin":
		case "senior_administrator":
		case "manager":
			return "senior_admin";
		case "registrar":
		case "administrator":
		case "receptionist":
			return "registrar";
		case "accountant":
		case "financier":
		case "finance":
			return "accountant";
		default:
			return "registrar";
	}
}

/**
 * Проверяет наличие конкретного уровня доступа
 */
export function hasPermission(
	role: string | null | undefined,
	permissionKey: string,
	minimumLevel: AccessLevel = "read",
): boolean {
	const granularRole = normalizeStaffRole(role);
	const rolePermissions = GRANULAR_ROLE_MATRIX[granularRole];
	if (!rolePermissions) return false;
	const level = rolePermissions[permissionKey] ?? "none";

	if (level === "none") return false;
	if (minimumLevel === "none") return true;
	if (minimumLevel === "own") return level === "own" || level === "read" || level === "full";
	if (minimumLevel === "read") return level === "read" || level === "full";
	if (minimumLevel === "full") return level === "full";

	return false;
}

/**
 * Безопасная проверка: разрешён ли просмотр общей финансовой отчётности (P&L, маржа клиники)
 */
export function canViewFinancialReports(role: string | null | undefined): boolean {
	return hasPermission(role, "finance.reports_pnl", "read");
}

/**
 * Безопасная проверка: разрешён ли просмотр чужих зарплатных ведомостей
 */
export function canViewAllDoctorPayrolls(role: string | null | undefined): boolean {
	return hasPermission(role, "payroll.view_all_staff", "read");
}

/**
 * Безопасная проверка: разрешён ли просмотр собственной сдельной выработки
 */
export function canViewOwnPayroll(role: string | null | undefined): boolean {
	return hasPermission(role, "payroll.view_own", "own");
}

/**
 * Безопасная проверка: разрешён ли просмотр полных ПДн (без 152-ФЗ маскирования)
 */
export function canAccessFullPatientPii(role: string | null | undefined): boolean {
	return hasPermission(role, "patients.pii_full", "full");
}

/**
 * Безопасная проверка: разрешено ли подписание медицинской документации
 */
export function canSignMedicalRecords(role: string | null | undefined): boolean {
	return hasPermission(role, "clinical.records.write", "full");
}

/**
 * Безопасная проверка: разрешено ли управление настройками прав и ролей
 */
export function canManageStaffAuthority(role: string | null | undefined): boolean {
	return hasPermission(role, "settings.staff_authority", "full");
}

/**
 * Цветовой бейдж уровня доступа для визуальной индикации в UI
 */
export function getAccessLevelBadge(level: AccessLevel): {
	label: string;
	colorClass: string;
	badgeClass: string;
	borderClass: string;
} {
	switch (level) {
		case "full":
			return {
				label: "Полный доступ",
				colorClass: "text-emerald-700 dark:text-emerald-300",
				badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
				borderClass: "border-emerald-200 dark:border-emerald-800",
			};
		case "read":
			return {
				label: "Чтение",
				colorClass: "text-sky-700 dark:text-sky-300",
				badgeClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
				borderClass: "border-sky-200 dark:border-sky-800",
			};
		case "own":
			return {
				label: "Только свои",
				colorClass: "text-amber-700 dark:text-amber-300",
				badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
				borderClass: "border-amber-200 dark:border-amber-800",
			};
		case "none":
		default:
			return {
				label: "Заблокировано",
				colorClass: "text-slate-400 dark:text-slate-500",
				badgeClass: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
				borderClass: "border-slate-200 dark:border-slate-700",
			};
	}
}
