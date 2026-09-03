import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	familyGroups,
	organizations,
	patientArchiveReasonsAndBlacklists,
	patientReferralCodes,
	patientReferrals,
	patients,
	referralCampaigns,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import {
	findDuplicateCandidates,
	phoneFuzzySimilarity,
	phoneKey,
	phoneKeys,
} from "../../services/patients/duplicateDetection.js";
import { mergePatients } from "../../services/patients/patientMerge.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const NAMESPACE = "prosecutorTwelfthWave";
const ORG_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);

const PATIENT_A_ID = fixtureUuid(NAMESPACE, 10);
const PATIENT_B_ID = fixtureUuid(NAMESPACE, 11);
const PATIENT_C_CHILD_ID = fixtureUuid(NAMESPACE, 12);
const PATIENT_FRIEND_ID = fixtureUuid(NAMESPACE, 13);

const FAMILY_A_ID = fixtureUuid(NAMESPACE, 20);
const FAMILY_B_ID = fixtureUuid(NAMESPACE, 21);

const CAMPAIGN_ID = fixtureUuid(NAMESPACE, 30);
const REF_CODE_A_ID = fixtureUuid(NAMESPACE, 31);
const REF_CODE_B_ID = fixtureUuid(NAMESPACE, 32);

const PLAN_A_ID = fixtureUuid(NAMESPACE, 40);
const PLAN_B_ID = fixtureUuid(NAMESPACE, 41);

