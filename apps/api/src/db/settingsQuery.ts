import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and, asc, desc, isNull, sql } from "drizzle-orm";
import type { ClinicSettings, UiPreferences, CreateStaffMemberInput, CreateChairInput, UpdateClinicProfileInput, ClinicProfile, ClinicMode, ClinicScheduleDefaults, StaffWorkingHours } from "@dental/shared";
import { clinicModeSchema, clinicScheduleDefaultsSchema, staffWorkingHoursSchema, staffRoleSchema } from "@dental/shared";
import type { StaffMember } from "@dental/shared";
import { staffAuthorityFlags } from "../security/permissions.js";
import {
  buildClinicSettings as getClinicSettingsInMemory,
  updateClinicProfile as updateClinicProfileInMemory,
  createStaffMember as createStaffMemberInMemory,
  updateStaffWorkingHours as updateStaffWorkingHoursInMemory,
  createChair as createChairInMemory,
  updateChairWorkingHours as updateChairWorkingHoursInMemory,
  updateClinicMode as updateClinicModeInMemory,
  updateStaffMemberProfile as updateStaffMemberProfileInMemory,
  deactivateStaffMember as deactivateStaffMemberInMemory,
  updateChairProfile as updateChairProfileInMemory,
  deactivateChair as deactivateChairInMemory
} from "../sampleData.js";
import type { UpdateStaffMemberProfileInput, UpdateChairProfileInput } from "../sampleData.js";

