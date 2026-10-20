import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createTenantTestApp } from "../support/tenantTestApp.js";
import { registerAppointmentsRoutes } from "../../routes/appointments.js";
import { appointments as inMemoryAppointments } from "../../sampleData.js";
import {
  organizationId as ORG_ID,
  doctorUserId as DOCTOR_ID,
  chairId as CHAIR_ID,
  marinaPatientId as PATIENT_ID,
} from "../../sampleData/fixtureIds.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { TOKEN_SECRET } from "../../routes/auth.js";

const ADMIN_SECRET = "dente-admin-secret-test-pass";

describe("Appointment Next Stage Sequential Visits", () => {
  test("creates next-stage appointment with inherited clinical fields", async () => {
    process.env.DENTAL_STATE_PERSISTENCE = "off";
    process.env.DENTE_SCHEDULE_ADMIN_SECRET = ADMIN_SECRET;

    const app = createTenantTestApp();
    await registerAppointmentsRoutes(app);

    const token = signToken({ organizationId: ORG_ID, userId: DOCTOR_ID }, TOKEN_SECRET());

    const parentId = "00000000-0000-4000-8000-000000000005";
    inMemoryAppointments.push({
      id: parentId,
      organizationId: ORG_ID,
      patientId: PATIENT_ID,
      doctorUserId: DOCTOR_ID,
      chairId: CHAIR_ID,
      status: "completed",
      startsAt: "2026-08-10T10:00:00.000Z",
      endsAt: "2026-08-10T11:00:00.000Z",
      reason: "Эндодонтия: этап 1 (мех. обработка каналов)",
      stageIndex: 1,
      clinicalStage: "Этап 1: Экстирпация пульпы",
      toothNumber: 16,
      diagnosisMkb10: "K04.0",
    } as any);

    const payload = {
      clinicalStage: "Этап 2: Обтурация корневых каналов",
      intervalDays: 10,
      durationMinutes: 45,
      startsAt: "2026-08-20T10:00:00.000Z",
      endsAt: "2026-08-20T10:45:00.000Z",
    };

    const response = await app.inject({
      method: "POST",
      url: `/api/appointments/${parentId}/next-stage`,
      headers: {
        "x-dente-clinic-token": token,
        "x-dente-admin-secret": ADMIN_SECRET,
        "x-organization-id": ORG_ID,
        "x-user-id": DOCTOR_ID,
        "x-user-role": "doctor",
      },
      payload,
    });

    assert.equal(response.statusCode, 201, `Failed with ${response.body}`);
    const body = JSON.parse(response.body);
    assert.equal(body.success, true);
    assert.ok(body.appointment);

    const nextAppt = body.appointment;
    assert.equal(nextAppt.parentAppointmentId, parentId);
    assert.equal(nextAppt.stageIndex, 2);
    assert.equal(nextAppt.toothNumber, 16);
    assert.equal(nextAppt.diagnosisMkb10, "K04.0");
    assert.equal(nextAppt.patientId, PATIENT_ID);
    assert.equal(nextAppt.doctorUserId, DOCTOR_ID);
    assert.equal(nextAppt.chairId, CHAIR_ID);
    assert.equal(nextAppt.clinicalStage, "Этап 2: Обтурация корневых каналов");
  });

  test("returns 404 if parent appointment does not exist", async () => {
    process.env.DENTAL_STATE_PERSISTENCE = "off";
    process.env.DENTE_SCHEDULE_ADMIN_SECRET = ADMIN_SECRET;

    const app = createTenantTestApp();
    await registerAppointmentsRoutes(app);

    const token = signToken({ organizationId: ORG_ID, userId: DOCTOR_ID }, TOKEN_SECRET());

    const response = await app.inject({
      method: "POST",
      url: "/api/appointments/00000000-0000-4000-8000-000000000999/next-stage",
      headers: {
        "x-dente-clinic-token": token,
        "x-dente-admin-secret": ADMIN_SECRET,
        "x-organization-id": ORG_ID,
        "x-user-id": DOCTOR_ID,
        "x-user-role": "doctor",
      },
      payload: {},
    });

    assert.equal(response.statusCode, 404);
  });
});
