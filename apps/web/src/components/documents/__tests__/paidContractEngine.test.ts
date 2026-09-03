import assert from "node:assert";
import { describe, test } from "node:test";
import {
	createDefaultPaidContract,
	formatKopecksToRubAndKop,
	generatePaidContractHtml,
	generatePaidContractIntegrityHash,
	generatePaidContractText,
	generateSha256,
	generateSmsSignOtp,
	numberToWordsRu,
	pluralizeRu,
	validatePaidContract736,
	verifySmsSignOtp,
} from "../paidContractEngine";

describe("Paid Contract Engine (Постановление Правительства РФ № 736)", () => {
	describe("1. Money and Kopecks formatting in words", () => {
		test("pluralizeRu handles Russian declensions correctly", () => {
			assert.strictEqual(pluralizeRu(1, "рубль", "рубля", "рублей"), "рубль");
			assert.strictEqual(pluralizeRu(2, "рубль", "рубля", "рублей"), "рубля");
			assert.strictEqual(pluralizeRu(4, "рубль", "рубля", "рублей"), "рубля");
			assert.strictEqual(pluralizeRu(5, "рубль", "рубля", "рублей"), "рублей");
			assert.strictEqual(pluralizeRu(11, "рубль", "рубля", "рублей"), "рублей");
			assert.strictEqual(pluralizeRu(21, "рубль", "рубля", "рублей"), "рубль");
			assert.strictEqual(pluralizeRu(22, "рубль", "рубля", "рублей"), "рубля");

			assert.strictEqual(pluralizeRu(1, "копейка", "копейки", "копеек"), "копейка");
			assert.strictEqual(pluralizeRu(2, "копейка", "копейки", "копеек"), "копейки");
			assert.strictEqual(pluralizeRu(5, "копейка", "копейки", "копеек"), "копеек");
		});

		test("numberToWordsRu formats 0 kopecks correctly", () => {
			assert.strictEqual(numberToWordsRu(0), "ноль рублей 00 копеек");
		});

		test("numberToWordsRu formats kopecks without rubles", () => {
			assert.strictEqual(numberToWordsRu(1), "ноль рублей 01 копейка");
			assert.strictEqual(numberToWordsRu(2), "ноль рублей 02 копейки");
			assert.strictEqual(numberToWordsRu(50), "ноль рублей 50 копеек");
		});

		test("numberToWordsRu formats typical dental amounts with feminine and masculine units", () => {
			// 1 500 руб. 50 коп. (150050 копеек)
			const res1500 = numberToWordsRu(150050);
			assert.ok(res1500.includes("Одна тысяча пятьсот рублей 50 копеек"));

			// 21 000 руб. 00 коп. (2100000 копеек)
			const res21000 = numberToWordsRu(2100000);
			assert.ok(res21000.includes("Двадцать одна тысяча рублей 00 копеек"));

			// 112 345 руб. 12 коп. (11234512 копеек)
			const res112345 = numberToWordsRu(11234512);
			assert.ok(res112345.includes("Сто двенадцать тысяч триста сорок пять рублей 12 копеек"));
		});

		test("formatKopecksToRubAndKop returns exact structure with formatted strings", () => {
			const info = formatKopecksToRubAndKop(800050);
			assert.strictEqual(info.wholeRub, 8000);
			assert.strictEqual(info.kop, 50);
			assert.ok(info.formatted.includes("8 000,50"));
			assert.ok(info.formattedWithKopecks.includes("8 000 руб. 50 коп."));
			assert.ok(info.inWords.includes("Восемь тысяч рублей 50 копеек"));
		});
	});

	describe("2. Statutory Validation (ПП РФ № 736)", () => {
		test("Default contract passes all 736 statutory validation gates", () => {
			const contract = createDefaultPaidContract({
				patientFullName: "Смирнова Елена Александровна",
				patientBirthDate: "12.04.1985",
				patientPassport: "45 12 987654",
				patientAddress: "г. Москва, ул. Арбат, д. 10",
				patientPhone: "+7 (999) 111-22-33",
			});

			const validation = validatePaidContract736(contract);
			assert.strictEqual(validation.isValid, true);
			assert.strictEqual(validation.missingFields.length, 0);
		});

		test("Fails validation when clinic license is missing", () => {
			const contract = createDefaultPaidContract({});
			contract.clinic.licenseNumber = "";

			const validation = validatePaidContract736(contract);
			assert.strictEqual(validation.isValid, false);
			assert.ok(validation.missingFields.some((f) => f.field === "clinic.licenseNumber"));
		});

		test("Fails validation when clinic OGRN or INN is missing", () => {
			const contract = createDefaultPaidContract({});
			contract.clinic.ogrn = "";
			contract.clinic.inn = "";

			const validation = validatePaidContract736(contract);
			assert.strictEqual(validation.isValid, false);
			assert.ok(validation.missingFields.some((f) => f.field === "clinic.ogrn"));
			assert.ok(validation.missingFields.some((f) => f.field === "clinic.inn"));
		});

		test("Fails validation when patient passport or address is missing", () => {
			const contract = createDefaultPaidContract({});
			contract.patient.passportSeries = "";
			contract.patient.registrationAddress = "";

			const validation = validatePaidContract736(contract);
			assert.strictEqual(validation.isValid, false);
			assert.ok(validation.missingFields.some((f) => f.field === "patient.passport"));
			assert.ok(validation.missingFields.some((f) => f.field === "patient.registrationAddress"));
		});

		test("Validates customer requisites when customer differs from patient", () => {
			const contract = createDefaultPaidContract({});
			contract.customer.isDifferentFromPatient = true;
			contract.customer.fullName = ""; // Missing
			contract.customer.passportSeries = ""; // Missing

			const validation = validatePaidContract736(contract);
			assert.strictEqual(validation.isValid, false);
			assert.ok(validation.missingFields.some((f) => f.field === "customer.fullName"));
			assert.ok(validation.missingFields.some((f) => f.field === "customer.passport"));
		});

		test("Fails validation when total amount is 0 or negative", () => {
			const contract = createDefaultPaidContract({});
			contract.totalAmountKopecks = 0;

			const validation = validatePaidContract736(contract);
			assert.strictEqual(validation.isValid, false);
			assert.ok(validation.missingFields.some((f) => f.field === "totalAmountKopecks"));
		});

		test("Fails validation when mandatory disclosures / checkboxes are unchecked", () => {
			const contract = createDefaultPaidContract({});
			contract.confirmedDisclosures.freeCareNoticeUnderstood = false;
			contract.confirmedDisclosures.clinicInfoConfirmed = false;

			const validation = validatePaidContract736(contract);
			assert.strictEqual(validation.isValid, false);
			assert.ok(
				validation.missingFields.some(
					(f) => f.field === "confirmedDisclosures.freeCareNoticeUnderstood",
				),
			);
			assert.ok(
				validation.missingFields.some(
					(f) => f.field === "confirmedDisclosures.clinicInfoConfirmed",
				),
			);
		});

		test("Allows printing blank contract when total amount is 0 or passport is missing", () => {
			const contract = createDefaultPaidContract({});
			contract.totalAmountKopecks = 0;
			contract.patient.passportSeries = "";
			contract.patient.passportNumber = "";

			const validation = validatePaidContract736(contract, { allowBlankForPrint: true });
			assert.strictEqual(validation.isValid, true);
			assert.strictEqual(validation.missingFields.length, 0);
			assert.ok(validation.warnings.some((w) => w.includes("Паспортные данные")));
			assert.ok(validation.warnings.some((w) => w.includes("Сумма договора не указана")));
		});
	});

	describe("3. Document Generation (Text and A4 HTML)", () => {
		test("generatePaidContractHtml and Text output underlines for blank contract with 0 amount or missing passport", () => {
			const contract = createDefaultPaidContract({
				patientFullName: "Сидоров Алексей Петрович",
				totalAmountKopecks: 0,
			});
			contract.patient.passportSeries = "";
			contract.patient.passportNumber = "";

			const text = generatePaidContractText(contract);
			assert.ok(text.includes("____________________ руб."));
			assert.ok(text.includes("серия _____ № __________"));

			const html = generatePaidContractHtml(contract);
			assert.ok(html.includes("____________________ руб."));
			assert.ok(html.includes("серия _____ № __________"));
			assert.ok(html.includes("_______________ руб."));
		});
		test("generatePaidContractText includes all statutory sections and exact kopecks", () => {
			const contract = createDefaultPaidContract({
				patientFullName: "Ковалев Сергей Михайлович",
				totalAmountKopecks: 1250050, // 12 500 руб. 50 коп.
			});

			const text = generatePaidContractText(contract);
			assert.ok(text.includes("Постановлением Правительства РФ"));
			assert.ok(text.includes("№ 736"));
			assert.ok(text.includes("Ковалев Сергей Михайлович"));
			assert.ok(text.includes("12 500 руб. 50 коп."));
			assert.ok(text.includes("Двенадцать тысяч пятьсот рублей 50 копеек"));
			assert.ok(text.includes("1051н"));
			assert.ok(text.includes("152-ФЗ"));
			assert.ok(text.includes("54-ФЗ"));
			assert.ok(text.includes("ЕГИСЗ"));
		});

		test("generatePaidContractHtml generates clean A4 HTML with styles and tables", () => {
			const contract = createDefaultPaidContract({
				patientFullName: "Барабаш Светлана Владимировна",
				totalAmountKopecks: 3500000,
			});

			const html = generatePaidContractHtml(contract);
			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("Барабаш Светлана Владимировна"));
			assert.ok(html.includes("35 000,00"));
			assert.ok(html.includes("УВЕДОМЛЕНИЕ О БЕСПЛАТНОЙ МЕДИЦИНСКОЙ ПОМОЩИ"));
			assert.ok(html.includes("Л041-01137"));
			assert.ok(html.includes("PT Astra Sans"));
		});
	});

	describe("4. SMS-OTP Digital Signature (ПЭП по 63-ФЗ)", () => {
		test("generateSmsSignOtp generates 4-digit code and masked phone", () => {
			const otp = generateSmsSignOtp("+7 (999) 888-77-66");
			assert.strictEqual(otp.code.length, 4);
			assert.ok(/^\d{4}$/.test(otp.code));
			assert.ok(otp.expiresAt > otp.sentAt);
			assert.ok(otp.phoneMasked.includes("+7 (999) ***-**-66"));
		});

		test("verifySmsSignOtp verifies valid code correctly", () => {
			const otp = generateSmsSignOtp("+7 (999) 888-77-66");
			const res = verifySmsSignOtp(otp.code, otp);
			assert.strictEqual(res.success, true);
			assert.strictEqual(res.error, undefined);
		});

		test("verifySmsSignOtp rejects incorrect code with helpful error", () => {
			const otp = generateSmsSignOtp("+7 (999) 888-77-66");
			const res = verifySmsSignOtp("0000", otp);
			if (otp.code !== "0000") {
				assert.strictEqual(res.success, false);
				assert.ok(res.error?.includes("Неверный код"));
			}
		});

		test("verifySmsSignOtp rejects expired code", () => {
			const otp = {
				code: "1234",
				sentAt: Date.now() - 10 * 60 * 1000,
				expiresAt: Date.now() - 5 * 60 * 1000, // expired 5 mins ago
			};
			const res = verifySmsSignOtp("1234", otp);
			assert.strictEqual(res.success, false);
			assert.ok(res.error?.includes("истек"));
		});

		test("verifySmsSignOtp rejects empty code", () => {
			const otp = generateSmsSignOtp("+7 (999) 888-77-66");
			const res = verifySmsSignOtp("", otp);
			assert.strictEqual(res.success, false);
			assert.ok(res.error?.includes("Введите 4-значный код"));
		});

		test("generateSha256 produces deterministic 64-char hex string for Cyrillic and ASCII", () => {
			const h1 = generateSha256("ДОГОВОР_736_ТЕСТ");
			const h2 = generateSha256("ДОГОВОР_736_ТЕСТ");
			assert.strictEqual(h1.length, 64);
			assert.strictEqual(h1, h2);
		});

		test("generatePaidContractIntegrityHash generates unique hash based on contract and OTP digest", () => {
			const contract = createDefaultPaidContract({
				patientFullName: "Иванов Иван Иванович",
				totalAmountKopecks: 500000,
			});
			const hash1 = generatePaidContractIntegrityHash(contract, "1234", "2026-08-29T10:00:00.000Z");
			const hash2 = generatePaidContractIntegrityHash(contract, "1234", "2026-08-29T10:00:00.000Z");
			const hashDiffOtp = generatePaidContractIntegrityHash(contract, "9999", "2026-08-29T10:00:00.000Z");

			assert.strictEqual(hash1.length, 64);
			assert.strictEqual(hash1, hash2);
			assert.notStrictEqual(hash1, hashDiffOtp);
		});
	});
});
