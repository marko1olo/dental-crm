/**
 * staffAuthorityQuery.ts — запись персональных полномочий сотрудника.
 *
 * ЧТО ЭТО ЗА ПОЛНОМОЧИЯ. Три колонки таблицы `users`:
 * `can_sign_medical_records` (подпись медицинской документации),
 * `can_manage_money` (касса, оплаты, возвраты) и `can_manage_imports`
 * (перенос данных из прежней программы). Все три созданы миграцией 0000
 * (строки 1078-1080) как `boolean NOT NULL DEFAULT false`; форма проверена на
 * ЖИВОЙ базе через `information_schema.columns` (2026-07-29), а не по файлу
 * миграции.
 *
 * ЧТО БЫЛО. Писать их было нечем и некуда. `createStaffMemberSchema` этих полей
 * не объявляет, ни один маршрут настроек их не принимал, а в модели drizzle
 * третья колонка не была объявлена вовсе — то есть даже принятое значение
 * записать было невозможно. Вкладка «Настройки → Персонал» при этом посылает
 * все три флага в теле POST (`SettingsStaffTab.tsx:127-129`), zod отбрасывал
 * незаявленные ключи, и форма закрывалась как после успешного сохранения:
 * выбор «кто допущен к кассе» не имел последствий ни разу.
 *
 * ПОЧЕМУ НАДБАВКА К РОЛИ, А НЕ ПОЛНОЕ ЗНАЧЕНИЕ ПОЛНОМОЧИЯ. В живой базе `false`
 * стоит во ВСЕХ семи строках сотрудников двух организаций — включая владельца
 * клиники, который может всё, и четырёх врачей, которые ведут приём. Это
 * значение по умолчанию колонки, а не решение клиники: отличить «запрещено» от
 * «никогда не настраивали» в одном boolean нельзя. Поэтому колонка ДОБАВЛЯЕТ
 * полномочие к тому, что даёт роль, и никогда не отнимает:
 *
 *     итог = роль (ROLE_PERMISSIONS) ИЛИ надбавка (колонка)
 *
 * Следствия, каждое из которых — сознательный выбор:
 *
 *  1. Существующие строки остаются осмысленными. Прочитать `false` как «нельзя»
 *     значило бы снять право подписи ЭМК со всех врачей и владельца сразу,
 *     оставив контрольный список смены навсегда без подписывающего врача.
 *
 *  2. Снять надбавку можно, опустить ниже роли — нельзя. Запрос «поставить
 *     false» проходит, если роль этого полномочия НЕ даёт (сотрудник
 *     возвращается к умолчанию роли), и ОТКЛОНЯЕТСЯ, если даёт: записать `false`
 *     врачу и ответить 200 значило бы показать владельцу снятую галочку, тогда
 *     как право осталось. Тристейта в базе нет (колонка NOT NULL), а завести
 *     его — это миграция с новым столбцом; отдельного запрета до неё не
 *     существует, и врать об этом нельзя.
 *
 *  3. Выдать полномочие себе невозможно даже в будущем: маршрут требует права
 *     `settings.write`, а оно есть только у роли, у которой все три полномочия
 *     уже есть по роли, — надбавка себе не добавляет ничего. Проверку «не себе»
 *     всё равно делает маршрут, на случай расширения матрицы.
 *
 * ДОЛГ, БЕЗ КОТОРОГО ЭТОТ МОДУЛЬ ПРОЧТУТ НЕВЕРНО. Чтение полномочий сейчас идёт
 * не отсюда: `db/settingsQuery.ts` и `db/domainStateHydration.ts` выводят их из
 * роли (`security/permissions.ts: staffAuthorityFlags`), колонок не читают, и
 * маршруты по-прежнему судит `requirePermission` по матрице роли. Значит
 * записанная надбавка — это решение клиники, зафиксированное в базе, но ещё НЕ
 * действующий доступ. Перевод чтения на `effective` — отдельный шаг, и делать
 * его половиной нельзя: подсвеченная в интерфейсе кнопка при отказе сервера
 * хуже, чем честно погашенная.
 */

import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";
import { staffAuthorityFlags, type StaffAuthorityFlags } from "../security/permissions.js";
import {
  staffAuthorityFlagKeys,
  type StaffAuthorityFlagKey,
  type StaffAuthorityState,
  type UpdateStaffAuthorityGrantsInput
} from "@dental/shared";

/**
 * Хранение отключено (DENTAL_STATE_PERSISTENCE=off). Надбавки живут только в
 * таблице `users`, а память демо-режима (`sampleData.ts`) их не хранит: там
 * полномочия тоже выводятся из роли. Принять запрос и потерять его при
 * перезапуске — это молчаливая потеря решения о доступе, поэтому отказ.
 */
export class StaffAuthorityStorageDisabledError extends Error {
  constructor() {
    super(
      "Полномочия не сохранены: хранение отключено (DENTAL_STATE_PERSISTENCE=off), " +
        "персональные полномочия живут только в базе. Включите базу и повторите."
    );
    this.name = "StaffAuthorityStorageDisabledError";
  }
}

/** Сотрудника нет в ЭТОЙ клинике: организация всегда стоит в условии запроса. */
export class StaffAuthorityStaffNotFoundError extends Error {
  constructor() {
    super("Сотрудник не найден.");
    this.name = "StaffAuthorityStaffNotFoundError";
  }
}

/**
 * Запрошено снятие полномочия, которое даёт роль. Список полей несёт сам отказ:
 * владельцу нужно знать, какая именно галочка не снялась и почему.
 */
