import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
	calibrateClockSkew,
	getAdjustedNowIso,
	getAdjustedNowMs,
	getGlobalClockSkew,
	mergeFieldLevelCrdt,
	resetGlobalClockSkew,
} from "@dental/shared";
import { enqueueOfflineMutation } from "../../index";
import { setupStressTestEnv } from "./testEnvironment";

describe("STRESS 12: Client Clock Skew Calibration & CMOS Battery Drift", () => {
	let env: ReturnType<typeof setupStressTestEnv>;
	beforeEach(() => { env = setupStressTestEnv(); });
	afterEach(() => { env.cleanup(); });

	test("Calibrate against server timestamp and ensure adjusted LWW win", async () => {
		resetGlobalClockSkew();
		assert.strictEqual(getGlobalClockSkew(), 0);

		const nowLocalMs = Date.now();
		const expectedSkewMs = 2 * 60 * 60 * 1000;
		const simulatedServerIso = new Date(nowLocalMs + expectedSkewMs).toISOString();

		const calculatedSkew = calibrateClockSkew(simulatedServerIso, nowLocalMs);
		assert.strictEqual(calculatedSkew, expectedSkewMs);
		assert.strictEqual(getAdjustedNowMs(nowLocalMs), nowLocalMs + expectedSkewMs);

		const mut = await enqueueOfflineMutation({
			entityType: "DIARY_043_DRAFT",
			entityId: "visit-clock-skew-1",
			payload: { anamnesis: "Пульпит 24", diagnosisIcd10: "K04.0" },
			organizationId: "org-clock-skew-test",
		});
		assert.ok(mut.timestampMs >= nowLocalMs + expectedSkewMs - 1000);

		const olderServerTimestamp = new Date(nowLocalMs + 1.5 * 60 * 60 * 1000).toISOString();
		const serverEntity = { id: "visit-clock-skew-1", anamnesis: "Старая (11:30)", diagnosisIcd10: "K02.1" };
		const serverVector = {
			anamnesis: { updatedAt: olderServerTimestamp, version: 1 },
			diagnosisIcd10: { updatedAt: olderServerTimestamp, version: 1 },
		};

		const crdtResult = mergeFieldLevelCrdt<{ id: string; anamnesis: string; diagnosisIcd10: string }>({
			entityKind: "visit_diary",
			entityId: "visit-clock-skew-1",
			serverEntity,
			serverVector,
			clientPatch: mut.payload as Record<string, unknown>,
			clientUpdatedAt: mut.timestamp,
			clientVector: {
				anamnesis: { updatedAt: mut.timestamp, version: 1 },
				diagnosisIcd10: { updatedAt: mut.timestamp, version: 1 },
			},
		});

		assert.strictEqual(crdtResult.mergedEntity.anamnesis, "Пульпит 24");
		assert.strictEqual(crdtResult.mergedEntity.diagnosisIcd10, "K04.0");
	});
});
