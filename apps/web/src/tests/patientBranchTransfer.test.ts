import assert from "node:assert/strict";
import test from "node:test";
import {
	executePatientBranchTransfer,
	formatDateRu,
	formatDateTimeRu,
	formatRubCurrency,
	generateTransferActCsv,
	generateTransferActHtml,
	PatientBranchTransferModal,
	validateTransferDraft,
	type PatientTransferDraft,
} from "../components/patients/transfer/index.js";
import {
	getClinicBranch,
	type PatientClinicalSnapshot,
	type PatientDemographicsSnapshot,
} from "@dental/shared";

test("1. Patient Branch Transfer: formatting helpers format dates and currency properly", () => {
	assert.equal(formatRubCurrency(15450.50), "15 450,50 ₽");
	assert.equal(formatRubCurrency(0), "0,00 ₽");

	assert.equal(formatDateRu("1992-05-18"), "18.05.1992");
	assert.equal(formatDateRu(null), "—");
	assert.equal(formatDateRu(undefined), "—");

	const dt = formatDateTimeRu("2026-08-26T14:30:00.000Z");
	assert.ok(dt.includes("2026") || dt.includes("26.08.2026"));
	assert.equal(formatDateTimeRu(undefined), "—");
});

test("2. Patient Branch Transfer: validateTransferDraft accepts valid complete draft", () => {
	const validDraft: PatientTransferDraft = {
		patientId: "pat-100",
		patientFullName: "Иванов Петр Сергеевич",
		sourceBranchId: "branch_center",
		targetBranchId: "branch_north",
		transferReasonRu: "Перевод на ортодонтию",
		operatorStaffName: "Смирнова А.В.",
		operatorStaffPosition: "Старший администратор",
		signatureType: "simple_electronic_signature_sms",
		is152FzConsentGiven: true,
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
	};

	const v = validateTransferDraft(validDraft);
	assert.equal(v.isValid, true);
	assert.equal(v.errors.length, 0);
	assert.equal(v.warnings.length, 0);
});

test("3. Patient Branch Transfer: validateTransferDraft rejects identical source and destination branch", () => {
	const draft: PatientTransferDraft = {
		patientId: "pat-100",
		patientFullName: "Иванов Петр Сергеевич",
		sourceBranchId: "branch_center",
		targetBranchId: "branch_center",
		transferReasonRu: "Перевод",
		operatorStaffName: "Смирнова А.В.",
		operatorStaffPosition: "Старший администратор",
		signatureType: "simple_electronic_signature_sms",
		is152FzConsentGiven: true,
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
	};

	const v = validateTransferDraft(draft);
	assert.equal(v.isValid, false);
	assert.ok(v.errors.some((e) => e.includes("не могут совпадать")));
});

test("4. Patient Branch Transfer: validateTransferDraft rejects missing 152-FZ consent", () => {
	const draft: PatientTransferDraft = {
		patientId: "pat-100",
		patientFullName: "Иванов Петр Сергеевич",
		sourceBranchId: "branch_center",
		targetBranchId: "branch_north",
		transferReasonRu: "Перевод",
		operatorStaffName: "Смирнова А.В.",
		operatorStaffPosition: "Старший администратор",
		signatureType: "simple_electronic_signature_sms",
		is152FzConsentGiven: false,
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
	};

	const v = validateTransferDraft(draft);
	assert.equal(v.isValid, false);
	assert.ok(v.errors.some((e) => e.includes("152-ФЗ")));
});

test("5. Patient Branch Transfer: validateTransferDraft rejects blank operator name", () => {
	const draft: PatientTransferDraft = {
		patientId: "pat-100",
		patientFullName: "Иванов Петр Сергеевич",
		sourceBranchId: "branch_center",
		targetBranchId: "branch_north",
		transferReasonRu: "Перевод",
		operatorStaffName: "   ",
		operatorStaffPosition: "Старший администратор",
		signatureType: "simple_electronic_signature_sms",
		is152FzConsentGiven: true,
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
	};

	const v = validateTransferDraft(draft);
	assert.equal(v.isValid, false);
	assert.ok(v.errors.some((e) => e.includes("ответственного сотрудника")));
});

