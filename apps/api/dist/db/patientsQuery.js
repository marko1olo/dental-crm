import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and } from "drizzle-orm";
import { patientSchema } from "@dental/shared";
import { createPatient as createPatientInMemory, patients as inMemoryPatients, updatePatientAdministrativeProfile as updatePatientAdministrativeProfileInMemory, updatePatient as updatePatientInMemory, } from "../sampleData.js";
function useInMemory() {
    return process.env.DENTAL_STATE_PERSISTENCE === "off";
}
/**
 * Отметка времени из строки таблицы в ISO-строку.
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ФУНКЦИЯ: раньше здесь стояло `p.createdAt.toISOString()`, и
 * строка без этого поля роняла запрос с «Cannot read properties of undefined
 * (reading 'toISOString')» изнутри Array.map — по такому сообщению невозможно
 * понять, ни какой пациент, ни какое поле. Драйвер к тому же отдаёт timestamptz
 * то объектом Date, то строкой, в зависимости от пути (RETURNING, JSON-обмен
 * между процессами), поэтому оба вида принимаются, а отсутствие значения
 * называется прямо.
 */
function rowTimestampToIso(value, field, patientId) {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            throw new Error(`Пациент ${String(patientId)}: поле ${field} содержит недопустимую дату.`);
        }
        return value.toISOString();
    }
    if (typeof value === "string" && value.trim()) {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new Error(`Пациент ${String(patientId)}: поле ${field} не разбирается как дата: ${value}`);
        }
        return parsed.toISOString();
    }
    throw new Error(`Пациент ${String(patientId)}: в строке таблицы нет поля ${field}. ` +
        "Карточка не собрана: подставлять текущее время нельзя, оно исказит историю.");
}
/** Maps a Drizzle $inferSelect row to a validated Patient DTO via Zod parse.
 *  No type assertions — Zod validates at the DB/API boundary and returns the typed object.
 *  Экспортируется, чтобы преобразование строки проверялось тестом напрямую. */
export function rowToPatient(p) {
    return patientSchema.parse({
        id: p.id,
        organizationId: p.organizationId,
        status: p.status,
        fullName: p.fullName,
        birthDate: p.birthDate,
        phone: p.phone,
        email: p.email,
        notes: p.notes,
        administrativeProfile: p.administrativeProfile ?? null,
        balanceRub: 0,
        createdAt: rowTimestampToIso(p.createdAt, "created_at", p.id),
        updatedAt: rowTimestampToIso(p.updatedAt, "updated_at", p.id),
    });
}
export async function getPatientByIdFromDb(organizationId, id) {
    if (useInMemory()) {
        return inMemoryPatients.find((p) => p.id === id) ?? null;
    }
    try {
        const [p] = await db.select().from(schema.patients).where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, id)));
        if (!p)
            return null;
        return rowToPatient(p);
    }
    catch {
        return inMemoryPatients.find((p) => p.id === id) ?? null;
    }
}
export async function getPatientsFromDb(organizationId) {
    if (useInMemory()) {
        return inMemoryPatients;
    }
    try {
        const pts = await db.select().from(schema.patients).where(eq(schema.patients.organizationId, organizationId));
        return pts.map(rowToPatient);
    }
    catch (error) {
        /* БЫЛО: при сбое базы возвращался глобальный массив-образец
           inMemoryPatients. Он не отфильтрован по организации, то есть клиника
           получала чужой список, и, что важнее, интерфейс показывал этот
           список как настоящий: на экране «Пациенты» появлялись люди, которых
           в клинике нет, а настоящие исчезали. По такому списку регистратор
           мог записать на приём не того человека.
           Молчаливая подмена данных в медицинской системе опаснее честной
           ошибки. Режим работы без базы задаётся выше, в useInMemory(). */
        console.error("[patientsQuery] Не удалось прочитать список пациентов из базы:", error);
        throw error;
    }
}
export async function createPatientInDb(organizationId, input) {
    if (useInMemory()) {
        return createPatientInMemory(input);
    }
    try {
        const [created] = await db.insert(schema.patients).values({
            organizationId,
            fullName: input.fullName,
            birthDate: input.birthDate ?? null,
            phone: input.phone ?? null,
            email: input.email ?? null,
            notes: input.notes ?? null,
        }).returning();
        if (!created)
            throw new Error("Failed to create patient in DB");
        return rowToPatient(created);
    }
    catch (error) {
        /* БЫЛО: `catch { return createPatientInMemory(input) }`. Любая ошибка
           базы подменялась записью в оперативную память, и маршрут отвечал 201
           с пациентом, которого в базе нет. Проверено на живом API: вставка с
           недопустимым для PostgreSQL значением дала HTTP 201 и идентификатор
           88679224-…, которому в таблице patients соответствует 0 строк.
           Регистратор считает пациента созданным, а дальше по этому
           идентификатору не откроется карточка, не пройдёт запись на приём и
           не проведётся оплата.
           Подмена памятью уместна только в режиме без базы — он выше, в
           useInMemory(). Настоящий сбой базы обязан дойти до маршрута. */
        console.error("[patientsQuery] Не удалось создать пациента в базе:", error);
        throw error;
    }
}
export async function updatePatientInDb(organizationId, patientId, input) {
    if (useInMemory()) {
        return updatePatientInMemory(patientId, input);
    }
    try {
        const [updated] = await db.update(schema.patients)
            .set({
            fullName: input.fullName,
            birthDate: input.birthDate,
            phone: input.phone,
            email: input.email,
            notes: input.notes,
            updatedAt: new Date(),
        })
            /* organizationId обязателен в условии. Без него запись шла только
               по идентификатору пациента, и клиника переписывала карточку
               чужой клиники: проверено на живой базе — PUT /api/patients/<uuid
               чужого пациента> с токеном первой клиники вернул 200 и заменил
               ФИО и телефон в чужой организации. */
            .where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, patientId)))
            .returning();
        if (!updated)
            return null;
        return rowToPatient(updated);
    }
    catch (error) {
        /* См. комментарий в createPatientInDb. Здесь подмена памятью давала
           HTTP 200 с объектом пациента при том, что в базе не менялось ничего:
           правка теряется молча и обнаруживается только после перезагрузки
           карточки. Маршрут уже умеет отвечать честно — «Не удалось сохранить
           изменения», — но получал успех вместо ошибки. */
        console.error("[patientsQuery] Не удалось обновить пациента в базе:", error);
        throw error;
    }
}
export async function updatePatientAdministrativeProfileInDb(organizationId, patientId, input) {
    if (useInMemory()) {
        return updatePatientAdministrativeProfileInMemory(patientId, input);
    }
    try {
        const [updated] = await db.update(schema.patients)
            .set({
            administrativeProfile: input,
            updatedAt: new Date(),
        })
            /* Тот же пропуск, что и в updatePatientInDb. Здесь маршрут сейчас
               прикрыт проверкой getPatientByIdFromDb(orgId, ...) перед вызовом,
               но полагаться на порядок вызовов в маршруте нельзя: ограничение
               области принадлежит запросу. */
            .where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, patientId)))
            .returning();
        if (!updated)
            return null;
        return rowToPatient(updated);
    }
    catch (error) {
        /* См. комментарий в createPatientInDb: сбой базы не должен выглядеть
           как успешное сохранение административного профиля. */
        console.error("[patientsQuery] Не удалось обновить профиль пациента в базе:", error);
        throw error;
    }
}