function useInMemory() {
  return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

// The DB columns are looser than the DTO: clinic_mode is free `text` (legacy rows
// hold "demo"/"single"/"network"), and clinic_schedule / working_hours are untyped
// jsonb. Validate at the read boundary through the shared Zod schemas so an invalid
// stored value falls back to a well-formed default instead of an `as any` lie.
const DEFAULT_SCHEDULE_DEFAULTS: ClinicScheduleDefaults = {
  workdayStart: "08:00",
  workdayEnd: "20:00",
  workingDays: [1, 2, 3, 4, 5],
  appointmentBufferMinutes: 15,
};

function narrowClinicMode(value: unknown): ClinicMode {
  const parsed = clinicModeSchema.safeParse(value);
  return parsed.success ? parsed.data : "solo_doctor";
}

function narrowScheduleDefaults(value: unknown): ClinicScheduleDefaults {
  const parsed = clinicScheduleDefaultsSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_SCHEDULE_DEFAULTS;
}

function narrowWorkingHours(value: unknown): StaffWorkingHours | null {
  if (value == null) return null;
  const parsed = staffWorkingHoursSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function narrowStaffRole(value: unknown): StaffMember["role"] {
  const parsed = staffRoleSchema.safeParse(value);
  return parsed.success ? parsed.data : "assistant";
}

const memoryUiPreferences = new Map<string, UiPreferences>();

/**
 * НАСТРОЙКИ РАБОЧЕГО МЕСТА: УСТАРЕВШАЯ КОПИЯ НЕ ИМЕЕТ ПРАВА ЗАТИРАТЬ СВЕЖУЮ.
 *
 * ЧТО БЫЛО. `saveUiPreferencesInDb` писала присланное тело в `users.ui_preferences`
 * одним `db.update` БЕЗ единого сравнения времени, а маршрут
 * `PUT /api/settings/preferences` брал `savedAt` от клиента как есть. Ветка без
 * базы писала в `memoryUiPreferences` тоже без сравнения. Замерено запросом в
 * процессе (`app.inject`, не дев-сервер): второе сохранение с `savedAt`
 * 2026-05-20T10:59 поверх сохранённого 11:00 отвечало 200, и роль рабочего места
 * возвращалась с «владелец» на «ассистент».
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Администратор открывает настройки в двух вкладках, в
 * первой меняет роль рабочего места и фильтры расписания, вторая всё это время
 * держит копию, снятую ДО правки. Клиент досылает свою копию сам, отложенной
 * синхронизацией (`apps/web/src/useAppLogic.tsx`,
 * `flushPendingUiPreferencesServerSync`), — и правка первой вкладки исчезала без
 * следа и без отказа. Ролью рабочего места решается, какой набор разделов человек
 * видит; фильтрами расписания — кого администратор видит в сетке приёмов.
 *
 * ЗАЩИТА СУЩЕСТВОВАЛА, НО НЕ НА ПУТИ ЗАПРОСА. `sampleData.ts`
 * (`saveUiPreferences`) сравнивает время с 5150-й строки, и правило там верное.
 * Только вызывает его ровно один файл во всём дереве — тест
 * `tests/mutableStateFlushCoalescing.test.ts`. Ни один маршрут в него не заходит:
 * ветка «без базы» этого модуля держит СВОЙ `Map`. То есть обе достижимые ветки
 * были одинаково слепы, а написанная защита охраняла хранилище, которого продукт
 * не использует.
 *
 * ПРАВИЛО ЗДЕСЬ — ДОСЛОВНОЕ ПОВТОРЕНИЕ ТОГО, ЧТО НАПИСАНО В ПАМЯТИ, и второго
 * правила не заводится: расхождение путей с базой и без — отдельный класс
 * дефекта, в этом дереве его ловили дважды. Обе ветки ниже спрашивают ОДНИ И ТЕ ЖЕ
 * две функции, поэтому разойтись им нечем.
 */

/**
 * Время сохранения в том виде, в котором его записывает сервер.
 *
 * Неразбираемое значение заменяется штампом сервера, а не отвергается: клиент,
 * который поля не присылает, обязан сохранять настройки как раньше. Важнее
 * другое — мусорная строка НЕ ЛОЖИТСЯ в хранилище. До этой правки маршрут писал
 * `input.savedAt ?? new Date().toISOString()`, то есть любую непустую строку
 * клиента; замерено, что строка «позавчера вечером» доезжала до колонки. Пролежав
 * там, она сломала бы сравнение для ВСЕХ последующих сохранений этой клиники.
 */
export function stampedUiPreferencesSavedAt(savedAt: string | null | undefined): string {
  return savedAt && Number.isFinite(Date.parse(savedAt)) ? savedAt : new Date().toISOString();
}

/**
 * Перебито ли присланное сохранение тем, что уже лежит в хранилище.
 *
 * Сравнение СТРОГОЕ (`<`), поэтому ОДИНАКОВОЕ время проходит: обещание оператору
 * — «оба сохранения прошли, победил последний». Это не мелочь и не вкус. Живой
 * клиент повторяет неудавшуюся синхронизацию ТЕМ ЖЕ телом с тем же `savedAt`
 * (`useAppLogic.tsx`: `delayMs: pending.savedAt === preferences.savedAt ? 5000 : 0`).
 * Отвергай равенство — и повтор сохранения, чей ответ потерялся в сети, отвергался
 * бы навсегда, показывая «не синхронизировано» на уже сохранённом.
 *
 * Неразбираемое время НА ЛЮБОЙ из сторон снимает проверку, а не роняет её: сервер
 * не знает, что старше, и поэтому ничего не утверждает. Ровно так же поступает
 * правило в памяти.
 */
export function uiPreferencesSaveIsSuperseded(
  storedSavedAt: string | null | undefined,
  incomingSavedAt: string | null | undefined
): boolean {
  if (!storedSavedAt || !incomingSavedAt) return false;
  if (!Number.isFinite(Date.parse(storedSavedAt))) return false;
  return Date.parse(stampedUiPreferencesSavedAt(incomingSavedAt)) < Date.parse(storedSavedAt);
}

export type UiPreferencesSaveOutcome = {
  /** Легла ли присланная копия в хранилище. */
  applied: boolean;
  /** Что лежит в хранилище ПОСЛЕ вызова — присланное либо то, чем его перебили. */
  stored: UiPreferences;
};

/**
 * Одновременную правку из двух окон закрывает условная запись, а не порядок
 * вызовов, поэтому попытка может проиграть сверку и повториться. Пять попыток —
 * это пять писателей, успевших вклиниться подряд между чтением и записью одной
 * строки настроек; исчерпание такого запаса означает не гонку, а что-то другое, и
 * тогда честнее отказать, чем записать вслепую.
 */
const UI_PREFERENCES_SAVE_ATTEMPTS = 5;

/**
 * Сохранение проиграло сверку прежнего значения все попытки подряд. Отдельный
 * класс от устаревшей копии: причина другая (записывали одновременно, а не
 * раньше), а действие оператора то же — перечитать настройки и повторить правку.
 * Маршрут различает их текстом отказа.
 */
export class UiPreferencesConcurrentSaveError extends Error {
  constructor() {
    super("Настройки рабочего места не сохранены: значение меняли одновременно из нескольких окон.");
    this.name = "UiPreferencesConcurrentSaveError";
  }
}

/**
 * Строка, в которой лежат настройки рабочего места этой клиники.
 *
 * ПОРЯДОК ЗДЕСЬ ОБЯЗАТЕЛЕН, А НЕ ЖЕЛАТЕЛЕН. Раньше и чтение, и запись брали
 * `.limit(1)` БЕЗ `order by`. Порядок строк без него не определён, то есть
 * сравнение могло прочитать копию одного сотрудника, а записать поверх копии
 * другого — и защита от устаревшей записи разваливалась бы молча. На живой базе
 * это не гипотеза: в одной организации четыре сотрудника, у всех четырёх своя
 * копия настроек, и время сохранения у них РАЗНОЕ (две строки 10:59, две 11:00).
 *
 * Первой берётся строка, в которой копия уже есть: именно она и есть действующие
 * настройки клиники. Дальше — самый ранний сотрудник, при равенстве — по
 * идентификатору, чтобы выбор был воспроизводимым.
 *
 * ДОЛГ, который здесь не лечится: настройки рабочего места клиники хранятся в
 * колонке СОТРУДНИКА, поэтому копий у организации столько, сколько строк успели
 * записать. Единственное хранилище — это правка схемы, а схема правится не здесь.
 */
async function uiPreferencesRow(
  organizationId: string
): Promise<{ id: string; uiPreferences: unknown } | null> {
  const [row] = await db
    .select({ id: schema.users.id, uiPreferences: schema.users.uiPreferences })
    .from(schema.users)
    .where(eq(schema.users.organizationId, organizationId))
    .orderBy(sql`${schema.users.uiPreferences} is null`, asc(schema.users.createdAt), asc(schema.users.id))
    .limit(1);
  return row ?? null;
}

export async function getUiPreferencesFromDb(organizationId: string): Promise<UiPreferences | null> {
  if (useInMemory()) return memoryUiPreferences.get(organizationId) ?? null;
  const row = await uiPreferencesRow(organizationId);
  if (!row || !row.uiPreferences) return null;
  return row.uiPreferences as UiPreferences;
}

export async function saveUiPreferencesInDb(
  organizationId: string,
  prefs: UiPreferences
): Promise<UiPreferencesSaveOutcome> {
  if (useInMemory()) {
    const stored = memoryUiPreferences.get(organizationId) ?? null;
    if (stored && uiPreferencesSaveIsSuperseded(stored.savedAt, prefs.savedAt)) {
      return { applied: false, stored };
    }
    memoryUiPreferences.set(organizationId, prefs);
    return { applied: true, stored: prefs };
  }

  for (let attempt = 1; attempt <= UI_PREFERENCES_SAVE_ATTEMPTS; attempt += 1) {
    const row = await uiPreferencesRow(organizationId);
    if (!row) throw new Error("No users found to save preferences to.");
    const stored = (row.uiPreferences ?? null) as UiPreferences | null;
    if (stored && uiPreferencesSaveIsSuperseded(stored.savedAt, prefs.savedAt)) {
      return { applied: false, stored };
    }

    /*
     * Прежнее значение стоит в условии записи, и без него защиты нет вовсе.
     * «Прочитал, сравнил, записал» тремя отдельными действиями не закрывает
     * исходный сценарий двух вкладок: оба запроса читают одно и то же старое
     * значение, оба считают себя свежими, и побеждает тот, чья запись доехала
     * последней, — то есть ровно устаревшая копия, если она пришла позже.
     * Сравнение идёт по jsonb, а не по времени: `=` для jsonb определён на
     * канонической форме, поэтому порядок ключей и пробелы на него не влияют.
     * Приведение времени в SQL здесь недопустимо — в колонке может лежать строка,
     * которую `::timestamptz` отвергнет исключением, а порядок вычисления ветвей
     * `or` Postgres не обещает.
     */
    const written = await db
      .update(schema.users)
      .set({ uiPreferences: prefs })
      .where(
        and(
          eq(schema.users.id, row.id),
          stored === null
            ? isNull(schema.users.uiPreferences)
            : sql`${schema.users.uiPreferences} = ${JSON.stringify(stored)}::jsonb`
        )
      )
      .returning({ id: schema.users.id });
    if (written.length === 0) continue;
    return { applied: true, stored: prefs };
  }

  throw new UiPreferencesConcurrentSaveError();
}

export async function getClinicSettingsFromDb(organizationId: string): Promise<ClinicSettings> {
  if (useInMemory()) {
    return getClinicSettingsInMemory();
  }
  const [org] = await db.select().from(schema.organizations).where(eq(schema.organizations.id, organizationId)).limit(1);
  if (!org) throw new Error("Organization not found");
  
  const [clinic] = await db.select().from(schema.clinics).where(eq(schema.clinics.organizationId, organizationId)).limit(1);
  
  const staff = await db.select().from(schema.users).where(eq(schema.users.organizationId, organizationId));
  const chairs = await db.select().from(schema.chairs).where(eq(schema.chairs.organizationId, organizationId));

  const profile: ClinicProfile = {
    organizationId: org.id,
    clinicName: clinic?.name || org.name,
    legalName: org.name,
    inn: org.inn || null,
    kpp: org.kpp || null,
    ogrn: org.ogrn || null,
    address: org.legalAddress || null,
    phone: clinic?.phone || null,
    email: org.email || null,
    website: org.website || null,
    medicalLicenseNumber: org.medicalLicenseNumber || null,
    medicalLicenseIssuedAt: org.medicalLicenseIssuedAt || null,
    medicalLicenseIssuer: org.medicalLicenseIssuer || null,
    bankDetails: org.bankDetails || null,
    signatoryName: org.signatoryName || null,
    signatoryTitle: org.signatoryTitle || null,
    mode: narrowClinicMode(org.clinicMode),
    timezone: clinic?.timezone || "Europe/Samara",
    defaultVisitMinutes: 60,
    scheduleDefaults: narrowScheduleDefaults(org.clinicSchedule),
    networkEnabled: false,
    egiszEnabled: false,
    updatedAt: org.updatedAt.toISOString()
  };

  return {
    profile,
    staff: staff.map(s => ({
      id: s.id,
      organizationId: s.organizationId,
      fullName: s.fullName,
      role: narrowStaffRole(s.role),
      specialties: ["universal"],
      active: s.isActive,
      /*
       * БЫЛО: `true`, `true`, `true` — жёстко, каждому сотруднику, независимо от
       * роли. Ассистент уходил на клиент с правом подписи ЭМК, с доступом к
       * кассе и к импорту, и это не оставалось внутри сервера: ответ POST
       * /api/settings/clinic/mode и PUT /api/settings/clinic/profile клиент
       * кладёт целиком в dashboard.clinicSettings
       * (apps/web/src/useAppLogic.tsx), затирая значения, посчитанные по роли на
       * пути сводки. То есть после смены режима клиники или сохранения её
       * реквизитов права на экране становились «всё разрешено всем».
       *
       * Полномочия выводятся из той же матрицы ROLE_PERMISSIONS, по которой
       * requirePermission отказывает на маршруте, поэтому флаг в карточке и
       * решение сервера совпадают по построению. Разбор соответствия
       * флаг → право и причина отказа от чтения одноимённых колонок —
       * security/permissions.ts, staffAuthorityFlags.
       *
       * Роль передаётся сырой (s.role), а не через narrowStaffRole: матрица сама
       * не выдаёт ничего роли, которой в ней нет, а narrowStaffRole сводит
       * неизвестное значение к «assistant» и тем скрыл бы испорченную запись за
       * правами настоящей должности.
       */
      ...staffAuthorityFlags(s.role),
      color: "#000000",
      phone: s.phone || null,
      email: s.email || null,
      workingHours: narrowWorkingHours(s.workingHours),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.createdAt.toISOString()
    })),
    chairs: chairs.map(c => ({
      id: c.id,
      organizationId: c.organizationId,
      name: c.name,
      room: null,
      specialization: null,
      active: c.isActive,
      hasXraySensor: false,
      hasMicroscope: false,
      hasSurgeryKit: false,
      notes: null,
      workingHours: narrowWorkingHours(c.workingHours)
    })),
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false
  };
}

export async function updateClinicModeInDb(organizationId: string, mode: ClinicMode) {
  if (useInMemory()) return updateClinicModeInMemory(mode);
  await db.update(schema.organizations).set({ clinicMode: mode }).where(eq(schema.organizations.id, organizationId));
}

export async function updateClinicProfileInDb(organizationId: string, input: UpdateClinicProfileInput) {
  if (useInMemory()) return updateClinicProfileInMemory(input);
  const updateData: any = { updatedAt: new Date() };
  if (input.legalName !== undefined) updateData.name = input.legalName;
  if (input.inn !== undefined) updateData.inn = input.inn;
  if (input.kpp !== undefined) updateData.kpp = input.kpp;
  if (input.ogrn !== undefined) updateData.ogrn = input.ogrn;
  if (input.address !== undefined) updateData.legalAddress = input.address;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.website !== undefined) updateData.website = input.website;
  if (input.medicalLicenseNumber !== undefined) updateData.medicalLicenseNumber = input.medicalLicenseNumber;
  if (input.medicalLicenseIssuedAt !== undefined) updateData.medicalLicenseIssuedAt = input.medicalLicenseIssuedAt;
  if (input.medicalLicenseIssuer !== undefined) updateData.medicalLicenseIssuer = input.medicalLicenseIssuer;
  if (input.bankDetails !== undefined) updateData.bankDetails = input.bankDetails;
  if (input.signatoryName !== undefined) updateData.signatoryName = input.signatoryName;
  if (input.signatoryTitle !== undefined) updateData.signatoryTitle = input.signatoryTitle;
  if (input.scheduleDefaults !== undefined) updateData.clinicSchedule = input.scheduleDefaults;

  await db.update(schema.organizations).set(updateData).where(eq(schema.organizations.id, organizationId));

  const clinicUpdateData: any = {};
  if (input.clinicName !== undefined) clinicUpdateData.name = input.clinicName;
  if (input.phone !== undefined) clinicUpdateData.phone = input.phone;
  if (input.timezone !== undefined) clinicUpdateData.timezone = input.timezone;

  if (Object.keys(clinicUpdateData).length > 0) {
    await db.update(schema.clinics).set(clinicUpdateData).where(eq(schema.clinics.organizationId, organizationId));
  }
}

export async function createStaffMemberInDb(organizationId: string, input: CreateStaffMemberInput) {
  if (useInMemory()) return createStaffMemberInMemory(input);
  await db.insert(schema.users).values({
    organizationId,
    fullName: input.fullName,
    role: input.role,
    phone: input.phone || null,
    email: input.email || null,
    isActive: true,
    workingHours: input.workingHours
  });
}

export async function updateStaffWorkingHoursInDb(organizationId: string, staffId: string, workingHours: any) {
  if (useInMemory()) return updateStaffWorkingHoursInMemory(staffId, workingHours);
  await db.update(schema.users).set({ workingHours }).where(and(eq(schema.users.id, staffId), eq(schema.users.organizationId, organizationId)));
}

/**
 * Правка карточки сотрудника. Пишутся только те поля, которые действительно
 * есть в таблице users и возвращаются назад через getClinicSettingsFromDb:
 * иначе интерфейс показывал бы «сохранено», а после перезагрузки — старое
 * значение. Специальности сюда не входят: столбец users.specialties есть, но
 * чтение жестко отдает ["universal"], так что запись была бы невидимой.
 */
export async function updateStaffMemberProfileInDb(
  organizationId: string,
  staffId: string,
  input: UpdateStaffMemberProfileInput
) {
  if (useInMemory()) {
    updateStaffMemberProfileInMemory(staffId, input);
    return;
  }
  const updateData: { fullName?: string; role?: string; phone?: string | null; email?: string | null; isActive?: boolean } = {};
  if (input.fullName !== undefined) updateData.fullName = input.fullName;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.active !== undefined) updateData.isActive = input.active;
  if (Object.keys(updateData).length === 0) return;
  await db
    .update(schema.users)
    .set(updateData)
    .where(and(eq(schema.users.id, staffId), eq(schema.users.organizationId, organizationId)));
}

