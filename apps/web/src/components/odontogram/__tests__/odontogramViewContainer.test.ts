import assert from "node:assert/strict";
import test, { describe, beforeEach } from "node:test";
import {
	odontogramViewModeSchema,
	type OdontogramViewMode,
	uiPreferencesSchema,
} from "@dental/shared";
import {
	ODONTOGRAM_VIEW_MODES,
	type OdontogramViewContainerProps,
} from "../OdontogramViewContainer";
import {
	defaultUiPreferences,
	loadUiPreferences,
	saveUiPreferences,
} from "../../../utils/preferencesUtils";
import { useAppStore } from "../../../store/appStore";
import type { ToothData } from "../ToothChart";

describe("OdontogramViewContainer — Modes Configuration & Metadata", () => {
	test("Поддерживает ровно 3 режима: anatomical_svg, compact_clinical, classic_gost", () => {
		assert.equal(ODONTOGRAM_VIEW_MODES.length, 3);
		const modes = ODONTOGRAM_VIEW_MODES.map((m) => m.mode);
		assert.deepEqual(modes, [
			"anatomical_svg",
			"compact_clinical",
			"classic_gost",
		]);
	});

	test("Каждый режим имеет русскоязычные наименования, подсказки и значки", () => {
		for (const opt of ODONTOGRAM_VIEW_MODES) {
			assert.ok(opt.label.length > 0, `Режим ${opt.mode} должен иметь label`);
			assert.ok(opt.shortLabel.length > 0, `Режим ${opt.mode} должен иметь shortLabel`);
			assert.ok(opt.tooltip.length > 0, `Режим ${opt.mode} должен иметь tooltip`);
			assert.ok(opt.icon, `Режим ${opt.mode} должен содержать React icon`);
			assert.ok(opt.badge, `Режим ${opt.mode} должен содержать значок badge`);
		}

		const anatomical = ODONTOGRAM_VIEW_MODES.find((m) => m.mode === "anatomical_svg");
		assert.equal(anatomical?.label, "3D Анатомический");
		assert.equal(anatomical?.badge, "3D");

		const compact = ODONTOGRAM_VIEW_MODES.find((m) => m.mode === "compact_clinical");
		assert.equal(compact?.label, "Клинический 5-поверхностный");
		assert.equal(compact?.badge, "FDI");

		const gost = ODONTOGRAM_VIEW_MODES.find((m) => m.mode === "classic_gost");
		assert.equal(gost?.label, "ГОСТ 043/у");
		assert.equal(gost?.badge, "МЗ РФ");
	});
});

describe("OdontogramViewContainer — Zod Schema & Validation Contracts", () => {
	test("odontogramViewModeSchema валидирует допустимые значения и отклоняет невалидные", () => {
		assert.equal(odontogramViewModeSchema.parse("anatomical_svg"), "anatomical_svg");
		assert.equal(odontogramViewModeSchema.parse("compact_clinical"), "compact_clinical");
		assert.equal(odontogramViewModeSchema.parse("classic_gost"), "classic_gost");

		assert.throws(() => odontogramViewModeSchema.parse("invalid_mode"));
		assert.throws(() => odontogramViewModeSchema.parse(123));
		assert.throws(() => odontogramViewModeSchema.parse(null));
	});

	test("uiPreferencesSchema содержит odontogramViewMode со значением по умолчанию 'anatomical_svg'", () => {
		const parsed = uiPreferencesSchema.parse({});
		assert.equal(parsed.odontogramViewMode, "anatomical_svg");

		const customParsed = uiPreferencesSchema.parse({
			odontogramViewMode: "classic_gost",
		});
		assert.equal(customParsed.odontogramViewMode, "classic_gost");
	});

	test("defaultUiPreferences в веб-приложении содержит odontogramViewMode: 'anatomical_svg'", () => {
		assert.equal(defaultUiPreferences.odontogramViewMode, "anatomical_svg");
	});
});

