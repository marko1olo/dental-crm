import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	parseGuaranteeLetterText,
	createGuaranteeLetterFromDraft,
} from "../insurance/guaranteeModules/guaranteeParser.js";
import {
	validateGuaranteeLetterDates,
	validatePatientFullNameMatch,
	isGuaranteeLetterUsable,
	normalizePatientFullName,
} from "../insurance/guaranteeModules/guaranteeValidator.js";
import {
	prepareGuaranteeLetterInsertPayload,
	mapDbRowToGuaranteeLetter,
} from "../insurance/guaranteeModules/guaranteePersistence.js";
import {
	canTransitionGuaranteeStatus,
	assertValidStatusTransition,
	getAvailableStatusTransitions,
	DMS_STATUS_DESCRIPTIONS,
} from "../insurance/guaranteeModules/guaranteeStatusTransition.js";
import type { DmsGuaranteeLetter } from "../insurance/guaranteeModules/guaranteeTypes.js";

describe("Guarantee Modules Isolated Unit Tests (guaranteeModules/)", () => {
	it("Parser: parses raw guarantee letter texts and extracts policy, limit, dates", () => {
		const raw = `Гарантийное письмо № ГП-2026/89 от 2026-05-01 по 2026-12-31.
		Полис ДМС № ПОЛ-778899. Застрахованный: Иванов Иван Иванович.
		Страховщик: АО «СОГАЗ». Лимит покрытия: 50 000 руб.`;

		const draft = parseGuaranteeLetterText(raw);
		assert.equal(draft.letterNumber, "ГП-2026/89");
		assert.equal(draft.policyNumber, "ПОЛ-778899");
		assert.equal(draft.limitKopecks, 5000000); // 50,000.00 RUB = 5,000,000 kopecks
		assert.equal(draft.issueDate, "2026-05-01");
		assert.equal(draft.validTo, "2026-12-31");
		assert.equal(draft.companyId, "sogaz");
		assert.equal(draft.patientFullName, "Иванов Иван Иванович");

		const letter = createGuaranteeLetterFromDraft({
			id: "let_test_1",
			...draft,
		});
		assert.equal(letter.id, "let_test_1");
		assert.equal(letter.status, "active");
		assert.equal(letter.limitKopecks, 5000000);
		assert.equal(letter.remainingLimitKopecks, 5000000);
	});

	it("Validator: validates date ranges and FIO matching", () => {
		const dateCheck1 = validateGuaranteeLetterDates(
			{ validFrom: "2026-01-01", validTo: "2026-12-31" },
			"2026-06-15",
		);
		assert.equal(dateCheck1.isValid, true);

		const dateCheckExpired = validateGuaranteeLetterDates(
			{ validFrom: "2026-01-01", validTo: "2026-05-01" },
			"2026-06-15",
		);
		assert.equal(dateCheckExpired.isValid, false);
		assert.equal(dateCheckExpired.isExpired, true);

		const dateCheckFuture = validateGuaranteeLetterDates(
			{ validFrom: "2026-09-01", validTo: "2026-12-31" },
			"2026-06-15",
		);
		assert.equal(dateCheckFuture.isValid, false);
		assert.equal(dateCheckFuture.isNotYetValid, true);

		// Name matching
		assert.equal(validatePatientFullNameMatch("Иванов Иван Иванович", "иванов иван"), true);
		assert.equal(validatePatientFullNameMatch("Петров Сергей", "Сидоров Сергей"), false);
		assert.equal(normalizePatientFullName("  Сидоров   Алексей   "), "сидоров алексей");
	});

	it("Persistence: correctly prepares insert payload and maps db record back", () => {
		const sample: DmsGuaranteeLetter = {
			id: "let_persist_123",
			letterNumber: "ГП-123",
			issueDate: "2026-01-10",
			validFrom: "2026-01-10",
			validTo: "2026-12-31",
			companyId: "alfastrakhovanie",
			companyName: "АО «АльфаСтрахование»",
			policyNumber: "POL-999",
			patientFullName: "Смирнова Анна Павловна",
			patientBirthDate: "1988-04-12",
			limitKopecks: 10000000,
			usedKopecks: 2500000,
			remainingLimitKopecks: 7500000,
			defaultFranchisePercent: 20,
			allowed804nPrefixes: ["A16.07.002"],
			excluded804nCodes: ["A16.07.054"],
			status: "active",
			notes: "VIP клиент",
		};

		const payload = prepareGuaranteeLetterInsertPayload(sample, "org_demo_1");
		assert.equal(payload.organizationId, "org_demo_1");
		assert.equal(payload.limitKopecks, 10000000);
		assert.equal(payload.remainingLimitKopecks, 7500000);
		assert.ok(payload.allowedPrefixesJson?.includes("A16.07.002"));

		const reconstructed = mapDbRowToGuaranteeLetter(payload);
		assert.equal(reconstructed.id, sample.id);
		assert.equal(reconstructed.patientFullName, sample.patientFullName);
		assert.equal(reconstructed.remainingLimitKopecks, sample.remainingLimitKopecks);
		assert.deepEqual(reconstructed.allowed804nPrefixes, sample.allowed804nPrefixes);
		assert.deepEqual(reconstructed.excluded804nCodes, sample.excluded804nCodes);
	});

	it("Status Transitions: verifies lifecycle rules and human descriptions", () => {
		assert.equal(canTransitionGuaranteeStatus("draft", "active"), true);
		assert.equal(canTransitionGuaranteeStatus("active", "billed"), true);
		assert.equal(canTransitionGuaranteeStatus("billed", "paid"), true);
		assert.equal(canTransitionGuaranteeStatus("paid", "active"), false); // Final state

		assertValidStatusTransition("draft", "pending_approval");
		assert.throws(() => assertValidStatusTransition("paid", "draft"), /Недопустимый переход/);

		const transitions = getAvailableStatusTransitions("active");
		assert.ok(transitions.includes("billed"));
		assert.ok(transitions.includes("cancelled"));

		assert.ok(DMS_STATUS_DESCRIPTIONS.active.includes("активно"));
	});
});