/**
 * Мягкое отключение сотрудника вместо DELETE: на users.id ссылаются приемы
 * (appointments.doctor_user_id, appointments.assistant_user_id) и медицинские
 * записи. Физическое удаление либо упало бы на внешнем ключе, либо стерло
 * авторство лечения. Строка остается, is_active становится false.
 */
export async function deactivateStaffMemberInDb(organizationId: string, staffId: string) {
  if (useInMemory()) {
    deactivateStaffMemberInMemory(staffId);
    return;
  }
  await db
    .update(schema.users)
    .set({ isActive: false })
    .where(and(eq(schema.users.id, staffId), eq(schema.users.organizationId, organizationId)));
}

export async function updateStaffCredentialsInDb(
  organizationId: string,
  staffId: string,
  updates: { email?: string; passwordHash?: string; pinCodeHash?: string }
) {
  if (useInMemory()) return;
  await db.update(schema.users).set(updates).where(and(eq(schema.users.id, staffId), eq(schema.users.organizationId, organizationId)));
}

/**
 * Ставка врача — процент от кассы, по которому клиника платит за лечение.
 *
 * Хранится в doctor_commissions. Расчёт выплат
 * (services/finance/doctorPayouts.ts) читает её ТОЛЬКО из колонки
 * commission_pct и ТОЛЬКО по user_id: соединение по doctor_id дало бы пустоту
 * всегда, потому что ту колонку не пишет никто.
 *
 * До появления этих двух функций ставку не задавал ни один достижимый экран.
 * Писателей было два, и оба мимо владельца клиники: недостижимый мастер
 * первого запуска и routes/diary.ts, который при первом закрытии приёма молча
 * вставляет 30 % — значение, которое код подставил сам, а не договорённость с
 * врачом. Экран выплат печатал «не задана», владелец шёл исправлять и не
 * находил куда.
 */
