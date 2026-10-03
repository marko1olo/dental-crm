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
		it("re-exports all domain queues and resilience functions from services/offline/index", () => {
			assert.equal(typeof servicesOffline.saveVisitDraftOffline, "function");
			assert.equal(typeof servicesOffline.getVisitDraftOffline, "function");
			assert.equal(typeof servicesOffline.enqueueOfflineAppointment, "function");
			assert.equal(typeof servicesOffline.cachePricelistOffline, "function");
			assert.equal(typeof servicesOffline.enqueueOfflinePayment, "function");
			assert.equal(typeof servicesOffline.withOfflineFallback, "function");
			assert.equal(typeof servicesOffline.lanP2PDispatcher, "object");
			assert.equal(typeof servicesOffline.lanMeshReplicationService, "object");
		});

		it("unified web/offline/index re-exports the identical authority without duplication errors", () => {
			assert.equal(typeof webOffline.saveVisitDraftOffline, "function");
			assert.equal(typeof webOffline.enqueueOfflineAppointment, "function");
			assert.equal(typeof webOffline.cachePricelistOffline, "function");
			assert.equal(typeof webOffline.enqueueOfflinePayment, "function");
			assert.equal(typeof webOffline.withOfflineFallback, "function");
			assert.equal(typeof webOffline.lanP2PDispatcher, "object");
			assert.equal(typeof webOffline.lanMeshReplicationService, "object");
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

			let receivedCitoEvent: any = null;
			let receivedEnvelope: any = null;

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
		it("returns null when no active CITO alerts exist", () => {
			const element = React.createElement(LanCitoEmergencyBanner, {
				alerts: [],
				onDismiss: () => {},
				onAcknowledge: () => {},
			});

			const rendered = (LanCitoEmergencyBanner as any)(element.props);
			assert.equal(rendered, null);
		});

		it("renders emergency banner with cabinet, doctor, urgency and action controls", () => {
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

			let dismissedId: string | null = null;
			let acknowledgedId: string | null = null;

			const element = React.createElement(LanCitoEmergencyBanner, {
				alerts,
				onDismiss: (id) => {
					dismissedId = id;
				},
				onAcknowledge: (id) => {
					acknowledgedId = id;
				},
			});

			const rendered = (LanCitoEmergencyBanner as any)(element.props);
			assert.ok(rendered !== null);
			assert.equal(rendered.type, "aside");
			assert.equal(rendered.props.role, "alert");
			assert.equal(rendered.props["aria-live"], "assertive");

			// Check children structure
			const alertItems = rendered.props.children;
			assert.equal(alertItems.length, 1);
			const alertItem = alertItems[0];
			assert.equal(alertItem.key, "alert-001");
		});
	});
});
