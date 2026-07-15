import type {
	ImagingViewerAnnotation,
	ImagingViewerSessionState,
	MprProjection,
	MprWindowPreset,
} from "@dental/shared";
import { type KeyboardEvent, useEffect, useMemo, useRef } from "react";
import {
	browserGeneratedId,
	type CbctWorkbenchPlane,
	ctImplantPlanFromLibraryItem,
	dicomWorkbenchManifestHasRedactedSource,
	loadLocalMprWorkbenchDraft,
	type MprAxisVisualizerStyle,
	type MprWorkbenchState,
	mprWorkbenchSeriesKey,
	resolveMprWorkbenchProjection,
	saveLocalMprWorkbenchDraft,
} from "../AppHelpers";
import type { CtPlanningArtifactCommand } from "../ctPlanningArtifactCommands";
import {
	type CtImplantLibraryItem,
	type CtPlanningQuickAction,
	findCtPlanningQuickActionForArtifactCommand,
} from "../ctPlanningTools";
import {
	type MprClinicalPreset,
	mprClinicalPresets,
	mprProjectionLabels,
	mprProjectionOrientationLabels,
	mprWindowPresetLabels,
} from "../imagingUiLabels";
import {
	buildMprClinicalChecklist,
	buildMprOperatorSummary,
	buildMprWorkbenchSummary,
	findNearestMprClinicalPreset,
	mprClinicalNextAction,
	resolveMprClinicalPresetProjection,
} from "../mprClinicalStatus";
import { useImagingStore } from "../store/imagingStore";
import {
	buildMprAxisGuidance,
	clampMprAxisDeg,
	clampMprSlabMm,
	clampMprSliceIndex,
	formatMprAxisAngleBadge,
	formatMprAxisDirectionLabel,
	formatMprAxisRangeValue,
	formatMprAxisVisualizerLabel,
	formatMprSlabBadge,
	formatMprSlabRangeValue,
	formatMprSliceBadge,
	formatMprSliceRangeValue,
	mprProjectionCompassLabels,
	mprSliceFraction,
	mprSliceIndexFromFraction,
	resolveMprKeyboardAdjustment,
} from "../utils/math/mprMath";

interface MprLogicParams {
	selectedImagingStudy: any;
	activeOrganizationId: string | null;
	setError: (err: string | null) => void;
}

