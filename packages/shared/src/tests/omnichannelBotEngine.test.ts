/**
 * omnichannelBotEngine.test.ts — Unit tests for Omnichannel Bot, NPS Survey, and SBP Payment Engines.
 *
 * Tests:
 * 1. Omnichannel Bot Engine:
 *    - T-24h reminder generation (WhatsApp interactive buttons, Telegram inline keyboards, SMS fallback)
 *    - T-2h reminder generation (Geolocation, Yandex/2GIS map links, parking directions)
 *    - Inbound webhook parsing (Telegram callback_query, WhatsApp interactive reply, Russian NLP regex intents)
 *    - State machine transitions & automated Russian patient replies
 * 2. NPS Survey Engine:
 *    - Survey dispatch scheduling at T+1.5h (90 minutes)
 *    - Net Promoter Score mathematical calculations: % Promoters (9-10) - % Detractors (1-6)
 *    - Quality grade evaluation (world_class, excellent, good, needs_improvement, critical)
 *    - Detractor alert generation (CRM urgent task, Chief Doctor & Clinic Manager alerts, 15/30 min SLAs)
 * 3. SBP Payment Engine:
 *    - ГОСТ Р 56042-2014 CRC16-CCITT calculation & verification
 *    - ГОСТ Р 58092-2018 / EMVCo TLV string building and round-trip parsing
 *    - NSPK dynamic QR URLs with integer kopecks
 *    - Tamper detection & mobile deep links (sbp://...)
 *    - SbpPaymentPackage end-to-end integration
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseKopecks } from "../money.js";
import {
	buildAppointmentReminder24h,
	buildAppointmentReminder2h,
	buildClinicMapLinks,
	classifyTextIntent,
	extractFirstNameRu,
	formatAppointmentDateTimeRu,
	parseOmnichannelInboundWebhook,
	type OmnichannelAppointmentContext,
	type TelegramSendMessagePayload,
} from "../messaging/omnichannelBotEngine.js";
import {
	buildTelegramNpsSurveyPayload,
	buildWhatsappNpsSurveyPayload,
	calculateNetPromoterScore,
	calculateNpsSurveyDispatchTime,
	classifyNpsScore,
	createNpsDetractorAlert,
	evaluateNpsGrade,
	type NpsSurveyContext,
} from "../messaging/npsSurveyEngine.js";
import {
	buildEmvCoSbpQrString,
	computeCrc16Ccitt,
	generateSbpPaymentPackage,
	parseEmvCoTlv,
	SbpQrEngine,
} from "../messaging/sbpPaymentEngine.js";

describe("Omnichannel Bot, NPS Survey & SBP Payment Engines", () => {
	// ─── 1. OMNICHANNEL BOT ENGINE TESTS ───
	describe("1. Omnichannel Bot Engine", () => {
		const sampleContext: OmnichannelAppointmentContext = {
			appointmentId: "appt-uuid-101",
			organizationId: "org-uuid-001",
			patientId: "pat-uuid-002",
			patientFullName: "Смирнова Елена Александровна",
			patientPhone: "+79991234567",
			telegramChatId: 123456789,
			doctorFullName: "Барабаш Сергей Владимирович",
			doctorSpecialty: "Врач стоматолог-терапевт",
			appointmentDateTime: "2026-08-29T14:30:00+03:00",
			appointmentDateFormatted: "29 августа 2026 г.",
			appointmentTimeFormatted: "14:30",
			clinicName: "DENTE Clinic Arbat",
			clinicAddress: "г. Москва, ул. Арбат, д. 24, стр. 1",
			clinicFloorOffice: "2 этаж, каб. 4",
			clinicPhone: "+7 (495) 123-45-67",
			clinicCoordinates: {
				latitude: 55.751244,
				longitude: 37.618423,
			},
			parkingDirections: "Бесплатная парковка со шлагбаумом во дворе, код 2424",
		};

		it("1.1 extracts first name and formats Russian date/time correctly", () => {
			assert.equal(extractFirstNameRu("Смирнова Елена Александровна"), "Елена");
			assert.equal(extractFirstNameRu("Барабаш Сергей"), "Сергей");
			assert.equal(extractFirstNameRu("Иван"), "Иван");

			const dt = formatAppointmentDateTimeRu("2026-08-29T14:30:00Z");
			assert.ok(dt.dateFormatted.includes("2026"));
			assert.ok(dt.timeFormatted.includes(":"));
		});

		it("1.2 builds clinic map URLs from coordinates", () => {
			const maps = buildClinicMapLinks({ latitude: 55.751244, longitude: 37.618423 });
			assert.ok(maps.yandexMapsUrl.includes("yandex.ru/maps"));
			assert.ok(maps.yandexMapsUrl.includes("55.751244"));
			assert.ok(maps.twoGisUrl.includes("2gis.ru"));
		});

		it("1.3 builds T-24h reminder for WhatsApp with interactive buttons", () => {
			const pkg = buildAppointmentReminder24h(sampleContext, "whatsapp");

			assert.equal(pkg.triggerType, "reminder_24h");
			assert.equal(pkg.channel, "whatsapp");
			assert.equal(pkg.provider, "waba_360dialog");
			assert.equal(pkg.recipientId, "+79991234567");
			assert.ok(pkg.plainText.includes("Елена"));
			assert.ok(pkg.plainText.includes("Барабаш Сергей Владимирович"));
			assert.ok(pkg.plainText.includes("14:30"));

			assert.ok(pkg.whatsappPayload);
			assert.equal(pkg.whatsappPayload.interactive.type, "button");
			const buttons = pkg.whatsappPayload.interactive.action.buttons;
			assert.equal(buttons.length, 3);
			assert.equal(buttons[0]?.reply.id, "btn_confirm_appt-uuid-101");
			assert.equal(buttons[0]?.reply.title, "Подтверждаю визит");
			assert.equal(buttons[1]?.reply.id, "btn_reschedule_appt-uuid-101");
			assert.equal(buttons[1]?.reply.title, "Перенести прием");
			assert.equal(buttons[2]?.reply.id, "btn_cancel_appt-uuid-101");
			assert.equal(buttons[2]?.reply.title, "Отменить запись");
		});

		it("1.4 builds T-24h reminder for Telegram with inline keyboard", () => {
			const pkg = buildAppointmentReminder24h(sampleContext, "telegram");

			assert.equal(pkg.channel, "telegram");
			assert.equal(pkg.provider, "telegram_bot");
			assert.equal(pkg.recipientId, "123456789");

			assert.ok(pkg.telegramPayload);
			const tgMsg = pkg.telegramPayload as TelegramSendMessagePayload;
			assert.equal(tgMsg.parse_mode, "HTML");
			assert.ok(tgMsg.text.includes("Елена"));
			assert.ok(tgMsg.reply_markup?.inline_keyboard);
			const kb = tgMsg.reply_markup.inline_keyboard;
			assert.equal(kb[0]?.[0]?.callback_data, "appt:confirm:appt-uuid-101");
			assert.equal(kb[0]?.[1]?.callback_data, "appt:reschedule:appt-uuid-101");
			assert.equal(kb[1]?.[0]?.callback_data, "appt:cancel:appt-uuid-101");
		});

		it("1.5 builds T-24h SMS fallback payload", () => {
			const pkg = buildAppointmentReminder24h(sampleContext, "sms");

			assert.equal(pkg.channel, "sms");
			assert.equal(pkg.provider, "sms_gateway");
			assert.ok(pkg.smsPayload);
			assert.equal(pkg.smsPayload.to, "+79991234567");
			assert.ok(pkg.smsPayload.text.includes("DENTE Clinic Arbat"));
			assert.ok(pkg.smsPayload.text.includes("14:30"));
		});

		it("1.6 builds T-2h reminder with maps, parking, and geolocation", () => {
			const pkgWa = buildAppointmentReminder2h(sampleContext, "whatsapp");
			assert.equal(pkgWa.triggerType, "reminder_2h");
			assert.ok(pkgWa.plainText.includes("г. Москва, ул. Арбат"));
			assert.ok(pkgWa.plainText.includes("Бесплатная парковка"));
			assert.ok(pkgWa.whatsappPayload);
			assert.equal(pkgWa.whatsappPayload.interactive.action.buttons[0]?.reply.id, "btn_navigate_appt-uuid-101");

			const pkgTg = buildAppointmentReminder2h(sampleContext, "telegram");
			assert.ok(pkgTg.telegramPayload);
			const tgMsg2 = pkgTg.telegramPayload as TelegramSendMessagePayload;
			assert.ok(tgMsg2.text.includes("г. Москва, ул. Арбат"));
			const tgKb = tgMsg2.reply_markup?.inline_keyboard;
			assert.ok(tgKb?.[0]?.[0]?.url?.includes("yandex.ru"));
			assert.ok(tgKb?.[0]?.[1]?.url?.includes("2gis.ru"));
			assert.equal(tgKb?.[1]?.[0]?.callback_data, "appt:on_the_way:appt-uuid-101");
			assert.equal(tgKb?.[1]?.[1]?.callback_data, "appt:late_10m:appt-uuid-101");
		});

		it("1.7 parses Telegram callback_query webhook for confirm, reschedule, cancel", () => {
			// Confirm
			const tgConfirm = {
				callback_query: {
					id: "cb_1",
					from: { id: 123456789 },
					data: "appt:confirm:appt-uuid-101",
				},
			};
			const resConfirm = parseOmnichannelInboundWebhook(tgConfirm);
			assert.equal(resConfirm.channel, "telegram");
			assert.equal(resConfirm.action, "CONFIRMED");
			assert.equal(resConfirm.appointmentId, "appt-uuid-101");
			assert.equal(resConfirm.nextAppointmentStatus, "confirmed");
			assert.equal(resConfirm.confidence, "explicit_button");
			assert.ok(resConfirm.autoReplyText.includes("подтвержден"));

			// Reschedule
			const tgReschedule = {
				callback_query: {
					id: "cb_2",
					from: { id: 123456789 },
					data: "appt:reschedule:appt-uuid-101",
				},
			};
			const resReschedule = parseOmnichannelInboundWebhook(tgReschedule);
			assert.equal(resReschedule.action, "RESCHEDULE_REQUESTED");
			assert.equal(resReschedule.nextAppointmentStatus, "reschedule_requested");
			assert.ok(resReschedule.autoReplyText.includes("перенос"));

			// Cancel
			const tgCancel = {
				callback_query: {
					id: "cb_3",
					from: { id: 123456789 },
					data: "appt:cancel:appt-uuid-101",
				},
			};
			const resCancel = parseOmnichannelInboundWebhook(tgCancel);
			assert.equal(resCancel.action, "CANCELLED");
			assert.equal(resCancel.nextAppointmentStatus, "cancelled");
			assert.ok(resCancel.autoReplyText.includes("отменена"));
		});

		it("1.8 parses WhatsApp WABA webhook for button reply", () => {
			const waConfirm = {
				entry: [
					{
						changes: [
							{
								value: {
									messages: [
										{
											from: "+79991234567",
											id: "wamid.123",
											type: "interactive",
											interactive: {
												type: "button_reply",
												button_reply: {
													id: "btn_confirm_appt-uuid-999",
													title: "Подтверждаю визит",
												},
											},
										},
									],
								},
							},
						],
					},
				],
			};

			const parsed = parseOmnichannelInboundWebhook(waConfirm);
			assert.equal(parsed.channel, "whatsapp");
			assert.equal(parsed.senderId, "+79991234567");
			assert.equal(parsed.appointmentId, "appt-uuid-999");
			assert.equal(parsed.action, "CONFIRMED");
			assert.equal(parsed.nextAppointmentStatus, "confirmed");
			assert.equal(parsed.confidence, "explicit_button");
		});

		it("1.9 parses Russian natural language message text via regex intent matching", () => {
			const res1 = classifyTextIntent("Да, обязательно буду на приеме!", "+79991112233", "appt-1");
			assert.equal(res1.action, "CONFIRMED");
			assert.equal(res1.nextAppointmentStatus, "confirmed");
			assert.equal(res1.confidence, "keyword_match");

			const res2 = classifyTextIntent("Пожалуйста, перенесите на другой день", "+79991112233", "appt-1");
			assert.equal(res2.action, "RESCHEDULE_REQUESTED");
			assert.equal(res2.nextAppointmentStatus, "reschedule_requested");

			const res3 = classifyTextIntent("Не приду, отмените визит, заболел", "+79991112233", "appt-1");
			assert.equal(res3.action, "CANCELLED");
			assert.equal(res3.nextAppointmentStatus, "cancelled");

			const res4 = classifyTextIntent("Подскажите, сколько стоит чистка?", "+79991112233", "appt-1");
			assert.equal(res4.action, "UNKNOWN");
			assert.equal(res4.nextAppointmentStatus, null);
			assert.equal(res4.confidence, "unrecognized");
		});
	});

	// ─── 2. NPS SURVEY ENGINE TESTS ───
	describe("2. NPS Survey & Quality Engine", () => {
		const sampleNpsContext: NpsSurveyContext = {
			visitId: "visit-uuid-501",
			patientId: "pat-uuid-002",
			patientFullName: "Смирнова Елена Александровна",
			patientPhone: "+79991234567",
			telegramChatId: 123456789,
			doctorFullName: "Барабаш Сергей Владимирович",
			doctorSpecialty: "Врач стоматолог-терапевт",
			clinicName: "DENTE Clinic",
			visitCompletedAt: "2026-08-29T15:30:00.000Z",
		};

		it("2.1 calculates survey dispatch time at exactly T+1.5h (90 minutes)", () => {
			const completedAt = new Date("2026-08-29T15:30:00.000Z");
			const dispatchAt = calculateNpsSurveyDispatchTime(completedAt);
			const expected = new Date("2026-08-29T17:00:00.000Z");

			assert.equal(dispatchAt.getTime(), expected.getTime());
			assert.equal(dispatchAt.toISOString(), "2026-08-29T17:00:00.000Z");
		});

		it("2.2 builds Telegram and WhatsApp NPS survey message payloads", () => {
			const tgPayload = buildTelegramNpsSurveyPayload(sampleNpsContext);
			assert.equal(tgPayload.chat_id, 123456789);
			assert.ok(tgPayload.text.includes("Барабаш Сергей Владимирович"));
			assert.equal(tgPayload.reply_markup.inline_keyboard.length, 2);
			assert.equal(tgPayload.reply_markup.inline_keyboard[0]?.length, 5);
			assert.equal(tgPayload.reply_markup.inline_keyboard[1]?.length, 5);
			assert.equal(
				tgPayload.reply_markup.inline_keyboard[0]?.[0]?.callback_data,
				"nps:rate:visit-uuid-501:1",
			);
			assert.equal(
				tgPayload.reply_markup.inline_keyboard[1]?.[4]?.callback_data,
				"nps:rate:visit-uuid-501:10",
			);

			const waPayload = buildWhatsappNpsSurveyPayload(sampleNpsContext);
			assert.equal(waPayload.to, "+79991234567");
			assert.equal(waPayload.interactive.action.buttons.length, 3);
		});

		it("2.3 classifies NPS scores into promoters, passives, and detractors", () => {
			assert.equal(classifyNpsScore(10), "promoter");
			assert.equal(classifyNpsScore(9), "promoter");
			assert.equal(classifyNpsScore(8), "passive");
			assert.equal(classifyNpsScore(7), "passive");
			assert.equal(classifyNpsScore(6), "detractor");
			assert.equal(classifyNpsScore(5), "detractor");
			assert.equal(classifyNpsScore(1), "detractor");
		});

		it("2.4 calculates Net Promoter Score formula (% Promoters - % Detractors)", () => {
			// Sample: 10 responses: 7 Promoters (9,10), 2 Passives (7,8), 1 Detractor (5)
			// % Promoters = 70.0%, % Detractors = 10.0%, % Passives = 20.0%
			// NPS = 70.0 - 10.0 = +60.0
			const scores = [10, 10, 9, 9, 10, 9, 10, 8, 7, 5];
			const res = calculateNetPromoterScore(scores);

			assert.equal(res.totalResponses, 10);
			assert.equal(res.promotersCount, 7);
			assert.equal(res.promotersPercent, 70.0);
			assert.equal(res.passivesCount, 2);
			assert.equal(res.passivesPercent, 20.0);
			assert.equal(res.detractorsCount, 1);
			assert.equal(res.detractorsPercent, 10.0);
			assert.equal(res.npsScore, 60.0);
			assert.equal(res.npsScoreFormatted, "+60.0");
			assert.equal(res.qualityGrade, "excellent");
			assert.equal(res.scoreDistribution[10], 4);
			assert.equal(res.scoreDistribution[5], 1);
		});

		it("2.5 handles edge cases: 100% promoters, 100% detractors, empty responses", () => {
			// 100% Promoters
			const allPromoters = calculateNetPromoterScore([10, 9, 10, 10]);
			assert.equal(allPromoters.npsScore, 100.0);
			assert.equal(allPromoters.npsScoreFormatted, "+100.0");
			assert.equal(allPromoters.qualityGrade, "world_class");

			// 100% Detractors
			const allDetractors = calculateNetPromoterScore([1, 2, 4, 6]);
			assert.equal(allDetractors.npsScore, -100.0);
			assert.equal(allDetractors.npsScoreFormatted, "-100.0");
			assert.equal(allDetractors.qualityGrade, "critical");

			// Empty
			const empty = calculateNetPromoterScore([]);
			assert.equal(empty.totalResponses, 0);
			assert.equal(empty.npsScore, 0);
			assert.equal(empty.npsScoreFormatted, "0.0");
		});

		it("2.6 generates urgent CRM task and alert for Chief Doctor & Manager when score <= 6", () => {
			const now = new Date("2026-08-29T16:00:00.000Z");

			// Critical Detractor (Score 2 -> SLA 15 min)
			const alertCritical = createNpsDetractorAlert({
				visitId: "visit-501",
				patientId: "pat-002",
				patientFullName: "Смирнова Елена Александровна",
				patientPhone: "+79991234567",
				doctorFullName: "Барабаш Сергей Владимирович",
				score: 2,
				feedbackComment: "Очень долго ждала прием, анестезия отошла раньше времени.",
				now,
			});

			assert.equal(alertCritical.severity, "critical");
			assert.equal(alertCritical.slaMinutes, 15);
			assert.equal(alertCritical.deadline, new Date("2026-08-29T16:15:00.000Z").toISOString());
			assert.deepEqual(alertCritical.targetRoles, ["chief_doctor", "clinic_manager"]);
			assert.equal(alertCritical.crmTask.priority, "urgent");
			assert.ok(alertCritical.crmTask.title.includes("2/10"));
			assert.ok(alertCritical.crmTask.description.includes("Смирнова Елена Александровна"));
			assert.ok(alertCritical.telegramAlertText.includes("ТРЕВОГА NPS"));
			assert.ok(alertCritical.telegramAlertText.includes("+79991234567"));

			// High Detractor (Score 5 -> SLA 30 min)
			const alertHigh = createNpsDetractorAlert({
				visitId: "visit-502",
				patientId: "pat-003",
				patientFullName: "Ковалев Андрей",
				patientPhone: "+79997654321",
				doctorFullName: "Петрова Анна",
				score: 5,
				feedbackComment: "Врач хороший, но на ресепшн нагрубили.",
				now,
			});
			assert.equal(alertHigh.severity, "high");
			assert.equal(alertHigh.slaMinutes, 30);
			assert.equal(alertHigh.deadline, new Date("2026-08-29T16:30:00.000Z").toISOString());

			// Throws if score > 6
			assert.throws(() =>
				createNpsDetractorAlert({
					visitId: "visit-503",
					patientId: "pat-004",
					patientFullName: "Тест",
					patientPhone: "+79990000000",
					doctorFullName: "Врач",
					score: 9,
					now,
				}),
			);
		});
	});

	// ─── 3. SBP PAYMENT ENGINE TESTS ───
	describe("3. SBP Payment & Dynamic QR Engine", () => {
		it("3.1 computes CRC16-CCITT according to ГОСТ Р 56042-2014", () => {
			const crc = computeCrc16Ccitt("123456789");
			assert.equal(crc.length, 4);
			assert.equal(typeof crc, "string");

			// Determinism
			const crc2 = SbpQrEngine.computeCrc16Ccitt("123456789");
			assert.equal(crc, crc2);
		});

		it("3.2 generates and parses EMVCo / ГОСТ Р 58092-2018 TLV string", () => {
			const tlv = buildEmvCoSbpQrString({
				operationId: "INV-98765-TEST",
				bankMemberId: "100000000111",
				amountKopecks: 150050, // 1,500.50 RUB
				currency: "RUB",
				invoiceId: "INV-98765-TEST",
				merchantName: "DENTE CLINIC",
				merchantCity: "MOSCOW",
				mcc: "8021",
				description: "Оплата терапевтического лечения",
				isDynamic: true,
			});

			assert.ok(tlv.startsWith("000201")); // Tag 00 Len 02 Val 01
			assert.ok(tlv.includes("010212")); // Tag 01 Len 02 Val 12 (Dynamic)
			assert.ok(tlv.includes("52048021")); // MCC 8021
			assert.ok(tlv.includes("5303643")); // Currency 643
			assert.ok(tlv.includes("54071500.50")); // Amount in Rubles
			assert.ok(tlv.includes("5802RU")); // Country RU
			assert.ok(tlv.includes("6304")); // Tag 63 CRC

			// Round-trip parse
			const parsed = parseEmvCoTlv(tlv);
			assert.equal(parsed.isValid, true);
			assert.equal(parsed.pointOfInitiation, "dynamic");
			assert.equal(parsed.currencyCode, "643");
			assert.equal(parsed.mcc, "8021");
			assert.equal(parsed.transactionAmountRubles, 1500.5);
			assert.equal(parsed.transactionAmountKopecks, 150050);
			assert.equal(parsed.countryCode, "RU");
			assert.equal(parsed.merchantName, "DENTE CLINIC");
			assert.equal(parsed.merchantCity, "MOSCOW");
			assert.equal(parsed.additionalData?.billId, "INV-98765-TEST");
			assert.equal(parsed.merchantAccountInfo?.bankMemberId, "100000000111");
		});

		it("3.3 builds NSPK dynamic payload with kopecks and CRC", () => {
			const payload = SbpQrEngine.buildNspkDynamicPayload({
				operationId: "INV-98765-UUID",
				bankMemberId: "100000000111",
				amountKopecks: 350000,
				currency: "RUB",
			});

			assert.match(payload.payloadUrl, /https:\/\/qr\.nspk\.ru\/INV98765UUID/);
			assert.match(payload.payloadUrl, /type=02/);
			assert.match(payload.payloadUrl, /bank=100000000111/);
			assert.match(payload.payloadUrl, /sum=350000/);
			assert.match(payload.payloadUrl, /cur=RUB/);
			assert.match(payload.payloadUrl, new RegExp(`crc=${payload.crc16}`));
		});

		it("3.4 validates authentic SBP URLs and detects tampered sums or invalid CRC", () => {
			const original = SbpQrEngine.buildNspkDynamicPayload({
				operationId: "OP123456",
				bankMemberId: "100000000004",
				amountKopecks: 120050,
			});

			const verified = SbpQrEngine.verifyNspkPayload(original.payloadUrl);
			assert.equal(verified.isValid, true);
			assert.equal(verified.operationId, "OP123456");
			assert.equal(verified.amountKopecks, 120050);
			assert.equal(verified.bankMemberId, "100000000004");

			// Tampered sum
			const tamperedUrl = original.payloadUrl.replace("sum=120050", "sum=100");
			const failedVerify = SbpQrEngine.verifyNspkPayload(tamperedUrl);
			assert.equal(failedVerify.isValid, false);

			// Invalid domain
			const badDomain = original.payloadUrl.replace("nspk.ru", "fakebank.ru");
			const failedDomain = SbpQrEngine.verifyNspkPayload(badDomain);
			assert.equal(failedDomain.isValid, false);
		});

		it("3.5 generateSbpPaymentPackage generates all required payment artifacts and deep links", () => {
			const pkg = generateSbpPaymentPackage({
				operationId: "ORDER-777",
				bankMemberId: "100000000111",
				amountKopecks: parseKopecks("4500.00"), // 450,000 kopecks
				invoiceId: "INV-2026-777",
				description: "Оплата профессиональной гигиены полости рта",
				merchantName: "DENTE ARBAT",
				merchantCity: "MOSCOW",
				ttlSeconds: 1800,
			});

			assert.equal(pkg.operationId, "ORDER777");
			assert.equal(pkg.invoiceId, "INV-2026-777");
			assert.equal(pkg.amountKopecks, 450000);
			assert.ok(pkg.amountRublesFormatted.includes("4"));
			assert.ok(pkg.amountRublesFormatted.includes("500"));
			assert.ok(pkg.nspkUrl.startsWith("https://qr.nspk.ru/ORDER777"));
			assert.ok(pkg.sbpDeepLink.startsWith("sbp://qr.nspk.ru/ORDER777"));
			assert.ok(pkg.emvCoTlvPayload.startsWith("000201"));
			assert.ok(pkg.patientMessageText.includes("4 500,00 ₽") || pkg.patientMessageText.includes("4 500,00"));
			assert.ok(pkg.patientMessageText.includes(pkg.nspkUrl));
			assert.ok(pkg.expiresAt);
		});
	});
});
