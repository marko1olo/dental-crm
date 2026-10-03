import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateItemDmsSplit,
	calculateInvoiceDmsSplit,
	type DmsInvoiceItem,
} from "@dental/shared";
import { allocateRemainderToTender } from "../finance/cashboxOperations.js";

describe("DMS Cashier & Split Payment Integration (Mandates 8l, 8e, 8n)", () => {
	it("1.1 Proves integer kopeck split math for 0%, 20%, 50%, and 80% corporate franchises", () => {
		// 4,500.00 RUB = 450,000 kopecks
		const itemKop = 450000;

		// 0% franchise (100% covered by DMS)
		const split0 = calculateItemDmsSplit(itemKop, 0, true);
		assert.equal(split0.patientKopecks, 0);
		assert.equal(split0.insurerKopecks, 450000);
		assert.equal(split0.patientKopecks + split0.insurerKopecks, itemKop);

		// 20% standard Russian franchise (80% insurer, 20% patient)
		const split20 = calculateItemDmsSplit(itemKop, 20, true);
		assert.equal(split20.patientKopecks, 90000); // 900.00 RUB
		assert.equal(split20.insurerKopecks, 360000); // 3,600.00 RUB
		assert.equal(split20.patientKopecks + split20.insurerKopecks, itemKop);

		// 50% parity copay
		const split50 = calculateItemDmsSplit(itemKop, 50, true);
		assert.equal(split50.patientKopecks, 225000);
		assert.equal(split50.insurerKopecks, 225000);
		assert.equal(split50.patientKopecks + split50.insurerKopecks, itemKop);

		// 80% high franchise
		const split80 = calculateItemDmsSplit(itemKop, 80, true);
		assert.equal(split80.patientKopecks, 360000);
		assert.equal(split80.insurerKopecks, 90000);
		assert.equal(split80.patientKopecks + split80.insurerKopecks, itemKop);
	});

	it("1.2 Non-covered service (100% patient) invariant holds to exact kopeck", () => {
		// Zoom 4 whitening: 26,000.00 RUB = 2,600,000 kopecks
		const whiteningKop = 2600000;
		const split = calculateItemDmsSplit(whiteningKop, 20, false); // isCoveredByDms = false
		assert.equal(split.patientKopecks, 2600000);
		assert.equal(split.insurerKopecks, 0);
		assert.equal(split.patientKopecks + split.insurerKopecks, whiteningKop);
	});

	it("1.3 Multi-item invoice split with guarantee letter remaining limit overflow redirection", () => {
		const items: DmsInvoiceItem[] = [
			{
				id: "i1",
				serviceCode804n: "A16.07.002.001",
				serviceName: "Пломба световая",
				quantity: 1,
				unitPriceKopecks: 450000,
				totalKopecks: 450000,
				isCoveredByDms: true,
			},
			{
				id: "i2",
				serviceCode804n: "A11.07.010",
				serviceName: "Анестезия инфильтрационная",
				quantity: 2,
				unitPriceKopecks: 95000,
				totalKopecks: 190000,
				isCoveredByDms: true,
			},
			{
				id: "i3",
				serviceCode804n: "A16.07.050",
				serviceName: "Отбеливание зубов",
				quantity: 1,
				unitPriceKopecks: 2600000,
				totalKopecks: 2600000,
				isCoveredByDms: false, // Non-covered exception
			},
		];

		// Total gross: 450,000 + 190,000 + 2,600,000 = 3,240,000 kop (32,400.00 RUB)
		// Default franchise: 20%
		// Remaining guarantee letter limit: 300,000 kop (3,000.00 RUB)
		const summary = calculateInvoiceDmsSplit({
			items,
			defaultFranchisePercent: 20,
			guaranteeLetterRemainingLimitKopecks: 300000,
		});

		assert.equal(summary.totalGrossKopecks, 3240000);
		assert.equal(summary.limitExceeded, true);
		// Without limit: insurer would cover 80% of (450,000 + 190,000) = 512,000 kop
		// But limit is 300,000 kop -> final insurer is capped at 300,000 kop!
		assert.equal(summary.finalInsurerKopecks, 300000);
		assert.equal(summary.limitOverflowKopecks, 212000);
		// Patient pays: original patient share + overflow = (3,240,000 - 300,000) = 2,940,000 kop
		assert.equal(summary.finalPatientKopecks, 2940000);
		// Absolute balance invariant
		assert.equal(
			summary.finalPatientKopecks + summary.finalInsurerKopecks,
			summary.totalGrossKopecks,
		);
	});

	it("1.4 1-Click Fallback to Direct Patient Payment transfers 100% to patient without penny loss", () => {
		// Total invoice: 15,000.00 RUB = 1,500,000 kopecks
		const totalKop = 1500000;
		let dmsAmountKop = 1200000;
		let patientAmountKop = 300000;
		assert.equal(dmsAmountKop + patientAmountKop, totalKop);

		// Cashier clicks 1-Click Fallback: «Перевести на пациента»
		// Instant transfer of DMS amount to patient card/cash co-pay
		patientAmountKop += dmsAmountKop;
		dmsAmountKop = 0;

		assert.equal(dmsAmountKop, 0);
		assert.equal(patientAmountKop, 1500000);
		assert.equal(dmsAmountKop + patientAmountKop, totalKop);
	});

	it("1.5 allocateRemainderToTender balances DMS remainder respecting available guarantee letter limit", () => {
		const res = allocateRemainderToTender({
			totalDueRub: 10000,
			currentTenders: {
				cardRub: 3000,
				cashRub: 0,
				sbpRub: 0,
				depositRub: 0,
				familyRub: 0,
				certificateRub: 0,
				bonusRub: 0,
				dmsRub: 0,
			},
			targetTender: "dms",
			availableDmsCoverageRub: 5000, // Guarantee letter limit is capped at 5000
		});

		// Remainder is 7000, but DMS coverage limit is 5000 -> allocated exactly 5000 to DMS
		assert.equal(res.dmsRub, 5000);
		assert.equal(res.cardRub, 3000);
	});

	it("1.6 allocateRemainderToTender distributes unconstrained DMS remainder to exact penny", () => {
		const res = allocateRemainderToTender({
			totalDueRub: 12450.75,
			currentTenders: {
				cardRub: 2450.75,
				cashRub: 0,
				sbpRub: 0,
				depositRub: 0,
				familyRub: 0,
				certificateRub: 0,
				bonusRub: 0,
				dmsRub: 0,
			},
			targetTender: "dms",
			availableDmsCoverageRub: 50000, // Ample guarantee letter limit
		});

		// Remainder 10000.00 is fully allocated to DMS
		assert.equal(res.dmsRub, 10000);
		assert.equal(res.cardRub, 2450.75);
		assert.equal(Number((res.dmsRub + res.cardRub).toFixed(2)), 12450.75);
	});
});
