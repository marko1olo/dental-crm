/**
 * insuranceIntegrationsSeederModule.ts — DMS Contracts, Guarantee Letters, EGISZ Blank Permissions, and Telegram Bot (Layer 2).
 */

import { eq, sql } from "drizzle-orm";
import {
	denteTelegramBotConfigs,
	dmsGuaranteeLetters,
	egiszBlankPermissions,
	insuranceContracts,
	patients,
	users,
} from "../../../../db/schema.js";
import type { DbTx } from "../types.js";

/**
 * Идемпотентное засевание договоров ДМС (СОГАЗ, АльфаСтрахование, РЕСО-Гарантия),
 * гарантийных писем пациентов, прав бланков ЕГИСЗ и конфигурации Telegram-бота.
 */
export async function seedInsuranceAndIntegrations(
	tx: DbTx,
	organizationId: string,
): Promise<void> {
	await tx.execute(
		sql`ALTER TABLE insurance_contracts ADD COLUMN IF NOT EXISTS patient_franchise_pct numeric(5, 2) NOT NULL DEFAULT 0`,
	);
	await tx.execute(
		sql`ALTER TABLE insurance_contracts ADD COLUMN IF NOT EXISTS requires_guarantee_letter boolean NOT NULL DEFAULT true`,
	);

	// 1. Договоры ДМС
	const existingContracts = await tx
		.select({ id: insuranceContracts.id, companyName: insuranceContracts.companyName })
		.from(insuranceContracts)
		.where(eq(insuranceContracts.organizationId, organizationId));

	let contractRows = existingContracts;
	if (contractRows.length === 0) {
		contractRows = await tx
			.insert(insuranceContracts)
			.values([
				{
					organizationId,
					companyName: "АО «СОГАЗ»",
					policyNumberMask: "СОГ-77-########",
					coverageTherapyPct: 100,
					coverageSurgeryPct: 100,
					coverageOrthoPct: 50,
					coverageHygienePct: 100,
					annualLimitRub: 250000,
					patientFranchisePct: 0,
					requiresGuaranteeLetter: true,
					isActive: true,
				},
				{
					organizationId,
					companyName: "АО «АльфаСтрахование»",
					policyNumberMask: "АС-ДМС-########",
					coverageTherapyPct: 90,
					coverageSurgeryPct: 80,
					coverageOrthoPct: 0,
					coverageHygienePct: 100,
					annualLimitRub: 150000,
					patientFranchisePct: 10,
					requiresGuaranteeLetter: true,
					isActive: true,
				},
				{
					organizationId,
					companyName: "СПАО «РЕСО-Гарантия»",
					policyNumberMask: "РЕСО-99-#######",
					coverageTherapyPct: 100,
					coverageSurgeryPct: 80,
					coverageOrthoPct: 30,
					coverageHygienePct: 100,
					annualLimitRub: 180000,
					patientFranchisePct: 20,
					requiresGuaranteeLetter: true,
					isActive: true,
				},
			])
			.returning({ id: insuranceContracts.id, companyName: insuranceContracts.companyName });
	}

	// 2. Гарантийные письма ДМС, привязанные к пациентам и договорам
	const existingLetters = await tx
		.select({ id: dmsGuaranteeLetters.id })
		.from(dmsGuaranteeLetters)
		.where(eq(dmsGuaranteeLetters.organizationId, organizationId))
		.limit(1);

	if (existingLetters.length === 0 && contractRows.length > 0) {
		const orgPatients = await tx
			.select({
				id: patients.id,
				fullName: patients.fullName,
				birthDate: patients.birthDate,
			})
			.from(patients)
			.where(eq(patients.organizationId, organizationId))
			.limit(4);

		if (orgPatients.length > 0) {
			const sogazContract = contractRows.find((c) => c.companyName.includes("СОГАЗ")) ?? contractRows[0]!;
			const alfaContract = contractRows.find((c) => c.companyName.includes("Альфа")) ?? contractRows[0]!;
			const resoContract = contractRows.find((c) => c.companyName.includes("РЕСО")) ?? contractRows[0]!;

			const p0 = orgPatients[0]!;
			const p1 = orgPatients[1] ?? p0;
			const p2 = orgPatients[2] ?? p0;

			await tx
				.insert(dmsGuaranteeLetters)
				.values([
					{
						organizationId,
						contractId: sogazContract.id,
						patientId: p0.id,
						patientFullName: p0.fullName,
						patientBirthDate: p0.birthDate ?? "1986-04-12",
						policyNumber: "СОГ-77-48109234",
						insurerKey: "sogaz",
						insurerName: "АО «СОГАЗ»",
						letterNumber: "ГП-СОГАЗ-2026/0418",
						issueDate: "2026-01-15",
						validFrom: "2026-01-15",
						validUntil: "2026-12-31",
						maxCoverageRub: 120000,
						usedAmountRub: 18500,
						franchisePct: 0,
						franchiseType: "percent",
						franchiseFixedRub: 0,
						programExclusions: ["Отбеливание зубов Zoom", "Виниры керамические E.max"],
						approvedServiceCodes: ["A16.07.002.001", "A16.07.008.001", "A16.07.051.001"],
						approvedTeethFdi: ["16", "26", "46"],
						approvedDiagnosisCodes: ["K02.1", "K04.0"],
						curatorFullName: "Смирнова Елена Игоревна",
						curatorPhone: "+7 (495) 234-56-78",
						notes: "Полное покрытие терапевтического и эндодонтического лечения зубов 16, 26, 46 без франшизы.",
						status: "active",
					},
					{
						organizationId,
						contractId: alfaContract.id,
						patientId: p1.id,
						patientFullName: p1.fullName,
						patientBirthDate: p1.birthDate ?? "1991-09-23",
						policyNumber: "АС-ДМС-90341827",
						insurerKey: "alfastrakhovanie",
						insurerName: "АО «АльфаСтрахование»",
						letterNumber: "ГП-АЛЬФА-2026/1192",
						issueDate: "2026-02-01",
						validFrom: "2026-02-01",
						validUntil: "2026-12-31",
						maxCoverageRub: 85000,
						usedAmountRub: 12400,
						franchisePct: 10,
						franchiseType: "percent",
						franchiseFixedRub: 0,
						programExclusions: ["Имплантация дентальная", "Ортодонтическое лечение на брекетах"],
						approvedServiceCodes: ["A16.07.002.001", "A16.07.051.001"],
						approvedTeethFdi: ["14", "15", "36"],
						approvedDiagnosisCodes: ["K02.1", "K05.1"],
						curatorFullName: "Морозов Денис Петрович",
						curatorPhone: "+7 (495) 788-09-99",
						notes: "Соплатёж (франшиза пациента) 10% удерживается в кассе клиники при закрытии наряда.",
						status: "active",
					},
					{
						organizationId,
						contractId: resoContract.id,
						patientId: p2.id,
						patientFullName: p2.fullName,
						patientBirthDate: p2.birthDate ?? "1979-11-05",
						policyNumber: "РЕСО-99-5521908",
						insurerKey: "reso",
						insurerName: "СПАО «РЕСО-Гарантия»",
						letterNumber: "ГП-РЕСО-2026/0874",
						issueDate: "2026-02-10",
						validFrom: "2026-02-10",
						validUntil: "2026-12-31",
						maxCoverageRub: 95000,
						usedAmountRub: 9200,
						franchisePct: 20,
						franchiseType: "percent",
						franchiseFixedRub: 0,
						programExclusions: ["Протезирование на имплантатах"],
						approvedServiceCodes: ["A16.07.002.001", "A16.07.004.001"],
						approvedTeethFdi: ["21", "22"],
						approvedDiagnosisCodes: ["K02.1"],
						curatorFullName: "Кузнецова Анна Сергеевна",
						curatorPhone: "+7 (495) 956-33-22",
						notes: "Согласована реставрация фронтальной группы (зубы 21, 22), франшиза пациента 20%.",
						status: "active",
					},
				])
				.onConflictDoNothing();
		}
	}

	// 3. Правила доступа к бланкам РЭМД ЕГИСЗ
	const existingEgiszPerms = await tx
		.select({ id: egiszBlankPermissions.id })
		.from(egiszBlankPermissions)
		.where(eq(egiszBlankPermissions.organizationId, organizationId))
		.limit(1);

	if (existingEgiszPerms.length === 0) {
		const [firstStaff] = await tx
			.select({ id: users.id })
			.from(users)
			.where(eq(users.organizationId, organizationId))
			.limit(1);
		const fallbackDoctorId = firstStaff?.id ?? organizationId;

		await tx
			.insert(egiszBlankPermissions)
			.values([
				{
					organizationId,
					doctorId: fallbackDoctorId,
					blankCode: "Форма 043/у",
					blankTitle: "Медицинская карта стоматологического больного: анамнез и зубная формула",
					isAllowed: true,
					patientOptOutRespect: true,
				},
				{
					organizationId,
					doctorId: fallbackDoctorId,
					blankCode: "Протокол осмотра",
					blankTitle: "Протокол консультации врача-стоматолога (первичный и повторный осмотр)",
					isAllowed: true,
					patientOptOutRespect: true,
				},
				{
					organizationId,
					doctorId: fallbackDoctorId,
					blankCode: "Лучевая диагностика",
					blankTitle: "Протокол инструментального исследования (КЛКТ 3D, ОПТГ, радиовизиография)",
					isAllowed: true,
					patientOptOutRespect: true,
				},
				{
					organizationId,
					doctorId: fallbackDoctorId,
					blankCode: "Выписной эпикриз",
					blankTitle: "Выписной эпикриз и план комплексной стоматологической реабилитации",
					isAllowed: true,
					patientOptOutRespect: true,
				},
				{
					organizationId,
					doctorId: fallbackDoctorId,
					blankCode: "ИДС",
					blankTitle: "Информированное добровольное согласие на медицинское вмешательство",
					isAllowed: true,
					patientOptOutRespect: true,
				},
				{
					organizationId,
					doctorId: fallbackDoctorId,
					blankCode: "Справка ФНС",
					blankTitle: "Справка об оплате медицинских услуг для налогового вычета",
					isAllowed: false,
					patientOptOutRespect: true,
				},
			])
			.onConflictDoNothing();
	}

	// 4. Конфигурация Telegram-бота клиники
	const existingBots = await tx
		.select({ id: denteTelegramBotConfigs.id })
		.from(denteTelegramBotConfigs)
		.where(eq(denteTelegramBotConfigs.organizationId, organizationId))
		.limit(1);

	if (existingBots.length === 0) {
		await tx
			.insert(denteTelegramBotConfigs)
			.values({
				organizationId,
				botUsername: "@DenteClinicBot",
				tokenSecretRef: "env:DENTE_DEMO_TELEGRAM_BOT_TOKEN",
				webhookBaseUrl: "https://crm.dente-clinic.ru/api/webhooks/telegram",
			})
			.onConflictDoNothing();
	}
}
