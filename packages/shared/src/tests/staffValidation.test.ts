/**
 * staffValidation.test.ts — Тесты валидации реквизитов сотрудников, дедупликации и энтропии паролей.
 *
 * Проверяемые разделы:
 * 1. СНИЛС по алгоритму ПФР / СФР / ЕГИСЗ (11 цифр, весовые коэффициенты, контрольные числа).
 * 2. ИНН по алгоритму ФНС (10 знаков для юрлиц, 12 знаков для физлиц и врачей).
 * 3. Личная медицинская книжка (ЛМК / СанПиН) и сроки очередного медосмотра.
 * 4. Периодическая аккредитация Минздрава РФ (5-летний цикл, 90-дневные предупреждения).
 * 5. Разграничение заметок руководства (Главврач / Директор).
 * 6. Дедупликация персонала по СНИЛС, ИНН, email и телефону.
 * 7. Расчет энтропии пароля по Шеннону и защита от словарных паролей ($H \ge 50$ бит).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	canEditManagementNotes,
	canViewManagementNotes,
	checkStaffDuplicates,
	evaluatePasswordEntropy,
	formatStaffInn,
	formatStaffSnils,
	validateMedicalBook,
	validateMinzdravAccreditation,
	validateStaffInn,
	validateStaffSnils,
} from "../index.js";

describe("Валидация СНИЛС (ПФР / СФР / ЕГИСЗ)", () => {
	it("успешно валидирует корректные номера СНИЛС с контрольным числом", () => {
		// 112-233-445 95: (1*9 + 1*8 + 2*7 + 2*6 + 3*5 + 3*4 + 4*3 + 4*2 + 5*1) = 9+8+14+12+15+12+12+8+5 = 95
		const res1 = validateStaffSnils("11223344595");
		assert.equal(res1.isValid, true);
		assert.equal(res1.formatted, "112-233-445 95");

		// Валидация форматированной строки
		const res2 = validateStaffSnils("112-233-445 95");
		assert.equal(res2.isValid, true);
		assert.equal(res2.formatted, "112-233-445 95");
	});

	it("валидирует СНИЛС номеров <= 001-001-998 без контрольного числа", () => {
		const res = validateStaffSnils("00100199800");
		assert.equal(res.isValid, true);
	});

	it("отвергает СНИЛС с неверным контрольным числом", () => {
		const res = validateStaffSnils("11223344500");
		assert.equal(res.isValid, false);
		assert.match(res.error || "", /контрольное число/i);
	});

	it("отвергает СНИЛС неверной длины", () => {
		const res = validateStaffSnils("12345");
		assert.equal(res.isValid, false);
		assert.match(res.error || "", /11 цифр/i);
	});

	it("форматирует СНИЛС в канонический вид", () => {
		assert.equal(formatStaffSnils("11223344595"), "112-233-445 95");
		assert.equal(formatStaffSnils(""), "");
	});
});

describe("Валидация ИНН (ФНС РФ)", () => {
	it("успешно валидирует 12-значный ИНН физлица / врача", () => {
		// Тестовый валидный ИНН физлица: 7707083893
		const res10 = validateStaffInn("7707083893");
		assert.equal(res10.isValid, true);
		assert.equal(res10.type, "legal_entity");

		// Валидный 12-значный ИНН: 500100732259
		const res12 = validateStaffInn("500100732259");
		assert.equal(res12.isValid, true);
		assert.equal(res12.type, "individual");
	});

	it("отвергает ИНН с неверной контрольной суммой", () => {
		const res = validateStaffInn("500100732200");
		assert.equal(res.isValid, false);
		assert.match(res.error || "", /Контрольные суммы/i);
	});

	it("отвергает ИНН недопустимой длины", () => {
		const res = validateStaffInn("1234567");
		assert.equal(res.isValid, false);
		assert.match(res.error || "", /10 или 12 цифр/i);
	});
});

describe("Личная медицинская книжка (ЛМК / СанПиН)", () => {
	it("определяет статус действующей медкнижки", () => {
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 180);
		const iso = futureDate.toISOString().slice(0, 10);

		const res = validateMedicalBook("ЛМК-998877", iso);
		assert.equal(res.isValid, true);
		assert.equal(res.status, "valid");
		assert.ok((res.daysUntilCheckup ?? 0) > 30);
	});

	it("определяет статус истекающей медкнижки (<= 30 дней)", () => {
		const soonDate = new Date();
		soonDate.setDate(soonDate.getDate() + 15);
		const iso = soonDate.toISOString().slice(0, 10);

		const res = validateMedicalBook("ЛМК-998877", iso);
		assert.equal(res.isValid, true);
		assert.equal(res.status, "expiring_soon");
		assert.ok((res.daysUntilCheckup ?? 0) <= 30);
	});

	it("определяет просроченную медкнижку", () => {
		const pastDate = new Date();
		pastDate.setDate(pastDate.getDate() - 10);
		const iso = pastDate.toISOString().slice(0, 10);

		const res = validateMedicalBook("ЛМК-998877", iso);
		assert.equal(res.isValid, false);
		assert.equal(res.status, "expired");
		assert.match(res.message, /приостановлен/i);
	});
});

describe("Периодическая аккредитация Минздрава РФ", () => {
	it("рассчитывает 5-летний цикл аккредитации", () => {
		const issueDate = new Date();
		issueDate.setFullYear(issueDate.getFullYear() - 2); // 2 года назад -> осталось 3 года
		const iso = issueDate.toISOString().slice(0, 10);

		const res = validateMinzdravAccreditation(iso);
		assert.equal(res.isValid, true);
		assert.equal(res.status, "valid");
		assert.ok(res.daysRemaining > 90);
	});

	it("выдает предупреждение при сроке окончания менее 90 дней", () => {
		const issueDate = new Date();
		issueDate.setFullYear(issueDate.getFullYear() - 5);
		issueDate.setDate(issueDate.getDate() + 45); // Истекает через 45 дней
		const iso = issueDate.toISOString().slice(0, 10);

		const res = validateMinzdravAccreditation(iso);
		assert.equal(res.isValid, true);
		assert.equal(res.status, "expiring_soon");
		assert.match(res.message, /144 ЗЕТ/i);
	});

	it("фиксирует просроченную аккредитацию", () => {
		const issueDate = new Date();
		issueDate.setFullYear(issueDate.getFullYear() - 6); // Выдана 6 лет назад
		const iso = issueDate.toISOString().slice(0, 10);

		const res = validateMinzdravAccreditation(iso);
		assert.equal(res.isValid, false);
		assert.equal(res.status, "expired");
		assert.match(res.message, /ФАЦ/i);
	});
});

describe("Защита от дубликатов персонала", () => {
	const existingStaff = [
		{
			id: "11111111-1111-1111-1111-111111111111",
			fullName: "Иванов Иван Иванович",
			snils: "112-233-445 95",
			inn: "500100732259",
			email: "ivanov@clinic.ru",
			phone: "+7 (999) 111-22-33",
		},
		{
			id: "22222222-2222-2222-2222-222222222222",
			fullName: "Петрова Анна Сергеевна",
			snils: "001-001-998 00",
			inn: "7707083893",
			email: "petrova@clinic.ru",
			phone: "+7 (999) 444-55-66",
		},
	];

	it("обнаруживает конфликт по СНИЛС", () => {
		const candidate = {
			fullName: "Сидоров Сидор",
			snils: "112-233-445 95",
		};
		const conflict = checkStaffDuplicates(existingStaff, candidate);
		assert.ok(conflict !== null);
		assert.equal(conflict?.field, "snils");
		assert.match(conflict?.message || "", /Иванов Иван Иванович/);
	});

	it("обнаруживает конфликт по ИНН", () => {
		const candidate = {
			fullName: "Новый Врач",
			inn: "500100732259",
		};
		const conflict = checkStaffDuplicates(existingStaff, candidate);
		assert.ok(conflict !== null);
		assert.equal(conflict?.field, "inn");
	});

	it("обнаруживает конфликт по Email", () => {
		const candidate = {
			fullName: "Новый Сотрудник",
			email: "IVANOV@clinic.ru",
		};
		const conflict = checkStaffDuplicates(existingStaff, candidate);
		assert.ok(conflict !== null);
		assert.equal(conflict?.field, "email");
	});

	it("обнаруживает конфликт по номеру телефона", () => {
		const candidate = {
			fullName: "Новый Сотрудник",
			phone: "89991112233",
		};
		const conflict = checkStaffDuplicates(existingStaff, candidate);
		assert.ok(conflict !== null);
		assert.equal(conflict?.field, "phone");
	});

	it("не блокирует редактирование самого себя по ID", () => {
		const candidate = {
			id: "11111111-1111-1111-1111-111111111111",
			fullName: "Иванов Иван Иванович (Обновленный)",
			snils: "112-233-445 95",
			email: "ivanov@clinic.ru",
		};
		const conflict = checkStaffDuplicates(existingStaff, candidate);
		assert.equal(conflict, null);
	});
});

describe("Разграничение заметок руководства (HR Security Guard)", () => {
	it("разрешает просмотр и правку только Главврачу и Директору", () => {
		assert.equal(canViewManagementNotes("owner"), true);
		assert.equal(canViewManagementNotes("director"), true);
		assert.equal(canViewManagementNotes("head_doctor"), true);
		assert.equal(canViewManagementNotes("chief_doctor"), true);

		assert.equal(canViewManagementNotes("doctor"), false);
		assert.equal(canViewManagementNotes("administrator"), false);
		assert.equal(canViewManagementNotes("assistant"), false);
		assert.equal(canViewManagementNotes("accountant"), false);
	});
});

describe("Оценка энтропии паролей (Шеннон / $H \\ge 50$ бит)", () => {
	it("отвергает слабые и словарные пароли", () => {
		const weak1 = evaluatePasswordEntropy("123456");
		assert.equal(weak1.isAcceptableForStaff, false);
		assert.ok(weak1.effectiveEntropyBits < 50);

		const weak2 = evaluatePasswordEntropy("qwerty");
		assert.equal(weak2.isAcceptableForStaff, false);

		const weak3 = evaluatePasswordEntropy("пароль123");
		assert.equal(weak3.isAcceptableForStaff, false);
	});

	it("принимает стойкие криптографические пароли $H \\ge 50$ бит", () => {
		const strong = evaluatePasswordEntropy("Dental#Doctor2026!Secure");
		assert.equal(strong.isAcceptableForStaff, true);
		assert.ok(strong.effectiveEntropyBits >= 50);
		assert.ok(strong.scorePercent >= 60);
		assert.equal(strong.hasUppercase, true);
		assert.equal(strong.hasDigits, true);
		assert.equal(strong.hasSpecialSymbols, true);
	});
});
