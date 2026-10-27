import assert from "node:assert";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("Red Team Inquisition: Human Clinical Language (Part 2: Labs, Sick Leave, SOAP)", () => {
	it("6. LabOrdersPanel.tsx: orders panel uses human clinical language instead of 'ЗТЛ-1' and 'заказ-наряд'", () => {
		const filePath = path.join(webSrcRoot, "components/patients/LabOrdersPanel.tsx");
		const cardItemPath = path.join(webSrcRoot, "components/patients/LabOrderCardItem.tsx");
		const content = `${fs.readFileSync(filePath, "utf-8")}\n${fs.readFileSync(cardItemPath, "utf-8")}`;

		assert.ok(!content.includes("+ Наряд в ЗТЛ"));
		assert.ok(!content.includes("Печать ЗТЛ-1"));
		assert.ok(!content.includes("Нет оформленных нарядов в зуботехническую лабораторию"));

		assert.ok(content.includes("+ Заказ в лабораторию"));
		assert.ok(content.includes("Печать заказа"));
		assert.ok(content.includes("Нет оформленных заказов в лабораторию"));
	});

	it("7. Clinical and Surgical package modals: checklist items do not contain statutory order codes", () => {
		const clinicalPath = path.join(webSrcRoot, "components/documents/ClinicalVisitPackageModal.tsx");
		const clinicalContent = fs.readFileSync(clinicalPath, "utf-8");

		assert.ok(!clinicalContent.includes("Приказ Минздрава России от 15.12.2014 № 834н"));
		assert.ok(!clinicalContent.includes("Приказ Минздрава России от 24.11.2021 № 1094н"));

		const surgicalPath = path.join(webSrcRoot, "components/documents/SurgicalPackageModal.tsx");
		const surgicalContent = fs.readFileSync(surgicalPath, "utf-8");

		assert.ok(!surgicalContent.includes("Приказ Минздрава России от 15.12.2014 № 834н"));
		assert.ok(!surgicalContent.includes("Приказ Минздрава России от 24.11.2021 № 1094н"));
	});

	it("8. SickLeaveElnModal.tsx: commissions and toasts free of Order 1089n and raw 043/у", () => {
		const filePath = path.join(webSrcRoot, "components/documents/sickLeave/SickLeaveElnModal.tsx");
		let content = fs.readFileSync(filePath, "utf-8");
		const vkPath = path.join(webSrcRoot, "components/documents/sickLeave/elnModal/ElnVkProtocolSection.tsx");
		if (fs.existsSync(vkPath)) {
			content += "\n" + fs.readFileSync(vkPath, "utf-8");
		}
		const logicPath = path.join(webSrcRoot, "components/documents/sickLeave/elnModal/useSickLeaveElnLogic.ts");
		if (fs.existsSync(logicPath)) {
			content += "\n" + fs.readFileSync(logicPath, "utf-8");
		}

		assert.ok(!content.includes("по Приказу Минздрава РФ № 1089н"));
		assert.ok(!content.includes("В дневник 043/у"));
		assert.ok(!content.includes("Копировать в карту 043/у"));
		assert.ok(content.includes("Заседание врачебной комиссии (ВК)"));
		assert.ok(content.includes("В дневник приёма вставлен черновик ЭЛН"));
	});

	it("9. VisitDiarySoapFields.tsx: Section II uses human Russian without Status Localis", () => {
		const filePath = path.join(webSrcRoot, "components/visit/diary/VisitDiarySoapFields.tsx");
		let content = fs.readFileSync(filePath, "utf-8");
		const objectivePath = path.join(webSrcRoot, "components/visit/diary/fields/VisitDiaryObjectiveField.tsx");
		if (fs.existsSync(objectivePath)) {
			content += "\n" + fs.readFileSync(objectivePath, "utf-8");
		}

		assert.ok(!content.includes("Объективно (Status Localis)"));
		assert.ok(!content.includes("(morbi) и жизни (vitae)"));
		assert.ok(content.includes("Осмотр и зубная формула"));
	});

	it("10. EmrProtocolSoapPanels.tsx & Form043TabSections.tsx: free of Latin SOAP markers", () => {
		const panelsPath = path.join(webSrcRoot, "components/emr/protocolGenerator/EmrProtocolSoapPanels.tsx");
		const panelsContent = fs.readFileSync(panelsPath, "utf-8");

		assert.ok(!panelsContent.includes("Status Localis"));
		assert.ok(!panelsContent.includes("S (Subjective)"));

		const form043Path = path.join(webSrcRoot, "components/emr/Form043TabSections.tsx");
		const form043Content = fs.readFileSync(form043Path, "utf-8");

		assert.ok(!form043Content.includes("Anamnesis vitae et morbi"));
		assert.ok(!form043Content.includes("Anamnesis morbi)"));
		assert.ok(!form043Content.includes("Anamnesis vitae)"));
	});
});
