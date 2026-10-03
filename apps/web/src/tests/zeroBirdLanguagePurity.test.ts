/**
 * zeroBirdLanguagePurity.test.ts — Red Team Inquisitor Verification Gate
 *
 * Verifies 100% elimination of bureaucratic "bird language", Soviet decree numbers
 * (804н, 043/у, 1051н, 54-ФЗ), regulatory citations (СанПиН 2.6.1.1192-03, СанПиН 3.3686-21),
 * radiation paranoia (kV, mA, DAP dosimetry in doctor HUD), and tech badges (ALARA, DICOM Part 10)
 * from all clinical UI components and user-facing dialogs.
 *
 * Mandates:
 * - Mandate 8e: Doctor Autonomy (no Soviet obstacle courses in operatory)
 * - Mandate 8t: Targeted Unit Test Gate (isolated vitest / node:test execution)
 * - User Directives: Zero bird language, quiet archival dosimetry, zero physics clutter
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

describe("Zero Bird Language & Clinical UI Purity Inquisitor Gate", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../..");
	const webSrc = path.join(repoRoot, "apps/web/src");

	const readComponent = (relPath: string) => {
		const fullPath = path.join(webSrc, relPath);
		assert.ok(fs.existsSync(fullPath), `Target component file must exist: ${relPath}`);
		return fs.readFileSync(fullPath, "utf-8");
	};

	it("1. RadiologyModule: quiet archival dosimetry without SanPiN yellow alerts", () => {
		const code = readComponent("components/radiology/RadiologyModule.tsx");

		// No default card number with 043/у
		assert.ok(!code.includes('"МК-043/у"'), "RadiologyModule must not default patient card to МК-043/у");

		// Quiet background archive button
		assert.ok(code.includes("Архив доз"), "RadiologyModule must feature quiet 'Архив доз' toolbar button");
		assert.ok(code.includes("Архив лучевой нагрузки (для проверок)"), "Dose sheet tooltip must indicate quiet background archive");
		assert.ok(!code.includes("Лист доз (СанПиН 2.6.1)"), "RadiologyModule must not feature loud SanPiN dose button");

		// Card description clean
		assert.ok(code.includes("в медицинскую карту"), "RadiologyModule must reference medical card, not Form 043/u");
	});

	it("2. SensorStudyViewer & DicomViewerModal: clean Norma action without 043/у cipher", () => {
		const sensorCode = readComponent("components/radiology/SensorStudyViewer.tsx");
		assert.ok(sensorCode.includes("Норма: патологии нет"), "SensorStudyViewer must label button 'Норма: патологии нет'");
		assert.ok(!sensorCode.includes("Норма (043/у)"), "SensorStudyViewer must not have 'Норма (043/у)' button text");
		assert.ok(sensorCode.includes('data-testid="btn-sensor-norma"'), "Preserve data-testid for compatibility");

		const dicomCode = readComponent("components/imaging/DicomViewerModal.tsx");
		assert.ok(dicomCode.includes("Норма: патологии нет"), "DicomViewerModal must label button 'Норма: патологии нет'");
		assert.ok(!dicomCode.includes("Норма (043/у)"), "DicomViewerModal must not have 'Норма (043/у)' button text");
		assert.ok(dicomCode.includes('data-testid="btn-dicom-norma-043"'), "Preserve testid for compatibility");
	});

	it("3. RadiologyClinicalHud: zero physics kVp / mA / DAP telemetry on clinical screen", () => {
		const hudCode = readComponent("components/radiology/RadiologyClinicalHud.tsx");

		// Doctor HUD must NOT display physics telemetry in HUD body
		assert.ok(!hudCode.includes("kVp ·"), "RadiologyClinicalHud must not show kVp in doctor HUD body");
		assert.ok(!hudCode.includes("data-testid=\"hud-dap-dose\""), "RadiologyClinicalHud must not render loud DAP dose badge on screen");
	});

	it("4. DicomToolboxRibbon & VisiographAnalyzer: clean medical card actions & toast", () => {
		const ribbonCode = readComponent("components/imaging/DicomToolboxRibbon.tsx");
		assert.ok(ribbonCode.includes("Норма: патологии нет"), "DicomToolboxRibbon button must be 'Норма: патологии нет'");
		assert.ok(ribbonCode.includes("Внести в медицинскую карту"), "HU modal must insert into medical card");

		const visCode = readComponent("components/imaging/VisiographAnalyzer.tsx");
		assert.ok(visCode.includes("Норма: патологии нет ✓"), "VisiographAnalyzer must show 'Норма: патологии нет ✓'");
		assert.ok(visCode.includes("внесено в медицинскую карту"), "Visiograph toast must mention medical card");
		assert.ok(!visCode.includes("Норма (043/у)"), "Visiograph button must not say 043/у");
	});

	it("5. CtStudyViewer & CbctImplantModal: eliminated '043/у' from diary buttons", () => {
		const ctCode = readComponent("components/imaging/CtStudyViewer.tsx");
		assert.ok(ctCode.includes("В медицинскую карту"), "CtStudyViewer button must be 'В медицинскую карту'");
		assert.ok(!ctCode.includes("В карту 043/у"), "CtStudyViewer must not have 'В карту 043/у'");

		const cbctCode = readComponent("components/radiology/CbctImplantModal.tsx");
		assert.ok(cbctCode.includes("В дневник приёма"), "CbctImplantModal button must be 'В дневник приёма'");
		assert.ok(!cbctCode.includes("В дневник 043/у"), "CbctImplantModal must not have 'В дневник 043/у'");
	});

	it("6. Radiology Referral: purged ALARA and SanPiN from print template & modal", () => {
		const modalCode = readComponent("components/radiology/RadiologyReferralModal.tsx");
		assert.ok(!modalCode.includes("ALARA"), "RadiologyReferralModal must not contain ALARA acronym");
		assert.ok(!modalCode.includes("ЭМК 043/у"), "RadiologyReferralModal must not contain ЭМК 043/у in footer");
		assert.ok(modalCode.includes("Внести в дневник"), "RadiologyReferralModal button must be 'Внести в дневник'");

		const printCode = readComponent("components/radiology/radiologyReferralPrintTemplate.tsx");
		assert.ok(!printCode.includes("ALARA"), "Referral print template must not contain ALARA acronym");
		assert.ok(!printCode.includes("СанПиН 2.6.1.1192-03"), "Referral print template must not cite SanPiN 2.6.1.1192-03");
	});

	it("7. VisiographTopToolbar: purged 'DICOM Part 10' tech badge from export button", () => {
		const toolbarCode = readComponent("components/visiograph/VisiographTopToolbar.tsx");
		assert.ok(!toolbarCode.includes("DICOM Part 10"), "VisiographTopToolbar must not cite DICOM Part 10 in export button title");
		assert.ok(toolbarCode.includes("Экспорт снимка (JPEG, PNG, DICOM)"), "VisiographTopToolbar must use clean export title");
	});

	it("8. SanpinRegistryPackageModal: purged Soviet ministerial decrees and order numbers", () => {
		const sanpinModalCode = readComponent("components/documents/SanpinRegistryPackageModal.tsx");
		assert.ok(!sanpinModalCode.includes("1089н"), "Purged decree 1089н");
		assert.ok(!sanpinModalCode.includes("366/у"), "Purged decree 366/у");
		assert.ok(!sanpinModalCode.includes("257/у"), "Purged decree 257/у");
		assert.ok(!sanpinModalCode.includes("Постановление Правительства РФ № 140"), "Purged government decree 140");
		assert.ok(!sanpinModalCode.includes("СанПиН 2.6.1.1192-03"), "Purged SanPiN 2.6.1.1192-03 citation");
	});

	it("9. ChairsideDiagnosisPackageCard: purged 54-ФЗ and 804н from visible chairside UI", () => {
		const cardCode = readComponent("components/visit/ChairsideDiagnosisPackageCard.tsx");
		assert.ok(cardCode.includes("В кассу (1 клик)"), "Button must be clean 'В кассу (1 клик)'");
		assert.ok(!cardCode.includes("В кассу 54-ФЗ (1 клик)"), "Button must not contain 54-ФЗ");
		assert.ok(cardCode.includes("Готовый чек-лист клинических услуг"), "Header must be 'Готовый чек-лист клинических услуг'");
		assert.ok(!cardCode.includes("Номенклатуре 804н"), "Header must not cite 804н in visible label");
		assert.ok(cardCode.includes('data-testid="export-diagnosis-bundle-cashier-btn"'), "Preserve data-testid");
	});

	it("10. StaffActionJournalSection: purged 043/у, 54-ФЗ, 152-ФЗ from audit labels & categories", () => {
		const auditCode = readComponent("components/settings/audit/StaffActionJournalSection.tsx");
		assert.ok(!auditCode.includes("Открытие ЭМК (043/у)"), "Action must be clean 'Открытие карты пациента'");
		assert.ok(!auditCode.includes("Приём оплаты (54-ФЗ)"), "Action must be clean 'Приём оплаты'");
		assert.ok(!auditCode.includes("Возврат средств (54-ФЗ)"), "Action must be clean 'Возврат средств'");
		assert.ok(!auditCode.includes("Экспорт данных (152-ФЗ)"), "Action must be clean 'Экспорт данных'");
		assert.ok(auditCode.includes("Финансы и оплата"), "Category filter must be 'Финансы и оплата'");
		assert.ok(!auditCode.includes("Финансы (54-ФЗ)"), "Category filter must not cite 54-ФЗ");
	});

	it("11. PatientsView: clean toast without '043/у' and standard МК- card prefix", () => {
		const patientsCode = readComponent("PatientsView.tsx");
		assert.ok(patientsCode.includes("Выберите пациента из списка слева для начала приёма"), "Clean visit open toast");
		assert.ok(!patientsCode.includes("открытия приёма 043/у"), "Toast must not cite 043/у");
		assert.ok(!patientsCode.includes("`043/у-${selectedPatient.id"), "Card number must use МК-, not 043/у-");
	});

	it("12. HardwarePrinter: purged 54-ФЗ from receipt headers and HTML title", () => {
		const printerCode = readComponent("services/hardware/HardwarePrinter.ts");
		assert.ok(printerCode.includes('appendLine("КАССОВЫЙ ЧЕК / ПРИХОД");'), "ESC/POS receipt must be clean");
		assert.ok(!printerCode.includes('КАССОВЫЙ ЧЕК / ПРИХОД (54-ФЗ)'), "ESC/POS must not print 54-ФЗ");
		assert.ok(printerCode.includes("<title>Кассовый чек - "), "HTML receipt title must be clean");
	});

	it("13. AI Services: clean Russian action titles and patient card references", () => {
		const dispatcherCode = readComponent("services/ai/aiActionDispatcher.ts");
		assert.ok(dispatcherCode.includes('return "Заполнение дневника приёма";'), "Action title must be clean");
		assert.ok(!dispatcherCode.includes("Заполнение дневника приёма (Форма 043/у)"), "Action title must not include (Форма 043/у)");

		const aiAssistantCode = readComponent("services/ai/aiAssistantService.ts");
		assert.ok(!aiAssistantCode.includes("Дневник приёма по Форме 043/у"), "AI message must not cite Форма 043/у");
		assert.ok(!aiAssistantCode.includes("медицинской карты (Форма 043/у)"), "AI message must not cite (Форма 043/у)");
	});

	it("14. SanpinRegisters & Warranty: human toast messages & standard card prefix", () => {
		const sanpinCode = readComponent("components/sanpin/SanpinRegisters.tsx");
		assert.ok(sanpinCode.includes("Журналы стерилизации в норме"), "Sanpin toast must be clean Russian");
		assert.ok(!sanpinCode.includes("Журналы СанПиН в норме"), "Sanpin toast must not shout СанПиН");
		assert.ok(sanpinCode.includes("Журналы за неделю заполнены"), "Week toast must be clean");
		assert.ok(sanpinCode.includes("Смена заполнена:"), "Shift toast must be clean");

		const warrantyCode = readComponent("components/warranty/WarrantyPassportModal.tsx");
		assert.ok(!warrantyCode.includes(': "043/у")'), "Warranty card must not fallback to 043/у");
		assert.ok(!warrantyCode.includes('|| "043/у"'), "Warranty card must not fallback to 043/у");
	});
});
