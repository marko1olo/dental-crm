/**
 * patientCareInstructionsAndBilling.test.ts
 *
 * Automated tests for:
 * 1. Post-visit electronic care memos & 1-click WhatsApp messaging.
 * 2. QR code generator for saving care memos to mobile.
 * 3. Human-friendly billing breakdowns (no complex Latin/Order 804n jargon).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	generateCareMemo,
	buildWhatsAppLink,
	translateMedicalTermToFriendly,
	groupServicesIntoFriendlyBlocks,
	generateFriendlyBillingWhatsAppMessage,
	DEFAULT_CARIES_RECOMMENDATIONS,
} from "../patientCareInstructionsEngine";

describe("Patient Care Instructions & Friendly Billing Engine", () => {
	describe("generateCareMemo", () => {
		it("generates personalized post-visit care memo with exact WhatsApp pattern and QR code", () => {
			const memo = generateCareMemo({
				patientName: "Алексей Смирнов",
				patientPhone: "+7 (999) 777-66-55",
				toothFdi: "16",
				procedureName: "Лечение глубокого кариеса",
				doctorName: "Кузнецов П. С.",
				doctorSpecialty: "Врач-стоматолог терапевт",
				clinicName: "Стоматологическая клиника ДЕНТЕ",
				clinicPhone: "+7 (495) 789-01-23",
				clinicEmergencyPhone: "+7 (999) 123-45-67",
			});

			assert.equal(memo.patientName, "Алексей Смирнов");
			assert.equal(memo.toothFdi, "16");
			assert.equal(memo.doctorName, "Кузнецов П. С.");

			// WhatsApp text format verification
			assert.ok(
				memo.whatsAppText.includes("Уважаемый(ая) Алексей Смирнов, рекомендации после лечения зуба 16:"),
				"WhatsApp text must match exact user format requirement",
			);
			assert.ok(memo.whatsAppText.includes("Приложить холод"), "Includes cold compress advice");
			assert.ok(memo.whatsAppText.includes("Обезболивающее"), "Includes medication advice");
			assert.ok(memo.whatsAppText.includes("Не есть горячее"), "Includes eating restriction");
			assert.ok(memo.whatsAppText.includes("Стоматологическая клиника ДЕНТЕ"), "Includes clinic name");

			// WhatsApp deep link
			assert.ok(memo.whatsAppDeepLink.startsWith("https://wa.me/79997776655?text="));

			// QR Code SVG verification
			assert.ok(memo.qrCodeSvg.includes("<svg"), "Must produce valid SVG XML");
			assert.ok(memo.qrCodeSvg.includes("</svg>"));

			// Recommendation items check
			assert.ok(memo.recommendations.length >= 5);
			const coldRec = memo.recommendations.find((r) => r.id === "cold_compress");
			assert.ok(coldRec);
			assert.equal(coldRec.icon, "🧊");
			assert.equal(coldRec.title, "Приложить холод на 15 минут");

			const medRec = memo.recommendations.find((r) => r.id === "painkiller");
			assert.ok(medRec);
			assert.equal(medRec.icon, "💊");
			assert.ok(medRec.title.includes("Обезболивающее"));

			const noHotRec = memo.recommendations.find((r) => r.id === "no_hot_food");
			assert.ok(noHotRec);
			assert.equal(noHotRec.icon, "🚫");
			assert.equal(noHotRec.title, "Не есть горячее 2 часа");
		});

		it("handles missing optional values with robust defaults", () => {
			const memo = generateCareMemo({
				patientName: "Анна",
				toothFdi: "24",
			});

			assert.ok(memo.whatsAppText.includes("Уважаемый(ая) Анна, рекомендации после лечения зуба 24:"));
			assert.ok(memo.qrCodeSvg.length > 50);
		});
	});

	describe("buildWhatsAppLink", () => {
		it("normalizes Russian phone numbers to international format and encodes URI", () => {
			const link1 = buildWhatsAppLink("8 (916) 123-45-67", "Привет!");
			assert.equal(link1, "https://wa.me/79161234567?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82!");

			const link2 = buildWhatsAppLink("+7 (999) 000-11-22", "Тест");
			assert.equal(link2, "https://wa.me/79990001122?text=%D0%A2%D0%B5%D1%81%D1%82");
		});
	});

	describe("translateMedicalTermToFriendly", () => {
		it("translates Order 804n / technical nomenclature into simple Russian explanations", () => {
			const cariesRes = translateMedicalTermToFriendly(
				"A16.07.002.001 Восстановление зуба пломбой (нанокомпозит Filtek)",
				"16",
			);
			assert.equal(cariesRes.categoryGroup, "caries");
			assert.equal(cariesRes.groupIcon, "🦷");
			assert.equal(cariesRes.friendlyName, "Лечение кариеса и световая пломба (зуб №16)");
			assert.ok(cariesRes.plainDescriptionRu.includes("кариеса"));

			const anesthesiaRes = translateMedicalTermToFriendly(
				"B01.003.004.001 Инфильтрационная анестезия Артикаин",
				"16",
			);
			assert.equal(anesthesiaRes.categoryGroup, "anesthesia");
			assert.equal(anesthesiaRes.groupIcon, "💉");
			assert.equal(anesthesiaRes.friendlyName, "Обезболивание (анестезия) (зуб №16)");
			assert.ok(anesthesiaRes.plainDescriptionRu.includes("безболезненности"));

			const xRayRes = translateMedicalTermToFriendly(
				"A06.07.001 Прицельный внутриротовой радиовизиографический снимок",
				"16",
			);
			assert.equal(xRayRes.categoryGroup, "xray");
			assert.equal(xRayRes.groupIcon, "📷");
			assert.equal(xRayRes.friendlyName, "Снимок зуба (радиовизиография) (зуб №16)");
		});
	});

	describe("groupServicesIntoFriendlyBlocks", () => {
		it("correctly groups multi-service invoice into transparent categories with totals and percentages", () => {
			const services = [
				{
					id: "s-1",
					name: "Восстановление зуба пломбой Filtek Ultimate",
					code804n: "A16.07.002.001",
					toothNumber: "16",
					quantity: 1,
					priceRub: 6000,
					category: "therapy",
				},
				{
					id: "s-2",
					name: "Инфильтрационная анестезия Ультракаин",
					code804n: "B01.003.004.001",
					toothNumber: "16",
					quantity: 1,
					priceRub: 1500,
					category: "therapy",
				},
				{
					id: "s-3",
					name: "Прицельная рентгенография зуба",
					code804n: "A06.07.001",
					toothNumber: "16",
					quantity: 1,
					priceRub: 500,
					category: "diagnostic",
				},
				{
					id: "s-4",
					name: "Комплексная профессиональная гигиена Air-Flow",
					code804n: "A16.07.051",
					quantity: 1,
					priceRub: 4000,
					category: "hygiene",
				},
			];

			const breakdown = groupServicesIntoFriendlyBlocks(services);

			assert.equal(breakdown.totalAmountRub, 12000);
			assert.equal(breakdown.groups.length, 4);

			const cariesGroup = breakdown.groups.find((g) => g.categoryGroup === "caries");
			assert.ok(cariesGroup);
			assert.equal(cariesGroup.categoryGroupRu, "Лечение кариеса и пломбирование");
			assert.equal(cariesGroup.subtotalRub, 6000);
			assert.equal(cariesGroup.percentageOfTotal, 50);

			const anesthesiaGroup = breakdown.groups.find((g) => g.categoryGroup === "anesthesia");
			assert.ok(anesthesiaGroup);
			assert.equal(anesthesiaGroup.categoryGroupRu, "Обезболивание (анестезия)");
			assert.equal(anesthesiaGroup.subtotalRub, 1500);

			const xRayGroup = breakdown.groups.find((g) => g.categoryGroup === "xray");
			assert.ok(xRayGroup);
			assert.equal(xRayGroup.categoryGroupRu, "Снимки и диагностика");
			assert.equal(xRayGroup.subtotalRub, 500);

			const hygieneGroup = breakdown.groups.find((g) => g.categoryGroup === "hygiene");
			assert.ok(hygieneGroup);
			assert.equal(hygieneGroup.categoryGroupRu, "Профессиональная чистка и гигиена");
			assert.equal(hygieneGroup.subtotalRub, 4000);
		});
	});

	describe("generateFriendlyBillingWhatsAppMessage", () => {
		it("formats readable WhatsApp message without complex medical jargon", () => {
			const services = [
				{
					id: "s-1",
					name: "Восстановление зуба пломбой",
					toothNumber: "16",
					quantity: 1,
					priceRub: 5000,
				},
				{
					id: "s-2",
					name: "Анестезия Артикаин",
					quantity: 1,
					priceRub: 1000,
				},
			];

			const breakdown = groupServicesIntoFriendlyBlocks(services);
			const msg = generateFriendlyBillingWhatsAppMessage(
				"Мария Петрова",
				breakdown,
				"Стоматология ДЕНТЕ",
				"+7 (495) 789-01-23",
			);

			assert.ok(msg.includes("Мария Петрова"));
			assert.ok(msg.includes("Детализация"));
			assert.ok(msg.includes("Стоматология ДЕНТЕ"));
			assert.ok(msg.includes("Лечение кариеса и пломбирование"));
			assert.ok(msg.includes("Обезболивание (анестезия)"));
			assert.ok(msg.includes(breakdown.totalAmountRubFormatted));
		});
	});
});
