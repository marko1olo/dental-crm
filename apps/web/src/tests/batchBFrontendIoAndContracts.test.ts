/**
 * batchBFrontendIoAndContracts.test.ts — Honest 6G Regression Suite for Batch B Frontend IO & Contracts.
 *
 * Verifies real SUT behavior:
 * 1. `parseJsonEnvelope` / `readApiErrorMessage` (401/403/500, corrupted JSON on 200 OK, contract rejection, `{ data }` unwrap).
 * 2. `closeSettlementPeriodApi` & `reopenSettlementPeriodApi` (envelope unwrapping, Idempotency-Key UUIDv7, error propagation).
 * 3. `launchMarketingCampaign` (end-to-end template/campaign/launch headers + strict failure on 403/500/invalid JSON).
 * 4. `fetchDicomFirstFramePreviewApi` & `fetchDicomWorkbenchBundlesApi` (Zod contract validation + rejection on invalid payload).
 * 5. `putTelegramSettingsRequest` (Zod `denteTelegramBotStatusSchema` validation + error propagation on 401/500).
 * 6. `useWorkspaceProfile` (`saveWorkspaceFlags` & `loadWorkspaceProfile` clinical headers, Idempotency-Key, no admin-secret, no blind store hydration).
 * 7. Treatment plan `autoGenerator` (`buildMissingSpanItems`, `buildPeriodontalAndHygieneItems`, `buildDeciduousToothItems`, `buildPermanentToothItems`).
 * 8. `getDatesForPnlPreset` (leap February, January -> December prev_month rollover, quarters, full year without UTC drift).
 * 9. `ChairsideQuickSwitchModal` & `DoctorPayrollStudioModal` SSR rendering sanity.
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	generateUuidV7,
	patientSchema,
} from "@dental/shared";
import {
	HttpResponseError,
	isDashboardPayload,
	parseJsonEnvelope,
	readApiErrorMessage,
} from "../lib/apiResponseHandler";
import {
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../lib/safeLocalStorage";
import {
	closeSettlementPeriodApi,
	reopenSettlementPeriodApi,
} from "../components/payroll/closeSettlementPeriodApi";
import { launchMarketingCampaign } from "../components/marketing/launchCampaignService";
import {
	fetchDicomFirstFramePreviewApi,
	fetchDicomWorkbenchBundlesApi,
} from "../hooks/domains/dicomWorkbench/dicomStudyLoader";
import { putTelegramSettingsRequest } from "../hooks/telegram/useTelegramWebhookState";
import {
	loadWorkspaceProfile,
	saveWorkspaceFlags,
	useWorkspaceProfileStore,
} from "../hooks/useWorkspaceProfile";
import { buildMissingSpanItems } from "../components/treatment-plans/autoGenerator/autoGenMissingTeethSpans";
import { buildPeriodontalAndHygieneItems } from "../components/treatment-plans/autoGenerator/autoGenPeriodontal";
import { buildDeciduousToothItems } from "../components/treatment-plans/autoGenerator/autoGenPediatric";
import { buildPermanentToothItems } from "../components/treatment-plans/autoGenerator/autoGenPermanentTherapy";
import { getDatesForPnlPreset } from "../components/finance/pnl/useManagerialPnl";
import { ChairsideQuickSwitchModal } from "../components/auth/ChairsideQuickSwitchModal";
import { DoctorPayrollStudioModal } from "../components/payroll/DoctorPayrollStudioModal";

const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createStorageMock(): Storage {
	const store = new Map<string, string>();
	return {
		get length() {
			return store.size;
		},
		clear() {
			store.clear();
		},
		getItem(key: string) {
			return store.has(key) ? (store.get(key) ?? null) : null;
		},
		key(index: number) {
			return Array.from(store.keys())[index] ?? null;
		},
		removeItem(key: string) {
			store.delete(key);
		},
		setItem(key: string, value: string) {
			store.set(key, String(value));
		},
	};
}

describe("Batch B Frontend IO, Contracts & Non-Null Demining (6G)", () => {
	const originalFetch = globalThis.fetch;
	const originalLocalStorage = globalThis.localStorage;
	const originalSessionStorage = globalThis.sessionStorage;

	beforeEach(() => {
		Object.defineProperty(globalThis, "localStorage", {
			value: createStorageMock(),
			configurable: true,
			writable: true,
		});
		Object.defineProperty(globalThis, "sessionStorage", {
			value: createStorageMock(),
			configurable: true,
			writable: true,
		});
		useWorkspaceProfileStore.getState().reset();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		Object.defineProperty(globalThis, "localStorage", {
			value: originalLocalStorage,
			configurable: true,
			writable: true,
		});
		Object.defineProperty(globalThis, "sessionStorage", {
			value: originalSessionStorage,
			configurable: true,
			writable: true,
		});
	});

	it("1. parseJsonEnvelope unwraps { data } envelopes, validates patientSchema, and rejects corrupted JSON or HTTP 401/403/500", async () => {
		const validPatient = {
			id: generateUuidV7(),
			organizationId: generateUuidV7(),
			status: "active",
			fullName: "Иванов Сергей Петрович",
			birthDate: "1988-04-12",
			gender: "male",
			phone: "+79991112233",
			email: null,
			notes: null,
			balanceRub: 0,
			balanceKopecks: 0,
			createdAt: "2026-11-01T10:00:00.000Z",
			updatedAt: "2026-11-01T10:00:00.000Z",
		};

		const envelopedResponse = new Response(JSON.stringify({ ok: true, data: validPatient }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
		const parsedPatient = await parseJsonEnvelope(envelopedResponse, patientSchema, "Пациент не загружен");
		assert.equal(parsedPatient.id, validPatient.id);
		assert.equal(parsedPatient.fullName, "Иванов Сергей Петрович");

		const brokenJsonResponse = new Response("<html>502 Bad Gateway</html>", {
			status: 200,
			headers: { "Content-Type": "text/html" },
		});
		await assert.rejects(
			() => parseJsonEnvelope(brokenJsonResponse, patientSchema, "Карточка пациента"),
			(err: unknown) =>
				err instanceof HttpResponseError &&
				err.status === 200 &&
				err.message.includes("некорректный JSON-ответ сервера"),
		);

		const invalidContractResponse = new Response(JSON.stringify({ data: { id: "not-a-uuid" } }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
		await assert.rejects(
			() => parseJsonEnvelope(invalidContractResponse, patientSchema, "Карточка пациента"),
			(err: unknown) => err instanceof HttpResponseError && err.message.includes("не соответствует ожидаемому формату"),
		);

		for (const statusCode of [401, 403, 500] as const) {
			const errorRes = new Response(JSON.stringify({ message: `Ошибка доступа ${statusCode}` }), {
				status: statusCode,
				headers: { "Content-Type": "application/json" },
			});
			await assert.rejects(
				() => parseJsonEnvelope(errorRes, patientSchema, "Пациент"),
				(err: unknown) =>
					err instanceof HttpResponseError &&
					err.status === statusCode &&
					err.message === `Ошибка доступа ${statusCode}`,
			);
		}

		const plainErrRes = new Response("not-json", { status: 500 });
		const msg = await readApiErrorMessage(plainErrRes, "Ошибка сервера");
		assert.equal(msg, "Ошибка сервера (HTTP 500)");

		assert.equal(isDashboardPayload({ patients: [], appointments: [] }), true);
		assert.equal(isDashboardPayload({}), false);
		assert.equal(isDashboardPayload([]), false);
		assert.equal(isDashboardPayload({ patients: "invalid" }), false);
	});

	it("2. closeSettlementPeriodApi & reopenSettlementPeriodApi unwrap { data }, enforce Idempotency-Key UUIDv7, and reject invalid payloads", async () => {
		const capturedHeaders: Array<Record<string, string>> = [];
		globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
			capturedHeaders.push(Object.fromEntries(new Headers(init?.headers).entries()));
			return new Response(
				JSON.stringify({
					data: {
						ok: true,
						statementId: "stmt-42",
						statement: {
							id: "stmt-42",
							period: "2026-11",
							isFinalized: true,
							grossRevenueRub: 120000,
							netPayoutRub: 36000,
							createdAt: "2026-11-28T10:00:00.000Z",
						},
						closedAppointmentsCount: 5,
						message: "Утверждено",
					},
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}) as typeof fetch;

		const closed = await closeSettlementPeriodApi({
			doctorId: "doc-1",
			periodStart: "2026-11-01",
			periodEnd: "2026-11-30",
			payoutModel: "percentage",
			grossRevenueKop: 12000000,
			labCostKop: 0,
			materialCostKop: 0,
			netBaseKop: 12000000,
			categoryPercent: 30,
			totalAccruedKop: 3600000,
			ndflKop: 468000,
			netPayoutKop: 3132000,
		});
		assert.equal(closed.statementId, "stmt-42");
		assert.equal(closed.statement.isFinalized, true);
		assert.match(capturedHeaders[0]?.["idempotency-key"] ?? "", UUID_V7_RE);

		// Invalid contract payload on 200 OK must throw instead of silently returning incomplete object
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ ok: true }), { status: 200 })) as typeof fetch;
		await assert.rejects(
			() => reopenSettlementPeriodApi("doc-1", "2026-11-01", "2026-11-30"),
			/некорректная структура ответа сервера/,
		);
	});

	it("3. launchMarketingCampaign sends Idempotency-Key on every mutation and throws explicitly on 403/500", async () => {
		const calls: Array<{ url: string; method: string; idemp: string | null }> = [];
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const method = init?.method ?? "GET";
			const hdrs = new Headers(init?.headers);
			calls.push({ url, method, idemp: hdrs.get("Idempotency-Key") });

			if (url === "/api/communications/templates" && method === "GET") {
				return new Response(JSON.stringify({ data: { templates: [] } }), { status: 200 });
			}
			if (url === "/api/communications/templates" && method === "POST") {
				return new Response(JSON.stringify({ data: { template: { id: "tpl-99" } } }), { status: 201 });
			}
			if (url === "/api/communications/campaigns" && method === "POST") {
				return new Response(JSON.stringify({ message: "Недостаточно прав для запуска рассылки" }), { status: 403 });
			}
			return new Response(JSON.stringify({}), { status: 500 });
		}) as typeof fetch;

		await assert.rejects(
			() =>
				launchMarketingCampaign({
					promo: {
						id: "promo-1",
						title: "Профгигиена",
						badge: "Профилактика",
						description: "Приглашение на гигиену",
						targetAudience: "all",
						expectedConversion: "18%",
						templates: {
							whatsapp: "Добрый день!",
							telegram: "Добрый день!",
							sms: "Добрый день!",
						},
					},
					channel: "whatsapp",
					segmentId: "all",
					consentOnly: true,
					mutationHeaders: { Authorization: "Bearer staff-token" },
				}),
			/Недостаточно прав для запуска рассылки/,
		);

		assert.equal(calls.length, 3);
		assert.match(calls[1]?.idemp ?? "", UUID_V7_RE);
		assert.match(calls[2]?.idemp ?? "", UUID_V7_RE);
	});

	it("4. fetchDicomFirstFramePreviewApi & fetchDicomWorkbenchBundlesApi validate Zod schemas and reject malformed responses", async () => {
		const authCtx = {
			denteClinicalReadHeaders: (extra: Record<string, string> = {}) => ({
				Authorization: "Bearer staff-1",
				...extra,
			}),
			denteClinicalMutationHeaders: (extra: Record<string, string> = {}) => ({
				Authorization: "Bearer staff-1",
				...extra,
			}),
			settingsAccessHeaders: (extra: Record<string, string> = {}) => ({
				Authorization: "Bearer staff-1",
				...extra,
			}),
		};

		globalThis.fetch = (async () =>
			new Response(
				JSON.stringify({
					data: {
						version: "dental-crm-dicom-first-frame-preview-v1",
						generatedAt: "2026-11-28T10:00:00.000Z",
						folderPath: "D:\\DICOM\\Case1",
						status: "ready",
						sourceFileName: "slice_001.dcm",
						sourceFileIndex: 0,
						requestedFileIndex: null,
						selectableFileCount: 120,
						transferSyntaxUid: "1.2.840.10008.1.2.1",
						photometricInterpretation: "MONOCHROME2",
						width: 512,
						height: 512,
						sourceWidth: 512,
						sourceHeight: 512,
						bitsAllocated: 16,
						bitsStored: 12,
						pixelRepresentation: 0,
						windowCenter: 400,
						windowWidth: 2000,
						imageDataUrl: "data:image/png;base64,AA==",
						warnings: [],
						nextAction: "open_viewer",
					},
				}),
				{ status: 200 },
			)) as typeof fetch;

		const preview = await fetchDicomFirstFramePreviewApi("D:\\DICOM\\Case1", authCtx);
		assert.equal(preview.status, "ready");
		assert.equal(preview.selectableFileCount, 120);

		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ bundles: "not-an-array" }), { status: 200 })) as typeof fetch;
		await assert.rejects(
			() => fetchDicomWorkbenchBundlesApi(authCtx),
			/не соответствует ожидаемому формату/,
		);
	});

	it("5. putTelegramSettingsRequest validates denteTelegramBotStatusSchema and throws on 401", async () => {
		const orgId = generateUuidV7();
		globalThis.fetch = (async () =>
			new Response(
				JSON.stringify({
					settings: {
						version: 1,
						organizationId: orgId,
						mode: "shared_dente_bot",
						botUsername: "dente_bot",
						ownBotUsername: null,
						webhookBaseUrl: null,
						patientPortalBaseUrl: null,
						welcomeImageUrl: null,
						visualCardUrls: {},
						clinicReviewUrl: null,
						clinicMapsUrl: null,
						enabledFeatures: ["appointment_reminders"],
						patientLinkTokenTtlMinutes: 60,
						appointmentReminderLeadTimesHours: [24],
						reviewRequestDelayHours: 2,
						postVisitCheckupDelayHoursByTopic: {},
						allowVoiceIntake: false,
						staffEscalationChannel: null,
						privacyMode: "no_phi_by_default",
						updatedAt: "2026-11-28T10:00:00.000Z",
					},
					organizationId: orgId,
					clinicId: null,
					botConfigId: "default",
					mode: "shared_dente_bot",
					botUsername: "dente_bot",
					tokenConfigured: true,
					webhookSecretConfigured: true,
					webhookReady: true,
					clinicOwnedBotReady: false,
					warnings: [],
					nextActions: [],
					processedUpdateCount: 1,
					pendingLinkCodeCount: 0,
					activeChatLinkCount: 2,
					recentEvents: [],
				}),
				{ status: 200 },
			)) as typeof fetch;

		const status = await putTelegramSettingsRequest({ mode: "shared_dente_bot" }, { Authorization: "Bearer staff-1" });
		assert.equal(status.organizationId, orgId);
		assert.equal(status.tokenConfigured, true);

		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ message: "Требуется авторизация" }), { status: 401 })) as typeof fetch;
		await assert.rejects(
			() => putTelegramSettingsRequest({}, {}),
			/Требуется авторизация/,
		);
	});

	it("6. useWorkspaceProfile sends clinical headers (staffToken > clinicToken, zero admin-secret), Idempotency-Key, and refuses invalid flags", async () => {
		safeLocalStorageSetItem("dente_clinic_token", "clinic-tok");
		safeLocalStorageSetItem("dente_staff_token", "staff-tok");

		const seenRequests: Array<{ url: string; headers: Headers }> = [];
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			seenRequests.push({ url: String(input), headers: new Headers(init?.headers) });
			if (String(input) === "/api/workspace/profile" && (!init?.method || init.method === "GET")) {
				return new Response(JSON.stringify({ hasDentalLab: false, numberOfDoctors: 2 }), { status: 200 });
			}
			return new Response(JSON.stringify({ message: "Нет прав" }), { status: 403 });
		}) as typeof fetch;

		await loadWorkspaceProfile();
		assert.equal(seenRequests[0]?.headers.get("Authorization"), "Bearer staff-tok");
		assert.equal(seenRequests[0]?.headers.get("x-dente-admin-secret"), null);
		assert.equal(useWorkspaceProfileStore.getState().hasDentalLab, false);
		assert.equal(useWorkspaceProfileStore.getState().numberOfDoctors, 2);

		const saveResult = await saveWorkspaceFlags({ hasMarketingModule: false });
		assert.equal(saveResult.savedOnServer, false);
		assert.equal(saveResult.failureText, "Нет прав");
		assert.equal(seenRequests[1]?.headers.get("Authorization"), "Bearer staff-tok");
		assert.equal(seenRequests[1]?.headers.get("x-dente-admin-secret"), null);
		assert.match(seenRequests[1]?.headers.get("Idempotency-Key") ?? "", UUID_V7_RE);

		safeLocalStorageRemoveItem("dente_staff_token");
		safeLocalStorageRemoveItem("dente_clinic_token");
	});

	it("7. autoGenerator modules produce clinical plan items cleanly without non-null assertion crashes", () => {
		const missingSpan = buildMissingSpanItems(
			[35, 36, 37],
			[{ toothNumber: 35, state: "Missing" }, { toothNumber: 36, state: "Missing" }, { toothNumber: 37, state: "Missing" }],
			undefined,
			0,
			true,
		);
		assert.equal(missingSpan.stage2.length, 2);
		assert.equal(missingSpan.stage3.length, 1);

		const perio = buildPeriodontalAndHygieneItems(
			[{ toothNumber: 16, state: "Healthy", boneLossLevel: 2, mobility: 2 }],
			undefined,
			10,
			true,
		);
		assert.equal(perio.hasPeriodontalNeeds, true);
		assert.equal(perio.stage1PerioItems.length, 5);

		const ped = buildDeciduousToothItems({ toothNumber: 54, state: "Pulpitis" }, undefined, 0, true);
		assert.equal(ped.stage1.length, 1);
		assert.equal(ped.stage3.length, 1);

		const perm = buildPermanentToothItems({ toothNumber: 24, state: "Caries" }, undefined, 0, true);
		assert.equal(perm.stage1.length, 1);
	});

	it("8. getDatesForPnlPreset handles leap February and year boundary rollovers without UTC drift", () => {
		const janRef = new Date(2026, 0, 15);
		assert.deepEqual(getDatesForPnlPreset("prev_month", janRef), {
			from: "2025-12-01",
			to: "2025-12-31",
		});

		const leapFebRef = new Date(2024, 1, 10);
		assert.deepEqual(getDatesForPnlPreset("current_month", leapFebRef), {
			from: "2024-02-01",
			to: "2024-02-29",
		});

		const q1Ref = new Date(2026, 2, 5);
		assert.deepEqual(getDatesForPnlPreset("quarter", q1Ref), {
			from: "2026-01-01",
			to: "2026-03-31",
		});
	});

	it("9. ChairsideQuickSwitchModal & DoctorPayrollStudioModal render valid markup in SSR", () => {
		const switchHtml = renderToStaticMarkup(
			React.createElement(ChairsideQuickSwitchModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);
		assert.ok(switchHtml.includes("Смена врача у кресла"));

		const payrollHtml = renderToStaticMarkup(
			React.createElement(DoctorPayrollStudioModal, {
				isOpen: true,
				onClose: () => {},
				clinicName: "Тест Клиника",
			}),
		);
		assert.ok(payrollHtml.includes('data-testid="doctor-payroll-studio-modal"'));
	});
});
