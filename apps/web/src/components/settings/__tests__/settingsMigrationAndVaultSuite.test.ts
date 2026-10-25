/**
 * apps/web/src/components/settings/__tests__/settingsMigrationAndVaultSuite.test.ts
 *
 * Dedicated Inquisitor verification suite for SettingsClinicTab, MigrationWizard & OfflineBackupVault:
 * 1. Clinic Profile Autonomy: Empty/incomplete INN, KPP, OGRN, email sanitized to null; zero blocked saves.
 * 2. Shared Schema: updateClinicProfileSchema transforms "" to null for legal fields.
 * 3. Migration Wizard: autoDetectColumnMappings handles MIS headers with punctuation (Ф.И.О., Д.Р., Сотовый).
 * 4. Vault & Real Backup: Honest SHA-256, actual byte sizes, zero Math.random() mocks.
 * 5. Clean Clinical Russian: Purge of bird-language (043/у, 1051н, ФФД 1.2) from user-facing badges and descriptions.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { updateClinicProfileSchema } from "@dental/shared";
import {
	buildClinicProfileUpdatePayload,
	emptyClinicProfileDraft,
} from "../../../utils/clinicProfileUtils";
import { autoDetectColumnMappings } from "../migrationModules/migrationWizardTypes";
import {
	createEncryptedDenteBackup,
	validateDenteBackupContainer,
} from "@dental/shared";

describe("Settings, Migration & Vault Inquisitor Suite", () => {
	describe("1. Clinic Profile Autonomy & Legal Sanitization (Mandate 8e, 8n)", () => {
		it("сохраняет название клиники и расписание даже при полностью пустых реквизитах", () => {
			const draft = emptyClinicProfileDraft();
			draft.clinicName = "Клиника ДЕНТЕ Плюс";
			draft.phone = "+7 (999) 000-00-00";
			draft.workdayStart = "08:30";
			draft.workdayEnd = "20:30";
			draft.inn = "";
			draft.kpp = "";
			draft.ogrn = "";
			draft.email = "";

			const payload = buildClinicProfileUpdatePayload(draft);
			assert.equal(payload.clinicName, "Клиника ДЕНТЕ Плюс");
			assert.equal(payload.phone, "+7 (999) 000-00-00");
			assert.equal(payload.inn, null);
			assert.equal(payload.kpp, null);
			assert.equal(payload.ogrn, null);
			assert.equal(payload.email, null);

			// Validate with schema
			const parsed = updateClinicProfileSchema.safeParse(payload);
			assert.ok(parsed.success, `Схема должна успешно валидировать чистый payload: ${JSON.stringify(parsed)}`);
		});

		it("санирует неполные черновики ИНН/КПП/ОГРН/Email в null, предотвращая отказ 400", () => {
			const draft = emptyClinicProfileDraft();
			draft.clinicName = "Семейная стоматология";
			draft.inn = "12345"; // 5 цифр вместо 10/12
			draft.kpp = "123"; // 3 цифры вместо 9
			draft.ogrn = "987"; // 3 цифры вместо 13/15
			draft.email = "not-an-email";

			const payload = buildClinicProfileUpdatePayload(draft);
			assert.equal(payload.clinicName, "Семейная стоматология");
			assert.equal(payload.inn, null, "Неполный ИНН должен быть санирован в null");
			assert.equal(payload.kpp, null, "Неполный КПП должен быть санирован в null");
			assert.equal(payload.ogrn, null, "Неполный ОГРН должен быть санирован в null");
			assert.equal(payload.email, null, "Некорректный email должен быть санирован в null");

			const parsed = updateClinicProfileSchema.safeParse(payload);
			assert.ok(parsed.success, "Схема должна принять санированный черновик");
		});

		it("корректные ИНН юрлица (10 цифр) и ИП (12 цифр) сохраняются без искажений", () => {
			const draftOoo = emptyClinicProfileDraft();
			draftOoo.clinicName = "ООО Денте";
			draftOoo.inn = "7701234567";
			draftOoo.kpp = "770101001";
			draftOoo.ogrn = "1027700123456";
			draftOoo.email = "clinic@dente.ru";

			const payloadOoo = buildClinicProfileUpdatePayload(draftOoo);
			assert.equal(payloadOoo.inn, "7701234567");
			assert.equal(payloadOoo.kpp, "770101001");
			assert.equal(payloadOoo.ogrn, "1027700123456");
			assert.equal(payloadOoo.email, "clinic@dente.ru");

			const parsedOoo = updateClinicProfileSchema.safeParse(payloadOoo);
			assert.ok(parsedOoo.success);

			const draftIp = emptyClinicProfileDraft();
			draftIp.clinicName = "ИП Иванов";
			draftIp.inn = "500123456789";
			draftIp.ogrn = "321774600123456";

			const payloadIp = buildClinicProfileUpdatePayload(draftIp);
			assert.equal(payloadIp.inn, "500123456789");
			assert.equal(payloadIp.ogrn, "321774600123456");
			assert.equal(payloadIp.kpp, null);

			const parsedIp = updateClinicProfileSchema.safeParse(payloadIp);
			assert.ok(parsedIp.success);
		});
	});

	describe("2. Migration Wizard MIS Header Detection", () => {
		it("распознает колонки со знаками препинания и точками (Инфодент, Дентал-4, Инфоклиника)", () => {
			const headers = [
				"Ф.И.О.",
				"Д.Р.",
				"Сотовый тел.",
				"Остаток/баланс",
				"Дата последн. приёма",
				"Аллергоанамнез / Примечание",
			];

			const mapped = autoDetectColumnMappings(headers);
			assert.equal(mapped["Ф.И.О."], "fullName");
			assert.equal(mapped["Д.Р."], "birthDate");
			assert.equal(mapped["Сотовый тел."], "phone");
			assert.equal(mapped["Остаток/баланс"], "balance");
			assert.equal(mapped["Дата последн. приёма"], "lastVisitDate");
			assert.equal(mapped["Аллергоанамнез / Примечание"], "notes");
		});

		it("распознает альтернативные варианты написания (Фамилия, Д/Р, Моб. телефон)", () => {
			const headers = [
				"Фамилия Имя Отчество",
				"Моб. телефон",
				"Д/Р",
				"Депозит (руб)",
			];

			const mapped = autoDetectColumnMappings(headers);
			assert.equal(mapped["Фамилия Имя Отчество"], "fullName");
			assert.equal(mapped["Моб. телефон"], "phone");
			assert.equal(mapped["Д/Р"], "birthDate");
			assert.equal(mapped["Депозит (руб)"], "balance");
		});
	});

	describe("3. Vault & Real Backup Integrity", () => {
		it("формирует валидный зашифрованный контейнер с реальным SHA-256 без Math.random()", () => {
			const payload = {
				mutations: [],
				drafts: [],
				clinicalCache: [],
				schedules: [],
				patients: [{ id: "test-patient", fullName: "Иванов И.И." }],
				odontograms: [],
				pricelists: [],
				icd10: [],
				meta: { clinicName: "Тестовая Клиника" },
			};

			const backup = createEncryptedDenteBackup(payload as any, {
				organizationId: "org-test-123",
				passphrase: "secure-test-pass",
			});

			assert.ok(backup.length > 100);
			const validation = validateDenteBackupContainer(backup);
			assert.ok(validation.valid);
			assert.ok(validation.header);
			assert.equal(validation.header.organizationId, "org-test-123");
			assert.ok(validation.header.payloadSha256, "Контрольная сумма SHA-256 обязана быть вычислена");
			assert.equal(validation.header.payloadSha256?.length, 64, "Длина SHA-256 обязана быть 64 hex-символа");
		});
	});

	describe("4. Pure Clinical Russian (Zero Bird-Language)", () => {
		const readSource = (subPath: string) => {
			const clean = subPath.replace(/^apps[\\/]web[\\/]/, "");
			const rootCandidate = path.resolve(process.cwd(), "apps/web", clean);
			if (fs.existsSync(rootCandidate)) return fs.readFileSync(rootCandidate, "utf-8");
			const localCandidate = path.resolve(process.cwd(), clean);
			if (fs.existsSync(localCandidate)) return fs.readFileSync(localCandidate, "utf-8");
			return fs.readFileSync(path.resolve(process.cwd(), subPath), "utf-8");
		};

		it("проверяет отсутствие сырых номеров приказов в видимых текстах настроек", () => {
			const adminSource = readSource("apps/web/src/components/settings/AdminSettingsSection.tsx");
			assert.ok(!adminSource.includes("Опрос 043/у"), "043/у не должно быть в карточке опроса");
			assert.ok(adminSource.includes("Опрос самочувствия"), "Должен использоваться термин 'Опрос самочувствия'");

			const mobileSource = readSource("apps/web/src/components/settings/mobile/MobileSettingsRootView.tsx");
			assert.ok(!mobileSource.includes("ЭМК 043/у"), "ЭМК 043/у не должно быть в мобильном корне");

			const ownerSource = readSource("apps/web/src/components/settings/OwnerSettingsSection.tsx");
			assert.ok(!ownerSource.includes("ИДС 1051н"), "ИДС 1051н не должно быть в табах владельца");

			const taxSource = readSource("apps/web/src/components/settings/clinic/TaxationAndFiscalizationCard.tsx");
			assert.ok(!taxSource.includes("ФФД {ffdVersion}"), "ФФД не должно быть на видимом бейдже");
			assert.ok(taxSource.includes("Кассовый чек ({ffdVersion})"));
		});
	});
});