export interface DoctorCommissionRate {
  userId: string;
  commissionPct: string;
  materialCostDeductionPct: string;
  effectiveFrom: string;
}

const COMMISSION_STORAGE_UNAVAILABLE =
  "Ставка врача не сохранена: хранение отключено (DENTAL_STATE_PERSISTENCE=off), ставки живут только в базе. Включите базу и повторите.";

/**
 * Действующие ставки всех врачей организации, самая свежая первой.
 *
 * Отдаются только строки с is_active = true: отключённые остаются в таблице
 * ради истории, но платить по ним нельзя. Порядок совпадает с порядком, по
 * которому ставку выбирает расчёт выплат (свежая effective_from, при равенстве
 * — свежая created_at), поэтому первая строка на врача — та же, по которой
 * посчитаются деньги.
 */
export async function listDoctorCommissionRatesInDb(organizationId: string): Promise<DoctorCommissionRate[]> {
  if (useInMemory()) return [];
  const rows = await db
    .select({
      userId: schema.doctorCommissions.userId,
      commissionPct: schema.doctorCommissions.commissionPct,
      materialCostDeductionPct: schema.doctorCommissions.materialCostDeductionPct,
      effectiveFrom: schema.doctorCommissions.effectiveFrom
    })
    .from(schema.doctorCommissions)
    .where(
      and(
        eq(schema.doctorCommissions.organizationId, organizationId),
        eq(schema.doctorCommissions.isActive, true)
      )
    )
    .orderBy(desc(schema.doctorCommissions.effectiveFrom), desc(schema.doctorCommissions.createdAt));

  const rates: DoctorCommissionRate[] = [];
  for (const row of rows) {
    // user_id в схеме допускает NULL, а платить по строке без врача нельзя:
    // такая ставка не принадлежит никому и в расчёт выплат тоже не попадает.
    if (!row.userId) continue;
    rates.push({
      userId: row.userId,
      commissionPct: row.commissionPct,
      materialCostDeductionPct: row.materialCostDeductionPct,
      effectiveFrom: row.effectiveFrom.toISOString()
    });
  }
  return rates;
}

