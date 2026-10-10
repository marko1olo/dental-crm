import assert from "node:assert";
import { describe, test } from "node:test";

import * as Facade from "../AppHelpers.js";
import * as AppointmentHelpers from "../appHelpers/appointmentHelpers.js";
import * as ClinicProfileHelpers from "../appHelpers/clinicProfileHelpers.js";
import * as DocumentHelpers from "../appHelpers/documentHelpers.js";
import * as FinancialHelpers from "../appHelpers/financialHelpers.js";
import * as ImagingHelpers from "../appHelpers/imagingHelpers.js";
import * as ImagingMprHelpers from "../appHelpers/imagingMprHelpers.js";
import * as PersistenceHelpers from "../appHelpers/persistenceHelpers.js";
import * as PreferenceHelpers from "../appHelpers/preferenceHelpers.js";
import * as SpeechHelpers from "../appHelpers/speechHelpers.js";
import * as TelephonyHelpers from "../appHelpers/telephonyHelpers.js";
import * as UiFormatters from "../appHelpers/uiFormatters.js";
import * as BrowserScanUtils from "../utils/browserScanUtils.js";

describe("AppHelpers Decomposition: Module Identity & Export Parity", () => {
	test("facade re-exports exact references from all domain modules", () => {
		// Appointments
		assert.strictEqual(Facade.toothRows, AppointmentHelpers.toothRows);
		assert.strictEqual(Facade.toothStateByCode, AppointmentHelpers.toothStateByCode);

		// Clinic Profile
		assert.strictEqual(
			Facade.clinicalToothSurfaceAliases,
			ClinicProfileHelpers.clinicalToothSurfaceAliases,
		);
		assert.strictEqual(
			Facade.normalizedDentalSpecialty,
			ClinicProfileHelpers.normalizedDentalSpecialty,
		);

		// Documents
		assert.strictEqual(
			Facade.documentPayloadDraftStorageKey,
			DocumentHelpers.documentPayloadDraftStorageKey,
		);
		assert.strictEqual(
			Facade.compactDocumentText,
			DocumentHelpers.compactDocumentText,
		);
		assert.strictEqual(
			Facade.documentTextLines,
			DocumentHelpers.documentTextLines,
		);

		// Financial
		assert.strictEqual(
			Facade.documentPaymentSelectionStorageKey,
			FinancialHelpers.documentPaymentSelectionStorageKey,
		);
		assert.strictEqual(
			Facade.emptyDocumentPaymentSelectionStore,
			FinancialHelpers.emptyDocumentPaymentSelectionStore,
		);

		// Imaging
		assert.strictEqual(
			Facade.viewerWindowPresetForStudy,
			ImagingHelpers.viewerWindowPresetForStudy,
		);
		assert.strictEqual(
			Facade.imagingViewerLocalStoragePrefix,
			ImagingHelpers.imagingViewerLocalStoragePrefix,
		);
		assert.strictEqual(
			Facade.dicomWorkbenchLocalStorageKey,
			ImagingHelpers.dicomWorkbenchLocalStorageKey,
		);

		// Imaging MPR
		assert.strictEqual(
			Facade.isMprProjection,
			ImagingMprHelpers.isMprProjection,
		);
		assert.strictEqual(
			Facade.isMprWindowPreset,
			ImagingMprHelpers.isMprWindowPreset,
		);
		assert.strictEqual(
			Facade.normalizeMprWorkbenchState,
			ImagingMprHelpers.normalizeMprWorkbenchState,
		);

		// Persistence
		assert.strictEqual(
			Facade.pendingVisitSaveQueueLocalKey,
			PersistenceHelpers.pendingVisitSaveQueueLocalKey,
		);
		assert.strictEqual(
			Facade.parsePendingVisitSaveQueue,
			PersistenceHelpers.parsePendingVisitSaveQueue,
		);
		assert.strictEqual(
			Facade.normalizePendingVisitSave,
			PersistenceHelpers.normalizePendingVisitSave,
		);

		// Preferences
		assert.strictEqual(
			Facade.uiPreferencesServerPath,
			PreferenceHelpers.uiPreferencesServerPath,
		);
		assert.strictEqual(
			Facade.onboardingStorageKey,
			PreferenceHelpers.onboardingStorageKey,
		);

		// Speech
		assert.strictEqual(
			Facade.speechGatewayCanUpload,
			SpeechHelpers.speechGatewayCanUpload,
		);
		assert.strictEqual(
			Facade.speechAudioQueueRetentionMs,
			SpeechHelpers.speechAudioQueueRetentionMs,
		);
		assert.strictEqual(
			Facade.assertSpeechChunkDbStores,
			SpeechHelpers.assertSpeechChunkDbStores,
		);

		// Telephony
		assert.strictEqual(
			Facade.telegramBlockedReasonLabels,
			TelephonyHelpers.telegramBlockedReasonLabels,
		);
		assert.strictEqual(
			Facade.telegramHumanMessage,
			TelephonyHelpers.telegramHumanMessage,
		);
		assert.strictEqual(
			Facade.telegramQrSvgToDataUrl,
			TelephonyHelpers.telegramQrSvgToDataUrl,
		);

		// UI Formatters
		assert.strictEqual(
			Facade.denteAdminSecretHeaderName,
			UiFormatters.denteAdminSecretHeaderName,
		);
		assert.strictEqual(
			Facade.browserGeneratedId,
			UiFormatters.browserGeneratedId,
		);
		assert.strictEqual(
			Facade.money,
			UiFormatters.money,
		);
		assert.strictEqual(
			Facade.countLabel,
			UiFormatters.countLabel,
		);

		// BrowserScanUtils (re-exported via barrel)
		assert.strictEqual(
			Facade.classifyBrowserImagingFileName,
			BrowserScanUtils.classifyBrowserImagingFileName,
		);
		assert.strictEqual(
			Facade.localImagingFolderFingerprint,
			BrowserScanUtils.localImagingFolderFingerprint,
		);
	});
});

