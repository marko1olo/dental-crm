import { SterilizationWatchdogService } from "./SterilizationWatchdogService.js";
import { SterilizationCycleRecord } from "./AutoclaveSterilizationService.js";
import { strict as assert } from "node:assert";
import { test } from "node:test";

const createMockRecord = (id: string, expiresAt: Date): SterilizationCycleRecord => ({
    barcode: `STER-1-20260816-${id}`,
    organizationId: "org-1",
    deviceName: "autoclave-1",
    cycleNumber: 1,
    mode: "steam_134",
    targetTemperatureC: 134,
    targetPressureBar: 2.1,
    exposureDurationMinutes: 5,
    operatorId: "nurse-1",
    packagingType: "craft_pouch_sealed",
    trayId: id,
    trayDescription: "Mock Tray",
    indicatorClass: "class_5_integrator",
    indicatorPassed: true,
    bowieDickPassed: true,
    vacuumLeakTestPassed: true,
    sterilizedAt: new Date("2026-08-01"),
    expiresAt,
    isValid: true,
    validationErrors: []
});

test("SterilizationWatchdogService - Classification", () => {
    const now = new Date("2026-08-16");
    const records: SterilizationCycleRecord[] = [
        createMockRecord("sterile-tray", new Date("2026-08-20")),
        createMockRecord("expiring-tray", new Date("2026-08-18")),
        createMockRecord("expired-tray", new Date("2026-08-15")),
    ];

    const statuses = SterilizationWatchdogService.monitorInventory(records, now);
    
    assert.equal(statuses.find(s => s.trayId === "sterile-tray")?.status, "sterile");
    assert.equal(statuses.find(s => s.trayId === "expiring-tray")?.status, "expiring_soon");
    assert.equal(statuses.find(s => s.trayId === "expired-tray")?.status, "expired");
});

test("SterilizationWatchdogService - Quarantine List", () => {
    const now = new Date("2026-08-16");
    const records: SterilizationCycleRecord[] = [
        createMockRecord("sterile-tray", new Date("2026-08-20")),
        createMockRecord("expired-tray", new Date("2026-08-15")),
    ];

    const quarantine = SterilizationWatchdogService.getQuarantineList(records, now);
    assert.equal(quarantine.length, 1);
    assert.equal(quarantine[0]!.trayId, "expired-tray");
});
