import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildCbctReportData,
	exportCleanViewportSnapshot,
	generateCbctPlanningPdfReport,
	renderCbctReportHtml,
	type CbctReportData,
} from "../cbctExportEngine";
import {
	analyzeMischBoneQuality,
	computeHUZoneProfile,
} from "../boneDensityMischMath";
import {
	findImplantSpec,
	type CrossSectionImplantPose,
	type MandibularCanalCrossSection,
	type AlveolarContainmentResult,
	type NerveSafetyAuditResult,
} from "../implantSafetyEngine";

describe("CBCT Clinical Export & EMR Planning Report Engine Suite", () => {
	const mockSpec = findImplantSpec("osstem", 4.0, 10.0);

	const mockPose: CrossSectionImplantPose = {
		entryPoint: { x: 0, y: 2.0 },
		angulationDeg: 3.5,
		implantSpec: mockSpec,
		targetToothFdi: 46,
	};

	const mockHuSampling = computeHUZoneProfile(1150, 720, 950);
	const mockMischResult = analyzeMischBoneQuality(mockHuSampling, 4.0);

	const mockContainment: AlveolarContainmentResult = {
		residualBuccalBoneMm: 2.1,
		residualLingualBoneMm: 2.4,
		isBuccalBoneAdequate: true,
		isLingualBoneAdequate: true,
		isApexContained: true,
		requiresGbrAugmentation: false,
	};

	const mockNerveSafety: NerveSafetyAuditResult = {
		distanceToCanalCenterMm: 5.4,
		netClearanceToCanalWallMm: 4.0,
		netClearanceToSafetyCorridorMm: 2.0,
		safetyStatus: "safe",
		isDangerous: false,
		isWarning: false,
		shouldTriggerAudioAlarm: false,
		closestImplantPoint: { x: 0, y: 12.0 },
		closestNervePoint: { x: 2.0, y: 16.5 },
		clinicalMessageRu: "Безопасный отступ до нижнечелюстного канала (4.0 мм)",
	};

	it("1. exportCleanViewportSnapshot generates a clean snapshot string with scale metadata", async () => {
		// Mock canvas object
		const mockCanvas = {
			width: 512,
			height: 512,
			getContext: () => null,
			toDataURL: (type: string) => `data:${type};base64,iVBORw0KGgoAAAANSUhEUgAA`,
		} as unknown as HTMLCanvasElement;

		const snapshot = await exportCleanViewportSnapshot(
			mockCanvas,
			"Аксиальный срез (Z = -2.4 мм)",
			0.4,
			{
				patientName: "Барабаш С.В.",
				studyDate: "30.08.2026",
				targetToothFdi: 46,
				customScaleBarLengthMm: 10,
			},
		);

		assert.ok(typeof snapshot === "string");
		assert.ok(snapshot.startsWith("data:image/png;base64,"));
	});

	it("2. buildCbctReportData correctly constructs comprehensive clinical report data", () => {
		const reportData = buildCbctReportData({
			patientName: "Барабаш С.В.",
			doctorName: "Д-р Иванов А.И.",
			studyDate: "30.08.2026",
			targetToothFdi: 46,
			implantPose: mockPose,
			mischResult: mockMischResult,
			huSampling: mockHuSampling,
			containment: mockContainment,
			nerveSafety: mockNerveSafety,
			snapshots: {
				axial: { title: "Аксиальный срез", dataUrl: "data:image/png;base64,axial_mock" },
				crossSection: { title: "Кросс-секция FDI #46", dataUrl: "data:image/png;base64,cs_mock" },
			},
			diary043Text: "Дневник визита 043/у: Планирование имплантата Osstem 4.0x10.0 мм",
		});

		// Verify Patient Info
		assert.equal(reportData.patient.patientName, "Барабаш С.В.");
		assert.equal(reportData.patient.doctorName, "Д-р Иванов А.И.");
		assert.equal(reportData.targetToothFdi, 46);

		// Verify Implant Specs
		assert.equal(reportData.implant.brandName, "Osstem");
		assert.equal(reportData.implant.diameterMm, 4.0);
		assert.equal(reportData.implant.lengthMm, 10.0);
		assert.equal(reportData.implant.angulationDeg, 3.5);

		// Verify Bone Data
		assert.equal(reportData.bone.mischClass, "D2");
		assert.equal(reportData.bone.overallMeanHU, mockHuSampling.overallMeanHU);
		assert.equal(reportData.bone.residualBuccalBoneMm, 2.1);
		assert.equal(reportData.bone.residualLingualBoneMm, 2.4);
		assert.equal(reportData.bone.ridgeWidthMm, 2.1 + 2.4 + 4.0); // 8.5 mm
		assert.equal(reportData.bone.requiresGbrAugmentation, false);

		// Verify Biomechanical Stability Predictions
		assert.equal(reportData.stability.expectedTorqueNcm, 40);
		assert.equal(reportData.stability.expectedIsq, 75);
		assert.equal(reportData.stability.isImmediateLoadingEligible, true);
		assert.equal(reportData.stability.healingPeriodWeeks, 10);

		// Verify Nerve Safety
		assert.ok(reportData.nerve);
		assert.equal(reportData.nerve?.safetyStatus, "safe");
		assert.equal(reportData.nerve?.netClearanceToCanalWallMm, 4.0);

		// Verify Snapshots
		assert.equal(reportData.snapshots.axial?.dataUrl, "data:image/png;base64,axial_mock");
		assert.equal(reportData.snapshots.crossSection?.dataUrl, "data:image/png;base64,cs_mock");
	});

	it("3. renderCbctReportHtml produces complete magazine-grade A4 printable markup", () => {
		const reportData = buildCbctReportData({
			patientName: "Смирнова Е.А.",
			doctorName: "Врач-хирург-имплантолог",
			studyDate: "30.08.2026",
			targetToothFdi: 36,
			implantPose: {
				...mockPose,
				targetToothFdi: 36,
			},
			mischResult: mockMischResult,
			huSampling: mockHuSampling,
			containment: mockContainment,
			nerveSafety: mockNerveSafety,
			snapshots: {
				axial: { title: "Аксиальный срез", dataUrl: "data:image/png;base64,axial_123" },
				panoramic: { title: "ОПТГ", dataUrl: "data:image/png;base64,pano_123" },
				crossSection: { title: "Кросс-секция", dataUrl: "data:image/png;base64,cs_123" },
				sagittal: { title: "Сагиттальный срез", dataUrl: "data:image/png;base64,sag_123" },
			},
			diary043Text: "Готовая запись для амбулаторной карты 043/у",
		});

		const html = renderCbctReportHtml(reportData);

		// Document integrity
		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("@page {"));
		assert.ok(html.includes("size: A4 portrait;"));

		// Patient & Clinic
		assert.ok(html.includes("Смирнова Е.А."));
		assert.ok(html.includes("ЗУБ FDI #36"));
		assert.ok(html.includes("Стоматологический центр DENTE"));

		// 4-Slice MPR Matrix images
		assert.ok(html.includes("data:image/png;base64,axial_123"));
		assert.ok(html.includes("data:image/png;base64,pano_123"));
		assert.ok(html.includes("data:image/png;base64,cs_123"));
		assert.ok(html.includes("data:image/png;base64,sag_123"));

		// Carl Misch Bone Quality Table
		assert.ok(html.includes("Плотность кости (Carl E. Misch)"));
		assert.ok(html.includes("D2"));
		assert.ok(html.includes(`${mockHuSampling.coronalCrestalHU} HU`));
		assert.ok(html.includes(`${mockHuSampling.overallMeanHU} HU`));

		// Implant & Biomechanics Table
		assert.ok(html.includes("Osstem (TS III SA)"));
		assert.ok(html.includes("Ø4.0"));
		assert.ok(html.includes("40 N·cm"));
		assert.ok(html.includes("75 ISQ"));
		assert.ok(html.includes("Немедленная нагрузка"));

		// Mandibular Nerve Clearance
		assert.ok(html.includes("Анатомический контроль (N. alveolaris inferior)"));
		assert.ok(html.includes("БЕЗОПАСНО"));

		// Signatures
		assert.ok(html.includes("Оперирующий хирург-имплантолог:"));
		assert.ok(html.includes("Врач-рентгенолог / КЛКТ-диагност:"));
	});

	it("4. generateCbctPlanningPdfReport returns valid non-empty Blob", async () => {
		const reportData = buildCbctReportData({
			patientName: "Барабаш С.В.",
			targetToothFdi: 46,
			implantPose: mockPose,
			mischResult: mockMischResult,
			huSampling: mockHuSampling,
			containment: mockContainment,
			nerveSafety: mockNerveSafety,
		});

		const blob = await generateCbctPlanningPdfReport(reportData);
		assert.ok(blob instanceof Blob);
		assert.ok(blob.size > 500);
	});

	it("5. Correctly handles Soft Bone D4 with under-drilling and two-stage protocol", () => {
		const softSampling = computeHUZoneProfile(280, 190, 220); // ~220 HU -> D4
		const softMisch = analyzeMischBoneQuality(softSampling, 4.0);

		const softContainment: AlveolarContainmentResult = {
			residualBuccalBoneMm: 1.2, // < 1.5mm -> requires GBR
			residualLingualBoneMm: 2.0,
			isBuccalBoneAdequate: false,
			isLingualBoneAdequate: true,
			isApexContained: true,
			requiresGbrAugmentation: true,
		};

		const softNerveSafety: NerveSafetyAuditResult = {
			distanceToCanalCenterMm: 2.8,
			netClearanceToCanalWallMm: 1.4, // 1.0..2.0 mm -> Warning
			netClearanceToSafetyCorridorMm: -0.6,
			safetyStatus: "warning",
			isDangerous: false,
			isWarning: true,
			shouldTriggerAudioAlarm: true,
			closestImplantPoint: { x: 0, y: 12.0 },
			closestNervePoint: { x: 2.0, y: 14.5 },
			clinicalMessageRu: "Внимание: приближение к буферной зоне нерва (1.4 мм)",
		};

		const reportData = buildCbctReportData({
			patientName: "Ковалев Н.Д.",
			targetToothFdi: 16,
			implantPose: mockPose,
			mischResult: softMisch,
			huSampling: softSampling,
			containment: softContainment,
			nerveSafety: softNerveSafety,
		});

		assert.equal(reportData.bone.mischClass, "D4");
		assert.equal(reportData.bone.requiresGbrAugmentation, true);
		assert.equal(reportData.stability.underdrillingRecommended, true);
		assert.equal(reportData.stability.isImmediateLoadingEligible, false);
		assert.equal(reportData.stability.expectedTorqueNcm, 20);
		assert.equal(reportData.nerve?.safetyStatus, "warning");

		const html = renderCbctReportHtml(reportData);
		assert.ok(html.includes("D4"));
		assert.ok(html.includes("Требуется аугментация"));
		assert.ok(html.includes("Двухэтапный протокол"));
		assert.ok(html.includes("ВНИМАНИЕ"));
	});
});
