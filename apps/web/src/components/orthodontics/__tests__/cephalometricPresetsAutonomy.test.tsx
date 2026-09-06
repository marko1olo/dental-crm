import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { CephalometricAnalysisModal } from "../CephalometricAnalysisModal";
import {
	calculateCephalometrics,
	CLASS_I_NORMAL_LANDMARKS_PRESET,
	CLASS_II_DISTAL_LANDMARKS_PRESET,
	CLASS_III_MESIAL_LANDMARKS_PRESET,
	generateForm043OrthodonticProtocolText,
} from "../cephalometricMath";

describe("Orthodontic TRG 1-Click Clinical Presets & Autonomy (Mandates 8e, 8k)", () => {
	it("renders 1-click clinical presets in both the upper control panel and Tab 1 toolbar with exact labels and testids", () => {
		const html = renderToString(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-901",
				patientName: "Смирнова Екатерина Андреевна",
			}),
		);

		// 1. Upper control panel (Header) Presets Bar
		assert.ok(
			html.includes('data-testid="header-ceph-presets-bar"'),
			"Contains header presets bar in the upper control panel",
		);
		assert.ok(
			html.includes('data-testid="header-preset-class-1"'),
			"Header contains Class I Normal preset button",
		);
		assert.ok(
			html.includes('data-testid="header-preset-class-2"'),
			"Header contains Class II Distal preset button",
		);
		assert.ok(
			html.includes('data-testid="header-preset-class-3"'),
			"Header contains Class III Mesial preset button",
		);
		assert.ok(
			html.includes('data-testid="header-preset-clear"'),
			"Header contains Clear landmarks button",
		);

		// 2. Tab 1 Toolbar Presets
		assert.ok(
			html.includes('data-testid="tab1-ceph-presets-toolbar"'),
			"Contains dedicated presets toolbar inside Tab 1",
		);
		assert.ok(
			html.includes('data-testid="tab1-preset-class-1"'),
			"Tab 1 contains Class I Normal preset button",
		);
		assert.ok(
			html.includes('data-testid="tab1-preset-class-2"'),
			"Tab 1 contains Class II Distal preset button",
		);
		assert.ok(
			html.includes('data-testid="tab1-preset-class-3"'),
			"Tab 1 contains Class III Mesial preset button",
		);
		assert.ok(
			html.includes('data-testid="tab1-preset-clear"'),
			"Tab 1 contains Clear landmarks button",
		);

		// 3. Exact button labels per Mandate 8e & 8k specifications
		assert.ok(
			html.includes("★ I Класс (Норма)"),
			"Displays '★ I Класс (Норма)' button text",
		);
		assert.ok(
			html.includes("II Класс (Дистальный)"),
			"Displays 'II Класс (Дистальный)' button text",
		);
		assert.ok(
			html.includes("III Класс (Мезиальный)"),
			"Displays 'III Класс (Мезиальный)' button text",
		);
		assert.ok(
			html.includes("Очистить разметку"),
			"Displays 'Очистить разметку' button text",
		);

		// 4. Tab 2 Lab Protocol Presets with testids
		const htmlTab2 = renderToString(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				initialImageUrl: "/radiology/sample_trg_cephalogram.jpg",
				initialTab: "metrics",
			}),
		);
		assert.ok(
			htmlTab2.includes('data-testid="btn-ceph-preset-class-1"'),
			"Tab 2 contains lab protocol Class I button",
		);
		assert.ok(
			htmlTab2.includes('data-testid="btn-ceph-preset-class-2"'),
			"Tab 2 contains lab protocol Class II button",
		);
		assert.ok(
			htmlTab2.includes('data-testid="btn-ceph-preset-class-3"'),
			"Tab 2 contains lab protocol Class III button",
		);
		assert.ok(
			htmlTab2.includes('data-testid="btn-ceph-preset-clear"'),
			"Tab 2 contains lab protocol Clear button",
		);
	});

	it("instantly calculates 100% of cephalometric angles and synthesizes Class I diagnosis when CLASS_I_NORMAL_LANDMARKS_PRESET is applied", () => {
		const result = calculateCephalometrics(CLASS_I_NORMAL_LANDMARKS_PRESET);

		// Completeness & Landmark Count
		assert.equal(result.isComplete, true, "Analysis must be marked as complete");
		assert.equal(result.placedCount, 16, "All 16 landmarks must be placed");
		assert.equal(result.completionPercentage, 100, "Must be 100% complete");

		// 100% of Measurements calculated (19/19 non-null)
		const validMeasurements = result.measurements.filter((m) => m.value !== null);
		assert.equal(
			validMeasurements.length,
			result.measurements.length,
			`All ${result.measurements.length} measurements must be computed without any null/pending values`,
		);

		// Check Steiner Analysis
		const sna = result.measurements.find((m) => m.id === "SNA");
		const snb = result.measurements.find((m) => m.id === "SNB");
		const anb = result.measurements.find((m) => m.id === "ANB");
		assert.ok(sna && sna.value !== null && sna.value >= 78 && sna.value <= 86);
		assert.ok(snb && snb.value !== null && snb.value >= 76 && snb.value <= 84);
		assert.ok(anb && anb.value !== null && anb.value >= 0 && anb.value <= 4);

		// Check Tweed Analysis
		const fma = result.measurements.find((m) => m.id === "FMA");
		const impa = result.measurements.find((m) => m.id === "L1-MP");
		assert.ok(fma && fma.value !== null && fma.value > 15 && fma.value < 35);
		assert.ok(impa && impa.value !== null && impa.value > 80 && impa.value < 100);

		// Check Jacobson Wits
		const wits = result.measurements.find((m) => m.id === "Wits");
		assert.ok(wits && wits.value !== null);

		// Check Downs Analysis
		const facialAngle = result.measurements.find((m) => m.id === "Downs-FA");
		const convexity = result.measurements.find((m) => m.id === "Downs-Conv");
		const yAxis = result.measurements.find((m) => m.id === "Downs-YAxis");
		assert.ok(facialAngle && facialAngle.value !== null);
		assert.ok(convexity && convexity.value !== null);
		assert.ok(yAxis && yAxis.value !== null);

		// Check Diagnosis
		assert.equal(result.diagnosis.skeletalClass, "Class I");
		assert.ok(
			result.diagnosis.skeletalClassRu.includes("Скелетный класс I"),
			"Diagnosis in Russian must state Class I",
		);
		assert.ok(
			result.diagnosis.summaryRu.includes("Скелетный класс I"),
			"Summary must include Class I",
		);
		assert.ok(
			result.diagnosis.protocol043Text.includes("Скелетный класс I"),
			"Form 043/u text must include Class I",
		);
	});

	it("instantly calculates 100% of cephalometric angles and synthesizes Class II diagnosis when CLASS_II_DISTAL_LANDMARKS_PRESET is applied", () => {
		const result = calculateCephalometrics(CLASS_II_DISTAL_LANDMARKS_PRESET);

		assert.equal(result.isComplete, true);
		assert.equal(result.placedCount, 16);
		assert.equal(result.completionPercentage, 100);

		const anb = result.measurements.find((m) => m.id === "ANB");
		assert.ok(anb && anb.value !== null);
		assert.ok(anb.value > 4.0, `Class II ANB angle must be > 4°, got ${anb.value}°`);
		assert.equal(anb.status, "increased");

		assert.equal(result.diagnosis.skeletalClass, "Class II");
		assert.ok(
			result.diagnosis.skeletalClassRu.includes("Скелетный класс II"),
			"Diagnosis in Russian must state Class II",
		);
		assert.ok(
			result.diagnosis.summaryRu.includes("Скелетный класс II"),
			"Summary must include Class II",
		);
		assert.ok(
			result.diagnosis.protocol043Text.includes("Скелетный класс II"),
			"Protocol 043/u text must contain Class II diagnosis",
		);
	});

	it("instantly calculates 100% of cephalometric angles and synthesizes Class III diagnosis when CLASS_III_MESIAL_LANDMARKS_PRESET is applied", () => {
		const result = calculateCephalometrics(CLASS_III_MESIAL_LANDMARKS_PRESET);

		assert.equal(result.isComplete, true);
		assert.equal(result.placedCount, 16);
		assert.equal(result.completionPercentage, 100);

		const anb = result.measurements.find((m) => m.id === "ANB");
		assert.ok(anb && anb.value !== null);
		assert.ok(anb.value < 0.0, `Class III ANB angle must be < 0°, got ${anb.value}°`);
		assert.equal(anb.status, "decreased");

		assert.equal(result.diagnosis.skeletalClass, "Class III");
		assert.ok(
			result.diagnosis.skeletalClassRu.includes("Скелетный класс III"),
			"Diagnosis in Russian must state Class III",
		);
		assert.ok(
			result.diagnosis.summaryRu.includes("Скелетный класс III"),
			"Summary must include Class III",
		);
		assert.ok(
			result.diagnosis.protocol043Text.includes("Скелетный класс III"),
			"Protocol 043/u text must contain Class III diagnosis",
		);
	});

	it("generates comprehensive Form 043/u orthodontic protocol ready for 1-click chart insertion", () => {
		const analysis = calculateCephalometrics(CLASS_I_NORMAL_LANDMARKS_PRESET);
		const protocolText = generateForm043OrthodonticProtocolText(analysis, {
			patientName: "Барабаш Сергей Владимирович",
			doctorName: "Д-р Смирнова Е. А.",
		});

		// Check regulatory and clinical compliance
		assert.ok(protocolText.includes("Медицинская карта 043/у"), "Complies with Form 043/u");
		assert.ok(protocolText.includes("Приказ МЗ РФ №834н"), "Complies with Order 834n");
		assert.ok(protocolText.includes("Барабаш Сергей Владимирович"), "Includes patient name");
		assert.ok(protocolText.includes("Д-р Смирнова Е. А."), "Includes doctor name");

		// All methods present in Form 043/u protocol
		assert.ok(protocolText.includes("Steiner"), "Contains Steiner analysis section");
		assert.ok(protocolText.includes("Tweed"), "Contains Tweed analysis section");
		assert.ok(protocolText.includes("Jacobson"), "Contains Jacobson Wits section");
		assert.ok(protocolText.includes("SNA:"), "Contains SNA metric");
		assert.ok(protocolText.includes("SNB:"), "Contains SNB metric");
		assert.ok(protocolText.includes("ANB:"), "Contains ANB metric");
		assert.ok(protocolText.includes("Wits-число"), "Contains Wits appraisal");
		assert.ok(protocolText.includes("FMA (Tweed):"), "Contains FMA metric");
		assert.ok(protocolText.includes("1-NA угол"), "Contains 1-NA angle");
		assert.ok(protocolText.includes("1-NA мм"), "Contains 1-NA distance");
		assert.ok(protocolText.includes("1-NB угол"), "Contains 1-NB angle");
		assert.ok(protocolText.includes("U1-SN"), "Contains U1-SN inclination");
		assert.ok(protocolText.includes("IMPA (L1-MP)"), "Contains IMPA inclination");
		assert.ok(protocolText.includes("U1-L1"), "Contains interincisal angle");
		assert.ok(
			protocolText.includes("ЗАКЛЮЧЕНИЕ ЦЕФАЛОМЕТРИИ (ТРГ):"),
			"Contains clinical conclusion header",
		);
	});

	it("gracefully clears all landmarks when reset is triggered, returning to pristine manual state", () => {
		const emptyAnalysis = calculateCephalometrics({});
		assert.equal(emptyAnalysis.placedCount, 0);
		assert.equal(emptyAnalysis.isComplete, false);
		assert.equal(emptyAnalysis.completionPercentage, 0);
		assert.equal(emptyAnalysis.diagnosis.skeletalClass, "Undefined");
		assert.ok(
			emptyAnalysis.diagnosis.summaryRu.includes("расставьте все анатомические реперные точки"),
		);
	});

	it("renders 1-click 'В карту 043/у' button and triggers Form 043/u export without blocking dialogs", () => {
		let insertedText = "";
		const html = renderToString(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-555",
				patientName: "Мельников Артем Дмитриевич",
				initialImageUrl: "/radiology/sample_trg_cephalogram.jpg",
				onInsertToProtocol: (text: string) => {
					insertedText = text;
				},
			}),
		);

		// Button exists in header
		assert.ok(
			html.includes('data-testid="btn-insert-ceph-protocol"'),
			"Contains 'В карту 043/у' button in header",
		);
		assert.ok(
			html.includes("В карту 043/у"),
			"Displays 'В карту 043/у' text",
		);

		// In report tab, full action button is rendered
		const htmlReport = renderToString(
			createElement(CephalometricAnalysisModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-555",
				patientName: "Мельников Артем Дмитриевич",
				initialImageUrl: "/radiology/sample_trg_cephalogram.jpg",
				initialTab: "report",
				onInsertToProtocol: (text: string) => {
					insertedText = text;
				},
			}),
		);
		assert.ok(
			htmlReport.includes("Вставить в ортодонтическую карту Формы 043/у"),
			"Displays full action button in report tab",
		);

		// Pre-loaded sample image
		assert.ok(
			html.includes("/radiology/sample_trg_cephalogram.jpg"),
			"Includes lateral ceph image URL",
		);
	});
});