test("6. Patient Branch Transfer: validateTransferDraft rejects empty component selection", () => {
	const draft: PatientTransferDraft = {
		patientId: "pat-100",
		patientFullName: "Иванов Петр Сергеевич",
		sourceBranchId: "branch_center",
		targetBranchId: "branch_north",
		transferReasonRu: "Перевод",
		operatorStaffName: "Смирнова А.В.",
		operatorStaffPosition: "Старший администратор",
		signatureType: "simple_electronic_signature_sms",
		is152FzConsentGiven: true,
		selectedComponents: {
			demographics: false,
			somaticAnamnesis: false,
			odontogram043u: false,
			visitDiaries: false,
			treatmentPlans: false,
			imagingArchive: false,
			depositBalance: false,
			activeLabOrders: false,
		},
	};

	const v = validateTransferDraft(draft);
	assert.equal(v.isValid, false);
	assert.ok(v.errors.some((e) => e.includes("хотя бы один клинический раздел")));
});

test("7. Patient Branch Transfer: validateTransferDraft flags debit balance warning", () => {
	const draft: PatientTransferDraft = {
		patientId: "pat-100",
		patientFullName: "Иванов Петр Сергеевич",
		sourceBranchId: "branch_center",
		targetBranchId: "branch_north",
		transferReasonRu: "Перевод",
		operatorStaffName: "Смирнова А.В.",
		operatorStaffPosition: "Старший администратор",
		signatureType: "simple_electronic_signature_sms",
		is152FzConsentGiven: true,
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
	};

	const v = validateTransferDraft(draft, { balanceRub: -3200 });
	assert.equal(v.isValid, true);
	assert.equal(v.warnings.length, 1);
	assert.ok(v.warnings[0]?.includes("дебиторская задолженность"));
});

