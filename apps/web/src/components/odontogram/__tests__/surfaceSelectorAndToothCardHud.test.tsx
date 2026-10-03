import { describe, it } from "node:test";
import assert from "node:assert";
import React from "react";
import { renderToString } from "react-dom/server";
import { SurfaceSelector } from "../chart/SurfaceSelector";
import { ToothCardHud } from "../chart/ToothCardHud";

describe("SurfaceSelector & Black Cavity Class Presets", () => {
	it("renders all 6 anatomical surface segments and labels without crashes", () => {
		const html = renderToString(
			<SurfaceSelector
				selected={["O", "M"]}
				onChange={() => {}}
				size={110}
			/>,
		);

		// Проверяем наличие всех 6 полигонов/областей
		assert.ok(html.includes('data-testid="surf-poly-V"'), "Must render Vestibular surface");
		assert.ok(html.includes('data-testid="surf-poly-M"'), "Must render Mesial surface");
		assert.ok(html.includes('data-testid="surf-poly-D"'), "Must render Distal surface");
		assert.ok(html.includes('data-testid="surf-poly-L"'), "Must render Lingual surface");
		assert.ok(html.includes('data-testid="surf-poly-O"'), "Must render Occlusal surface");
		assert.ok(html.includes('data-testid="surf-poly-C"'), "Must render Cervical surface");

		// Проверяем наличие быстрых пресетов полостей по Блэку
		assert.ok(html.includes('data-testid="surface-black-presets"'), "Must render Black cavity class presets");
		assert.ok(html.includes('data-testid="surface-preset-MOD"'), "Must render MOD cavity preset");
		assert.ok(html.includes('data-testid="surface-preset-MO"'), "Must render MO cavity preset");
		assert.ok(html.includes('data-testid="surface-preset-OD"'), "Must render OD cavity preset");
		assert.ok(html.includes('data-testid="surface-preset-clear"'), "Must render reset button when surfaces are selected");
	});

	it("hides presets when showPresets is explicitly false or size is small", () => {
		const html = renderToString(
			<SurfaceSelector
				selected={[]}
				onChange={() => {}}
				size={60}
				showPresets={false}
			/>,
		);

		assert.strictEqual(
			html.includes('data-testid="surface-black-presets"'),
			false,
			"Must not render Black presets when showPresets=false or size < 70",
		);
	});
});

describe("ToothCardHud Compact Non-Overlapping Architecture", () => {
	it("renders compact HUD with tooth number, state label, and primary hot path buttons for adult tooth", () => {
		const html = renderToString(
			<ToothCardHud
				number={16}
				isTop={true}
				isPrimary={false}
				state="Caries"
				surfaces={["M", "O", "D"]}
				onQuickStateChange={() => {}}
			/>,
		);

		// Проверяем компактный корневой контейнер
		assert.ok(html.includes('tooth-card-hud-compact'), "Must have tooth-card-hud-compact class");
		assert.ok(html.includes('data-testid="tooth-card-hud-16"'), "Must render data-testid for tooth 16");

		// Проверяем заголовок: номер зуба, статус и бейдж поверхностей
		assert.ok(html.includes("Зуб 16"), "Must show tooth number");
		assert.ok(html.includes("кариес"), "Must show human Russian state label");
		assert.ok(html.includes("MOD"), "Must show MOD surface badge cleanly");

		// Hot Path кнопки (Кариес, Пломба, Здоров)
		assert.ok(html.includes('data-testid="quick-caries-16"'), "Must contain quick Caries action");
		assert.ok(html.includes('data-testid="quick-filled-16"'), "Must contain quick Filled action");
		assert.ok(html.includes('data-testid="quick-healthy-16"'), "Must contain quick Healthy action");

		// Вторичные кнопки
		assert.ok(html.includes('data-testid="quick-pulpitis-16"'), "Must contain quick Pulpitis action");
		assert.ok(html.includes('data-testid="quick-crown-16"'), "Must contain quick Crown action");
		assert.ok(html.includes('data-testid="quick-implant-16"'), "Must contain quick Implant action");
		assert.ok(html.includes('data-testid="quick-missing-16"'), "Must contain quick Missing action");
	});

	it("renders compact HUD for primary tooth with pediatric actions", () => {
		const html = renderToString(
			<ToothCardHud
				number={55}
				isTop={true}
				isPrimary={true}
				state="Healthy"
				rootResorptionStage={50}
				onQuickStateChange={() => {}}
				onResorptionChange={() => {}}
			/>,
		);

		assert.ok(html.includes("Зуб 55"), "Must show primary tooth number 55");
		assert.ok(html.includes('data-testid="quick-pulpotomy-55"'), "Must contain Pulpotomy action");
		assert.ok(html.includes('data-testid="quick-nusmile-55"'), "Must contain NuSmile crown action");
		assert.ok(html.includes('data-testid="quick-resorption-55"'), "Must contain Resorption action");
		assert.ok(html.includes('data-testid="quick-exfoliated-55"'), "Must contain Exfoliated action");
	});
});
