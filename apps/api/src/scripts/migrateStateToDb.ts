/**
 * migrateStateToDb.ts — перенос сохранённого JSON-состояния в PostgreSQL.
 *
 * ПОЧЕМУ ЭТОТ ФАЙЛ ПЕРЕПИСАН (2026-08-06)
 * ---------------------------------------
 * После миграций 0157–0160 база принудительна по RLS: `FORCE ROW LEVEL
 * SECURITY` стоит на 147 таблицах из 148, а роль приложения `dental` —
 * NOSUPERUSER/NOBYPASSRLS и владелец таблиц, то есть FORCE распространяется и
 * на неё. Сидер не выставлял ни `app.current_tenant`, ни `app.superuser_bypass`
 * и падал на первой же вставке:
 *
 *   new row violates row-level security policy for table "organizations"
 *   (код 42501, ExecWithCheckOptions — сработал WITH CHECK политики)
 *
 * Раньше это было не видно, потому что на машинах разработки роль `dental` была
 * суперпользователем и обходила RLS целиком. Развернуть новое окружение до
 * конца стало невозможно: `db:migrate` проходит, `db:reset-seed` — нет.
 *
 * КАКОЙ МЕХАНИЗМ ВЫБРАН И ПОЧЕМУ ИМЕННО ОН
 * ----------------------------------------
 * Измерено на чистом кластере PostgreSQL 18.4 (роль `dental`, 147 таблиц под
 * FORCE), три варианта, вставки в organizations/clinics/users/patients:
 *
 *   (а) `app.superuser_bypass = 'on'`  → organizations: OK,
 *       clinics/users/patients: FAIL 42501. Обход НЕ работает на запись:
 *       дизъюнкт `superuser_bypass = 'on'` есть только в USING, а в WITH CHECK
 *       его нет ни у одной таблицы, кроме `organizations` (см. миграцию 0159,
 *       PART 4 — там обход в WITH CHECK оставлен сознательно, ради
 *       самостоятельной регистрации клиники).
 *   (б) `app.current_tenant = <organizationId>` → все четыре таблицы OK.
 *       Курицы и яйца нет: `app.current_tenant` — это просто строковый GUC,
 *       он ничем не связан с содержимым таблицы organizations, а политика
 *       organizations проверяет `id = current_tenant`. Достаточно выставить
 *       контекст на тот идентификатор, который сидер СОБИРАЕТСЯ создать.
 *   (в) подключение суперпользователем → всё OK, но требует держать пароль
 *       суперпользователя в окружении развёртывания ради одной команды.
 *
 * Выбран (б). Он не ослабляет ни одной политики, повторяет ровно тот механизм,
 * которым пользуется само приложение (`withTenantCtx`, db/rls.ts), не требует
 * второй строки подключения и второй роли — и, что важнее всего, ОГРАНИЧИВАЕТ
 * РАЗРУШЕНИЕ: под контекстом арендатора `DELETE` видит только его строки.
 * Измерено на двух арендаторах: `DELETE FROM patients` удаляет 2 строки из 2
 * под `superuser_bypass`, 1 из 2 под контекстом арендатора и 0 из 2 без
 * контекста вовсе. То есть прежний сидер на промигрированной базе не «чистил»
 * ничего — он молча удалял ноль строк и печатал «Database cleared».
 *
 * ВЕСЬ СИД ИДЁТ ОДНОЙ ТРАНЗАКЦИЕЙ. Так `set_config(..., is_local => true)`
 * гарантированно живёт на том же соединении, что и запросы (иначе с пулом
 * настройка уедет на другое соединение — см. заголовок db/rls.ts), и так
 * половинчатого сида не существует: любая ошибка откатывает всё.
 */
import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type {
  Appointment,
  Chair,
  ClinicalRule,
  GeneratedDocument,
  Patient,
  Payment,
  StaffMember,
} from "@dental/shared";

import { pool } from "../db/client.js";
import { type TenantDb, withTenantCtx } from "../db/rls.js";
import * as schema from "../db/schema.js";
import { loadPersistentState } from "../persistentState.js";
import { hashCredential } from "../utils/cryptoHelper.js";

