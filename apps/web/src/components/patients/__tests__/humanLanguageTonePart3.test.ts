import assert from "node:assert";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("Red Team Inquisition: Human Clinical Language (Part 3: Protocols, Templates, Imaging)", () => {
	it("11. VisitProtocolView.tsx: free of 'Форма 043/у', '(Subjective)', '(Status localis)'", () => {
		const filePath = path.join(webSrcRoot, "components/patients/VisitProtocolView.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("Протокол визита (Форма 043/у)"));
		assert.ok(!content.includes("Жалобы пациента (Subjective):"));
		assert.ok(!content.includes("Данные объективного осмотра (Status localis):"));
		assert.ok(!content.includes("Клинический диагноз по МКБ-10:"));
		assert.ok(!content.includes("Медицинская документация Форма 043/у"));

		assert.ok(content.includes("Протокол приёма"));
		assert.ok(content.includes("Жалобы пациента:"));
		assert.ok(content.includes("Осмотр и зубная формула:"));
		assert.ok(content.includes("Клинический диагноз:"));
	});

	it("12. Doctor Settings: Templates & Materials Catalog free of bureaucratic 043/у bloat", () => {
		const tplPath = path.join(webSrcRoot, "components/settings/doctor/DoctorForm043TemplatesSection.tsx");
		const playgroundPath = path.join(webSrcRoot, "components/settings/doctor/templates/DoctorDiaryPlaygroundBar.tsx");
		const tplContent = fs.existsSync(playgroundPath)
			? fs.readFileSync(tplPath, "utf-8") + "\n" + fs.readFileSync(playgroundPath, "utf-8")
			: fs.readFileSync(tplPath, "utf-8");
		assert.ok(!tplContent.includes("Тестовый диагноз МКБ-10:"));
		assert.ok(tplContent.includes("Тестовый диагноз:"));

		const matPath = path.join(webSrcRoot, "components/settings/doctor/DoctorMaterialsCatalogSection.tsx");
		const matSnippetPath = path.join(webSrcRoot, "components/settings/doctor/materials/DoctorMaterialsLiveSnippetCard.tsx");
		const matContent = fs.existsSync(matSnippetPath)
			? fs.readFileSync(matPath, "utf-8") + "\n" + fs.readFileSync(matSnippetPath, "utf-8")
			: fs.readFileSync(matPath, "utf-8");
		assert.ok(!matContent.includes("(Форма 043/у)"));
		assert.ok(matContent.includes("Автоматический фрагмент протокола для медкарты с вашими материалами"));
		assert.ok(matContent.includes("Скопировать готовый текст для медкарты"));
	});

	it("13. ImplantWorkspace.tsx: ridge export and actions use human clinical language instead of 043/у", () => {
		const filePath = path.join(webSrcRoot, "components/radiology/mpr/workspaces/ImplantWorkspace.tsx");
		let content = fs.readFileSync(filePath, "utf-8");
		const actionsPath = path.join(webSrcRoot, "components/radiology/mpr/workspaces/modules/implant/ImplantActionButtons.tsx");
		if (fs.existsSync(actionsPath)) {
			content += "\n" + fs.readFileSync(actionsPath, "utf-8");
		}
		const morphPath = path.join(webSrcRoot, "components/radiology/mpr/workspaces/modules/implant/ImplantRidgeMorphometryCard.tsx");
		if (fs.existsSync(morphPath)) {
			content += "\n" + fs.readFileSync(morphPath, "utf-8");
		}

		assert.ok(!content.includes('"Текст 043/у"'));
		assert.ok(!content.includes("<span>В 043/у</span>"));
		assert.ok(!content.includes("Редактирование протокола 043/у"));
		assert.ok(!content.includes("<span>В медкарту 043/у</span>"));

		assert.ok(content.includes('"Текст протокола"'));
		assert.ok(content.includes("<span>В медкарту</span>"));
		assert.ok(content.includes("Редактирование протокола ("));
	});

	it("14. VisitDiarySection.tsx & VisitSummaryModal.tsx: protocols and synthesis buttons humanized", () => {
		const diaryPath = path.join(webSrcRoot, "components/visit/VisitDiarySection.tsx");
		let diaryContent = fs.readFileSync(diaryPath, "utf-8");
		const presetsPath = path.join(webSrcRoot, "components/visit/diary/section/VisitDiaryPresetsAccordion.tsx");
		if (fs.existsSync(presetsPath)) {
			diaryContent += "\n" + fs.readFileSync(presetsPath, "utf-8");
		}
		assert.ok(!diaryContent.includes("1-Click Протоколы 043/у"));
		assert.ok(!diaryContent.includes("Подставить шаблон СтАР в дневник?"));
		assert.ok(diaryContent.includes("Клинические протоколы"));

		const modalPath = path.join(webSrcRoot, "components/visit/VisitSummaryModal.tsx");
		const modalContent =
			fs.readFileSync(modalPath, "utf-8") +
			"\n" +
			fs.readFileSync(path.join(webSrcRoot, "components/visit/summaryModal/VisitRecommendationsSection.tsx"), "utf-8");
		assert.ok(!modalContent.includes("1-Click Синтез дневника по МКБ-10 и формуле"));
		assert.ok(modalContent.includes("Заполнение дневника по диагнозу и формуле"));
	});

	it("15. VisitDiaryHeaderMoreMenu.tsx: export menu uses human title instead of raw 'СЭМД ЕГИСЗ'", () => {
		const filePath = path.join(webSrcRoot, "components/visit/diary/VisitDiaryHeaderMoreMenu.tsx");
		const content = fs.readFileSync(filePath, "utf-8");
		assert.ok(!content.includes("<span>СЭМД ЕГИСЗ</span>"));
		assert.ok(content.includes("<span>Электронная медкарта (Госуслуги)</span>"));
	});
});
