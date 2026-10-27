import assert from "node:assert";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("Red Team Inquisition: Human Clinical Language (Part 1: Visits, Forms, Tabs)", () => {
	it("1. PatientsView.tsx: visit open toast does NOT contain bureaucratic '043/у'", () => {
		const filePath = path.join(webSrcRoot, "PatientsView.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("открытия приёма 043/у"));
		assert.ok(!content.includes("Открыт приём 043/у:"));
		assert.ok(
			content.includes("Выберите пациента из списка слева для открытия приёма") ||
				content.includes("Выберите пациента из списка слева для начала приёма"),
		);
		assert.ok(content.includes("Открыт приём: ${selectedPatient.fullName}"));
	});

	it("2. VisitSoapEditor.tsx: SOAP labels use natural Russian instead of Latin and academic jargon", () => {
		const filePath = path.join(webSrcRoot, "components/visit/VisitSoapEditor.tsx");
		const soapEditorDir = path.join(webSrcRoot, "components/visit/soapEditor");
		const soapEditorSource = fs.existsSync(soapEditorDir)
			? fs.readdirSync(soapEditorDir).map((f) => fs.readFileSync(path.join(soapEditorDir, f), "utf-8")).join("\n")
			: "";
		const content = fs.readFileSync(filePath, "utf-8") + "\n" + soapEditorSource;

		assert.ok(!content.includes("Subjective / Complaints"));
		assert.ok(!content.includes("Objective / Status Localis"));
		assert.ok(!content.includes("(Anamnesis)"));
		assert.ok(!content.includes("Plan / Treatment Protocol"));

		assert.ok(content.includes("Анамнез и противопоказания"));
		assert.ok(content.includes("Осмотр и зубная формула"));
		assert.ok(content.includes("Диагноз (МКБ-10)"));
		assert.ok(content.includes("Протокол лечения"));
		assert.ok(content.includes("Рекомендации и назначения"));
	});

	it("3. VisitSummaryDiarySections.tsx: Section II uses human clinical Russian without Status Localis", () => {
		const filePath = path.join(webSrcRoot, "components/visit/VisitSummaryDiarySections.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("Status Localis"));
		assert.ok(content.includes("— Осмотр и зубная формула"));
	});

	it("4. DentalMedicalCard043uForm.tsx: form headers and fields do not contain Latin Anamnesis Morbi/Vitae", () => {
		const filePath = path.join(webSrcRoot, "components/documents/forms/DentalMedicalCard043uForm.tsx");
		const anamnesisPath = path.join(webSrcRoot, "components/documents/forms/DentalMedicalCardAnamnesisTab.tsx");
		const content = `${fs.readFileSync(filePath, "utf-8")}\n${fs.readFileSync(anamnesisPath, "utf-8")}`;

		assert.ok(!content.includes("Anamnesis Morbi"));
		assert.ok(!content.includes("Anamnesis Vitae"));
		assert.ok(content.includes("История настоящего заболевания:"));
		assert.ok(content.includes("Анамнез жизни и соматический статус"));
	});

	it("5. PatientGeneralInfoTab.tsx: somatic notes label is clean and free of Latin", () => {
		const filePath = path.join(webSrcRoot, "components/patients/tabs/PatientGeneralInfoTab.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("Anamnesis Vitae"));
		assert.ok(content.includes("Соматический анамнез:"));
	});
});