test("8. Patient Branch Transfer: executePatientBranchTransfer builds full verified snapshot with deposit voucher", () => {
	const demographics: PatientDemographicsSnapshot = {
		id: "pat-200",
		fullName: "Ковалева Мария Дмитриевна",
		birthDate: "1995-11-20",
		phone: "+7 (916) 555-44-33",
		email: "kovaleva@example.com",
		notes: "Пациент лечится по программе ДМС",
		status: "active",
		identityDocument: "Паспорт РФ 4512 889900",
		taxpayerInn: "772233445566",
		snils: "112-233-445 99",
		insurancePolicyNumber: "POL-999000",
		registrationAddress: "г. Москва, пр-т Мира, д. 10",
		residentialAddress: "г. Москва, пр-т Мира, д. 10",
		legalRepresentativeFullName: null,
		legalRepresentativePhone: null,
	};

	const draft: PatientTransferDraft = {
		patientId: demographics.id,
		patientFullName: demographics.fullName,
		sourceBranchId: "branch_center",
		targetBranchId: "branch_south",
		transferReasonRu: "Переезд пациента, продолжение терапии в филиале «Южный»",
		operatorStaffName: "Смирнова А.В.",
		operatorStaffPosition: "Главная медсестра",
		signatureType: "tablet_stylus_biometric",
		is152FzConsentGiven: true,
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
	};

	const teethData = {
		11: { statusCode: "healthy", statusLabelRu: "Здоровый", affectedSurfaces: [] },
		21: { statusCode: "crown_emax", statusLabelRu: "Коронка E-max", affectedSurfaces: ["vestibular"] },
		36: { statusCode: "implant", statusLabelRu: "Дентальный имплантат", affectedSurfaces: [] },
		46: { statusCode: "caries_media", statusLabelRu: "Средний кариес", affectedSurfaces: ["occlusal", "distal"] },
	};

	const visitDiaries = [
		{
			visitId: "vis-101",
			visitDateIso: "2026-08-01T12:00:00.000Z",
			doctorId: "doc-1",
			doctorFullName: "Д-р Смирнов А.В.",
			doctorSpecialty: "Врач-стоматолог-терапевт",
			complaintsRu: "На чувствительность от сладкого",
			anamnesisMorbiRu: "Беспокоит 2 недели",
			objectiveStatusRu: "Полость на 46 в пределах дентина",
			icd10Code: "K02.1",
			icd10DiagnosisRu: "Кариес дентина",
			treatmentProtocolRu: "Препарирование и пломбирование светоотверждаемым композитом",
			performedProcedures804n: [{ code: "A16.07.002", nameRu: "Пломбирование зуба", uetDoctor: 2.0 }],
			isSigned: true,
		},
	];

	const treatmentPlans = [
		{
			planId: "plan-101",
			title: "План ортопедического лечения",
			status: "accepted" as const,
			totalCostKopecks: 6500000,
			totalCostRub: 65000,
			stages: [
				{ stageIndex: 1, stageNameRu: "Подготовка и сканирование", costKopecks: 1500000, costRub: 15000, isCompleted: true },
				{ stageIndex: 2, stageNameRu: "Фиксация коронки", costKopecks: 5000000, costRub: 50000, isCompleted: false },
			],
		},
	];

	const imagingStudies = [
		{
			studyId: "img-201",
			kind: "panoramic_opg",
			kindLabelRu: "Ортопантомограмма (ОПТГ)",
			performedAtIso: "2026-08-01T12:30:00.000Z",
			performedByDoctorName: "Д-р Васильев",
			anatomicalAreaRu: "Зубные ряды верхней и нижней челюстей",
			effectiveDoseMicroSv: 18,
		},
	];

	const labOrders = [
		{
			orderId: "lab-301",
			orderNumber: "ЗТЛ-2026/08-301",
			patientId: demographics.id,
			patientFullName: demographics.fullName,
			doctorId: "doc-1",
			doctorFullName: "Д-р Смирнов А.В.",
			originalBranchId: "branch_center",
			destinationBranchId: "branch_center",
			prostheticTypeId: "crown_emax_press",
			prostheticTypeNameRu: "Пресс-керамика IPS e.max Press",
			selectedTeeth: [21],
			materialId: "emax_press",
			materialNameRu: "IPS e.max Press",
			shadeCode: "A2",
			currentStage: "cad_design",
			stageRank: 20,
			deadlineIso: "2026-08-31",
			labName: "ZTL DENTE",
			isRerouted: false,
			lastUpdatedAtIso: "2026-08-20T10:00:00.000Z",
			crdtClock: { branch_center: 1 },
		},
	];

	const result = executePatientBranchTransfer({
		draft,
		demographics,
		odontogramTeeth: teethData,
		visitDiaries,
		treatmentPlans,
		imagingStudies,
		balanceRub: 12500,
		labOrders,
	});

	assert.equal(result.success, true);
	assert.ok(result.snapshot);
	assert.equal(result.snapshot.patientId, demographics.id);
	assert.equal(result.snapshot.sourceBranch.id, "branch_center");
	assert.equal(result.snapshot.targetBranch.id, "branch_south");
	assert.equal(result.snapshot.financialDeposit.currentBalanceKopecks, 1250000);
	assert.ok(result.voucher);
	assert.equal(result.voucher?.amountKopecks, 1250000);
	assert.equal(result.voucher?.status, "issued");
	assert.ok(result.voucher?.voucherCode.startsWith("VCH-"));

	// Check lab order re-routing
	assert.equal(result.snapshot.activeLabOrders.length, 1);
	assert.equal(result.snapshot.activeLabOrders[0]?.destinationBranchId, "branch_south");
	assert.equal(result.snapshot.activeLabOrders[0]?.isRerouted, true);

	// Check QR data URI
	assert.ok(result.qrDataUri.startsWith("data:image/svg+xml;base64,"));
});