/**
 * Идентификатор клиники по умолчанию. Значение статично НАМЕРЕННО: повторный
 * сид должен обновлять ту же клинику, а не плодить новую при каждом запуске.
 * Это идентификатор, а не учётные данные, и он никуда не даёт доступа сам по
 * себе. Прежде это же значение стояло двумя литералами в разных местах файла.
 */
const DEFAULT_CLINIC_ID = "e50337ad-f762-4f3b-8255-a2267576be78";

const CHUNK_SIZE = 1000;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Имя и значение переменной, разрешающей разрушительный сброс. Эти два литерала
 * уже описаны в `.agents/DATABASE.md`; до 2026-08-06 документ описывал защиту,
 * которой не существовало в коде. Здесь она реализована.
 */
const DESTRUCTIVE_RESET_ENV_NAME = "DENTAL_ALLOW_DESTRUCTIVE_DB_RESET";
const DESTRUCTIVE_RESET_ENV_VALUE = "YES";

/**
 * Учётные данные сида. Значения по умолчанию ОПУБЛИКОВАНЫ в этом репозитории и
 * потому являются учётными данными только в смысле CWE-1392 «Use of Default
 * Credentials» — то есть не являются секретом ни в каком смысле.
 *
 * Почему они всё же остались значениями по умолчанию, а не генерируются: от них
 * зависят демо-вход (`DENTE_ALLOW_DEMO_LOGIN`, apply-dev-env.ps1),
 * scripts/screenshot-migration-wizard.mjs, scripts/form043-viewport-shots.mjs и
 * фикстуры тестов. Смена литералов сломала бы гейт, а не улучшила безопасность.
 * Вместо смены: (1) каждое использование значения по умолчанию печатается явным
 * предупреждением, (2) при NODE_ENV=production сид с любым значением по
 * умолчанию ОТКАЗЫВАЕТ — в боевой установке все четыре обязаны быть заданы
 * снаружи.
 */
const credentialDefaults = {
  CLINIC_LOGIN: "clinic@example.com",
  CLINIC_PASSWORD: "dente2026",
  ADMIN_PIN: "0000",
  STAFF_PIN: "1234",
} as const;

type CredentialName = keyof typeof credentialDefaults;

type SeedCredentials = {
  readonly clinicLogin: string;
  readonly clinicPassword: string;
  readonly adminPin: string;
  readonly staffPin: string;
  readonly defaulted: readonly CredentialName[];
};

/**
 * Отказ по защите от разрушительного сброса. Отдельный класс нужен, чтобы
 * верхний уровень напечатал понятное объяснение вместо стека вызовов: стек
 * здесь не несёт информации, а сообщение — несёт.
 */
class SeedRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedRefusedError";
  }
}

/**
 * Таблицы, которые чистит сид, в порядке удаления (от детей к родителям).
 *
 * `generated_documents` добавлена к прежнему списку из 21 таблицы: сид В НЕЁ
 * ПИШЕТ, но прежде её не чистил, поэтому второй запуск падал на конфликте
 * первичного ключа. Место в списке определено внешними ключами:
 * `communication_tasks.document_id` ссылается на неё, а она сама — на visits,
 * patients, users и organizations.
 */
const tenantScopedTablesInDeletionOrder: ReadonlyArray<{
  readonly name: string;
  readonly table: PgTable;
}> = [
  {
    name: "dente_telegram_outbox_delivery_receipts",
    table: schema.denteTelegramOutboxDeliveryReceipts,
  },
  { name: "dente_telegram_webhook_events", table: schema.denteTelegramWebhookEvents },
  { name: "dente_telegram_chat_links", table: schema.denteTelegramChatLinks },
  { name: "dente_telegram_link_codes", table: schema.denteTelegramLinkCodes },
  { name: "dente_telegram_bot_configs", table: schema.denteTelegramBotConfigs },
  { name: "communication_events", table: schema.communicationEvents },
  { name: "communication_tasks", table: schema.communicationTasks },
  { name: "communication_templates", table: schema.communicationTemplates },
  { name: "payments", table: schema.payments },
  { name: "generated_documents", table: schema.generatedDocuments },
  { name: "clinical_rules", table: schema.clinicalRules },
  { name: "treatment_scenarios", table: schema.treatmentScenarios },
  { name: "treatment_items", table: schema.treatmentItems },
  { name: "service_catalog_items", table: schema.serviceCatalogItems },
  { name: "visits", table: schema.visits },
  { name: "appointments", table: schema.appointments },
  { name: "patient_consents", table: schema.patientConsents },
  { name: "patients", table: schema.patients },
  { name: "chairs", table: schema.chairs },
  { name: "users", table: schema.users },
  { name: "clinics", table: schema.clinics },
  { name: "organizations", table: schema.organizations },
];

