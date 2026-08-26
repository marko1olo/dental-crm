import assert from "node:assert";
import { describe, test } from "node:test";
import { PhiRedactor, SymbolTable } from "../phiRedactor.js";

describe("SymbolTable", () => {
	test("deterministically tokenizes and restores values", () => {
		const table = new SymbolTable();
		const nameToken1 = table.tokenize("Иванов Иван Иванович", "NAME");
		const nameToken2 = table.tokenize("Иванов Иван Иванович", "NAME");

		assert.strictEqual(nameToken1, nameToken2);
		assert.match(nameToken1, /^NAME_[a-f0-9]{6}$/);

		const restored = table.restoreText(`Пациент: ${nameToken1} прибыл на прием`);
		assert.strictEqual(restored, "Пациент: Иванов Иван Иванович прибыл на прием");
	});

	test("replaces known tokens in free text", () => {
		const table = new SymbolTable();
		const token = table.tokenize("+79991234567", "PHONE");

		const redacted = table.replaceKnown("Позвонить пациенту по номеру +79991234567 срочно");
		assert.strictEqual(redacted, `Позвонить пациенту по номеру ${token} срочно`);
	});
});

describe("PhiRedactor", () => {
	test("redacts nested objects and sensitive keys", () => {
		const redactor = new PhiRedactor({ enabled: true });

		const patientData = {
			id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
			first_name: "Светлана",
			last_name: "Барабаш",
			phone: "+79001234567",
			email: "svetlana@example.com",
			snils: "123-456-789 00",
			clinical_notes: "Кариес 46 зуба, запланирована пломбировка",
		};

		const redacted = redactor.redactObject(patientData);

		assert.match(redacted.first_name, /^NAME_[a-f0-9]{6}$/);
		assert.match(redacted.last_name, /^NAME_[a-f0-9]{6}$/);
		assert.match(redacted.phone, /^PHONE_[a-f0-9]{6}$/);
		assert.match(redacted.email, /^EMAIL_[a-f0-9]{6}$/);
		assert.match(redacted.snils, /^NATID_[a-f0-9]{6}$/);
		assert.strictEqual(redacted.clinical_notes, "Кариес 46 зуба, запланирована пломбировка");

		// Rehydration of arguments
		const rehydrated = redactor.rehydrateArgs(redacted);
		assert.deepStrictEqual(rehydrated, patientData);
	});

	test("redacts and rehydrates conversational messages", () => {
		const redactor = new PhiRedactor({ enabled: true });
		redactor.seed({
			patient_name: "Барабаш Светлана Викторовна",
			phone: "+79110002233",
		});

		const userQuery = "Найди карту для Барабаш Светлана Викторовна и телефон +79110002233";
		const redactedQuery = redactor.redactText(userQuery);

		assert.ok(!redactedQuery.includes("Барабаш Светлана Викторовна"));
		assert.ok(!redactedQuery.includes("+79110002233"));

		const rehydrated = redactor.rehydrateText(redactedQuery);
		assert.strictEqual(rehydrated, userQuery);
	});
});