/**
 * Назначение ставки врачу.
 *
 * Три решения, каждое из которых иначе стоило бы клинике денег:
 *
 * 1. Пишутся ОБА процента — commission_pct и commission_percent. Рядом в
 *    таблице живёт commission_percent с DEFAULT '25'. Вставка без него
 *    оставила бы в ОДНОЙ строке два несогласованных числа (45 % в одной
 *    колонке, 25 % в другой), и первый же будущий читатель второй колонки
 *    заплатил бы врачу другую сумму — без ошибки и без расхождения в логах.
 *
 * 2. Прежние действующие ставки отключаются, а не остаются рядом. Уникальности
 *    в базе нет, и при нескольких активных строках расчёт берёт самую свежую,
 *    приписывая к выплате предупреждение о двоящейся настройке
 *    (doctorPayouts.ts:373). Ставка врача не должна зависеть от порядка строк.
 *
 * 3. Строки не удаляются: is_active = false сохраняет, что клиника назначала
 *    раньше. Прошлые периоды продолжают считаться по той ставке, которая
 *    действовала тогда, — новая начинает действовать с момента назначения.
 *
 * Доля себестоимости материалов (material_cost_deduction_pct) переносится из
 * прежней действующей строки: это ВТОРАЯ, независимая договорённость с врачом,
 * и правка процента от кассы не имеет права её обнулять.
 */
