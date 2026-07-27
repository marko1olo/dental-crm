import assert from "node:assert";
import { setPatientArchiveStatusInDb, isPatientBookingBlocked } from "../apps/api/src/db/patientArchiveReasonsAndBlacklistsQuery.ts";
import { createAppointmentInDb } from "../apps/api/src/db/appointmentsQuery.ts";

async function runBlacklistSmoke() {
  console.log("=== RUNNING BLACKLIST BOOKING ENFORCEMENT SMOKE ===");
  const testOrgId = "00000000-0000-0000-0000-000000000001";
  const testPatientId = "00000000-0000-0000-0000-000000000099";
  const testPatientName = "Тестовый Черноспособный Пациент";

  // 1. Blacklist patient
  await setPatientArchiveStatusInDb(testOrgId, testPatientId, true, testPatientName);

  // 2. Verify isPatientBookingBlocked returns true
  const isBlocked = await isPatientBookingBlocked(testOrgId, testPatientId);
  assert.strictEqual(isBlocked, true, "Patient should be marked as booking blocked");

  // 3. Attempt appointment creation, expect exception
  let threw = false;
  try {
    await createAppointmentInDb(testOrgId, {
      patientId: testPatientId,
      doctorUserId: "00000000-0000-0000-0000-000000000002",
      chairId: "00000000-0000-0000-0000-000000000003",
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      endsAt: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      status: "planned"
    });
  } catch (err) {
    threw = true;
    assert.ok(err.message.includes("черный список") || err.message.includes("Запись заблокирована"), `Unexpected error: ${err.message}`);
  }

  assert.strictEqual(threw, true, "createAppointmentInDb MUST throw an exception for blacklisted patient");

  // 4. Remove from blacklist & verify booking succeeds or doesn't fail on blacklist check
  await setPatientArchiveStatusInDb(testOrgId, testPatientId, false, testPatientName);
  const isBlockedAfter = await isPatientBookingBlocked(testOrgId, testPatientId);
  assert.strictEqual(isBlockedAfter, false, "Patient should no longer be marked as booking blocked");

  console.log("✅ BLACKLIST BOOKING ENFORCEMENT SMOKE PASSED SUCCESSFUL!");
}

runBlacklistSmoke().catch((err) => {
  console.error("❌ BLACKLIST SMOKE FAILED:", err);
  process.exit(1);
});