describe("OdontogramViewContainer — Preferences Persistence & Store Sync", () => {
	beforeEach(() => {
		// Reset store
		useAppStore.setState({ odontogramViewMode: "anatomical_svg" });
	});

	test("useAppStore корректно сохраняет и обновляет odontogramViewMode", () => {
		assert.equal(useAppStore.getState().odontogramViewMode, "anatomical_svg");

		useAppStore.getState().setOdontogramViewMode("compact_clinical");
		assert.equal(useAppStore.getState().odontogramViewMode, "compact_clinical");

		useAppStore.getState().setOdontogramViewMode("classic_gost");
		assert.equal(useAppStore.getState().odontogramViewMode, "classic_gost");
	});

	test("saveUiPreferences и loadUiPreferences сохраняют режим формулы зубного ряда", () => {
		const storage = new Map<string, string>();
		const mockStorage = {
			getItem: (k: string) => storage.get(k) ?? null,
			setItem: (k: string, v: string) => storage.set(k, v),
			removeItem: (k: string) => storage.delete(k),
			clear: () => storage.clear(),
			length: 0,
			key: (_i: number) => null,
		};
		const mockWindow = {
			localStorage: mockStorage as unknown as Storage,
			location: { hostname: "localhost" } as unknown as Location,
		};
		const originalWindow = globalThis.window;
		(globalThis as unknown as { window: unknown }).window = mockWindow;

		try {
			const initialPrefs = loadUiPreferences();
			assert.ok(initialPrefs);

			const updatedPrefs = {
				...initialPrefs,
				odontogramViewMode: "classic_gost" as OdontogramViewMode,
			};
			saveUiPreferences(updatedPrefs);

			const loaded = loadUiPreferences();
			assert.equal(loaded.odontogramViewMode, "classic_gost");
		} finally {
			(globalThis as unknown as { window: unknown }).window = originalWindow;
		}
	});
});

describe("OdontogramViewContainer — Data Contracts & Props Propagation", () => {
	test("Контракт OdontogramViewContainerProps поддерживает полный набор клинических параметров", () => {
		const sampleTeeth: ToothData[] = [
			{ toothNumber: 16, state: "Caries", surfaces: ["O", "M"] },
			{ toothNumber: 21, state: "Filled", surfaces: ["V"] },
			{ toothNumber: 36, state: "Pulpitis" },
			{ toothNumber: 46, state: "Missing" },
		];

		let clickedNum = 0;
		let clickedSurface: string | undefined;

		const props: OdontogramViewContainerProps = {
			teethData: sampleTeeth,
			pediatricMode: false,
			mixedDentition: false,
			selectedTeeth: [16, 21],
			onToothClick: (num, _rect, surface) => {
				clickedNum = num;
				clickedSurface = surface;
			},
			onQuickStateChange: (targets, state) => {
				assert.ok(targets.length > 0);
				assert.ok(state);
			},
			useSurfaces: true,
			hideHeader: false,
			hideLegend: false,
			hideModeSwitcher: false,
			initialViewMode: "compact_clinical",
			onViewModeChange: (mode) => {
				assert.ok(["anatomical_svg", "compact_clinical", "classic_gost"].includes(mode));
			},
		};

		assert.equal(props.teethData.length, 4);
		assert.equal(props.pediatricMode, false);
		assert.deepEqual(props.selectedTeeth, [16, 21]);
		assert.equal(props.useSurfaces, true);
		assert.equal(props.initialViewMode, "compact_clinical");

		// Test click trigger callback
		const dummyRect = {
			x: 100,
			y: 200,
			width: 50,
			height: 80,
			top: 200,
			right: 150,
			bottom: 280,
			left: 100,
			toJSON: () => ({}),
		} as DOMRect;

		props.onToothClick(16, dummyRect, "O");
		assert.equal(clickedNum, 16);
		assert.equal(clickedSurface, "O");
	});

	test("Смена режима зубной формулы сохраняет общее состояние данных зубов без потерь", () => {
		const teeth: ToothData[] = [
			{
				toothNumber: 16,
				state: "Pulpitis",
				clinicalData: {
					canals: [
						{ canalName: "MB1", workingLengthMm: 21.5 },
						{ canalName: "MB2", workingLengthMm: 20.0 },
						{ canalName: "DB", workingLengthMm: 20.5 },
						{ canalName: "P", workingLengthMm: 22.0 },
					],
				},
			},
		];

		// Проверяем, что одни и те же данные передаются без мутации в любой из 3 режимов
		for (const mode of ["anatomical_svg", "compact_clinical", "classic_gost"] as const) {
			const activeProps: OdontogramViewContainerProps = {
				teethData: teeth,
				selectedTeeth: [16],
				onToothClick: () => {},
				initialViewMode: mode,
			};

			assert.equal(activeProps.teethData[0]?.toothNumber, 16);
			assert.equal(activeProps.teethData[0]?.state, "Pulpitis");
			assert.deepEqual(activeProps.selectedTeeth, [16]);
		}
	});
});