test("9. Patient Branch Transfer: executePatientBranchTransfer handles zero balance without voucher", () => {
	const demographics: PatientDemographicsSnapshot = {
		id: "pat-201",
		fullName: "Сидоров Артем Игоревич",
		birthDate: "1988-03-12",
		phone: "+7 (926) 123-45-67",
		email: null,
		notes: null,
		status: "active",
		identityDocument: "4510 123456",
		taxpayerInn: null,
		snils: null,
		insurancePolicyNumber: null,
		registrationAddress: null,
		residentialAddress: null,
		legalRepresentativeFullName: null,
		legalRepresentativePhone: null,
	};

	const draft: PatientTransferDraft = {
		patientId: demographics.id,
		patientFullName: demographics.fullName,
		sourceBranchId: "branch_north",
		targetBranchId: "branch_east",
		transferReasonRu: "Перевод",
		operatorStaffName: "Администратор",
		operatorStaffPosition: "Администратор",
		signatureType: "simple_electronic_signature_sms",
		is152FzConsentGiven: true,
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
	};

	const result = executePatientBranchTransfer({
		draft,
		demographics,
		balanceRub: 0,
	});

	assert.equal(result.success, true);
	assert.equal(result.snapshot.financialDeposit.currentBalanceKopecks, 0);
	assert.equal(result.voucher, undefined);
	assert.equal(result.snapshot.financialDeposit.transferVoucher, undefined);
});

test("10. Patient Branch Transfer: executePatientBranchTransfer throws on validation failure", () => {
	const demographics: PatientDemographicsSnapshot = {
		id: "pat-202",
		fullName: "Пациент Тестовый",
		birthDate: null,
		phone: null,
		email: null,
		notes: null,
		status: "active",
		identityDocument: null,
		taxpayerInn: null,
		snils: null,
		insurancePolicyNumber: null,
		registrationAddress: null,
		residentialAddress: null,
		legalRepresentativeFullName: null,
		legalRepresentativePhone: null,
	};

	const invalidDraft: PatientTransferDraft = {
		patientId: demographics.id,
		patientFullName: demographics.fullName,
		sourceBranchId: "branch_center",
		targetBranchId: "branch_center", // Invalid same branch!
		transferReasonRu: "",
		operatorStaffName: "Администратор",
		operatorStaffPosition: "Администратор",
		signatureType: "simple_electronic_signature_sms",
		is152FzConsentGiven: true,
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
	};

	assert.throws(() => {
		executePatientBranchTransfer({
			draft: invalidDraft,
			demographics,
		});
	}, /Ошибка валидации трансфера/);
});

test("11. Patient Branch Transfer: support all 4 statutory 152-FZ signature types", () => {
	const demographics: PatientDemographicsSnapshot = {
		id: "pat-203",
		fullName: "Кузнецов И.А.",
		birthDate: "1990-01-01",
		phone: "+7 (900) 000-00-00",
		email: null,
		notes: null,
		status: "active",
		identityDocument: "4500 111222",
		taxpayerInn: null,
		snils: null,
		insurancePolicyNumber: null,
		registrationAddress: null,
		residentialAddress: null,
		legalRepresentativeFullName: null,
		legalRepresentativePhone: null,
	};

	const sigTypes = [
		"simple_electronic_signature_sms",
		"tablet_stylus_biometric",
		"paper_scan",
		"ukep_crypto_pro",
	] as const;

	for (const sig of sigTypes) {
		const draft: PatientTransferDraft = {
			patientId: demographics.id,
			patientFullName: demographics.fullName,
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			transferReasonRu: "Тест подписи",
			operatorStaffName: "Админ",
			operatorStaffPosition: "Админ",
			signatureType: sig,
			is152FzConsentGiven: true,
			selectedComponents: {
				demographics: true,
				somaticAnamnesis: true,
				odontogram043u: true,
				visitDiaries: true,
				treatmentPlans: true,
				imagingArchive: true,
				depositBalance: true,
				activeLabOrders: true,
			},
		};

		const res = executePatientBranchTransfer({ draft, demographics });
		assert.equal(res.snapshot.consent152Fz.signatureType, sig);
		assert.ok(res.snapshot.consent152Fz.signatureHash.length >= 16);
	}
});

