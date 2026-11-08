import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrc = path.resolve(__dirname, "..");

describe("AppModalsContainer and PatientCard Decomposition Suite", () => {
	it("1. AppModalsContainer is decomposed according to /decomposer skill standards", () => {
		const facadePath = path.join(webSrc, "components/appLayout/AppModalsContainer.tsx");
		const typesPath = path.join(webSrc, "components/appLayout/modalsContainerModules/modalsContainerTypes.ts");
		const clinicalPath = path.join(webSrc, "components/appLayout/modalsContainerModules/ClinicalModalsSubcontainer.tsx");
		const adminPath = path.join(webSrc, "components/appLayout/modalsContainerModules/AdministrativeModalsSubcontainer.tsx");
		const launchersPath = path.join(webSrc, "components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx");

		assert.ok(fs.existsSync(facadePath), "AppModalsContainer facade must exist");
		assert.ok(fs.existsSync(typesPath), "modalsContainerTypes must exist");
		assert.ok(fs.existsSync(clinicalPath), "ClinicalModalsSubcontainer must exist");
		assert.ok(fs.existsSync(adminPath), "AdministrativeModalsSubcontainer must exist");
		assert.ok(fs.existsSync(launchersPath), "StandaloneLaunchers must exist");

		const facadeLines = fs.readFileSync(facadePath, "utf8").split("\n").length;
		const typesLines = fs.readFileSync(typesPath, "utf8").split("\n").length;
		const clinicalLines = fs.readFileSync(clinicalPath, "utf8").split("\n").length;
		const adminLines = fs.readFileSync(adminPath, "utf8").split("\n").length;
		const launchersLines = fs.readFileSync(launchersPath, "utf8").split("\n").length;

		assert.ok(facadeLines <= 250, `AppModalsContainer facade must be <= 250 lines, was ${facadeLines}`);
		assert.ok(typesLines <= 500, `modalsContainerTypes must be <= 500 lines, was ${typesLines}`);
		assert.ok(clinicalLines <= 500, `ClinicalModalsSubcontainer must be <= 500 lines, was ${clinicalLines}`);
		assert.ok(adminLines <= 500, `AdministrativeModalsSubcontainer must be <= 500 lines, was ${adminLines}`);
		assert.ok(launchersLines <= 500, `StandaloneLaunchers must be <= 500 lines, was ${launchersLines}`);

		const facadeContent = fs.readFileSync(facadePath, "utf8");
		assert.ok(facadeContent.includes("renderStandaloneLaunchers"), "Facade must export renderStandaloneLaunchers");
		assert.ok(facadeContent.includes("ClinicalModalsSubcontainer"), "Facade must coordinate ClinicalModalsSubcontainer");
		assert.ok(facadeContent.includes("AdministrativeModalsSubcontainer"), "Facade must coordinate AdministrativeModalsSubcontainer");
	});

	it("2. PatientCardModal is canonical SSOT decomposed according to /decomposer standards", () => {
		const facadePath = path.join(webSrc, "components/patients/PatientCardModal.tsx");
		const typesPath = path.join(webSrc, "components/patients/patientCardModalModules/patientCardModalTypes.ts");
		const subModalsPath = path.join(webSrc, "components/patients/patientCardModalModules/PatientCardModalSubModals.tsx");
		const statePath = path.join(webSrc, "components/patients/patientCardModalModules/usePatientCardModalState.ts");

		assert.ok(fs.existsSync(facadePath), "PatientCardModal facade must exist");
		assert.ok(fs.existsSync(typesPath), "patientCardModalTypes must exist");
		assert.ok(fs.existsSync(subModalsPath), "PatientCardModalSubModals must exist");
		assert.ok(fs.existsSync(statePath), "usePatientCardModalState must exist");

		const facadeLines = fs.readFileSync(facadePath, "utf8").split("\n").length;
		const typesLines = fs.readFileSync(typesPath, "utf8").split("\n").length;
		const subModalsLines = fs.readFileSync(subModalsPath, "utf8").split("\n").length;
		const stateLines = fs.readFileSync(statePath, "utf8").split("\n").length;

		assert.ok(facadeLines <= 650, `PatientCardModal facade must be <= 650 lines, was ${facadeLines}`);
		assert.ok(typesLines <= 500, `patientCardModalTypes must be <= 500 lines, was ${typesLines}`);
		assert.ok(subModalsLines <= 500, `PatientCardModalSubModals must be <= 500 lines, was ${subModalsLines}`);
		assert.ok(stateLines <= 500, `usePatientCardModalState must be <= 500 lines, was ${stateLines}`);

		const facadeContent = fs.readFileSync(facadePath, "utf8");
		assert.ok(facadeContent.includes("PatientCardModalSubModals"), "Facade must coordinate PatientCardModalSubModals");
		assert.ok(facadeContent.includes("usePatientCardModalState"), "Facade must coordinate usePatientCardModalState");
	});

	it("3. Whitelist check: target files are excluded from whitelist", () => {
		const rootDir = path.resolve(webSrc, "../../..");
		const whitelistPath = path.join(rootDir, "scripts/file_limits_whitelist.json");
		const whitelist = JSON.parse(fs.readFileSync(whitelistPath, "utf8"));

		assert.strictEqual(
			whitelist["apps/web/src/components/appLayout/AppModalsContainer.tsx"],
			undefined,
			"AppModalsContainer must not be in whitelist",
		);
		assert.strictEqual(
			whitelist["apps/web/src/components/patients/PatientCard.tsx"],
			undefined,
			"Legacy PatientCard must not be in whitelist",
		);
	});
});
