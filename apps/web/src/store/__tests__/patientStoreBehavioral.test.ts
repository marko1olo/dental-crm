/**
 * apps/web/src/store/__tests__/patientStoreBehavioral.test.ts
 *
 * Behavioral unit test suite for PatientStore (Zustand).
 * Verifies patient selection, cross-store reset of visit/odontogram (Mandate 8e),
 * core draft editing, administrative profile draft, and express patient registration.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { usePatientStore } from "../patientStore";
import { useVisitStore } from "../visitStore";

describe("PatientStore Behavioral Tests — Cross-Store Synchronization & Drafts", () => {
	beforeEach(() => {
		const s = usePatientStore.getState();
		s.setSelectedPatientId(null);
		s.setPatientCoreDirty(false);
		s.setNewPatientName("");
		s.setNewPatientPhone("");
		s.setNewPatientBirthDate("");
		s.setIsPatientCreating(false);
		useVisitStore.getState().resetVisitToothState();
		useVisitStore.getState().setCompletedServices([]);
	});

	it("1. changing selectedPatientId resets visit tooth states and completed services in visitStore", () => {
		// Setup visit state for patient A
		usePatientStore.getState().setSelectedPatientId("patient-alpha");
		useVisitStore.getState().setToothState("16", "caries");
		useVisitStore.getState().addCompletedService({
			serviceId: "srv-caries",
			title: "Лечение кариеса",
			price: 3500,
		});

		assert.equal(useVisitStore.getState().visitToothStateByCode["16"], "caries");
		assert.equal(useVisitStore.getState().completedServices.length, 1);

		// Switch to patient B -> visitStore MUST be reset cleanly to prevent cross-patient contamination
		usePatientStore.getState().setSelectedPatientId("patient-beta");

		assert.equal(usePatientStore.getState().selectedPatientId, "patient-beta");
		assert.equal(useVisitStore.getState().visitToothStateByCode["16"], undefined);
		assert.equal(useVisitStore.getState().completedServices.length, 0);
	});

	it("2. updates patient core draft and dirty state", () => {
		const store = usePatientStore.getState();
		assert.equal(store.patientCoreDirty, false);

		store.setPatientCoreDraft((prev) => ({
			...prev,
			fullName: "Кузнецов Иван Сергеевич",
			phone: "+7 (999) 123-45-67",
			birthDate: "1985-06-15",
		}));
		store.setPatientCoreDirty(true);
		store.setPatientCoreSaveState("saving");

		const updated = usePatientStore.getState();
		assert.equal(updated.patientCoreDraft.fullName, "Кузнецов Иван Сергеевич");
		assert.equal(updated.patientCoreDraft.phone, "+7 (999) 123-45-67");
		assert.equal(updated.patientCoreDraft.birthDate, "1985-06-15");
		assert.equal(updated.patientCoreDirty, true);
		assert.equal(updated.patientCoreSaveState, "saving");
	});

	it("3. updates administrative profile draft and save state", () => {
		const store = usePatientStore.getState();

		store.setPatientAdministrativeProfileDraft((prev) => ({
			...prev,
			representativeFullName: "Кузнецова Анна Павловна",
			passportSeries: "4510",
		}));
		store.setPatientAdministrativeProfileDirty(true);
		store.setPatientAdministrativeProfileSaveState("saved");

		const updated = usePatientStore.getState();
		assert.equal(
			updated.patientAdministrativeProfileDraft.representativeFullName,
			"Кузнецова Анна Павловна",
		);
		assert.equal(updated.patientAdministrativeProfileDirty, true);
		assert.equal(updated.patientAdministrativeProfileSaveState, "saved");
	});

	it("4. handles express new patient quick entry fields", () => {
		const store = usePatientStore.getState();

		store.setNewPatientName("Соколова Мария Петровна");
		store.setNewPatientPhone("+7 (916) 555-44-33");
		store.setNewPatientBirthDate("1992-11-20");
		store.setIsPatientCreating(true);

		const updated = usePatientStore.getState();
		assert.equal(updated.newPatientName, "Соколова Мария Петровна");
		assert.equal(updated.newPatientPhone, "+7 (916) 555-44-33");
		assert.equal(updated.newPatientBirthDate, "1992-11-20");
		assert.equal(updated.isPatientCreating, true);
	});
});
