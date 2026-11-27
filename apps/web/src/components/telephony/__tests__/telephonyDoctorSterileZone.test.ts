import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IncomingCallPopup } from "../IncomingCallPopup";
import { computeQuickBookingSlots } from "../IncomingCallQuickBooking";
import { EditorStaffChairSection } from "../../schedule/appointmentEditor/EditorStaffChairSection";
import { useAppStore } from "../../../store/appStore";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { useUiSurfaceStore } from "../../../store/uiSurfaceStore";

describe("Doctor Sterile Zone & Solo-Doctor Sovereignty (Mandates 8e, 8n, 8v)", () => {
	it("1. IncomingCallPopup renders null when selectedWorkspaceRole === 'doctor' even with active inbound ringing call", () => {
		const prevApp = useAppStore.getState();
		const prevTel = useTelephonyStore.getState();
		try {
			useAppStore.setState({ selectedWorkspaceRole: "doctor", currentView: "schedule" });
			useUiSurfaceStore.setState({ isFullScreenStudioActive: false });
			useTelephonyStore.setState({
				agentState: "online",
				activeCall: {
					callId: "sterile-call-1",
					direction: "inbound",
					phone: "+79001234567",
					patientName: "Пациент Тестов",
					status: "ringing",
					callStartedAt: Date.now(),
				},
			});
			const html = renderToStaticMarkup(React.createElement(IncomingCallPopup));
			assert.equal(html, "", "Doctor workspace must remain 100% free of incoming call popups");
		} finally {
			useAppStore.setState({
				selectedWorkspaceRole: prevApp.selectedWorkspaceRole,
				currentView: prevApp.currentView,
			});
			useTelephonyStore.setState({
				activeCall: prevTel.activeCall,
				agentState: prevTel.agentState,
			});
		}
	});

	it("2. IncomingCallPopup renders null on clinical views ('visit', 'odontogram') and when suppressCallModal=true", () => {
		const prevApp = useAppStore.getState();
		const prevTel = useTelephonyStore.getState();
		try {
			useTelephonyStore.setState({
				agentState: "online",
				activeCall: {
					callId: "sterile-call-2",
					direction: "inbound",
					phone: "+79001234568",
					status: "ringing",
					callStartedAt: Date.now(),
				},
			});
			useAppStore.setState({ selectedWorkspaceRole: "reception", currentView: "visit" });
			assert.equal(renderToStaticMarkup(React.createElement(IncomingCallPopup)), "");

			useAppStore.setState({ selectedWorkspaceRole: "reception", currentView: "schedule" });
			assert.equal(
				renderToStaticMarkup(React.createElement(IncomingCallPopup, { suppressCallModal: true })),
				"",
			);
		} finally {
			useAppStore.setState({
				selectedWorkspaceRole: prevApp.selectedWorkspaceRole,
				currentView: prevApp.currentView,
			});
			useTelephonyStore.setState({
				activeCall: prevTel.activeCall,
				agentState: prevTel.agentState,
			});
		}
	});

	it("3. EditorStaffChairSection hides assistant selector when clinicMode === 'solo_doctor'", () => {
		const commonProps: Parameters<typeof EditorStaffChairSection>[0] = {
			appointment: {
				id: "appt-1",
				organizationId: "org-1",
				patientId: null,
				doctorUserId: "doc-1",
				chairId: "chair-1",
				status: "planned",
				startsAt: "2026-07-20T09:00:00Z",
				endsAt: "2026-07-20T09:30:00Z",
				reason: null,
				comment: null,
			},
			dashboard: {
				clinicSettings: {
					profile: { clinicName: "Денте", mode: "solo_doctor", timezone: "Europe/Moscow" },
					staff: [],
					chairs: [],
				},
			} as unknown as Parameters<typeof EditorStaffChairSection>[0]["dashboard"],
			appointmentDraft: { assistantUserId: "", chairId: "chair-1" },
			activeAssistants: [{ id: "ast-1", fullName: "Ассистент Анна", active: true, role: "assistant" }],
			activeChairs: [{ id: "chair-1", name: "Кресло 1", active: true }],
			updateAppointmentScheduleDraft: () => {},
		};

		const soloHtml = renderToStaticMarkup(React.createElement(EditorStaffChairSection, commonProps));
		assert.equal(soloHtml.includes("Ассистент"), false, "solo_doctor mode must hide assistant field");
		assert.equal(soloHtml.includes("Ассистент Анна"), false);

		const multiHtml = renderToStaticMarkup(
			React.createElement(EditorStaffChairSection, {
				...commonProps,
				dashboard: {
					clinicSettings: {
						profile: { clinicName: "Денте", mode: "full", timezone: "Europe/Moscow" },
						staff: [],
						chairs: [],
					},
				} as unknown as Parameters<typeof EditorStaffChairSection>[0]["dashboard"],
			}),
		);
		assert.ok(multiHtml.includes("Ассистент"), "Full clinic mode keeps assistant selector");
	});

	it("4. computeQuickBookingSlots avoids synthetic placeholders when staff/chairs are empty and resolves TZ calendar day", () => {
		const res = computeQuickBookingSlots({
			todayIso: "2026-07-20",
			appointments: [],
			clinicSettings: {
				profile: { timezone: "Asia/Vladivostok" },
				staff: [],
				chairs: [],
			},
		});
		assert.equal(res.slots.length, 3);
		const tomorrowInterval = res.getSlotInterval("tomorrow");
		assert.ok(
			tomorrowInterval.startsAt.startsWith("2026-07-21T00:"),
			`Expected 10:xx+10:00 -> 00:xxZ on 2026-07-21, got ${tomorrowInterval.startsAt}`,
		);
	});
});
