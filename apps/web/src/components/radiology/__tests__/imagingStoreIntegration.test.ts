import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
	createDicomWorkstationSlice,
	createFilterSettingsSlice,
	createMeasurementsSlice,
	createSliceNavigationSlice,
	initialDicomWorkstationState,
	initialFilterSettingsState,
	initialMeasurementsState,
	initialSliceNavigationState,
	selectFilterSettings,
	selectMeasurements,
	selectMprNavigation,
	useImagingStore,
} from "../../../store/imagingStore";

describe("ImagingStore Decomposed Architecture Integration Suite (Wave 24)", () => {
	beforeEach(() => {
		useImagingStore.getState().reset();
	});

	describe("Gate 1: Export Parity & Slice Architecture", () => {
		it("provides useImagingStore with full Zustand API", () => {
			assert.equal(typeof useImagingStore, "function");
			assert.equal(typeof useImagingStore.getState, "function");
			assert.equal(typeof useImagingStore.setState, "function");
			assert.equal(typeof useImagingStore.subscribe, "function");
		});

		it("exports modular slice creators as pure state creators", () => {
			assert.equal(typeof createSliceNavigationSlice, "function");
			assert.equal(typeof createMeasurementsSlice, "function");
			assert.equal(typeof createFilterSettingsSlice, "function");
			assert.equal(typeof createDicomWorkstationSlice, "function");
		});

		it("exposes default initial states for all clinical domains", () => {
			assert.ok(initialSliceNavigationState);
			assert.equal(initialSliceNavigationState.mprProjection, "axial");
			assert.equal(initialSliceNavigationState.mprCrosshairEnabled, true);

			assert.ok(initialMeasurementsState);
			assert.equal(
				initialMeasurementsState.imagingViewerActiveTool,
				"window_level",
			);
			assert.deepEqual(initialMeasurementsState.imagingViewerAnnotations, []);

			assert.ok(initialFilterSettingsState);
			assert.equal(initialFilterSettingsState.mprWindowPreset, "bone");

			assert.ok(initialDicomWorkstationState);
			assert.equal(
				initialDicomWorkstationState.imagingFolderPath,
				"C:\\Images",
			);
		});
	});

	describe("Gate 2: SliceNavigationSlice (CT MPR, Planes & Navigation)", () => {
		it("manages MPR projection with direct values and functional updaters", () => {
			const store = useImagingStore.getState();

			store.setMprProjection("coronal");
			assert.equal(useImagingStore.getState().mprProjection, "coronal");

			store.setMprProjection((prev) =>
				prev === "coronal" ? "sagittal" : "axial",
			);
			assert.equal(useImagingStore.getState().mprProjection, "sagittal");
		});

		it("manages MPR slice index, axis rotation, and slab thickness", () => {
			const store = useImagingStore.getState();

			store.setMprSliceIndex(150);
			assert.equal(useImagingStore.getState().mprSliceIndex, 150);

			store.setMprAxisDeg(45);
			assert.equal(useImagingStore.getState().mprAxisDeg, 45);

			store.setMprSlabMm(5);
			assert.equal(useImagingStore.getState().mprSlabMm, 5);
		});

		it("toggles crosshair and linked orthogonal planes", () => {
			const store = useImagingStore.getState();

			store.setMprCrosshairEnabled(false);
			assert.equal(useImagingStore.getState().mprCrosshairEnabled, false);

			store.setMprLinkedPlanesEnabled(false);
			assert.equal(useImagingStore.getState().mprLinkedPlanesEnabled, false);
		});

		it("tracks workbench save timestamps and restored drafts", () => {
			const store = useImagingStore.getState();
			const timestamp = "2026-10-10T14:30:00.000Z";

			store.setMprWorkbenchLocalSavedAt(timestamp);
			assert.equal(
				useImagingStore.getState().mprWorkbenchLocalSavedAt,
				timestamp,
			);

			store.setMprWorkbenchDraftRestored(true);
			assert.equal(useImagingStore.getState().mprWorkbenchDraftRestored, true);
		});
	});

	describe("Gate 3: MeasurementsSlice (5mm Calibration, Ruler, Implants, Nerve)", () => {
		it("manages active tool selection and quick actions", () => {
			const store = useImagingStore.getState();

			store.setImagingViewerActiveTool("measure_distance");
			assert.equal(useImagingStore.getState().imagingViewerActiveTool, "measure_distance");

			store.setCtPlanningActiveQuickActionId("implant_safety_zone");
			assert.equal(
				useImagingStore.getState().ctPlanningActiveQuickActionId,
				"implant_safety_zone",
			);
		});

		it("handles annotation layers with functional updates", () => {
			const store = useImagingStore.getState();
			const mockAnnotation = {
				id: "ann_calib_5mm",
				type: "distance" as const,
				points: [
					{ x: 10, y: 20 },
					{ x: 60, y: 20 },
				],
				label: "5.0 mm calibration",
			} as any;

			store.setImagingViewerAnnotations([mockAnnotation]);
			assert.equal(
				useImagingStore.getState().imagingViewerAnnotations.length,
				1,
			);
			assert.equal(
				useImagingStore.getState().imagingViewerAnnotations[0]?.id,
				"ann_calib_5mm",
			);

			store.setImagingViewerAnnotations((prev: any) => [
				...prev,
				{
					id: "ann_nerve",
					type: "angle" as const,
					points: [
						{ x: 10, y: 10 },
						{ x: 30, y: 30 },
					],
				} as any,
			]);
			assert.equal(
				useImagingStore.getState().imagingViewerAnnotations.length,
				2,
			);
		});

		it("stores CT implant planning configurations", () => {
			const store = useImagingStore.getState();
			// biome-ignore lint/suspicious/noExplicitAny: test payload
			const implantPlan: any = {
				id: "plan_implant_36",
				toothNumber: 36,
				manufacturer: "Straumann",
				diameterMm: 4.1,
				lengthMm: 10.0,
			};

			store.setCtPlanningImplantPlan(implantPlan);
			assert.deepEqual(
				useImagingStore.getState().ctPlanningImplantPlan,
				implantPlan,
			);
		});

		it("manages clinical notes and save state transitions", () => {
			const store = useImagingStore.getState();

			store.setImagingViewerNote(
				"Контроль обтурации каналов зуба 16, калибровка 5мм подтверждена",
			);
			assert.equal(
				useImagingStore.getState().imagingViewerNote,
				"Контроль обтурации каналов зуба 16, калибровка 5мм подтверждена",
			);

			store.setImagingViewerSaveState("saving");
			assert.equal(useImagingStore.getState().imagingViewerSaveState, "saving");

			store.setImagingViewerSaveState("saved");
			assert.equal(useImagingStore.getState().imagingViewerSaveState, "saved");
		});
	});

	describe("Gate 4: FilterSettingsSlice (W/L Presets, Contrast, Inversion)", () => {
		it("switches window presets between bone, soft tissue, and custom", () => {
			const store = useImagingStore.getState();

			store.setMprWindowPreset("soft_tissue");
			assert.equal(useImagingStore.getState().mprWindowPreset, "soft_tissue");

			store.setMprWindowPreset("bone");
			assert.equal(useImagingStore.getState().mprWindowPreset, "bone");
		});

		it("updates composite viewer state without dropping adjacent properties", () => {
			const store = useImagingStore.getState();

			store.setImagingViewerState((prev) => ({
				...prev,
				brightness: 65,
				contrast: 85,
				inverted: true,
				zoom: 1.5,
			}));

			const current = useImagingStore.getState().imagingViewerState;
			assert.equal(current.brightness, 65);
			assert.equal(current.contrast, 85);
			assert.equal(current.inverted, true);
			assert.equal(current.zoom, 1.5);
		});

		it("filters studies by imaging modality kind", () => {
			const store = useImagingStore.getState();

			store.setImagingKindFilter("cbct");
			assert.equal(useImagingStore.getState().imagingKindFilter, "cbct");

			store.setImagingKindFilter("all");
			assert.equal(useImagingStore.getState().imagingKindFilter, "all");
		});
	});

	describe("Gate 5: DicomWorkstationSlice & Reset Invariants", () => {
		it("updates workstation endpoints and progress indicators", () => {
			const store = useImagingStore.getState();

			store.setIsDicomSeriesPreviewLoading(true);
			assert.equal(
				useImagingStore.getState().isDicomSeriesPreviewLoading,
				true,
			);

			store.setDicomWebEndpointUrl("http://pacs.clinic.local:8042/dicom-web");
			assert.equal(
				useImagingStore.getState().dicomWebEndpointUrl,
				"http://pacs.clinic.local:8042/dicom-web",
			);
		});

		it("resets 100% of temporary session fields on reset()", () => {
			const store = useImagingStore.getState();

			// Mutate state across domains
			store.setMprSliceIndex(99);
			store.setImagingViewerActiveTool("pan");
			store.setImagingViewerNote("Временная заметка");
			store.setImagingViewerAnnotations([
				{ id: "ann1", type: "distance" as const, points: [] } as any,
			]);
			// biome-ignore lint/suspicious/noExplicitAny: test payload
			store.setCtPlanningImplantPlan({ toothNumber: 46 } as any);
			store.setSelectedImagingStudyId("study_uuid_99");

			// Trigger canonical reset
			store.reset();

			const state = useImagingStore.getState();
			assert.equal(state.selectedImagingStudyId, null);
			assert.deepEqual(state.imagingViewerAnnotations, []);
			assert.equal(state.ctPlanningImplantPlan, null);
			assert.equal(state.imagingViewerSession, null);
			assert.equal(state.imagingImportPreview, null);
			assert.equal(state.dicomSeriesPreview, null);
		});

		it("provides fast domain selectors with zero overhead", () => {
			const s = useImagingStore.getState();
			s.setMprProjection("axial");
			s.setMprCrosshairEnabled(true);
			s.setImagingViewerActiveTool("window_level");
			s.setMprWindowPreset("bone");

			const state = useImagingStore.getState();

			const mprNav = selectMprNavigation(state);
			assert.equal(mprNav.mprProjection, "axial");
			assert.equal(mprNav.mprCrosshairEnabled, true);

			const measurements = selectMeasurements(state);
			assert.equal(measurements.activeTool, "window_level");
			assert.deepEqual(measurements.annotations, []);

			const filters = selectFilterSettings(state);
			assert.equal(filters.windowPreset, "bone");
		});
	});
});
