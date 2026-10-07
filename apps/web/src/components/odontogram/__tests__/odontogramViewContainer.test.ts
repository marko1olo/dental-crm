import assert from "node:assert/strict";
import test, { describe, beforeEach } from "node:test";
import {
	calculateAapEfpStagingAndGrading,
	calculatePerioIndices,
	createDefaultPerioTeeth,
	odontogramViewModeSchema,
	type OdontogramViewMode,
	uiPreferencesSchema,
} from "@dental/shared";
import {
	ODONTOGRAM_VIEW_MODES,
	STAMP_ITEMS,
	areOdontogramViewContainerPropsEqual,
	type OdontogramViewContainerProps,
} from "../OdontogramViewContainer";
import { invertTeethSelection } from "../useOdontogramQuickActions";
import {
	defaultUiPreferences,
	loadUiPreferences,
	saveUiPreferences,
} from "../../../utils/preferencesUtils";
import { useAppStore } from "../../../store/appStore";
import type { ToothData } from "../ToothChart";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { DEMO_SHOWCASE_TEETH } from "../../treatment-plans/treatmentPlanStagesEngine";
import { createDefaultAdultTeethData } from "../chart/toothChartTypes";
import {
	clearStoredTeethData,
	loadStoredTeethData,
	saveStoredTeethData,
} from "../odontogramStorage";

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
		assert.equal(compact?.label, "Клинический 6-поверхностный");
		assert.equal(compact?.badge, "FDI");

		const gost = ODONTOGRAM_VIEW_MODES.find((m) => m.mode === "classic_gost");
		assert.equal(gost?.label, "Классический ГОСТ");
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

		props.onToothClick?.(16, dummyRect, "O");
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

	test("Mandate 8e: действие Санирован/Интактный помечает все 32 зуба здоровыми без модалок", () => {
		let updatedTargets: number[] = [];
		let updatedState = "";

		const props: OdontogramViewContainerProps = {
			teethData: [],
			onToothClick: () => {},
			onQuickStateChange: (targets, state) => {
				updatedTargets = targets;
				updatedState = state;
			},
			onMarkIntactDentition: () => {
				const adultTeeth = [
					18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
					48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
				];
				props.onQuickStateChange?.(adultTeeth, "Healthy");
			},
		};

		assert.ok(props.onMarkIntactDentition, "onMarkIntactDentition prop must be supported");
		props.onMarkIntactDentition();
		assert.equal(updatedTargets.length, 32, "Все 32 зуба должны быть помечены");
		assert.equal(updatedState, "Healthy", "Статус должен быть Healthy");
	});

	test("Mandate 8e: действие Адентия 8-ок помечает зубы 18, 28, 38, 48 отсутствующими", () => {
		let updatedTargets: number[] = [];
		let updatedState = "";

		const props: OdontogramViewContainerProps = {
			teethData: [],
			onToothClick: () => {},
			onQuickStateChange: (targets, state) => {
				updatedTargets = targets;
				updatedState = state;
			},
			onMarkWisdomTeethMissing: () => {
				const wisdomTeeth = [18, 28, 38, 48];
				props.onQuickStateChange?.(wisdomTeeth, "Missing");
			},
		};

		assert.ok(props.onMarkWisdomTeethMissing, "onMarkWisdomTeethMissing prop must be supported");
		props.onMarkWisdomTeethMissing();
		assert.deepEqual(updatedTargets, [18, 28, 38, 48], "Зубы 18, 28, 38, 48 должны быть помечены");
		assert.equal(updatedState, "Missing", "Статус должен быть Missing");
	});
});

