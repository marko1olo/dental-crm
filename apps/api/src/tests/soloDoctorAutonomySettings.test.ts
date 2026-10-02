import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission } from "@dental/shared";
import { staffAuthorityFlags } from "../security/permissions.js";
import { buildClinicSettings } from "../sampleData.js";

test("Мандат 8e / 8n: наёмный врач в большой клинике не имеет права импорта настроек", () => {
	const flags = staffAuthorityFlags("doctor", false);
	assert.equal(flags.canSignMedicalRecords, true, "Врач может подписывать ЭМК");
	assert.equal(flags.canManageMoney, true, "Врач может принимать оплату у кресла");
	assert.equal(flags.canManageImports, false, "Наёмный врач не правит настройки клиники и импорт");
});

test("Мандат 8e / 8n: соло-врач (isSoloDoctor=true) получает полный суверенитет без блокировок", () => {
	const flags = staffAuthorityFlags("doctor", true);
	assert.equal(flags.canSignMedicalRecords, true, "Соло-врач подписывает ЭМК");
	assert.equal(flags.canManageMoney, true, "Соло-врач принимает оплату и делает возвраты");
	assert.equal(flags.canManageImports, true, "Соло-врач управляет переносом базы и настройками клиники");
});

test("Мандат 8e / 8n: ассистент даже в соло-клинике не получает право подписи ЭМК (323-ФЗ)", () => {
	const flags = staffAuthorityFlags("assistant", true);
	assert.equal(flags.canSignMedicalRecords, false, "Ассистент никогда не подписывает медицинские карты");
	assert.equal(flags.canManageMoney, false, "Ассистент не распоряжается деньгами");
	assert.equal(flags.canManageImports, false, "Ассистент не управляет настройками");
});

test("Мандат 8n: hasPermission выдаёт кассу и настройки соло-врачу без блокировок", () => {
	// Обычный врач в сети не управляет кассой
	assert.equal(hasPermission("doctor", "finance.cashier_operations", "full"), false);
	assert.equal(hasPermission("doctor", "settings.clinic_manage", "full"), false);

	// Соло-врач имеет полный доступ
	assert.equal(
		hasPermission("doctor", "finance.cashier_operations", "full", { isSoloDoctor: true }),
		true,
		"Соло-врач может работать с кассой",
	);
	assert.equal(
		hasPermission("doctor", "settings.clinic_manage", "full", { isSoloDoctor: true }),
		true,
		"Соло-врач может менять настройки своей клиники",
	);
});

test("Мандат 8n: buildClinicSettings динамически вычисляет soloDoctorMode", () => {
	const settings = buildClinicSettings();
	assert.equal(typeof settings.soloDoctorMode, "boolean", "soloDoctorMode должен присутствовать в ответе");
});
