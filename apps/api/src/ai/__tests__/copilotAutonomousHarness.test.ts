/**
 * copilotAutonomousHarness.test.ts — Comprehensive Test Suite for DENTE AI Copilot & Workstation Harness.
 *
 * Mandates:
 * - Mandate 8e: Doctor autonomy, non-blocking buttons, confirmation guards for destructive mutations.
 * - Mandate 8n: Solo-doctor scale sovereignty (no forced assistants in scheduling).
 * - Mandate 8x: Pure clinical Russian language (no regulatory bureaucratic slang like 043/u, 804n, 54-FZ).
 * - Mandate 8z / 8af: Real contracts, zero mocks in production, deterministic key isolation in tests.
 * - Mandate 8t: Suite completes strictly in <= 10 seconds.
 */

import assert from "node:assert/strict";
import test from "node:test";
import { KeyPoolManager, maskApiKey, maskKeysInText } from "../router/keyPoolManager.js";
import { AgentRouterAllKeysExhaustedError } from "../router/routerTypes.js";
import { ToolDispatcher } from "../harness/toolDispatcher.js";
import type { DentalToolContext } from "../dentalTools.js";
import type { AgentRouterToolCall } from "../agentRouterClient.js";
import { handleUpdateToothStatus } from "../dentalTools/databaseModules/updateToothStatusTool.js";
import { handleCreateAppointment } from "../dentalTools/databaseModules/createAppointmentTool.js";
import { handleGenerateClinicalProtocol } from "../dentalTools/calculatorModules/clinicalProtocolTool.js";
import { executeDentalTool } from "../dentalTools.js";

const TEST_ORG_ID = "00000000-0000-0000-0000-000000000001";
const TEST_PATIENT_ID = "00000000-0000-0000-0000-000000000002";
const TEST_DOCTOR_ID = "00000000-0000-0000-0000-000000000003";

test("1. KeyPoolManager: Round-Robin Rotation, 429 Cooldown & Secret Key Masking", async (t) => {
	await t.test("1.1 Masking prevents secret leakage in logs and messages", () => {
		const rawKey = "AIzaSyD-SecretKeyGoogleGemini1234567890";
		const masked = maskApiKey(rawKey);
		assert.equal(masked.startsWith("agentrouter..."), true);
		assert.ok(!masked.includes("SecretKeyGoogleGemini"));
		assert.equal(masked.endsWith("7890"), true);

		const textWithSecrets = "Failed call with key sk-1234567890abcdef and groq gsk_123456789012345678";
		const sanitized = maskKeysInText(textWithSecrets);
		assert.ok(!sanitized.includes("sk-1234567890abcdef"));
		assert.ok(!sanitized.includes("gsk_123456789012345678"));
		assert.ok(sanitized.includes("sk-***cdef"));
		assert.ok(sanitized.includes("gsk_***5678"));
	});

	await t.test("1.2 Round-Robin selects keys in deterministic sequence", () => {
		const keys = ["key-alpha", "key-beta", "key-gamma"];
		const pool = new KeyPoolManager(keys);

		const sel1 = pool.selectNextKey();
		assert.equal(sel1.key, "key-alpha");
		assert.equal(sel1.isFallback, false);

		const sel2 = pool.selectNextKey();
		assert.equal(sel2.key, "key-beta");

		const sel3 = pool.selectNextKey();
		assert.equal(sel3.key, "key-gamma");

		// Wraps back around
		const sel4 = pool.selectNextKey();
		assert.equal(sel4.key, "key-alpha");
	});

	await t.test("1.3 429 Rate Limit places failing key on cooldown and routes to next active key", () => {
		const keys = ["key-rate-limited", "key-backup"];
		const pool = new KeyPoolManager(keys);

		// Place first key on 60-second cooldown
		pool.noteKeyFailure("key-rate-limited", 60_000, "HTTP 429 Too Many Requests");

		const nextSel = pool.selectNextKey();
		assert.equal(nextSel.key, "key-backup", "Must immediately route to healthy backup key");
		assert.equal(nextSel.isFallback, false);

		const snapshot = pool.getKeyHealthSnapshot();
		const failedEntry = snapshot.find((k) => k.keyMask.endsWith("mited"));
		assert.ok(failedEntry, "Must track failed key in health snapshot");
		assert.equal(failedEntry.isAvailable, false);
		assert.equal(failedEntry.failures, 1);
	});

	await t.test("1.4 Exhausted pool throws AgentRouterAllKeysExhaustedError when all keys are on long cooldown", () => {
		const keys = ["key-one", "key-two"];
		const pool = new KeyPoolManager(keys);

		pool.noteKeyFailure("key-one", 120_000, "429 Quota Exceeded");
		pool.noteKeyFailure("key-two", 120_000, "429 Quota Exceeded");

		assert.throws(() => pool.selectNextKey(), (err: unknown) => {
			assert.ok(err instanceof AgentRouterAllKeysExhaustedError);
			assert.ok(err.availableInMs > 3000);
			return true;
		});
	});

	await t.test("1.5 noteKeySuccess resets failure count and clears cooldown", () => {
		const keys = ["key-recovered"];
		const pool = new KeyPoolManager(keys);

		pool.noteKeyFailure("key-recovered", 10_000, "Transient error");
		let snap = pool.getKeyHealthSnapshot();
		assert.equal(snap[0]?.isAvailable, false);

		pool.noteKeySuccess("key-recovered");
		snap = pool.getKeyHealthSnapshot();
		assert.equal(snap[0]?.isAvailable, true);
		assert.equal(snap[0]?.failures, 0);
	});
});

