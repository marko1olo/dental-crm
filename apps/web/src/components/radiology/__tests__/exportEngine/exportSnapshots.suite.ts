import assert from "node:assert/strict";
import { it } from "node:test";
import {
	buildCbctReportData,
	exportCleanViewportSnapshot,
	generateCbctPlanningPdfReport,
	renderCbctReportHtml,
} from "../../cbctExportEngine";
import {
	analyzeMischBoneQuality,
	computeHUZoneProfile,
} from "../../boneDensityMischMath";
import type {
	AlveolarContainmentResult,
	NerveSafetyAuditResult,
} from "../../implantSafetyEngine";
import { createExportEngineFixtures } from "./exportFixtures";

export function runExportSnapshotsTests() {
	const {
		mockPose,
		mockHuSampling,
		mockMischResult,
		mockContainment,
		mockNerveSafety,
	} = createExportEngineFixtures();

	it("1. exportCleanViewportSnapshot generates a clean snapshot string with scale metadata", async () => {
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

		assert.equal(reportData.patient.patientName, "Барабаш С.В.");
		assert.equal(reportData.patient.doctorName, "Д-р Иванов А.И.");
		assert.equal(reportData.targetToothFdi, 46);

		assert.equal(reportData.implant.brandName, "Osstem");
		assert.equal(reportData.implant.diameterMm, 4.0);
		assert.equal(reportData.implant.lengthMm, 10.0);
		assert.equal(reportData.implant.angulationDeg, 3.5);

		assert.equal(reportData.bone.mischClass, "D2");
		assert.equal(reportData.bone.overallMeanHU, mockHuSampling.overallMeanHU);
		assert.equal(reportData.bone.residualBuccalBoneMm, 2.1);
		assert.equal(reportData.bone.residualLingualBoneMm, 2.4);
		assert.equal(reportData.bone.ridgeWidthMm, 2.1 + 2.4 + 4.0);
		assert.equal(reportData.bone.requiresGbrAugmentation, false);

		assert.equal(reportData.stability.expectedTorqueNcm, 40);
		assert.equal(reportData.stability.expectedIsq, 75);
		assert.equal(reportData.stability.isImmediateLoadingEligible, true);
		assert.equal(reportData.stability.healingPeriodWeeks, 10);

		assert.ok(reportData.nerve);
		assert.equal(reportData.nerve?.safetyStatus, "safe");
		assert.equal(reportData.nerve?.netClearanceToCanalWallMm, 4.0);

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

		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("@page {"));
		assert.ok(html.includes("size: A4 portrait;"));

		assert.ok(html.includes("Смирнова Е.А."));
		assert.ok(html.includes("ЗУБ FDI #36"));
		assert.ok(html.includes("Стоматологический центр DENTE"));

		assert.ok(html.includes("data:image/png;base64,axial_123"));
		assert.ok(html.includes("data:image/png;base64,pano_123"));
		assert.ok(html.includes("data:image/png;base64,cs_123"));
		assert.ok(html.includes("data:image/png;base64,sag_123"));

		assert.ok(html.includes("Плотность кости (Carl E. Misch)"));
		assert.ok(html.includes("D2"));
		assert.ok(html.includes(`${mockHuSampling.coronalCrestalHU} HU`));
		assert.ok(html.includes(`${mockHuSampling.overallMeanHU} HU`));

		assert.ok(html.includes("Osstem (TS III SA)"));
		assert.ok(html.includes("Ø4.0"));
		assert.ok(html.includes("40 Н·см"));
		assert.ok(html.includes("75 ISQ"));
		assert.ok(html.includes("Немедленная нагрузка"));

		assert.ok(html.includes("Анатомический контроль (N. alveolaris inferior)"));
		assert.ok(html.includes("БЕЗОПАСНО"));

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
		const softSampling = computeHUZoneProfile(280, 190, 220);
		const softMisch = analyzeMischBoneQuality(softSampling, 4.0);

		const softContainment: AlveolarContainmentResult = {
			residualBuccalBoneMm: 1.2,
			residualLingualBoneMm: 2.0,
			isBuccalBoneAdequate: false,
			isLingualBoneAdequate: true,
			isApexContained: true,
			requiresGbrAugmentation: true,
		};

		const softNerveSafety: NerveSafetyAuditResult = {
			distanceToCanalCenterMm: 2.8,
			netClearanceToCanalWallMm: 1.4,
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

	it("6. exportCleanViewportSnapshot supports Smart White Paper Inversion (invertToner / tonerSaving)", async () => {
		let capturedFillStyle = "";
		const mockCanvasWithContext = {
			width: 512,
			height: 512,
			getContext: (type: string) => {
				if (type === "2d") {
					return {
						fillRect: () => {},
						drawImage: () => {},
						measureText: () => ({ width: 100 }),
						beginPath: () => {},
						roundRect: () => {},
						rect: () => {},
						fill: () => {},
						stroke: () => {},
						fillText: () => {},
						save: () => {},
						restore: () => {},
						moveTo: () => {},
						lineTo: () => {},
						set fillStyle(val: string) {
							capturedFillStyle = val;
						},
						get fillStyle() {
							return capturedFillStyle;
						},
						set strokeStyle(_: string) {},
						set lineWidth(_: number) {},
						set font(_: string) {},
						set textAlign(_: string) {},
					};
				}
				return null;
			},
			toDataURL: (type: string) => `data:${type};base64,mock_inverted_data`,
		} as unknown as HTMLCanvasElement;

		const invertedSnap = await exportCleanViewportSnapshot(
			mockCanvasWithContext,
			"Кросс-секция ложа FDI #46",
			0.4,
			{
				patientName: "Барабаш С.В.",
				studyDate: "30.08.2026",
				targetToothFdi: 46,
				invertToner: true,
			},
		);

		assert.ok(typeof invertedSnap === "string");
		assert.ok(invertedSnap.startsWith("data:image/png;base64,"));
	});

	it("7. buildCbctReportData populates structured implantsTable with all required clinical columns", () => {
		const reportData = buildCbctReportData({
			patientName: "Алексеев П.Р.",
			doctorName: "Д-р Смирнов К.В.",
			studyDate: "30.08.2026",
			targetToothFdi: 46,
			implantPose: mockPose,
			mischResult: mockMischResult,
			huSampling: mockHuSampling,
			containment: mockContainment,
			nerveSafety: mockNerveSafety,
			tonerSaving: true,
		});

		assert.ok(reportData.implantsTable);
		assert.equal(reportData.implantsTable.length, 1);
		const row = reportData.implantsTable[0]!;

		assert.equal(row.toothFdi, 46);
		assert.equal(row.brandName, "Osstem");
		assert.equal(row.lineName, "TS III SA");
		assert.equal(row.diameterMm, 4.0);
		assert.equal(row.lengthMm, 10.0);
		assert.equal(row.mischClass, "D2");
		assert.equal(row.boneDensityHU, mockHuSampling.overallMeanHU);
		assert.equal(row.expectedTorqueNcm, 40);
		assert.equal(row.distanceToIanMm, 4.0);
		assert.equal(row.ianSafetyStatus, "safe");
		assert.equal(reportData.tonerSavingEnabled, true);
	});
}
