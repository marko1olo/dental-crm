import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VisitSoapEditor } from "../VisitSoapEditor";
import { EmkComplaintsSection } from "../emk/EmkComplaintsSection";
import { EmkDiaryProtocolSection } from "../emk/EmkDiaryProtocolSection";
import { CompletedServicesList } from "../CompletedServicesList";
import { VisitSummaryModal } from "../VisitSummaryModal";
import { PatientMemoPrintModal } from "../PatientMemoPrintModal";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Anti-Academic Bloat & Human Doctor Protocol Inquisition", () => {
	it("1. VisitSoapEditor renders 4 express 1-click chairside protocols bar with correct testids", () => {
		const html = renderToStaticMarkup(
			createElement(VisitSoapEditor, {
				activeTooth: 16,
				initialValues: {
					complaint: "",
					anamnesis: "",
					objectiveStatus: "",
					diagnosis: "",
					treatmentPlan: "",
					recommendations: "",
					icd10: "",
				},
			}),
		);

		assert.ok(html.includes("soap-chairside-express-bar"), "Renders express bar");
		assert.ok(html.includes("btn-soap-express-caries"), "Renders caries 1-click button");
		assert.ok(html.includes("btn-soap-express-pulpitis"), "Renders pulpitis 1-click button");
		assert.ok(html.includes("btn-soap-express-hygiene"), "Renders hygiene 1-click button");
		assert.ok(html.includes("btn-soap-express-extraction"), "Renders extraction 1-click button");
		assert.ok(html.includes("Кариес (K02.1)"), "Shows plain human title for Caries");
		assert.ok(html.includes("Пульпит (K04.0)"), "Shows plain human title for Pulpitis");
		assert.ok(html.includes("Профгигиена (K05.1)") || html.includes("Профгигиена (K03.6)"), "Shows plain human title for Hygiene");
		assert.ok(html.includes("Удаление (K01.1)") || html.includes("Удаление зуба"), "Shows plain human title for Extraction");
	});

	it("2. VisitSoapEditor markup strictly eliminates academic Latin and SOAP abbreviations", () => {
		const html = renderToStaticMarkup(
			createElement(VisitSoapEditor, {
				activeTooth: 26,
			}),
		);

		assert.ok(!html.includes("Status praesens"), "Does not contain Status praesens");
		assert.ok(!html.includes("Status localis"), "Does not contain Status localis");
		assert.ok(!html.includes("Anamnesis morbi"), "Does not contain Anamnesis morbi");
		assert.ok(!html.includes("Anamnesis vitae"), "Does not contain Anamnesis vitae");
		assert.ok(!html.includes("(Subjective)"), "Does not contain (Subjective)");
		assert.ok(!html.includes("(Assessment)"), "Does not contain (Assessment)");
	});

	it("3. EmkComplaintsSection renders pure Russian clinical labels without Latin parentheses", () => {
		const html = renderToStaticMarkup(
			createElement(EmkComplaintsSection, {
				visitNoteForm: { complaint: "Боль при накусывании", anamnesis: "Здоров" },
				updateVisitNoteField: () => {},
				isLocked: false,
			}),
		);

		assert.ok(html.includes("Жалобы пациента"), "Contains pure Russian complaints header");
		assert.ok(!html.includes("Subjective"), "Eliminates (Subjective)");
		assert.ok(html.includes("Анамнез заболевания и жизни"), "Contains pure Russian anamnesis header");
		assert.ok(!html.includes("Anamnesis morbi et vitae"), "Eliminates (Anamnesis morbi et vitae)");
	});

	it("4. EmkDiaryProtocolSection renders pure Russian clinical labels without SOAP abbreviations", () => {
		const html = renderToStaticMarkup(
			createElement(EmkDiaryProtocolSection, {
				visitNoteForm: { diagnosis: "K02.1", treatmentPlan: "Пломба" },
				updateVisitNoteField: () => {},
				isLocked: false,
			}),
		);

		assert.ok(html.includes("Основной диагноз по МКБ-10"), "Contains pure Russian diagnosis header");
		assert.ok(!html.includes("Assessment"), "Eliminates (Assessment)");
		assert.ok(html.includes("Протокол лечения и манипуляций"), "Contains pure Russian treatment header");
		assert.ok(!html.includes("Plan / Treatment"), "Eliminates (Plan / Treatment)");
	});

	it("5. CompletedServicesList prioritizes plain human title before bureaucratic 804n code", () => {
		const html = renderToStaticMarkup(
			createElement(CompletedServicesList, {
				completedLinesList: [
					{
						rawLine: "Выполнено: [A16.07.002.001] Наложение пломбы — 4 500 ₽",
						title: "Наложение пломбы из композита",
						code804n: "A16.07.002.001",
						toothCode: "16",
						quantity: 1,
						priceRub: 4500,
					},
				],
				totalRub: 4500,
				onRemoveCompletedLine: () => {},
			}),
		);

		assert.ok(html.includes("Наложение пломбы из композита"), "Renders human title");
		assert.ok(html.includes("[A16.07.002.001]"), "Renders 804n code");
		// Verify title appears in font-medium before code804n
		const titleIdx = html.indexOf("Наложение пломбы из композита");
		const codeIdx = html.indexOf("A16.07.002.001");
		assert.ok(titleIdx !== -1 && codeIdx !== -1 && titleIdx < codeIdx, "Title appears before 804n code");
	});

	it("6. VisitSummaryModal integrates 1-click Post-Op Patient Memo and PatientMemoPrintModal renders human recommendations", () => {
		// 1. Verify PatientMemoPrintModal renders human instructions without academic bloat
		const memoHtml = renderToStaticMarkup(
			createElement(PatientMemoPrintModal, {
				isOpen: true,
				onClose: () => {},
				initialMemoId: "anesthesia_caries",
				patient: { fullName: "Иванов Иван Иванович" },
				doctorName: "Д-р Смирнов",
			}),
		);

		assert.ok(memoHtml.includes("Памятка пациенту"), "Renders patient memo header");
		assert.ok(memoHtml.includes("лечения кариеса"), "Renders caries post-op memo title");
		assert.ok(memoHtml.includes("Не принимать пищу"), "Contains plain human instruction 'Не принимать пищу'");
		assert.ok(memoHtml.includes("btn-print-active-memo"), "Provides print button with testid");
		assert.ok(memoHtml.includes("Распечатать памятку"), "Provides print button label");

		// 2. Verify VisitSummaryModal source code structurally mounts PatientMemoPrintModal and memo buttons
		const summaryFilePath = path.resolve(__dirname, "../VisitSummaryModal.tsx");
		const summaryCode = fs.readFileSync(summaryFilePath, "utf8");

		assert.ok(summaryCode.includes("summary-quick-memo-btn"), "VisitSummaryModal has summary-quick-memo-btn in banner");
		assert.ok(summaryCode.includes("summary-print-memo-btn"), "VisitSummaryModal has summary-print-memo-btn in footer");
		assert.ok(summaryCode.includes("PatientMemoPrintModal"), "VisitSummaryModal imports and mounts PatientMemoPrintModal");
		assert.ok(summaryCode.includes("isMemoModalOpen"), "VisitSummaryModal manages isMemoModalOpen state");
	});
});