export function useMprLogic({
	selectedImagingStudy,
	activeOrganizationId,
	setError,
}: MprLogicParams) {
	const {
		dicomSeriesPreview,
		mprSliceIndex,
		setMprSliceIndex,
		mprProjection,
		setMprProjection,
		mprAxisDeg,
		setMprAxisDeg,
		mprSlabMm,
		setMprSlabMm,
		mprWindowPreset,
		setMprWindowPreset,
		mprCrosshairEnabled,
		setMprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		setMprLinkedPlanesEnabled,
		mprWorkbenchLocalSavedAt,
		setMprWorkbenchLocalSavedAt,
		mprWorkbenchDraftRestored,
		setMprWorkbenchDraftRestored,
		dicomViewerWorkbenchManifest,
		dicomWorkstationReadiness,
		ctPlanningImplantPlan,
		setCtPlanningImplantPlan,
		ctPlanningActiveQuickActionId,
		setCtPlanningActiveQuickActionId,
		imagingViewerActiveTool,
		setImagingViewerActiveTool,
		imagingViewerAnnotations,
		setImagingViewerAnnotations,
		imagingViewerSessionReady,
	} = useImagingStore();

	const mprWorkbenchSaveTimerRef = useRef<number | null>(null);

	const cbctWorkbenchSeries = useMemo(() => {
		return (
			dicomSeriesPreview?.series.find(
				(series) => series.mprReadiness.volumeCandidate,
			) ??
			dicomSeriesPreview?.series.find(
				(series) => series.recommendedViewer === "cbct_mpr",
			) ??
			null
		);
	}, [dicomSeriesPreview]);

	const mprSliceMaxIndex = Math.max(
		0,
		(cbctWorkbenchSeries?.fileCount ?? 1) - 1,
	);
	const mprSafeSliceIndex = clampMprSliceIndex(mprSliceIndex, mprSliceMaxIndex);

	const currentMprWorkbenchState = useMemo<MprWorkbenchState>(
		() => ({
			projection: mprProjection,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceIndex: mprSafeSliceIndex,
			windowPreset: mprWindowPreset,
			crosshair: mprCrosshairEnabled,
			linkedPlanes: mprLinkedPlanesEnabled,
		}),
		[
			mprAxisDeg,
			mprCrosshairEnabled,
			mprLinkedPlanesEnabled,
			mprProjection,
			mprSafeSliceIndex,
			mprSlabMm,
			mprWindowPreset,
		],
	);

	const cbctWorkbenchSeriesKey = useMemo(
		() => mprWorkbenchSeriesKey(cbctWorkbenchSeries),
		[cbctWorkbenchSeries],
	);

	const cbctWorkbenchProjections = useMemo<MprProjection[]>(
		() =>
			cbctWorkbenchSeries?.mprReadiness.projections.length
				? cbctWorkbenchSeries.mprReadiness.projections
				: ["axial", "coronal", "sagittal"],
		[cbctWorkbenchSeries],
	);

	const cbctWorkbenchTools = useMemo(
		() => cbctWorkbenchSeries?.mprReadiness.tools ?? [],
		[cbctWorkbenchSeries],
	);

	const cbctWorkbenchPlanes = useMemo<CbctWorkbenchPlane[]>(
		() => [
			{ key: "axial", title: "Аксиальная", detail: "Срез сверху-вниз" },
			{ key: "coronal", title: "Корональная", detail: "Фронтальная плоскость" },
			{ key: "sagittal", title: "Сагиттальная", detail: "Боковая плоскость" },
			{
				key: cbctWorkbenchSeries?.mprReadiness.canBuildPanoramic
					? "panoramic_reconstruction"
					: "oblique",
				title: cbctWorkbenchSeries?.mprReadiness.canBuildPanoramic
					? "Панорама"
					: "Косая",
				detail: cbctWorkbenchSeries?.mprReadiness.canBuildPanoramic
					? "Кривая из КЛКТ"
					: "Наклонная плоскость",
			},
		],
		[cbctWorkbenchSeries],
	);

	const mprControlsReady = Boolean(
		cbctWorkbenchSeries?.mprReadiness.canOpenMpr,
	);
	const mprControlsAutoOpen =
		selectedImagingStudy?.kind === "cbct" || mprControlsReady;
	const mprCenterSliceIndex = Math.floor(mprSliceMaxIndex / 2);
	const mprAxisDirectionLabel = formatMprAxisDirectionLabel({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprAxisAngleBadge = formatMprAxisAngleBadge(
		mprAxisDeg,
		mprControlsReady,
	);
	const mprSlabBadge = formatMprSlabBadge(mprSlabMm, mprControlsReady);
	const mprSliceBadge = formatMprSliceBadge({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});
	const mprSlabVisualWidth = `${Math.min(86, Math.max(18, 14 + mprSlabMm * 2.2))}%`;
	const mprSlicePositionPercent =
		mprSliceMaxIndex > 0
			? `${(mprSafeSliceIndex / mprSliceMaxIndex) * 100}%`
			: "50%";
	const mprCurrentSliceFraction = mprSliceFraction(
		mprSafeSliceIndex,
		mprSliceMaxIndex,
	);
	const mprSliceLabel = mprControlsReady
		? `срез ${mprSafeSliceIndex + 1} из ${mprSliceMaxIndex + 1}`
		: "срез включится после КЛКТ/КТ-серии";
	const mprAxisRangeValue = formatMprAxisRangeValue({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
	});
	const mprSlabRangeValue = formatMprSlabRangeValue({
		canOpenMpr: mprControlsReady,
		slabMm: mprSlabMm,
	});
	const mprSliceRangeValue = formatMprSliceRangeValue({
		canOpenMpr: mprControlsReady,
		sliceIndex: mprSafeSliceIndex,
		maxIndex: mprSliceMaxIndex,
	});

	const mprAxisVisualizerStyle: MprAxisVisualizerStyle = {
		"--mpr-axis-deg": `${mprAxisDeg}deg`,
		"--mpr-slab-width": mprSlabVisualWidth,
		"--mpr-slice-position": mprSlicePositionPercent,
	};

	const mprActiveProjectionLabel =
		mprProjectionLabels[mprProjection as MprProjection] ?? mprProjection;
	const mprActiveProjectionOrientation =
		mprProjectionOrientationLabels[mprProjection as MprProjection] ??
		"плоскость просмотра";
	const mprProjectionCompass = mprProjectionCompassLabels(mprProjection);
	const mprAxisGuidance = buildMprAxisGuidance({
		canOpenMpr: mprControlsReady,
		axisDeg: mprAxisDeg,
		slabMm: mprSlabMm,
		sliceFraction: mprCurrentSliceFraction,
	});

	const mprNearestClinicalPreset = findNearestMprClinicalPreset(
		{
			canOpenMpr: mprControlsReady,
			projection: mprProjection,
			availableProjections: cbctWorkbenchProjections,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceFraction: mprCurrentSliceFraction,
			windowPreset: mprWindowPreset,
			crosshair: mprCrosshairEnabled,
			linkedPlanes: mprLinkedPlanesEnabled,
		},
		mprClinicalPresets,
	);

	const mprClinicalInput = {
		hasSeries: Boolean(cbctWorkbenchSeries),
		canOpenMpr: mprControlsReady,
		hasWorkbenchManifest: Boolean(dicomViewerWorkbenchManifest),
		hasWorkstationReadiness: Boolean(dicomWorkstationReadiness),
		protocolExact: mprNearestClinicalPreset.exact,
		protocolCanApply: mprNearestClinicalPreset.deltas.length > 0,
		protocolLabel: mprNearestClinicalPreset.label,
		projectionLabel: mprActiveProjectionLabel,
		axisLabel: mprAxisDirectionLabel,
		slabMm: mprSlabMm,
		sliceLabel: mprSliceLabel,
		windowLabel:
			mprWindowPresetLabels[mprWindowPreset as MprWindowPreset] ??
			mprWindowPreset,
		crosshair: mprCrosshairEnabled,
		linkedPlanes: mprLinkedPlanesEnabled,
	};

	const mprWorkbenchSummaryText = buildMprWorkbenchSummary(mprClinicalInput);
	const mprOperatorSummaryCards = buildMprOperatorSummary({
		...mprClinicalInput,
		protocolDeltas: mprNearestClinicalPreset.deltas,
	});

	const mprAxisVisualizerLabel = formatMprAxisVisualizerLabel({
		canOpenMpr: mprControlsReady,
		workbenchSummary: mprWorkbenchSummaryText,
		compassSummary: mprProjectionCompass.summary,
		guidanceSummary: mprAxisGuidance.summary,
	});

	const mprClinicalChecklist = buildMprClinicalChecklist(mprClinicalInput);
	const mprClinicalNextStep = mprClinicalNextAction(mprClinicalChecklist);

	const mprClinicalPresetButtonClass = (preset: MprClinicalPreset) =>
		[
			"mpr-clinical-preset",
			mprNearestClinicalPreset.title === preset.title ? "nearest" : "",
			mprNearestClinicalPreset.exact &&
			mprNearestClinicalPreset.title === preset.title
				? "active"
				: "",
		]
			.filter(Boolean)
			.join(" ");

	const applyDefaultMprWorkbenchState = () => {
		const defaultProjection = cbctWorkbenchProjections.includes("axial")
			? "axial"
			: (cbctWorkbenchProjections?.[0] ?? "axial");
		setMprProjection(defaultProjection);
		setMprAxisDeg(0);
		setMprSlabMm(1);
		setMprSliceIndex(mprCenterSliceIndex);
		setMprWindowPreset("bone");
		setMprCrosshairEnabled(true);
		setMprLinkedPlanesEnabled(true);
	};

	const resetMprControls = applyDefaultMprWorkbenchState;

	const applyMprClinicalPreset = (preset: MprClinicalPreset) => {
		const projection = resolveMprClinicalPresetProjection(
			preset.projection,
			cbctWorkbenchProjections,
		);
		setMprProjection(projection);
		setMprAxisDeg(clampMprAxisDeg(preset.axisDeg));
		setMprSlabMm(clampMprSlabMm(preset.slabMm));
		setMprSliceIndex(
			mprSliceIndexFromFraction(preset.sliceFraction, mprSliceMaxIndex),
		);
		setMprWindowPreset(preset.windowPreset);
		setMprCrosshairEnabled(preset.crosshair);
		setMprLinkedPlanesEnabled(preset.linkedPlanes);
	};

	const applyCtPlanningQuickAction = (action: CtPlanningQuickAction) => {
		if (action.requiresVolume && !mprControlsReady) return;
		const projection = resolveMprClinicalPresetProjection(
			action.projection,
			cbctWorkbenchProjections,
		);
		setCtPlanningActiveQuickActionId(action.id);
		setImagingViewerActiveTool(action.tool);
		setMprProjection(projection);
		setMprAxisDeg(clampMprAxisDeg(action.axisDeg));
		setMprSlabMm(clampMprSlabMm(action.slabMm));
		setMprSliceIndex(
			mprSliceIndexFromFraction(action.sliceFraction, mprSliceMaxIndex),
		);
		setMprWindowPreset(action.windowPreset);
		setMprCrosshairEnabled(true);
		setMprLinkedPlanesEnabled(true);
	};

	const createCtPlanningArtifact = (command: CtPlanningArtifactCommand) => {
		if (!selectedImagingStudy) {
			setError("Выберите КТ-снимок перед созданием разметки.");
			return;
		}
		if (!imagingViewerSessionReady) {
			setError(
				"Дождитесь загрузки сессии просмотра снимка перед созданием КТ-разметки.",
			);
			return;
		}
		if (command.requiresVolume && !mprControlsReady) {
			setError("Для этой КТ-разметки нужна готовая КЛКТ/КТ-серия.");
			return;
		}
		if (command.requiresImplant && !ctPlanningImplantPlan) {
			setError(
				"Сначала выберите имплант из библиотеки, затем создайте ось или шаблон.",
			);
			return;
		}
		const matchingQuickAction =
			findCtPlanningQuickActionForArtifactCommand(command);
		if (matchingQuickAction) {
			applyCtPlanningQuickAction(matchingQuickAction);
		} else {
			setCtPlanningActiveQuickActionId(null);
			setImagingViewerActiveTool(command.tool);
			setMprProjection(
				resolveMprClinicalPresetProjection(
					command.projection,
					cbctWorkbenchProjections,
				),
			);
		}
		const now = new Date().toISOString();
		const projection = resolveMprClinicalPresetProjection(
			command.projection,
			cbctWorkbenchProjections,
		);
		const annotation: ImagingViewerAnnotation = {
			id: browserGeneratedId(`ct-${command.annotationType}`),
			type: command.annotationType,
			label: command.title,
			semanticRole: command.semanticRole ?? null,
			toothCode: selectedImagingStudy.toothCode,
			points: [],
			measurementValue: null,
			unit: command.unit,
			note: [
				`Черновик КТ-разметки: ${command.detail}`,
				`Плоскость: ${mprProjectionLabels[projection] ?? projection}`,
				`Срез: ${mprSafeSliceIndex + 1}/${mprSliceMaxIndex + 1}`,
				`Слой: ${mprSlabMm} мм`,
				ctPlanningImplantPlan
					? `Имплант: ${ctPlanningImplantPlan.diameterMm} x ${ctPlanningImplantPlan.lengthMm} мм`
					: "",
			]
				.filter(Boolean)
				.join(" · "),
			createdByUserId: null,
			createdAt: now,
			updatedAt: now,
		};
		setImagingViewerAnnotations((items) =>
			[annotation, ...items].slice(0, 200),
		);
		setError(null);
	};

	const selectCtPlanningImplant = (implant: CtImplantLibraryItem) => {
		setCtPlanningImplantPlan(ctImplantPlanFromLibraryItem(implant));
		setCtPlanningActiveQuickActionId("implant_library");
		setImagingViewerActiveTool("implant_library");
		if (mprControlsReady) {
			setMprWindowPreset("implant");
			setMprCrosshairEnabled(true);
			setMprLinkedPlanesEnabled(true);
		}
	};

	const applyNearestMprClinicalPreset = () => {
		const preset = mprClinicalPresets.find(
			(candidate) => candidate.title === mprNearestClinicalPreset.title,
		);
		if (preset) applyMprClinicalPreset(preset);
	};

	const handleMprKeyboardNavigation = (
		event: KeyboardEvent<HTMLDivElement>,
	) => {
		if (!mprControlsReady) return;
		const adjustment = resolveMprKeyboardAdjustment({
			key: event.key,
			shiftKey: event.shiftKey,
			axisDeg: mprAxisDeg,
			slabMm: mprSlabMm,
			sliceIndex: mprSafeSliceIndex,
			maxIndex: mprSliceMaxIndex,
		});
		if (!adjustment) return;
		event.preventDefault();
		if (adjustment.kind === "axis") setMprAxisDeg(adjustment.value);
		if (adjustment.kind === "slab") setMprSlabMm(adjustment.value);
		if (adjustment.kind === "slice") setMprSliceIndex(adjustment.value);
	};

	const applyMprWorkbenchState = (state: MprWorkbenchState) => {
		const projection = resolveMprWorkbenchProjection(
			state.projection,
			cbctWorkbenchProjections,
		);
		setMprProjection(projection);
		setMprAxisDeg(clampMprAxisDeg(state.axisDeg ?? 0));
		setMprSlabMm(clampMprSlabMm(state.slabMm ?? 1));
		setMprSliceIndex(clampMprSliceIndex(state.sliceIndex, mprSliceMaxIndex));
		setMprWindowPreset(state.windowPreset);
		setMprCrosshairEnabled(state.crosshair);
		setMprLinkedPlanesEnabled(state.linkedPlanes);
	};

	async function restoreMprWorkbenchLocalDraft() {
		if (!cbctWorkbenchSeriesKey) {
			setError(
				"Сначала выберите готовую КЛКТ/КТ-серию, чтобы вернуть последний вид КТ-срезов.",
			);
			return;
		}
		const draft = await loadLocalMprWorkbenchDraft(
			cbctWorkbenchSeriesKey,
			activeOrganizationId,
		);
		if (!draft) {
			setError("Для этой КЛКТ/КТ-серии еще нет сохраненного вида КТ-срезов.");
			return;
		}
		applyMprWorkbenchState(draft.state);
		setMprWorkbenchLocalSavedAt(draft.clientSavedAt);
		setMprWorkbenchDraftRestored(true);
		setError(null);
	}

	useEffect(() => {
		if (!cbctWorkbenchProjections.includes(mprProjection)) {
			setMprProjection(
				resolveMprWorkbenchProjection(mprProjection, cbctWorkbenchProjections),
			);
		}
	}, [cbctWorkbenchProjections, mprProjection]);

	useEffect(() => {
		setMprSliceIndex((value: any) =>
			clampMprSliceIndex(value, mprSliceMaxIndex),
		);
	}, [mprSliceMaxIndex]);

	useEffect(() => {
		if (!cbctWorkbenchSeriesKey || !mprControlsReady) {
			setMprWorkbenchLocalSavedAt(null);
			setMprWorkbenchDraftRestored(false);
			return;
		}
		let cancelled = false;
		const restore = async () => {
			const draft = await loadLocalMprWorkbenchDraft(
				cbctWorkbenchSeriesKey,
				activeOrganizationId,
			);
			if (cancelled) return;
			if (!draft) {
				applyDefaultMprWorkbenchState();
				setMprWorkbenchLocalSavedAt(null);
				setMprWorkbenchDraftRestored(false);
				return;
			}
			applyMprWorkbenchState(draft.state);
			setMprWorkbenchLocalSavedAt(draft.clientSavedAt);
			setMprWorkbenchDraftRestored(true);
		};
		void restore();
		return () => {
			cancelled = true;
		};
	}, [
		activeOrganizationId,
		cbctWorkbenchProjections,
		cbctWorkbenchSeriesKey,
		mprControlsReady,
	]);

	useEffect(() => {
		if (!cbctWorkbenchSeriesKey || !mprControlsReady) return;
		if (mprWorkbenchSaveTimerRef.current)
			window.clearTimeout(mprWorkbenchSaveTimerRef.current);
		const clientSavedAt = new Date().toISOString();
		mprWorkbenchSaveTimerRef.current = window.setTimeout(() => {
			void saveLocalMprWorkbenchDraft(
				cbctWorkbenchSeriesKey,
				currentMprWorkbenchState,
				clientSavedAt,
				activeOrganizationId,
			).then((saved) => {
				if (saved) setMprWorkbenchLocalSavedAt(clientSavedAt);
			});
		}, 350);
		return () => {
			if (mprWorkbenchSaveTimerRef.current)
				window.clearTimeout(mprWorkbenchSaveTimerRef.current);
		};
	}, [
		activeOrganizationId,
		cbctWorkbenchSeriesKey,
		currentMprWorkbenchState,
		mprControlsReady,
	]);

	return {
		mprSliceMaxIndex,
		mprSafeSliceIndex,
		currentMprWorkbenchState,
		cbctWorkbenchSeries,
		cbctWorkbenchSeriesKey,
		cbctWorkbenchProjections,
		cbctWorkbenchTools,
		cbctWorkbenchPlanes,
		mprControlsReady,
		mprControlsAutoOpen,
		mprCenterSliceIndex,
		mprAxisDirectionLabel,
		mprAxisAngleBadge,
		mprSlabBadge,
		mprSliceBadge,
		mprSlabVisualWidth,
		mprSlicePositionPercent,
		mprCurrentSliceFraction,
		mprSliceLabel,
		mprAxisRangeValue,
		mprSlabRangeValue,
		mprSliceRangeValue,
		mprAxisVisualizerStyle,
		mprActiveProjectionLabel,
		mprActiveProjectionOrientation,
		mprProjectionCompass,
		mprAxisGuidance,
		mprNearestClinicalPreset,
		mprClinicalInput,
		mprWorkbenchSummaryText,
		mprOperatorSummaryCards,
		mprAxisVisualizerLabel,
		mprClinicalChecklist,
		mprClinicalNextStep,
		mprClinicalPresetButtonClass,
		applyDefaultMprWorkbenchState,
		resetMprControls,
		applyMprClinicalPreset,
		applyCtPlanningQuickAction,
		createCtPlanningArtifact,
		selectCtPlanningImplant,
		applyNearestMprClinicalPreset,
		handleMprKeyboardNavigation,
		applyMprWorkbenchState,
		restoreMprWorkbenchLocalDraft,
	};
}