export async function setDoctorCommissionRateInDb(
  organizationId: string,
  staffId: string,
  commissionPct: number
): Promise<DoctorCommissionRate> {
  if (useInMemory()) throw new Error(COMMISSION_STORAGE_UNAVAILABLE);

  const [staffMember] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.id, staffId), eq(schema.users.organizationId, organizationId)))
    .limit(1);
  if (!staffMember) throw new Error("Сотрудник не найден.");

  const normalizedPct = commissionPct.toFixed(2);

  return db.transaction(async (tx) => {
    const [previous] = await tx
      .select({ materialCostDeductionPct: schema.doctorCommissions.materialCostDeductionPct })
      .from(schema.doctorCommissions)
      .where(
        and(
          eq(schema.doctorCommissions.organizationId, organizationId),
          eq(schema.doctorCommissions.userId, staffId),
          eq(schema.doctorCommissions.isActive, true)
        )
      )
      .orderBy(desc(schema.doctorCommissions.effectiveFrom), desc(schema.doctorCommissions.createdAt))
      .limit(1);

    await tx
      .update(schema.doctorCommissions)
      .set({ isActive: false })
      .where(
        and(
          eq(schema.doctorCommissions.organizationId, organizationId),
          eq(schema.doctorCommissions.userId, staffId),
          eq(schema.doctorCommissions.isActive, true)
        )
      );

    const effectiveFrom = new Date();
    const [inserted] = await tx
      .insert(schema.doctorCommissions)
      .values({
        organizationId,
        userId: staffId,
        /*
         * specialty и service_category передаются ЯВНО, и это не избыточность.
         * Модель Drizzle описывает их как text со значением по умолчанию, а в
         * живой таблице это перечисления (dental_specialty, service_category)
         * NOT NULL и БЕЗ значения по умолчанию — замерено на базе. Вставка,
         * доверившаяся модели, отправляла в обе колонки DEFAULT, получала NULL и
         * падала на NOT NULL: ставка не сохранялась, а владелец видел «проверьте
         * выбранного сотрудника и процент», где ни сотрудник, ни процент не были
         * виноваты. Ровно поэтому их явно передаёт и routes/diary.ts.
         *
         * Значения выбраны как наименее лживые: расчёт выплат
         * (services/finance/doctorPayouts.ts) не фильтрует ставку ни по
         * специальности, ни по категории услуги — он берёт любую действующую
         * строку врача. Поставить здесь «therapy» значило бы заявить, что процент
         * действует только на терапию, чего клиника не говорила.
         *
         * ДОЛГ: раздельные ставки по категориям услуг в продукте отсутствуют, а
         * колонки под них в таблице есть. Это продуктовое решение, и выдумывать
         * его здесь нельзя.
         */
        specialty: "universal",
        serviceCategory: "other",
        commissionPct: normalizedPct,
        commissionPercent: normalizedPct,
        materialCostDeductionPct: previous?.materialCostDeductionPct ?? "0",
        isActive: true,
        effectiveFrom
      })
      .returning({
        commissionPct: schema.doctorCommissions.commissionPct,
        materialCostDeductionPct: schema.doctorCommissions.materialCostDeductionPct,
        effectiveFrom: schema.doctorCommissions.effectiveFrom
      });
    if (!inserted) throw new Error("Ставка врача не сохранена: строка ставки не записалась.");

    return {
      userId: staffId,
      commissionPct: inserted.commissionPct,
      materialCostDeductionPct: inserted.materialCostDeductionPct,
      effectiveFrom: inserted.effectiveFrom.toISOString()
    };
  });
}

