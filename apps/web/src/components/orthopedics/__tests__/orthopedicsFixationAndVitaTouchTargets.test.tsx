import React from "react";
import { renderToString } from "react-dom/server";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ZtlFixationSelector, CEMENT_BRAND_PRESETS } from "../selectors/ZtlFixationSelector.js";
import { OrthopedicsChairsidePanel } from "../OrthopedicsChairsidePanel.js";
import { OrthopedicsVitaShadePicker } from "../OrthopedicsVitaShadePicker.js";

describe("Domain 24 Orthopedics: TASK-PROSTH-01 Cement Brand Chips & TASK-PROSTH-02 Apple HIG Touch Targets", () => {
	describe("TASK-PROSTH-01: ZtlFixationSelector Cement Brand Quick Chips (Mandates 8am, 8e)", () => {
		it("renders all 4 canonical cement brand chips when fixationType is 'cement'", () => {
			const html = renderToString(
				<ZtlFixationSelector
					fixationType="cement"
					onSelectFixationType={() => {}}
					hasAntagonists={true}
					onToggleAntagonists={() => {}}
					cementBrand="relyx_u200"
				/>,
			);

			assert.ok(html.includes('data-testid="cement-brands-section"'), "Must render cement brands section");
			assert.ok(html.includes('data-testid="cement-brand-chips"'), "Must render chips container");

			// Проверка всех 4 канонических клинических категорий цементов (Мандаты 8x, 8ap)
			assert.ok(html.includes("Светоотверждаемый композитный цемент"), "Must render Light-cured composite");
			assert.ok(html.includes("Самоадгезивный композитный цемент"), "Must render Self-adhesive composite");
			assert.ok(html.includes("Стеклоиономерный модифицированный цемент (СИЦ)"), "Must render RMGI (Fuji Plus category)");
			assert.ok(html.includes("Адгезивный композитный цемент с праймером MDP"), "Must render MDP adhesive composite");

			// Проверка клинических протоколов фиксации
			assert.ok(html.includes("Адгезивная фиксация"), "Must include protocol note");
			assert.ok(html.includes("Двойное отверждение"), "Must include dual cure note");
			assert.ok(html.includes("Химическое отверждение"), "Must include chemical cure note");
			assert.ok(html.includes("Универсальный протокол"), "Must include universal protocol note");

			// Проверка testid для каждого чипа
			for (const cement of CEMENT_BRAND_PRESETS) {
				assert.ok(
					html.includes(`data-testid="cement-brand-chip-${cement.id}"`),
					`Must include testid for cement ${cement.id}`,
				);
			}

			// Проверка активного стиля: dente-btn-pill и семантический токен var(--primary)
			assert.ok(html.includes("dente-btn-pill"), "Chips must use .dente-btn-pill class (Mandate 8am)");
			assert.ok(html.includes("bg-[var(--primary)]/10"), "Active chip must use semantic token bg-[var(--primary)]/10");

			// Проверка Apple HIG тач-таргета: min-h-[44px] sm:min-h-[32px]
			assert.ok(html.includes("min-h-[44px]"), "Chips must enforce min-h-[44px] on mobile (Mandate 8ze, Apple HIG)");
			assert.ok(html.includes("sm:min-h-[32px]"), "Chips must enforce sm:min-h-[32px] on desktop");
		});

		it("hides cement brand chips when fixationType is 'screw' or 'clasp'", () => {
			const screwHtml = renderToString(
				<ZtlFixationSelector
					fixationType="screw"
					onSelectFixationType={() => {}}
					hasAntagonists={true}
					onToggleAntagonists={() => {}}
				/>,
			);
			assert.ok(!screwHtml.includes('data-testid="cement-brands-section"'), "Screw fixation must not show cement section");

			const claspHtml = renderToString(
				<ZtlFixationSelector
					fixationType="clasp"
					onSelectFixationType={() => {}}
					hasAntagonists={true}
					onToggleAntagonists={() => {}}
				/>,
			);
			assert.ok(!claspHtml.includes('data-testid="cement-brands-section"'), "Clasp fixation must not show cement section");
		});

		it("integrates into OrthopedicsChairsidePanel seamlessly", () => {
			const panelHtml = renderToString(
				<OrthopedicsChairsidePanel
					activeToothFdi={21}
					selectedTeeth={[21]}
				/>,
			);
			assert.ok(panelHtml.includes('data-testid="cement-brands-section"'), "Chairside panel must render cement brands section by default");
			assert.ok(panelHtml.includes('data-testid="cement-brand-chip-variolink_esthetic"'));
			assert.ok(panelHtml.includes('data-testid="cement-brand-chip-relyx_u200"'));
		});
	});

	describe("TASK-PROSTH-02: Apple HIG Touch Targets on VITA Shade Group Buttons (Mandates 8am, 8ze)", () => {
		it("renders VITA Classical group buttons [A | B | C | D] with min-h-[44px] sm:min-h-[32px]", () => {
			const html = renderToString(
				<OrthopedicsVitaShadePicker
					shadeSystem="classical"
					selectedShade="A2"
					onSelectShade={() => {}}
				/>,
			);

			// Проверка наличия панели групп Classical
			assert.ok(html.includes('data-testid="vita-classical-groups-bar"'), "Must render VITA classical groups bar");
			assert.ok(html.includes('data-testid="vita-group-btn-all"'), "Must render 'Все' group button");
			assert.ok(html.includes('data-testid="vita-group-btn-A"'), "Must render Group A button");
			assert.ok(html.includes('data-testid="vita-group-btn-B"'), "Must render Group B button");
			assert.ok(html.includes('data-testid="vita-group-btn-C"'), "Must render Group C button");
			assert.ok(html.includes('data-testid="vita-group-btn-D"'), "Must render Group D button");

			// Проверка Apple HIG Touch Target: min-h-[44px] sm:min-h-[32px]
			assert.ok(html.includes("min-h-[44px]"), "Group buttons must enforce min-h-[44px] for mobile Apple HIG");
			assert.ok(html.includes("sm:min-h-[32px]"), "Group buttons must enforce sm:min-h-[32px] for desktop density");
		});

		it("renders VITA 3D-Master group buttons with min-h-[44px] sm:min-h-[32px]", () => {
			const html = renderToString(
				<OrthopedicsVitaShadePicker
					shadeSystem="3d_master"
					selectedShade="2M2"
					onSelectShade={() => {}}
				/>,
			);

			// Проверка наличия панели групп 3D-Master
			assert.ok(html.includes('data-testid="vita-3dmaster-groups-bar"'), "Must render 3D-Master groups bar");
			assert.ok(html.includes('data-testid="vita-3dmaster-group-btn-all"'), "Must render 'Все' 3D-Master group button");
			assert.ok(html.includes('data-testid="vita-3dmaster-group-btn-1"'), "Must render Level 1 button");
			assert.ok(html.includes('data-testid="vita-3dmaster-group-btn-2"'), "Must render Level 2 button");
			assert.ok(html.includes('data-testid="vita-3dmaster-group-btn-3"'), "Must render Level 3 button");
			assert.ok(html.includes('data-testid="vita-3dmaster-group-btn-4"'), "Must render Level 4 button");
			assert.ok(html.includes('data-testid="vita-3dmaster-group-btn-5"'), "Must render Level 5 button");

			// Проверка Apple HIG Touch Target: min-h-[44px] sm:min-h-[32px]
			assert.ok(html.includes("min-h-[44px]"), "3D-Master group buttons must enforce min-h-[44px] for mobile");
			assert.ok(html.includes("sm:min-h-[32px]"), "3D-Master group buttons must enforce sm:min-h-[32px] for desktop");
		});
	});
});