test("12. Patient Branch Transfer: generateTransferActHtml produces statutory 043/u transfer document with 152-FZ and QR stamp", () => {
	const snapshot: PatientClinicalSnapshot = {
		snapshotId: "snap-test-01",
		schemaVersion: "dente-clinical-snapshot-v1.0",
		exportedAtIso: "2026-08-26T15:00:00.000Z",
		sourceBranch: getClinicBranch("branch_center"),
		targetBranch: getClinicBranch("branch_north"),
		patientId: "pat-300",
		patientFullName: "Алексеев Владимир Николаевич",
		demographics: {
			id: "pat-300",
			fullName: "Алексеев Владимир Николаевич",
			birthDate: "1978-02-14",
			phone: "+7 (903) 111-22-33",
			email: null,
			notes: null,
			status: "active",
			identityDocument: "Паспорт РФ 4505 123789",
			taxpayerInn: "770987654321",
			snils: "111-222-333 44",
			insurancePolicyNumber: null,
			registrationAddress: "г. Москва",
			residentialAddress: "г. Москва",
			legalRepresentativeFullName: null,
			legalRepresentativePhone: null,
		},
		somaticAnamnesis: {
			allergies: ["Йод"],
			chronicDiseases: [],
			somaticAlerts: ["Аллергия на йодсодержащие препараты"],
			cardiacPacemaker: false,
			diabetes: false,
			hepatitisB_C: false,
			hivAids: false,
		},
		odontogramAndPerio: {
			teeth: {},
			viewMode: "standard_fdi",
			missingTeethCount: 2,
			cariesTeethCount: 1,
			filledTeethCount: 4,
			implantsCount: 1,
			crownsCount: 2,
		},
		medicalHistory043u: {
			form043Number: "043/у-PAT300",
			openingDateIso: "2024-01-10T09:00:00.000Z",
			visitDiaries: [],
			totalVisitsCount: 5,
		},
		treatmentPlansAndEstimates: {
			plans: [],
			totalPlannedCostKopecks: 8000000,
			totalPlannedCostRub: 80000,
		},
		imagingArchive: {
			studies: [],
			totalAccumulatedDoseMicroSv: 35,
			totalAccumulatedDoseMilliSv: 0.035,
		},
		financialDeposit: {
			currentBalanceKopecks: 3000000,
			currentBalanceRub: 30000,
			transferVoucher: {
				voucherId: "vch-1",
				voucherCode: "VCH-20260826-999111",
				patientId: "pat-300",
				patientFullName: "Алексеев Владимир Николаевич",
				sourceBranchId: "branch_center",
				targetBranchId: "branch_north",
				amountKopecks: 3000000,
				amountRub: 30000,
				issuedAtIso: "2026-08-26T15:00:00.000Z",
				expiresAtIso: "2026-09-25T15:00:00.000Z",
				status: "issued",
				issuedByStaffId: "staff-1",
				issuedByStaffName: "Смирнова А.В.",
				idempotencyKey: "idemp-1",
				payloadHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
			},
		},
		activeLabOrders: [],
		consent152Fz: {
			consentId: "consent-999",
			patientId: "pat-300",
			patientFullName: "Алексеев Владимир Николаевич",
			patientPassportOrId: "Паспорт РФ 4505 123789",
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			transferPurposeRu: "Продолжение лечения",
			signedAtIso: "2026-08-26T15:00:00.000Z",
			validUntilIso: "2027-08-26T15:00:00.000Z",
			operatorFullName: "Смирнова А.В.",
			operatorPosition: "Старший администратор",
			signatureType: "simple_electronic_signature_sms",
			signatureHash: "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
			legalBasis: "152-ФЗ ст. 6, 9; 323-ФЗ ст. 13; Постановление Правительства РФ № 140",
			isRevoked: false,
		},
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
		transferReasonRu: "Перевод на ортопедическое лечение",
		initiatedByStaffName: "Смирнова А.В.",
		initiatedByStaffPosition: "Старший администратор",
		checksumSha256: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
	};

	const html = generateTransferActHtml(snapshot);

	assert.ok(html.includes("АКТ ПРИЕМА-ПЕРЕДАЧИ МЕДИЦИНСКОЙ КАРТЫ (Ф. 043/у)"));
	assert.ok(html.includes("Алексеев Владимир Николаевич"));
	assert.ok(html.includes("Филиал «Центральный»"));
	assert.ok(html.includes("Филиал «Северный»"));
	assert.ok(html.includes("VCH-20260826-999111"));
	assert.ok(html.includes("30 000,00 ₽") || html.includes("30000"));
	assert.ok(html.includes("ЭЛЕКТРОННАЯ ВЕРИФИКАЦИЯ ТРАНСФЕРА"));
	assert.ok(html.includes("abcdef1234567890abcdef1234567890"));
	assert.ok(html.includes("Передал (Филиал-отправитель)"));
	assert.ok(html.includes("Принял (Филиал-получатель)"));
});