describe("AppHelpers Decomposition: Functional Domain Tests", () => {
	test("AppointmentHelpers: toothRows has correct dental arch partitions", () => {
		assert.strictEqual(Facade.toothRows.length, 2);
		assert.strictEqual(Facade.toothRows[0].length, 16);
		assert.strictEqual(Facade.toothRows[1].length, 16);
		assert.strictEqual(Facade.toothRows[0][0], "18");
		assert.strictEqual(Facade.toothRows[1][15], "38");
	});

	test("ClinicProfileHelpers: normalizedDentalSpecialty maps known aliases", () => {
		assert.strictEqual(Facade.normalizedDentalSpecialty("therapy"), "therapist");
		assert.strictEqual(ClinicProfileHelpers.normalizedDentalSpecialty("therapy"), "therapist");
	});

	test("DocumentHelpers: compactDocumentText compacts variadic strings with newlines", () => {
		const result = Facade.compactDocumentText("  Alpha  ", "", null, "Beta  ", undefined, "Gamma");
		assert.strictEqual(result, "Alpha\nBeta\nGamma");
	});

	test("DocumentHelpers: documentTextLines splits and trims content", () => {
		const lines = Facade.documentTextLines("one\r\n  two  \n\nthree\n");
		assert.deepStrictEqual(lines, ["one", "two", "three"]);
	});

	test("FinancialHelpers: emptyDocumentPaymentSelectionStore returns initial structure", () => {
		const emptyStore = Facade.emptyDocumentPaymentSelectionStore();
		assert.strictEqual(emptyStore.version, 1);
		assert.deepStrictEqual(emptyStore.selections, {});
	});

	test("ImagingHelpers: viewerWindowPresetForStudy selects correct default presets", () => {
		assert.strictEqual(Facade.viewerWindowPresetForStudy("cbct"), "bone");
		assert.strictEqual(Facade.viewerWindowPresetForStudy("photo"), "photo");
		assert.strictEqual(Facade.viewerWindowPresetForStudy("bitewing"), "caries");
		assert.strictEqual(Facade.viewerWindowPresetForStudy("opg"), "perio");
		assert.strictEqual(Facade.viewerWindowPresetForStudy(null), "endo");
	});

	test("ImagingMprHelpers: isMprProjection validates MPR projection types", () => {
		assert.strictEqual(Facade.isMprProjection("axial"), true);
		assert.strictEqual(Facade.isMprProjection("coronal"), true);
		assert.strictEqual(Facade.isMprProjection("sagittal"), true);
		assert.strictEqual(Facade.isMprProjection("unknown_projection"), false);
		assert.strictEqual(Facade.isMprProjection(null), false);
	});

	test("PersistenceHelpers: parsePendingVisitSaveQueue safely handles edge cases", () => {
		assert.deepStrictEqual(Facade.parsePendingVisitSaveQueue(null, "org-1"), []);
		assert.deepStrictEqual(Facade.parsePendingVisitSaveQueue("", "org-1"), []);
		assert.deepStrictEqual(Facade.parsePendingVisitSaveQueue("invalid-json", "org-1"), []);
		assert.deepStrictEqual(Facade.parsePendingVisitSaveQueue("[]", "org-1"), []);
	});

	test("TelephonyHelpers: telegramHumanMessage resolves known warning labels", () => {
		assert.strictEqual(
			Facade.telegramHumanMessage("missing_clinic_review_url"),
			"Не настроена ссылка клиники для отзывов.",
		);
		assert.strictEqual(
			Facade.telegramHumanMessage("telegram_bot_disabled"),
			"Telegram выключен в настройках клиники.",
		);
	});

	test("UiFormatters: browserGeneratedId creates prefix-namespaced unique identifiers", () => {
		const id = Facade.browserGeneratedId("doc");
		assert.ok(id.startsWith("doc-"));
		assert.ok(id.length > 10);
		assert.strictEqual(Facade.denteAdminSecretHeaderName, "x-dente-admin-secret");
	});
});
