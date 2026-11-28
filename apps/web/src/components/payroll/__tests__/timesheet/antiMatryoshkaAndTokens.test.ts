import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DoctorPayrollStudioModal } from "../../DoctorPayrollStudioModal";
import {
	CANONICAL_PAYROLL_DOCTORS,
	CANONICAL_DEMO_ORDERS,
	calculateDoctorPayrollSummary,
} from "../../payrollCatalogData";
import { calculateDoctorStaffPayroll } from "../../staffPayrollEngine";

const CARTOON_EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("DoctorPayroll & Timesheet — Anti-Matryoshka, Tokens & Live UI (6G SUT)", () => {
	it("renders DoctorPayrollStudioModal with single dialog root, zero nested modals, and zero cartoon emojis", () => {
		const prevDoc = (globalThis as { document?: unknown }).document;
		(globalThis as { document?: unknown }).document = undefined;
		try {
			const html = renderToStaticMarkup(
				React.createElement(DoctorPayrollStudioModal, {
					isOpen: true,
					onClose: () => {},
					clinicName: "Клиника ДЕНТЕ",
					doctorsList: CANONICAL_PAYROLL_DOCTORS.map((d) => ({
						id: d.id,
						name: d.name,
						specialtyId: d.specialtyId,
					})),
					orders: CANONICAL_DEMO_ORDERS,
				}),
			);

			const dialogMatches = html.match(/role="dialog"/g) ?? [];
			assert.equal(dialogMatches.length, 1, "Anti-matryoshka: exactly 1 dialog layer rendered");
			const overlayMatches = html.match(/payroll-studio-overlay/g) ?? [];
			assert.equal(overlayMatches.length, 1, "Must render exactly 1 payroll-studio-overlay");
			assert.equal(CARTOON_EMOJI_RE.test(html), false, "Rendered UI must contain zero cartoon emojis");
			assert.ok(html.includes("bg-[var(--primary)]"));
		} finally {
			(globalThis as { document?: unknown }).document = prevDoc;
		}
	});

	it("payroll calculation engines produce clean numeric summaries without cartoon emojis", () => {
		const doc = CANONICAL_PAYROLL_DOCTORS[0]!;
		const summary = calculateDoctorPayrollSummary({
			orders: CANONICAL_DEMO_ORDERS,
			doctor: doc,
		});
		assert.equal(CARTOON_EMOJI_RE.test(summary.doctorName), false);
		assert.ok(summary.payoutKopecks >= 0);

		const staffResult = calculateDoctorStaffPayroll({
			employeeId: doc.id,
			employeeTabNumber: "ТБ-01",
			employeeFullName: doc.name,
			specialtyId: doc.specialtyId,
			periodStartIso: "2026-09-01",
			periodEndIso: "2026-09-30",
			services: [
				{
					id: "srv-1",
					serviceCode: "A16.07.002.001",
					serviceName: "Восстановление зуба пломбой",
					category: "therapy",
					amountKopecks: 500000,
					isPaid: true,
				},
			],
		});
		assert.equal(CARTOON_EMOJI_RE.test(JSON.stringify(staffResult)), false);
		assert.ok(staffResult.grossPayoutBeforeTaxKop >= 0);
	});
});
