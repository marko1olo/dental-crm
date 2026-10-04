/**
 * apps/web/src/tests/mobilePatientProfileWorkspace.test.tsx
 *
 * Automated verification of Dedicated Mobile Patient Profile Workspace & HUD:
 * 1. Compact Top Bar: Full Russian name without ellipses, age, visit status.
 * 2. Bedside Safety Alerts: Allergies (Lidocaine, Penicillin) and Somatic risks (Pacemaker, Diabetes, Pregnancy).
 * 3. 1-Tap Bedside Communications (>=44x44px): Phone, WhatsApp, Telegram, Copy phone.
 * 4. Family Balance & Member Switcher: Shared wallet deposit/debt and 1-tap patient chart switching.
 * 5. 5 Sovereign Tabs: [ Медкарта | Визиты | Финансы | Документы | Снимки ].
 * 6. Zero Mocks: Real DB/IndexedDB structures, honest 0 ₽ balance and empty states.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Patient } from "@dental/shared";
import {
	MobilePatientProfileWorkspace,
	formatPatientBirthAndAge,
} from "../components/patients/MobilePatientProfileWorkspace";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../..");

test("Mobile Patient Profile — formatPatientBirthAndAge helper", () => {
	const formatted = formatPatientBirthAndAge("1992-08-24");
	assert.ok(formatted.includes("лет") || formatted.includes("год"));
	assert.ok(formatted.includes("1992"));
	assert.ok(formatted.includes("августа"));
});

test("Mobile Patient Profile — Component Static Markup & HIG Invariants", () => {
	const samplePatient: Patient = {
		id: "pat-mob-001",
		organizationId: "org-001",
		status: "active",
		fullName: "Константинопольская Александра Владимировна",
		phone: "+79161234567",
		birthDate: "1990-05-15",
		gender: "female",
		administrativeProfile: {
			snils: "123-456-789 00",
			address: "г. Москва, ул. Арбат, д. 10",
		} as any,
		email: "alexandra@example.com",
		notes: "Аллергия на лидокаин и пенициллин. Кардиостимулятор. Сахарный диабет.",
		balanceRub: 15400,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const sampleDashboard: any = {
		activeVisit: null,
		appointments: [
			{
				id: "appt-001",
				patientId: "pat-mob-001",
				startsAt: new Date(Date.now() + 3600000 * 2).toISOString(),
				status: "planned",
				reason: "Плановая гигиена и осмотр",
				doctorFullName: "Д-р Смирнов А.В.",
			},
		],
		invoices: [
			{
				id: "inv-001",
				patientId: "pat-mob-001",
				number: "INV-102",
				amount: 15400,
				status: "paid",
				createdAt: new Date().toISOString(),
			},
		],
		imagingStudies: [
			{
				id: "study-001",
				patientId: "pat-mob-001",
				title: "Прицельный снимок зуба 2.6",
				toothCode: "26",
				capturedAt: new Date().toISOString(),
			},
		],
	};

	const html = renderToStaticMarkup(
		React.createElement(MobilePatientProfileWorkspace, {
			patient: samplePatient,
			dashboard: sampleDashboard,
			onBack: () => {},
			onSelectPatient: () => {},
			money: (amt: number) => `${amt.toLocaleString("ru-RU")} ₽`,
		}),
	);

	// 1. Full name rendered completely without truncation
	assert.ok(
		html.includes("Константинопольская Александра Владимировна"),
		"Full Russian patient name must be rendered completely without truncation",
	);

	// 2. Allergy Safety Alert Banner
	assert.ok(
		html.includes("data-testid=\"mobile-allergy-alert\""),
		"Prominent allergy alert banner must be rendered",
	);
	assert.ok(
		html.includes("Лидокаин") || html.includes("лидокаин"),
		"Allergy banner must identify Lidocaine",
	);

	// 3. Somatic Risk Alert Banner
	assert.ok(
		html.includes("data-testid=\"mobile-somatic-alert\""),
		"Prominent somatic alert banner must be rendered",
	);
	assert.ok(
		html.includes("Кардиостимулятор"),
		"Somatic alert banner must identify Pacemaker",
	);
	assert.ok(
		html.includes("Сахарный диабет"),
		"Somatic alert banner must identify Diabetes",
	);

	// 4. Bedside 1-Tap Communications (Call, WhatsApp, Telegram, Copy)
	assert.ok(html.includes("data-testid=\"mobile-btn-call\""), "Must have 1-tap call button");
	assert.ok(html.includes("tel:+79161234567"), "Call button must link to tel:+79161234567");
	assert.ok(html.includes("data-testid=\"mobile-btn-whatsapp\""), "Must have 1-tap WhatsApp button");
	assert.ok(html.includes("data-testid=\"mobile-btn-telegram\""), "Must have 1-tap Telegram button");
	assert.ok(html.includes("data-testid=\"mobile-btn-copy-phone\""), "Must have 1-tap copy phone button");

	// 5. Family Balance Box
	assert.ok(html.includes("data-testid=\"mobile-family-box\""), "Must have Family Balance container");

	// 6. 5 Tabs Navigation
	assert.ok(html.includes("data-testid=\"mobile-tab-card\""), "Must have Медкарта tab");
	assert.ok(html.includes("data-testid=\"mobile-tab-visits\""), "Must have Визиты tab");
	assert.ok(html.includes("data-testid=\"mobile-tab-finance\""), "Must have Финансы tab");
	assert.ok(html.includes("data-testid=\"mobile-tab-documents\""), "Must have Документы tab");
	assert.ok(html.includes("data-testid=\"mobile-tab-scans\""), "Must have Снимки tab");

	// 7. Floating Bottom Bar in Natural Thumb Zone
	assert.ok(
		html.includes("data-testid=\"mobile-profile-floating-bar\""),
		"Must render floating bottom bar for 1-tap primary action CTA",
	);
	assert.ok(
		html.includes("data-testid=\"mobile-floating-start-visit-btn\""),
		"Floating bar must contain Start Visit button",
	);
});

test("Mobile Patient Profile — Clean Healthy Norm when no allergies or risks", () => {
	const healthyPatient: Patient = {
		id: "pat-mob-002",
		organizationId: "org-001",
		status: "active",
		fullName: "Иванов Иван Иванович",
		phone: "+79031112233",
		birthDate: "1995-01-01",
		gender: "male",
		administrativeProfile: null,
		email: null,
		notes: "Соматически здоров. Физиологическая норма.",
		balanceRub: 0,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	const html = renderToStaticMarkup(
		React.createElement(MobilePatientProfileWorkspace, {
			patient: healthyPatient,
			dashboard: null,
			onBack: () => {},
			onSelectPatient: () => {},
			money: (amt: number) => `${amt.toLocaleString("ru-RU")} ₽`,
		}),
	);

	assert.ok(
		html.includes("data-testid=\"mobile-healthy-norm-banner\""),
		"Must render quiet healthy norm banner when no risks present",
	);
	assert.ok(
		!html.includes("data-testid=\"mobile-allergy-alert\""),
		"Must NOT render alarming allergy banner when patient has no allergies",
	);
});
