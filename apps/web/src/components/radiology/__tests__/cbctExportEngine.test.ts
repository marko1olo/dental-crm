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
	performCbctPlanningAudit,
	generateForm043CbctDiary,
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
		assert.ok(html.includes("40 Н·см"));
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

		// Required columns
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

	it("8. renderCbctReportHtml renders the structured implants table and Smart Toner Saving badge", () => {
		const reportData = buildCbctReportData({
			patientName: "Васильев М.И.",
			doctorName: "Д-р Кузнецов",
			studyDate: "30.08.2026",
			targetToothFdi: 46,
			implantPose: mockPose,
			mischResult: mockMischResult,
			huSampling: mockHuSampling,
			containment: mockContainment,
			nerveSafety: mockNerveSafety,
			additionalImplants: [
				{
					toothFdi: 16,
					brandName: "Straumann",
					lineName: "BLX Roxolid SLActive",
					diameterMm: 4.5,
					lengthMm: 8.0,
					mischClass: "D3",
					boneDensityHU: 520,
					expectedTorqueNcm: 30,
					minTorqueNcm: 25,
					maxTorqueNcm: 35,
					distanceToIanMm: undefined,
					ianSafetyStatus: "na",
					immediateLoading: false,
				},
				{
					toothFdi: 36,
					brandName: "Nobel Biocare",
					lineName: "NobelActive",
					diameterMm: 4.3,
					lengthMm: 11.5,
					mischClass: "D1",
					boneDensityHU: 1350,
					expectedTorqueNcm: 50,
					minTorqueNcm: 45,
					maxTorqueNcm: 60,
					distanceToIanMm: 1.2,
					ianSafetyStatus: "warning",
					immediateLoading: true,
				},
			],
		});

		const html = renderCbctReportHtml(reportData, { tonerSaving: true });

		// Toner Saving Badge
		assert.ok(html.includes("Экономия тонера (Smart White Paper Inversion)"));

		// Structured Implants Table Title
		assert.ok(html.includes("Структурированная таблица установленных имплантатов"));
		assert.ok(html.includes("Всего запланировано: 3 шт."));

		// Columns headers
		assert.ok(html.includes("Зуб FDI"));
		assert.ok(html.includes("Система / Бренд"));
		assert.ok(html.includes("Размер (Ø × L)"));
		assert.ok(html.includes("Плотность HU (Misch)"));
		assert.ok(html.includes("Первичный торк"));
		assert.ok(html.includes("Дистанция IAN"));
		assert.ok(html.includes("Безопасность"));

		// Primary Implant #46
		assert.ok(html.includes("FDI #46"));
		assert.ok(html.includes("Osstem"));
		assert.ok(html.includes("Ø4.0 × 10.0 мм"));
		assert.ok(html.includes("40 Н·см"));
		assert.ok(html.includes("4.0 мм"));
		assert.ok(html.includes("Безопасно"));

		// Maxillary Implant #16 (N/A for IAN)
		assert.ok(html.includes("FDI #16"));
		assert.ok(html.includes("Straumann"));
		assert.ok(html.includes("Ø4.5 × 8.0 мм"));
		assert.ok(html.includes("N/A (В/Ч)"));

		// Mandibular Implant #36 (Warning for IAN)
		assert.ok(html.includes("FDI #36"));
		assert.ok(html.includes("Nobel Biocare"));
		assert.ok(html.includes("Ø4.3 × 11.5 мм"));
		assert.ok(html.includes("1.2 мм"));
		assert.ok(html.includes("Внимание"));
	});

	it("9. exportCleanViewportSnapshot with cleanForReport suppresses raster UI text overlays while keeping scale bar", async () => {
		const filledTexts: string[] = [];
		const mockCanvas = {
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
						fillText: (text: string) => {
							filledTexts.push(text);
						},
						save: () => {},
						restore: () => {},
						moveTo: () => {},
						lineTo: () => {},
						set fillStyle(_: string) {},
						get fillStyle() {
							return "#000000";
						},
						set strokeStyle(_: string) {},
						set lineWidth(_: number) {},
						set font(_: string) {},
						set textAlign(_: string) {},
					};
				}
				return null;
			},
			toDataURL: (type: string) => `data:${type};base64,mock_clean_for_report`,
		} as unknown as HTMLCanvasElement;

		const globalScope = globalThis as unknown as { document?: unknown };
		const prevDoc = globalScope.document;
		globalScope.document = {
			createElement: (tag: string) => (tag === "canvas" ? mockCanvas : {}),
		};

		try {
			const cleanSnap = await exportCleanViewportSnapshot(
				mockCanvas,
				"Кросс-секция ложа FDI #46",
				0.4,
				{
					patientName: "Барабаш С.В.",
					studyDate: "30.08.2026",
					targetToothFdi: 46,
					invertToner: true,
					cleanForReport: true,
				},
			);

			assert.ok(cleanSnap.startsWith("data:image/png;base64,"));
			// Verify scale bar label IS rendered
			assert.ok(filledTexts.some((t) => t.includes("10 мм")), "Scale bar label should be present");
			// Verify watermark is NOT rendered
			assert.ok(
				!filledTexts.some((t) => t.includes("DENTE 3D CBCT Studio • 16-bit DICOM")),
				"Watermark must be suppressed with cleanForReport",
			);
			// Verify top-left patient text is NOT rendered
			assert.ok(
				!filledTexts.some((t) => t.includes("Пациент:")),
				"Patient metadata badge must be suppressed with cleanForReport",
			);
		} finally {
			globalScope.document = prevDoc;
		}
	});

	it("10. renderCbctReportHtml renders Form 043/u diary with proportional medical typography", () => {
		const diarySample = [
			"============================================================",
			"ПРОТОКОЛ ОПЕРАЦИИ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ (ФОРМА 043/У)",
			"Пациент: Барабаш С.В. | Клиника: Стоматологический центр DENTE | Зуб: FDI #46",
			"============================================================",
			"1. ВЫБОР И ХАРАКТЕРИСТИКИ ИМПЛАНТАТА:",
			"   - Система: Osstem (TS III SA)",
			"   - Артикул: TS3S4010S",
			"   - Размеры: Ø 4.0 x 10.0 мм",
			"",
			"2. АНАТОМИЧЕСКАЯ БЕЗОПАСНОСТЬ И КОНТРОЛЬ НЕРВА (IAN):",
			"   - Дистанция до нижнечелюстного канала: 4.0 мм",
			"   - Статус безопасности: СОБЛЮДЕН (>=2.0 мм)",
			"",
			"4. ЗАКЛЮЧЕНИЕ И ПЛАН ЛЕЧЕНИЯ:",
			"   - Допуск к операции: ОДОБРЕНО К УСТАНОВКЕ",
		].join("\n");

		const reportData = buildCbctReportData({
			patientName: "Барабаш С.В.",
			clinicName: "Стоматологический центр DENTE",
			targetToothFdi: 46,
			implantPose: mockPose,
			mischResult: mockMischResult,
			huSampling: mockHuSampling,
			containment: mockContainment,
			nerveSafety: mockNerveSafety,
			diary043Text: diarySample,
		});

		const html = renderCbctReportHtml(reportData);

		// Proportional medical typography
		assert.ok(html.includes("font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;"));
		assert.ok(html.includes("font-size: 9px;"));
		assert.ok(html.includes("line-height: 1.35;"));
		assert.ok(html.includes("diary-card"));
		assert.ok(html.includes("diary-section-header"));
		assert.ok(html.includes("diary-item"));

		// Must NOT contain terminal monospace dump for diary
		assert.ok(!html.includes("font-family: monospace; font-size: 8px;"));

		// Form 043/u badge & sections
		assert.ok(html.includes("Приказ МЗ РФ № 804н / 043-у"));
		assert.ok(html.includes("1. ВЫБОР И ХАРАКТЕРИСТИКИ ИМПЛАНТАТА:"));
		assert.ok(html.includes("2. АНАТОМИЧЕСКАЯ БЕЗОПАСНОСТЬ И КОНТРОЛЬ НЕРВА (IAN):"));
		assert.ok(html.includes("Система: Osstem (TS III SA)"));
	});

	it("11. performCbctPlanningAudit outputs exact template with patient and clinic names without typo", () => {
		const mockCanal: MandibularCanalCrossSection = {
			center: { x: 2.0, y: 16.5 },
			radiusMm: 1.5,
			safetyMarginMm: 2.0,
		};
		const mockEnvelope = {
			crestPoint: { x: 0, y: 2.0 },
			basePoint: { x: 0, y: 20.0 },
			buccalCrestPoint: { x: -4.0, y: 2.0 },
			lingualCrestPoint: { x: 4.5, y: 2.0 },
			ridgeWidthMm: 8.5,
			ridgeHeightMm: 18.0,
		};

		// Default fallback
		const defaultAudit = performCbctPlanningAudit({
			toothFdi: 46,
			implantPose: mockPose,
			canal: mockCanal,
			envelope: mockEnvelope,
			huSampling: mockHuSampling,
		});

		assert.ok(defaultAudit.form043DiaryText.includes("Пациент: Барабаш С.В. | Клиника: Стоматологический центр DENTE"));
		assert.ok(!defaultAudit.form043DiaryText.includes("Барабаш клиники"));

		// Custom names
		const customAudit = performCbctPlanningAudit({
			toothFdi: 46,
			implantPose: mockPose,
			canal: mockCanal,
			envelope: mockEnvelope,
			huSampling: mockHuSampling,
			patientName: "Иванов И.И.",
			clinicName: "Клиника ДЕНТЕ ПЛЮС",
		});

		assert.ok(customAudit.form043DiaryText.includes("Пациент: Иванов И.И. | Клиника: Клиника ДЕНТЕ ПЛЮС | Зуб: FDI #46"));
	});

	it("12. DEF-19.1: Enforces guaranteed 1-page A4 print layout rules and 110px MPR height", () => {
		const reportData = buildCbctReportData({
			patientName: "Барабаш С.В.",
			targetToothFdi: 46,
			implantPose: mockPose,
			mischResult: mockMischResult,
			huSampling: mockHuSampling,
			containment: mockContainment,
			nerveSafety: mockNerveSafety,
		});

		const html = renderCbctReportHtml(reportData);

		// A4 print page geometry: margin 6mm 8mm
		assert.ok(html.includes("size: A4 portrait;"));
		assert.ok(html.includes("margin: 6mm 8mm;"));

		// Single-page containment CSS
		assert.ok(html.includes(".cbct-report-page"));
		assert.ok(html.includes("max-height: 275mm"));
		assert.ok(html.includes("page-break-inside: avoid"));

		// @media print block
		assert.ok(html.includes("@media print"));

		// MPR card height reduced from 140px to 110px
		assert.ok(html.includes("height: 110px;"));
		assert.ok(!html.includes("height: 140px;"));

		// Wrapper element has cbct-report-page class
		assert.ok(html.includes('<div class="page cbct-report-page">'));
	});

	it("13. DEF-19.2: Strict medical blank without informal emojis", () => {
		const audit = performCbctPlanningAudit({
			toothFdi: 46,
			implantPose: mockPose,
			canal: { center: { x: 0, y: 17.0 }, radiusMm: 1.5, safetyMarginMm: 2.0 }, // warning proximity
			envelope: { crestPoint: { x: 0, y: 2 }, basePoint: { x: 0, y: 20 }, buccalCrestPoint: { x: -4, y: 2 }, lingualCrestPoint: { x: 4, y: 2 }, ridgeWidthMm: 8, ridgeHeightMm: 18 },
			huSampling: mockHuSampling,
		});

		// Diary generated by performCbctPlanningAudit must be clean of emojis
		assert.ok(!audit.form043DiaryText.includes("🏥"));
		assert.ok(!audit.form043DiaryText.includes("⚠️"));
		assert.ok(!audit.form043DiaryText.includes("⛔"));
		assert.ok(!audit.form043DiaryText.includes("✅"));
		assert.ok(audit.form043DiaryText.includes("ПРОТОКОЛ ОПЕРАЦИИ ДЕНТАЛЬНОЙ ИМПЛАНТАЦИИ (ФОРМА 043/У)"));
		assert.ok(audit.form043DiaryText.includes("ВНИМАНИЕ: ЗОНА ПРИБЛИЖЕНИЯ К НЕРВУ"));

		const reportData = buildCbctReportData({
			patientName: "Барабаш С.В.",
			targetToothFdi: 46,
			implantPose: mockPose,
			mischResult: mockMischResult,
			huSampling: mockHuSampling,
			containment: mockContainment,
			nerveSafety: mockNerveSafety,
			diary043Text: audit.form043DiaryText,
			tonerSaving: true,
		});

		const html = renderCbctReportHtml(reportData, { tonerSaving: true });

		// Toner badge: clean text
		assert.ok(html.includes("Экономия тонера (Smart White Paper Inversion)"));
		assert.ok(!html.includes("🌱"));

		// Title & Warning: clean text
		assert.ok(!html.includes("🏥"));
		assert.ok(!html.includes("⚠️"));
		assert.ok(!html.includes("⛔"));
		assert.ok(!html.includes("✅"));
		assert.ok(!html.includes("🚀"));
		assert.ok(!html.includes("🌟"));
	});

	it("14. DEF-19.3: Unifies torque units to canonical Russian Н·см (GOST 8.417-2002)", () => {
		const reportData = buildCbctReportData({
			patientName: "Барабаш С.В.",
			targetToothFdi: 46,
			implantPose: mockPose,
			mischResult: mockMischResult,
			huSampling: mockHuSampling,
			containment: mockContainment,
			nerveSafety: mockNerveSafety,
		});

		const html = renderCbctReportHtml(reportData);

		// Russian unit is present
		assert.ok(html.includes("40 Н·см"));

		// English unit N·cm is strictly absent from generated protocol
		assert.ok(!html.includes("N·cm"));
	});

	it("15. DEF-19.4: Outputs operating surgeon name and clinical title in footer", () => {
		// Case A: Default surgeon name
		const defaultReport = buildCbctReportData({
			patientName: "Барабаш С.В.",
			targetToothFdi: 46,
			implantPose: mockPose,
			mischResult: mockMischResult,
			huSampling: mockHuSampling,
			containment: mockContainment,
			nerveSafety: mockNerveSafety,
		});

		const defaultHtml = renderCbctReportHtml(defaultReport);
		assert.ok(defaultHtml.includes("Врач-стоматолог-хирург-имплантолог: Барабаш С.В."));

		// Case B: Custom doctorName passed in props
		const customReport = buildCbctReportData({
			patientName: "Сидоров К.М.",
			doctorName: "Д-р Иванов А.И.",
			targetToothFdi: 46,
			implantPose: mockPose,
			mischResult: mockMischResult,
			huSampling: mockHuSampling,
			containment: mockContainment,
			nerveSafety: mockNerveSafety,
		});

		const customHtml = renderCbctReportHtml(customReport);
		assert.ok(customHtml.includes("Врач-стоматолог-хирург-имплантолог: Д-р Иванов А.И."));
	});
});

