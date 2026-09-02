import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";
import {
	canonicalizeTreatmentPlanPayload,
	canonicalizeInformedConsentPayload,
	computeGostSigningDigestSha256,
	createDemonstrationGostCmsSignature,
	validateGostCmsPkcs7Signature,
	validateDoctorSignatureStatutoryMode,
	validateCertificateStatus,
	DOCTOR_PEP_FORBIDDEN_MESSAGE,
} from "@dental/shared";

describe("Wave 7: Informed Consent & Treatment Plan Cryptographic Immutability & Anti-Tamper Audit", () => {
	// ─── 1. ТЕСТИРОВАНИЕ ПОДПИСАНИЯ ПЛАНА ЛЕЧЕНИЯ И ЗАЩИТЫ ОТ МОДИФИКАЦИИ ────

	const basePlanItems = [
		{
			serviceCode: "A16.07.054",
			serviceTitle: "Дентальная имплантация Dentium SuperLine",
			toothNumber: "46",
			quantity: 1,
			totalKopecks: 6500000, // 65 000.00 ₽
		},
		{
			serviceCode: "A16.07.054.001",
			serviceTitle: "Установка формирователя десны",
			toothNumber: "46",
			quantity: 1,
			totalKopecks: 1200000, // 12 000.00 ₽
		},
		{
			serviceCode: "A16.07.023",
			serviceTitle: "Коронка из диоксида циркония на индивидуальном титановом абатменте",
			toothNumber: "46",
			quantity: 1,
			totalKopecks: 5500000, // 55 000.00 ₽
		},
		{
			serviceCode: "A16.07.051",
			serviceTitle: "Профессиональная комплексная гигиена полости рта AirFlow",
			toothNumber: null,
			quantity: 1,
			totalKopecks: 800000, // 8 000.00 ₽
		},
	];

	const baseTreatmentPlan = {
		documentId: "plan-7701-2026-001",
		clinicName: 'ООО "Стоматологическая клиника ДЕНТЕ"',
		doctorFullName: "Смирнова Елена Сергеевна",
		patientFullName: "Морозов Андрей Викторович",
		totalAmountKopecks: 14000000, // 140 000.00 ₽
		items: basePlanItems,
		createdAtIso: "2026-09-02T14:30:00Z",
	};

	it("1.1 Successfully generates canonical representation, SHA-256 digest and valid CAdES-BES signature for treatment plan", () => {
		const canonicalText = canonicalizeTreatmentPlanPayload(baseTreatmentPlan);
		assert.ok(canonicalText.includes("ID:TREATMENT_PLAN_CANONICAL_V1"));
		assert.ok(canonicalText.includes("DOC_ID:plan-7701-2026-001"));
		assert.ok(canonicalText.includes("TOTAL_KOPECKS:14000000"));
		assert.ok(canonicalText.includes("46|1|6500000"));
		assert.ok(canonicalText.includes("AirFlow"));

		const { sha256Hex } = computeGostSigningDigestSha256(canonicalText);
		assert.strictEqual(sha256Hex.length, 64);

		// Формирование отсоединенной подписи CAdES-BES лечащего врача
		const doctorSignature = createDemonstrationGostCmsSignature({
			documentId: baseTreatmentPlan.documentId,
			documentKind: "treatment_plan",
			documentHashHex: sha256Hex,
			doctorFullName: baseTreatmentPlan.doctorFullName,
		});

		// Валидация подлинности исходного плана
		const verification = validateGostCmsPkcs7Signature(doctorSignature.signatureBase64, sha256Hex);
		assert.strictEqual(verification.valid, true, "Подпись врача обязана быть валидной для исходного плана");
		assert.strictEqual(verification.details?.format, "CMS_PKCS7_DETACHED_CADES_BES");
		assert.strictEqual(verification.details?.hasGostOid, true);
	});

	it("1.2 Attack 1: Attempt to add unapproved services or modify treatment plan composition invalidates signature (TamperDetected)", () => {
		const canonicalText = canonicalizeTreatmentPlanPayload(baseTreatmentPlan);
		const { sha256Hex: originalSha256 } = computeGostSigningDigestSha256(canonicalText);

		const doctorSignature = createDemonstrationGostCmsSignature({
			documentId: baseTreatmentPlan.documentId,
			documentKind: "treatment_plan",
			documentHashHex: originalSha256,
			doctorFullName: baseTreatmentPlan.doctorFullName,
		});

		// АТАКА: Недобросовестная клиника добавляет несогласованную платную процедуру (Пластика мягких тканей +25 000 ₽)
		const tamperedPlan = {
			...baseTreatmentPlan,
			totalAmountKopecks: 16500000,
			items: [
				...baseTreatmentPlan.items,
				{
					serviceCode: "A16.07.041.001",
					serviceTitle: "Пластика мягких тканей в области имплантата свободным десневым трансплантатом",
					toothNumber: "46",
					quantity: 1,
					totalKopecks: 2500000,
				},
			],
		};

		const tamperedCanonical = canonicalizeTreatmentPlanPayload(tamperedPlan);
		const { sha256Hex: tamperedSha256 } = computeGostSigningDigestSha256(tamperedCanonical);
		assert.notStrictEqual(originalSha256, tamperedSha256);

		// Криптографическая проверка отвергает измененный план
		const attackResult = validateGostCmsPkcs7Signature(doctorSignature.signatureBase64, tamperedSha256);
		assert.strictEqual(attackResult.valid, false);
		assert.strictEqual(attackResult.errorCode, "TamperDetected");
		assert.strictEqual(attackResult.tamperDetected, true);
	});

	it("1.3 Attack 2: Attempt to alter treatment plan prices (including 1-kopeck drift) invalidates signature (TamperDetected)", () => {
		const canonicalText = canonicalizeTreatmentPlanPayload(baseTreatmentPlan);
		const { sha256Hex: originalSha256 } = computeGostSigningDigestSha256(canonicalText);

		const doctorSignature = createDemonstrationGostCmsSignature({
			documentId: baseTreatmentPlan.documentId,
			documentKind: "treatment_plan",
			documentHashHex: originalSha256,
			doctorFullName: baseTreatmentPlan.doctorFullName,
		});

		// АТАКА 2.1: Завышение цены этапа имплантации (65 000 ₽ -> 95 000 ₽, общая сумма 170 000 ₽)
		const priceInflatedPlan = {
			...baseTreatmentPlan,
			totalAmountKopecks: 17000000,
			items: baseTreatmentPlan.items.map((it) =>
				it.serviceCode === "A16.07.054" ? { ...it, totalKopecks: 9500000 } : it,
			),
		};
		const { sha256Hex: inflatedSha256 } = computeGostSigningDigestSha256(
			canonicalizeTreatmentPlanPayload(priceInflatedPlan),
		);
		const checkInflated = validateGostCmsPkcs7Signature(doctorSignature.signatureBase64, inflatedSha256);
		assert.strictEqual(checkInflated.valid, false);
		assert.strictEqual(checkInflated.errorCode, "TamperDetected");
		assert.strictEqual(checkInflated.tamperDetected, true);

		// АТАКА 2.2: Однокопеечное искажение сметы (14 000 000 коп -> 14 000 001 коп)
		const oneKopeckTamperedPlan = {
			...baseTreatmentPlan,
			totalAmountKopecks: 14000001,
		};
		const { sha256Hex: oneKopeckSha256 } = computeGostSigningDigestSha256(
			canonicalizeTreatmentPlanPayload(oneKopeckTamperedPlan),
		);
		const checkOneKopeck = validateGostCmsPkcs7Signature(doctorSignature.signatureBase64, oneKopeckSha256);
		assert.strictEqual(checkOneKopeck.valid, false);
		assert.strictEqual(checkOneKopeck.errorCode, "TamperDetected");
		assert.strictEqual(checkOneKopeck.tamperDetected, true);
	});

	it("1.4 Attack 3: Attempt to alter tooth FDI number (46 -> 47) invalidates signature (TamperDetected)", () => {
		const canonicalText = canonicalizeTreatmentPlanPayload(baseTreatmentPlan);
		const { sha256Hex: originalSha256 } = computeGostSigningDigestSha256(canonicalText);

		const doctorSignature = createDemonstrationGostCmsSignature({
			documentId: baseTreatmentPlan.documentId,
			documentKind: "treatment_plan",
			documentHashHex: originalSha256,
			doctorFullName: baseTreatmentPlan.doctorFullName,
		});

		// АТАКА: Подмена номера зуба с 46 на 47
		const toothTamperedPlan = {
			...baseTreatmentPlan,
			items: baseTreatmentPlan.items.map((it) =>
				it.toothNumber === "46" ? { ...it, toothNumber: "47" } : it,
			),
		};
		const { sha256Hex: toothTamperedSha256 } = computeGostSigningDigestSha256(
			canonicalizeTreatmentPlanPayload(toothTamperedPlan),
		);
		assert.notStrictEqual(originalSha256, toothTamperedSha256);

		const checkTooth = validateGostCmsPkcs7Signature(doctorSignature.signatureBase64, toothTamperedSha256);
		assert.strictEqual(checkTooth.valid, false);
		assert.strictEqual(checkTooth.errorCode, "TamperDetected");
		assert.strictEqual(checkTooth.tamperDetected, true);
	});

	// ─── 2. ТЕСТИРОВАНИЕ ИНФОРМИРОВАННОГО СОГЛАСИЯ (ИДС № 1051н) ─────────────

	const baseInformedConsent = {
		documentId: "ids-7701-2026-888",
		patientFullName: "Морозов Андрей Викторович",
		patientBirthDate: "1982-03-25",
		patientSnils: "112-233-445 95",
		clinicName: 'ООО "Стоматологическая клиника ДЕНТЕ"',
		doctorFullName: "Смирнова Елена Сергеевна",
		interventionDescription:
			"Операция дентальной имплантации в области отсутствующего зуба 46 с установкой имплантата Dentium SuperLine и остеопластикой.",
		risksAndComplications:
			"Возможные осложнения: кровотечение, гематома, отек мягких тканей лица, временное нарушение чувствительности (парестезия) нижнеальвеолярного нерва, периимплантит, отторжение имплантата.",
		consentedAtIso: "2026-09-02T14:15:00Z",
	};

	it("2.1 Validates genuine doctor UKEP signature over statutory Informed Consent (Order 1051n)", () => {
		const canonicalText = canonicalizeInformedConsentPayload(baseInformedConsent);
		assert.ok(canonicalText.includes("ID:1051N_INFORMED_CONSENT"));
		assert.ok(canonicalText.includes("DOC_ID:ids-7701-2026-888"));
		assert.ok(canonicalText.includes("PATIENT:Морозов Андрей Викторович"));
		assert.ok(canonicalText.includes("SNILS:112-233-445 95"));
		assert.ok(canonicalText.includes("парестезия"));

		const { sha256Hex } = computeGostSigningDigestSha256(canonicalText);
		const doctorSignature = createDemonstrationGostCmsSignature({
			documentId: baseInformedConsent.documentId,
			documentKind: "informed_consent",
			documentHashHex: sha256Hex,
			doctorFullName: baseInformedConsent.doctorFullName,
		});

		const verification = validateGostCmsPkcs7Signature(doctorSignature.signatureBase64, sha256Hex);
		assert.strictEqual(verification.valid, true, "Подпись под ИДС обязана быть валидной");
		assert.strictEqual(verification.details?.format, "CMS_PKCS7_DETACHED_CADES_BES");
	});

	it("2.2 Attack 4: Retroactive modification of risks and complications in signed Informed Consent is caught (TamperDetected)", () => {
		const canonicalText = canonicalizeInformedConsentPayload(baseInformedConsent);
		const { sha256Hex: originalSha256 } = computeGostSigningDigestSha256(canonicalText);

		const doctorSignature = createDemonstrationGostCmsSignature({
			documentId: baseInformedConsent.documentId,
			documentKind: "informed_consent",
			documentHashHex: originalSha256,
			doctorFullName: baseInformedConsent.doctorFullName,
		});

		// АТАКА: После возникновения осложнения клиника пытается дописать в ИДС задним числом
		// отказ от претензий и расширенный перечень осложнений
		const tamperedConsent = {
			...baseInformedConsent,
			risksAndComplications:
				baseInformedConsent.risksAndComplications +
				" Пациент уведомлен и согласен с риском стойкой пожизненной потери чувствительности подбородка без права материальной компенсации со стороны клиники.",
		};

		const tamperedCanonical = canonicalizeInformedConsentPayload(tamperedConsent);
		const { sha256Hex: tamperedSha256 } = computeGostSigningDigestSha256(tamperedCanonical);
		assert.notStrictEqual(originalSha256, tamperedSha256);

		const checkFraud = validateGostCmsPkcs7Signature(doctorSignature.signatureBase64, tamperedSha256);
		assert.strictEqual(checkFraud.valid, false, "Модифицированное ИДС обязано быть отвергнуто");
		assert.strictEqual(checkFraud.errorCode, "TamperDetected");
		assert.strictEqual(checkFraud.tamperDetected, true);
	});

	it("2.3 Attack 5: Cross-Document & Cross-Patient Signature Replay Attack is strictly blocked", () => {
		const planCanonical = canonicalizeTreatmentPlanPayload(baseTreatmentPlan);
		const { sha256Hex: planSha256 } = computeGostSigningDigestSha256(planCanonical);

		const planSig = createDemonstrationGostCmsSignature({
			documentId: baseTreatmentPlan.documentId,
			documentKind: "treatment_plan",
			documentHashHex: planSha256,
			doctorFullName: baseTreatmentPlan.doctorFullName,
		});

		// Попытка перенести подпись с плана лечения на ИДС того же пациента
		const idsCanonical = canonicalizeInformedConsentPayload(baseInformedConsent);
		const { sha256Hex: idsSha256 } = computeGostSigningDigestSha256(idsCanonical);

		const replayCrossDoc = validateGostCmsPkcs7Signature(planSig.signatureBase64, idsSha256);
		assert.strictEqual(replayCrossDoc.valid, false);
		assert.strictEqual(replayCrossDoc.errorCode, "TamperDetected");
		assert.strictEqual(replayCrossDoc.tamperDetected, true);

		// Попытка перенести подпись с плана лечения пациента Морозова на план лечения другого пациента
		const otherPatientPlan = {
			...baseTreatmentPlan,
			patientFullName: "Соколова Марина Юрьевна",
		};
		const { sha256Hex: otherPatientSha256 } = computeGostSigningDigestSha256(
			canonicalizeTreatmentPlanPayload(otherPatientPlan),
		);

		const replayCrossPatient = validateGostCmsPkcs7Signature(planSig.signatureBase64, otherPatientSha256);
		assert.strictEqual(replayCrossPatient.valid, false);
		assert.strictEqual(replayCrossPatient.errorCode, "TamperDetected");
		assert.strictEqual(replayCrossPatient.tamperDetected, true);
	});

	// ─── 3. СТАТУТНЫЙ ЗАПРЕТ ПЭП ДЛЯ ВРАЧЕЙ (63-ФЗ И ПРИКАЗ 947н) ────────────

	it("3.1 Strictly rejects doctor PEP (PIN/SMS) for Treatment Plans and Informed Consents under 63-FZ and Order 947n", () => {
		// Попытка подписать простой подписью (ПЭП / СМС)
		const pepCheck = validateDoctorSignatureStatutoryMode("simple_electronic_signature", "treatment_plan");
		assert.strictEqual(pepCheck.valid, false);
		assert.strictEqual(pepCheck.error, DOCTOR_PEP_FORBIDDEN_MESSAGE);

		const pinCheck = validateDoctorSignatureStatutoryMode("pin:1234", "informed_consent");
		assert.strictEqual(pinCheck.valid, false);
		assert.strictEqual(pinCheck.error, DOCTOR_PEP_FORBIDDEN_MESSAGE);

		// УКЭП и УНЭП разрешены
		const ukepCheck = validateDoctorSignatureStatutoryMode("ukep", "treatment_plan");
		assert.strictEqual(ukepCheck.valid, true);

		const unepCheck = validateDoctorSignatureStatutoryMode("unep", "informed_consent");
		assert.strictEqual(unepCheck.valid, true);
	});

	// ─── 4. СРОКИ ДЕЙСТВИЯ И СПИСОК ОТОЗВАННЫХ СЕРТИФИКАТОВ (CRL) ─────────────

	it("3.2 Strictly rejects expired certificates and revoked serial numbers per 63-FZ", () => {
		const now = new Date("2026-09-02T15:00:00Z");

		// Просроченный сертификат
		const expired = validateCertificateStatus({
			validFrom: "2024-01-01T00:00:00Z",
			validTo: "2025-01-01T00:00:00Z",
			referenceDate: now,
		});
		assert.strictEqual(expired.valid, false);
		assert.strictEqual(expired.errorCode, "CertificateExpired");

		// Сертификат в реестре отзыва (CRL)
		const revoked = validateCertificateStatus({
			certificateSerialNumber: "00REVOKED00000001",
			validFrom: "2026-01-01T00:00:00Z",
			validTo: "2027-01-01T00:00:00Z",
			referenceDate: now,
		});
		assert.strictEqual(revoked.valid, false);
		assert.strictEqual(revoked.errorCode, "CertificateRevoked");
	});

	// ─── 5. БЛОКИРУЮЩИЕ ГЕЙТЫ НЕИЗМЕНЯЕМОСТИ В БАЗЕ ДАННЫХ (ПП РФ №659 И 63-ФЗ) ──

	it("4.1 Simulates Decree No. 659 & Art. 16 ZoZPP gate: Approved or Signed treatment plan modification is strictly blocked", () => {
		// Имитация логики проверки из apps/api/src/routes/odontogram.ts:959
		function attemptPlanModification(existingPlan: {
			status: string;
			patientSignature?: string | null;
		}) {
			if (existingPlan.status === "Approved" || existingPlan.patientSignature) {
				const err = new Error(
					"Запрещено изменять утвержденный или подписанный план лечения. Согласно Постановлению Правительства РФ №659 от 30.05.2026 и ст. 16 ЗоЗПП любые изменения и дополнения платных услуг требуют оформления отдельного Дополнительного соглашения или создания нового плана лечения.",
				);
				// biome-ignore lint/suspicious/noExplicitAny: error mapping
				(err as any).statusCode = 409;
				(err as any).errorCode = "PlanLocked";
				throw err;
			}
			return { success: true };
		}

		// Черновик (Draft) без подписи модифицировать разрешено
		assert.doesNotThrow(() => {
			attemptPlanModification({ status: "Draft", patientSignature: null });
		});

		// Утвержденный план (Approved) модифицировать ЗАПРЕЩЕНО
		assert.throws(
			() => {
				attemptPlanModification({ status: "Approved", patientSignature: null });
			},
			(err: any) => {
				return (
					err.statusCode === 409 &&
					err.errorCode === "PlanLocked" &&
					err.message.includes("Постановлению Правительства РФ №659")
				);
			},
		);

		// Подписанный пациентом план модифицировать ЗАПРЕЩЕНО
		assert.throws(
			() => {
				attemptPlanModification({
					status: "Draft",
					patientSignature: "data:image/png;base64,mockSignatureData",
				});
			},
			(err: any) => {
				return (
					err.statusCode === 409 &&
					err.errorCode === "PlanLocked" &&
					err.message.includes("ст. 16 ЗоЗПП")
				);
			},
		);
	});

	it("4.2 Simulates signUkep.ts document immutability: Re-signing, voided signing, and signature replay are strictly blocked", () => {
		// Имитация логики проверки из apps/api/src/routes/documents/signUkep.ts:115-164
		interface MockDoc {
			id: string;
			status: "draft" | "issued" | "voided";
			cryptoSignaturePkcs7: string | null;
			issuedSnapshotSha256: string | null;
		}

		const existingSignatures = new Set<string>([
			"MIIB-ALREADY-USED-SIGNATURE-IN-CLINIC",
		]);

		function attemptUkepSigning(
			doc: MockDoc,
			incomingSignature: string,
		) {
			if (doc.status === "voided") {
				const err = new Error("Подписание УКЭП невозможно: документ аннулирован.");
				(err as any).statusCode = 409;
				(err as any).errorCode = "Conflict";
				throw err;
			}

			if (doc.cryptoSignaturePkcs7) {
				const err = new Error(
					"Документ уже подписан УКЭП. Замена подписи запрещена: аннулируйте документ и выпустите исправляющий.",
				);
				(err as any).statusCode = 409;
				(err as any).errorCode = "AlreadySigned";
				throw err;
			}

			if (doc.issuedSnapshotSha256) {
				const tamperCheck = validateGostCmsPkcs7Signature(
					incomingSignature,
					doc.issuedSnapshotSha256,
				);
				if (!tamperCheck.valid && tamperCheck.tamperDetected) {
					const err = new Error(
						"Хэш документа не совпадает с хэшем в электронной подписи (целостность нарушена: обнаружена модификация документа).",
					);
					(err as any).statusCode = 400;
					(err as any).errorCode = "TamperDetected";
					throw err;
				}
			}

			if (existingSignatures.has(incomingSignature)) {
				const err = new Error("Эта крипто-подпись уже использована для другого документа.");
				(err as any).statusCode = 409;
				(err as any).errorCode = "SignatureReplay";
				throw err;
			}

			return { success: true };
		}

		const originalHash = "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899";
		const validSig = createDemonstrationGostCmsSignature({
			documentId: "doc-orig",
			documentKind: "treatment_plan",
			documentHashHex: originalHash,
			doctorFullName: "Смирнова Е.С.",
		});

		// 1. Успешное первичное подписание
		const draftDoc: MockDoc = {
			id: "doc-1",
			status: "issued",
			cryptoSignaturePkcs7: null,
			issuedSnapshotSha256: originalHash,
		};
		assert.doesNotThrow(() => {
			attemptUkepSigning(draftDoc, validSig.signatureBase64);
		});

		// 2. Попытка переподписать уже подписанный документ -> 409 AlreadySigned
		const signedDoc: MockDoc = {
			...draftDoc,
			cryptoSignaturePkcs7: validSig.signatureBase64,
		};
		assert.throws(
			() => attemptUkepSigning(signedDoc, validSig.signatureBase64),
			(err: any) => err.statusCode === 409 && err.errorCode === "AlreadySigned",
		);

		// 3. Попытка подписать аннулированный документ -> 409 Conflict
		const voidedDoc: MockDoc = {
			...draftDoc,
			status: "voided",
		};
		assert.throws(
			() => attemptUkepSigning(voidedDoc, validSig.signatureBase64),
			(err: any) => err.statusCode === 409 && err.errorCode === "Conflict",
		);

		// 4. Попытка подписать модифицированный снимок -> 400 TamperDetected
		const tamperedDoc: MockDoc = {
			...draftDoc,
			issuedSnapshotSha256: "ffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100",
		};
		assert.throws(
			() => attemptUkepSigning(tamperedDoc, validSig.signatureBase64),
			(err: any) => err.statusCode === 400 && err.errorCode === "TamperDetected",
		);

		// 5. Попытка replay атаки чужой подписи -> 409 SignatureReplay
		assert.throws(
			() => attemptUkepSigning({ ...draftDoc, issuedSnapshotSha256: null }, "MIIB-ALREADY-USED-SIGNATURE-IN-CLINIC"),
			(err: any) => err.statusCode === 409 && err.errorCode === "SignatureReplay",
		);
	});
});

