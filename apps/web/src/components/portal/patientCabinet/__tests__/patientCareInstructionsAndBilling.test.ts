/**
 * patientCareInstructionsAndBilling.test.ts
 *
 * Automated tests for:
 * 1. Multi-intervention electronic post-op care generator (caries, extraction, sinus lift, implantation, endo, whitening, ortho, hygiene).
 * 2. 1-click WhatsApp & SMS deep link dispatch.
 * 3. A4 printable medical care memo generation with clinic branding and QR codes.
 * 4. Human-friendly non-Latin billing breakdowns (54-FZ & anti-jargon).
 * 5. 13% tax deduction & dental passport.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	generateCareMemo,
	buildWhatsAppLink,
	buildSmsLink,
	generateCareMemoSmsText,
	generateCareMemoPrintHtml,
	detectInterventionTypeFromProcedure,
	translateMedicalTermToFriendly,
	groupServicesIntoFriendlyBlocks,
	generateFriendlyBillingWhatsAppMessage,
	CARE_PRESETS_MAP,
	type CareInterventionType,
} from "../patientCareInstructionsEngine";
import {
	calculatePatientTaxDeduction,
	generatePatientDentalPassport,
	formatFdiToothPlainRussian,
	type PatientPersonalCabinetData,
	type PatientInvoiceItem,
} from "../patientCabinetEngine";

describe("Patient Care Instructions & Friendly Billing Engine", () => {
	describe("detectInterventionTypeFromProcedure", () => {
		it("detects surgical extraction accurately", () => {
			assert.equal(detectInterventionTypeFromProcedure("Сложное удаление зуба мудрости"), "extraction");
			assert.equal(detectInterventionTypeFromProcedure("Атравматичная экстракция зуба A16.07.001"), "extraction");
		});

		it("detects sinus lift and bone augmentation", () => {
			assert.equal(detectInterventionTypeFromProcedure("Открытый синус-лифтинг с костной пластикой Bio-Oss"), "sinus_lift");
			assert.equal(detectInterventionTypeFromProcedure("Субантральная аугментация"), "sinus_lift");
		});

		it("detects dental implantation", () => {
			assert.equal(detectInterventionTypeFromProcedure("Установка имплантата Straumann BLX"), "implantation");
			assert.equal(detectInterventionTypeFromProcedure("Дентальная имплантация A16.07.054 с формирователем"), "implantation");
		});

		it("detects endodontic root canal therapy", () => {
			assert.equal(detectInterventionTypeFromProcedure("Лечение пульпита и пломбирование каналов под микроскопом"), "endodontics");
			assert.equal(detectInterventionTypeFromProcedure("Эндодонтическая ревизия каналов"), "endodontics");
		});

		it("detects teeth whitening", () => {
			assert.equal(detectInterventionTypeFromProcedure("Клиническое отбеливание зубов ZOOM 4"), "whitening");
			assert.equal(detectInterventionTypeFromProcedure("Фотоотбеливание Flash WhiteSpeed"), "whitening");
		});

		it("detects orthodontics", () => {
			assert.equal(detectInterventionTypeFromProcedure("Установка брекет-системы Damon Q"), "orthodontics");
			assert.equal(detectInterventionTypeFromProcedure("Плановая смена дуги на элайнерах"), "orthodontics");
		});

		it("detects professional hygiene", () => {
			assert.equal(detectInterventionTypeFromProcedure("Комплексная чистка Air-Flow Clinpro + ультразвук"), "hygiene");
		});

		it("defaults to caries for standard filling procedures", () => {
			assert.equal(detectInterventionTypeFromProcedure("Лечение среднего кариеса"), "caries");
			assert.equal(detectInterventionTypeFromProcedure(""), "caries");
		});
	});

	describe("generateCareMemo for all clinical interventions", () => {
		const interventions: CareInterventionType[] = [
			"caries",
			"extraction",
			"sinus_lift",
			"implantation",
			"endodontics",
			"whitening",
			"orthodontics",
			"hygiene",
		];

		for (const intType of interventions) {
			it(`generates valid care memo for intervention: ${intType}`, () => {
				const memo = generateCareMemo({
					patientName: "Алексей Смирнов",
					patientPhone: "+7 (999) 777-66-55",
					toothFdi: "16",
					interventionType: intType,
					doctorName: "Кузнецов П. С.",
					clinicName: "Стоматологическая клиника ДЕНТЕ",
				});

				assert.equal(memo.patientName, "Алексей Смирнов");
				assert.equal(memo.toothFdi, "16");
				assert.equal(memo.interventionType, intType);
				assert.ok(memo.recommendations.length >= 3, "Must have comprehensive recommendations");
				assert.ok(memo.warningSigns.length >= 2, "Must have warning signs");
				assert.ok(memo.dietaryRules.length >= 1, "Must have dietary rules");
				assert.ok(memo.hygieneRules.length >= 1, "Must have hygiene rules");
				assert.ok(memo.qrCodeSvg.includes("<svg"), "Must produce valid QR SVG");
				assert.ok(memo.printHtml.includes("<!DOCTYPE html>"), "Must produce A4 printable HTML");
				assert.ok(memo.whatsAppText.includes("Уважаемый(ая) Алексей Смирнов, рекомендации после лечения зуба 16:"));
				assert.ok(memo.smsText.includes("ДЕНТЕ: Памятка после лечения зуба 16"));
			});
		}

		it("includes specific sinus-lift contraindications (blowing nose, flights)", () => {
			const memo = generateCareMemo({
				patientName: "Елена",
				toothFdi: "26",
				interventionType: "sinus_lift",
			});

			const hasNoBlowing = memo.recommendations.some((r) => r.title.includes("СМОРКАТЬСЯ"));
			assert.ok(hasNoBlowing, "Must forbid blowing nose after sinus lift");

			const hasFlightsBan = memo.activityRestrictions.some((r) => r.includes("авиаперелеты"));
			assert.ok(hasFlightsBan, "Must warn against flights");

			assert.ok(memo.medications.some((m) => m.name.includes("Називин")), "Must prescribe nasal drops");
			assert.ok(memo.medications.some((m) => m.name.includes("Амоксиклав")), "Must prescribe antibiotic");
		});

		it("includes specific extraction care (clot preservation, cold pack, no hot baths)", () => {
			const memo = generateCareMemo({
				patientName: "Дмитрий",
				toothFdi: "48",
				interventionType: "extraction",
			});

			const hasNoRinse = memo.recommendations.some((r) => r.title.includes("НЕ ПОЛОСКАТЬ"));
			assert.ok(hasNoRinse, "Must strictly forbid aggressive rinsing");

			const hasCold = memo.recommendations.some((r) => r.title.includes("холод"));
			assert.ok(hasCold, "Must recommend cold compress");
		});

		it("includes specific teeth whitening care (white diet for 48-72h, remineralizing gel)", () => {
			const memo = generateCareMemo({
				patientName: "Ольга",
				toothFdi: "11-21",
				interventionType: "whitening",
			});

			const hasWhiteDiet = memo.recommendations.some((r) => r.title.includes("Белая диета"));
			assert.ok(hasWhiteDiet, "Must prescribe strict white diet");

			assert.ok(memo.medications.some((m) => m.name.includes("Relief ACP") || m.name.includes("Tooth Mousse")));
		});
	});

	describe("Messaging & Deep Links", () => {
		it("buildWhatsAppLink formats international numbers cleanly", () => {
			const link = buildWhatsAppLink("+7 (999) 123-45-67", "Тестовое сообщение");
			assert.equal(link, "https://wa.me/79991234567?text=%D0%A2%D0%B5%D1%81%D1%82%D0%BE%D0%B2%D0%BE%D0%B5%20%D1%81%D0%BE%D0%BE%D0%B1%D1%89%D0%B5%D0%BD%D0%B8%D0%B5");
		});

		it("buildSmsLink formats SMS URI with protocol", () => {
			const link = buildSmsLink("+7 (999) 123-45-67", "Памятка ДЕНТЕ");
			assert.ok(link.startsWith("sms:+79991234567?body="));
		});

		it("generateCareMemoSmsText returns concise SMS string", () => {
			const memo = generateCareMemo({
				patientName: "Иван",
				toothFdi: "36",
				interventionType: "caries",
			});
			const sms = generateCareMemoSmsText(memo);
			assert.ok(sms.includes("ДЕНТЕ: Памятка после лечения зуба 36"));
			assert.ok(sms.includes("https://dente.ru/m/"));
		});
	});

	describe("A4 Printable Document Generator", () => {
		it("generates complete HTML document with clinical headers, table, and QR code", () => {
			const memo = generateCareMemo({
				patientName: "Сергей Васильев",
				toothFdi: "46",
				interventionType: "implantation",
				doctorName: "Кузнецов П. С.",
				doctorSpecialty: "Хирург-имплантолог",
			});

			const html = generateCareMemoPrintHtml(memo);
			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("Сергей Васильев"));
			assert.ok(html.includes("Зуб №<strong>46</strong>"));
			assert.ok(html.includes("Дентальная имплантация"));
			assert.ok(html.includes("Режим и схема приёма медикаментов"));
			assert.ok(html.includes("Амоксиклав"));
			assert.ok(html.includes("Тревожные признаки") || html.includes("срочно связаться"));
			assert.ok(html.includes("<svg"), "Must embed QR code inside HTML");
		});
	});

	describe("Friendly Non-Latin Billing Engine", () => {
		it("translates medical nomenclature 804n into plain Russian terms", () => {
			const t1 = translateMedicalTermToFriendly("Инфильтрационная анестезия Septanest 1:100000", "16");
			assert.equal(t1.categoryGroup, "anesthesia");
			assert.ok(t1.friendlyName.includes("Обезболивание (анестезия)"));
			assert.equal(t1.groupIcon, "💉");

			const t2 = translateMedicalTermToFriendly("Радиовизиография прицельная зуба A06.07.001", "16");
			assert.equal(t2.categoryGroup, "xray");
			assert.ok(t2.friendlyName.includes("Снимок зуба"));

			const t3 = translateMedicalTermToFriendly("Наложение пломбы из нанокомпозита Filtek Ultimate", "16");
			assert.equal(t3.categoryGroup, "caries");
			assert.ok(t3.friendlyName.includes("Лечение кариеса и световая пломба"));

			const t4 = translateMedicalTermToFriendly("Профессиональная гигиена Air-Flow Clinpro A16.07.051");
			assert.equal(t4.categoryGroup, "hygiene");
			assert.ok(t4.friendlyName.includes("Комплексная профессиональная чистка"));
		});

		it("groups mixed service items into organized logical categories with percentages", () => {
			const services = [
				{ id: "1", titleRu: "Проводниковая анестезия Ubistesin", toothFdi: "16", priceRub: 800, quantity: 1 },
				{ id: "2", titleRu: "Прицельный снимок радиовизиографом", toothFdi: "16", priceRub: 600, quantity: 1 },
				{ id: "3", titleRu: "Восстановление зуба нанокомпозитом Estelite Asteria", toothFdi: "16", priceRub: 6500, quantity: 1 },
			];

			const breakdown = groupServicesIntoFriendlyBlocks(services);
			assert.equal(breakdown.totalAmountRub, 7900);
			assert.equal(breakdown.groups.length, 3);

			// Check category ordering: caries first, then anesthesia, then xray
			assert.equal(breakdown.groups[0]?.categoryGroup, "caries");
			assert.equal(breakdown.groups[1]?.categoryGroup, "anesthesia");
			assert.equal(breakdown.groups[2]?.categoryGroup, "xray");

			assert.ok((breakdown.groups[0]?.percentageOfTotal ?? 0) > 80);
			assert.ok(breakdown.patientFriendlySummaryRu.includes("Лечение кариеса и пломбирование"));
		});

		it("generates clear WhatsApp billing message", () => {
			const services = [
				{ id: "1", titleRu: "Анестезия Артикаин", toothFdi: "16", priceRub: 800, quantity: 1 },
				{ id: "2", titleRu: "Пломба световая Filtek", toothFdi: "16", priceRub: 6000, quantity: 1 },
			];
			const breakdown = groupServicesIntoFriendlyBlocks(services);
			const msg = generateFriendlyBillingWhatsAppMessage("Мария", breakdown);

			assert.ok(msg.includes("Здравствуйте, уважаемый(ая) Мария!"));
			assert.ok(msg.includes(breakdown.totalAmountRubFormatted));
			assert.ok(msg.includes("Обезболивание (анестезия)"));
			assert.ok(msg.includes("Лечение кариеса и пломбирование"));
		});
	});

	describe("Tax Deduction & Dental Passport Engine", () => {
		it("calculates 13% tax deduction and remaining social deduction limit for 2026", () => {
			const mockInvoices: PatientInvoiceItem[] = [
				{
					id: "inv-1",
					invoiceNumber: "INV-2026-001",
					issueDateIso: "2026-03-15",
					dueDateIso: "2026-03-15",
					titleRu: "Лечение зуба",
					totalAmountRub: 100000,
					paidAmountRub: 100000,
					remainingAmountRub: 0,
					status: "paid",
					items: [
						{ code: "A16.07.002", titleRu: "Пломбирование зуба", quantity: 1, priceRub: 100000, totalRub: 100000 },
					],
				},
				{
					id: "inv-2",
					invoiceNumber: "INV-2026-002",
					issueDateIso: "2026-04-20",
					dueDateIso: "2026-04-20",
					titleRu: "Профгигиена",
					totalAmountRub: 20000,
					paidAmountRub: 20000,
					remainingAmountRub: 0,
					status: "paid",
					items: [
						{ code: "A16.07.051", titleRu: "Комплексная гигиена", quantity: 1, priceRub: 20000, totalRub: 20000 },
					],
				},
			];

			const tax2026 = calculatePatientTaxDeduction(mockInvoices, 2026);
			assert.equal(tax2026.taxYear, 2026);
			assert.equal(tax2026.totalSpentRub, 120000);
			assert.equal(tax2026.code01SpentRub, 120000);
			assert.equal(tax2026.code02SpentRub, 0);
			assert.equal(tax2026.totalRefundRub, 15600); // 120,000 * 13% = 15,600
			assert.equal(tax2026.isCode01Capped, false);
		});

		it("generates structured dental passport from patient history", () => {
			const mockCabinet: PatientPersonalCabinetData = {
				patientId: "pat-2",
				fullName: "Елена",
				phone: "+7 (999) 222-33-44",
				cardNumber: "043-9999",
				curatingDoctor: "Кузнецов П. С.",
				loyaltyBonusBalance: 0,
				loyaltyTierRu: "Базовый",
				cashbackEarnedRub: 0,
				invoices: [
					{
						id: "inv-10",
						invoiceNumber: "INV-2026-010",
						issueDateIso: "2026-05-10",
						dueDateIso: "2026-05-10",
						titleRu: "Имплантация",
						totalAmountRub: 45000,
						paidAmountRub: 45000,
						remainingAmountRub: 0,
						status: "paid",
						items: [
							{
								code: "A16.07.054",
								titleRu: "Установка дентального имплантата Straumann",
								toothFdi: "16",
								priceRub: 45000,
								quantity: 1,
								totalRub: 45000,
							},
						],
					},
				],
				treatmentPlans: [],
				appointments: [],
				consents: [],
				warranties: [],
			};

			const passport = generatePatientDentalPassport(mockCabinet);
			assert.equal(passport.totalTreatedTeethCount, 1);
			assert.ok(passport.entries.length === 1);
			assert.equal(passport.entries[0]?.toothFdi, "16");
			assert.ok(passport.entries[0]?.procedureTitleRu.includes("имплантата"));
		});

		it("formats tooth numbers to plain Russian quadrant descriptions", () => {
			const fdi16 = formatFdiToothPlainRussian("16");
			assert.equal(fdi16.quadrantRu, "верхний правый");
			assert.equal(fdi16.toothTypeRu, "жевательный");
			assert.ok(fdi16.anatomyRu.includes("верхний правый"));

			const fdi21 = formatFdiToothPlainRussian("21");
			assert.equal(fdi21.quadrantRu, "верхний левый");
			assert.equal(fdi21.toothTypeRu, "центральный резец");

			const fdi48 = formatFdiToothPlainRussian("48");
			assert.equal(fdi48.quadrantRu, "нижний правый");
			assert.equal(fdi48.toothTypeRu, "зуб мудрости");
		});
	});
});
