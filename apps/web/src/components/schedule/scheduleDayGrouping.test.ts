import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatDayTitle,
  formatMinutesForHumans,
  groupAppointmentsByClinicDay,
  shiftDayKey,
  type DayGroupingAppointment,
  type ScheduleDayGroup,
  type ScheduleDayRow,
} from "./scheduleDayGrouping.js";

/**
 * Разбор расписания по дням. Проверяется то, из-за чего администратор ошибался:
 * какой это день, где в дне свободное окно и где два человека сидят на одном
 * враче или в одном кресле.
 *
 * Часовой пояс задаётся подставным переводчиком: настоящий toDateTimeLocalValue
 * живёт в AppHelpers и уже проверен отдельно, а здесь важно, что модуль берёт
 * день ИЗ НЕГО, а не считает сутки по UTC своими руками.
 */

/** Переводчик «как в Самаре»: UTC+4, без перехода на летнее время. */
const samaraLocal = (iso: string) => {
  const shifted = new Date(Date.parse(iso) + 4 * 60 * 60_000);
  return shifted.toISOString().slice(0, 16);
};

const appointment = (patch: Partial<DayGroupingAppointment> = {}): DayGroupingAppointment => ({
  id: "a1",
  startsAt: "2026-07-28T05:00:00.000Z",
  endsAt: "2026-07-28T05:30:00.000Z",
  status: "planned",
  doctorUserId: "doc-1",
  chairId: "chair-1",
  patientId: "pat-1",
  ...patch,
});

/** Обращение к элементу списка с проверкой: у tsconfig включён noUncheckedIndexedAccess. */
function group(groups: ScheduleDayGroup[], index: number): ScheduleDayGroup {
  const found = groups[index];
  assert.ok(found, `ожидалась группа дня №${index}, а её нет`);
  return found;
}

function rowsOfKind<K extends ScheduleDayRow["kind"]>(
  target: ScheduleDayGroup,
  kind: K,
): Extract<ScheduleDayRow, { kind: K }>[] {
  return target.rows.filter((row): row is Extract<ScheduleDayRow, { kind: K }> => row.kind === kind);
}

function onlyRow<K extends ScheduleDayRow["kind"]>(
  target: ScheduleDayGroup,
  kind: K,
): Extract<ScheduleDayRow, { kind: K }> {
  const found = rowsOfKind(target, kind);
  assert.equal(found.length, 1, `ожидалась ровно одна строка «${kind}», найдено ${found.length}`);
  const first = found[0];
  assert.ok(first);
  return first;
}

