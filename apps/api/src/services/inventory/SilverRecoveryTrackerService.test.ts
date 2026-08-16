import { describe, it } from "node:test";
import assert from "node:assert";
import { SilverRecoveryTrackerService } from "./SilverRecoveryTrackerService.js";

describe("SilverRecoveryTrackerService", () => {
    it("should validate amalgam separator retention rate", () => {
        const record = {
            id: "1",
            organizationId: "org-1",
            lastMaintenanceDate: new Date(),
            installationDate: new Date(),
            mercuryRetentionRate: 90,
            isFunctional: true,
        };
        const result = SilverRecoveryTrackerService.validateSeparator(record);
        assert.strictEqual(result.isValid, false);
        assert.ok(result.errors.includes("Норма задержки ртути должна быть не менее 95%."));
    });

    it("should calculate correct silver content", () => {
        const record = {
            id: "1",
            organizationId: "org-1",
            volumeLiters: 10,
            silverContentGramsPerLiter: 4,
            collectionDate: new Date(),
            isDispatchedForRecovery: false,
        };
        const silver = SilverRecoveryTrackerService.calculateSilverContent(record);
        assert.strictEqual(silver, 40);
    });

    it("should generate manifest correctly", () => {
        const fixerRecords = [{
            id: "f1",
            organizationId: "org-1",
            volumeLiters: 5,
            silverContentGramsPerLiter: 4,
            collectionDate: new Date(),
            isDispatchedForRecovery: false,
        }];
        const manifest = SilverRecoveryTrackerService.generateRecoveryManifest(
            "org-1",
            fixerRecords,
            2,
            "Refinery Corp",
            "Ivanov I.I."
        );
        assert.strictEqual(manifest.totalSilverRecoveredGrams, 20);
        assert.strictEqual(manifest.amalgamContainersCount, 2);
        assert.deepStrictEqual(manifest.recordsProcessedIds, ["f1"]);
    });
});
