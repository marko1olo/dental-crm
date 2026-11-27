/**
 * useLanP2PAndBanner.test.ts — Unit tests for LAN P2P mesh hook, CITO emergency banner & unified exports
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8d: Quiet Telemetry & Emergency summoning without UI freezing.
 * - Mandate 8e: Doctor Autonomy — 1-click dismiss/acknowledge, 44x44px touch targets.
 * - Mandate 8n: Solo Doctor & Small Clinic Resilience over LAN Wi-Fi without WAN.
 * - Mandate 8s: Single source of authority for offline subsystems.
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { LanAssistantCitoEvent, LanP2PMessage } from "@dental/shared";
import {
	LanP2PDispatcher,
	lanP2PDispatcher,
} from "../lanP2PDispatcher";
import { LanCitoEmergencyBanner } from "../../../components/sync/LanCitoEmergencyBanner";
import type { ActiveCitoAlert } from "../../../hooks/useLanP2P";

// Unified exports verification
import * as servicesOffline from "../index";
import * as webOffline from "../../../offline/index";

describe("LAN P2P Mesh & Emergency CITO Subsystem Test Suite", () => {
	beforeEach(() => {
		LanP2PDispatcher.resetInstanceForTesting();
	});

	afterEach(() => {
		LanP2PDispatcher.resetInstanceForTesting();
	});

	describe("1. Unified Offline & Mesh Exports Authority", () => {
		it("executes withOfflineFallback from services/offline/index on online success and offline fallback", async () => {
			const onlineValue = await servicesOffline.withOfflineFallback(
				async () => ({ source: "online", count: 3 }),
				() => ({ source: "offline", count: 0 }),
			);
			assert.deepEqual(onlineValue, { source: "online", count: 3 });

			const fallbackValue = await servicesOffline.withOfflineFallback(
				async () => {
					throw new Error("LAN timeout");
				},
				() => ({ source: "offline", count: 1 }),
			);
			assert.deepEqual(fallbackValue, { source: "offline", count: 1 });

			const status = servicesOffline.lanP2PDispatcher.getStatus();
			assert.equal(status.nodeId.length > 0, true);
		});

		it("unified web/offline/index re-exports the identical authority references without duplication", () => {
			assert.strictEqual(webOffline.saveVisitDraftOffline, servicesOffline.saveVisitDraftOffline);
			assert.strictEqual(webOffline.getVisitDraftOffline, servicesOffline.getVisitDraftOffline);
			assert.strictEqual(webOffline.enqueueOfflineAppointment, servicesOffline.enqueueOfflineAppointment);
			assert.strictEqual(webOffline.cachePricelistOffline, servicesOffline.cachePricelistOffline);
			assert.strictEqual(webOffline.enqueueOfflinePayment, servicesOffline.enqueueOfflinePayment);
			assert.strictEqual(webOffline.withOfflineFallback, servicesOffline.withOfflineFallback);
			assert.strictEqual(webOffline.lanP2PDispatcher, servicesOffline.lanP2PDispatcher);
			assert.strictEqual(webOffline.lanMeshReplicationService, servicesOffline.lanMeshReplicationService);
			assert.strictEqual(webOffline.lanP2PDispatcher, lanP2PDispatcher);
		});
	});

	describe("2. LanP2PDispatcher Assistant CITO Emergency Broadcasting", () => {
		it("broadcasts assistant CITO call and dispatches to local listeners", async () => {
			const doctorDispatcher = new LanP2PDispatcher({
				nodeId: "tablet-dr-ivanov",
				nodeRole: "doctor_tablet",
				nodeName: "Планшет Стоматолога Д-р Иванов",
				organizationId: "org-cito-test",
			});

			const assistantDispatcher = new LanP2PDispatcher({
				nodeId: "workstation-assistant",
				nodeRole: "autonomous_workstation",
				nodeName: "Станция Ассистента",
				organizationId: "org-cito-test",
			});

			let receivedCitoEvent: LanAssistantCitoEvent | null = null;
			let receivedEnvelope: LanP2PMessage<LanAssistantCitoEvent> | null = null;

			assistantDispatcher.onAssistantCitoCall((event, envelope) => {
				receivedCitoEvent = event;
				receivedEnvelope = envelope;
			});

			const citoMessage = await doctorDispatcher.broadcastAssistantCitoCall({
				cabinetNumber: "3",
				doctorId: "doc-101",
				doctorName: "Д-р Иванов И.И.",
				urgency: "cito_emergency",
				reason: "anesthesia_aid",
				customMessage: "Острая пульсирующая боль 3.6, требуется помощь ассистента",
			});

			assert.ok(citoMessage);
			assert.equal(citoMessage.eventType, "assistant_call_cito");
			assert.equal(citoMessage.payload.cabinetNumber, "3");
			assert.equal(citoMessage.payload.doctorName, "Д-р Иванов И.И.");
			assert.equal(citoMessage.payload.urgency, "cito_emergency");

			// Simulate delivery via local channel to assistant station
			assistantDispatcher.handleIncomingRawMessage(citoMessage, "broadcast_channel");

			assert.ok(receivedCitoEvent);
			assert.equal(receivedCitoEvent.cabinetNumber, "3");
			assert.equal(receivedCitoEvent.urgency, "cito_emergency");
			assert.equal(receivedEnvelope?.messageId, citoMessage.messageId);
		});
	});

	describe("3. LanCitoEmergencyBanner Component Rendering", () => {
		it("returns empty markup when no active CITO alerts exist", () => {
			const html = renderToString(
				React.createElement(LanCitoEmergencyBanner, {
					alerts: [],
					onDismiss: () => {},
					onAcknowledge: () => {},
				}),
			);
			assert.equal(html, "");
		});

		it("renders emergency banner with cabinet, doctor, urgency and touch-safe action controls", () => {
			const alerts: ActiveCitoAlert[] = [
				{
					callId: "call-001",
					alertId: "alert-001",
					status: "pending",
					calledAt: new Date().toISOString(),
					receivedAt: new Date().toISOString(),
					cabinetNumber: "Кабинет 2",
					doctorId: "doc-petrov",
					doctorName: "Д-р Петров П.П.",
					urgency: "cito_emergency",
					reason: "supplies_needed",
					customMessage: "Срочно требуются карпулы артикаина",
					timestamp: Date.now(),
				},
			];

			const html = renderToString(
				React.createElement(LanCitoEmergencyBanner, {
					alerts,
					onDismiss: () => {},
					onAcknowledge: () => {},
				}),
			);
			assert.ok(html.includes("<aside"));
			assert.ok(html.includes('role="alert"'));
			assert.ok(html.includes('aria-live="assertive"'));
			assert.ok(html.includes("Кабинет 2"));
			assert.ok(html.includes("Д-р Петров П.П."));
			assert.ok(html.includes("Экстренно"));
			assert.ok(html.includes("Срочно требуются карпулы артикаина"));
			assert.ok(html.includes("Принять"));
			assert.ok(html.includes("min-h-[44px]"));
		});
	});
});
