import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PriceItemEditModal } from "../PriceItemEditModal";
import { PricesCatalogTable } from "../PricesCatalogTable";
import { PricesFilterToolbar } from "../PricesFilterToolbar";
import type { ServiceEditFormData } from "../types";

describe("PricesCatalog Modular Architecture & Mandate 8b <= 120 lines", () => {
	const currentDir = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
	const stylesDir = path.resolve(currentDir, "../styles");
	const catalogStylesDir = path.resolve(stylesDir, "catalogStyles");

	it("pricesCatalog.css facade exists, is strictly <= 30 lines and imports all 8 modules", () => {
		const facadePath = path.resolve(stylesDir, "pricesCatalog.css");
		expect(fs.existsSync(facadePath)).toBe(true);

		const content = fs.readFileSync(facadePath, "utf-8");
		const lines = content.split("\n");
		expect(lines.length).toBeLessThanOrEqual(30);

		const expectedModules = [
			"pricesCatalogLayout.css",
			"pricesSearchAndFilters.css",
			"pricesCategoriesNav.css",
			"pricesServiceRows.css",
			"pricesItemActions.css",
			"pricesTechnologicalMap.css",
			"pricesModalEditor.css",
			"pricesMobileCatalog.css",
		];

		for (const mod of expectedModules) {
			expect(content).toContain(mod);
		}
	});

	it("each catalog style micro-module strictly obeys Mandate 8b (<= 120 lines)", () => {
		const expectedModules = [
			"pricesCatalogLayout.css",
			"pricesSearchAndFilters.css",
			"pricesCategoriesNav.css",
			"pricesServiceRows.css",
			"pricesItemActions.css",
			"pricesTechnologicalMap.css",
			"pricesModalEditor.css",
			"pricesMobileCatalog.css",
		];

		for (const mod of expectedModules) {
			const modPath = path.resolve(catalogStylesDir, mod);
			expect(fs.existsSync(modPath)).toBe(true);
			const lines = fs.readFileSync(modPath, "utf-8").split("\n");
			expect(lines.length).toBeLessThanOrEqual(120);
		}
	});
});

describe("PricesFilterToolbar — Clinical Language & Apple HIG (Mandates 8x, 8ap, HIG)", () => {
	it("renders quick filter chips and search toolbar without bureaucratic 804n jargon in UI", () => {
		const html = renderToString(
			<PricesFilterToolbar
				selectedCategoryFilter="all"
				onSelectCategoryFilter={() => {}}
				searchQuery=""
				onSearchChange={() => {}}
				isCodesMenuOpen={false}
				isSeedingBaseline={false}
				onExportCsv={() => {}}
				isNativeScannerDropzoneOpen={false}
				onToggleNativeScannerDropzone={() => {}}
				onOpenServicePricelistModal={() => {}}
				onOpenNewServiceModal={() => {}}
			/>,
		);

		// Category quick chips (Apple HIG)
		expect(html).toContain("Все");
		expect(html).toContain("Терапия");
		expect(html).toContain("Хирургия");
		expect(html).toContain("Ортопедия");

		// Action buttons with clean clinical Russian (no raw 804n in button text)
		expect(html).toContain("Добавить услугу");
		expect(html).toContain("Печать А4");
		expect(html).toContain("Экспорт CSV");
		expect(html).toContain("Справочник услуг");

		// Search input placeholder
		expect(html).toContain("Поиск по услугам или коду...");
	});
});

describe("PricesCatalogTable — Render and Empty States", () => {
	it("renders empty state with seed standard catalog CTA when catalog is empty", () => {
		const html = renderToString(
			<PricesCatalogTable
				groupedCatalog={{}}
				categoryLimits={{}}
				setCategoryLimits={() => {}}
				serviceCategoryLabels={{}}
				specialtyLabels={{}}
				deletingServiceId={null}
				onEditService={() => {}}
				onDeleteService={() => {}}
				searchQuery=""
				selectedCategoryFilter="all"
				onResetFilters={() => {}}
				isSeedingBaseline={false}
				onSeedBaseline={() => {}}
				onAddNewService={() => {}}
				onOpenScannerDropzone={() => {}}
			/>,
		);

		expect(html).toContain("Каталог услуг пуст");
		expect(html).toContain("pricelist-seed-standard-catalog-btn");
		expect(html).toContain("Заполнить базовый прейскурант (30 услуг)");
	});

	it("renders grouped services with tabular prices and action buttons", () => {
		const mockCatalog: Record<string, any[]> = {
			therapy: [
				{
					id: "srv-1",
					organizationId: "org-1",
					title: "Лечение кариеса",
					code: "A16.07.002",
					category: "therapy",
					basePriceRub: 3500,
					specialty: "therapist",
					durationMinutes: 45,
					isActive: true,
					active: true,
					aliases: [],
				},
			],
		};

		const html = renderToString(
			<PricesCatalogTable
				groupedCatalog={mockCatalog}
				categoryLimits={{}}
				setCategoryLimits={() => {}}
				serviceCategoryLabels={{ therapy: "Терапевтическая стоматология" }}
				specialtyLabels={{ therapist: "Терапевт" }}
				deletingServiceId={null}
				onEditService={() => {}}
				onDeleteService={() => {}}
				searchQuery=""
				selectedCategoryFilter="all"
				onResetFilters={() => {}}
				isSeedingBaseline={false}
				onSeedBaseline={() => {}}
				onAddNewService={() => {}}
				onOpenScannerDropzone={() => {}}
			/>,
		);

		expect(html).toContain("Лечение кариеса");
		expect(html).toContain("A16.07.002");
		expect(html).toMatch(/3[\s\u00A0]500/);
	});
});

describe("PriceItemEditModal — Single Source of Truth Form", () => {
	it("renders modal form with inputs for service title, code and price in rubles", () => {
		const formState: ServiceEditFormData = {
			title: "Профессиональная гигиена полости рта",
			code: "ГИГ-01",
			catalogCode: "A16.07.051",
			category: "hygiene",
			specialty: "hygienist",
			basePriceRub: 4500,
			materialsCostRub: 350,
			durationMinutes: 60,
			taxDeductible: true,
			vatRate: "vat_exempt",
			active: true,
		};

		const html = renderToString(
			<PriceItemEditModal
				isOpen={true}
				isNew={false}
				editServiceForm={formState}
				setEditServiceForm={() => {}}
				priceRubInput="4500"
				setPriceRubInput={() => {}}
				priceProblem={null}
				setPriceProblem={() => {}}
				isSaving={false}
				serviceCategoryLabels={{ hygiene: "Гигиена" }}
				specialtyLabels={{ hygienist: "Гигиенист" }}
				onClose={() => {}}
				onSave={() => {}}
			/>,
		);

		expect(html).toContain("Редактировать услугу");
		expect(html).toContain("Профессиональная гигиена полости рта");
		expect(html).toContain("ГИГ-01");
		expect(html).toContain("4500");
		expect(html).toContain("Сохранить");
	});
});
