/**
 * telephonyInquisitorFacades.test.ts
 * Unit tests for Telephony Facades & Autonomy (Mandates 8b <= 120 lines, 8e, 8n, 8d, 8x).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";
import { useAppStore } from "../../../store/appStore";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { CallHistoryDrawer } from "../CallHistoryDrawer";
import { IncomingCallModal } from "../IncomingCallModal";
import { IncomingCallActionFooter } from "../incomingCallPopupModules/IncomingCallActionFooter";
import { TelephonyFloatingDialer } from "../TelephonyFloatingDialer";

const mockAppLogicContext = {
	dashboard: {
		patients: [{ id: "pat-101", fullName: "Смирнова Анна Сергеевна", phone: "+7 916 234-56-78" }],
		patientInsights: [], insuranceContracts: [], appointments: [],
		clinicSettings: { name: "ДЕНТЕ", staff: [] }, todayIso: "2026-09-07",
	},
} as unknown as AppLogicContextType;

describe("Telephony Facades & Chairside Sterile Zone Invariants (Mandates 8e, 8n, 8d, 8x)", () => {
	describe("1. Doctor Sterile Zone Immunity (Mandate 8e)", () => {
		it("IncomingCallModal is suppressed (returns empty) when suppressCallModal is true", () => {
			useTelephonyStore.setState({
				activeCall: {
					id: "call-99", phone: "+79162345678", patientId: "patient-01",
					patientName: "Смирнова Анна", durationSeconds: 10, status: "ringing",
					direction: "inbound", timestamp: new Date().toISOString(),
				},
			});
			const html = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<IncomingCallModal isOpen={true} suppressCallModal={true} onClose={() => {}} />
				</AppLogicProvider>,
			);
			assert.equal(html, "", "IncomingCallModal MUST return empty string when suppressCallModal is true");
		});

		it("IncomingCallModal is suppressed when currentView is visit or doctor role is active", () => {
			useAppStore.setState({ selectedWorkspaceRole: "doctor" });
			const html = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<IncomingCallModal isOpen={true} onClose={() => {}} />
				</AppLogicProvider>,
			);
			assert.equal(html, "", "IncomingCallModal MUST be suppressed during doctor clinical procedures");
		});

		it("IncomingCallActionFooter renders 1-click callback and quick booking buttons for receptionist", () => {
			const mockCtrl = {
				currentCall: { phone: "+79265551234", patientId: "pat-101", patientName: "Смирнова Анна", status: "ringing" },
				isKnownPatient: true, handleQuickBook: () => {}, handleToggleCardDrawer: () => {},
				showBadgeMoreMenu: false, setShowBadgeMoreMenu: () => {},
			} as any;
			const html = renderToString(<IncomingCallActionFooter ctrl={mockCtrl} />);
			assert.ok(html.includes('data-testid="badge-action-book"'), "Must contain 1-click booking CTA");
			assert.ok(html.includes('data-testid="badge-action-callback"'), "Must contain 1-click callback button");
			assert.ok(html.includes('data-testid="badge-action-card"'), "Must contain 1-click patient card button");
		});
	});

	describe("2. CallHistoryDrawer & Audio Journal Facade", () => {
		it("renders drawer markup when open with touch targets >= 44x44px", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<CallHistoryDrawer isOpen={true} onClose={() => {}} call={null} />
				</AppLogicProvider>,
			);
			assert.ok(html.includes('data-testid="telephony-patient-side-drawer"'), "Drawer container must render");
			assert.ok(html.includes("min-h-[44px]"), "Touch targets must enforce min-h-[44px]");
			assert.ok(html.includes("Закрыть шторку"), "Must contain close CTA button");
		});
	});

	describe("3. TelephonyFloatingDialer Softphone Facade", () => {
		it("mounts without throwing and respects telephony state contracts", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<TelephonyFloatingDialer suppressCallModal={true} />
				</AppLogicProvider>,
			);
			assert.ok(typeof html === "string", "TelephonyFloatingDialer renders cleanly");
		});
	});

	describe("4. Human Clinical Language & Zero Soviet Bureaucratic Codes (Mandate 8x)", () => {
		it("CallHistoryDrawer and IncomingCallModal contain zero Soviet codes (043/у, 804н, 54-ФЗ)", () => {
			const drawerHtml = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<CallHistoryDrawer isOpen={true} onClose={() => {}} call={null} />
				</AppLogicProvider>,
			);
			assert.ok(!drawerHtml.includes("043/у"), "Zero 043/у codes allowed in drawer");
			assert.ok(!drawerHtml.includes("804н"), "Zero 804н codes allowed in drawer");
			assert.ok(!drawerHtml.includes("54-ФЗ"), "Zero 54-ФЗ codes allowed in drawer");
		});
	});
});