test("13. Patient Branch Transfer: generateTransferActHtml handles empty optional demographics gracefully", () => {
	const snapshot: PatientClinicalSnapshot = {
		snapshotId: "snap-test-nulls",
		schemaVersion: "dente-clinical-snapshot-v1.0",
		exportedAtIso: "2026-08-26T15:00:00.000Z",
		sourceBranch: getClinicBranch("branch_south"),
		targetBranch: getClinicBranch("branch_east"),
		patientId: "pat-305",
		patientFullName: "Анонимный Пациент",
		demographics: {
			id: "pat-305",
			fullName: "Анонимный Пациент",
			birthDate: null,
			phone: null,
			email: null,
			notes: null,
			status: "active",
			identityDocument: null,
			taxpayerInn: null,
			snils: null,
			insurancePolicyNumber: null,
			registrationAddress: null,
			residentialAddress: null,
			legalRepresentativeFullName: null,
			legalRepresentativePhone: null,
		},
		somaticAnamnesis: {
			allergies: [],
			chronicDiseases: [],
			somaticAlerts: [],
			cardiacPacemaker: false,
			diabetes: false,
			hepatitisB_C: false,
			hivAids: false,
		},
		odontogramAndPerio: {
			teeth: {},
			viewMode: "standard_fdi",
			missingTeethCount: 0,
			cariesTeethCount: 0,
			filledTeethCount: 0,
			implantsCount: 0,
			crownsCount: 0,
		},
		medicalHistory043u: {
			form043Number: "043/у-PAT305",
			openingDateIso: "2026-08-26T15:00:00.000Z",
			visitDiaries: [],
			totalVisitsCount: 0,
		},
		treatmentPlansAndEstimates: {
			plans: [],
			totalPlannedCostKopecks: 0,
			totalPlannedCostRub: 0,
		},
		imagingArchive: {
			studies: [],
			totalAccumulatedDoseMicroSv: 0,
			totalAccumulatedDoseMilliSv: 0,
		},
		financialDeposit: {
			currentBalanceKopecks: 0,
			currentBalanceRub: 0,
		},
		activeLabOrders: [],
		consent152Fz: {
			consentId: "consent-nulls",
			patientId: "pat-305",
			patientFullName: "Анонимный Пациент",
			patientPassportOrId: "Не указан",
			sourceBranchId: "branch_south",
			targetBranchId: "branch_east",
			transferPurposeRu: "Трансфер",
			signedAtIso: "2026-08-26T15:00:00.000Z",
			validUntilIso: "2027-08-26T15:00:00.000Z",
			operatorFullName: "Админ",
			operatorPosition: "Админ",
			signatureType: "simple_electronic_signature_sms",
			signatureHash: "00112233445566778899aabbccddeeff",
			legalBasis: "152-ФЗ",
			isRevoked: false,
		},
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
		transferReasonRu: "Перевод",
		initiatedByStaffName: "Админ",
		initiatedByStaffPosition: "Админ",
		checksumSha256: "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899",
	};

	const html = generateTransferActHtml(snapshot);
	assert.ok(html.includes("Не указан") || html.includes("—"));
	assert.ok(html.includes("Анонимный Пациент"));
});

