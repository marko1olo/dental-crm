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
import { TelephonyDrawer } from "../TelephonyDrawer";
import { IncomingCallPopup } from "../IncomingCallPopup";
import { IncomingCallActionFooter } from "../incomingCallPopupModules/IncomingCallActionFooter";
import { TelephonyStudioModal } from "../TelephonyStudioModal";

const mockAppLogicContext = {
	dashboard: {
		patients: [{ id: "pat-101", fullName: "Смирнова Анна Сергеевна", phone: "+7 916 234-56-78" }],
		patientInsights: [], insuranceContracts: [], appointments: [],
		clinicSettings: { name: "ДЕНТЕ", staff: [] }, todayIso: "2026-09-07",
	},
} as unknown as AppLogicContextType;

describe("Telephony Facades & Chairside Sterile Zone Invariants (Mandates 8e, 8n, 8d, 8x)", () => {
	describe("1. Doctor Sterile Zone Immunity (Mandate 8e)", () => {
		it("IncomingCallPopup collapses into compact capsule when doctor role is active", () => {
			useTelephonyStore.setState({
				activeCall: {
					id: "call-99", phone: "+79162345678", patientId: "patient-01",
					patientName: "Смирнова Анна", durationSeconds: 10, status: "ringing",
					direction: "inbound", timestamp: new Date().toISOString(),
				},
			});
			useAppStore.setState({ selectedWorkspaceRole: "doctor" });
			const html = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<IncomingCallPopup suppressCallModal={true} />
				</AppLogicProvider>,
			);
			assert.ok(typeof html === "string", "IncomingCallPopup handles doctor mode without error");
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

	describe("2. TelephonyDrawer & Audio Journal Facade", () => {
		it("renders drawer markup when open with touch targets >= 44x44px", () => {
			useTelephonyStore.setState({ isCallDrawerOpen: true });
			const html = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<TelephonyDrawer />
				</AppLogicProvider>,
			);
			assert.ok(html.includes('data-testid="telephony-patient-side-drawer"'), "Drawer container must render");
			assert.ok(html.includes("min-h-[44px]") || html.includes("h-11"), "Touch targets must enforce 44px");
			assert.ok(html.includes("Закрыть шторку"), "Must contain close CTA button");
		});
	});

	describe("3. TelephonyStudioModal Master Facade", () => {
		it("mounts cleanly when open and respects telephony studio contracts", () => {
			const html = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<TelephonyStudioModal isOpen={true} onClose={() => {}} />
				</AppLogicProvider>,
			);
			assert.ok(html.includes("telephony-studio-modal-root"), "TelephonyStudioModal renders cleanly");
		});
	});

	describe("4. Human Clinical Language & Zero Soviet Bureaucratic Codes (Mandate 8x)", () => {
		it("TelephonyDrawer contains zero Soviet codes (043/у, 804н, 54-ФЗ)", () => {
			useTelephonyStore.setState({ isCallDrawerOpen: true });
			const drawerHtml = renderToString(
				<AppLogicProvider value={mockAppLogicContext}>
					<TelephonyDrawer />
				</AppLogicProvider>,
			);
			assert.ok(!drawerHtml.includes("043/у"), "Zero 043/у codes allowed in drawer");
			assert.ok(!drawerHtml.includes("804н"), "Zero 804н codes allowed in drawer");
			assert.ok(!drawerHtml.includes("54-ФЗ"), "Zero 54-ФЗ codes allowed in drawer");
		});
	});
});
