import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildPatientClinicalSnapshot,
	CLINIC_NETWORK_BRANCHES,
	createPatientBranchTransferConsent,
	generateTransferVerificationQrDataUri,
	generateTransferVerificationQrPayload,
	generateTransferVerificationQrSvg,
	getClinicBranch,
	issueDepositTransferVoucher,
	mergeLabOrderSyncCrdt,
	redeemDepositTransferVoucher,
	rerouteLabOrderDestination,
	resolveDepositTransferConflict,
	validatePatientBranchTransferConsent,
	validatePatientClinicalSnapshot,
	type CentralizedLabOrderSyncItem,
	type DepositTransferVoucher,
	type PatientDemographicsSnapshot,
} from "../sync/index.js";
import { createVectorClock } from "../sync/mesh.js";

describe("Multi-Branch Patient Transfer & Centralized Lab Sync (Shared Engine)", () => {
	const sampleDemographics: PatientDemographicsSnapshot = {
		id: "pat-uuid-001",
		fullName: "Иванова Татьяна Сергеевна",
		birthDate: "1988-04-12",
		phone: "+7 (999) 111-22-33",
		email: "ivanova.ts@example.com",
		notes: "Пациент направлен на продолжение ортодонтического лечения",
		status: "active",
		identityDocument: "Паспорт РФ 4510 123456 выдан 15.05.2008 ТП №1",
		taxpayerInn: "770123456789",
		snils: "123-456-789 01",
		insurancePolicyNumber: "7754321098765432",
		registrationAddress: "г. Москва, ул. Ленина, д. 5, кв. 10",
		residentialAddress: "г. Москва, ул. Ленина, д. 5, кв. 10",
		legalRepresentativeFullName: null,
		legalRepresentativePhone: null,
		loyaltyTier: "gold",
	};

	// ─── 1. Branches Registry & Catalog Tests ───────────────────────────────
	it("1.1 defines statutory clinic network branches with codes, OKPO and central hub", () => {
		assert.ok(CLINIC_NETWORK_BRANCHES.length >= 4);

		const central = getClinicBranch("central_hub");
		assert.equal(central.isCentralHub, true);
		assert.equal(central.code, "ЦК-01");
		assert.ok(central.okpoCode.length >= 8);
		assert.ok(central.chiefDoctorRu.length > 5);

		const north = getClinicBranch("branch_north");
		assert.equal(north.isCentralHub, false);
		assert.equal(north.code, "ФИЛ-02");
		assert.ok(north.addressRu.includes("Ленинградский"));
	});

	it("1.2 gracefully handles unknown branch IDs with fallback descriptor", () => {
		const unknown = getClinicBranch("branch_custom_99");
		assert.equal(unknown.id, "branch_custom_99");
		assert.equal(unknown.code, "ФИЛ-XX");
		assert.equal(unknown.isCentralHub, false);
	});

	// ─── 2. 152-FZ Consent & Security Verification ──────────────────────────
	it("2.1 creates and signs 152-FZ patient transfer consent with SHA-256 hash", () => {
		const consent = createPatientBranchTransferConsent({
			patientId: sampleDemographics.id,
			patientFullName: sampleDemographics.fullName,
			patientPassportOrId: sampleDemographics.identityDocument!,
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			operatorFullName: "Смирнова А.В.",
			signatureType: "tablet_stylus_biometric",
		});

		assert.equal(consent.patientId, sampleDemographics.id);
		assert.equal(consent.sourceBranchId, "branch_center");
		assert.equal(consent.targetBranchId, "branch_north");
		assert.equal(consent.signatureType, "tablet_stylus_biometric");
		assert.equal(consent.isRevoked, false);
		assert.ok(consent.signatureHash.length === 64, "SHA-256 hex must be 64 characters");

		const val = validatePatientBranchTransferConsent(consent);
		assert.equal(val.isValid, true);
		assert.equal(val.reasons.length, 0);
	});

	it("2.2 prevents consent creation when source and destination branches are identical", () => {
		assert.throws(() => {
			createPatientBranchTransferConsent({
				patientId: sampleDemographics.id,
				patientFullName: sampleDemographics.fullName,
				patientPassportOrId: "4510 123456",
				sourceBranchId: "branch_center",
				targetBranchId: "branch_center",
				operatorFullName: "Смирнова А.В.",
			});
		}, /не могут совпадать/);
	});

	it("2.3 flags revoked or expired 152-FZ consents during validation", () => {
		const validConsent = createPatientBranchTransferConsent({
			patientId: sampleDemographics.id,
			patientFullName: sampleDemographics.fullName,
			patientPassportOrId: "4510 123456",
			sourceBranchId: "branch_center",
			targetBranchId: "branch_south",
			operatorFullName: "Смирнова А.В.",
		});

		// Revoked
		const revoked = {
			...validConsent,
			isRevoked: true,
			revokedAtIso: new Date().toISOString(),
		};
		const revokedVal = validatePatientBranchTransferConsent(revoked);
		assert.equal(revokedVal.isValid, false);
		assert.ok(revokedVal.reasons.some((r) => r.includes("отозвано")));

		// Expired
		const expired = {
			...validConsent,
			validUntilIso: "2020-01-01T00:00:00.000Z",
		};
		const expiredVal = validatePatientBranchTransferConsent(expired);
		assert.equal(expiredVal.isValid, false);
		assert.ok(expiredVal.reasons.some((r) => r.includes("истек")));
	});

	// ─── 3. Atomic Deposit Transfer Voucher & Double-Spending Defenses ──────
	it("3.1 issues atomic deposit transfer voucher with kopeck-exact balance and SHA-256 hash", () => {
		const { voucher, debitedKopecks } = issueDepositTransferVoucher({
			patientId: sampleDemographics.id,
			patientFullName: sampleDemographics.fullName,
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			amountRub: 15450.50,
			staffId: "admin-101",
			staffName: "Смирнова А.В.",
			notes: "Остаток депозита за ортодонтические элайнеры",
		});

		assert.equal(debitedKopecks, 1545050);
		assert.equal(voucher.amountKopecks, 1545050);
		assert.equal(voucher.amountRub, 15450.50);
		assert.equal(voucher.status, "issued");
		assert.ok(voucher.voucherCode.startsWith("VCH-"));
		assert.ok(voucher.payloadHash.length === 64);
		assert.ok(voucher.crdtClock?.branch_center === 1);
	});

	it("3.2 redeems voucher idempotently at target branch and increments vector clock", () => {
		const { voucher } = issueDepositTransferVoucher({
			patientId: sampleDemographics.id,
			patientFullName: sampleDemographics.fullName,
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			amountKopecks: 2500000, // 25 000 руб
			staffId: "admin-1",
			staffName: "Смирнова А.В.",
		});

		// First redemption
		const res1 = redeemDepositTransferVoucher({
			voucher,
			redeemingBranchId: "branch_north",
			staffId: "admin-2",
			staffName: "Кузнецова И.С.",
		});

		assert.equal(res1.success, true);
		assert.equal(res1.creditedKopecks, 2500000);
		assert.equal(res1.isDuplicateReplay, false);
		assert.equal(res1.updatedVoucher.status, "redeemed");
		assert.ok(res1.updatedVoucher.redeemedAtIso);
		assert.equal(res1.updatedVoucher.crdtClock?.branch_north, 1);

		// Replay redemption (same branch) -> Idempotent success
		const res2 = redeemDepositTransferVoucher({
			voucher: res1.updatedVoucher,
			redeemingBranchId: "branch_north",
			staffId: "admin-2",
			staffName: "Кузнецова И.С.",
		});
		assert.equal(res2.success, true);
		assert.equal(res2.creditedKopecks, 2500000);
		assert.equal(res2.isDuplicateReplay, true);
	});

	it("3.3 prevents double-spending: rejects redemption at unauthorized or conflicting branch", () => {
		const { voucher } = issueDepositTransferVoucher({
			patientId: sampleDemographics.id,
			patientFullName: sampleDemographics.fullName,
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			amountKopecks: 1000000,
			staffId: "admin-1",
			staffName: "Смирнова А.В.",
		});

		// Attempting redemption at wrong branch (branch_south instead of branch_north)
		const wrongBranch = redeemDepositTransferVoucher({
			voucher,
			redeemingBranchId: "branch_south",
			staffId: "admin-3",
			staffName: "Морозова Е.П.",
		});
		assert.equal(wrongBranch.success, false);
		assert.equal(wrongBranch.creditedKopecks, 0);
		assert.ok(wrongBranch.errorReason?.includes("Несоответствие филиала"));

		// Successful redemption at branch_north
		const redeemed = redeemDepositTransferVoucher({
			voucher,
			redeemingBranchId: "branch_north",
			staffId: "admin-2",
			staffName: "Кузнецова И.С.",
		});
		assert.equal(redeemed.success, true);

		// Second redemption attempt from another branch (double-spend attack)
		const doubleSpend = redeemDepositTransferVoucher({
			voucher: redeemed.updatedVoucher,
			redeemingBranchId: "branch_south",
			staffId: "admin-3",
			staffName: "Морозова Е.П.",
		});
		assert.equal(doubleSpend.success, false);
		assert.equal(doubleSpend.creditedKopecks, 0);
		assert.ok(doubleSpend.errorReason?.includes("уже был погашен"));
	});

	it("3.4 rejects redemption if voucher payload was tampered with (security check)", () => {
		const { voucher } = issueDepositTransferVoucher({
			patientId: sampleDemographics.id,
			patientFullName: sampleDemographics.fullName,
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			amountKopecks: 500000,
			staffId: "admin-1",
			staffName: "Смирнова А.В.",
		});

		// Malicious modification of amount (e.g. changing 5 000 руб to 50 000 руб)
		const tampered: DepositTransferVoucher = {
			...voucher,
			amountKopecks: 5000000,
		};

		const result = redeemDepositTransferVoucher({
			voucher: tampered,
			redeemingBranchId: "branch_north",
			staffId: "admin-2",
			staffName: "Кузнецова И.С.",
		});

		assert.equal(result.success, false);
		assert.equal(result.creditedKopecks, 0);
		assert.ok(result.errorReason?.includes("Нарушена целостность криптографического хеша"));
	});

	it("3.5 resolves deposit transfer CRDT conflicts with operational priority", () => {
		const { voucher: vBase } = issueDepositTransferVoucher({
			patientId: sampleDemographics.id,
			patientFullName: sampleDemographics.fullName,
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			amountKopecks: 1200000,
			staffId: "admin-1",
			staffName: "Смирнова А.В.",
		});

		const vRedeemed: DepositTransferVoucher = {
			...vBase,
			status: "redeemed",
			redeemedAtIso: "2026-08-26T12:00:00.000Z",
		};
		const vCancelled: DepositTransferVoucher = {
			...vBase,
			status: "cancelled",
		};

		// Redeemed wins over issued
		const r1 = resolveDepositTransferConflict(vRedeemed, vBase);
		assert.equal(r1.winner.status, "redeemed");
		assert.equal(r1.strategy, "redeemed_priority");

		// Cancelled wins over issued
		const r2 = resolveDepositTransferConflict(vCancelled, vBase);
		assert.equal(r2.winner.status, "cancelled");
		assert.equal(r2.strategy, "cancelled_priority");
	});

	// ─── 4. Centralized Lab (ZTL) Synchronization & Re-routing ─────────────
	it("4.1 re-routes dental lab order delivery destination to transferred patient branch", () => {
		const clock = createVectorClock("branch_center", 1);
		const initialOrder: CentralizedLabOrderSyncItem = {
			orderId: "lab-ord-88",
			orderNumber: "ЗТЛ-2026/08-088",
			patientId: sampleDemographics.id,
			patientFullName: sampleDemographics.fullName,
			doctorId: "doc-prosthetist-1",
			doctorFullName: "Д-р Смирнов А.В.",
			originalBranchId: "branch_center",
			destinationBranchId: "branch_center",
			prostheticTypeId: "crown_zirconia_monolithic",
			prostheticTypeNameRu: "Коронка из диоксида циркония Katana ML",
			selectedTeeth: [16, 17],
			materialId: "zirconia_katana_ml",
			materialNameRu: "Диоксид циркония Katana ML",
			shadeCode: "A2",
			currentStage: "milling_wax_up",
			stageRank: 30,
			deadlineIso: "2026-08-30",
			labName: "Центральная цифровая ZTL DENTE",
			isRerouted: false,
			lastUpdatedAtIso: "2026-08-26T10:00:00.000Z",
			crdtClock: clock,
		};

		const rerouted = rerouteLabOrderDestination(
			initialOrder,
			"branch_north",
			"Перевод пациента в филиал «Северный»",
			"Кузнецова И.С.",
		);

		assert.equal(rerouted.destinationBranchId, "branch_north");
		assert.equal(rerouted.isRerouted, true);
		assert.ok(rerouted.reroutedReason?.includes("Филиал «Север»"));
		assert.equal(rerouted.crdtClock.branch_north, 1);
	});

	it("4.2 merges concurrent lab order updates via production stage ranking", () => {
		const clock1 = createVectorClock("branch_center", 2);
		const clock2 = createVectorClock("ztl_central", 3);

		const orderAtCAD: CentralizedLabOrderSyncItem = {
			orderId: "lab-ord-100",
			orderNumber: "ЗТЛ-100",
			patientId: "pat-1",
			patientFullName: "Иванова Т.С.",
			doctorId: "doc-1",
			doctorFullName: "Д-р Смирнов",
			originalBranchId: "branch_center",
			destinationBranchId: "branch_center",
			prostheticTypeId: "crown_emax",
			prostheticTypeNameRu: "Коронка E-max",
			selectedTeeth: [21],
			materialId: "emax_press",
			materialNameRu: "IPS e.max",
			shadeCode: "A1",
			currentStage: "cad_design",
			stageRank: 20,
			deadlineIso: "2026-09-01",
			labName: "ZTL Dente",
			isRerouted: false,
			lastUpdatedAtIso: "2026-08-26T10:00:00.000Z",
			crdtClock: clock1,
		};

		const orderAtGlaze: CentralizedLabOrderSyncItem = {
			...orderAtCAD,
			currentStage: "glaze_finish",
			stageRank: 50,
			lastUpdatedAtIso: "2026-08-26T11:00:00.000Z",
			crdtClock: clock2,
		};

		const merged = mergeLabOrderSyncCrdt(orderAtCAD, orderAtGlaze);
		assert.equal(merged.merged.currentStage, "glaze_finish");
		assert.equal(merged.merged.stageRank, 50);
		assert.equal(merged.winner, "remote");
	});

	// ─── 5. Clinical Snapshot Builder, Integrity & 043/u Data Preservation ──
	it("5.1 builds complete clinical snapshot and computes deterministic SHA-256 checksum", () => {
		const consent = createPatientBranchTransferConsent({
			patientId: sampleDemographics.id,
			patientFullName: sampleDemographics.fullName,
			patientPassportOrId: sampleDemographics.identityDocument!,
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			operatorFullName: "Смирнова А.В.",
		});

		const snapshot = buildPatientClinicalSnapshot({
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			demographics: sampleDemographics,
			somaticAnamnesis: {
				allergies: ["Пенициллин", "Лидокаин (в анамнезе аллергический отек)"],
				chronicDiseases: ["Гипертоническая болезнь II ст."],
				somaticAlerts: ["Аллергия на пенициллиновый ряд"],
				cardiacPacemaker: false,
				diabetes: false,
			},
			odontogramTeeth: {
				16: {
					statusCode: "crown_zirconia",
					statusLabelRu: "Коронка ZrO2",
					affectedSurfaces: ["occlusal", "vestibular"],
					rootCanalsCount: 3,
				},
				17: {
					statusCode: "caries_media",
					statusLabelRu: "Средний кариес",
					affectedSurfaces: ["occlusal", "distal"],
				},
				46: {
					statusCode: "implant",
					statusLabelRu: "Дентальный имплантат",
				},
				47: {
					statusCode: "extracted_absent",
					statusLabelRu: "Удален (адентия)",
				},
			},
			visitDiaries: [
				{
					visitId: "vis-001",
					visitDateIso: "2026-08-10T10:00:00.000Z",
					doctorId: "doc-1",
					doctorFullName: "Д-р Смирнов А.В.",
					doctorSpecialty: "Врач-стоматолог-ортопед",
					complaintsRu: "На скол пломбы на 17 зубе",
					anamnesisMorbiRu: "Ранее лечен по поводу кариеса 3 года назад",
					objectiveStatusRu: "На жевательной поверхности 17 зуба полость средней глубины",
					icd10Code: "K02.1",
					icd10DiagnosisRu: "Кариес дентина (средний кариес)",
					treatmentProtocolRu: "Препарирование, медикаментозная обработка, композитная реставрация",
					performedProcedures804n: [
						{ code: "A16.07.002", nameRu: "Восстановление зуба пломбой", uetDoctor: 2.5 },
					],
					isSigned: true,
				},
			],
			treatmentPlans: [
				{
					planId: "plan-01",
					title: "Комплексный план протезирования и ортодонтии",
					status: "accepted",
					totalCostKopecks: 15000000, // 150 000 руб
					totalCostRub: 150000,
					stages: [
						{ stageIndex: 1, stageNameRu: "Санация полости рта", costKopecks: 3000000, costRub: 30000, isCompleted: true },
						{ stageIndex: 2, stageNameRu: "Протезирование 16, 17", costKopecks: 12000000, costRub: 120000, isCompleted: false },
					],
				},
			],
			imagingStudies: [
				{
					studyId: "img-01",
					kind: "cbct_3d",
					kindLabelRu: "КЛКТ обеих челюстей 12х9 см",
					performedAtIso: "2026-08-10T10:30:00.000Z",
					performedByDoctorName: "Д-р Васильев О.П.",
					anatomicalAreaRu: "Верхняя и нижняя челюсти",
					effectiveDoseMicroSv: 42,
				},
			],
			balanceRub: 15450.50,
			consent152Fz: consent,
			staffName: "Смирнова А.В.",
		});

		assert.equal(snapshot.sourceBranch.id, "branch_center");
		assert.equal(snapshot.targetBranch.id, "branch_north");
		assert.equal(snapshot.patientFullName, "Иванова Татьяна Сергеевна");
		assert.equal(snapshot.odontogramAndPerio.teeth[16]?.statusCode, "crown_zirconia");
		assert.equal(snapshot.odontogramAndPerio.teeth[47]?.statusCode, "extracted_absent");
		assert.equal(snapshot.odontogramAndPerio.missingTeethCount, 1);
		assert.equal(snapshot.odontogramAndPerio.cariesTeethCount, 1);
		assert.equal(snapshot.medicalHistory043u.totalVisitsCount, 1);
		assert.equal(snapshot.imagingArchive.totalAccumulatedDoseMicroSv, 42);
		assert.equal(snapshot.financialDeposit.currentBalanceKopecks, 1545050);
		assert.ok(snapshot.financialDeposit.transferVoucher);
		assert.equal(snapshot.financialDeposit.transferVoucher?.amountKopecks, 1545050);
		assert.ok(snapshot.checksumSha256.length === 64);

		// Validate snapshot
		const val = validatePatientClinicalSnapshot(snapshot);
		assert.equal(val.isValid, true);
		assert.equal(val.errors.length, 0);
	});

	it("5.2 detects snapshot corruption if checksum or critical fields are tampered", () => {
		const consent = createPatientBranchTransferConsent({
			patientId: sampleDemographics.id,
			patientFullName: sampleDemographics.fullName,
			patientPassportOrId: sampleDemographics.identityDocument!,
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			operatorFullName: "Смирнова А.В.",
		});

		const snapshot = buildPatientClinicalSnapshot({
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			demographics: sampleDemographics,
			consent152Fz: consent,
			staffName: "Смирнова А.В.",
		});

		// Tampering with demographic name without updating checksum
		const corrupted = {
			...snapshot,
			patientFullName: "Другой Человек",
		};

		const val = validatePatientClinicalSnapshot(corrupted);
		assert.equal(val.isValid, false);
		assert.ok(val.errors.some((e) => e.includes("Несоответствие контрольной суммы SHA-256")));
	});

	// ─── 6. QR Code Verification Generator Tests ────────────────────────────
	it("6.1 generates standard ISO/IEC 18004 verification QR payload and crisp SVG", () => {
		const consent = createPatientBranchTransferConsent({
			patientId: sampleDemographics.id,
			patientFullName: sampleDemographics.fullName,
			patientPassportOrId: sampleDemographics.identityDocument!,
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			operatorFullName: "Смирнова А.В.",
		});

		const snapshot = buildPatientClinicalSnapshot({
			sourceBranchId: "branch_center",
			targetBranchId: "branch_north",
			demographics: sampleDemographics,
			balanceRub: 5000,
			consent152Fz: consent,
			staffName: "Смирнова А.В.",
		});

		const qrPayload = generateTransferVerificationQrPayload(snapshot);
		assert.ok(qrPayload.startsWith("DENTE-TRF-V1"));
		assert.ok(qrPayload.includes(`PID:${snapshot.patientId}`));
		assert.ok(qrPayload.includes("SRC:ФИЛ-01"));
		assert.ok(qrPayload.includes("DST:ФИЛ-02"));
		assert.ok(qrPayload.includes("VCH:VCH-"));

		const qrSvg = generateTransferVerificationQrSvg(snapshot, 160);
		assert.ok(qrSvg.includes("<svg"));
		assert.ok(qrSvg.includes("viewBox="));
		assert.ok(qrSvg.includes("QR верификации трансфера"));

		const qrDataUri = generateTransferVerificationQrDataUri(snapshot, 160);
		assert.ok(qrDataUri.startsWith("data:image/svg+xml;base64,"));
	});
});
