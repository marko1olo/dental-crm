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

	it("2. RecordNewDiaryInlineForm.tsx & RecordDiariesTab.tsx: SOAP labels use natural Russian instead of Latin and academic jargon", () => {
		const inlineFormPath = path.join(webSrcRoot, "components/emr/record/tabs/RecordNewDiaryInlineForm.tsx");
		const diariesTabPath = path.join(webSrcRoot, "components/emr/record/tabs/RecordDiariesTab.tsx");
		const content = `${fs.readFileSync(inlineFormPath, "utf-8")}\n${fs.readFileSync(diariesTabPath, "utf-8")}`;

		assert.ok(!content.includes("Subjective / Complaints"));
		assert.ok(!content.includes("Objective / Status Localis"));
		assert.ok(!content.includes("(Anamnesis)"));
		assert.ok(!content.includes("Plan / Treatment Protocol"));

		assert.ok(content.includes("S (Жалобы)"));
		assert.ok(content.includes("A (Диагноз)"));
		assert.ok(content.includes("P (Протокол лечения и манипуляции)") || content.includes("P (Лечение)"));
		assert.ok(content.includes("Дневники визитов (Медицинская карта приёма)"));
		assert.ok(content.includes("Интактный ряд") || content.includes("Интактные зубы") || content.includes("Физиологическая норма"));
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
		const bannerPath = path.join(webSrcRoot, "components/patients/tabs/generalInfo/PatientSafetyBannerFull.tsx");
		const content = `${fs.readFileSync(filePath, "utf-8")}\n${fs.existsSync(bannerPath) ? fs.readFileSync(bannerPath, "utf-8") : ""}`;

		assert.ok(!content.includes("Anamnesis Vitae"));
		assert.ok(content.includes("Соматический анамнез:"));
	});
});