function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * `NODE_ENV=production` — единственный режим, который здесь распознаётся по
 * имени, и распознаётся он как ЗАПРЕТ, а не как разрешение. Поэтому обычная
 * ловушка с незаданным NODE_ENV (см. accessGuard.ts: пустое окружение — типовое
 * состояние боевой установки) тут не открывает ничего лишнего: основную защиту
 * несёт подсчёт строк ниже, который вообще не зависит от NODE_ENV.
 */
function productionModeActive(): boolean {
  return process.env.NODE_ENV?.trim().toLowerCase() === "production";
}

function destructiveResetAuthorized(): boolean {
  return process.env[DESTRUCTIVE_RESET_ENV_NAME] === DESTRUCTIVE_RESET_ENV_VALUE;
}

function resolveCredentials(): SeedCredentials {
  const defaulted: CredentialName[] = [];
  const read = (name: CredentialName): string => {
    const provided = process.env[name];
    if (provided !== undefined && provided.trim() !== "") return provided;
    defaulted.push(name);
    return credentialDefaults[name];
  };
  return {
    clinicLogin: read("CLINIC_LOGIN"),
    clinicPassword: read("CLINIC_PASSWORD"),
    adminPin: read("ADMIN_PIN"),
    staffPin: read("STAFF_PIN"),
    defaulted,
  };
}

function reportCredentials(credentials: SeedCredentials): void {
  if (credentials.defaulted.length === 0) {
    console.log("Учётные данные сида: все четыре заданы окружением.");
    return;
  }
  const names = credentials.defaulted.join(", ");
  if (productionModeActive()) {
    throw new SeedRefusedError(
      [
        "ОТКАЗ: NODE_ENV=production, а учётные данные взяты по умолчанию.",
        `Не заданы: ${names}.`,
        "Значения по умолчанию опубликованы в этом репозитории и известны всем.",
        "Задайте CLINIC_LOGIN, CLINIC_PASSWORD, ADMIN_PIN и STAFF_PIN в окружении.",
      ].join("\n"),
    );
  }
  console.warn(
    [
      "",
      "ВНИМАНИЕ: учётные данные взяты ПО УМОЛЧАНИЮ, они опубликованы в репозитории.",
      `  Не заданы окружением: ${names}`,
      "  Это допустимо только для разработки и демонстрации.",
      "  Перед передачей клинике задайте их явно и смените после первого входа.",
      "",
    ].join("\n"),
  );
}

/**
 * Считает строки в таблицах сида. Запрос идёт внутри той же транзакции, где уже
 * выставлен `app.current_tenant`, поэтому счёт ВСЕГДА относится только к
 * арендатору, которого сид собирается пересоздать. Строки чужих клиник в него
 * не попадают и удалены не будут.
 */
async function countTenantRows(
  tx: TenantDb,
): Promise<{ total: number; byTable: string[] }> {
  let total = 0;
  const byTable: string[] = [];
  for (const entry of tenantScopedTablesInDeletionOrder) {
    const rows = await tx
      .select({ found: sql<number>`count(*)::int` })
      .from(entry.table);
    const found = rows[0]?.found ?? 0;
    if (found > 0) {
      byTable.push(`${entry.name}: ${found}`);
      total += found;
    }
  }
  return { total, byTable };
}

/**
 * Чистит данные ОДНОГО арендатора под его же контекстом.
 *
 * ЗАЩИТА. Она соразмерна разрушению, и это осознанный выбор, а не компромисс:
 *   • в базе нет ни одной строки этого арендатора — удалять нечего, ничего
 *     разрушительного не происходит, разворачивание на чистой машине идёт без
 *     единой дополнительной переменной;
 *   • строки есть — операция стирает медицинские данные, и тогда требуется
 *     явное `DENTAL_ALLOW_DESTRUCTIVE_DB_RESET=YES`, а при NODE_ENV=production
 *     отказ безусловный: демонстрационный сид не имеет законного применения в
 *     боевой базе с данными.
 * В обоих случаях количество строк печатается до принятия решения, поэтому
 * масштаб виден из вывода команды, а не из чтения исходников.
 *
 * Так же устроены защиты у соседей по индустрии: Rails
 * (`ActiveRecord::ProtectedEnvironmentError` + `DISABLE_DATABASE_ENVIRONMENT_CHECK`),
 * Prisma (`migrate reset` объявлен командой только для разработки),
 * Laravel (подтверждение при боевом окружении, `--force` для обхода).
 */
