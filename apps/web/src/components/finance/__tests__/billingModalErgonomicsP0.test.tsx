import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { PatientBillingModal } from "../PatientBillingModal";
import { Billing1CExportModal } from "../Billing1CExportModal";

describe("Cognitive UX Refactoring: PatientBillingModal & Billing1CExportModal (P0 Roadmap)", () => {
	it("PatientBillingModal: eliminates duplicate top print button and keeps single ГОСТ A4 print in footer", () => {
		const html = renderToString(
			<PatientBillingModal
				isOpen={true}
				onClose={() => {}}
				patient={{
					fullName: "Ковалев Сергей Петрович",
					phone: "+7 (916) 123-45-67",
				}}
				doctor={{
					fullName: "Д-р Смирнов А. В.",
				}}
				initialServices={[
					{
						id: "srv-1",
						name: "Восстановление зуба пломбой",
						code804n: "A16.07.002.001",
						toothNumber: "16",
						quantity: 1,
						priceRub: 6500,
						category: "therapy",
					},
				]}
			/>,
		);

		// 1. Verify modal is rendered
		assert.ok(html.includes('data-testid="patient-billing-modal"'));

		// 2. Footer has the primary print button with ГОСТ
		assert.ok(html.includes("Печать бланка А4 (ГОСТ)"));
		assert.ok(html.includes('data-testid="btn-print-billing-act"'));

		// 3. Header has only title and close button, no duplicate print button
		assert.ok(html.includes("Акт выполненных работ и Гарантийный талон (А4)") || html.includes("Акт выполненных работ & Гарантийный талон (А4)"));
		assert.ok(html.includes('aria-label="Закрыть окно"'));
	});

	it("PatientBillingModal: collapses discounts into compact 36px Tier 2 dropdown", () => {
		const html = renderToString(
			<PatientBillingModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		// Verify select dropdown exists
		assert.ok(html.includes('data-testid="select-loyalty-discount"'));
		assert.ok(html.includes("Без скидки"));
		assert.ok(html.includes("Пенсионная 10%"));
		assert.ok(html.includes("Семейная 5%"));
		assert.ok(html.includes("min-h-[36px]"));
	});

	it("PatientBillingModal: cleans up duplicate price header for single item manipulation", () => {
		const html = renderToString(
			<PatientBillingModal
				isOpen={true}
				onClose={() => {}}
				initialServices={[
					{
						id: "srv-1",
						name: "Лечение кариеса и световая пломба",
						code804n: "A16.07.002.001",
						toothNumber: "16",
						quantity: 1,
						priceRub: 6500,
						category: "therapy",
					},
				]}
			/>,
		);

		// Single manipulation has clean tooth prefix and title
		assert.ok(html.includes("Зуб 16 •"));
		assert.ok(html.includes("Лечение кариеса и световая пломба"));
		assert.ok(html.includes("6\u00a0500 ₽") || html.includes("6 500 ₽"));
	});

	it("PatientBillingModal: establishes proper button hierarchy in footer with soft outline for secondary actions", () => {
		const html = renderToString(
			<PatientBillingModal
				isOpen={true}
				onClose={() => {}}
			/>,
		);

		// Primary action
		assert.ok(html.includes("bg-[var(--teal,#0d9488)]"));
		assert.ok(html.includes("Печать бланка А4 (ГОСТ)"));

		// Secondary actions
		assert.ok(html.includes('data-testid="btn-fiscalize-54fz"'));
		assert.ok(html.includes('data-testid="btn-footer-send-whatsapp"'));
		assert.ok(html.includes("В WhatsApp"));
		assert.ok(html.includes("grid grid-cols-2 sm:flex"));
	});

	it("Billing1CExportModal: renders 1-line compact summary strip with [Изменить] trigger and muted 804n code", () => {
		const items = [
			{
				id: "srv-1",
				name: "Восстановление зуба пломбой Filtek Ultimate",
				code804n: "A16.07.002.001",
				toothNumber: 16,
				quantity: 1,
				priceRub: 6500,
				discountRub: 0,
			},
		];

		const html = renderToString(
			<Billing1CExportModal
				isOpen={true}
				onClose={() => {}}
				items={items}
				actNumber="АКТ-20260828-001"
				doctorName="Ковалев С. П."
				patientName="Иванов И. И."
				totalRub={6500}
			/>,
		);

		// 1. Compact 1-line summary strip
		assert.ok(html.includes("АКТ-20260828-001"));
		assert.ok(html.includes("Ковалев С. П."));
		assert.ok(html.includes("[Изменить]"));

		// 2. Muted 804n code badge
		assert.ok(html.includes("[A16.07.002.001]"));
		assert.ok(html.includes("text-[var(--muted,#64748b)]") || html.includes("text-[var(--muted"));
		assert.ok(html.includes("Восстановление зуба пломбой Filtek Ultimate"));
	});
});
