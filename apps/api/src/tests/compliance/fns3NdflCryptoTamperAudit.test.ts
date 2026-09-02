import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";
import {
	buildFnsKnd1151156Xml,
	type FnsTaxPayload,
} from "../../services/fns/fnsKnd1151156Builder.js";
import {
	createDemonstrationGostCmsSignature,
	validateGostCmsPkcs7Signature,
	kopecksToNumericString,
	parseKopecks,
	sumKopecks,
} from "@dental/shared";

describe("Wave 6: FNS 3-NDFL Tax Snapshot Integrity & Chief Accountant UKEP Audit", () => {
	const validFnsTaxPayload: FnsTaxPayload = {
		taxInspectionCode: "7701",
		documentNumber: "СПР-2026-089",
		documentDate: "2026-09-02",
		taxYear: "2025",
		certificateKind: "1",
		clinic: {
			inn: "7701234567",
			kpp: "770101001",
			ogrn: "1027700132195",
			name: 'ООО "Стоматологическая клиника ДЕНТЕ"',
			license: {
				number: "ЛО-77-01-019842",
				date: "2021-04-12",
			},
		},
		payer: {
			inn: "770198765432",
			snils: "112-233-445 95",
			birthDate: "1982-03-25",
			fullName: {
				family: "Морозов",
				given: "Андрей",
				patronymic: "Викторович",
			},
			identityDocument: {
				docTypeCode: "21",
				seriesAndNumber: "4508 654321",
				issueDate: "2002-04-10",
			},
		},
		patient: {
			patientKinshipCode: "1", // Сам налогоплательщик
		},
		expenses: {
			// Обычные услуги (Код 1): 120 000.50 руб
			code1AmountKopecks: 12000050,
			// Дорогостоящее лечение (Код 2, имплантация): 350 000.00 руб
			code2AmountKopecks: 35000000,
		},
		signatory: {
			signatoryRole: "1", // Руководитель / Главный бухгалтер
			snils: "087-654-303 00",
			fullName: {
				family: "Смирнова",
				given: "Елена",
				patronymic: "Сергеевна",
			},
		},
	};

	it("1. Verifies byte-exact kopeck arithmetic and XML conformity for FNS Order EA-7-11/824@ (Format 5.01)", () => {
		// Побайтовая проверка сумм в копейках
		const payment1Kopecks = parseKopecks("50000.25");
		const payment2Kopecks = parseKopecks("70000.25");
		const totalCode1Kopecks = sumKopecks([payment1Kopecks, payment2Kopecks]);
		assert.strictEqual(totalCode1Kopecks, 12000050, "Сумма в копейках обязана быть 12000050 без ошибок округления float");

		const formattedCode1 = kopecksToNumericString(totalCode1Kopecks);
		assert.strictEqual(formattedCode1, "120000.50");

		const { xmlContent, fileName, fileId } = buildFnsKnd1151156Xml(validFnsTaxPayload, "fixed-uuid-tax-1");

		// Соответствие формату ФНС России
		assert.ok(xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xmlContent.includes('КНД="1184043"'), "Электронный формат налоговой справки КНД 1184043");
		assert.ok(xmlContent.includes('ВерсФорм="5.01"'), "Версия формата ФНС 5.01");
		assert.ok(xmlContent.includes('ГодУсл="2025"'), "Налоговый период 2025 год");
		assert.ok(xmlContent.includes('ИННЮЛ="7701234567"'));
		assert.ok(xmlContent.includes('ОГРН="1027700132195"'));
		assert.ok(xmlContent.includes('<СведРасхУсл КодУслуг="1" СумОпл="120000.50"/>'));
		assert.ok(xmlContent.includes('<СведРасхУсл КодУслуг="2" СумОпл="350000.00"/>'));
		assert.ok(xmlContent.includes('<Подписант ПрПодп="1" СНИЛС="08765430300">'));
		assert.ok(xmlContent.includes('<ФИО Фамилия="Смирнова" Имя="Елена" Отчество="Сергеевна"/>'));

		// Проверка имени файла ФНС
		assert.ok(fileName.startsWith("UT_SVOPLMEDUSL_7701_7701_7701234567770101001_"));
		assert.ok(fileName.endsWith(".xml"));
		assert.strictEqual(fileName, `${fileId}.xml`);
	});

	it("2. Validates Chief Accountant UKEP detached signature over FNS 3-NDFL XML snapshot", () => {
		const { xmlContent } = buildFnsKnd1151156Xml(validFnsTaxPayload, "fixed-uuid-tax-2");
		const xmlSha256 = createHash("sha256").update(xmlContent, "utf8").digest("hex");

		// Наложение отсоединенной подписи ГОСТ Р 34.10-2012 главного бухгалтера
		const accountantSignature = createDemonstrationGostCmsSignature({
			documentId: "doc-tax-2025-089",
			documentKind: "tax_deduction_certificate",
			documentHashHex: xmlSha256,
			doctorFullName: "Смирнова Елена Сергеевна (Главный бухгалтер / Генеральный директор)",
		});

		// Валидация подписи оригинального налогового снимка
		const verification = validateGostCmsPkcs7Signature(accountantSignature.signatureBase64, xmlSha256);
		assert.strictEqual(verification.valid, true, "Подпись главбуха на оригинальном XML обязана быть валидной");
		assert.strictEqual(verification.details?.format, "CMS_PKCS7_DETACHED_CADES_BES");
		assert.strictEqual(verification.details?.hasGostOid, true);
	});

	it("3. Strictly catches Tax Tamper Attack: altering payment amount or deduction code invalidates UKEP", () => {
		const { xmlContent } = buildFnsKnd1151156Xml(validFnsTaxPayload, "fixed-uuid-tax-3");
		const originalXmlSha256 = createHash("sha256").update(xmlContent, "utf8").digest("hex");

		const validSignature = createDemonstrationGostCmsSignature({
			documentId: "doc-tax-2025-089",
			documentKind: "tax_deduction_certificate",
			documentHashHex: originalXmlSha256,
			doctorFullName: "Смирнова Елена Сергеевна",
		});

		// АТАКА 1: Изменение суммы обычного лечения в XML (120000.50 -> 150000.50)
		const tamperedAmountXml = xmlContent.replace('СумОпл="120000.50"', 'СумОпл="150000.50"');
		assert.notStrictEqual(xmlContent, tamperedAmountXml);
		const tamperedAmountHash = createHash("sha256").update(tamperedAmountXml, "utf8").digest("hex");

		const checkAmountTamper = validateGostCmsPkcs7Signature(validSignature.signatureBase64, tamperedAmountHash);
		assert.strictEqual(checkAmountTamper.valid, false);
		assert.strictEqual(checkAmountTamper.errorCode, "TamperDetected");
		assert.strictEqual(checkAmountTamper.tamperDetected, true);

		// АТАКА 2: Изменение кода услуги с обычного (КодУслуг="1") на дорогостоящее безлимитное (КодУслуг="2")
		const tamperedCodeXml = xmlContent.replace('КодУслуг="1" СумОпл="120000.50"', 'КодУслуг="2" СумОпл="120000.50"');
		assert.notStrictEqual(xmlContent, tamperedCodeXml);
		const tamperedCodeHash = createHash("sha256").update(tamperedCodeXml, "utf8").digest("hex");

		const checkCodeTamper = validateGostCmsPkcs7Signature(validSignature.signatureBase64, tamperedCodeHash);
		assert.strictEqual(checkCodeTamper.valid, false);
		assert.strictEqual(checkCodeTamper.errorCode, "TamperDetected");
		assert.strictEqual(checkCodeTamper.tamperDetected, true);

		// АТАКА 3: Изменение ИНН налогоплательщика в XML
		const tamperedInnPayerXml = xmlContent.replace('ИННФЛ="770198765432"', 'ИННФЛ="770111111111"');
		assert.notStrictEqual(xmlContent, tamperedInnPayerXml);
		const tamperedInnPayerHash = createHash("sha256").update(tamperedInnPayerXml, "utf8").digest("hex");

		const checkInnPayerTamper = validateGostCmsPkcs7Signature(validSignature.signatureBase64, tamperedInnPayerHash);
		assert.strictEqual(checkInnPayerTamper.valid, false);
		assert.strictEqual(checkInnPayerTamper.errorCode, "TamperDetected");
		assert.strictEqual(checkInnPayerTamper.tamperDetected, true);
	});
});
