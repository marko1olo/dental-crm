import React from "react";
import { History, RefreshCw, RotateCcw } from "lucide-react";
import type { MprWindowPreset } from "./types";

export interface ImagingMprSlidersProps {
	cbctWorkbenchProjections?: string[] | undefined;
	mprProjection?: string | undefined;
	setMprProjection: (proj: string) => void;
	mprControlsReady: boolean;
	mprProjectionLabels: Record<string, string>;
	mprAxisDeg: number;
	mprAxisRangeValue?: string | undefined;
	mprAxisBounds: { min: number; max: number };
	clampMprAxisDeg: (deg: number) => number;
	setMprAxisDeg: (deg: number) => void;
	mprAxisNudgeDeg?: number[] | undefined;
	formatSignedMprStep: (val: number, unit: string) => string;
	mprAxisPresetDeg?: number[] | undefined;
	mprSlabMm?: number | undefined;
	mprSlabRangeValue?: string | undefined;
	mprSlabBounds: { min: number; max: number };
	clampMprSlabMm: (mm: number) => number;
	setMprSlabMm: (mm: number) => void;
	mprSlabNudgeMm?: number[] | undefined;
	mprSlabPresetMm?: number[] | undefined;
	mprSliceLabel?: string | undefined;
	mprSliceMaxIndex: number;
	mprSafeSliceIndex: number;
	mprSliceRangeValue?: string | undefined;
	clampMprSliceIndex: (idx: number, max: number) => number;
	setMprSliceIndex: (idx: number) => void;
	mprSliceNudgeSteps?: number[] | undefined;
	mprSlicePresetFractions?: any[] | undefined;
	mprSliceIndexFromFraction: (frac: number, max: number) => number;
	resetMprControls: () => void;
	mprWorkbenchLocalSavedAt?: any;
	formatTime: (t: any) => string;
	mprWorkbenchDraftRestored?: boolean | undefined;
	restoreMprWorkbenchLocalDraft: () => void;
	mprClinicalPresets?: any[] | undefined;
	describeMprClinicalPresetProjectionFallback: any;
	mprClinicalPresetButtonClass?: any;
	applyMprClinicalPreset?: any;
	mprNearestClinicalPreset?: any;
	mprWindowPresetLabels: Record<string, string>;
	mprWindowPreset?: any;
	setMprWindowPreset: (p: any) => void;
	mprCrosshairEnabled?: boolean | undefined;
	setMprCrosshairEnabled: (en: boolean) => void;
	mprLinkedPlanesEnabled?: boolean | undefined;
	setMprLinkedPlanesEnabled: (en: boolean) => void;
}

