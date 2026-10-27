import assert from "node:assert";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("Red Team Inquisition: Human Clinical Language (Part 4: EMR, Protocols, Consents)", () => {
	it("16. Form043PrintModal.tsx: export options use human language instead of 'ЕГИСЗ СЭМД'", () => {
		const filePath = path.join(webSrcRoot, "components/emr/Form043PrintModal.tsx");
		const recordDir = path.join(webSrcRoot, "components/emr/record");
		const content = [
			fs.readFileSync(filePath, "utf-8"),
			...(fs.existsSync(recordDir)
				? fs.readdirSync(recordDir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts")).map((f) => fs.readFileSync(path.join(recordDir, f), "utf8"))
				: []),
		].join("\n");
		assert.ok(!content.includes("<span>ЕГИСЗ СЭМД (XML)</span>"));
		assert.ok(!content.includes("HL7 CDA R2 XML для ЕГИСЗ (СЭМД 834н)"));
		assert.ok(content.includes("<span>Электронная медкарта (XML)</span>"));
		assert.ok(content.includes("Экспорт в XML для электронной медкарты (Госуслуги)"));
	});

	it("17. PatientCreationModal.tsx & patientFieldRequirementsConfig.ts: SNILS hints free of raw ЕГИСЗ/РЭМД", () => {
		const modalPath = path.join(webSrcRoot, "components/patients/PatientCreationModal.tsx");
		const modalContent = fs.readFileSync(modalPath, "utf-8");
		assert.ok(!modalContent.includes("* (ЕГИСЗ)"));
		assert.ok(!modalContent.includes("в ЕГИСЗ (РЭМД)"));
		assert.ok(modalContent.includes("* (для Госуслуг)"));
		assert.ok(modalContent.includes("медкарты и Госуслуг"));

		const configPath = path.join(webSrcRoot, "components/patients/patientFieldRequirementsConfig.ts");
		const configContent = fs.readFileSync(configPath, "utf-8");
		assert.ok(!configContent.includes("СНИЛС обязателен для передачи данных в ЕГИСЗ (РЭМД)"));
		assert.ok(configContent.includes("СНИЛС обязателен для электронной медкарты и Госуслуг"));
	});

	it("18. VisitView.tsx, VisitEmkTab.tsx, VisitSoapEditor.tsx: treatment plan defaults free of bare 'Санация'", () => {
		const visitViewPath = path.join(webSrcRoot, "VisitView.tsx");
		const headerModulesDir = path.join(webSrcRoot, "components/visit/view/visitHeaderModules");
		const headerModulesSource = fs.existsSync(headerModulesDir)
			? fs.readdirSync(headerModulesDir).map((f) => fs.readFileSync(path.join(headerModulesDir, f), "utf-8")).join("\n")
			: "";
		const visitViewContent =
			fs.readFileSync(visitViewPath, "utf-8") +
			"\n" +
			fs.readFileSync(path.join(webSrcRoot, "components/visit/view/VisitViewHeader.tsx"), "utf-8") +
			"\n" +
			headerModulesSource;
		assert.ok(!visitViewContent.includes("патологий не выявлено. Санация."));
		assert.ok(visitViewContent.includes("Полость рта здорова, гигиена удовлетворительная."));

		const emkPath = path.join(webSrcRoot, "components/visit/VisitEmkTab.tsx");
		const emkContent =
			fs.readFileSync(emkPath, "utf-8") +
			"\n" +
			fs.readFileSync(path.join(webSrcRoot, "components/visit/emkTabModules/useVisitEmkTabController.ts"), "utf-8");
		assert.ok(!emkContent.includes("санация полости рта. Обучение гигиене."));
		assert.ok(!emkContent.includes('treatmentPlan || "Санация полости рта"'));
		assert.ok(emkContent.includes("Проведена профессиональная гигиена и профилактика."));

		const soapPath = path.join(webSrcRoot, "components/visit/VisitSoapEditor.tsx");
		const soapEditorDir = path.join(webSrcRoot, "components/visit/soapEditor");
		const soapEditorFiles = fs.existsSync(soapEditorDir)
			? fs.readdirSync(soapEditorDir).map((f) => fs.readFileSync(path.join(soapEditorDir, f), "utf-8")).join("\n")
			: "";
		const soapContent = fs.readFileSync(soapPath, "utf-8") + "\n" + soapEditorFiles;
		assert.ok(!soapContent.includes('values.treatmentPlan || "Санация"'));
		assert.ok(soapContent.includes('values.treatmentPlan || "Лечение и гигиена"'));
	});

	it("19. clinicalProtocols.ts: memo badges and presets use clinical protocol language instead of 043/у", () => {
		const filePath = path.join(webSrcRoot, "lib/clinicalProtocols.ts");
		const memoPath = path.join(webSrcRoot, "lib/protocols/patientMemosAndPhoto.ts");
		const perioPath = path.join(webSrcRoot, "lib/protocols/perioAndHygieneProtocols.ts");
		const content = `${fs.readFileSync(filePath, "utf-8")}\n${fs.readFileSync(memoPath, "utf-8")}\n${fs.readFileSync(perioPath, "utf-8")}`;
		assert.ok(!content.includes('badge: "Хирургия 043/у"'));
		assert.ok(!content.includes('badge: "Терапия 043/у"'));
		assert.ok(!content.includes('badge: "Эндодонтия 043/у"'));
		assert.ok(content.includes('badge: "Хирургический протокол"'));
		assert.ok(content.includes('badge: "Терапевтический протокол"'));
		assert.ok(content.includes('badge: "Эндодонтический протокол"'));
		assert.ok(content.includes("Полное лечение и гигиена. Плановый профосмотр через 6 месяцев."));
	});

	it("20. Consent1ClickBatchBanner.tsx & useVisitConsentsLogic.ts: user-facing strings use 'согласия на лечение'", () => {
		const bannerPath = path.join(webSrcRoot, "components/visit/consents/Consent1ClickBatchBanner.tsx");
		const bannerContent = fs.readFileSync(bannerPath, "utf-8");
		assert.ok(!bannerContent.includes("каталог бланков ИДС"));
		assert.ok(bannerContent.includes("каталог согласий на лечение"));

		const logicPath = path.join(webSrcRoot, "components/visit/consents/hooks/useConsentActions.ts");
		const logicContent = fs.readFileSync(logicPath, "utf-8");
		assert.ok(!logicContent.includes('"Бланк ИДС отправлен на печать"'));
		assert.ok(!logicContent.includes('"Чистый бланк ИДС отправлен на печать"'));
		assert.ok(logicContent.includes('"Бланк согласия на лечение отправлен на печать"'));
		assert.ok(logicContent.includes('"Чистый бланк согласия на лечение отправлен на печать"'));
	});
});
