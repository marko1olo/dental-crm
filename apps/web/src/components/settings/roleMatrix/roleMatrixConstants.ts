/**
 * apps/web/src/components/settings/roleMatrix/roleMatrixConstants.ts
 *
 * Constants for Role Matrix & Canonical Profiles (Mandates 8e, 8n, 8x, 8ap).
 * Strictly <= 120 lines ceiling.
 */

import type { GranularStaffRole } from "@dental/shared";
import { HeartPulse, Shield, Stethoscope, UserCheck } from "lucide-react";
import type { CanonicalRoleProfile, SuperPermissionInfo } from "./roleMatrixTypes";

export const ROLE_DISPLAY_NAMES: Record<GranularStaffRole, string> = {
	owner: "Главный врач / Владелец",
	head_doctor: "Главный врач",
	doctor: "Врач-стоматолог",
	assistant: "Ассистент врача",
	senior_nurse: "Старшая медсестра",
	senior_admin: "Старший администратор",
	registrar: "Администратор / Ресепшен",
	accountant: "Бухгалтер",
};

export const CLINICAL_ROLES: GranularStaffRole[] = ["doctor", "assistant", "head_doctor", "senior_nurse"];
export const ADMINISTRATIVE_ROLES: GranularStaffRole[] = ["registrar", "owner", "senior_admin", "accountant"];

export const CANONICAL_ROLE_PROFILES: readonly CanonicalRoleProfile[] = [
	{ id: "doctor", title: "Врач-стоматолог", badge: "Клиническая автономия", summary: "Приём пациентов, ЭМК, зубная формула, скидки до 100%. P&L и зарплаты коллег закрыты.", icon: Stethoscope },
	{ id: "registrar", title: "Администратор", badge: "Расписание & Касса", summary: "Запись на приём, касса и чеки, WhatsApp/SMS. Правка диагнозов в ЭМК и P&L закрыты.", icon: UserCheck },
	{ id: "assistant", title: "Ассистент врача", badge: "Стерилизация & Расход", summary: "Списание расходников на приёме, журналы автоклавирования. Подпись ЭМК закрыта.", icon: HeartPulse },
	{ id: "owner", title: "Главврач / Владелец", badge: "Суверенитет клиники", summary: "Полный доступ: P&L и прибыль, ставки ЗП и ФОТ, прайс-лист услуг, безопасность базы.", icon: Shield },
];

export const SUPER_PERMISSIONS_MAP: Record<string, SuperPermissionInfo> = {
	"finance.reports_pnl": { badge: "Супер-право: P&L клиники", hint: "Коммерческая тайна: чистая выручка и прибыль клиники (Владелец / Главврач).", isCritical: true },
	"payroll.view_all_staff": { badge: "Супер-право: Чужие зарплаты", hint: "Конфиденциально: доступ к зарплатным табелям всех коллег.", isCritical: true },
	"payroll.manage_rates": { badge: "Супер-право: Управление ФОТ", hint: "Финансовый контроль: установка процентных ставок и правил списания ЗТЛ.", isCritical: true },
	"patients.pii_full": { badge: "Защита клиентской базы", hint: "Защита базы: просмотр и экспорт телефонов. Телефоны маскируются.", isCritical: true },
	"clinical.records.write": { badge: "Врачебная автономия", hint: "Право врача свободно вести дневник, ставить диагнозы и назначать услуги.", isCritical: true },
	"settings.staff_authority": { badge: "Супер-право: Эскалация ролей", hint: "Административный доступ: назначение ролей и выдача привилегий доступа.", isCritical: true },
	"finance.refunds": { badge: "Возвраты из кассы", hint: "Кассовая дисциплина: проведение наличных и безналичных возвратов по чекам.", isCritical: false },
	"finance.tariffs_manage": { badge: "Супер-право: Прайс-лист", hint: "Ценовая политика: изменение цен на медицинские услуги и технологических карт расходов.", isCritical: true },
};

export const HUMAN_PERM_TITLES: Record<string, { title: string; desc: string }> = {
	"clinical.records.view": { title: "Просмотр медицинских карт", desc: "Доступ к зубным формулам, дневникам приёма и планам лечения." },
	"clinical.records.write": { title: "Медицинская карта приёма и дневники", desc: "Ведение клинических протоколов, диагнозы МКБ-10 и подписание дневников." },
	"clinical.treatment_plans.manage": { title: "Планы лечения и каталог процедур", desc: "Составление этапных смет и подбор процедур из прейскуранта." },
	"schedule.view": { title: "Просмотр расписания приёмов", desc: "Отображение сетки приёмов врачей и кресел клиники." },
	"schedule.manage": { title: "Оформление визитов и расписание", desc: "Запись пациентов, перенос визитов и настройка смен." },
	"patients.view_basic": { title: "Просмотр картотеки пациентов", desc: "Поиск пациентов в базе и базовая история посещений." },
	"patients.pii_full": { title: "Защита персональных данных и телефонной базы", desc: "Доступ к номерам телефонов, паспортным данным и согласиям на обработку." },
	"patients.manage": { title: "Редактирование карточек пациентов", desc: "Внесение и правка анкетных данных, адресов и согласий." },
	"finance.cashier_operations": { title: "Касса, приём оплат и чеки", desc: "Оплата наличными, картой, СБП, счетом или депозитом с выдачей чеков." },
	"finance.refunds": { title: "Проведение возвратов денежных средств", desc: "Возврат оплат и оформление чеков возврата прихода." },
	"finance.reports_pnl": { title: "Прибыль клиники, P&L и маржинальность", desc: "Сводные финансовые показатели, выручка кресел и рентабельность." },
	"finance.tariffs_manage": { title: "Прайс-лист услуг и стоимость", desc: "Редактирование цен, категорий процедур и норм расхода материалов." },
	"payroll.view_own": { title: "Просмотр собственной сдельной оплаты", desc: "Личная выработка, начисленные проценты за приём и вычеты за ЗТЛ." },
	"payroll.view_all_staff": { title: "Зарплатные ведомости всех сотрудников", desc: "Сводная зарплатная ведомость клиники, оклады и начисления всей команде." },
	"payroll.manage_rates": { title: "Настройка индивидуальных ставок и процентов", desc: "Установка процентов врачей от приёма и правил списания ЗТЛ." },
	"inventory.materials_writeoff": { title: "Списание расходников на приёме", desc: "Учёт израсходованных анестетиков, пломбировочных масс и расходников." },
	"inventory.warehouse_manage": { title: "Складской учёт и приход накладных", desc: "Поступление партий, контроль сроков годности и инвентаризация." },
	"inventory.sanpin_journals": { title: "Стерилизация и журнал автоклавирования", desc: "Журналы азопирамовых проб, циклов стерилизации и дезинфекции." },
	"settings.clinic_manage": { title: "Настройки клиники и филиалов", desc: "Реквизиты клиники, мессенджеры, интеграции и режим работы." },
	"settings.staff_authority": { title: "Управление ролями и матрицей прав", desc: "Назначение ролей сотрудникам и разграничение полномочий." },
	"egisz.send_records": { title: "Медицинские реестры и отчётность", desc: "Формирование и отправка электронных медицинских документов." },
	"communications.send_messages": { title: "Отправка сообщений и напоминаний", desc: "SMS, WhatsApp и Telegram уведомления о записи на приём." },
};
