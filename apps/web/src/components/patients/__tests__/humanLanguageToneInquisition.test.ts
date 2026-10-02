import assert from "node:assert";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("Red Team Inquisition: Human Clinical Language vs Bureaucratic Bloat", () => {
	it("1. PatientsView.tsx: visit open toast does NOT contain bureaucratic '043/у'", () => {
		const filePath = path.join(webSrcRoot, "PatientsView.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			!content.includes("открытия приёма 043/у"),
			"PatientsView must not mention 'открытия приёма 043/у' in guidance toast",
		);
		assert.ok(
			!content.includes("Открыт приём 043/у:"),
			"PatientsView must not mention 'Открыт приём 043/у:' in success toast",
		);
		assert.ok(
			content.includes("Выберите пациента из списка слева для открытия приёма"),
			"PatientsView must use natural guidance toast without bureaucratic codes",
		);
		assert.ok(
			content.includes("Открыт приём: ${selectedPatient.fullName}"),
			"PatientsView must use clean 'Открыт приём: ...' toast",
		);
	});

	it("2. VisitSoapEditor.tsx: SOAP labels use natural Russian instead of Latin and academic jargon", () => {
		const filePath = path.join(webSrcRoot, "components/visit/VisitSoapEditor.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		// Latin and English bloat banned from labels
		assert.ok(
			!content.includes("Subjective / Complaints"),
			"VisitSoapEditor must not use 'Subjective / Complaints'",
		);
		assert.ok(
			!content.includes("Objective / Status Localis"),
			"VisitSoapEditor must not use 'Objective / Status Localis'",
		);
		assert.ok(
			!content.includes("(Anamnesis)"),
			"VisitSoapEditor must not use '(Anamnesis)'",
		);
		assert.ok(
			!content.includes("Plan / Treatment Protocol"),
			"VisitSoapEditor must not use 'Plan / Treatment Protocol'",
		);

		// Natural clinical Russian present
		assert.ok(content.includes("Анамнез и противопоказания"));
		assert.ok(content.includes("Осмотр и зубная формула"));
		assert.ok(content.includes("Диагноз (МКБ-10)"));
		assert.ok(content.includes("Протокол лечения"));
		assert.ok(content.includes("Рекомендации и назначения"));
	});

	it("3. VisitSummaryDiarySections.tsx: Section II uses human clinical Russian without Status Localis", () => {
		const filePath = path.join(webSrcRoot, "components/visit/VisitSummaryDiarySections.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			!content.includes("Status Localis"),
			"VisitSummaryDiarySections must not display 'Status Localis'",
		);
		assert.ok(
			content.includes("— Осмотр и зубная формула"),
			"VisitSummaryDiarySections must use '— Осмотр и зубная формула'",
		);
	});

	it("4. DentalMedicalCard043uForm.tsx: form headers and fields do not contain Latin Anamnesis Morbi/Vitae", () => {
		const filePath = path.join(webSrcRoot, "components/documents/forms/DentalMedicalCard043uForm.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			!content.includes("Anamnesis Morbi"),
			"DentalMedicalCard043uForm must not display 'Anamnesis Morbi'",
		);
		assert.ok(
			!content.includes("Anamnesis Vitae"),
			"DentalMedicalCard043uForm must not display 'Anamnesis Vitae'",
		);
		assert.ok(content.includes("История настоящего заболевания:"));
		assert.ok(content.includes("Анамнез жизни и соматический статус"));
	});

	it("5. PatientGeneralInfoTab.tsx: somatic notes label is clean and free of Latin", () => {
		const filePath = path.join(webSrcRoot, "components/patients/tabs/PatientGeneralInfoTab.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			!content.includes("Anamnesis Vitae"),
			"PatientGeneralInfoTab must not display 'Anamnesis Vitae'",
		);
		assert.ok(content.includes("Соматический анамнез:"));
	});

	it("6. LabOrdersPanel.tsx: orders panel uses human clinical language instead of 'ЗТЛ-1' and 'заказ-наряд'", () => {
		const filePath = path.join(webSrcRoot, "components/patients/LabOrdersPanel.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			!content.includes("+ Наряд в ЗТЛ"),
			"LabOrdersPanel must not use '+ Наряд в ЗТЛ'",
		);
		assert.ok(
			!content.includes("Печать ЗТЛ-1"),
			"LabOrdersPanel must not use 'Печать ЗТЛ-1'",
		);
		assert.ok(
			!content.includes("Нет оформленных нарядов в зуботехническую лабораторию"),
			"LabOrdersPanel must not use bureaucratic empty state title",
		);

		assert.ok(content.includes("+ Заказ в лабораторию"));
		assert.ok(content.includes("Печать заказа"));
		assert.ok(content.includes("Нет оформленных заказов в лабораторию"));
	});

	it("7. Clinical and Surgical package modals: checklist items do not contain statutory order codes", () => {
		const clinicalPath = path.join(webSrcRoot, "components/documents/ClinicalVisitPackageModal.tsx");
		const clinicalContent = fs.readFileSync(clinicalPath, "utf-8");

		assert.ok(
			!clinicalContent.includes("Приказ Минздрава России от 15.12.2014 № 834н"),
			"ClinicalVisitPackageModal must not show statutory Order 834n in interactive checklist",
		);
		assert.ok(
			!clinicalContent.includes("Приказ Минздрава России от 24.11.2021 № 1094н"),
			"ClinicalVisitPackageModal must not show statutory Order 1094n in interactive checklist",
		);

		const surgicalPath = path.join(webSrcRoot, "components/documents/SurgicalPackageModal.tsx");
		const surgicalContent = fs.readFileSync(surgicalPath, "utf-8");

		assert.ok(
			!surgicalContent.includes("Приказ Минздрава России от 15.12.2014 № 834н"),
			"SurgicalPackageModal must not show statutory Order 834n in interactive checklist",
		);
		assert.ok(
			!surgicalContent.includes("Приказ Минздрава России от 24.11.2021 № 1094н"),
			"SurgicalPackageModal must not show statutory Order 1094n in interactive checklist",
		);
	});

	it("8. SickLeaveElnModal.tsx: commissions and toasts free of Order 1089n and raw 043/у", () => {
		const filePath = path.join(webSrcRoot, "components/documents/sickLeave/SickLeaveElnModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			!content.includes("по Приказу Минздрава РФ № 1089н"),
			"SickLeaveElnModal must not display 'по Приказу Минздрава РФ № 1089н' in section title",
		);
		assert.ok(
			!content.includes("В дневник 043/у"),
			"SickLeaveElnModal must not refer to '043/у' in toast notifications",
		);
		assert.ok(
			!content.includes("Копировать в карту 043/у"),
			"SickLeaveElnModal must not have 'Копировать в карту 043/у' button text",
		);
		assert.ok(content.includes("Заседание врачебной комиссии (ВК)"));
		assert.ok(content.includes("В дневник приёма вставлен черновик ЭЛН"));
	});

	it("9. VisitDiarySoapFields.tsx: Section II uses human Russian without Status Localis", () => {
		const filePath = path.join(webSrcRoot, "components/visit/diary/VisitDiarySoapFields.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(
			!content.includes("Объективно (Status Localis)"),
			"VisitDiarySoapFields must not display 'Объективно (Status Localis)'",
		);
		assert.ok(
			!content.includes("(morbi) и жизни (vitae)"),
			"VisitDiarySoapFields placeholder must not contain '(morbi) и жизни (vitae)'",
		);
		assert.ok(
			content.includes("Осмотр и зубная формула"),
			"VisitDiarySoapFields must use 'Осмотр и зубная формула'",
		);
	});

	it("10. EmrProtocolSoapPanels.tsx & Form043TabSections.tsx: free of Latin SOAP markers", () => {
		const panelsPath = path.join(webSrcRoot, "components/emr/protocolGenerator/EmrProtocolSoapPanels.tsx");
		const panelsContent = fs.readFileSync(panelsPath, "utf-8");

		assert.ok(
			!panelsContent.includes("Status Localis"),
			"EmrProtocolSoapPanels must not contain 'Status Localis'",
		);
		assert.ok(
			!panelsContent.includes("S (Subjective)"),
			"EmrProtocolSoapPanels must not contain 'S (Subjective)'",
		);

		const form043Path = path.join(webSrcRoot, "components/emr/Form043TabSections.tsx");
		const form043Content = fs.readFileSync(form043Path, "utf-8");

		assert.ok(
			!form043Content.includes("Anamnesis vitae et morbi"),
			"Form043TabSections must not contain 'Anamnesis vitae et morbi'",
		);
		assert.ok(
			!form043Content.includes("Anamnesis morbi)"),
			"Form043TabSections must not contain 'Anamnesis morbi)'",
		);
		assert.ok(
			!form043Content.includes("Anamnesis vitae)"),
			"Form043TabSections must not contain 'Anamnesis vitae)'",
		);
	});
});
