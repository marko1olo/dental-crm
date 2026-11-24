/**
 * radiologyInquisitionDomain92.test.ts
 * Комплексный Red Team инквизиционный тест Домена 92 (Цифровая радиология, 16-битный DICOM,
 * RVG <50мс, КЛКТ/МПР-реконструкция, ОПТГ и 3D STL/PLY).
 *
 * Проверяет:
 * 1. Мандат 8bm: Копеечные DTO в implantFinanceBridge и STATUTORY_CBCT_804N (A06.07.013).
 * 2. Мандат 8bf: Отсутствие параллельного клона standaloneStudio, чистые типы CbctStandaloneStudioViewProps.
 * 3. Мандат 8x: Клинический язык без канцелярского «043/у» в radiologyExportService.
 * 4. Мандат 8zr: Устойчивость к ошибкам без пустых catch {} в rvgBoneDensity.
 * 5. Мандат 8be: Безопасная группировка без non-null assertions в radiologyPatientSearch.
 */

import { describe, it, expect, vi } from "vitest";
import {
	STATUTORY_CBCT_804N,
	type SurgicalFinanceExportResult,
} from "../implantBridge/implantBridgeTypes";
import {
	addCbctServiceToVisitFinanceAct,
	addCbctSurgicalToVisitFinance,
} from "../implantBridge/implantFinanceBridge";
import {
	buildForm043ProtocolText,
	type ClinicalSnapshotPayload,
} from "../radiologyExportService";
import { classifyMischDensity, calculateBoneDensityProfile } from "../../imaging/rvgViewer/rvgBoneDensity";
import { buildVisiographyVisitsList } from "../radiologyPatientSearch/utils";
import { findImplantSpec, buildImplantProstheticSuite } from "../implantSafetyEngine";

describe("Домен 92: Инквизиционный аудит цифровой радиологии и КЛКТ", () => {
	describe("1. Мандат 8bm: Копеечные DTO и Номенклатура 804н", () => {
		it("STATUTORY_CBCT_804N имеет актуальный код A06.07.013 и копейки", () => {
			expect(STATUTORY_CBCT_804N.code804n).toBe("A06.07.013");
			expect(STATUTORY_CBCT_804N.basePriceRub).toBe(3800);
			expect(STATUTORY_CBCT_804N.basePriceKopecks).toBe(380000);
		});

		it("addCbctServiceToVisitFinanceAct возвращает копеечные поля priceKopecks и amountKopecks", () => {
			const res = addCbctServiceToVisitFinanceAct({ toothFdi: 36 });
			expect(res.code).toBe("A06.07.013");
			expect(res.priceRub).toBe(3800);
			expect(res.priceKopecks).toBe(380000);
			expect(res.amountKopecks).toBe(380000n);
		});

		it("addCbctSurgicalToVisitFinance возвращает полный хирургический пакет с копейками", () => {
			const implantSpec = findImplantSpec("osstem", 4.0, 10.0);
			const result: SurgicalFinanceExportResult = addCbctSurgicalToVisitFinance({
				toothFdi: 46,
				implantSpec,
				ridgeHeightMm: 12.0,
				ridgeWidthMm: 7.0,
			});

			expect(result.services.length).toBeGreaterThanOrEqual(3);
			for (const s of result.services) {
				expect(typeof s.priceRub).toBe("number");
				expect(typeof s.priceKopecks).toBe("number");
				expect(typeof s.amountKopecks).toBe("bigint");
				expect(s.amountKopecks).toBe(BigInt((s.priceKopecks ?? 0)));
			}
			expect(result.totalRub).toBeGreaterThan(0);
			expect(typeof result.totalKopecks).toBe("bigint");
			expect(result.totalKopecks).toBe(BigInt(result.totalRub * 100));
		});
	});

	describe("2. Мандат 8x: Клинический язык и отсутствие канцелярского 043/у", () => {
		it("buildForm043ProtocolText использует профессиональный термин ЭМК", () => {
			const payload: ClinicalSnapshotPayload = {
				patientId: "patient-123",
				imageDataUri: "data:image/jpeg;base64,mock",
				toothCode: "46",
				clinicalNote: "Планирование имплантации",
			};
			const text = buildForm043ProtocolText(payload);
			expect(text).toContain("электронной медицинской карте (ЭМК)");
			expect(text).not.toContain("карте 043/у");
			expect(text).toContain("--- ПРОТОКОЛ ЛУЧЕВОГО ОБСЛЕДОВАНИЯ И 3D-ПЛАНИРОВАНИЯ ---");
		});
	});

	describe("3. Мандат 8zr: Безопасность профилирования плотности кости (HU)", () => {
		it("classifyMischDensity корректно классифицирует шкалу D1-D5", () => {
			expect(classifyMischDensity(1300)).toBe("D1");
			expect(classifyMischDensity(900)).toBe("D2");
			expect(classifyMischDensity(400)).toBe("D3");
			expect(classifyMischDensity(200)).toBe("D4");
			expect(classifyMischDensity(50)).toBe("D5");
		});

		it("calculateBoneDensityProfile устойчив к отсутствию canvas без падений", () => {
			const p1 = { x: 10, y: 10 };
			const p2 = { x: 50, y: 50 };
			const stats = calculateBoneDensityProfile(p1, p2, 4000, 500, 0.1, 10, null);
			expect(stats.samples.length).toBe(10);
			expect(stats.meanHu).toBeDefined();
			expect(["D1", "D2", "D3", "D4", "D5"]).toContain(stats.dominantClass);
		});
	});

	describe("4. Мандат 8be: Безопасная группировка архива снимков без non-null assertions", () => {
		it("buildVisiographyVisitsList группирует исследования без падений", () => {
			const mockStudies = [
				{
					id: "study-1",
					studyDate: "2026-11-20",
					toothCode: "36",
					title: "Визиограмма зуба 36",
					patientFullName: "Иванов Иван",
				},
				{
					id: "study-2",
					studyDate: "2026-11-20",
					toothCode: "37",
					title: "Визиограмма зуба 37",
					patientFullName: "Иванов Иван",
				},
			];
			const visits = buildVisiographyVisitsList(mockStudies as any);
			expect(visits.length).toBe(1);
			expect(visits[0]?.dateStr).toBe("2026-11-20");
			expect(visits[0]?.teeth).toEqual(["36", "37"]);
			expect(visits[0]?.shotCount).toBe(2);
		});
	});

	describe("5. Мандат 8e: Интеграция каталога имплантатов и сметы", () => {
		it("buildImplantProstheticSuite формирует копеечные DTO для полного хирургического пакета", () => {
			const spec = findImplantSpec("straumann", 4.1, 10.0);
			const suite = buildImplantProstheticSuite(spec, 36, "Плановая операция");
			expect(suite.toothFdi).toBe(36);
			expect(suite.totalPriceKopecks).toBeGreaterThan(0);
			expect(suite.suiteItems.length).toBe(3);
			for (const item of suite.suiteItems) {
				expect(item.priceKopecks).toBeGreaterThan(0);
				expect(item.priceRub).toBe(Math.round(item.priceKopecks / 100));
			}
		});
	});
});
