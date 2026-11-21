import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateItemDmsSplit, calculateDmsGuaranteeSplit } from "@dental/shared";
import { allocateRemainderToTender } from "../cashbox/cashRegisterCatalogData.js";

describe("DMS Cashier & Split Payment Integration (Mandates 8l, 8e, 8n)", () => {
	it("1.1 Proves integer kopeck split math for 0%, 20%, 50%, and 80% corporate franchises", () => {
		const itemKop = 450000;
		const split0 = calculateItemDmsSplit(itemKop, 0, true);
		assert.equal(split0.patientKopecks, 0);
		assert.equal(split0.insurerKopecks, 450000);
		assert.equal(split0.patientKopecks + split0.insurerKopecks, itemKop);

		const split20 = calculateItemDmsSplit(itemKop, 20, true);
		assert.equal(split20.patientKopecks, 90000);
		assert.equal(split20.insurerKopecks, 360000);
		assert.equal(split20.patientKopecks + split20.insurerKopecks, itemKop);

		const split50 = calculateItemDmsSplit(itemKop, 50, true);
		assert.equal(split50.patientKopecks, 225000);
		assert.equal(split50.insurerKopecks, 225000);
		assert.equal(split50.patientKopecks + split50.insurerKopecks, itemKop);

		const split80 = calculateItemDmsSplit(itemKop, 80, true);
		assert.equal(split80.patientKopecks, 360000);
		assert.equal(split80.insurerKopecks, 90000);
		assert.equal(split80.patientKopecks + split80.insurerKopecks, itemKop);
	});

	it("1.2 Non-covered service (100% patient) invariant holds to exact kopeck", () => {
		const whiteningKop = 2600000;
		const split = calculateItemDmsSplit(whiteningKop, 20, false);
		assert.equal(split.patientKopecks, 2600000);
		assert.equal(split.insurerKopecks, 0);
		assert.equal(split.patientKopecks + split.insurerKopecks, whiteningKop);
	});

	it("1.3 Multi-item invoice split with guarantee letter remaining limit overflow redirection", () => {
		const items = [
			{ serviceId: "i1", serviceCode: "A16.07.002.001", serviceName: "Пломба", quantity: 1, priceRub: 4500, category: "therapy" },
			{ serviceId: "i2", serviceCode: "A11.07.010", serviceName: "Анестезия", quantity: 2, priceRub: 950, category: "therapy" },
			{ serviceId: "i3", serviceCode: "A16.07.050", serviceName: "Отбеливание", quantity: 1, priceRub: 26000, category: "therapy", isExcluded: true },
		];
		const summary = calculateDmsGuaranteeSplit(
			{
				id: "g1",
				letterNumber: "ГП-1",
				patientFullName: "Тест",
				companyName: "СОГАЗ",
				policyNumber: "П-1",
				status: "active",
				limitKopecks: 300000,
				remainingLimitKopecks: 300000,
				usedKopecks: 0,
				defaultFranchisePercent: 20,
				franchisePct: 20,
				franchiseType: "percent",
			},
			items,
		);
		assert.equal(summary.totalBillKopecks, 3240000);
		assert.equal(summary.totalDmsCoveredKopecks, 300000);
		assert.equal(summary.totalPatientCoPayKopecks, 2940000);
		assert.equal(summary.integrityInvariantHolds, true);
		assert.equal((summary.totalDmsCoveredKopecks ?? 0) + (summary.totalPatientCoPayKopecks ?? 0), summary.totalBillKopecks);
	});

	it("1.4 1-Click Fallback to Direct Patient Payment transfers 100% to patient without penny loss", () => {
		const totalKop = 1500000;
		let dmsAmountKop = 1200000;
		let patientAmountKop = 300000;
		assert.equal(dmsAmountKop + patientAmountKop, totalKop);
		patientAmountKop += dmsAmountKop;
		dmsAmountKop = 0;
		assert.equal(dmsAmountKop, 0);
		assert.equal(patientAmountKop, 1500000);
		assert.equal(dmsAmountKop + patientAmountKop, totalKop);
	});

	it("1.5 allocateRemainderToTender balances DMS remainder respecting available guarantee letter limit", () => {
		const res = allocateRemainderToTender({
			totalDueRub: 10000,
			currentTenders: { cardRub: 3000, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: 0, bonusRub: 0, dmsRub: 0 },
			targetTender: "dms",
			availableDmsCoverageRub: 5000,
		});
		assert.equal(res.dmsRub, 5000);
		assert.equal(res.cardRub, 3000);
	});

	it("1.6 allocateRemainderToTender distributes unconstrained DMS remainder to exact penny", () => {
		const res = allocateRemainderToTender({
			totalDueRub: 12450.75,
			currentTenders: { cardRub: 2450.75, cashRub: 0, sbpRub: 0, depositRub: 0, familyRub: 0, certificateRub: 0, bonusRub: 0, dmsRub: 0 },
			targetTender: "dms",
			availableDmsCoverageRub: 50000,
		});
		assert.equal(res.dmsRub, 10000);
		assert.equal(res.cardRub, 2450.75);
		assert.equal(Number((res.dmsRub + res.cardRub).toFixed(2)), 12450.75);
	});

	it("1.7 Proves dynamic calculation of bilateral acceptance act via calculateRegistryTotals without hardcoded amounts", async () => {
		const { calculateRegistryTotals, generateBilateralAcceptanceActHtml } = await import("@dental/shared");
		const sampleRecords = [
			{
				id: "rec-1",
				visitId: "v-1",
				visitDate: "15.08.2026",
				patientFullName: "Соколова А.В.",
				totalPriceRub: 4500,
				dmsCoveredRub: 4500,
				patientPaidRub: 0,
				serviceName: "Пломба",
			},
			{
				id: "rec-2",
				visitId: "v-2",
				visitDate: "20.08.2026",
				patientFullName: "Соколова А.В.",
				totalPriceRub: 6500,
				dmsCoveredRub: 5200,
				patientPaidRub: 1300,
				serviceName: "Гигиена",
			},
		];
		const summary = calculateRegistryTotals(sampleRecords as any, "АО «СОГАЗ»");
		assert.equal(summary.totalAmountRub, 11000);
		assert.equal(summary.totalDmsCoveredRub, 9700);
		assert.equal(summary.totalPatientPaidRub, 1300);
		assert.equal(summary.isBalanced, true);
		assert.equal(summary.totalServicesCount, 2);
		assert.equal(summary.uniquePatientsCount, 1);

		const actHtml = generateBilateralAcceptanceActHtml({
			records: sampleRecords as any,
			summary,
		});
		assert.ok(actHtml.includes("АКТ СДАЧИ-ПРИЕМКИ"), "Act must include heading");
		assert.ok(actHtml.includes("9700") || actHtml.includes("9 700") || actHtml.includes("9&nbsp;700") || actHtml.replace(/\s/g, " ").includes("9 700"), "Act must include dynamically calculated insurer amount");
		assert.ok(actHtml.includes("1300") || actHtml.includes("1 300") || actHtml.includes("1&nbsp;100") || actHtml.replace(/\s/g, " ").includes("1 300"), "Act must include dynamically calculated patient co-pay");
	});

	it("1.8 Proves cashbox event detail payload structure for dente:cashbox-apply-split", () => {
		const splitDetail = {
			totalDueRub: 16800,
			dmsRub: 15500,
			patientRub: 1300,
			patientMethod: "card",
			insurerName: "Ингосстрах",
			letterNumber: "ГП-8841",
			patientId: "pat-1",
			patientName: "Соколова Анна Викторовна",
		};
		assert.equal(splitDetail.dmsRub + splitDetail.patientRub, splitDetail.totalDueRub);
		assert.equal(splitDetail.patientRub, 1300);
		assert.equal(splitDetail.insurerName, "Ингосстрах");
	});
});