export class StaffAuthorityRevocationUnsupportedError extends Error {
  readonly flags: readonly StaffAuthorityFlagKey[];
  readonly role: string;

  constructor(role: string, flags: readonly StaffAuthorityFlagKey[]) {
    super(`Роль «${role}» даёт эти полномочия сама: ${flags.join(", ")}.`);
    this.name = "StaffAuthorityRevocationUnsupportedError";
    this.role = role;
    this.flags = flags;
  }
}

/** Итог по одному полномочию: роль ИЛИ надбавка. Отнять надбавка не может. */
function effectiveFlags(roleDerived: StaffAuthorityFlags, grants: StaffAuthorityFlags): StaffAuthorityFlags {
  return {
    canSignMedicalRecords: roleDerived.canSignMedicalRecords || grants.canSignMedicalRecords,
    canManageMoney: roleDerived.canManageMoney || grants.canManageMoney,
    canManageImports: roleDerived.canManageImports || grants.canManageImports
  };
}

function stateOf(staffId: string, role: string, grants: StaffAuthorityFlags): StaffAuthorityState {
  /*
   * Роль передаётся СЫРОЙ, как лежит в `users.role`, — та же причина, что в
   * `staffAuthorityFlags`: сводящие обёртки двух путей чтения падают в разные
   * умолчания («assistant» и «doctor»), и второе выдало бы неизвестной роли
   * право подписи ЭМК. Роли вне матрицы `roleHasPermission` не даёт ничего.
   */
  const roleDerived = staffAuthorityFlags(role);
  return { staffId, role, roleDerived, grants, effective: effectiveFlags(roleDerived, grants) };
}

/**
 * Выдача и снятие персональных надбавок.
 *
 * Читает строку и пишет её в ОДНОЙ транзакции с `for update`: между проверкой
 * «даёт ли роль это полномочие» и записью роль того же сотрудника может
 * поменять соседний маршрут (`PUT /api/settings/staff/:staffId`), и тогда ответ
 * назвал бы итоговые полномочия по роли, которой уже нет.
 *
 * Возвращает состояние ПОСЛЕ записи, тремя наборами (роль, надбавки, итог),
 * чтобы вызывающая сторона не считала итог второй раз своей формулой.
 */
export async function grantStaffAuthorityInDb(
  organizationId: string,
  staffId: string,
  input: UpdateStaffAuthorityGrantsInput
): Promise<StaffAuthorityState> {
  if (process.env.DENTAL_STATE_PERSISTENCE === "off") throw new StaffAuthorityStorageDisabledError();

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        id: schema.users.id,
        role: schema.users.role,
        canSignMedicalRecords: schema.users.canSignMedicalRecords,
        canManageMoney: schema.users.canManageMoney,
        canManageImports: schema.users.canManageImports
      })
      .from(schema.users)
      .where(and(eq(schema.users.id, staffId), eq(schema.users.organizationId, organizationId)))
      .limit(1)
      .for("update");
    if (!current) throw new StaffAuthorityStaffNotFoundError();

    const storedGrants: StaffAuthorityFlags = {
      canSignMedicalRecords: current.canSignMedicalRecords,
      canManageMoney: current.canManageMoney,
      canManageImports: current.canManageImports
    };
    const roleDerived = staffAuthorityFlags(current.role);

    /*
     * Сначала — отказ целиком, и только потом запись. Частичное применение
     * («две галочки сохранились, третья нет») оставило бы владельца с
     * непонятным состоянием экрана: он не смог бы сказать, что именно
     * применилось.
     */
    const refused: StaffAuthorityFlagKey[] = [];
    const nextGrants: StaffAuthorityFlags = { ...storedGrants };
    for (const key of staffAuthorityFlagKeys) {
      const requested = input[key];
      if (requested === undefined) continue;
      if (requested === false && roleDerived[key]) {
        refused.push(key);
        continue;
      }
      nextGrants[key] = requested;
    }
    if (refused.length > 0) throw new StaffAuthorityRevocationUnsupportedError(current.role, refused);

    const changed = staffAuthorityFlagKeys.filter((key) => nextGrants[key] !== storedGrants[key]);
    if (changed.length === 0) {
      // Запрос подтвердил то, что уже записано. Отдаём действительное состояние,
      // а не мнимое «сохранено»: лишний UPDATE ничего бы не изменил.
      return stateOf(current.id, current.role, storedGrants);
    }

    const [written] = await tx
      .update(schema.users)
      .set({
        canSignMedicalRecords: nextGrants.canSignMedicalRecords,
        canManageMoney: nextGrants.canManageMoney,
        canManageImports: nextGrants.canManageImports
      })
      .where(and(eq(schema.users.id, staffId), eq(schema.users.organizationId, organizationId)))
      .returning({
        id: schema.users.id,
        role: schema.users.role,
        canSignMedicalRecords: schema.users.canSignMedicalRecords,
        canManageMoney: schema.users.canManageMoney,
        canManageImports: schema.users.canManageImports
      });
    // Строка была прочитана и заблокирована в этой же транзакции, поэтому пустой
    // ответ означал бы не «сотрудника нет», а сбой самой записи.
    if (!written) throw new Error("Полномочия не сохранены: строка сотрудника не записалась.");

    return stateOf(written.id, written.role, {
      canSignMedicalRecords: written.canSignMedicalRecords,
      canManageMoney: written.canManageMoney,
      canManageImports: written.canManageImports
    });
  });
}
