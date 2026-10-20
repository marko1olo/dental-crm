import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	buildAppLogicCompatibilityBag,
	type BuildAppLogicCompatibilityBagParams,
} from "../hooks/appLogic/appLogicModules/compatibility/appLogicCompatibilityBag";
import {
	buildCbctStudioPopoutUrl,
	detectAppRuntimeKind,
	isDesktopRuntime,
	isWebRuntime,
	matchRuntimeRoute,
	normalizeRouteToken,
	parseCbctStudioRoute,
	setMockAppRuntimeKind,
} from "../utils/runtimeRouter";

test("runtimeRouter and appLogicCompatibilityBag Decomposition Compliance Suite", async (t) => {
	await t.test("1. File limits and whitelist compliance", () => {
		const root = process.cwd();
		const whitelistPath = path.join(root, "scripts/file_limits_whitelist.json");
		const whitelist = JSON.parse(fs.readFileSync(whitelistPath, "utf-8"));

		assert.equal(
			whitelist["apps/web/src/utils/runtimeRouter.ts"],
			undefined,
			"runtimeRouter.ts must be excluded from whitelist",
		);
		assert.equal(
			whitelist["apps/web/src/hooks/appLogic/appLogicModules/appLogicCompatibilityBag.ts"],
			undefined,
			"appLogicCompatibilityBag.ts must not be in whitelist",
		);

		const routerFacadeLines = fs
			.readFileSync(path.join(root, "apps/web/src/utils/runtimeRouter.ts"), "utf-8")
			.split("\n").length;
		assert.ok(
			routerFacadeLines <= 250,
			`runtimeRouter.ts facade lines (${routerFacadeLines}) must be <= 250`,
		);

		const bagFacadeLines = fs
			.readFileSync(
				path.join(
					root,
					"apps/web/src/hooks/appLogic/appLogicModules/appLogicCompatibilityBag.ts",
				),
				"utf-8",
			)
			.split("\n").length;
		assert.ok(
			bagFacadeLines <= 250,
			`appLogicCompatibilityBag.ts facade lines (${bagFacadeLines}) must be <= 250`,
		);

		const bagModuleLines = fs
			.readFileSync(
				path.join(
					root,
					"apps/web/src/hooks/appLogic/appLogicModules/compatibility/appLogicCompatibilityBag.ts",
				),
				"utf-8",
			)
			.split("\n").length;
		assert.ok(
			bagModuleLines <= 250,
			`compatibility/appLogicCompatibilityBag.ts lines (${bagModuleLines}) must be <= 250`,
		);

		const bridgeModuleLines = fs
			.readFileSync(
				path.join(
					root,
					"apps/web/src/hooks/appLogic/appLogicModules/compatibility/appLogicLegacyBridge.ts",
				),
				"utf-8",
			)
			.split("\n").length;
		assert.ok(
			bridgeModuleLines <= 500,
			`appLogicLegacyBridge.ts lines (${bridgeModuleLines}) must be <= 500`,
		);
	});

	await t.test("2. runtimeRouter facade functionality", () => {
		assert.equal(normalizeRouteToken("emk"), "visit");
		assert.equal(normalizeRouteToken("sanpin"), "scanner");

		const match = matchRuntimeRoute("#patients?id=123");
		assert.equal(match.route, "patients");
		assert.equal(match.queryParams.id, "123");

		const popoutUrl = buildCbctStudioPopoutUrl({
			studyId: "study-123",
			patientId: "patient-456",
			patientName: "Иванов И.И.",
		});
		assert.ok(popoutUrl.includes("studyId=study-123"));

		const parsed = parseCbctStudioRoute(popoutUrl);
		assert.equal(parsed.isCbctStudio, true);
		assert.equal(parsed.studyId, "study-123");
		assert.equal(parsed.patientId, "patient-456");

		setMockAppRuntimeKind("web_browser");
		assert.equal(detectAppRuntimeKind(), "web_browser");
		assert.equal(isWebRuntime(), true);
		assert.equal(isDesktopRuntime(), false);
		setMockAppRuntimeKind(null);
	});

	await t.test("3. buildAppLogicCompatibilityBag contract hydration", () => {
		const mockParams: BuildAppLogicCompatibilityBagParams = {
			appStore: {
				dashboard: { clinicSettings: { profile: { clinicName: "Dente Test" } } },
				setDashboard: () => {},
				clinicProfileDraft: null,
			},
			settingsStore: {},
			imagingStore: {},
			soundNotifications: {
				muted: false,
				setMuted: () => {},
				testOnlineBookingSound: () => {},
				testSlotEndSound: () => {},
			},
			auth: {
				denteClinicalMutationHeaders: {},
				denteClinicalReadHeaders: {},
			},
			navigationState: {
				currentView: "schedule",
				setCurrentView: () => {},
				settingsTab: "general",
				setSettingsTab: () => {},
			},
			patientSelection: {
				selectedPatientId: "p1",
				setSelectedPatientId: () => {},
				patient: {
					documentPatient: {
						id: "p1",
						fullName: "Тестов Тест Тестович",
						administrativeProfile: { taxpayerInn: "123456789012" },
					},
				},
			},
			scheduleLogic: {
				activeDoctor: null,
				activeAppointment: null,
			},
			clinicalSession: {
				visitNoteForm: {},
			},
			billingModal: {
				activePayments: [],
				activeTreatmentPlanItems: [],
			},
			modalController: {
				onboardingDismissed: true,
				onboardingStep: 0,
			},
			offlineSync: {
				isOnline: true,
			},
			settingsAndIntegrations: {
				saveClinicProfileIfDirty: async () => {},
				visibleImagingStudies: [],
				dicomWorkbenchModule: { selectedImagingStudy: null },
			},
			staffSettingsLogic: {},
			migrationQueries: {},
			imagingQueries: {},
			communicationsQueries: {},
			emergencyTriage: {},
			navigationSync: {},
			loadDashboard: async () => {},
			browserDirectoryInputRef: { current: null },
			browserMigrationInputRef: { current: null },
			refreshSpeechRuntimeRef: { current: null },
			paymentMutationIdRef: { current: null },
			recentPatientViewsVersion: 1,
		};

		const bag = buildAppLogicCompatibilityBag(mockParams);
		assert.ok(bag !== null && typeof bag === "object");
		assert.equal(bag.clinicName, "Dente Test");
		assert.equal(bag.firstName, "Тест");
		assert.equal(bag.lastName, "Тестов");
		assert.equal(bag.middleName, "Тестович");
		assert.equal(bag.inn, "123456789012");
		assert.equal(bag.patientId, "p1");
		assert.equal(typeof bag.assembleSpeechRecording, "function");
		assert.equal(bag.browserCanRequestPersistentStorage, false);
	});
});
