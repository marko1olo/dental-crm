import { describe, it } from "node:test";
import assert from "node:assert";
import { buildDenteTelegramMessagePreviewData, type TelegramMessageContext } from "../sampleData.js";
import type { DenteTelegramTemplateKind } from "@dental/shared";

describe("buildDenteTelegramMessagePreviewData", () => {
  const baseWarning = "base warning";

  it("should render appointment_reminder correctly", () => {
    const context: TelegramMessageContext = {
      clinicName: "MyClinic",
      appointmentTime: "tomorrow 10 AM",
      hasAppointment: true,
      portalUrl: "http://portal",
      reviewUrl: null,
      mapsUrl: null,
    };

    const preview = buildDenteTelegramMessagePreviewData("appointment_reminder", context, baseWarning);

    assert.strictEqual(preview.templateKind, "appointment_reminder");
    assert.ok(preview.text.includes("MyClinic tomorrow 10 AM"));
    assert.deepStrictEqual(preview.variablesUsed, ["clinicName", "appointmentTime"]);
  });

  it("should render appointment_confirmation correctly", () => {
    const context: TelegramMessageContext = {
      clinicName: "MyClinic",
      hasAppointment: false,
      portalUrl: null,
      reviewUrl: null,
      mapsUrl: null,
    };

    const preview = buildDenteTelegramMessagePreviewData("appointment_confirmation", context, baseWarning);

    assert.strictEqual(preview.templateKind, "appointment_confirmation");
    assert.ok(preview.text.includes("напоминание о записи от MyClinic"));
    assert.deepStrictEqual(preview.variablesUsed, ["clinicName"]);
  });

  it("should render staff_daily_digest correctly", () => {
    const context: TelegramMessageContext = {
      clinicName: "MyClinic",
      hasAppointment: false,
      portalUrl: null,
      reviewUrl: null,
      mapsUrl: null,
      staffRoleLabel: "администратор",
      appointmentCount: 5,
      openTaskCount: 3,
      urgentTaskCount: 1,
    };

    const preview = buildDenteTelegramMessagePreviewData("staff_daily_digest", context, baseWarning);

    assert.strictEqual(preview.templateKind, "staff_daily_digest");
    assert.ok(preview.text.includes('роли "администратор"'));
    assert.ok(preview.text.includes('приемов 5'));
    assert.ok(preview.text.includes('задач 3'));
    assert.ok(preview.text.includes('срочных 1'));
    assert.deepStrictEqual(preview.variablesUsed, ["staffRole", "appointmentCount", "openTaskCount", "urgentTaskCount"]);
  });

  it("should format missing portal gracefully for payment_reminder_notice", () => {
    const context: TelegramMessageContext = {
      clinicName: "MyClinic",
      hasAppointment: false,
      portalUrl: null,
      reviewUrl: null,
      mapsUrl: null,
    };

    const preview = buildDenteTelegramMessagePreviewData("payment_reminder_notice", context, baseWarning);
    assert.strictEqual(preview.text, "DENTE: у клиники есть вопрос по оплате. Свяжитесь с MyClinic.");
    assert.deepStrictEqual(preview.variablesUsed, ["clinicName"]);
  });
});
