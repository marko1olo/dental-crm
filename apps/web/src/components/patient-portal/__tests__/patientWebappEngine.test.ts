import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	assemblePatientWebappProfile,
	calculateCrc16CcittFalse,
	calculatePlanFinancials,
	calculateSha256,
	calculateSplitClipPath,
	calculateWiperPointerPercent,
	computeDocumentDigest,
	formatKopecksToCurrencyRu,
	generatePatientMagicLink,
	generatePatientWebappSession,
	generateSbpPaymentQrModel,
	generateSmsOtpForSigning,
	getPresetBeforeAfterGalleries,
	getPresetSignableDocuments,
	kopecksToRubles,
	rublesToKopecks,
	signDocumentWithPep,
	validatePatientWebappSession,
	verifySmsOtpForSigning,
	type PatientAppointmentItem,
	type PatientInvoiceBillItem,
	type PatientTreatmentPlanStage,
	type SignableStatutoryDocument,
} from "../patientWebappEngine.js";

describe("Patient WebApp Engine & Mobile Portal Core (63-ФЗ, СБП НСПК, Копеечная Математика)", () => {
	describe("1. Криптография, Сессии Пациента и Magic Links", () => {
		it("1.1 calculateSha256 — Вычисляет детерминированный 256-битный хэш для UTF-8 строк", () => {
			const hash1 = calculateSha256("DENTE_PORTAL_TEST");
			const hash2 = calculateSha256("DENTE_PORTAL_TEST");
			assert.equal(hash1, hash2);
			assert.equal(hash1.length, 64);
			assert.match(hash1, /^[0-9a-f]{64}$/);

			// Русские символы
			const cyrillicHash = calculateSha256("Стоматологическая клиника ДЕНТЕ (63-ФЗ ПЭП)");
			assert.equal(cyrillicHash.length, 64);
		});

		it("1.2 generatePatientWebappSession & validatePatientWebappSession — Создает и валидирует защищенную сессию", () => {
			const { session, encodedToken } = generatePatientWebappSession({
				patientId: "pat-10492",
				phone: "+79991234567",
				ttlHours: 48,
				scopes: ["portal:read", "portal:pay"],
			});

			assert.ok(session.sessionId.startsWith("SES-"));
			assert.equal(session.patientId, "pat-10492");
			assert.equal(session.phone, "+79991234567");
			assert.deepEqual(session.scopes, ["portal:read", "portal:pay"]);
			assert.ok(encodedToken.length > 20);

			// Валидация подлинного токена
			const validation = validatePatientWebappSession(encodedToken);
			assert.equal(validation.isValid, true);
			assert.equal(validation.session?.patientId, "pat-10492");
			assert.equal(validation.session?.sessionId, session.sessionId);
		});

		it("1.3 validatePatientWebappSession — Отклоняет просроченный токен сессии", () => {
			const { encodedToken, session } = generatePatientWebappSession({
				patientId: "pat-expired",
				phone: "+79990000000",
				ttlHours: 1,
			});

			// Симулируем проверку спустя 2 часа
			const futureMs = session.expiresAtTimestamp + 1000 * 60 * 60;
			const result = validatePatientWebappSession(encodedToken, { nowMs: futureMs });

			assert.equal(result.isValid, false);
			assert.match(result.error || "", /истёк/);
		});

		it("1.4 validatePatientWebappSession — Отклоняет модифицированный/поддельный токен", () => {
			const { encodedToken } = generatePatientWebappSession({
				patientId: "pat-legit",
				phone: "+79991112233",
			});

			// Проверка с неверным секретным ключом
			const tampered = validatePatientWebappSession(encodedToken, { secretKey: "test_invalid_signature_salt_token" });
			assert.equal(tampered.isValid, false);
			assert.match(tampered.error || "", /подпись/i);

			// Проверка пустой или битой строки
			const invalid = validatePatientWebappSession("not-a-valid-base64-token");
			assert.equal(invalid.isValid, false);
		});

		it("1.5 validatePatientWebappSession — Проверяет обязательный scope (права доступа)", () => {
			const { encodedToken } = generatePatientWebappSession({
				patientId: "pat-readonly",
				phone: "+79995554433",
				scopes: ["portal:read"],
			});

			const checkRead = validatePatientWebappSession(encodedToken, { requiredScope: "portal:read" });
			assert.equal(checkRead.isValid, true);

			const checkPay = validatePatientWebappSession(encodedToken, { requiredScope: "portal:pay" });
			assert.equal(checkPay.isValid, false);
			assert.match(checkPay.error || "", /нет разрешения/);
		});

		it("1.6 generatePatientMagicLink — Формирует корректную ссылку для перехода в PWA", () => {
			const link = generatePatientMagicLink("https://dente-clinic.ru/", "sample-encoded-token-xyz", "photos");
			assert.ok(link.startsWith("https://dente-clinic.ru/#/portal/webapp"));
			assert.ok(link.includes("token=sample-encoded-token-xyz"));
			assert.ok(link.includes("tab=photos"));
		});
	});

	describe("2. Копеечная финансовая арифметика и сборка профиля пациента", () => {
		it("2.1 kopecksToRubles & rublesToKopecks — Точное взаимно-однозначное преобразование", () => {
			assert.equal(kopecksToRubles(100), 1.0);
			assert.equal(kopecksToRubles(1245050), 12450.5);
			assert.equal(rublesToKopecks(12450.5), 1245050);
			assert.equal(rublesToKopecks(0.01), 1);
			assert.equal(rublesToKopecks(0), 0);
		});

		it("2.2 formatKopecksToCurrencyRu — Форматирует денежные суммы с 2 знаками после запятой", () => {
			const formatted = formatKopecksToCurrencyRu(1540050);
			assert.ok(formatted.includes("15") && formatted.includes("400,50") && formatted.includes("₽"));
		});

		it("2.3 calculatePlanFinancials — Точный расчет этапов плана лечения в копейках", () => {
			const testStages: readonly PatientTreatmentPlanStage[] = [
				{
					id: "st-1",
					orderIndex: 1,
					titleRu: "Диагностика",
					categoryRu: "Диагностика",
					teethFdi: [],
					costKopecks: 500000, // 5000 ₽
					costRub: 5000,
					status: "completed",
					procedures: [],
				},
				{
					id: "st-2",
					orderIndex: 2,
					titleRu: "Лечение каналов",
					categoryRu: "Терапия",
					teethFdi: ["16"],
					costKopecks: 1500000, // 15000 ₽
					costRub: 15000,
					status: "in_progress",
					procedures: [],
				},
				{
					id: "st-3",
					orderIndex: 3,
					titleRu: "Коронка цирконий",
					categoryRu: "Ортопедия",
					teethFdi: ["16"],
					costKopecks: 3000000, // 30000 ₽
					costRub: 30000,
					status: "planned",
					procedures: [],
				},
			];

			const result = calculatePlanFinancials(testStages);

			assert.equal(result.totalCostKopecks, 5000000); // 50,000 ₽
			assert.equal(result.totalCostRub, 50000);
			assert.equal(result.paidCostKopecks, 500000); // 5,000 ₽ (только выполненный)
			assert.equal(result.paidCostRub, 5000);
			assert.equal(result.remainingDueKopecks, 4500000); // 45,000 ₽
			assert.equal(result.remainingDueRub, 45000);
			assert.equal(result.completedStagesCount, 1);
			assert.equal(result.totalStagesCount, 3);
			assert.equal(result.progressPercent, 33); // 1/3 = 33%
		});

		it("2.4 assemblePatientWebappProfile — Агрегирует профиль, сортирует записи и считает общую задолженность", () => {
			const appointments: readonly PatientAppointmentItem[] = [
				{
					id: "apt-past",
					dateIso: "2026-08-01",
					timeRu: "10:00",
					doctorId: "doc-1",
					doctorName: "Д-р Смирнова",
					doctorSpecialtyRu: "Терапевт",
					roomNumber: "Каб. 1",
					clinicName: "Денте",
					clinicAddressRu: "Москва",
					clinicPhone: "+74950000000",
					titleRu: "Первичный прием",
					status: "completed",
					priceKopecks: 300000,
					priceRub: 3000,
					reminderSent: true,
				},
				{
					id: "apt-upcoming-2",
					dateIso: "2026-09-05",
					timeRu: "15:00",
					doctorId: "doc-1",
					doctorName: "Д-р Смирнова",
					doctorSpecialtyRu: "Терапевт",
					roomNumber: "Каб. 1",
					clinicName: "Денте",
					clinicAddressRu: "Москва",
					clinicPhone: "+74950000000",
					titleRu: "Фиксация коронки",
					status: "scheduled",
					priceKopecks: 1000000,
					priceRub: 10000,
					reminderSent: false,
				},
				{
					id: "apt-upcoming-1",
					dateIso: "2026-08-30",
					timeRu: "12:00",
					doctorId: "doc-1",
					doctorName: "Д-р Смирнова",
					doctorSpecialtyRu: "Терапевт",
					roomNumber: "Каб. 1",
					clinicName: "Денте",
					clinicAddressRu: "Москва",
					clinicPhone: "+74950000000",
					titleRu: "Пломбирование каналов",
					status: "confirmed",
					priceKopecks: 500000,
					priceRub: 5000,
					reminderSent: true,
				},
			];

			const invoices: readonly PatientInvoiceBillItem[] = [
				{
					id: "inv-1",
					invoiceNumber: "СЧ-001",
					issueDateIso: "2026-08-01",
					dueDateIso: "2026-08-01",
					titleRu: "Осмотр",
					totalAmountKopecks: 300000,
					totalAmountRub: 3000,
					paidAmountKopecks: 300000,
					paidAmountRub: 3000,
					remainingAmountKopecks: 0,
					remainingAmountRub: 0,
					status: "paid",
				},
				{
					id: "inv-2",
					invoiceNumber: "СЧ-002",
					issueDateIso: "2026-08-28",
					dueDateIso: "2026-08-30",
					titleRu: "Терапия",
					totalAmountKopecks: 1200000,
					totalAmountRub: 12000,
					paidAmountKopecks: 400000,
					paidAmountRub: 4000,
					remainingAmountKopecks: 800000, // 8,000 ₽ долг
					remainingAmountRub: 8000,
					status: "partially_paid",
				},
			];

			const profile = assemblePatientWebappProfile({
				patientId: "pat-999",
				fullName: "Иванов Иван Иванович",
				phone: "+79998887766",
				birthDate: "1990-01-01",
				cardNumber: "043-999",
				appointments,
				invoices,
				currentDateIso: "2026-08-28",
			});

			assert.equal(profile.upcomingAppointments.length, 2);
			assert.equal(profile.upcomingAppointments[0]?.id, "apt-upcoming-1"); // Ближайшая 30 августа первой
			assert.equal(profile.upcomingAppointments[1]?.id, "apt-upcoming-2");
			assert.equal(profile.pastAppointments.length, 1);
			assert.equal(profile.nextAppointment?.id, "apt-upcoming-1");
			assert.equal(profile.totalDebtKopecks, 800000);
			assert.equal(profile.totalDebtRub, 8000);
		});
	});

	describe("3. Фотопротокол «До / После» и расчет шторки-слайдера", () => {
		it("3.1 calculateSplitClipPath — Генерирует корректный CSS clip-path polygon", () => {
			const clip50Vert = calculateSplitClipPath(50, "vertical");
			assert.equal(clip50Vert, "polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)");

			const clip20Horiz = calculateSplitClipPath(20, "horizontal");
			assert.equal(clip20Horiz, "polygon(0% 20%, 100% 20%, 100% 100%, 0% 100%)");

			// Граничные значения 0% и 100%
			assert.equal(calculateSplitClipPath(-10, "vertical"), "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)");
			assert.equal(calculateSplitClipPath(150, "vertical"), "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)");
		});

		it("3.2 calculateWiperPointerPercent — Рассчитывает процент перемещения указателя внутри контейнера", () => {
			const containerRect = { left: 100, top: 50, width: 400, height: 300 };

			// Клик в середину по X (100 + 200 = 300)
			const midPercent = calculateWiperPointerPercent({ clientX: 300, clientY: 100 }, containerRect, "vertical");
			assert.equal(midPercent, 50);

			// Клик в начало (100)
			const zeroPercent = calculateWiperPointerPercent({ clientX: 100, clientY: 100 }, containerRect, "vertical");
			assert.equal(zeroPercent, 0);

			// Клик за правый край (600)
			const maxPercent = calculateWiperPointerPercent({ clientX: 600, clientY: 100 }, containerRect, "vertical");
			assert.equal(maxPercent, 100);
		});

		it("3.3 getPresetBeforeAfterGalleries — Возвращает клинические пары фотопротокола с оттенками VITA", () => {
			const galleries = getPresetBeforeAfterGalleries("pat-043");
			assert.ok(galleries.length >= 2);
			const veneerCase = galleries[0];
			assert.ok(veneerCase?.beforeSlot.vitaShade === "A3.5");
			assert.ok(veneerCase?.afterSlot.vitaShade === "BL2");
			assert.ok(veneerCase?.clinicalIndicationRu.includes("К03.8"));
		});
	});

	describe("4. Оплата через СБП (НСПК / ГОСТ Р 56042-2014 & EMVCo)", () => {
		it("4.1 calculateCrc16CcittFalse — Вычисляет эталонную 4-значную 16-битную контрольную сумму CRC-16", () => {
			const crc = calculateCrc16CcittFalse("123456789");
			assert.equal(crc, "29B1");

			const emptyCrc = calculateCrc16CcittFalse("");
			assert.equal(emptyCrc, "FFFF");
		});

		it("4.2 generateSbpPaymentQrModel — Формирует валидную динамическую ссылку НСПК СБП", () => {
			const model = generateSbpPaymentQrModel({
				sumKopecks: 1450000, // 14,500 ₽
				orderId: "INV-784",
				clinicLegalName: 'ООО "Денте"',
				clinicInn: "7701234567",
			});

			assert.ok(model.qrId.startsWith("SBPINV784"));
			assert.equal(model.sumKopecks, 1450000);
			assert.equal(model.sumRub, 14500);
			assert.ok(model.nspkUrl.includes("https://qr.nspk.ru/"));
			assert.ok(model.nspkUrl.includes("sum=1450000"));
			assert.ok(model.nspkUrl.includes("cur=RUB"));
			assert.ok(model.nspkUrl.includes(`crc=${model.crc16Hex}`));
			assert.equal(model.crc16Hex.length, 4);

			// EMVCo Merchant Presented payload tags check
			assert.ok(model.emvPayload.startsWith("000201010212"));
			assert.ok(model.emvPayload.includes("5303643")); // Валюта 643 RUB
			assert.ok(model.emvPayload.includes("540814500.00")); // Сумма 14500.00

			// Банковские ссылки
			assert.ok(model.deepLinks.length >= 4);
			const sberLink = model.deepLinks.find((d) => d.bankId === "sber");
			assert.ok(sberLink?.appUrl.startsWith("sberpay://qr/sub?qrId="));
			const tbankLink = model.deepLinks.find((d) => d.bankId === "tbank");
			assert.ok(tbankLink?.appUrl.startsWith("tinkoffbank://qr?id="));
		});

		it("4.3 generateSbpPaymentQrModel — Запрещает создание QR с нулевой или отрицательной суммой", () => {
			assert.throws(
				() => generateSbpPaymentQrModel({ sumKopecks: 0, orderId: "ZERO-SUM" }),
				/строго больше 0 коп\./,
			);
			assert.throws(
				() => generateSbpPaymentQrModel({ sumKopecks: -500, orderId: "NEG-SUM" }),
				/строго больше 0 коп\./,
			);
		});
	});

	describe("5. Онлайн-подписание ИДС и Договора СМС-кодом ПЭП (63-ФЗ)", () => {
		it("5.1 generateSmsOtpForSigning & verifySmsOtpForSigning — Генерация и проверка 6-значного OTP", () => {
			const otp = generateSmsOtpForSigning("+79991234567", "doc-1", "654321");
			assert.equal(otp.code, "654321");
			assert.ok(otp.expiresAt > otp.sentTimestamp);

			// Успешная верификация
			const verifyOk = verifySmsOtpForSigning("654321", "654321", otp.sentTimestamp);
			assert.equal(verifyOk.isSuccess, true);

			// Неверный код
			const verifyWrong = verifySmsOtpForSigning("111111", "654321", otp.sentTimestamp);
			assert.equal(verifyWrong.isSuccess, false);
			assert.match(verifyWrong.error || "", /Неверный код/);

			// Неполный код
			const verifyShort = verifySmsOtpForSigning("123", "654321", otp.sentTimestamp);
			assert.equal(verifyShort.isSuccess, false);
			assert.match(verifyShort.error || "", /6 цифр/);

			// Просроченный код
			const verifyExpired = verifySmsOtpForSigning("654321", "654321", otp.sentTimestamp - 1000 * 60 * 10);
			assert.equal(verifyExpired.isSuccess, false);
			assert.match(verifyExpired.error || "", /истёк/);
		});

		it("5.2 computeDocumentDigest — Генерирует стабильный SHA-256 дайджест документа", () => {
			const doc: SignableStatutoryDocument = {
				id: "doc-test-1",
				documentType: "ids_1051n",
				documentNumber: "ИДС-2026/001",
				titleRu: "Информированное согласие на имплантацию",
				dateIso: "2026-08-28",
				doctorFullName: "Д-р Ковалев С. П.",
				summaryTextRu: "Установка дентального имплантата Straumann BLX",
				fullTextHtml: "<p>Текст согласия...</p>",
				status: "pending_signature",
			};

			const digest = computeDocumentDigest(doc);
			assert.equal(digest.length, 64);
			assert.equal(digest, computeDocumentDigest(doc));
		});

		it("5.3 signDocumentWithPep — Формирует юридически значимый аудит-трейл простой ЭП (63-ФЗ ст. 5, 6)", () => {
			const doc: SignableStatutoryDocument = {
				id: "doc-contract-test",
				documentType: "contract_736",
				documentNumber: "ДОГ-2026/736",
				titleRu: "Договор на оказание платных медицинских услуг",
				dateIso: "2026-08-28",
				doctorFullName: "Смирнова А. С.",
				summaryTextRu: "Комплексное терапевтическое лечение",
				fullTextHtml: "<div>Договор по Постановлению 736</div>",
				status: "pending_signature",
			};

			const signedDoc = signDocumentWithPep({
				document: doc,
				patientPhone: "+79998887766",
				smsOtpCode: "987123",
				signerFullName: "Воронов Алексей Владимирович",
				signerPassport: "Паспорт РФ 4510 № 123456",
				ipAddress: "192.168.1.50",
				userAgent: "Capacitor Mobile PWA iOS 18",
				timestampMs: 1787920000000,
			});

			assert.equal(signedDoc.status, "signed");
			assert.ok(signedDoc.signedAtIso);
			assert.ok(signedDoc.signatureAudit);

			const audit = signedDoc.signatureAudit!;
			assert.equal(audit.verificationMethod, "sms_63fz_pep");
			assert.equal(audit.phone, "+79998887766");
			assert.equal(audit.smsOtpCode, "987123");
			assert.equal(audit.signerFullName, "Воронов Алексей Владимирович");
			assert.equal(audit.legalBasis, "63-ФЗ ст. 5, ст. 6 (ПЭП)");
			assert.equal(audit.statutoryActBasis, "ПП РФ № 736 (Договор)");
			assert.equal(audit.integritySha256.length, 64);
			assert.equal(audit.documentDigest.length, 64);
		});

		it("5.4 getPresetSignableDocuments — Возвращает унифицированные бланки ИДС 1051н и Договора 736", () => {
			const presets = getPresetSignableDocuments("Кузнецов Д. А.", "+79991112233");
			assert.equal(presets.length, 2);
			assert.equal(presets[0]?.documentType, "ids_1051n");
			assert.equal(presets[1]?.documentType, "contract_736");
			assert.ok(presets[0]?.fullTextHtml.includes("323-ФЗ"));
			assert.ok(presets[1]?.fullTextHtml.includes("736"));
		});
	});
});
