import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Patient, PatientInsight } from "@dental/shared";
import { resolvePatientSomaticAlerts } from "../../../store/telephonyClinical";
import { useAppStore } from "../../../store/appStore";
import { useTelephonyStore } from "../../../store/telephonyStore";
import { IncomingCallerCard } from "../IncomingCallerCard";
import { TelephonyDrawerSomaticAlerts } from "../drawerModules/activeCallPanel/TelephonyDrawerSomaticAlerts";

describe("Telephony Patient Card Access & Somatic Alerts (Mandates 8b, 8d, 8e)", () => {
	it("1. Toggling call drawer preserves currentView='visit' so active Form 043/u visit never resets", () => {
		const prevView = useAppStore.getState().currentView;
		const prevDrawer = useTelephonyStore.getState().isCallDrawerOpen;
		try {
			useAppStore.setState({ currentView: "visit" });
			useTelephonyStore.setState({ isCallDrawerOpen: false });
			useTelephonyStore.getState().toggleCallDrawer();

			assert.equal(useTelephonyStore.getState().isCallDrawerOpen, true, "Drawer must open via toggleCallDrawer()");
			assert.equal(useAppStore.getState().currentView, "visit", "Active visit route must never be reset");
		} finally {
			useAppStore.setState({ currentView: prevView });
			useTelephonyStore.setState({ isCallDrawerOpen: prevDrawer });
		}
	});

	it("2. Existing Patient: Instant Somatic Status renders allergy & acute pain alerts in both IncomingCallerCard and Drawer", () => {
		const samplePatient: Partial<Patient> = {
			id: "pat-101",
			fullName: "Иванов Иван Иванович",
			phone: "+79991112233",
			notes: "Аллергия на лидокаин и новокаин. Кардиостимулятор.",
		};

		const sampleInsight: Partial<PatientInsight> = {
			patientId: "pat-101",
			riskLevel: "high",
			clinicalFlags: ["Аллергия на анестетики", "Острая боль"],
			balanceDueRub: 0,
		};

		const alerts = resolvePatientSomaticAlerts(
			samplePatient as Patient,
			sampleInsight as PatientInsight,
		);

		assert.ok(alerts.length >= 2, "Must resolve multiple somatic alerts");
		assert.ok(alerts.some((a) => a.category === "allergy"), "Must identify anesthesia allergy");
		assert.ok(alerts.some((a) => a.category === "pain"), "Must identify acute pain flag");
		assert.ok(alerts.some((a) => a.label.includes("Кардиостимулятор")), "Must identify pacemaker contraindication");

		const drawerHtml = renderToStaticMarkup(
			React.createElement(TelephonyDrawerSomaticAlerts, {
				somaticAlerts: alerts,
				onQuickBookUrgent: () => {},
			}),
		);
		assert.ok(drawerHtml.includes("Кардиостимулятор"));
		assert.ok(drawerHtml.includes('data-testid="drawer-action-cito"'));

		const cardHtml = renderToStaticMarkup(
			React.createElement(IncomingCallerCard, {
				callerName: "Иванов Иван Иванович",
				formattedPhone: "+7 999 111-22-33",
				rawPhone: "+79991112233",
				initials: "ИИ",
				avatarColors: { bg: "", text: "" },
				isKnownPatient: true,
				financialSummary: {
					hasDebt: false,
					debtAmountRub: 0,
					depositBalanceRub: 0,
					hasInsurance: false,
					formattedDebt: "0 ₽",
					formattedDeposit: "0 ₽",
				},
				somaticAlerts: alerts,
				upcomingAppointment: null,
			}),
		);
		assert.ok(cardHtml.includes("Аллергия") || cardHtml.includes("лидокаин"));
	});
});
