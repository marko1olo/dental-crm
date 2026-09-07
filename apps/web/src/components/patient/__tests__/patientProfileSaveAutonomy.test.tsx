/**
 * patientProfileSaveAutonomy.test.tsx
 *
 * Unit tests for Patient Profile Save Autonomy (Mandates 8e, 8n):
 * 1. Guarantees patient core and administrative save buttons are NOT disabled when not dirty (disabled === false).
 * 2. Clicking save when not dirty shows active guidance ("Данные пациента актуальны").
 * 3. Clicking save with missing name shows helpful toast ("Введите ФИО пациента для сохранения").
 * 4. Clicking save with valid dirty changes executes the save callback and displays success toast.
 * 5. Button is disabled ONLY when saveState === "saving" to prevent double submissions.
 * 6. Interactive buttons meet desktop dense ergonomics (>= 36px).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	executePatientCoreSaveAutonomy,
	executePatientAdministrativeProfileSaveAutonomy,
} from "../../../PatientsView";

type MockFn = {
	(...args: any[]): any;
	calls: any[][];
	mock: { calls: any[][] };
	mockReturnValue: (val: any) => MockFn;
	mockResolvedValue: (val: any) => MockFn;
};

function createMockFn(impl?: (...args: any[]) => any): MockFn {
	const calls: any[][] = [];
	const fn = ((...args: any[]) => {
		calls.push(args);
		return impl ? impl(...args) : undefined;
	}) as MockFn;
	fn.calls = calls;
	fn.mock = { calls };
	fn.mockReturnValue = (val: any) => createMockFn(() => val);
	fn.mockResolvedValue = (val: any) => createMockFn(() => Promise.resolve(val));
	return fn;
}

const vi = {
	fn: (impl?: any) => createMockFn(impl),
};

function expect(actual: any) {
	return {
		toBe: (expected: any) => assert.strictEqual(actual, expected),
		toBeFalsy: () => assert.ok(!actual, `Expected falsy, but got ${actual}`),
		toBeTruthy: () => assert.ok(Boolean(actual), `Expected truthy, but got ${actual}`),
		toBeNull: () => assert.strictEqual(actual, null),
		not: {
			toBeNull: () => assert.ok(actual !== null && actual !== undefined),
			toContain: (expected: string) => {
				assert.ok(
					!actual?.includes?.(expected),
					`Expected "${actual}" NOT to contain "${expected}"`,
				);
			},
			toHaveBeenCalled: () => {
				const count = actual?.calls?.length ?? 0;
				assert.strictEqual(
					count,
					0,
					`Expected function NOT to have been called, but was called ${count} times`,
				);
			},
		},
		toContain: (expected: string) => {
			assert.ok(
				actual?.includes?.(expected),
				`Expected "${actual}" to contain "${expected}"`,
			);
		},
		toHaveBeenCalled: () => {
			const count = actual?.calls?.length ?? 0;
			assert.ok(count > 0, "Expected function to have been called");
		},
		toHaveBeenCalledWith: (...expectedArgs: any[]) => {
			const calls = actual?.calls ?? [];
			const match = calls.some((callArgs: any[]) =>
				expectedArgs.every((arg, i) => {
					if (arg && typeof arg === "object" && arg._isStringContaining) {
						return typeof callArgs[i] === "string" && callArgs[i].includes(arg.substr);
					}
					return callArgs[i] === arg;
				}),
			);
			assert.ok(
				match,
				`Expected call with ${JSON.stringify(expectedArgs)}, but calls were: ${JSON.stringify(calls)}`,
			);
		},
	};
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Patient Profile Save Autonomy & Non-blocking Guidance", () => {
	const patientsViewPath = path.resolve(__dirname, "../../../PatientsView.tsx");
	const patientsViewSource = fs.readFileSync(patientsViewPath, "utf8");

	it("1. guarantees core save button is NOT hard-disabled by !patientCoreReadyToSave", () => {
		// Verify source code: disabled attribute only guards against concurrent "saving" state
		expect(patientsViewSource).not.toContain("disabled={!patientCoreReadyToSave}");
		expect(patientsViewSource).toContain('disabled={patientCoreSaveState === "saving"}');
		expect(patientsViewSource).toContain('data-testid="patient-core-save-btn"');
	});

	it("2. guarantees administrative save button is NOT hard-disabled by !patientAdministrativeProfileReadyToSave", () => {
		// Verify source code: disabled attribute only guards against concurrent "saving" state
		expect(patientsViewSource).not.toContain("disabled={!patientAdministrativeProfileReadyToSave}");
		expect(patientsViewSource).toContain('disabled={patientAdministrativeProfileSaveState === "saving"}');
		expect(patientsViewSource).toContain('data-testid="patient-admin-save-btn"');
	});

	it("3. executePatientCoreSaveAutonomy handles empty patient safely", async () => {
		const mockToast = vi.fn();
		const mockSave = vi.fn();

		const result = await executePatientCoreSaveAutonomy({
			selectedPatient: null,
			patientCoreNameMissing: false,
			patientCoreDirty: true,
			savePatientCoreProp: mockSave,
			showToastFn: mockToast,
		});

		expect(result.executed).toBe(false);
		expect(result.reason).toBe("no_patient");
		expect(mockToast).toHaveBeenCalledWith("Выберите пациента для сохранения карточки", "warning");
		expect(mockSave).not.toHaveBeenCalled();
	});

	it("4. executePatientCoreSaveAutonomy shows guidance when name is missing instead of dead-ending", async () => {
		const mockToast = vi.fn();
		const mockSave = vi.fn();

		const result = await executePatientCoreSaveAutonomy({
			selectedPatient: { id: "p1", fullName: "" } as any,
			patientCoreNameMissing: true,
			patientCoreDirty: true,
			savePatientCoreProp: mockSave,
			showToastFn: mockToast,
		});

		expect(result.executed).toBe(false);
		expect(result.reason).toBe("missing_name");
		expect(mockToast).toHaveBeenCalledWith("Введите ФИО пациента для сохранения", "warning");
		expect(mockSave).not.toHaveBeenCalled();
	});

	it("5. executePatientCoreSaveAutonomy informs user when data is already up to date (not dirty)", async () => {
		const mockToast = vi.fn();
		const mockSave = vi.fn();

		const result = await executePatientCoreSaveAutonomy({
			selectedPatient: { id: "p1", fullName: "Иванов И.И." } as any,
			patientCoreNameMissing: false,
			patientCoreDirty: false,
			savePatientCoreProp: mockSave,
			showToastFn: mockToast,
		});

		expect(result.executed).toBe(false);
		expect(result.reason).toBe("not_dirty");
		expect(mockToast).toHaveBeenCalledWith("Данные пациента актуальны (нет несохранённых правок)", "info");
		expect(mockSave).not.toHaveBeenCalled();
	});

	it("6. executePatientCoreSaveAutonomy saves and shows success toast when dirty and valid", async () => {
		const mockToast = vi.fn();
		const mockSave = vi.fn().mockResolvedValue(true);

		const result = await executePatientCoreSaveAutonomy({
			selectedPatient: { id: "p1", fullName: "Иванов И.И." } as any,
			patientCoreNameMissing: false,
			patientCoreDirty: true,
			savePatientCoreProp: mockSave,
			showToastFn: mockToast,
		});

		expect(result.executed).toBe(true);
		expect(result.reason).toBe("saved");
		expect(mockSave).toHaveBeenCalled();
		expect(mockToast).toHaveBeenCalledWith("Данные пациента сохранены", "success");
	});

	it("7. executePatientAdministrativeProfileSaveAutonomy executes and informs properly", async () => {
		const mockToast = vi.fn();
		const mockSave = vi.fn().mockResolvedValue(true);

		// Test not dirty
		const resultClean = await executePatientAdministrativeProfileSaveAutonomy({
			selectedPatient: { id: "p1" } as any,
			patientAdministrativeProfileDirty: false,
			patientAdministrativeProfileValidationMessage: null,
			savePatientAdministrativeProfileProp: mockSave,
			showToastFn: mockToast,
		});

		expect(resultClean.executed).toBe(false);
		expect(resultClean.reason).toBe("not_dirty");
		expect(mockToast).toHaveBeenCalledWith("Реквизиты пациента актуальны", "info");

		// Test dirty save
		const resultDirty = await executePatientAdministrativeProfileSaveAutonomy({
			selectedPatient: { id: "p1" } as any,
			patientAdministrativeProfileDirty: true,
			patientAdministrativeProfileValidationMessage: null,
			savePatientAdministrativeProfileProp: mockSave,
			showToastFn: mockToast,
		});

		expect(resultDirty.executed).toBe(true);
		expect(resultDirty.reason).toBe("saved");
		expect(mockSave).toHaveBeenCalled();
		expect(mockToast).toHaveBeenCalledWith("Реквизиты пациента сохранены", "success");
	});

	it("8. action buttons meet desktop touch target standard (minHeight >= 36px)", () => {
		expect(patientsViewSource).toContain('data-testid="patient-core-save-btn"');
		expect(patientsViewSource).toContain('style={{ minHeight: "36px" }}');
		expect(patientsViewSource).toContain('data-testid="patient-admin-save-btn"');
	});
});
