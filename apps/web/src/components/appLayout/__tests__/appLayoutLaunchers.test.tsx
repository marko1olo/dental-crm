import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderSpecializedClinicalLaunchers } from "../modalsContainerModules/standalone/SpecializedClinicalLaunchers";
import { renderSpecializedAdministrativeLaunchers } from "../modalsContainerModules/standalone/SpecializedAdministrativeLaunchers";

describe("Specialized Launchers Unit Tests", () => {
	it("renderSpecializedClinicalLaunchers executes cleanly in default route", () => {
		const result = renderSpecializedClinicalLaunchers({
			patientId: "pat-1",
			patientName: "Иванов И. И.",
			activeCardTab: "anamnesis",
			setActiveCardTab: () => {},
		});
		assert.equal(result, null);
	});

	it("renderSpecializedAdministrativeLaunchers executes cleanly in default route", () => {
		const result = renderSpecializedAdministrativeLaunchers({
			patientId: "pat-1",
			patientName: "Иванов И. И.",
			isSbpDirectModalOpen: false,
			setIsSbpDirectModalOpen: () => {},
		});
		assert.equal(result, null);
	});
});