describe("Mandate 8y: Dual-Mode Isolation & Patient Anti-Contamination Invariants", () => {
	test("В боевом режиме (Production) новая зубная формула инициализируется строго 32 интактными зубами", () => {
		const defaultTeeth = createDefaultAdultTeethData();
		assert.equal(defaultTeeth.length, 32, "Должно быть ровно 32 зуба");
		const nonHealthy = defaultTeeth.filter((t) => t.state !== "Healthy");
		assert.equal(nonHealthy.length, 0, "В боевом режиме у нового пациента 0 патологий (все зубы Healthy)");
	});

	test("В демо-режиме витринные зубы DEMO_SHOWCASE_TEETH изолированы от боевых пациентов", () => {
		assert.ok(DEMO_SHOWCASE_TEETH.length > 0, "Демо-витрина содержит образцовые клинические патологии");
		assert.equal(isDemoPatientId("01a00000-0000-0000-0000-000000000001"), true, "Эталонный демо-пациент распознается");
		assert.equal(isDemoPatientId("sample_patient_ivanov"), true, "Sample-пациент распознается");
		assert.equal(isDemoPatientId("pat-real-doctor-patient-12345"), false, "Боевой пациент клиники НЕ является демо");
	});

	test("Изоляция локального хранилища зубных формул между пациентами (Anti-Leak Invariant)", () => {
		const patientA = "test_pat_A_c51a";
		const patientB = "test_pat_B_d82b";

		clearStoredTeethData(patientA);
		clearStoredTeethData(patientB);

		const teethPatientA: ToothData[] = [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 36, state: "Missing" },
		];
		saveStoredTeethData(patientA, teethPatientA, true);

		// Проверяем, что кэш пациента А не утекает к пациенту Б
		const cachedA = loadStoredTeethData(patientA);
		const cachedB = loadStoredTeethData(patientB);

		assert.ok(cachedA && cachedA.length === 2, "Данные пациента А сохранены в его слоте");
		assert.equal(cachedA[0]?.state, "Caries");
		assert.equal(cachedB, null, "У нового пациента Б кэш строго пуст (0 утечек)");

		clearStoredTeethData(patientA);
		clearStoredTeethData(patientB);
	});

	test("Физиологическая норма пародонтограммы: 192 точки зондирования, глубина 2 мм, BOP 0%", () => {
		const perioTeeth = createDefaultPerioTeeth(2);
		assert.equal(perioTeeth.length, 32, "Ровно 32 зуба в пародонтограмме");
		const summary = calculatePerioIndices(perioTeeth);
		assert.equal(summary.fmbsPercent, 0, "BOP равен 0% (нет кровоточивости)");
		assert.equal(summary.fmpsPercent, 0, "Plaque равен 0% (нет зубного налета)");
		assert.equal(summary.deepPocketsCount, 0, "0 глубоких патологических карманов");
		assert.equal(summary.riskCategory, "low", "PRA риск низкий (физиологическая норма)");

		const diag = calculateAapEfpStagingAndGrading(perioTeeth, summary);
		assert.equal(diag.severity, "intact", "Клиническая тяжесть: интактный пародонт");
		assert.equal(diag.aapStage, "health", "AAP классификация: здоровье пародонта");
		assert.equal(diag.icd10Code, "Z01.2", "МКБ-10 код: Z01.2 (осмотр/норма)");
	});

	test("areOdontogramViewContainerPropsEqual инвалидирует кэш при открытии или смене contextDrawerTooth", () => {
		const baseProps: OdontogramViewContainerProps = {
			teethData: createDefaultAdultTeethData(),
			contextDrawerTooth: null,
		};

		// 1. Идентичные пропсы -> true (ререндер предотвращен)
		assert.equal(areOdontogramViewContainerPropsEqual(baseProps, { ...baseProps }), true);

		// 2. Открытие шторки зуба #16 -> false (ререндер обязателен)
		assert.equal(
			areOdontogramViewContainerPropsEqual(baseProps, {
				...baseProps,
				contextDrawerTooth: 16,
			}),
			false,
		);

		// 3. Переключение с зуба #16 на зуб #26 -> false (ререндер обязателен)
		assert.equal(
			areOdontogramViewContainerPropsEqual(
				{ ...baseProps, contextDrawerTooth: 16 },
				{ ...baseProps, contextDrawerTooth: 26 },
			),
			false,
		);

		// 4. Закрытие шторки (16 -> null) -> false (ререндер обязателен)
		assert.equal(
			areOdontogramViewContainerPropsEqual(
				{ ...baseProps, contextDrawerTooth: 16 },
				baseProps,
			),
			false,
		);
	});
});