async function clearTenantData(tx: TenantDb, organizationId: string): Promise<void> {
  const { total, byTable } = await countTenantRows(tx);

  if (total === 0) {
    console.log(
      `Очистка: у арендатора ${organizationId} нет ни одной строки — удалять нечего.`,
    );
    return;
  }

  console.log(`Очистка затронет ${total} строк арендатора ${organizationId}:`);
  for (const line of byTable) console.log(`   ${line}`);

  if (productionModeActive()) {
    throw new SeedRefusedError(
      [
        `ОТКАЗ: NODE_ENV=production, а база содержит ${total} строк этого арендатора.`,
        "Сид разрушителен и в боевой базе с данными не выполняется ни при каких флагах.",
      ].join("\n"),
    );
  }

  if (!destructiveResetAuthorized()) {
    throw new SeedRefusedError(
      [
        `ОТКАЗ: сид удалил бы ${total} существующих строк, включая данные пациентов.`,
        `Чтобы разрешить это осознанно, задайте ${DESTRUCTIVE_RESET_ENV_NAME}="${DESTRUCTIVE_RESET_ENV_VALUE}".`,
        "Ничего не удалено, транзакция откачена.",
      ].join("\n"),
    );
  }

  console.log(
    `Разрешено переменной ${DESTRUCTIVE_RESET_ENV_NAME}=${DESTRUCTIVE_RESET_ENV_VALUE}. Удаляю...`,
  );
  for (const entry of tenantScopedTablesInDeletionOrder) {
    await tx.delete(entry.table);
  }
  console.log("Очистка завершена.");
}

/**
 * Отбирает строки, чьи внешние ссылки существуют среди уже вставленных.
 *
 * Зачем: состояние в JSON не обязано быть ссылочно целостным. В корневом
 * `.data/dental-crm-state.json` на этой машине лежит активный приём, чей пациент
 * в состоянии отсутствует вовсе (`patients: []`) — прежний сид вставлял его
 * безусловно и падал на внешнем ключе `visits.patient_id`. Пропуск с явным
 * сообщением честнее падения: развёртывание доходит до конца, а оператор видит,
 * что именно из состояния не перенеслось.
 */
function keepResolvable<T>(
  rows: readonly T[],
  label: string,
  isResolvable: (row: T) => boolean,
): T[] {
  const kept = rows.filter(isResolvable);
  const skipped = rows.length - kept.length;
  if (skipped > 0) {
    console.warn(
      `   пропущено ${skipped} из ${rows.length} (${label}): ссылка на отсутствующую строку`,
    );
  }
  return kept;
}

