import { describe, expect, it } from "vitest";
import {
	aiJobKindLabels,
	browserGeneratedId,
	createLocalDicomWorkbenchDraft,
	createLocalQueueId,
	importSourceLabels,
	ingestionTargetLabels,
	isBooleanPreference,
	isBoundedPreferenceString,
	isLocalDicomDownloadPath,
	isNullableString,
	isOptionValue,
	isRecordKey,
	isStringUnionValue,
	newerDicomWorkbenchDraft,
	normalizedPaymentRefundCorrectionAction,
	normalizedPaymentRefundCorrectionMethod,
	normalizedXrayPregnancyStatus,
	normalizedXrayPriority,
	normalizedXrayStudyType,
	normalizePersistenceHealth,
	normalizeTelegramBotUsernameDraft,
	normalizeTelegramPublicHttpsUrlDraft,
	redactedLocalDicomDownloadPath,
	smartImportModeLabels,
	uniqueDicomDownloadWarnings,
} from "../index";
import * as facade from "../../imagingDraftHelpers";

describe("imagingDraft module decomposition", () => {
	describe("Layer 0 Constants", () => {
		it("provides valid labels and options", () => {
			expect(smartImportModeLabels.auto.title).toBe("Авто");
			expect(importSourceLabels.csv_text.title).toBe("Таблица / Excel");
			expect(ingestionTargetLabels.smart_import).toBe("Умный импорт");
			expect(aiJobKindLabels.voice_transcription).toBe("диктовка врача");
		});
	});

	describe("Layer 1 Annotation Transformers", () => {
		it("generates browser IDs with correct prefix", () => {
			const id = browserGeneratedId("test");
			expect(id.startsWith("test-")).toBe(true);
		});

		it("creates non-empty local queue id", () => {
			const qId = createLocalQueueId();
			expect(typeof qId).toBe("string");
			expect(qId.length).toBeGreaterThan(0);
		});

		it("detects local DICOM paths", () => {
			expect(isLocalDicomDownloadPath("C:\\Dicom\\study01")).toBe(true);
			expect(isLocalDicomDownloadPath("/storage/dicom/study01")).toBe(true);
			expect(isLocalDicomDownloadPath("https://cloud.com/dicom")).toBe(false);
			expect(isLocalDicomDownloadPath("")).toBe(false);
		});

		it("redacts local DICOM download path safely", () => {
			const redacted = redactedLocalDicomDownloadPath("C:\\Dicom\\patient1");
			expect(redacted?.startsWith("redacted-local-dicom-path:")).toBe(true);
			expect(redactedLocalDicomDownloadPath(null)).toBeNull();
		});

		it("deduplicates download warnings", () => {
			const warnings = [" Warning 1 ", "Warning 1", "Warning 2", ""];
			expect(uniqueDicomDownloadWarnings(warnings)).toEqual([
				"Warning 1",
				"Warning 2",
			]);
		});

		it("normalizes persistence health object", () => {
			const raw = {
				persistence: {
					enabled: true,
					filePath: "/data/state.json",
					exists: true,
					version: 1,
					backupCount: 3,
				},
			};
			const normalized = normalizePersistenceHealth(raw);
			expect(normalized?.enabled).toBe(true);
			expect(normalized?.filePath).toBe("/data/state.json");
			expect(normalized?.backupCount).toBe(3);
			expect(normalizePersistenceHealth(null)).toBeNull();
		});

		it("validates Telegram bot username drafts", () => {
			expect(normalizeTelegramBotUsernameDraft("bot", "@my_clinic_bot")).toBe(
				"my_clinic_bot",
			);
			expect(normalizeTelegramBotUsernameDraft("bot", "")).toBeNull();
			expect(() =>
				normalizeTelegramBotUsernameDraft("bot", "invalid-bot-name"),
			).toThrow();
		});

		it("validates Telegram public URLs without sensitive data", () => {
			const validUrl = "https://example.com/clinic/info";
			expect(normalizeTelegramPublicHttpsUrlDraft("url", validUrl)).toBe(
				"https://example.com/clinic/info",
			);
			expect(() =>
				normalizeTelegramPublicHttpsUrlDraft("url", "http://insecure.com"),
			).toThrow();
			expect(() =>
				normalizeTelegramPublicHttpsUrlDraft(
					"url",
					"https://example.com/patient/123",
				),
			).toThrow();
		});
	});

	describe("Layer 2 Validation Engine", () => {
		it("validates record keys and string unions", () => {
			const dict = { alpha: 1, beta: 2 };
			expect(isRecordKey("alpha", dict)).toBe(true);
			expect(isRecordKey("gamma", dict)).toBe(false);

			const options = [{ value: "first" }, { value: "second" }];
			expect(isOptionValue("first", options)).toBe(true);
			expect(isOptionValue("third", options)).toBe(false);

			expect(isStringUnionValue("a", ["a", "b"])).toBe(true);
			expect(isStringUnionValue("c", ["a", "b"])).toBe(false);
		});

		it("validates preferences and bounds", () => {
			expect(isBooleanPreference(true)).toBe(true);
			expect(isBooleanPreference(null)).toBe(false);

			expect(isBoundedPreferenceString("short")).toBe(true);
			expect(isBoundedPreferenceString("a".repeat(501))).toBe(false);

			expect(isNullableString(null)).toBe(true);
			expect(isNullableString("text")).toBe(true);
			expect(isNullableString(123)).toBe(false);
		});

		it("normalizes clinical and financial options", () => {
			expect(normalizedXrayStudyType("cbct")).toBe("cbct");
			expect(normalizedXrayStudyType("invalid")).toBe("cbct");

			expect(normalizedXrayPriority("urgent")).toBe("urgent");
			expect(normalizedXrayPriority("unknown")).toBe("routine");

			expect(normalizedXrayPregnancyStatus("confirmed")).toBe("confirmed");
			expect(normalizedXrayPregnancyStatus("invalid")).toBe("unknown");

			expect(normalizedPaymentRefundCorrectionAction("full_refund")).toBe(
				"full_refund",
			);
			expect(normalizedPaymentRefundCorrectionAction("unknown")).toBe(
				"partial_refund",
			);

			expect(normalizedPaymentRefundCorrectionMethod("cash")).toBe("cash");
			expect(normalizedPaymentRefundCorrectionMethod("unknown")).toBe("card");
		});
	});

	describe("Layer 2 Sync Coordinator", () => {
		it("resolves newer DICOM drafts correctly", () => {
			const oldDraft = {
				manifest: {
					version: "dental-crm-dicom-workbench-v1" as const,
					studyInstanceUid: "study-1",
					seriesInstanceUid: "series-1",
					seriesDescription: "test",
					modality: "CT",
					instances: [],
				} as any,
				seriesKey: "key-1",
				clientSavedAt: "2026-01-01T00:00:00Z",
			};
			const newDraft = {
				...oldDraft,
				clientSavedAt: "2026-01-02T00:00:00Z",
			};

			expect(newerDicomWorkbenchDraft(oldDraft, newDraft)).toBe(newDraft);
			expect(newerDicomWorkbenchDraft(newDraft, oldDraft)).toBe(newDraft);
			expect(newerDicomWorkbenchDraft(oldDraft, null)).toBe(oldDraft);
			expect(newerDicomWorkbenchDraft(null, newDraft)).toBe(newDraft);
		});

		it("creates local DICOM workbench draft with series key", () => {
			const manifest = {
				version: "dental-crm-dicom-workbench-v1" as const,
				toolStateBundle: {
					seriesRef: {
						seriesInstanceUid: "series-456",
						firstFilePath: "/path/1.dcm",
						sourceName: "study1",
					},
				},
				launchManifest: {
					seriesInstanceUid: "series-456",
				},
			} as any;
			const draft = createLocalDicomWorkbenchDraft(
				manifest,
				"2026-03-01T12:00:00Z",
			);
			expect(draft.manifest).toBe(manifest);
			expect(draft.clientSavedAt).toBe("2026-03-01T12:00:00Z");
			expect(draft.seriesKey).toBe("series-456");
		});
	});

	describe("Layer 5 Master Facade", () => {
		it("facade exports identical symbols from index", () => {
			expect(facade.browserGeneratedId).toBe(browserGeneratedId);
			expect(facade.smartImportModeLabels).toBe(smartImportModeLabels);
			expect(facade.normalizedXrayStudyType).toBe(normalizedXrayStudyType);
			expect(facade.createLocalDicomWorkbenchDraft).toBe(
				createLocalDicomWorkbenchDraft,
			);
		});
	});
});
