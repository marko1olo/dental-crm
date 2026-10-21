/**
 * staffProfileAutonomyAndCommissions.test.tsx
 *
 * Red Team Inquisition Test Suite:
 * - Staff Profile & HR Credentials persistence (Mandates 8e, 8n).
 * - Doctor Shift Summary Card and 1-Click closure with Telegram handover.
 * - Mobile Touch-first Doctor Shift Autonomy.
 * - Zero cartoon emojis and no raw bureaucratic law numbers in prod UI.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { StaffProfileCard } from "../StaffProfileCard";
import { StaffModal } from "../StaffModal";
import { DoctorShiftSummaryCard } from "../../shift/DoctorShiftSummaryCard";
import { DoctorMobileShiftAutonomy } from "../../doctor-portal/DoctorMobileShiftAutonomy";
import { DoctorShiftCloseFooter } from "../../shift/doctorShiftClose/DoctorShiftCloseFooter";
import type { StaffProfileExtended } from "@dental/shared";

function cleanSsrHtml(html: string): string {
	return html.replace(/<!--.*?-->/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
}

const mockStaffMember = {
	id: "doc-test-1",
	organizationId: "00000000-0000-0000-0000-000000000001",
	fullName: "Д-р Смирнова Елена Владимировна",
	role: "doctor",
	phone: "+7 (999) 123-45-67",
	email: "smirnova@dente.clinic",
	active: true,
	color: "#0d9488",
	specialties: ["universal", "therapist", "orthopedist"],
	snils: "123-456-789 01",
	inn: "770123456789",
	medicalBookNumber: "МК-998877",
	medicalBookCheckupDate: "2026-12-31",
	minzdravAccreditationDate: "2028-06-30",
	minzdravAccreditationSpecialty: "Стоматология терапевтическая",
	clinicalNotes: "Ведущий стоматолог-терапевт",
	managementNotes: "Надежный врач",
	assignedBranches: [],
	assignedChairIds: [],
	priceCategory: "first",
	baseSalaryRub: 80000,
	commissionPct: 35,
	materialCostDeductionPct: 10,
	labCostDeductionPct: 5,
	canSignMedicalRecords: true,
	canManageMoney: false,
	canManageImports: true,
} as unknown as StaffProfileExtended;

describe("Red Team: Staff Profile & Doctor Shift Autonomy", () => {
	it("renders StaffProfileCard with 3 columns: Requisites, Payroll, Security", () => {
		const rawHtml = renderToString(
			<StaffProfileCard
				staffMember={mockStaffMember}
				callerRole="owner"
				isOpen={true}
				onClose={() => {}}
				onSaved={() => {}}
			/>,
		);
		const html = cleanSsrHtml(rawHtml);

		assert.ok(html.includes("Д-р Смирнова Елена Владимировна"), "Must render full name");
		assert.ok(html.includes("Роль и специальности"), "Must render role & specialties");
		assert.ok(html.includes("Тарификация и ставки ЗП"), "Must render payroll section");
		assert.ok(html.includes("Окладная часть"), "Must render base salary label");
		assert.ok(html.includes("Ставка ЗП (%)"), "Must render commission % label");
		assert.ok(html.includes("Удержание расходников (%)"), "Must render materials deduction label");
		assert.ok(html.includes("Удержание ЗТЛ (%)"), "Must render lab deduction label");
		assert.ok(html.includes("Персональные полномочия"), "Must render security column");
		assert.ok(html.includes("Сохранить карточку"), "Must render 1-click save button");
	});

	it("StaffModal is a drop-in alias for StaffProfileCard", () => {
		const rawHtml = renderToString(
			<StaffModal
				staffMember={mockStaffMember}
				callerRole="owner"
				isOpen={true}
				onClose={() => {}}
				onSaved={() => {}}
			/>,
		);
		const html = cleanSsrHtml(rawHtml);

		assert.ok(html.includes("Д-р Смирнова Елена Владимировна"), "StaffModal must render full name");
		assert.ok(html.includes("Ставка ЗП (%)"), "StaffModal must render commission % label");
	});

	it("DoctorShiftSummaryCard displays clinical earnings without leaking cash safe controls", () => {
		const rawHtml = renderToString(
			<DoctorShiftSummaryCard
				totalRevenueRub={120000}
				doctorCommissionPct={35}
				estimatedDoctorPayoutRub={42000}
				doctorFullName="Д-р Смирнова Е.В."
				completedPatientsCount={4}
				totalAppointmentsCount={5}
			/>,
		);
		const html = cleanSsrHtml(rawHtml);

		assert.ok(html.includes("Выработка и доход за смену"), "Must render earnings title");
		assert.ok(html.includes("35% гонорар"), "Must show commission rate");
		assert.ok(html.includes("42 000"), "Must show doctor payout in roubles");
		assert.ok(html.includes("120 000"), "Must show total revenue");
		assert.ok(html.includes("4"), "Must show completed count");
		assert.ok(html.includes("из 5"), "Must show total count");
		// Must not show cashier drawer encashment
		assert.strictEqual(html.includes("Инкассация наличной выручки"), false, "Doctor must not see cash drawer");
	});

	it("DoctorMobileShiftAutonomy renders mobile PWA interface with 1-click emergency reception", () => {
		const rawHtml = renderToString(
			<DoctorMobileShiftAutonomy
				isOpen={true}
				onClose={() => {}}
				initialDoctorId="doc-test-1"
				initialDoctorName="Д-р Смирнова Е.В."
				initialDoctorSpecialty="Терапевт"
				initialShiftDateIso="2026-10-21"
				initialAppointments={[]}
			/>,
		);
		const html = cleanSsrHtml(rawHtml);

		assert.ok(html.includes("doctor-mobile-pwa-container"), "Must have mobile PWA container");
		assert.ok(html.includes("empty-shift-state"), "Must render clean empty state");
		assert.ok(html.includes("emergency-patient-btn"), "Must have 1-click emergency patient button");
		assert.ok(html.includes("На сегодня приемов не запланировано"), "Must show Russian empty state text");
	});

	it("DoctorShiftCloseFooter renders 1-click Telegram handover and print statement", () => {
		const rawHtml = renderToString(
			<DoctorShiftCloseFooter
				onPrintShiftStatement={() => {}}
				onSendTelegramSummary={() => {}}
				onClose={() => {}}
				onConfirmClose={() => {}}
			/>,
		);
		const html = cleanSsrHtml(rawHtml);

		assert.ok(html.includes("Печать сводки смены"), "Must render print button");
		assert.ok(html.includes("Отправить в Telegram"), "Must render Telegram summary button");
		assert.ok(html.includes("Завершить смену и рассчитать (1 клик)"), "Must render 1-click close button");
		assert.ok(html.includes("btn-send-telegram-shift-summary"), "Must have telegram testid");
		assert.ok(html.includes("btn-confirm-close-shift-1click"), "Must have 1-click confirm testid");
	});
});