test("14. Patient Branch Transfer: generateTransferActCsv produces RFC-compliant CSV with UTF-8 BOM", () => {
	const snapshot: PatientClinicalSnapshot = {
		snapshotId: "snap-test-02",
		schemaVersion: "dente-clinical-snapshot-v1.0",
		exportedAtIso: "2026-08-26T15:30:00.000Z",
		sourceBranch: getClinicBranch("branch_center"),
		targetBranch: getClinicBranch("branch_north"),
		patientId: "pat-400",
		patientFullName: "Семенов И.И.",
		demographics: {
			id: "pat-400",
			fullName: "Семенов И.И.",
			birthDate: "2000-01-01",
			phone: "+7 (900) 000-00-00",
			email: null,
			notes: null,
			status: "active",
			identityDocument: "4500 000000",
			taxpayerInn: null,
			snils: null,
			insurancePolicyNumber: null,
			registrationAddress: null,
			residentialAddress: null,
			legalRepresentativeFullName: null,
			legalRepresentativePhone: null,
		},
		somaticAnamnesis: {
			allergies: [],
			chronicDiseases: [],
			somaticAlerts: [],
			cardiacPacemaker: false,
			diabetes: false,
			hepatitisB_C: false,
			hivAids: false,
		},
		odontogramAndPerio: {
			teeth: {},
			viewMode: "standard_fdi",
			missingTeethCount: 0,
			cariesTeethCount: 0,
			filledTeethCount: 0,
			implantsCount: 0,
			crownsCount: 0,
		},
		medicalHistory043u: {
			form043Number: "043/у-PAT400",
			openingDateIso: "2026-08-26T15:30:00.000Z",
			visitDiaries: [],
			totalVisitsCount: 2,
		},
		treatmentPlansAndEstimates: {
			plans: [],
			totalPlannedCostKopecks: 0,
			totalPlannedCostRub: 0,
		},
		imagingArchive: {
			studies: [],
			totalAccumulatedDoseMicroSv: 10,
			totalAccumulatedDoseMilliSv: 0.01,
		},
		financialDeposit: {
			currentBalanceKopecks: 0,
			currentBalanceRub: 0,
		},
		activeLabOrders: [],
		consent152Fz: {
			consentId: "consent-400",
			patientId: "pat-400",
			patientFullName: "Семенов И.И.",
			patientPassportOrId: "4500 000000",
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			transferPurposeRu: "Трансфер",
			signedAtIso: "2026-08-26T15:30:00.000Z",
			validUntilIso: "2027-08-26T15:30:00.000Z",
			operatorFullName: "Смирнова А.В.",
			operatorPosition: "Администратор",
			signatureType: "simple_electronic_signature_sms",
			signatureHash: "1122334455667788990011223344556677889900112233445566778899001122",
			legalBasis: "152-ФЗ",
			isRevoked: false,
		},
		selectedComponents: {
			demographics: true,
			somaticAnamnesis: true,
			odontogram043u: true,
			visitDiaries: true,
			treatmentPlans: true,
			imagingArchive: true,
			depositBalance: true,
			activeLabOrders: true,
		},
		transferReasonRu: "Перевод",
		initiatedByStaffName: "Смирнова А.В.",
		initiatedByStaffPosition: "Администратор",
		checksumSha256: "9988776655443322110099887766554433221100998877665544332211009988",
	};

	const csv = generateTransferActCsv(snapshot);

	assert.ok(csv.startsWith("\uFEFF"), "Must start with UTF-8 BOM");
	assert.ok(csv.includes("\"Идентификатор трансфера\";\"snap-test-02\""));
	assert.ok(csv.includes("\"ФИО пациента\";\"Семенов И.И.\""));
	assert.ok(csv.includes("Филиал «Центральный»"));
	assert.ok(csv.includes("99887766554433221100"));
});

test("15. Patient Branch Transfer: component and engine exports integrity", () => {
	assert.equal(typeof PatientBranchTransferModal, "function");
	assert.equal(typeof executePatientBranchTransfer, "function");
	assert.equal(typeof validateTransferDraft, "function");
	assert.equal(typeof generateTransferActHtml, "function");
	assert.equal(typeof generateTransferActCsv, "function");
	assert.equal(typeof formatRubCurrency, "function");
	assert.equal(typeof formatDateRu, "function");
	assert.equal(typeof formatDateTimeRu, "function");
});