test("2. Tri-Environment Trust Levels: Cautious, Supervised & Autonomous Gates", async (t) => {
	const baseContext: DentalToolContext = {
		organizationId: TEST_ORG_ID,
		patientId: TEST_PATIENT_ID,
		doctorId: TEST_DOCTOR_ID,
		runtimeMode: "web_browser",
		allowLocalExecution: false,
	};

	const toothCall: AgentRouterToolCall = {
		id: "call-tooth-1",
		type: "function",
		function: {
			name: "update_tooth_status",
			arguments: JSON.stringify({
				toothNumber: 36,
				state: "caries",
				surfaces: ["O"],
			}),
		},
	};

	const searchCall: AgentRouterToolCall = {
		id: "call-search-1",
		type: "function",
		function: {
			name: "search_clinic_services_and_prices",
			arguments: JSON.stringify({
				query: "кариес",
			}),
		},
	};

	await t.test("2.1 Cautious Mode (confirm_all): Blocks even read tools for doctor approval", async () => {
		const events: string[] = [];
		const dispatcher = new ToolDispatcher(
			baseContext,
			true,
			(e) => {
				events.push(e.type);
			},
			"confirm_all",
		);

		const result = await dispatcher.dispatchToolCall(searchCall);
		assert.equal(result.isConfirmationRequired, true);
		assert.equal(
			(result.result as { status?: string })?.status,
			"confirmation_required",
		);
		assert.ok(events.includes("confirmation_required"));
	});

	await t.test("2.2 Supervised Mode (balanced - Recommended Default): Auto-executes read, guards destructive", async () => {
		const events: string[] = [];
		const dispatcher = new ToolDispatcher(
			baseContext,
			false, // requireConfirmationForDestructive default
			(e) => {
				events.push(e.type);
			},
			"balanced",
		);

		// Read tool executes without blocking
		const readRes = await dispatcher.dispatchToolCall(searchCall);
		assert.equal(readRes.isConfirmationRequired, false);

		// Destructive tool triggers 2-Phase Confirmation Guard
		const writeRes = await dispatcher.dispatchToolCall(toothCall);
		assert.equal(writeRes.isConfirmationRequired, true);
		assert.equal(
			(writeRes.result as { status?: string })?.status,
			"confirmation_required",
		);
		assert.ok(events.includes("confirmation_required"));
	});

	await t.test("2.3 Autonomous Mode: Dispatches destructive tools directly with live audit events", async () => {
		const events: string[] = [];
		const dispatcher = new ToolDispatcher(
			baseContext,
			false,
			(e) => {
				events.push(e.type);
			},
			"autonomous",
		);

		const result = await dispatcher.dispatchToolCall(toothCall);
		assert.equal(result.isConfirmationRequired, false, "Must not pause for manual confirmation in autonomous mode");
		assert.ok(events.includes("tool_start"));
		assert.ok(events.includes("tool_end"));
	});
});

