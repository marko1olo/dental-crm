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
			content.includes("Выберите пациента из списка слева для открытия приёма") ||
				content.includes("Выберите пациента из списка слева для начала приёма"),
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

	it("11. VisitProtocolView.tsx: free of 'Форма 043/у', '(Subjective)', '(Status localis)'", () => {
		const filePath = path.join(webSrcRoot, "components/patients/VisitProtocolView.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes("Протокол визита (Форма 043/у)"), "Must not use 'Протокол визита (Форма 043/у)'");
		assert.ok(!content.includes("Жалобы пациента (Subjective):"), "Must not use 'Subjective'");
		assert.ok(!content.includes("Данные объективного осмотра (Status localis):"), "Must not use 'Status localis'");
		assert.ok(!content.includes("Клинический диагноз по МКБ-10:"), "Must not use 'по МКБ-10'");
		assert.ok(!content.includes("Медицинская документация Форма 043/у"), "Must not use 'Форма 043/у' in footer");

		assert.ok(content.includes("Протокол приёма"));
		assert.ok(content.includes("Жалобы пациента:"));
		assert.ok(content.includes("Осмотр и зубная формула:"));
		assert.ok(content.includes("Клинический диагноз:"));
	});

	it("12. Doctor Settings: Templates & Materials Catalog free of bureaucratic 043/у bloat", () => {
		const tplPath = path.join(webSrcRoot, "components/settings/doctor/DoctorForm043TemplatesSection.tsx");
		const tplContent = fs.readFileSync(tplPath, "utf-8");
		assert.ok(!tplContent.includes("Тестовый диагноз МКБ-10:"), "Must not use 'Тестовый диагноз МКБ-10:'");
		assert.ok(tplContent.includes("Тестовый диагноз:"));

		const matPath = path.join(webSrcRoot, "components/settings/doctor/DoctorMaterialsCatalogSection.tsx");
		const matContent = fs.readFileSync(matPath, "utf-8");
		assert.ok(!matContent.includes("(Форма 043/у)"), "Must not use '(Форма 043/у)' in visible snippet title or button");
		assert.ok(matContent.includes("Автоматический фрагмент протокола для медкарты с вашими материалами"));
		assert.ok(matContent.includes("Скопировать готовый текст для медкарты"));
	});

	it("13. ImplantWorkspace.tsx: ridge export and actions use human clinical language instead of 043/у", () => {
		const filePath = path.join(webSrcRoot, "components/radiology/mpr/workspaces/ImplantWorkspace.tsx");
		const content = fs.readFileSync(filePath, "utf-8");

		assert.ok(!content.includes('"Текст 043/у"'), "Must not use 'Текст 043/у'");
		assert.ok(!content.includes("<span>В 043/у</span>"), "Must not use 'В 043/у'");
		assert.ok(!content.includes("Редактирование протокола 043/у"), "Must not use 'Редактирование протокола 043/у'");
		assert.ok(!content.includes("<span>В медкарту 043/у</span>"), "Must not use 'В медкарту 043/у'");

		assert.ok(content.includes('"Текст протокола"'));
		assert.ok(content.includes("<span>В медкарту</span>"));
		assert.ok(content.includes("Редактирование протокола ("));
	});

	it("14. VisitDiarySection.tsx & VisitSummaryModal.tsx: protocols and synthesis buttons humanized", () => {
		const diaryPath = path.join(webSrcRoot, "components/visit/VisitDiarySection.tsx");
		const diaryContent = fs.readFileSync(diaryPath, "utf-8");
		assert.ok(!diaryContent.includes("1-Click Протоколы 043/у"), "Must not use '1-Click Протоколы 043/у'");
		assert.ok(!diaryContent.includes("Подставить шаблон СтАР в дневник?"), "Must not use 'шаблон СтАР'");
		assert.ok(diaryContent.includes("Клинические протоколы"));

		const modalPath = path.join(webSrcRoot, "components/visit/VisitSummaryModal.tsx");
		const modalContent = fs.readFileSync(modalPath, "utf-8");
		assert.ok(!modalContent.includes("1-Click Синтез дневника по МКБ-10 и формуле"), "Must not use bird language in synthesis modal");
		assert.ok(modalContent.includes("1-Click Заполнение дневника по диагнозу и формуле"));
	});

	it("15. VisitDiaryHeaderMoreMenu.tsx: export menu uses human title instead of raw 'СЭМД ЕГИСЗ'", () => {
		const filePath = path.join(webSrcRoot, "components/visit/diary/VisitDiaryHeaderMoreMenu.tsx");
		const content = fs.readFileSync(filePath, "utf-8");
		assert.ok(!content.includes("<span>СЭМД ЕГИСЗ</span>"), "Must not use 'СЭМД ЕГИСЗ' in action button");
		assert.ok(content.includes("<span>Электронная медкарта (Госуслуги)</span>"));
	});

	it("16. Form043PrintModal.tsx: export options use human language instead of 'ЕГИСЗ СЭМД'", () => {
		const filePath = path.join(webSrcRoot, "components/emr/Form043PrintModal.tsx");
		const content = fs.readFileSync(filePath, "utf-8");
		assert.ok(!content.includes("<span>ЕГИСЗ СЭМД (XML)</span>"), "Must not use raw 'ЕГИСЗ СЭМД'");
		assert.ok(!content.includes("HL7 CDA R2 XML для ЕГИСЗ (СЭМД 834н)"), "Must not expose Order 834n in tooltip");
		assert.ok(content.includes("<span>Электронная медкарта (XML)</span>"));
		assert.ok(content.includes("Экспорт в XML для электронной медкарты (Госуслуги)"));
	});

	it("17. PatientCreationModal.tsx & patientFieldRequirementsConfig.ts: SNILS hints free of raw ЕГИСЗ/РЭМД", () => {
		const modalPath = path.join(webSrcRoot, "components/patients/PatientCreationModal.tsx");
		const modalContent = fs.readFileSync(modalPath, "utf-8");
		assert.ok(!modalContent.includes("* (ЕГИСЗ)"), "Must not use raw '* (ЕГИСЗ)' badge");
		assert.ok(!modalContent.includes("в ЕГИСЗ (РЭМД)"), "Must not use 'в ЕГИСЗ (РЭМД)' hint");
		assert.ok(modalContent.includes("* (для Госуслуг)"));
		assert.ok(modalContent.includes("медкарты и Госуслуг"));

		const configPath = path.join(webSrcRoot, "components/patients/patientFieldRequirementsConfig.ts");
		const configContent = fs.readFileSync(configPath, "utf-8");
		assert.ok(!configContent.includes("СНИЛС обязателен для передачи данных в ЕГИСЗ (РЭМД)"), "Error must be human-oriented");
		assert.ok(configContent.includes("СНИЛС обязателен для электронной медкарты и Госуслуг"));
	});

	it("18. VisitView.tsx, VisitEmkTab.tsx, VisitSoapEditor.tsx: treatment plan defaults free of bare 'Санация'", () => {
		const visitViewPath = path.join(webSrcRoot, "VisitView.tsx");
		const visitViewContent = fs.readFileSync(visitViewPath, "utf-8");
		assert.ok(!visitViewContent.includes("патологий не выявлено. Санация."), "Must not use bare 'Санация' in default plan");
		assert.ok(visitViewContent.includes("Полость рта здорова, гигиена удовлетворительная."));

		const emkPath = path.join(webSrcRoot, "components/visit/VisitEmkTab.tsx");
		const emkContent = fs.readFileSync(emkPath, "utf-8");
		assert.ok(!emkContent.includes("санация полости рта. Обучение гигиене."), "Must not use raw 'санация полости рта' in norm plan");
		assert.ok(!emkContent.includes('treatmentPlan || "Санация полости рта"'), "Must not use bare 'Санация полости рта' fallback");
		assert.ok(emkContent.includes("Проведена профессиональная гигиена и профилактика."));

		const soapPath = path.join(webSrcRoot, "components/visit/VisitSoapEditor.tsx");
		const soapContent = fs.readFileSync(soapPath, "utf-8");
		assert.ok(!soapContent.includes('values.treatmentPlan || "Санация"'), "Must not use bare 'Санация' in clipboard protocol");
		assert.ok(soapContent.includes('values.treatmentPlan || "Лечение и гигиена"'));
	});

	it("19. clinicalProtocols043.ts: memo badges and presets use clinical protocol language instead of 043/у", () => {
		const filePath = path.join(webSrcRoot, "lib/clinicalProtocols043.ts");
		const content = fs.readFileSync(filePath, "utf-8");
		assert.ok(!content.includes('badge: "Хирургия 043/у"'), "Must not use 'Хирургия 043/у'");
		assert.ok(!content.includes('badge: "Терапия 043/у"'), "Must not use 'Терапия 043/у'");
		assert.ok(!content.includes('badge: "Эндодонтия 043/у"'), "Must not use 'Эндодонтия 043/у'");
		assert.ok(content.includes('badge: "Хирургический протокол"'));
		assert.ok(content.includes('badge: "Терапевтический протокол"'));
		assert.ok(content.includes('badge: "Эндодонтический протокол"'));
		assert.ok(content.includes("Полное лечение и гигиена. Плановый профосмотр через 6 месяцев."));
	});

	it("20. Consent1ClickBatchBanner.tsx & useVisitConsentsLogic.ts: user-facing strings use 'согласия на лечение'", () => {
		const bannerPath = path.join(webSrcRoot, "components/visit/consents/Consent1ClickBatchBanner.tsx");
		const bannerContent = fs.readFileSync(bannerPath, "utf-8");
		assert.ok(!bannerContent.includes("каталог бланков ИДС"), "Must not use 'каталог бланков ИДС'");
		assert.ok(bannerContent.includes("каталог согласий на лечение"));

		const logicPath = path.join(webSrcRoot, "components/visit/consents/useVisitConsentsLogic.ts");
		const logicContent = fs.readFileSync(logicPath, "utf-8");
		assert.ok(!logicContent.includes('"Бланк ИДС отправлен на печать"'), "Toast must not use raw 'ИДС'");
		assert.ok(!logicContent.includes('"Чистый бланк ИДС отправлен на печать"'), "Toast must not use raw 'ИДС'");
		assert.ok(logicContent.includes('"Бланк согласия на лечение отправлен на печать"'));
		assert.ok(logicContent.includes('"Чистый бланк согласия на лечение отправлен на печать"'));
	});
});