export async function createChairInDb(organizationId: string, input: CreateChairInput) {
  if (useInMemory()) return createChairInMemory(input);
  const [clinic] = await db.select().from(schema.clinics).where(eq(schema.clinics.organizationId, organizationId)).limit(1);
  if (!clinic) throw new Error("Clinic not found");
  
  await db.insert(schema.chairs).values({
    organizationId,
    clinicId: clinic.id,
    name: input.name,
    isActive: true,
    workingHours: input.workingHours
  });
}

export async function updateChairWorkingHoursInDb(organizationId: string, chairId: string, workingHours: any) {
  if (useInMemory()) return updateChairWorkingHoursInMemory(chairId, workingHours);
  await db.update(schema.chairs).set({ workingHours }).where(and(eq(schema.chairs.id, chairId), eq(schema.chairs.organizationId, organizationId)));
}

/**
 * Правка кресла. В таблице chairs из карточки кресла хранятся только название
 * и признак активности, а кабинет, специализация и оснащение читаются как
 * пустые значения — принимать их означало бы молча терять ввод оператора.
 */
export async function updateChairProfileInDb(
  organizationId: string,
  chairId: string,
  input: UpdateChairProfileInput
) {
  if (useInMemory()) {
    updateChairProfileInMemory(chairId, input);
    return;
  }
  const updateData: { name?: string; isActive?: boolean } = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.active !== undefined) updateData.isActive = input.active;
  if (Object.keys(updateData).length === 0) return;
  await db
    .update(schema.chairs)
    .set(updateData)
    .where(and(eq(schema.chairs.id, chairId), eq(schema.chairs.organizationId, organizationId)));
}

/**
 * Мягкое отключение кресла вместо DELETE: на chairs.id ссылаются приемы
 * (appointments.chair_id). Строка остается, is_active становится false, уже
 * назначенные приемы не теряют привязку к кабинету.
 */
export async function deactivateChairInDb(organizationId: string, chairId: string) {
  if (useInMemory()) {
    deactivateChairInMemory(chairId);
    return;
  }
  await db
    .update(schema.chairs)
    .set({ isActive: false })
    .where(and(eq(schema.chairs.id, chairId), eq(schema.chairs.organizationId, organizationId)));
}
