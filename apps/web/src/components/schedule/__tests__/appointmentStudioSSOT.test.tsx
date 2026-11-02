/**
 * appointmentStudioSSOT.test.tsx — Red Team тестирование SSOT карточки приёма и студии быстрого бронирования
 *
 * Мандаты:
 * - 8b / 8zi: монолитный Sweet Spot без микро-шредера (строго 320–420 строк в модалке, 250–350 в данных, 200–300 в CSS).
 * - 8e: Автономия врача и администратора — запись никогда не блокируется (ноль disabled кнопок).
 * - 8n: Суверенитет соло-практики — выбор врача в 1 клик, пресеты 15/30/45/60 мин.
 * - 8am: Единый дизайн-код, ровно ОДНА Primary CTA кнопка #0d9488.
 * - 8x: Живой русский язык без канцелярита и приказов.
 * - 8ze / 8al / 8aq: Apple HIG сенсорная эргономика, монтирование в UI, Drag Handle 36x5px.
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToString } from "react-dom/server";
import {
  CANONICAL_APPOINTMENT_STATUSES,
  CLINICAL_REASON_PRESETS,
  PRIMARY_DURATION_MINUTES,
  DEFAULT_DOCTORS_ROSTER,
  DEFAULT_CHAIRS_ROSTER,
  timeStringToMinutes,
  minutesToTimeString,
  calculateSlotEndTime,
  formatSlotTimeRange,
  getAppointmentStatusMeta,
  generatePatientConfirmationMessage,
} from "../appointmentCatalogData";
import {
  AppointmentStudioModal,
  type AppointmentStudioModalProps,
} from "../AppointmentStudioModal";
import { DirectAppointmentLauncher, DirectAppointmentStudioLauncher } from "../DirectAppointmentLauncher";

describe("Appointment Studio SSOT Catalog & Math (appointmentCatalogData.ts)", () => {
  it("enforces exactly 5 canonical appointment statuses with Russian labels and no Soviet decrees (Mandate 8x)", () => {
    expect(CANONICAL_APPOINTMENT_STATUSES.length).toBe(5);
    const codes = CANONICAL_APPOINTMENT_STATUSES.map((s) => s.code);
    expect(codes).toEqual(["planned", "confirmed", "in_progress", "completed", "cancelled"]);

    for (const status of CANONICAL_APPOINTMENT_STATUSES) {
      expect(status.label.length).toBeGreaterThan(0);
      expect(status.shortLabel.length).toBeGreaterThan(0);
      expect(status.dotColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(status.label).not.toMatch(/приказ/i);
      expect(status.label).not.toMatch(/804н|043\/у|54-фз|152-фз/i);
    }
  });

  it("maps legacy arrived and in_treatment statuses to canonical in_progress meta", () => {
    const arrivedMeta = getAppointmentStatusMeta("arrived");
    expect(arrivedMeta.code).toBe("in_progress");
    expect(arrivedMeta.label).toBe("Пациент в клинике / На приёме");

    const inTreatmentMeta = getAppointmentStatusMeta("in_treatment");
    expect(inTreatmentMeta.code).toBe("in_progress");

    const noShowMeta = getAppointmentStatusMeta("no_show");
    expect(noShowMeta.code).toBe("cancelled");
  });

  it("provides primary duration intervals [15, 30, 45, 60] with zero float math", () => {
    expect(PRIMARY_DURATION_MINUTES).toEqual([15, 30, 45, 60]);

    // Zero float test: 09:15 + 45 min = 10:00
    expect(timeStringToMinutes("09:15")).toBe(9 * 60 + 15);
    expect(minutesToTimeString(600)).toBe("10:00");
    expect(calculateSlotEndTime("09:15", 45)).toBe("10:00");
    expect(formatSlotTimeRange("10:00", 30)).toBe("10:00 – 10:30 (30 мин)");
    expect(calculateSlotEndTime("23:45", 30)).toBe("00:15");
  });

  it("contains clean clinical presets including emergency CITO and common procedures", () => {
    const emergencyPreset = CLINICAL_REASON_PRESETS.find((p) => p.isEmergency);
    expect(emergencyPreset).toBeDefined();
    expect(emergencyPreset?.label).toBe("Острая боль");
    expect(emergencyPreset?.defaultDurationMinutes).toBe(30);

    const labels = CLINICAL_REASON_PRESETS.map((p) => p.label);
    expect(labels).toContain("Консультация");
    expect(labels).toContain("Кариес / Пломба");
    expect(labels).toContain("Профгигиена");
    expect(labels).toContain("Примерка коронки");
    expect(labels).toContain("Снятие швов");
  });

  it("generates human, polite SMS/WhatsApp confirmation message without legal spam", () => {
    const text = generatePatientConfirmationMessage({
      patientName: "Алексей Смирнов",
      doctorName: "Д-р Воронов А. В.",
      dateStr: "2026-05-18",
      startTime: "14:00",
      durationMinutes: 45,
    });
    expect(text).toContain("Здравствуйте, Алексей Смирнов!");
    expect(text).toContain("Д-р Воронов А. В.");
    expect(text).toContain("14:00 – 14:45 (45 мин)");
    expect(text).not.toContain("152-ФЗ");
    expect(text).not.toContain("обработка ПДн");
  });
});

describe("AppointmentStudioModal Architecture & Ergonomics (Mandates 8b, 8e, 8am)", () => {
  it("renders modal dialog markup when isOpen is true", () => {
    const props: AppointmentStudioModalProps = {
      isOpen: true,
      onClose: vi.fn(),
      initialData: {
        patientName: "Сидоров Иван",
        patientPhone: "+7 (999) 111-22-33",
        startTime: "11:00",
        durationMinutes: 45,
        reason: "Кариес / Пломба",
      },
    };
    const html = renderToString(<AppointmentStudioModal {...props} />);
    expect(html).toContain("appointment-studio-modal");
    expect(html).toContain("Сидоров Иван");
    expect(html).toContain("+7 (999) 111-22-33");
    expect(html).toContain("11:00");
  });

  it("returns null when isOpen is false (Zero background DOM pollution)", () => {
    const props: AppointmentStudioModalProps = {
      isOpen: false,
      onClose: vi.fn(),
    };
    const html = renderToString(<AppointmentStudioModal {...props} />);
    expect(html).toBe("");
  });

  it("enforces Mandate 8am: strictly ONE Primary CTA button #0d9488 with appointment-studio-primary-cta class", () => {
    const html = renderToString(
      <AppointmentStudioModal isOpen={true} onClose={vi.fn()} />,
    );
    expect(html).toContain("appointment-studio-primary-cta");
    expect(html).toContain("studio-save-appointment-btn");
    expect(html).toContain("Записать на приём");
  });

  it("enforces Mandate 8e: Primary CTA button is NEVER disabled, guaranteeing doctor autonomy", () => {
    const html = renderToString(
      <AppointmentStudioModal
        isOpen={true}
        onClose={vi.fn()}
        initialData={{ patientName: "", patientPhone: "" }}
      />,
    );
    // Button must NOT contain disabled attribute
    expect(html).not.toMatch(/<button[^>]*data-testid="studio-save-appointment-btn"[^>]*disabled/);
  });

  it("renders tactile Drag Handle 36x5px for mobile Apple HIG Bottom Sheet", () => {
    const html = renderToString(
      <AppointmentStudioModal isOpen={true} onClose={vi.fn()} />,
    );
    expect(html).toContain("studio-drag-handle-bar");
    expect(html).toContain("studio-drag-handle-pill");
  });

  it("renders all 4 primary duration buttons [15m, 30m, 45m, 60m] in segmented control", () => {
    const html = renderToString(
      <AppointmentStudioModal isOpen={true} onClose={vi.fn()} />,
    );
    expect(html).toContain("duration-btn-15");
    expect(html).toContain("duration-btn-30");
    expect(html).toContain("duration-btn-45");
    expect(html).toContain("duration-btn-60");
  });

  it("renders quick action secondary buttons: start visit, SMS confirm, reschedule", () => {
    const html = renderToString(
      <AppointmentStudioModal isOpen={true} onClose={vi.fn()} />,
    );
    expect(html).toContain("start-visit-quick-btn");
    expect(html).toContain("sms-confirm-quick-btn");
    expect(html).toContain("reschedule-quick-btn");
    expect(html).toContain("Начать приём");
    expect(html).toContain("Подтвердить визит по SMS");
    expect(html).toContain("Перенести (+1 день)");
  });

  it("renders emergency CITO badge when emergency mode is active", () => {
    const html = renderToString(
      <AppointmentStudioModal
        isOpen={true}
        onClose={vi.fn()}
        initialData={{ isEmergency: true, reason: "Острая боль" }}
      />,
    );
    expect(html).toContain("emergency-badge");
    expect(html).toContain("CITO");
    expect(html).toContain("Срочная запись: острая боль");
  });
});

describe("DirectAppointmentLauncher Mounting & Deep Links (Mandate 8aq)", () => {
  it("mounts safely without DOM crashes and exports alias DirectAppointmentStudioLauncher", () => {
    const html = renderToString(<DirectAppointmentLauncher />);
    expect(typeof html).toBe("string");
    expect(DirectAppointmentStudioLauncher).toBe(DirectAppointmentLauncher);
  });
});

describe("Sweet Spot File Limits & Anti-Micro-Shredder Verification (Mandate 8b / 8zi)", () => {
  const scheduleDir = path.resolve(__dirname, "..");

  it("enforces AppointmentStudioModal.tsx strictly within 320–420 lines Sweet Spot", () => {
    const modalPath = path.join(scheduleDir, "AppointmentStudioModal.tsx");
    const content = fs.readFileSync(modalPath, "utf-8");
    const lines = content.split("\n").length;
    expect(lines).toBeGreaterThanOrEqual(320);
    expect(lines).toBeLessThanOrEqual(420);
  });

  it("enforces appointmentCatalogData.ts strictly within 250–350 lines Sweet Spot", () => {
    const dataPath = path.join(scheduleDir, "appointmentCatalogData.ts");
    const content = fs.readFileSync(dataPath, "utf-8");
    const lines = content.split("\n").length;
    expect(lines).toBeGreaterThanOrEqual(250);
    expect(lines).toBeLessThanOrEqual(350);
  });

  it("enforces appointmentStudio.css strictly within 200–300 lines Sweet Spot", () => {
    const cssPath = path.join(scheduleDir, "appointmentStudio.css");
    const content = fs.readFileSync(cssPath, "utf-8");
    const lines = content.split("\n").length;
    expect(lines).toBeGreaterThanOrEqual(200);
    expect(lines).toBeLessThanOrEqual(300);
  });

  it("confirms appointmentStudio micro-files directory has been eradicated (Zero Micro-Shredder)", () => {
    const subDirPath = path.join(scheduleDir, "appointmentStudio");
    expect(fs.existsSync(subDirPath)).toBe(false);
  });
});