describe("PROSECUTOR 2: ДВЕНАДЦАТАЯ ВОЛНА (PHONE EVASION, FAMILY BALANCES & REFERRALS STRESS)", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника Двенадцатая Волна — Стресс Дедупликации",
			});

			await tx.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				email: "surgeon.dedup12@dente.pro",
				role: "doctor",
				fullName: "Профессор Дедупликации БД",
			});

			// Семейная группа А (Основная) с балансом 5 000.00 ₽
			await tx.insert(familyGroups).values({
				id: FAMILY_A_ID,
				organizationId: ORG_ID,
				name: "Семья Сергеевых",
				headPatientId: PATIENT_A_ID,
				primaryPatientId: PATIENT_A_ID,
				balance: "5000.00",
			});

			// Семейная группа Б (Дублирующая) с балансом 3 500.50 ₽
			await tx.insert(familyGroups).values({
				id: FAMILY_B_ID,
				organizationId: ORG_ID,
				name: "Семья Сергеева (Дубль)",
				headPatientId: PATIENT_B_ID,
				primaryPatientId: PATIENT_B_ID,
				balance: "3500.50",
			});

			// Карточки пациентов
			await tx.insert(patients).values([
				{
					id: PATIENT_A_ID,
					organizationId: ORG_ID,
					fullName: "Сергеев Сергей Сергеевич",
					phone: "+7 (916) 123-45-67",
					birthDate: "1985-05-15",
					status: "active",
					familyGroupId: FAMILY_A_ID,
					balance: "1200.00",
					administrativeProfile: {
						snils: "111-222-333 44",
					},
				},
				{
					id: PATIENT_B_ID,
					organizationId: ORG_ID,
					fullName: "Сергеев Сергей Сергеевич",
					// Номер с попыткой обхода: 8-ка, неразрывный пробел, добавочный
					phone: "8\u00A0(916)\u00A0123-45-67 доб. 102",
					birthDate: "1985-05-15",
					status: "active",
					familyGroupId: FAMILY_B_ID,
					balance: "800.50",
					weightKg: "82.50",
					administrativeProfile: {
						snils: "111-222-333 44",
						identityDocument: "Паспорт РФ 4515 987654",
					},
				},
				{
					id: PATIENT_C_CHILD_ID,
					organizationId: ORG_ID,
					fullName: "Сергеев Денис Сергеевич", // Сын в дублирующей семье Б
					phone: "+7 (916) 123-45-67",
					birthDate: "2015-08-20",
					status: "active",
					familyGroupId: FAMILY_B_ID,
					balance: "0.00",
				},
				{
					id: PATIENT_FRIEND_ID,
					organizationId: ORG_ID,
					fullName: "Друг Семьи Приглашенный",
					phone: "+7 (999) 777-88-99",
					status: "active",
				},
			]);

			// Реферальная кампания
			await tx.insert(referralCampaigns).values({
				id: CAMPAIGN_ID,
				organizationId: ORG_ID,
				name: "Приведи друга 2026",
				rewardType: "fixed_bonus",
				rewardAmount: 500,
			});

			// Реферальные коды
			await tx.insert(patientReferralCodes).values([
				{
					id: REF_CODE_A_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_A_ID,
					referralCode: "SERGEY-A",
					referralToken: "tok-sergey-a",
				},
				{
					id: REF_CODE_B_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_B_ID,
					referralCode: "SERGEY-B",
					referralToken: "tok-sergey-b",
				},
			]);

			// Рефералы:
			// 1. Самореферальная петля обхода (А пригласил Б для получения бонуса)
			await tx.insert(patientReferrals).values({
				organizationId: ORG_ID,
				campaignId: CAMPAIGN_ID,
				referrerPatientId: PATIENT_A_ID,
				refereePatientId: PATIENT_B_ID,
				status: "registered",
			});

			// 2. Легитимный друг, приглашенный через карточку Б
			await tx.insert(patientReferrals).values({
				organizationId: ORG_ID,
				campaignId: CAMPAIGN_ID,
				referrerPatientId: PATIENT_B_ID,
				refereePatientId: PATIENT_FRIEND_ID,
				status: "registered",
			});

			// Планы лечения
			await tx.insert(treatmentPlans).values([
				{
					id: PLAN_A_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_A_ID,
					doctorId: DOCTOR_ID,
					name: "Имплантация Nobel 16, 15",
					title: "Имплантация Nobel 16, 15",
					status: "Draft",
					totalPriceRub: "120000.00",
					totalPrice: "120000.00",
				},
				{
					id: PLAN_B_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_B_ID,
					doctorId: DOCTOR_ID,
					name: "Ортодонтическое лечение элайнерами",
					title: "Ортодонтическое лечение элайнерами",
					status: "Draft",
					totalPriceRub: "250000.00",
					totalPrice: "250000.00",
				},
			]);
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("1.1. [PHONE EVASION DEFENSE]: Все форматы (+7, 8, без плюса, скобки, дефисы, точки) приводятся к единому каноническому ключу", () => {
		const expectedKey = "9161234567";

		assert.equal(phoneKey("+7 (916) 123-45-67"), expectedKey);
		assert.equal(phoneKey("8 (916) 123-45-67"), expectedKey);
		assert.equal(phoneKey("89161234567"), expectedKey);
		assert.equal(phoneKey("9161234567"), expectedKey);
		assert.equal(phoneKey("+7.916.123-45/67"), expectedKey);
		assert.equal(phoneKey("007 (916) 123-45-67"), expectedKey);
	});

	it("1.2. [UNICODE SPACES & EXTENSIONS]: Неразрывные пробелы и добавочные номера не ломают распознавание", () => {
		const expectedKey = "9161234567";

		// Неразрывные (\u00A0), узкие (\u2009, \u202F) и нулевые пробелы
		assert.equal(phoneKey("+7\u00A0916\u202F123\u200945\u00A067"), expectedKey);

		// Добавочные номера (доб., добавочный, ext, x, #)
		assert.equal(phoneKey("+7 (916) 123-45-67 доб. 205"), expectedKey);
		assert.equal(phoneKey("8-916-123-45-67 ext 12"), expectedKey);
		assert.equal(phoneKey("8 (916) 123-45-67 #42"), expectedKey);

		// Сходство между номером с добавочным и чистым номером = 1.0
		const sim = phoneFuzzySimilarity(
			"+7 (916) 123-45-67 доб. 205",
			"8 (916) 123-45-67",
		);
		assert.equal(sim, 1.0, "Номер с добавочным должен совпадать с чистым номером на 100%");
	});

	it("1.3. [MULTIPLE PHONES IN FIELD]: Распознает пересечение, если в одном поле указано несколько номеров через запятую/слэш", () => {
		const multi = "8-916-123-45-67, 8-495-000-11-22";
		const keys = phoneKeys(multi);

		assert.equal(keys.length, 2);
		assert.ok(keys.includes("9161234567"));
		assert.ok(keys.includes("4950001122"));

		// Проверяем, что совпадение по любому из номеров дает similarity 1.0
		assert.equal(
			phoneFuzzySimilarity(multi, "+7 (916) 123-45-67"),
			1.0,
			"Должно совпадать по первому номеру",
		);
		assert.equal(
			phoneFuzzySimilarity(multi, "+7 (495) 000-11-22"),
			1.0,
			"Должно совпадать по второму номеру",
		);
	});

	it("1.4. [INTERNATIONAL CIS FORMATS]: Беларусь (+375 / 80) нормализуются к единому ключу", () => {
		const keyInternational = phoneKey("+375 29 123-45-67");
		const keyNational = phoneKey("80 29 123-45-67");

		assert.equal(keyInternational, "291234567");
		assert.equal(keyNational, "291234567");
		assert.equal(
			phoneFuzzySimilarity("+375 29 123-45-67", "80 29 123-45-67"),
			1.0,
		);
	});

	it("2. [FIND DUPLICATES QUEUE]: Сканер findDuplicateCandidates находит пациентов А и Б, несмотря на обходной формат телефона", async () => {
		const report = await findDuplicateCandidates(ORG_ID);
		const match = report.candidates.find(
			(c) =>
				(c.leftPatientId === PATIENT_A_ID && c.rightPatientId === PATIENT_B_ID) ||
				(c.leftPatientId === PATIENT_B_ID && c.rightPatientId === PATIENT_A_ID),
		);

		assert.ok(match, "Дублирующая пара должна быть найдена");
		assert.ok(match.confidence >= 0.95);
	});

	it("3. [MERGE FAMILY BALANCES & RELATIVES]: Объединение разных семейных групп суммирует баланс кошельков и переносит родственников", async () => {
		const mergeRes = await mergePatients({
			organizationId: ORG_ID,
			primaryPatientId: PATIENT_A_ID,
			duplicatePatientId: PATIENT_B_ID,
			performedByUserId: DOCTOR_ID,
			reason: "Слияние дубля с объединением семейного кошелька",
		});

		assert.equal(mergeRes.ok, true, "Слияние должно выполниться успешно");

		// 1. Проверяем баланс семейного кошелька группы А: 5000.00 + 3500.50 = 8500.50 ₽
		const [familyA] = await db
			.select()
			.from(familyGroups)
			.where(and(eq(familyGroups.id, FAMILY_A_ID), eq(familyGroups.organizationId, ORG_ID)));
		assert.ok(familyA);
		assert.equal(Number(familyA.balance).toFixed(2), "8500.50", "Семейный кошелек должен объединиться до копейки");

		// 2. Баланс поглощенной группы Б должен быть обнулен
		const [familyB] = await db
			.select()
			.from(familyGroups)
			.where(and(eq(familyGroups.id, FAMILY_B_ID), eq(familyGroups.organizationId, ORG_ID)));
		assert.ok(familyB);
		assert.equal(Number(familyB.balance).toFixed(2), "0.00", "Баланс поглощенной группы должен обнулиться");

		// 3. Ребенок (PATIENT_C_CHILD_ID) из семьи Б должен быть автоматически перенесен в семью А
		const [childInDb] = await db
			.select()
			.from(patients)
			.where(and(eq(patients.id, PATIENT_C_CHILD_ID), eq(patients.organizationId, ORG_ID)));
		assert.ok(childInDb);
		assert.equal(
			childInDb.familyGroupId,
			FAMILY_A_ID,
			"Родственник из поглощенной группы должен перейти в семью основной карточки",
		);

		// 4. Вес перенесен из дубля
		const [patientAInDb] = await db
			.select()
			.from(patients)
			.where(and(eq(patients.id, PATIENT_A_ID), eq(patients.organizationId, ORG_ID)));
		assert.ok(patientAInDb);
		assert.equal(Number(patientAInDb.weightKg), 82.5, "Вес должен перенестись");

		// 6. Паспорт перенесен в административный профиль
		const admin = patientAInDb.administrativeProfile as Record<string, unknown>;
		assert.equal(admin.identityDocument, "Паспорт РФ 4515 987654");
	});

	it("4. [TREATMENT PLANS RETENTION]: Планы лечения обоих пациентов сохранены на основной карточке без потерь", async () => {
		const plans = await db
			.select()
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.patientId, PATIENT_A_ID),
					eq(treatmentPlans.organizationId, ORG_ID),
				),
			);

		assert.equal(plans.length, 2, "Оба плана лечения должны быть привязаны к основной карточке");
		const planTitles = plans.map((p) => p.name);
		assert.ok(planTitles.includes("Имплантация Nobel 16, 15"));
		assert.ok(planTitles.includes("Ортодонтическое лечение элайнерами"));
	});

	it("5. [REFERRALS & CIRCULAR FRAUD CLEANUP]: Самореферальная петля ликвидирована, легитимные рефералы сохранены", async () => {
		// 1. Проверяем, что самореферальная строка (А пригласил Б, который оказался А) удалена
		const selfReferrals = await db
			.select()
			.from(patientReferrals)
			.where(
				and(
					eq(patientReferrals.organizationId, ORG_ID),
					eq(patientReferrals.referrerPatientId, PATIENT_A_ID),
					eq(patientReferrals.refereePatientId, PATIENT_A_ID),
				),
			);
		assert.equal(
			selfReferrals.length,
			0,
			"Самореферальная петля (А пригласил сам себя) должна быть ликвидирована",
		);

		// 2. Проверяем, что приглашенный друг перешел под реферера А
		const [friendReferral] = await db
			.select()
			.from(patientReferrals)
			.where(
				and(
					eq(patientReferrals.organizationId, ORG_ID),
					eq(patientReferrals.refereePatientId, PATIENT_FRIEND_ID),
				),
			);
		assert.ok(friendReferral);
		assert.equal(
			friendReferral.referrerPatientId,
			PATIENT_A_ID,
			"Приглашенный друг должен теперь числиться за основной карточкой А",
		);
	});
});