export function ImagingMprSliders(props: ImagingMprSlidersProps) {
	const {
		cbctWorkbenchProjections,
		mprProjection,
		setMprProjection,
		mprControlsReady,
		mprProjectionLabels,
		mprAxisDeg,
		mprAxisRangeValue,
		mprAxisBounds,
		clampMprAxisDeg,
		setMprAxisDeg,
		mprAxisNudgeDeg,
		formatSignedMprStep,
		mprAxisPresetDeg,
		mprSlabMm,
		mprSlabRangeValue,
		mprSlabBounds,
		clampMprSlabMm,
		setMprSlabMm,
		mprSlabNudgeMm,
		mprSlabPresetMm,
		mprSliceLabel,
		mprSliceMaxIndex,
		mprSafeSliceIndex,
		mprSliceRangeValue,
		clampMprSliceIndex,
		setMprSliceIndex,
		mprSliceNudgeSteps,
		mprSlicePresetFractions,
		mprSliceIndexFromFraction,
		resetMprControls,
		mprWorkbenchLocalSavedAt,
		formatTime,
		mprWorkbenchDraftRestored,
		restoreMprWorkbenchLocalDraft,
		mprClinicalPresets,
		describeMprClinicalPresetProjectionFallback,
		mprClinicalPresetButtonClass,
		applyMprClinicalPreset,
		mprNearestClinicalPreset,
		mprWindowPresetLabels,
		mprWindowPreset,
		setMprWindowPreset,
		mprCrosshairEnabled,
		setMprCrosshairEnabled,
		mprLinkedPlanesEnabled,
		setMprLinkedPlanesEnabled,
	} = props;

	return (
		<div className="mpr-control-panel">
			<div className="mpr-toggle-row">
				{(cbctWorkbenchProjections ?? []).map((projection: any) => (
					<button
						className={mprProjection === projection ? "active" : ""}
						key={projection}
						type="button"
						onClick={() => setMprProjection(projection)}
						disabled={!mprControlsReady}
						aria-pressed={mprProjection === projection}
					>
						{mprProjectionLabels[projection]}
					</button>
				))}
			</div>
			<label>
				Угол оси: {mprAxisDeg}°
				<input
					aria-valuetext={mprAxisRangeValue}
					disabled={!mprControlsReady}
					min={mprAxisBounds.min}
					max={mprAxisBounds.max}
					step="1"
					type="range"
					value={mprAxisDeg}
					style={{ touchAction: "none" }}
					className="cbct-mpr-range-slider"
					onChange={(event) =>
						setMprAxisDeg(clampMprAxisDeg(Number(event.target.value)))
					}
				/>
			</label>
			<fieldset
				className="mpr-stepper-row"
				data-testid="ct-mpr-axis-nudge"
				aria-label="Точная правка угла КТ-срезов"
			>
				{(mprAxisNudgeDeg ?? []).map((delta: any) => (
					<button
						key={delta}
						type="button"
						onClick={() => setMprAxisDeg(clampMprAxisDeg(mprAxisDeg + delta))}
						disabled={!mprControlsReady}
						aria-label={`Изменить угол оси КТ-среза на ${formatSignedMprStep(delta, "°")}`}
					>
						{formatSignedMprStep(delta, "°")}
					</button>
				))}
			</fieldset>
			<fieldset className="mpr-preset-row" aria-label="Быстрые углы КТ-срезов">
				{(mprAxisPresetDeg ?? []).map((angle: any) => (
					<button
						className={mprAxisDeg === angle ? "active" : ""}
						key={angle}
						type="button"
						onClick={() => setMprAxisDeg(angle)}
						disabled={!mprControlsReady}
						aria-pressed={mprAxisDeg === angle}
						aria-label={`Установить угол оси КТ-срезов ${angle > 0 ? `+${angle}` : angle}°`}
					>
						{angle > 0 ? `+${angle}°` : `${angle}°`}
					</button>
				))}
			</fieldset>
			<label>
				Толщина слоя: {mprSlabMm} мм
				<input
					aria-valuetext={mprSlabRangeValue}
					disabled={!mprControlsReady}
					min={mprSlabBounds.min}
					max={mprSlabBounds.max}
					step="1"
					type="range"
					value={mprSlabMm}
					style={{ touchAction: "none" }}
					className="cbct-mpr-range-slider"
					onChange={(event) =>
						setMprSlabMm(clampMprSlabMm(Number(event.target.value)))
					}
				/>
			</label>
			<fieldset
				className="mpr-stepper-row"
				data-testid="ct-mpr-slab-nudge"
				aria-label="Точная правка толщины слоя КТ-срезов"
			>
				{(mprSlabNudgeMm ?? []).map((delta: any) => (
					<button
						key={delta}
						type="button"
						onClick={() => setMprSlabMm(clampMprSlabMm((mprSlabMm ?? 0) + delta))}
						disabled={!mprControlsReady}
						aria-label={`Изменить толщину слоя КТ-срезов на ${formatSignedMprStep(delta, " мм")}`}
					>
						{formatSignedMprStep(delta, " мм")}
					</button>
				))}
			</fieldset>
			<fieldset
				className="mpr-preset-row"
				aria-label="Быстрая толщина слоя КТ-срезов"
			>
				{(mprSlabPresetMm ?? []).map((slab: any) => (
					<button
						className={mprSlabMm === slab ? "active" : ""}
						key={slab}
						type="button"
						onClick={() => setMprSlabMm(slab)}
						disabled={!mprControlsReady}
						aria-pressed={mprSlabMm === slab}
						aria-label={`Установить толщину слоя КТ-срезов ${slab} мм`}
					>
						{slab} мм
					</button>
				))}
				<button
					type="button"
					onClick={() => setMprAxisDeg(0)}
					disabled={!mprControlsReady}
					aria-pressed={mprAxisDeg === 0}
					aria-label="Вернуть ось КТ-срезов к 0°"
				>
					<RotateCcw aria-hidden="true" /> ось 0°
				</button>
			</fieldset>
			<label>
				Положение среза: {mprSliceLabel}
				<input
					disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
					min="0"
					max={mprSliceMaxIndex}
					step="1"
					type="range"
					value={mprSafeSliceIndex}
					aria-valuetext={mprSliceRangeValue}
					style={{ touchAction: "none" }}
					className="cbct-mpr-range-slider"
					onChange={(event) =>
						setMprSliceIndex(
							clampMprSliceIndex(
								Number(event.target.value),
								mprSliceMaxIndex,
							),
						)
					}
				/>
			</label>
			<fieldset
				className="mpr-manual-grid"
				data-testid="ct-mpr-manual-inputs"
				aria-label="Точные числовые настройки КТ-срезов"
			>
				<label>
					Угол, °
					<input
						disabled={!mprControlsReady}
						inputMode="numeric"
						max={mprAxisBounds.max}
						min={mprAxisBounds.min}
						step="1"
						type="number"
						value={mprAxisDeg}
						onChange={(event) =>
							setMprAxisDeg(clampMprAxisDeg(Number(event.target.value)))
						}
					/>
				</label>
				<label>
					Слой, мм
					<input
						disabled={!mprControlsReady}
						inputMode="numeric"
						max={mprSlabBounds.max}
						min={mprSlabBounds.min}
						step="1"
						type="number"
						value={mprSlabMm}
						onChange={(event) =>
							setMprSlabMm(clampMprSlabMm(Number(event.target.value)))
						}
					/>
				</label>
				<label>
					Срез
					<input
						disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
						inputMode="numeric"
						max={mprSliceMaxIndex + 1}
						min="1"
						step="1"
						type="number"
						value={mprSafeSliceIndex + 1}
						onChange={(event) =>
							setMprSliceIndex(
								clampMprSliceIndex(
									Number(event.target.value) - 1,
									mprSliceMaxIndex,
								),
							)
						}
					/>
				</label>
			</fieldset>
			<fieldset
				className="mpr-stepper-row"
				data-testid="ct-mpr-slice-nudge"
				aria-label="Точная навигация по КТ-срезам"
			>
				{(mprSliceNudgeSteps ?? []).map((delta: any) => (
					<button
						key={delta}
						type="button"
						onClick={() =>
							setMprSliceIndex(
								clampMprSliceIndex(
									mprSafeSliceIndex + delta,
									mprSliceMaxIndex,
								),
							)
						}
						disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
						aria-label={`Перейти по КТ-срезам на ${formatSignedMprStep(delta, " срез")}`}
					>
						{formatSignedMprStep(delta, " срез")}
					</button>
				))}
			</fieldset>
			<fieldset className="mpr-preset-row" aria-label="Опорные КТ-срезы">
				{(mprSlicePresetFractions ?? []).map((preset: any) => {
					const targetIndex = mprSliceIndexFromFraction(
						preset.fraction,
						mprSliceMaxIndex,
					);
					return (
						<button
							className={mprSafeSliceIndex === targetIndex ? "active" : ""}
							key={preset.id}
							type="button"
							onClick={() => setMprSliceIndex(targetIndex)}
							disabled={!mprControlsReady || mprSliceMaxIndex <= 0}
							aria-pressed={mprSafeSliceIndex === targetIndex}
							aria-label={`Перейти на опорный КТ-срез: ${preset.label}`}
						>
							{preset.label}
						</button>
					);
				})}
			</fieldset>
			<button
				className="mpr-reset-button"
				type="button"
				onClick={resetMprControls}
				disabled={!mprControlsReady}
			>
				<RefreshCw aria-hidden="true" /> Сбросить КТ-срезы
			</button>
			<div className="mpr-memory-strip" data-testid="ct-mpr-memory-strip">
				<div>
					<strong>
						{mprWorkbenchLocalSavedAt
							? `Последний вид ${formatTime(mprWorkbenchLocalSavedAt)}`
							: "Последний вид появится после настройки"}
					</strong>
					<span>
						{mprWorkbenchDraftRestored
							? "Серия открыта с сохраненными осями, окном и толщиной слоя."
							: "Ось, толщина слоя, окно, курсор и связанные плоскости запоминаются для этой КТ-серии."}
					</span>
				</div>
				<button
					type="button"
					onClick={restoreMprWorkbenchLocalDraft}
					disabled={!mprControlsReady || !mprWorkbenchLocalSavedAt}
				>
					<History aria-hidden="true" /> Вернуть вид
				</button>
			</div>
			<fieldset
				className="mpr-clinical-preset-grid"
				data-testid="ct-mpr-clinical-presets"
				aria-label="Клинические протоколы КТ-срезов"
			>
				{(mprClinicalPresets || []).map((preset: any) => {
					const projectionFallbackNote = mprControlsReady
						? describeMprClinicalPresetProjectionFallback(
								preset.projection,
								cbctWorkbenchProjections,
								mprProjectionLabels,
							)
						: null;
					return (
						<button
							className={
								typeof mprClinicalPresetButtonClass === "function"
									? mprClinicalPresetButtonClass(preset)
									: ""
							}
							key={preset.id}
							type="button"
							onClick={() => applyMprClinicalPreset?.(preset)}
							aria-current={
								mprNearestClinicalPreset?.exact &&
								mprNearestClinicalPreset?.title === preset.title
									? "true"
									: undefined
							}
							disabled={!mprControlsReady}
						>
							<strong>{preset.title}</strong>
							<span>{preset.detail}</span>
							{projectionFallbackNote ? (
								<small>{projectionFallbackNote}</small>
							) : null}
						</button>
					);
				})}
			</fieldset>
			<div className="mpr-toggle-row">
				{(
					Object.keys(mprWindowPresetLabels) as MprWindowPreset[]
				).map((preset) => (
					<button
						className={mprWindowPreset === preset ? "active" : ""}
						key={preset}
						type="button"
						onClick={() => setMprWindowPreset(preset)}
						disabled={!mprControlsReady}
						aria-pressed={mprWindowPreset === preset}
					>
						{mprWindowPresetLabels[preset]}
					</button>
				))}
			</div>
			<div className="mpr-check-row">
				<label>
					<input
						checked={mprCrosshairEnabled}
						disabled={!mprControlsReady}
						type="checkbox"
						onChange={(event) =>
							setMprCrosshairEnabled(event.target.checked)
						}
					/>
					Синхронный курсор
				</label>
				<label>
					<input
						checked={mprLinkedPlanesEnabled}
						disabled={!mprControlsReady}
						type="checkbox"
						onChange={(event) =>
							setMprLinkedPlanesEnabled(event.target.checked)
						}
					/>
					Связанные плоскости
				</label>
			</div>
			{!mprControlsReady ? (
				<p className="mpr-control-disabled-note" role="status">
					Сначала откройте готовую КЛКТ/КТ-серию. После этого включатся оси,
					толщина слоя и связанные плоскости.
				</p>
			) : null}
		</div>
	);
}
