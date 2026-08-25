import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type CompletedWorksActParams,
	type InvoiceServiceItem,
	compileCompletedWorksAct,
	generateCompletedActAndWarrantyHtml,
	resolveServiceWarranty,
} from "../invoiceEngine";

describe("Invoice Engine & Warranty Certificate Tests (A4)", () => {
	it("1.1 resolveServiceWarranty — Classifies therapy, orthopedics, implants, and orthodontics", () => {
		const therapyItem: InvoiceServiceItem = {
			id: "1",
			name: "Лечение глубокого кариеса светоотверждаемым композитом",
			toothNumber: 16,
			quantity: 1,
			priceRub: 4500,
		};
		const therapyWarranty = resolveServiceWarranty(therapyItem);
		assert.equal(therapyWarranty.warrantyMonths, 12);
		assert.ok(therapyWarranty.categoryName.includes("Терапевтическое"));

		const crownItem: InvoiceServiceItem = {
			id: "2",
			name: "Коронка из диоксида циркония Prettau",
			toothNumber: 26,
			quantity: 1,
			priceRub: 22000,
		};
		const crownWarranty = resolveServiceWarranty(crownItem);
		assert.equal(crownWarranty.warrantyMonths, 24);
		assert.ok(crownWarranty.categoryName.includes("Ортопедические"));

		const implantItem: InvoiceServiceItem = {
			id: "3",
			name: "Установка дентального имплантата Straumann BLX",
			toothNumber: 46,
			quantity: 1,
			priceRub: 55000,
		};
		const implantWarranty = resolveServiceWarranty(implantItem);
		assert.equal(implantWarranty.warrantyMonths, 60);
		assert.ok(implantWarranty.categoryName.includes("имплантация"));
	});

	it("1.2 compileCompletedWorksAct — Computes exact kopecks, discounts, and grouped warranty obligations", () => {
		const params: CompletedWorksActParams = {
			actNumber: "АКТ-2026-1001",
			contractNumber: "Д-2026/042",
			contractDateIso: "2026-08-20T10:00:00.000Z",
			actDateIso: "2026-08-25T12:00:00.000Z",
			clinic: {
				name: "Стоматологическая клиника ДЕНТЕ",
				legalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				inn: "7701234567",
				licenseNumber: "ЛО41-01137-77/00368421",
				address: "г. Москва, ул. Клиническая, д. 10",
			},
			patient: {
				fullName: "Смирнов Алексей Викторович",
				birthDate: "1985-06-15",
				passportData: "45 14 № 892100",
				medicalCardNumber: "043/у-892",
			},
			doctor: {
				fullName: "Д-р Петров В. И.",
				specialty: "Стоматолог-хирург-имплантолог",
			},
			items: [
				{
					id: "srv-1",
					name: "Установка имплантата Straumann",
					code804n: "A16.07.054",
					toothNumber: "46",
					quantity: 1,
					priceRub: 50000,
					discountRub: 5000,
					category: "implantology",
				},
				{
					id: "srv-2",
					name: "Коронка из диоксида циркония",
					code804n: "A16.07.004",
					toothNumber: "46",
					quantity: 1,
					priceRub: 25000,
					category: "orthopedics",
				},
			],
		};

		const summary = compileCompletedWorksAct(params);

		assert.equal(summary.totalGrossRub, 75000);
		assert.equal(summary.totalDiscountRub, 5000);
		assert.equal(summary.totalNetRub, 70000);
		assert.equal(summary.totalNetKopecks, 7000000);
		assert.equal(summary.totalNetRubFormatted, "70000.00");
		assert.ok(summary.totalInWords.includes("Семьдесят тысяч"));
		assert.equal(summary.warrantyTerms.length, 2);
	});

	it("1.3 generateCompletedActAndWarrantyHtml — Generates valid statutory A4 HTML with license and requisites", () => {
		const params: CompletedWorksActParams = {
			actNumber: "АКТ-2026-9999",
			contractNumber: "Д-2026/999",
			clinic: {
				name: "Стоматологическая клиника ДЕНТЕ",
				legalName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
				inn: "7701234567",
				licenseNumber: "ЛО41-01137-77/00368421",
				address: "г. Москва, Ломоносовский просп., д. 24",
			},
			patient: {
				fullName: "Кузнецова Анна Павловна",
			},
			doctor: {
				fullName: "Д-р Соколова Е. М.",
			},
			items: [
				{
					id: "srv-1",
					name: "Лечение кариеса",
					code804n: "A16.07.002",
					toothNumber: "11",
					quantity: 1,
					priceRub: 6000,
				},
			],
		};

		const html = generateCompletedActAndWarrantyHtml(params);

		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("ЛО41-01137-77/00368421"));
		assert.ok(html.includes("ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"));
		assert.ok(html.includes("Кузнецова Анна Павловна"));
		assert.ok(html.includes("A16.07.002"));
		assert.ok(html.includes("ГАРАНТИЙНЫЙ ТАЛОН И ОБЯЗАТЕЛЬСТВА КЛИНИКИ"));
		assert.ok(html.includes("ОПЛАЧЕНО"));
		assert.ok(html.includes("М.П."));
	});
});
