import { test } from "vitest";
import assert from "node:assert/strict";
import {
  detectRecommendedProtocol,
  findSmartNextStageSlot,
  formatDateIso,
  formatRuDate,
  SMART_CLINICAL_PROTOCOLS,
  type SmartClinicalProtocolKey,
} from "../smartSequentialVisitsEngine";
import type { Appointment } from "@dental/shared";

test("SMART PROTOCOLS: Definition and Intervals", () => {
  const endo = SMART_CLINICAL_PROTOCOLS.endo_stage_2;
  assert.equal(endo.defaultIntervalDays, 10);
  assert.equal(endo.durationMinutes, 45);
  assert.deepEqual(endo.allowedIntervalDaysRange, [7, 14]);

  const suture = SMART_CLINICAL_PROTOCOLS.suture_removal;
  assert.equal(suture.defaultIntervalDays, 10);
  assert.equal(suture.durationMinutes, 15);

  const ortho = SMART_CLINICAL_PROTOCOLS.ortho_activation;
  assert.equal(ortho.defaultIntervalDays, 21);
  assert.equal(ortho.durationMinutes, 30);

  const implant = SMART_CLINICAL_PROTOCOLS.implant_prosthetics;
  assert.equal(implant.defaultIntervalDays, 90);
  assert.equal(implant.durationMinutes, 45);

  const control = SMART_CLINICAL_PROTOCOLS.general_control;
  assert.equal(control.defaultIntervalDays, 7);
  assert.equal(control.durationMinutes, 15);
});

test("SMART PROTOCOLS: Automatic protocol detection by clinical diagnosis and reason", () => {
  // 1. Эндодонтия
  assert.equal(
    detectRecommendedProtocol({ diagnosisMkb10: "K04.0", reason: "Острый пульпит" }),
    "endo_stage_2",
  );
  assert.equal(
    detectRecommendedProtocol({ diagnosisMkb10: "K04.5", reason: "Хронический периодонтит, мех. обработка каналов" }),
    "endo_stage_2",
  );
  assert.equal(
    detectRecommendedProtocol({ reason: "Эндодонтическое лечение зуба 16, этап 1" }),
    "endo_stage_2",
  );

  // 2. Ортодонтия
  assert.equal(
    detectRecommendedProtocol({ diagnosisMkb10: "K07.2", reason: "Аномалии прикуса, брекеты Damon" }),
    "ortho_activation",
  );
  assert.equal(
    detectRecommendedProtocol({ reason: "Плановая замена дуги верхней челюсти" }),
    "ortho_activation",
  );

  // 3. Хирургия: снятие швов
  assert.equal(
    detectRecommendedProtocol({ diagnosisMkb10: "K01.1", reason: "Сложное удаление ретинированного зуба 38" }),
    "suture_removal",
  );
  assert.equal(
    detectRecommendedProtocol({ reason: "Установка дентального имплантата Osstem 36" }),
    "suture_removal",
  );

  // 4. Имплантация -> ортопедический этап (3 мес)
  assert.equal(
    detectRecommendedProtocol({ reason: "Имплантация, приживление 3 мес", clinicalStage: "2 этап" }),
    "implant_prosthetics",
  );

  // 5. Контрольный осмотр (fallback)
  assert.equal(
    detectRecommendedProtocol({ diagnosisMkb10: "K02.1", reason: "Лечение кариеса дентина" }),
    "general_control",
  );
});

test("SMART PROTOCOLS: O(1) Quantum slot calculation without collisions", () => {
  const baseDate = "2026-08-01T10:00:00.000Z";
  const protocol = SMART_CLINICAL_PROTOCOLS.endo_stage_2; // 10 days, 45 min

  const result = findSmartNextStageSlot({
    baseDate,
    preferredTime: "10:00",
    protocol,
    existingAppointments: [],
    chairId: "chair-1",
    doctorUserId: "doctor-1",
  });

  // 2026-08-01 + 10 дней = 2026-08-11
  assert.equal(result.targetDate, "2026-08-11");
  assert.equal(result.startTime, "10:00");
  assert.equal(result.endTime, "10:45");
  assert.equal(result.isAlternativeTime, false);
  assert.equal(result.intervalDaysUsed, 10);
  assert.equal(result.startsAtIso, "2026-08-11T10:00:00.000Z");
  assert.equal(result.endsAtIso, "2026-08-11T10:45:00.000Z");
});

test("SMART PROTOCOLS: Quantum slot shifts forward when preferred slot is occupied", () => {
  const baseDate = "2026-08-01T10:00:00.000Z";
  const protocol = SMART_CLINICAL_PROTOCOLS.suture_removal; // 10 days, 15 min
  const chairId = "chair-alpha";
  const doctorUserId = "doc-alpha";

  // Добавим конфликтующую запись на 10:00 на 2026-08-11
  const busyAppointment: Appointment = {
    id: "busy-1",
    organizationId: "org-test",
    chairId,
    doctorUserId,
    patientId: "pat-other",
    startsAt: "2026-08-11T10:00:00.000Z",
    endsAt: "2026-08-11T10:30:00.000Z",
    status: "confirmed",
    reason: "Другой пациент",
    comment: "Другой пациент",
  };

  const result = findSmartNextStageSlot({
    baseDate,
    preferredTime: "10:00",
    protocol,
    existingAppointments: [busyAppointment],
    chairId,
    doctorUserId,
  });

  assert.equal(result.targetDate, "2026-08-11");
  // Слот на 10:00 занят (10:00-10:30), поэтому квантовый движок смещается на 10:30
  assert.equal(result.startTime, "10:30");
  assert.equal(result.endTime, "10:45");
  assert.equal(result.isAlternativeTime, true);
});

test("SMART PROTOCOLS: Formatting helpers (formatDateIso, formatRuDate)", () => {
  const d = new Date(2026, 7, 15); // 15 августа 2026
  assert.equal(formatDateIso(d), "2026-08-15");

  const ru = formatRuDate("2026-08-15");
  assert.ok(ru.includes("15") && ru.includes("авг"));
});

test("SMART PROTOCOLS: Sunday skipping automatically selects alternative working day", () => {
  // 2026-08-02 - воскресенье. +7 дней = 2026-08-09 (тоже воскресенье)
  const baseDate = "2026-08-02T10:00:00.000Z";
  const protocol = SMART_CLINICAL_PROTOCOLS.general_control; // 7 days, 15 min, range [5, 14]

  const result = findSmartNextStageSlot({
    baseDate,
    preferredTime: "10:00",
    protocol,
    existingAppointments: [],
    chairId: "chair-1",
    doctorUserId: "doctor-1",
  });

  // Воскресенье 2026-08-09 должно быть пропущено, выбран понедельник 2026-08-10 (delta = +1)
  assert.notEqual(result.targetDate, "2026-08-09");
  assert.equal(result.targetDate, "2026-08-10");
  assert.equal(result.isAlternativeTime, true);
});

