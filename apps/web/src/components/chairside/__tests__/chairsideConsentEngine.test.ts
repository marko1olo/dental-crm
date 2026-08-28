import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_CHAIRSIDE_CLINIC,
	calculateEstimateTotalKopecks,
	calculateItemTotalKopecks,
	createChairsideConsentPackage,
	formatKopecksToRubles,
	formatRussianDateTime,
	generateChairsideSmsOtp,
	generateDocumentPackageIntegrityHash,
	generateEstimateDocument,
	generateIds1051nDocument,
	generateLegalPepStamp,
	generatePdn152fzDocument,
	generateSha256,
	hashDoctorPin,
	isValidPinFormat,
	kopecksToRussianWords,
	maskRussianPhone,
	renderChairsidePackageHtml,
	sendChairsideSmsOtpToPatient,
	signPackageWithSmsPep,
	verifyChairsideSmsOtp,
	verifyDoctorPin,
	type ChairsidePatientProfile,
	type ChairsideDoctorProfile,
	type ChairsideTreatmentItem,
	type ChairsideSmsOtpState,
} from "../chairsideConsentEngine.js";

describe("Chairside Tablet Consent & SMS-PEP Engine Suite (63-ФЗ, 323-ФЗ, 1051н, 152-ФЗ, 804н)", () => {
	const mockPatient: ChairsidePatientProfile = {
		fullName: "Смирнова Елена Александровна",
		birthDate: "12.08.1990",
		passport: "Паспорт РФ 4515 № 654321",
		phone: "+7 (916) 777-88-12",
		snils: "112-233-445 95",
		cardNumber: "043/у-9921",
	};

	const mockDoctor: ChairsideDoctorProfile = {
		fullName: "Барабаш Сергей Владимирович",
		specialty: "Врач-стоматолог-терапевт",
		licenseNumber: "ЛО-77-01-012345",
	};

	const mockItems: ChairsideTreatmentItem[] = [
		{
			id: "item-1",
			serviceCode: "A16.07.002.001",
			title: "Препарирование твердых тканей зуба 1.6",
			toothNumber: "16",
			stageTitle: "Этап 1: Терапия",
			quantity: 1,
			unitPriceKopecks: 350000, // 3 500,00 ₽
			discountPercent: 0,
			totalKopecks: 350000,
		},
		{
			id: "item-2",
			serviceCode: "A16.07.008.002",
			title: "Пломбирование зуба 1.6 композитом",
			toothNumber: "16",
			stageTitle: "Этап 1: Терапия",
			quantity: 2,
			unitPriceKopecks: 400000, // 4 000,00 ₽ * 2 = 8 000,00 ₽
			discountPercent: 10, // Скидка 10% -> 7 200,00 ₽ (720 000 коп)
			totalKopecks: 720000,
		},
	];

	// 1. Финансовая математика и копейки
	describe("1. Financial Math & Exact Kopeck Arithmetic", () => {
		it("calculateItemTotalKopecks calculates exact sum with discount", () => {
			const total = calculateItemTotalKopecks(500000, 2, 15);
			assert.equal(total, 850000);
			assert.equal(calculateItemTotalKopecks(250000, 3, 0), 750000);
			assert.equal(calculateItemTotalKopecks(250000, 3, 100), 0);
			assert.equal(calculateItemTotalKopecks(-100, -2, -10), 0);
		});

		it("calculateEstimateTotalKopecks sums all items accurately", () => {
			const total = calculateEstimateTotalKopecks(mockItems);
			assert.equal(total, 1070000); // 350 000 + 720 000 = 1 070 000 коп (10 700,00 ₽)
			assert.equal(calculateEstimateTotalKopecks([]), 0);
		});

		it("formatKopecksToRubles formats kopecks to Russian currency string", () => {
			assert.equal(formatKopecksToRubles(0), "0,00 ₽");
			assert.equal(formatKopecksToRubles(50), "0,50 ₽");
			assert.equal(formatKopecksToRubles(100), "1,00 ₽");
			assert.equal(formatKopecksToRubles(1250050), "12 500,50 ₽");
			assert.equal(formatKopecksToRubles(1070000), "10 700,00 ₽");
		});

		it("kopecksToRussianWords translates kopecks into formal Russian spelling", () => {
			assert.equal(kopecksToRussianWords(0), "Ноль рублей 00 копеек");
			assert.equal(kopecksToRussianWords(50), "Ноль рублей 50 копеек");
			assert.equal(kopecksToRussianWords(100), "Один рубль 00 копеек");
			assert.equal(kopecksToRussianWords(200), "Два рубля 00 копеек");
			assert.equal(kopecksToRussianWords(500), "Пять рублей 00 копеек");
			assert.equal(kopecksToRussianWords(2100), "Двадцать один рубль 00 копеек");
			assert.equal(kopecksToRussianWords(100000), "Одна тысяча рублей 00 копеек");
			assert.equal(kopecksToRussianWords(200000), "Две тысячи рублей 00 копеек");
			assert.equal(kopecksToRussianWords(500000), "Пять тысяч рублей 00 копеек");
			assert.equal(kopecksToRussianWords(1250050), "Двенадцать тысяч пятьсот рублей 50 копеек");
			assert.equal(kopecksToRussianWords(100000000), "Один миллион рублей 00 копеек");
			assert.equal(kopecksToRussianWords(200000000), "Два миллиона рублей 00 копеек");
			assert.equal(kopecksToRussianWords(500000000), "Пять миллионов рублей 00 копеек");
		});
	});

	// 2. Генерация документов пакета (1051н, 152-ФЗ, смета)
	describe("2. Document Generation (1051n, 152-FZ, Treatment Estimate)", () => {
		it("generateIds1051nDocument constructs statutory 1051n consent", () => {
			const doc = generateIds1051nDocument(
				mockPatient,
				mockDoctor,
				DEFAULT_CHAIRSIDE_CLINIC,
				{ diagnosisIcd: "K04.0 Пульпит", teeth: ["16", "17"] },
			);

			assert.equal(doc.type, "ids_1051n");
			assert.equal(doc.code, "ИДС-1051н");
			assert.ok(doc.statutoryBasis.includes("1051н"));
			assert.ok(doc.statutoryBasis.includes("323-ФЗ"));
			assert.equal(doc.isSigned, false);
			assert.equal(doc.sections.length, 4);
			assert.ok(doc.sections[0]?.content.includes("Смирнова Елена Александровна"));
			assert.ok(doc.sections[1]?.content.includes("Барабаш Сергей Владимирович"));
			assert.ok(doc.sections[1]?.content.includes("16, 17"));
			assert.ok(doc.sections[1]?.content.includes("K04.0 Пульпит"));
		});

		it("generatePdn152fzDocument constructs 152-FZ consent for EGISZ", () => {
			const doc = generatePdn152fzDocument(mockPatient, DEFAULT_CHAIRSIDE_CLINIC);

			assert.equal(doc.type, "pdn_152fz");
			assert.equal(doc.code, "СОГЛ-152-ПДН");
			assert.ok(doc.statutoryBasis.includes("152-ФЗ"));
			assert.ok(doc.statutoryBasis.includes("140"));
			assert.equal(doc.isSigned, false);
			assert.equal(doc.sections.length, 4);
			assert.ok(doc.sections[0]?.content.includes("112-233-445 95"));
			assert.ok(doc.sections[2]?.content.includes("ЕГИСЗ"));
		});

		it("generateEstimateDocument constructs formal treatment plan and estimate", () => {
			const doc = generateEstimateDocument(
				mockPatient,
				mockDoctor,
				DEFAULT_CHAIRSIDE_CLINIC,
				mockItems,
				1070000,
				"Десять тысяч семьсот рублей 00 копеек",
			);

			assert.equal(doc.type, "treatment_estimate");
			assert.equal(doc.code, "СМЕТА-ПЛАН");
			assert.ok(doc.statutoryBasis.includes("736"));
			assert.equal(doc.isSigned, false);
			assert.equal(doc.sections.length, 3);
			assert.ok(doc.sections[1]?.content.includes("10 700,00 ₽"));
			assert.ok(doc.sections[1]?.content.includes("Десять тысяч семьсот рублей 00 копеек"));
		});

		it("createChairsideConsentPackage creates complete bundle with 3 documents", () => {
			const pkg = createChairsideConsentPackage({
				patient: mockPatient,
				doctor: mockDoctor,
				treatmentItems: mockItems,
				exitPin: "4321",
			});

			assert.ok(pkg.packageId.startsWith("CSP-"));
			assert.equal(pkg.status, "ready_for_patient");
			assert.equal(pkg.documents.length, 3);
			assert.equal(pkg.totalEstimateKopecks, 1070000);
			assert.equal(pkg.totalEstimateWords, "Десять тысяч семьсот рублей 00 копеек");
			assert.equal(pkg.exitPinHash, hashDoctorPin("4321"));
		});
	});

	// 3. Жизненный цикл СМС-OTP и маскирование телефонов
	describe("3. SMS-OTP Lifecycle & Phone Masking (63-ФЗ)", () => {
		it("maskRussianPhone creates legal phone mask with last 2 digits visible", () => {
			assert.equal(maskRussianPhone("+7 (916) 777-88-12"), "+7 (***) ***-**-12");
			assert.equal(maskRussianPhone("89991234567"), "+7 (***) ***-**-67");
			assert.equal(maskRussianPhone("12"), "+7 (***) ***-**-12");
			assert.equal(maskRussianPhone(""), "+7 (***) ***-**-00");
		});

		it("formatRussianDateTime formats dates to DD.MM.YYYY HH:mm", () => {
			const d = new Date(2026, 7, 28, 14, 30, 0);
			assert.equal(formatRussianDateTime(d), "28.08.2026 14:30");
			assert.equal(formatRussianDateTime("invalid"), "01.01.2026 00:00");
		});

		it("generateChairsideSmsOtp produces 4-digit code with 5-minute expiry", () => {
			const otp = generateChairsideSmsOtp("+7 (916) 777-88-12", "7842");
			assert.equal(otp.code, "7842");
			assert.equal(otp.phone, "+7 (916) 777-88-12");
			assert.equal(otp.phoneMasked, "+7 (***) ***-**-12");
			assert.equal(otp.attemptsCount, 0);
			assert.equal(otp.maxAttempts, 3);
			assert.equal(otp.isVerified, false);
			assert.equal(otp.expiresAt - otp.sentAt, 5 * 60 * 1000); // 5 минут ровно
		});

		it("verifyChairsideSmsOtp validates valid, invalid, expired and wrong codes", () => {
			const now = 1000000;
			const otp: ChairsideSmsOtpState = {
				code: "5678",
				phone: "+7 (916) 777-88-12",
				phoneMasked: "+7 (***) ***-**-12",
				sentAt: now,
				expiresAt: now + 5 * 60 * 1000,
				attemptsCount: 0,
				maxAttempts: 3,
				isVerified: false,
			};

			// Успешная валидация
			const validRes = verifyChairsideSmsOtp("5678", otp, now + 1000);
			assert.equal(validRes.isValid, true);

			// Неверный код
			const wrongRes = verifyChairsideSmsOtp("1111", otp, now + 1000);
			assert.equal(wrongRes.isValid, false);
			assert.ok(wrongRes.reason?.includes("Неверный код"));

			// Неполный код
			const shortRes = verifyChairsideSmsOtp("567", otp, now + 1000);
			assert.equal(shortRes.isValid, false);
			assert.ok(shortRes.reason?.includes("4 цифр"));

			// Пустой код
			const emptyRes = verifyChairsideSmsOtp("", otp, now + 1000);
			assert.equal(emptyRes.isValid, false);
			assert.ok(emptyRes.reason?.includes("Введите"));

			// Истекший код (> 5 минут)
			const expiredRes = verifyChairsideSmsOtp("5678", otp, now + 5 * 60 * 1000 + 1);
			assert.equal(expiredRes.isValid, false);
			assert.ok(expiredRes.reason?.includes("истек"));

			// Превышено число попыток
			const exhaustedOtp = { ...otp, attemptsCount: 3 };
			const exhaustRes = verifyChairsideSmsOtp("5678", exhaustedOtp, now + 1000);
			assert.equal(exhaustRes.isValid, false);
			assert.ok(exhaustRes.reason?.includes("Превышено"));
		});

		it("sendChairsideSmsOtpToPatient updates package state to sms_sent", () => {
			const pkg = createChairsideConsentPackage({
				patient: mockPatient,
				doctor: mockDoctor,
				treatmentItems: mockItems,
			});

			const updated = sendChairsideSmsOtpToPatient(pkg, "+7 (916) 777-88-12", "9944");
			assert.equal(updated.status, "sms_sent");
			assert.ok(updated.smsOtp);
			assert.equal(updated.smsOtp?.code, "9944");
			assert.equal(updated.smsOtp?.phoneMasked, "+7 (***) ***-**-12");
		});
	});

	// 4. Криптографическая целостность SHA-256 и подписание ПЭП (63-ФЗ / 323-ФЗ)
	describe("4. Cryptographic SHA-256 Integrity & 63-FZ PEP Signing", () => {
		it("generateSha256 produces deterministic 64-char hex string", () => {
			const hash1 = generateSha256("DENTAL_CHAIRSIDE_TEST_PAYLOAD");
			const hash2 = generateSha256("DENTAL_CHAIRSIDE_TEST_PAYLOAD");
			assert.equal(hash1, hash2);
			assert.equal(hash1.length, 64);
			assert.match(hash1, /^[0-9a-f]{64}$/);
		});

		it("generateLegalPepStamp generates statutory stamp wording", () => {
			const stamp = generateLegalPepStamp({
				otpCode: "7842",
				hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				phoneMasked: "+7 (***) ***-**-12",
				signedAtFormatted: "28.08.2026 14:30",
			});

			assert.ok(stamp.includes("Документ подписан простой электронной подписью (ПЭП) в соответствии с 63-ФЗ"));
			assert.ok(stamp.includes("Код подтвержден: ****"));
			assert.ok(stamp.includes("Хэш: SHA-256 (e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855)"));
			assert.ok(stamp.includes("Телефон: +7 (***) ***-**-12"));
			assert.ok(stamp.includes("Дата: 28.08.2026 14:30"));
		});

		it("generateDocumentPackageIntegrityHash computes canonical immutable hash", () => {
			const pkg = createChairsideConsentPackage({
				patient: mockPatient,
				doctor: mockDoctor,
				treatmentItems: mockItems,
			});

			const { hash, canonicalData } = generateDocumentPackageIntegrityHash(
				pkg,
				"7842",
				"+7 (916) 777-88-12",
				"2026-08-28T14:30:00.000Z",
			);

			assert.equal(hash.length, 64);
			assert.ok(canonicalData.includes("CANONICAL DENTAL CHAIRSIDE PEP CONSENT RECORD (63-FZ / 323-FZ)"));
			assert.ok(canonicalData.includes("PATIENT_FULL_NAME: СМИРНОВА ЕЛЕНА АЛЕКСАНДРОВНА"));
			assert.ok(canonicalData.includes("FORM_043U_CARD: 043/у-9921"));
			assert.ok(canonicalData.includes("ESTIMATE_TOTAL_KOPECKS: 1070000"));
			assert.ok(canonicalData.includes("PEP_AUTH_METHOD: SMS_OTP_63FZ"));
		});

		it("signPackageWithSmsPep signs package and updates documents to signed state", () => {
			const pkg = createChairsideConsentPackage({
				patient: mockPatient,
				doctor: mockDoctor,
				treatmentItems: mockItems,
			});

			const pkgWithSms = sendChairsideSmsOtpToPatient(pkg, "+7 (916) 777-88-12", "7842");

			const result = signPackageWithSmsPep(pkgWithSms, {
				inputCode: "7842",
				form043uChartNumber: "043/у-9921",
				signedAtIso: "2026-08-28T14:30:00.000Z",
			});

			assert.equal(result.success, true);
			assert.ok(result.signedPackage);

			const signed = result.signedPackage!;
			assert.equal(signed.status, "signed");
			assert.ok(signed.signature);
			assert.equal(signed.signature?.verificationMethod, "sms_63fz_pep");
			assert.equal(signed.signature?.phoneMasked, "+7 (***) ***-**-12");
			assert.equal(signed.signature?.otpCodeConfirmed, "****");
			assert.equal(signed.signature?.form043uRecordId, "043/у-9921");
			assert.ok(signed.signature?.legalStampText.includes("63-ФЗ"));
			assert.equal(signed.documents.every((d) => d.isSigned), true);
			assert.equal(signed.documents.every((d) => Boolean(d.integrityHash)), true);
		});

		it("signPackageWithSmsPep fails and increments attempts on invalid OTP", () => {
			const pkg = createChairsideConsentPackage({
				patient: mockPatient,
				doctor: mockDoctor,
				treatmentItems: mockItems,
			});

			const pkgWithSms = sendChairsideSmsOtpToPatient(pkg, "+7 (916) 777-88-12", "7842");

			const failResult = signPackageWithSmsPep(pkgWithSms, {
				inputCode: "0000",
			});

			assert.equal(failResult.success, false);
			assert.ok(failResult.error?.includes("Неверный код"));
			assert.equal(pkgWithSms.smsOtp?.attemptsCount, 1);
		});
	});

	// 5. Защита выхода PIN-кодом врача
	describe("5. Doctor Exit PIN Security", () => {
		it("hashDoctorPin and verifyDoctorPin manage PIN authentication", () => {
			const hash = hashDoctorPin("7890");
			assert.equal(verifyDoctorPin("7890", hash), true);
			assert.equal(verifyDoctorPin("0000", hash), false);
			assert.equal(verifyDoctorPin("", hash), false);
			assert.equal(verifyDoctorPin("1234", undefined), true);
			assert.equal(verifyDoctorPin("9999", undefined), false);
		});

		it("isValidPinFormat validates 4-6 digit codes", () => {
			assert.equal(isValidPinFormat("1234"), true);
			assert.equal(isValidPinFormat("123456"), true);
			assert.equal(isValidPinFormat("123"), false);
			assert.equal(isValidPinFormat("1234567"), false);
			assert.equal(isValidPinFormat("abcd"), false);
			assert.equal(isValidPinFormat(""), false);
		});
	});

	// 6. Генерация готового PDF/HTML документа
	describe("6. PDF / HTML Document Rendering (Statutory 63-FZ Stamp)", () => {
		it("renderChairsidePackageHtml generates complete valid HTML with PEP stamp when signed", () => {
			const pkg = createChairsideConsentPackage({
				patient: mockPatient,
				doctor: mockDoctor,
				treatmentItems: mockItems,
			});

			const pkgWithSms = sendChairsideSmsOtpToPatient(pkg, "+7 (916) 777-88-12", "7842");
			const { signedPackage } = signPackageWithSmsPep(pkgWithSms, {
				inputCode: "7842",
				form043uChartNumber: "043/у-9921",
				signedAtIso: "2026-08-28T14:30:00.000Z",
			});

			const html = renderChairsidePackageHtml(signedPackage!);
			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("Смирнова Елена Александровна"));
			assert.ok(html.includes("Барабаш Сергей Владимирович"));
			assert.ok(html.includes("ИДС-1051н"));
			assert.ok(html.includes("СОГЛ-152-ПДН"));
			assert.ok(html.includes("СМЕТА-ПЛАН"));
			assert.ok(html.includes("10 700,00 ₽"));
			assert.ok(html.includes("Десять тысяч семьсот рублей 00 копеек"));
			assert.ok(html.includes("ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)"));
			assert.ok(html.includes("63-ФЗ"));
			assert.ok(html.includes("043/у-9921"));
			assert.ok(html.includes(signedPackage!.signature!.integrityHash));
			assert.ok(html.includes("+7 (***) ***-**-12"));
		});

		it("renderChairsidePackageHtml handles unsigned package with manual signature lines", () => {
			const pkg = createChairsideConsentPackage({
				patient: mockPatient,
				doctor: mockDoctor,
				treatmentItems: mockItems,
			});

			const html = renderChairsidePackageHtml(pkg, { includeSignatures: false });
			assert.ok(html.includes("Врач: ____________________ / Барабаш Сергей Владимирович /"));
			assert.ok(html.includes("Пациент: ____________________ / Смирнова Елена Александровна /"));
		});
	});
});
