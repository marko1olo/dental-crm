import assert from "node:assert/strict";
import { it } from "node:test";
import {
	buildCbctReportData,
	exportCleanViewportSnapshot,
	renderCbctReportHtml,
} from "../../cbctExportEngine";
import { createExportEngineFixtures } from "./exportFixtures";

export function runExportHtmlAndDiaryTests() {
	const {
		mockPose,
		mockHuSampling,
		mockMischResult,
		mockContainment,
		mockNerveSafety,
	} = createExportEngineFixtures();

	it("8. renderCbctReportHtml renders the structured implants table and purges technical toner badges", () => {
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

		assert.ok(!html.includes("Smart White Paper Inversion"));
		assert.ok(html.includes("Структурированная таблица установленных имплантатов"));
		assert.ok(html.includes("Всего запланировано: 3 шт."));

		assert.ok(html.includes("Зуб FDI"));
		assert.ok(html.includes("Система / Бренд"));
		assert.ok(html.includes("Размер (Ø × L)"));
		assert.ok(html.includes("Плотность HU (Misch)"));
		assert.ok(html.includes("Первичный торк"));
		assert.ok(html.includes("Дистанция IAN"));
		assert.ok(html.includes("Безопасность"));

		assert.ok(html.includes("FDI #46"));
		assert.ok(html.includes("Osstem"));
		assert.ok(html.includes("Ø4.0 × 10.0 мм"));
		assert.ok(html.includes("40 Н·см"));
		assert.ok(html.includes("4.0 мм"));
		assert.ok(html.includes("Безопасно"));

		assert.ok(html.includes("FDI #16"));
		assert.ok(html.includes("Straumann"));
		assert.ok(html.includes("Ø4.5 × 8.0 мм"));
		assert.ok(html.includes("N/A (В/Ч)"));

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
			assert.ok(filledTexts.some((t) => t.includes("10 мм")), "Scale bar label should be present");
			assert.ok(
				!filledTexts.some((t) => t.includes("DENTE 3D CBCT Studio • 16-bit DICOM")),
				"Watermark must be suppressed with cleanForReport",
			);
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

		assert.ok(html.includes("font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;"));
		assert.ok(html.includes("line-height: 1.25;"));
		assert.ok(html.includes("diary-card"));
		assert.ok(html.includes("diary-section-header"));
		assert.ok(html.includes("diary-item"));

		assert.ok(!html.includes("font-family: monospace; font-size: 8px;"));

		assert.ok(html.includes("Приказ МЗ РФ № 804н / 043-у"));
		assert.ok(html.includes("1. ВЫБОР И ХАРАКТЕРИСТИКИ ИМПЛАНТАТА:"));
		assert.ok(html.includes("2. АНАТОМИЧЕСКАЯ БЕЗОПАСНОСТЬ И КОНТРОЛЬ НЕРВА (IAN):"));
		assert.ok(html.includes("Система: Osstem (TS III SA)"));
	});
}
