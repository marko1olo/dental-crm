import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { DoctorShiftCashSection } from "../DoctorShiftCashSection";
import { MobileShiftBottomBar } from "../mobileCockpit/MobileShiftBottomBar";
import { MobileShiftHeroCard } from "../mobileCockpit/MobileShiftHeroCard";

function cleanSsrHtml(html: string): string {
	return html.replace(/<!--.*?-->/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
}

describe("Mandate 8e & 8n: Doctor Shift Role Separation Invariant", () => {
	it("renders DoctorShiftEarningsCard when userRole is 'doctor'", () => {
		const rawHtml = renderToString(
			<DoctorShiftCashSection
				totalRevenueRub={150000}
				doctorCommissionPct={35}
				estimatedDoctorPayoutRub={52500}
				doctorFullName="Д-р Иванов И.И."
				clinicName="ООО Денте"
				userRole="doctor"
				completedPatientsCount={5}
				totalAppointmentsCount={6}
			/>
		);
		const html = cleanSsrHtml(rawHtml);

		// Must render the clinical earnings card
		assert.ok(html.includes("doctor-shift-earnings-card"), "Must have doctor-shift-earnings-card testid");
		assert.ok(html.includes("Выработка и доход за смену"), "Must have earnings card title");
		assert.ok(html.includes("Д-р Иванов И.И."), "Must mention doctor name");
		assert.ok(html.includes("35% гонорар"), "Must display honorarium rate");
		assert.ok(html.includes("52 500"), "Must display estimated doctor payout");
		assert.ok(html.includes("150 000"), "Must display total service revenue");
		assert.ok(html.includes("5"), "Must display completed patients");
		assert.ok(html.includes("из 6"), "Must display total appointments");

		// STRICT PROHIBITION: Doctor MUST NOT see safe encashment or cash drawer counting
		assert.strictEqual(html.includes("Инкассация наличной выручки"), false, "Doctor must NOT see encashment");
		assert.strictEqual(html.includes("Денежный ящик"), false, "Doctor must NOT see cash drawer");
		assert.strictEqual(html.includes("Размен 5 000"), false, "Doctor must NOT see change float");
		assert.strictEqual(html.includes("Провести инкассацию"), false, "Doctor must NOT see encashment action button");
	});

	it("renders cashier operations when userRole is administrator", () => {
		const rawHtml = renderToString(
			<DoctorShiftCashSection
				totalRevenueRub={150000}
				doctorCommissionPct={35}
				estimatedDoctorPayoutRub={52500}
				doctorFullName="Д-р Иванов И.И."
				clinicName="ООО Денте"
				userRole="administrator"
				cashSummary={{
					totalRevenueRub: 150000,
					cashRub: 45000,
					cardRub: 75000,
					sbpRub: 30000,
					depositRub: 0,
				}}
			/>
		);
		const html = cleanSsrHtml(rawHtml);

		// Admin sees cashier controls and cash breakdown
		assert.ok(html.includes("Наличные в кассе"), "Admin must see cash breakdown");
		assert.ok(html.includes("Инкассация"), "Admin must see encashment section");
		assert.ok(html.includes("Денежный ящик"), "Admin must see cash drawer");
	});

	it("Mobile: hides cash-in/out button when userRole is 'doctor'", () => {
		const rawHtml = renderToString(
			<MobileShiftBottomBar
				isShiftOpen={true}
				onToggleShift={() => {}}
				userRole="doctor"
			/>
		);
		const html = cleanSsrHtml(rawHtml);

		// Doctor does not see "Касса" button (btn-mobile-cash-ops)
		assert.strictEqual(html.includes("btn-mobile-cash-ops"), false, "Doctor must not see cash ops button");
		// Doctor sees "Расходники" and primary toggle
		assert.ok(html.includes("btn-mobile-consumables"), "Doctor must see consumables");
		assert.ok(html.includes("btn-mobile-primary-shift-toggle"), "Doctor must see shift toggle button");
	});

	it("Mobile: shows cash-in/out button when userRole is undefined or administrator", () => {
		const rawHtml = renderToString(
			<MobileShiftBottomBar
				isShiftOpen={true}
				onToggleShift={() => {}}
				userRole="administrator"
			/>
		);
		const html = cleanSsrHtml(rawHtml);

		assert.ok(html.includes("btn-mobile-cash-ops"), "Admin must see cash ops button");
		assert.ok(html.includes("btn-mobile-consumables"), "Admin must see consumables");
	});

	it("Mobile Hero: hides cash drawer channels when userRole is 'doctor'", () => {
		const rawHtml = renderToString(
			<MobileShiftHeroCard
				doctorName="Д-р Смирнова Е.В."
				totalRevenueRub={50000}
				cashInDrawerRub={20000}
				cardSumRub={20000}
				sbpSumRub={10000}
				doctorCommissionPct={30}
				estimatedDoctorPayoutRub={15000}
				userRole="doctor"
			/>
		);
		const html = cleanSsrHtml(rawHtml);

		assert.ok(html.includes("Выручка за день"), "Must show daily revenue");
		assert.ok(html.includes("Начислено врачу (30%):"), "Must show doctor payout strip");
		// Channels grid is hidden for doctor
		assert.strictEqual(html.includes("mobile-shift-channels-grid"), false, "Must hide cash drawer channels for doctor");
	});
});
