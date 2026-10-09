import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import type { GeneratedDocument } from "@dental/shared";
import {
	DOCUMENT_TIMESTAMP_FIELDS,
	type DocumentState,
	confirmedDocumentLiteral,
	formatDateTimeLocal,
	formatIsoDate,
	formatRuDate,
	formatRuDateTime,
	hydrateDocumentStateWithProfiles,
	requiredDocumentField,
	validateDocumentPayloadForKind,
	withDocumentCreationTimestamps,
	withDocumentHelpers,
} from "../documentLogic";

describe("validateDocumentPayloadForKind and state hydrators", () => {
	const createMockState = (
		overrides: Partial<DocumentState> = {},
	): DocumentState => ({
		attendanceStartedAtValue: () => "2023-01-01T10:00",
		attendanceEndedAtValue: () => "2023-01-01T11:00",
		attendancePurpose: "Checkup",
		attendanceIssuedAt: "2023-01-01",
		attendanceSignedByValue: () => "Dr. Smith",
		attendanceSignedByRole: "Doctor",
		attendanceDiagnosisDisclosureExcluded: true,
		attendanceNotSickLeaveAcknowledged: true,
		requiredDocumentField: (val: any, msg: string) => (val ? null : msg),
		...overrides,
	});

	it("returns null if the document kind is not in structuredPayloadDocumentKinds", () => {
		const result = validateDocumentPayloadForKind(
			"unknown_kind" as GeneratedDocument["kind"],
			createMockState(),
		);
		assert.equal(result, null);
	});

	it("returns null if the document kind is in structuredPayloadDocumentKinds but has no validator", () => {
		const result = validateDocumentPayloadForKind(
			"tax_deduction_certificate" as GeneratedDocument["kind"],
			createMockState(),
		);
		assert.equal(result, null);
	});

	it("returns null when validation passes for a valid kind", () => {
		const result = validateDocumentPayloadForKind(
			"visit_attendance_certificate",
			createMockState(),
		);
		assert.equal(result, null);
	});

	it("returns validation error message when validation fails", () => {
		const invalidState = createMockState({
			attendancePurpose: "",
		});
		const result = validateDocumentPayloadForKind(
			"visit_attendance_certificate",
			invalidState,
		);
		assert.equal(result, "справка о посещении, цель выдачи");
	});

	it("returns another validation error message for boolean checks", () => {
		const invalidState = createMockState({
			attendanceNotSickLeaveAcknowledged: false,
		});
		const result = validateDocumentPayloadForKind(
			"visit_attendance_certificate",
			invalidState,
		);
		assert.equal(
			result,
			"Подтвердите, что справка не заменяет листок нетрудоспособности.",
		);
	});

	it("correctly evaluates requiredDocumentField", () => {
		assert.equal(requiredDocumentField("", "ФИО"), "Заполните поле: ФИО.");
		assert.equal(requiredDocumentField("  ", "ФИО"), "Заполните поле: ФИО.");
		assert.equal(requiredDocumentField("Иванов", "ФИО"), null);
	});

	it("correctly evaluates confirmedDocumentLiteral", () => {
		assert.equal(confirmedDocumentLiteral(true, "Условие"), true);
		assert.throws(
			() => confirmedDocumentLiteral(false, "Условие"),
			/Не подтверждено обязательное условие документа: Условие/,
		);
	});

	it("withDocumentHelpers injects helper methods into state", () => {
		const raw: DocumentState = { foo: "bar" };
		const augmented = withDocumentHelpers(raw);
		assert.equal(augmented.foo, "bar");
		assert.equal(typeof augmented.requiredDocumentField, "function");
		assert.equal(typeof augmented.confirmedDocumentLiteral, "function");
	});

	it("hydrateDocumentStateWithProfiles safely merges profiles", () => {
		const base: DocumentState = { test: 123 };
		const hydrated = hydrateDocumentStateWithProfiles(base, {
			clinicProfileDraft: { legalName: "Клиника ДЕНТЕ" },
			documentPatient: { fullName: "Петров П.П." },
			activeDoctor: { fullName: "Доктор Айболит" },
		});
		assert.equal(hydrated.clinicProfileDraft.legalName, "Клиника ДЕНТЕ");
		assert.equal(hydrated.documentPatient.fullName, "Петров П.П.");
		assert.equal(hydrated.activeDoctor.fullName, "Доктор Айболит");
		assert.equal(hydrated.test, 123);
	});
});

describe("withDocumentCreationTimestamps and date formatters", () => {
	it("has complete timestamp field configurations", () => {
		assert.ok(DOCUMENT_TIMESTAMP_FIELDS.length >= 24);
		assert.ok(
			DOCUMENT_TIMESTAMP_FIELDS.some(
				([f, s]) => f === "paidContractSignedAt" && s === "dateTime",
			),
		);
		assert.ok(
			DOCUMENT_TIMESTAMP_FIELDS.some(
				([f, s]) => f === "taxApplicationRequestedAt" && s === "dateTimeLocal",
			),
		);
	});

	it("formats ru-RU date and time deterministically", () => {
		const date = new Date(2026, 6, 28, 14, 30);
		const ruDate = formatRuDate(date);
		const isoDate = formatIsoDate(date);
		const dtLocal = formatDateTimeLocal(date);
		assert.ok(ruDate.includes("2026") || ruDate.includes("28"));
		assert.equal(isoDate, "2026-07-28");
		assert.equal(dtLocal, "2026-07-28T14:30");
	});

	it("populates empty timestamp fields without overwriting user-provided values", () => {
		const initial: DocumentState = {
			paidContractSignedAt: "2026-01-01 10:00",
			paidContractDate: "",
			taxApplicationRequestedAt: undefined,
		};
		const stamped = withDocumentCreationTimestamps(initial);
		assert.equal(stamped.paidContractSignedAt, "2026-01-01 10:00");
		assert.ok(stamped.paidContractDate.length > 0);
		assert.ok(stamped.taxApplicationRequestedAt.includes("T"));
	});
});