describe("groupAppointmentsByClinicDay", () => {
  it("считает день по часовому поясу клиники, а не по UTC", () => {
    // 21:30 UTC 28 июля — это 01:30 29 июля в Самаре. По UTC приём попал бы во
    // вчерашний день, и администратор искал бы его не там.
    const groups = groupAppointmentsByClinicDay(
      [appointment({ startsAt: "2026-07-28T21:30:00.000Z", endsAt: "2026-07-28T22:00:00.000Z" })],
      { toClinicLocal: samaraLocal, todayKey: "2026-07-28" },
    );
    assert.equal(groups.length, 1);
    assert.equal(group(groups, 0).dateKey, "2026-07-29");
    assert.equal(group(groups, 0).relation, "tomorrow");
    assert.equal(group(groups, 0).relativeLabel, "завтра");
  });

  it("раскладывает приёмы по дням в хронологическом порядке и называет дни словами", () => {
    const groups = groupAppointmentsByClinicDay(
      [
        appointment({ id: "future", startsAt: "2026-07-30T06:00:00.000Z", endsAt: "2026-07-30T06:30:00.000Z" }),
        appointment({ id: "old", startsAt: "2024-01-28T12:00:00.000Z", endsAt: "2024-01-28T13:00:00.000Z" }),
        appointment({ id: "today", startsAt: "2026-07-28T06:00:00.000Z", endsAt: "2026-07-28T06:30:00.000Z" }),
      ],
      { toClinicLocal: samaraLocal, todayKey: "2026-07-28" },
    );
    assert.deepEqual(
      groups.map((item) => item.dateKey),
      ["2024-01-28", "2026-07-28", "2026-07-30"],
    );
    assert.deepEqual(
      groups.map((item) => item.relation),
      ["past", "today", "future"],
    );
    assert.equal(group(groups, 0).relativeLabel, "прошедший день");
    assert.equal(group(groups, 1).title, "вторник, 28 июля");
  });

  it("показывает свободное окно между приёмами и не показывает короткий перерыв", () => {
    const groups = groupAppointmentsByClinicDay(
      [
        appointment({ id: "first", startsAt: "2026-07-28T05:00:00.000Z", endsAt: "2026-07-28T06:00:00.000Z" }),
        // 45 минут пусто — это окно, его администратор ищет.
        appointment({ id: "second", startsAt: "2026-07-28T06:45:00.000Z", endsAt: "2026-07-28T07:15:00.000Z" }),
        // 5 минут между приёмами — не окно, а время на уборку кресла.
        appointment({ id: "third", startsAt: "2026-07-28T07:20:00.000Z", endsAt: "2026-07-28T07:50:00.000Z" }),
      ],
      { toClinicLocal: samaraLocal, todayKey: "2026-07-28" },
    );
    const day = group(groups, 0);
    assert.equal(onlyRow(day, "gap").minutes, 45);
    assert.equal(day.freeGapMinutes, 45);
    assert.equal(day.bookedMinutes, 120);
    assert.equal(day.appointmentCount, 3);
  });

  it("находит накладку у одного врача и молчит про параллельную работу разных врачей", () => {
    const sameDoctor = groupAppointmentsByClinicDay(
      [
        appointment({ id: "first", startsAt: "2026-07-28T05:00:00.000Z", endsAt: "2026-07-28T06:00:00.000Z" }),
        appointment({
          id: "second",
          startsAt: "2026-07-28T05:30:00.000Z",
          endsAt: "2026-07-28T06:30:00.000Z",
          chairId: "chair-2",
        }),
      ],
      { toClinicLocal: samaraLocal, todayKey: "2026-07-28" },
    );
    const overlap = onlyRow(group(sameDoctor, 0), "overlap");
    assert.equal(overlap.minutes, 30);
    assert.equal(overlap.sameDoctor, true);
    assert.equal(overlap.sameChair, false);
    assert.equal(group(sameDoctor, 0).overlapCount, 1);

    const differentEverything = groupAppointmentsByClinicDay(
      [
        appointment({ id: "first" }),
        appointment({
          id: "second",
          startsAt: "2026-07-28T05:15:00.000Z",
          endsAt: "2026-07-28T05:45:00.000Z",
          doctorUserId: "doc-2",
          chairId: "chair-2",
        }),
      ],
      { toClinicLocal: samaraLocal, todayKey: "2026-07-28" },
    );
    assert.equal(group(differentEverything, 0).overlapCount, 0);
  });

  it("находит накладку по креслу, даже если врачи разные", () => {
    const groups = groupAppointmentsByClinicDay(
      [
        appointment({ id: "first" }),
        appointment({
          id: "second",
          startsAt: "2026-07-28T05:15:00.000Z",
          endsAt: "2026-07-28T05:45:00.000Z",
          doctorUserId: "doc-2",
        }),
      ],
      { toClinicLocal: samaraLocal, todayKey: "2026-07-28" },
    );
    const overlap = onlyRow(group(groups, 0), "overlap");
    assert.equal(overlap.sameChair, true);
    assert.equal(overlap.sameDoctor, false);
  });

  it("отменённый приём и неявка время не занимают: их место — свободное окно", () => {
    const groups = groupAppointmentsByClinicDay(
      [
        appointment({ id: "kept", startsAt: "2026-07-28T05:00:00.000Z", endsAt: "2026-07-28T06:00:00.000Z" }),
        appointment({
          id: "cancelled",
          startsAt: "2026-07-28T06:00:00.000Z",
          endsAt: "2026-07-28T07:00:00.000Z",
          status: "cancelled",
        }),
        appointment({ id: "next", startsAt: "2026-07-28T07:00:00.000Z", endsAt: "2026-07-28T07:30:00.000Z" }),
      ],
      { toClinicLocal: samaraLocal, todayKey: "2026-07-28" },
    );
    const day = group(groups, 0);
    // Час отменённого приёма обязан читаться как свободный, иначе от
    // администратора спрячут окно, которое можно продать.
    assert.equal(onlyRow(day, "gap").minutes, 60);
    assert.equal(day.bookedMinutes, 90);
    // И это не накладка: сажать человека на время отменённого приёма нормально.
    assert.equal(day.overlapCount, 0);
    // Сама карточка отмены с экрана не исчезает: администратор должен видеть,
    // что здесь была запись и почему её нет.
    assert.equal(day.appointmentCount, 3);
  });

  it("не считает окно после длинного приёма, который перекрывает короткий", () => {
    const groups = groupAppointmentsByClinicDay(
      [
        appointment({ id: "long", startsAt: "2026-07-28T05:00:00.000Z", endsAt: "2026-07-28T08:00:00.000Z" }),
        appointment({
          id: "short",
          startsAt: "2026-07-28T05:30:00.000Z",
          endsAt: "2026-07-28T06:00:00.000Z",
          doctorUserId: "doc-2",
          chairId: "chair-2",
        }),
        // Начинается сразу после длинного приёма: окна нет, хотя от короткого
        // до него два часа. Без учёта самого позднего конца здесь появилось бы
        // ложное «свободно 2 ч».
        appointment({ id: "after", startsAt: "2026-07-28T08:00:00.000Z", endsAt: "2026-07-28T08:30:00.000Z" }),
      ],
      { toClinicLocal: samaraLocal, todayKey: "2026-07-28" },
    );
    assert.equal(rowsOfKind(group(groups, 0), "gap").length, 0);
  });

  it("приём с испорченным временем не роняет разбор и не даёт ложных окон", () => {
    const groups = groupAppointmentsByClinicDay(
      [
        appointment({ id: "broken", startsAt: "не время", endsAt: "тоже не время" }),
        appointment({ id: "normal" }),
      ],
      { toClinicLocal: (iso) => (iso === "не время" ? "не время" : samaraLocal(iso)), todayKey: "2026-07-28" },
    );
    const total = groups.reduce((sum, item) => sum + item.appointmentCount, 0);
    assert.equal(total, 2, "испорченная запись обязана остаться видимой");
    assert.equal(
      groups.every((item) => rowsOfKind(item, "gap").length === 0),
      true,
    );
  });
});

describe("подписи для человека", () => {
  it("шаг по дням не спотыкается о конец месяца", () => {
    assert.equal(shiftDayKey("2026-07-31", 1), "2026-08-01");
    assert.equal(shiftDayKey("2026-03-01", -1), "2026-02-28");
    assert.equal(shiftDayKey("не дата", 1), "не дата");
  });

  it("день называется словами, а не числом с дефисами", () => {
    assert.equal(formatDayTitle("2026-07-28"), "вторник, 28 июля");
    assert.equal(formatDayTitle("мусор"), "мусор");
  });

  it("минуты читаются как их произносят", () => {
    assert.equal(formatMinutesForHumans(45), "45 мин");
    assert.equal(formatMinutesForHumans(60), "1 ч");
    assert.equal(formatMinutesForHumans(75), "1 ч 15 мин");
    assert.equal(formatMinutesForHumans(-5), "0 мин");
  });
});