async function seed(): Promise<void> {
  console.log("Перенос состояния JSON в базу...");

  const state = loadPersistentState();
  if (!state) {
    throw new SeedRefusedError(
      "Не удалось прочитать состояние JSON (см. DENTAL_STATE_FILE и .data/dental-crm-state.json).",
    );
  }

  const clinicProfile = state.clinicProfile;
  const organizationId = clinicProfile?.organizationId;
  if (!organizationId || !UUID_PATTERN.test(organizationId)) {
    throw new SeedRefusedError(
      `В состоянии нет корректного clinicProfile.organizationId (получено: ${String(organizationId)}). ` +
        "Он выставляется контекстом арендатора и обязан быть UUID.",
    );
  }

  const credentials = resolveCredentials();
  reportCredentials(credentials);

  const staffMembers: readonly StaffMember[] = state.staffMembers ?? [];
  const chairs: readonly Chair[] = state.chairs ?? [];
  const patients: readonly Patient[] = state.patients ?? [];
  const appointments: readonly Appointment[] = state.appointments ?? [];
  const documents: readonly GeneratedDocument[] = state.documents ?? [];
  const clinicalRules: readonly ClinicalRule[] = state.clinicalRules ?? [];
  const payments: readonly Payment[] = state.payments ?? [];
  const activeVisit = state.activeVisit ?? null;

  const passwordHash = await hashCredential(credentials.clinicPassword);
  /*
   * hashCredential асинхронна (pbkdf2 в пуле потоков, см.
   * utils/cryptoHelper.ts). Без await в колонку уехал бы текст
   * "[object Promise]", и после переноса в клинику нельзя было бы войти.
   * Соль своя у каждой строки: два сотрудника с одинаковым PIN не должны
   * получать одинаковый хеш, поэтому хеши персонала считаются построчно ниже.
   */
  const staffRows = await Promise.all(
    staffMembers.map(async (staff) => {
      const isAdmin = staff.role === "owner" || staff.role === "administrator";
      const pin = isAdmin ? credentials.adminPin : credentials.staffPin;
      return {
        id: staff.id,
        organizationId,
        fullName: staff.fullName,
        role: staff.role,
        phone: staff.phone,
        email: staff.email,
        pinCodeHash: await hashCredential(pin),
        isActive: staff.active,
        createdAt: new Date(staff.createdAt),
      };
    }),
  );

  await withTenantCtx(organizationId, async (tx) => {
    await clearTenantData(tx, organizationId);

    console.log(`Организация: ${clinicProfile?.clinicName || "(без названия)"}`);
    await tx.insert(schema.organizations).values({
      id: organizationId,
      name: clinicProfile?.clinicName ?? "",
      loginId: credentials.clinicLogin,
      passwordHash,
      inn: clinicProfile?.inn,
      kpp: clinicProfile?.kpp,
      ogrn: clinicProfile?.ogrn,
      legalAddress: clinicProfile?.address,
      email: clinicProfile?.email,
      website: clinicProfile?.website,
      bankDetails: clinicProfile?.bankDetails,
      signatoryName: clinicProfile?.signatoryName,
      signatoryTitle: clinicProfile?.signatoryTitle,
      medicalLicenseNumber: clinicProfile?.medicalLicenseNumber,
      medicalLicenseIssuedAt: clinicProfile?.medicalLicenseIssuedAt,
      medicalLicenseIssuer: clinicProfile?.medicalLicenseIssuer,
    });

    console.log("Клиника по умолчанию");
    await tx.insert(schema.clinics).values({
      id: DEFAULT_CLINIC_ID,
      organizationId,
      name: "Основная клиника",
      address: clinicProfile?.address,
      phone: clinicProfile?.phone,
      timezone: clinicProfile?.timezone,
    });

    console.log(`Сотрудники: ${staffRows.length}`);
    for (const chunk of chunkArray(staffRows, CHUNK_SIZE)) {
      await tx.insert(schema.users).values(chunk);
    }
    const staffIds = new Set(staffRows.map((staff) => staff.id));

    console.log(`Кресла: ${chairs.length}`);
    const chairRows = chairs.map((chair) => ({
      id: chair.id,
      organizationId,
      clinicId: DEFAULT_CLINIC_ID,
      name: chair.name,
      isActive: chair.active,
    }));
    for (const chunk of chunkArray(chairRows, CHUNK_SIZE)) {
      await tx.insert(schema.chairs).values(chunk);
    }
    const chairIds = new Set(chairRows.map((chair) => chair.id));

    console.log(`Пациенты: ${patients.length}`);
    const patientRows = patients.map((patient) => ({
      id: patient.id,
      organizationId,
      status: patient.status,
      fullName: patient.fullName,
      birthDate: patient.birthDate,
      phone: patient.phone,
      email: patient.email,
      notes: patient.notes,
      administrativeProfile: patient.administrativeProfile,
      createdAt: new Date(patient.createdAt),
      updatedAt: new Date(patient.updatedAt),
    }));
    for (const chunk of chunkArray(patientRows, CHUNK_SIZE)) {
      await tx.insert(schema.patients).values(chunk);
    }
    const patientIds = new Set(patientRows.map((patient) => patient.id));

    console.log(`Записи в расписании: ${appointments.length}`);
    const appointmentRows = keepResolvable(
      appointments,
      "appointments",
      (appointment) =>
        (appointment.patientId === null || patientIds.has(appointment.patientId)) &&
        (appointment.doctorUserId === null || staffIds.has(appointment.doctorUserId)) &&
        (!appointment.assistantUserId || staffIds.has(appointment.assistantUserId)) &&
        (appointment.chairId === null || chairIds.has(appointment.chairId)),
    ).map((appointment) => ({
      id: appointment.id,
      organizationId,
      patientId: appointment.patientId,
      doctorUserId: appointment.doctorUserId,
      assistantUserId: appointment.assistantUserId,
      chairId: appointment.chairId,
      status: appointment.status,
      startsAt: new Date(appointment.startsAt),
      endsAt: new Date(appointment.endsAt),
      reason: appointment.reason,
      comment: appointment.comment,
    }));
    for (const chunk of chunkArray(appointmentRows, CHUNK_SIZE)) {
      await tx.insert(schema.appointments).values(chunk);
    }
    const appointmentIds = new Set(appointmentRows.map((row) => row.id));

    const visitRows =
      activeVisit && patientIds.has(activeVisit.patientId)
        ? [
            {
              id: activeVisit.id,
              organizationId,
              patientId: activeVisit.patientId,
              appointmentId:
                activeVisit.appointmentId && appointmentIds.has(activeVisit.appointmentId)
                  ? activeVisit.appointmentId
                  : null,
              status: activeVisit.status,
              revision: activeVisit.revision,
              complaint: activeVisit.complaint,
              anamnesis: activeVisit.anamnesis,
              objectiveStatus: activeVisit.objectiveStatus,
              diagnosis: activeVisit.diagnosis,
              treatmentPlan: activeVisit.treatmentPlan,
              doctorSummary: activeVisit.doctorSummary,
              /*
               * signedAt здесь НЕ переносится намеренно: у общего типа Visit
               * такого поля нет вовсе. Прежний код читал `activeVisit.signedAt`
               * через `as any`, всегда получал undefined и писал null — то есть
               * выглядел переносом подписи, не будучи им. Колонка nullable, а
               * значение подписи в состоянии просто отсутствует.
               */
              createdAt: new Date(activeVisit.createdAt),
              updatedAt: new Date(activeVisit.updatedAt),
            },
          ]
        : [];
    if (activeVisit && visitRows.length === 0) {
      console.warn(
        `   активный приём ${activeVisit.id} пропущен: пациента ${activeVisit.patientId} нет в состоянии`,
      );
    }
    console.log(`Активный приём: ${visitRows.length}`);
    for (const chunk of chunkArray(visitRows, CHUNK_SIZE)) {
      await tx.insert(schema.visits).values(chunk);
    }
    const visitIds = new Set(visitRows.map((row) => row.id));

    console.log(`Документы: ${documents.length}`);
    const documentRows = keepResolvable(documents, "generated_documents", (document) =>
      patientIds.has(document.patientId),
    ).map((document) => ({
      id: document.id,
      organizationId,
      patientId: document.patientId,
      /*
       * visitId сбрасывается в null, если приёма нет среди вставленных: у
       * generated_documents есть составной внешний ключ на
       * (visit_id, patient_id, organization_id), и ссылка на несуществующий
       * приём валит вставку целиком.
       */
      visitId: document.visitId && visitIds.has(document.visitId) ? document.visitId : null,
      kind: document.kind,
      status: document.status,
      /*
       * title обязателен в схеме (NOT NULL) и прежде здесь не заполнялся
       * вовсе — весь объект уходил через `as any`, компилятор молчал, и
       * вставка любого документа падала на NOT NULL уже в бою.
       */
      title: document.title,
      totalAmountRub: document.totalAmountRub,
      payloadJson: document.payload ? JSON.stringify(document.payload) : null,
      issuedAt: document.issuedAt ? new Date(document.issuedAt) : null,
      createdAt: new Date(document.issuedAt ?? Date.now()),
    }));
    for (const chunk of chunkArray(documentRows, CHUNK_SIZE)) {
      await tx.insert(schema.generatedDocuments).values(chunk);
    }
    const documentIds = new Set(documentRows.map((row) => row.id));

    console.log(`Клинические правила: ${clinicalRules.length}`);
    const rulesWithSlugId = clinicalRules.filter((rule) => !UUID_PATTERN.test(rule.id));
    if (rulesWithSlugId.length > 0) {
      console.warn(
        `   у ${rulesWithSlugId.length} из ${clinicalRules.length} правил идентификатор не UUID ` +
          `(например «${rulesWithSlugId[0]?.id}») — идентификатор назначит база`,
      );
    }
    const ruleRows = clinicalRules.map((rule) => ({
      /*
       * clinical_rules.id — колонка uuid, а состояние хранит правила под
       * лозунгами вида "rule-caries-requires-image" (sampleData.ts:900 и далее).
       * Прежний код передавал лозунг как есть и валил вставку с 22P02
       * "invalid input syntax for type uuid".
       *
       * undefined заставляет drizzle опустить колонку, и база берёт
       * defaultRandom() — ровно так же, как это делает рантайм в
       * db/clinicalQuery.ts:154, где id вообще не передаётся. Придумывать здесь
       * детерминированный UUID из лозунга нельзя: получился бы идентификатор,
       * которого не знает ни одна другая часть системы.
       */
      id: UUID_PATTERN.test(rule.id) ? rule.id : undefined,
      organizationId,
      title: rule.title,
      category: rule.category,
      specialty: rule.specialty,
      action: rule.action,
      severity: rule.severity,
      ownerRole: rule.ownerRole,
      triggerServiceIdsJson: JSON.stringify(rule.triggerServiceIds),
      requiredServiceIdsJson: JSON.stringify(rule.requiredServiceIds),
      requiresCompletedServiceIdsJson: JSON.stringify(rule.requiresCompletedServiceIds),
      blockedServiceIdsJson: JSON.stringify(rule.blockedServiceIds),
      condition: rule.condition,
      warningText: rule.warningText,
      patientText: rule.patientText,
      isActive: rule.active,
      /*
       * createdAt/updatedAt здесь не переносятся: у общего типа ClinicalRule
       * этих полей нет. Прежний код читал их через `as any`, получал undefined
       * и передавал `new Date(undefined)` — Invalid Date, который PostgreSQL
       * отвергает. Колонки NOT NULL DEFAULT now(), значение проставит база.
       */
    }));
    for (const chunk of chunkArray(ruleRows, CHUNK_SIZE)) {
      await tx.insert(schema.clinicalRules).values(chunk);
    }

    console.log(`Платежи: ${payments.length}`);
    const paymentRows = keepResolvable(
      payments,
      "payments",
      (payment) => patientIds.has(payment.patientId),
    ).map((payment) => ({
      id: payment.id,
      organizationId,
      patientId: payment.patientId,
      visitId: payment.visitId && visitIds.has(payment.visitId) ? payment.visitId : null,
      documentId:
        payment.documentId && documentIds.has(payment.documentId) ? payment.documentId : null,
      amountRub: payment.amountRub,
      method: payment.method,
      status: payment.status,
      /*
       * paidAt в состоянии nullable, а колонка — NOT NULL DEFAULT now().
       * undefined заставляет drizzle опустить колонку и взять умолчание базы;
       * прежний код звал `new Date(null)` и получал 1970-01-01, то есть тихо
       * подменял дату платежа вместо того, чтобы оставить умолчание.
       */
      paidAt: payment.paidAt ? new Date(payment.paidAt) : undefined,
      fiscalReceiptNumber: payment.fiscalReceiptNumber,
      fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt,
      fiscalReceiptUrl: payment.fiscalReceiptUrl,
      fiscalReceipt: payment.fiscalReceipt,
      payerFullName: payment.payerFullName,
      payerInn: payment.payerInn,
      payerBirthDate: payment.payerBirthDate,
      payerIdentityDocument: payment.payerIdentityDocument,
      payerRelationship: payment.payerRelationship,
      taxDeductionCode: payment.taxDeductionCode,
      note: payment.note,
    }));
    for (const chunk of chunkArray(paymentRows, CHUNK_SIZE)) {
      await tx.insert(schema.payments).values(chunk);
    }
  });

  console.log("");
  console.log("Сид завершён. Схему создаёт 'npm run db:migrate', её надо запускать первой.");
}

seed()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    if (error instanceof SeedRefusedError) {
      console.error("");
      console.error(error.message);
    } else {
      console.error("Ошибка сида:", error);
    }
    await pool.end();
    process.exit(1);
  });
