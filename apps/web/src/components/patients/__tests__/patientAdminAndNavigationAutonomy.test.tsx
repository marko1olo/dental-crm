import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	executeBookPatientAppointmentAutonomy,
	executeOpenPatientVisitAutonomy,
	executePatientAdministrativeProfileSaveAutonomy,
} from "../patientAutonomyActions.js";
import { expect, vi } from "./autonomyTestHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Patient Administrative Save & Navigation Autonomy", () => {
	const patientsViewPath = path.resolve(__dirname, "../../../PatientsView.tsx");
	const patientsViewSource = fs.readFileSync(patientsViewPath, "utf8");

	it("7. executePatientAdministrativeProfileSaveAutonomy executes and informs properly", async () => {
		const mockToast = vi.fn();
		const mockSave = vi.fn().mockResolvedValue(true);

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

	it("9. guarantees patient-card-open-visit-btn and patient-card-book-appointment-btn are NOT hard-disabled", () => {
		expect(patientsViewSource).not.toContain('disabled={!selectedPatient}');
		expect(patientsViewSource).toContain('data-testid="patient-card-open-visit-btn"');
		expect(patientsViewSource).toContain('data-testid="patient-card-book-appointment-btn"');
	});

	it("10. executeOpenPatientVisitAutonomy shows guidance toast when patient is not selected and opens visit when selected", () => {
		const mockToast = vi.fn();
		const mockSetPatientId = vi.fn();
		const mockSetCurrentView = vi.fn();

		const resNoPatient = executeOpenPatientVisitAutonomy({
			selectedPatient: null,
			setSelectedPatientId: mockSetPatientId,
			setCurrentView: mockSetCurrentView,
			showToastFn: mockToast,
		});
		expect(resNoPatient.executed).toBe(false);
		expect(resNoPatient.reason).toBe("no_patient");
		expect(mockToast).toHaveBeenCalledWith("Выберите пациента из списка слева для открытия приёма", "info");
		expect(mockSetPatientId).not.toHaveBeenCalled();
		expect(mockSetCurrentView).not.toHaveBeenCalled();

		const resWithPatient = executeOpenPatientVisitAutonomy({
			selectedPatient: { id: "pat-123", fullName: "Смирнов Алексей Владимирович" } as any,
			setSelectedPatientId: mockSetPatientId,
			setCurrentView: mockSetCurrentView,
			showToastFn: mockToast,
		});
		expect(resWithPatient.executed).toBe(true);
		expect(resWithPatient.reason).toBe("visit_opened");
		expect(mockSetPatientId).toHaveBeenCalledWith("pat-123");
		expect(mockSetCurrentView).toHaveBeenCalledWith("visit");
		expect(mockToast).toHaveBeenCalledWith("Открыт приём: Смирнов Алексей Владимирович", "success");
	});

	it("11. executeBookPatientAppointmentAutonomy shows guidance toast when patient is not selected and drafts appointment when selected", () => {
		const mockToast = vi.fn();
		const mockSetDraft = vi.fn();
		const mockSetCurrentView = vi.fn();

		const resNoPatient = executeBookPatientAppointmentAutonomy({
			selectedPatient: null,
			setNewAppointmentDraft: mockSetDraft,
			setCurrentView: mockSetCurrentView,
			showToastFn: mockToast,
		});
		expect(resNoPatient.executed).toBe(false);
		expect(resNoPatient.reason).toBe("no_patient");
		expect(mockToast).toHaveBeenCalledWith("Выберите пациента из списка слева для записи в расписание", "info");
		expect(mockSetDraft).not.toHaveBeenCalled();
		expect(mockSetCurrentView).not.toHaveBeenCalled();

		const resWithPatient = executeBookPatientAppointmentAutonomy({
			selectedPatient: { id: "pat-456", fullName: "Кузнецова Елена Павловна" } as any,
			setNewAppointmentDraft: mockSetDraft,
			setCurrentView: mockSetCurrentView,
			showToastFn: mockToast,
		});
		expect(resWithPatient.executed).toBe(true);
		expect(resWithPatient.reason).toBe("appointment_drafted");
		expect(mockSetDraft).toHaveBeenCalled();
		expect(mockSetCurrentView).toHaveBeenCalledWith("schedule");
		expect(mockToast).toHaveBeenCalledWith("Пациент Кузнецова Елена Павловна выбран для записи в расписание", "success");
	});
});
