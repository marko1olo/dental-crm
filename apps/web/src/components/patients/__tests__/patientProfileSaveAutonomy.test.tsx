import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { executePatientCoreSaveAutonomy } from "../patientAutonomyActions.js";
import { expect, vi } from "./autonomyTestHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Patient Profile Save Autonomy & Non-blocking Guidance", () => {
	const patientsViewPath = path.resolve(__dirname, "../../../PatientsView.tsx");
	const patientsViewSource = fs.readFileSync(patientsViewPath, "utf8");

	it("1. guarantees core save button is NOT hard-disabled by !patientCoreReadyToSave", () => {
		expect(patientsViewSource).not.toContain("disabled={!patientCoreReadyToSave}");
		expect(patientsViewSource).toContain('disabled={patientCoreSaveState === "saving"}');
		expect(patientsViewSource).toContain('data-testid="patient-core-save-btn"');
	});

	it("2. guarantees administrative save button is NOT hard-disabled by !patientAdministrativeProfileReadyToSave", () => {
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
});
