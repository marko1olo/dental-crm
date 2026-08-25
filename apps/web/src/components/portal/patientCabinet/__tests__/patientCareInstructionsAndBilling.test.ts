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
import {
	calculatePatientTaxDeduction,
	generatePatientDentalPassport,
	formatFdiToothPlainRussian,
	type PatientPersonalCabinetData,
} from "../patientCabinetEngine";

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

	describe("calculatePatientTaxDeduction", () => {
		it("calculates 13% tax refund with 150,000 RUB limit for Code 01 and no limit for Code 02", () => {
			const invoices = [
				{
					id: "inv-1",
					invoiceNumber: "СЧ-001",
					issueDateIso: "2026-03-10",
					dueDateIso: "2026-03-10",
					titleRu: "Терапевтическое лечение",
					totalAmountRub: 200000,
					paidAmountRub: 200000,
					remainingAmountRub: 0,
					status: "paid" as const,
					items: [
						{
							code: "A16.07.002",
							titleRu: "Лечение кариеса",
							quantity: 1,
							priceRub: 200000,
							totalRub: 200000,
							toothFdi: "16",
						},
					],
				},
				{
					id: "inv-2",
					invoiceNumber: "СЧ-002",
					issueDateIso: "2026-05-15",
					dueDateIso: "2026-05-15",
					titleRu: "Дентальная имплантация Osstem",
					totalAmountRub: 100000,
					paidAmountRub: 100000,
					remainingAmountRub: 0,
					status: "paid" as const,
					items: [
						{
							code: "A16.07.054.001",
							titleRu: "Внутрикостная дентальная имплантация Osstem",
							quantity: 1,
							priceRub: 100000,
							totalRub: 100000,
							toothFdi: "26",
						},
					],
				},
			];

			const result = calculatePatientTaxDeduction(invoices, 2026);

			assert.equal(result.taxYear, 2026);
			assert.equal(result.totalSpentRub, 300000);
			assert.equal(result.code01SpentRub, 200000);
			assert.equal(result.isCode01Capped, true, "Code 01 should be capped at 150,000 RUB");
			assert.equal(result.code01EligibleRub, 150000);
			assert.equal(result.code01RefundRub, 19500, "13% of 150,000 is 19,500 RUB");

			assert.equal(result.code02SpentRub, 100000);
			assert.equal(result.code02RefundRub, 13000, "13% of 100,000 is 13,000 RUB (no limit)");

			assert.equal(result.totalRefundRub, 32500, "19,500 + 13,000 = 32,500 RUB");
			assert.ok(result.headerBannerTextRu.includes("Потрачено на лечение:"));
			assert.ok(result.headerBannerTextRu.includes("Возврат от налоговой:"));
			assert.equal(result.guideSteps.length, 3);
			assert.ok(result.guideSteps[0]?.titleRu.includes("1. Скачайте готовую справку у нас"));
			assert.ok(result.guideSteps[1]?.titleRu.includes("2. Прикрепите в ЛК nalog.ru"));
			assert.ok(result.guideSteps[2]?.titleRu.includes("3. Получите деньги на карту"));
		});
	});

	describe("generatePatientDentalPassport & formatFdiToothPlainRussian", () => {
		it("formats tooth FDI 16 into plain Russian anatomy and builds detailed passport cards", () => {
			const tooth16Info = formatFdiToothPlainRussian("16");
			assert.equal(tooth16Info.quadrantRu, "верхний правый");
			assert.equal(tooth16Info.toothTypeRu, "жевательный");
			assert.equal(tooth16Info.anatomyRu, "верхний правый жевательный");

			const tooth21Info = formatFdiToothPlainRussian("21");
			assert.equal(tooth21Info.quadrantRu, "верхний левый");
			assert.equal(tooth21Info.toothTypeRu, "центральный резец");

			const mockData = {
				patientId: "p-1",
				fullName: "Алексей Смирнов",
				phone: "+7 999 123-45-67",
				cardNumber: "043-1234",
				curatingDoctor: "Д-р Кузнецов П. С.",
				loyaltyBonusBalance: 5000,
				loyaltyTierRu: "Золотой (10%)" as const,
				cashbackEarnedRub: 10000,
				invoices: [],
				appointments: [],
				treatmentPlans: [],
				consents: [],
				warranties: [
					{
						certificateId: "WAR-01",
						issueDateIso: "2026-06-15",
						expirationDateIso: "2028-06-15",
						adjustedWarrantyMonths: 24,
						doctorName: "Д-р Смирнов А. В.",
						status: "active" as const,
						verificationUrl: "https://dente.ru/war/01",
						nextCheckupDueDateIso: "2026-12-15",
						checkupIntervalMonths: 6,
						checkupScheduleCount: 4,
						items: [
							{
								toothFdi: "16",
								workTitleRu: "Световая пломба Filtek Ultimate",
								materialName: "Filtek Ultimate",
								manufacturer: "3M ESPE",
								lotNumber: "LOT-9988",
							},
						],
					},
				],
			};

			const passport = generatePatientDentalPassport(mockData as any);

			assert.equal(passport.patientName, "Алексей Смирнов");
			assert.equal(passport.totalTreatedTeethCount, 1);
			assert.equal(passport.activeGuaranteesCount, 1);
			assert.equal(passport.entries.length, 1);

			const entry16 = passport.entries[0]!;
			assert.equal(entry16.toothFdi, "16");
			assert.equal(entry16.anatomyRu, "верхний правый жевательный");
			assert.equal(entry16.warrantyMonths, 24);
			assert.equal(entry16.isWarrantyActive, true);
			assert.ok(entry16.plainSummaryRu.includes("Зуб 16: верхний правый жевательный — установлена пломба Filtek Ultimate, гарантия 24 мес."));
		});
	});
});
