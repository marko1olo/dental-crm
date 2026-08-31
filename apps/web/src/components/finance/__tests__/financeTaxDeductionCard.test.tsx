import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { FinanceTaxDeductionCard } from "../FinanceTaxDeductionCard";

describe("FinanceTaxDeductionCard Component", () => {
	it("renders tax deduction eligible amount with pb-3 safe padding and relaxed leading", () => {
		const html = renderToString(
			<FinanceTaxDeductionCard
				taxDeductionEligibleRub={150000}
				money={(val) => `${val?.toLocaleString("ru-RU")} ₽`}
			/>
		);

		assert.ok(html.includes("data-testid=\"finance-tax-deduction-card\""), "Should render test id");
		assert.ok(html.includes("Вычет"), "Should render title");
		assert.ok(html.includes("150"), "Should render 150k amount");
		assert.ok(html.includes("pb-3"), "Should contain pb-3 safe bottom padding");
		assert.ok(html.includes("leading-relaxed"), "Should contain leading-relaxed typography");
		assert.ok(html.includes("медицинские услуги, пригодные для справки"), "Should render description");
	});

	it("renders fallback dash when amount is null", () => {
		const html = renderToString(
			<FinanceTaxDeductionCard taxDeductionEligibleRub={null} />
		);

		assert.ok(html.includes("—"), "Should render fallback dash");
	});
});