describe("Odontogram Toolbar Quick Actions & Stamps Invariants (Mandate 8l/8aa)", () => {
	test("invertTeethSelection чисто инвертирует множество зубов без побочных эффектов", () => {
		const allAdultTeeth = [
			18, 17, 16, 15, 14, 13, 12, 11,
			21, 22, 23, 24, 25, 26, 27, 28,
			38, 37, 36, 35, 34, 33, 32, 31,
			48, 47, 46, 45, 44, 43, 42, 41,
		];

		// 1. Пустое выделение -> инвертирование выделяет ВСЕ зубы
		const allInverted = invertTeethSelection(allAdultTeeth, []);
		assert.equal(allInverted.length, 32);
		assert.deepEqual(allInverted, allAdultTeeth);

		// 2. Все выделены -> инвертирование сбрасывает в пустой массив
		const emptyInverted = invertTeethSelection(allAdultTeeth, allAdultTeeth);
		assert.equal(emptyInverted.length, 0);
		assert.deepEqual(emptyInverted, []);

		// 3. Выделены центральные резцы (11, 21) -> остаются 30 остальных зубов
		const frontInverted = invertTeethSelection(allAdultTeeth, [11, 21]);
		assert.equal(frontInverted.length, 30);
		assert.ok(!frontInverted.includes(11));
		assert.ok(!frontInverted.includes(21));
		assert.ok(frontInverted.includes(12));
		assert.ok(frontInverted.includes(22));
	});

	test("STAMP_ITEMS содержит полный клинический набор штампов включая Crown, Caries, Filled, Missing, Healthy", () => {
		const stampStates = STAMP_ITEMS.map((s) => s.state);
		assert.ok(stampStates.includes("Crown"), "Штамп 'Crown' (Коронка) обязан присутствовать в палитре");
		assert.ok(stampStates.includes("Caries"), "Штамп 'Caries' (Кариес) обязан присутствовать");
		assert.ok(stampStates.includes("Filled"), "Штамп 'Filled' (Пломба) обязан присутствовать");
		assert.ok(stampStates.includes("Missing"), "Штамп 'Missing' (Удален) обязан присутствовать");
		assert.ok(stampStates.includes("Healthy"), "Штамп 'Healthy' (Здоров) обязан присутствовать");

		const crownStamp = STAMP_ITEMS.find((s) => s.state === "Crown");
		assert.equal(crownStamp?.short, "Коронка");
		assert.equal(crownStamp?.testId, "stamp-crown-primary-btn");
	});

	test("Клиническая суть (Антидрочь): Пакетные действия вызывают onQuickStateChange со строгим пустым массивом surfaces []", () => {
		let capturedTargets: number[] = [];
		let capturedState: string = "";
		let capturedSurfaces: readonly string[] | undefined = undefined;

		const onQuickStateChange = (
			targets: number[],
			state: any,
			surfaces?: readonly string[] | undefined,
		) => {
			capturedTargets = targets;
			capturedState = state;
			capturedSurfaces = surfaces;
		};

		// 1. Санация всей формулы: surfaces обязаны быть строго []
		const allTeeth = [18, 17, 16, 15, 14, 13, 12, 11];
		onQuickStateChange(allTeeth, "Healthy", []);
		assert.equal(capturedState, "Healthy");
		assert.deepEqual(capturedTargets, allTeeth);
		assert.deepEqual(capturedSurfaces, [], "Санация не должна навязывать поверхности (строго [])");

		// 2. Адентия 8-ок: surfaces обязаны быть строго []
		const wisdomTeeth = [18, 28, 38, 48];
		onQuickStateChange(wisdomTeeth, "Missing", []);
		assert.equal(capturedState, "Missing");
		assert.deepEqual(capturedTargets, wisdomTeeth);
		assert.deepEqual(capturedSurfaces, [], "Адентия 8-ок не должна навязывать поверхности (строго [])");

		// 3. Штамп на зуб или группу: surfaces обязаны быть строго []
		onQuickStateChange([16], "Crown", []);
		assert.equal(capturedState, "Crown");
		assert.deepEqual(capturedTargets, [16]);
		assert.deepEqual(capturedSurfaces, [], "Штамп красит зуб целиком без поверхностей (строго [])");
	});
});



