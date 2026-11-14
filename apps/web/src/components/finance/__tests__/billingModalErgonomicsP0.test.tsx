import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { Billing1CExportModal } from "../Billing1CExportModal";

describe("Cognitive UX Refactoring: Billing1CExportModal (P0 Roadmap)", () => {
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
