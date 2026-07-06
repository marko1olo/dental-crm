import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { validateDocumentPayloadForKind, DocumentState } from "./documentLogic";
import { GeneratedDocument } from "@dental/shared";

describe("validateDocumentPayloadForKind", () => {
  const createMockState = (overrides: Partial<DocumentState> = {}): DocumentState => ({
    attendanceStartedAtValue: () => "2023-01-01T10:00",
    attendanceEndedAtValue: () => "2023-01-01T11:00",
    attendancePurpose: "Checkup",
    attendanceIssuedAt: "2023-01-01",
    attendanceSignedByValue: () => "Dr. Smith",
    attendanceSignedByRole: "Doctor",
    attendanceDiagnosisDisclosureExcluded: true,
    attendanceNotSickLeaveAcknowledged: true,
    requiredDocumentField: (val: any, msg: string) => val ? null : msg,
    ...overrides,
  });

  it("returns null if the document kind is not in structuredPayloadDocumentKinds", () => {
    const result = validateDocumentPayloadForKind("unknown_kind" as GeneratedDocument["kind"], createMockState());
    assert.equal(result, null);
  });

  it("returns null if the document kind is in structuredPayloadDocumentKinds but has no validator", () => {
    const result = validateDocumentPayloadForKind("tax_deduction_certificate" as GeneratedDocument["kind"], createMockState());
    assert.equal(result, null);
  });

  it("returns null when validation passes for a valid kind", () => {
    const result = validateDocumentPayloadForKind("visit_attendance_certificate", createMockState());
    assert.equal(result, null);
  });

  it("returns validation error message when validation fails", () => {
    const invalidState = createMockState({
      attendancePurpose: "",
    });
    const result = validateDocumentPayloadForKind("visit_attendance_certificate", invalidState);
    assert.equal(result, "справка о посещении, цель выдачи");
  });

  it("returns another validation error message for boolean checks", () => {
    const invalidState = createMockState({
      attendanceNotSickLeaveAcknowledged: false,
    });
    const result = validateDocumentPayloadForKind("visit_attendance_certificate", invalidState);
    assert.equal(result, "Подтвердите, что справка не заменяет листок нетрудоспособности.");
  });
});