test("3. Clinical Tool Arsenal: Pure Clinical Language, FDI Validation & No Forced Assistants", async (t) => {
	const context: DentalToolContext = {
		organizationId: TEST_ORG_ID,
		patientId: TEST_PATIENT_ID,
		doctorId: TEST_DOCTOR_ID,
		runtimeMode: "web_browser",
		requireConfirmation: true,
	};

	await t.test("3.1 update_tooth_status: Validates FDI 11-48/51-85 and enforces 2-Phase Guard on confirmation=false", async () => {
		// 1. Guard check: confirmed=false
		const guardRes = await handleUpdateToothStatus(
			{
				toothNumber: 46,
				state: "pulpitis",
				confirmed: false,
			},
			context,
		);
		assert.equal(guardRes.success, false);
		assert.equal(guardRes.status, "confirmation_required");
		assert.ok(guardRes.message.includes("Требуется подтверждение врача"));

		// 2. Invalid tooth number check: FDI range violation
		await assert.rejects(
			async () => {
				await handleUpdateToothStatus(
					{
						toothNumber: 99,
						state: "caries",
						confirmed: true,
					},
					context,
				);
			},
			/Недопустимый номер зуба 99/,
		);
	});

	await t.test("3.2 create_appointment: Supports solo-doctor booking without mandatory assistants (Mandate 8n)", async () => {
		const guardRes = await handleCreateAppointment(
			{
				patientId: TEST_PATIENT_ID,
				doctorId: TEST_DOCTOR_ID,
				startTime: "2026-11-15T09:00:00.000Z",
				durationMinutes: 45,
				serviceTitle: "Первичный терапевтический приём",
				confirmed: false, // Guard barrier test
			},
			context,
		);

		assert.equal(guardRes.success, false);
		assert.equal(guardRes.status, "confirmation_required");
		assert.equal(guardRes.durationMinutes, 45);
		assert.ok(guardRes.message.includes("Требуется подтверждение записи"));
	});

	await t.test("3.3 generate_clinical_protocol: Synthesizes SOAP protocol with clean medical terminology (Mandate 8x)", async () => {
		const protocolRes = await handleGenerateClinicalProtocol(
			{
				toothNumber: 36,
				diagnosisMkb: "K02.1",
				anestheticTradeName: "Ультракаин Д-С 1:200 000",
				anestheticVolumeMl: 1.7,
				anesthesiaTechnique: "infiltration",
				fillingMaterial: "Estelite Asteria A2",
				useCofferdam: true,
			},
			context,
		);

		assert.equal(protocolRes.toothNumber, 36);
		assert.equal(protocolRes.diagnosisMkb, "K02.1");
		assert.ok(protocolRes.treatmentProtocol.includes("Обезболивание: инфильтрационная анестезия"));
		assert.ok(protocolRes.treatmentProtocol.includes("коффердама (раббердама)"));
		assert.ok(protocolRes.treatmentProtocol.includes("Estelite Asteria A2"));

		// Pure Clinical Language check (Mandate 8x): NO bureaucratic regulatory slang
		assert.ok(!protocolRes.fullForm043Text.includes("Приказ 804н"));
		assert.ok(!protocolRes.fullForm043Text.includes("форма 043/у советского образца"));
		assert.ok(protocolRes.fullForm043Text.includes("Медицинская карта приёма стоматологического пациента / Протокол приёма SOAP"));
	});
});

test("4. Dual-Runtime Isolation: Web Browser vs Desktop Workstation Safety Barrier", async (t) => {
	const webContext: DentalToolContext = {
		organizationId: TEST_ORG_ID,
		runtimeMode: "web_browser",
		allowLocalExecution: false,
	};

	await t.test("4.1 Web mode safely refuses desktop_native workstation OS tools", async () => {
		const result = (await executeDentalTool(
			"launch_workstation_app",
			{ appName: "romexis" },
			webContext,
		)) as { success: boolean; error: string; code: string };

		assert.equal(result.success, false);
		assert.equal(result.code, "DESKTOP_DENIED");
		assert.ok(result.error.includes("локальной станции") || result.error.includes("DENTE Desktop"));
	});

	await t.test("4.2 Web mode cleanly executes browser-supported CRM search tools", async () => {
		const result = (await executeDentalTool(
			"search_clinic_services_and_prices",
			{ codeOrName: "A16.07.002", category: "all" },
			webContext,
		)) as { found: boolean; results: unknown[] };

		assert.strictEqual(result.found, true);
		assert.ok(Array.isArray(result.results));
	});
});
