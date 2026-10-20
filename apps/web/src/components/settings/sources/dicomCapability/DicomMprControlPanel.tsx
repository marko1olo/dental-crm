import type { MprWindowPreset } from "@dental/shared";
import { History, RefreshCw, RotateCcw } from "lucide-react";
import type { DicomMprControlPanelProps, InputChangeEvent } from "./types";

export function DicomMprControlPanel({
	mprControlsReady,
	cbctWorkbenchProjections = [],
	mprProjection,
	setMprProjection,
	mprProjectionLabels = {} as DicomMprControlPanelProps["mprProjectionLabels"],
	mprAxisDeg = 0,
	mprAxisRangeValue,
	mprAxisBounds = { min: -45, max: 45 },
	setMprAxisDeg,
	clampMprAxisDeg,
	mprAxisNudgeDeg = [-5, -1, 1, 5],
	formatSignedMprStep = (v, u) => `${v > 0 ? `+${v}` : v}${u}`,
	mprAxisPresetDeg = [-30, -15, 0, 15, 30],
	mprSlabMm = 1,
	mprSlabRangeValue,
	mprSlabBounds = { min: 1, max: 30 },
	setMprSlabMm,
	clampMprSlabMm,
	mprSlabNudgeMm = [-2, -1, 1, 2],
	mprSlabPresetMm = [1, 3, 5, 10, 20],
	mprSliceLabel,
	mprSliceMaxIndex = 0,
	mprSafeSliceIndex = 0,
	mprSliceRangeValue,
	setMprSliceIndex,
	clampMprSliceIndex,
	mprSliceNudgeSteps = [-10, -1, 1, 10],
	mprSlicePresetFractions = [],
	mprSliceIndexFromFraction,
	resetMprControls,
	mprWorkbenchLocalSavedAt,
	formatTime = (v) => String(v ?? ""),
	mprWorkbenchDraftRestored,
	restoreMprWorkbenchLocalDraft,
	mprClinicalPresets = [],
	describeMprClinicalPresetProjectionFallback,
	mprClinicalPresetButtonClass = () => "",
	applyMprClinicalPreset,
	mprNearestClinicalPreset,
	mprWindowPresetLabels = {} as Record<MprWindowPreset, string>,
	mprWindowPreset,
	setMprWindowPreset,
	mprCrosshairEnabled,
	setMprCrosshairEnabled,
	mprLinkedPlanesEnabled,
	setMprLinkedPlanesEnabled,
}: DicomMprControlPanelProps) {
	const safeProjections = Array.isArray(cbctWorkbenchProjections)
		? cbctWorkbenchProjections
		: [];
	const safeAxisNudge = Array.isArray(mprAxisNudgeDeg)
		? mprAxisNudgeDeg
		: [-5, -1, 1, 5];
	const safeAxisPresets = Array.isArray(mprAxisPresetDeg)
		? mprAxisPresetDeg
		: [-30, -15, 0, 15, 30];
	const safeSlabNudge = Array.isArray(mprSlabNudgeMm)
		? mprSlabNudgeMm
		: [-2, -1, 1, 2];
	const safeSlabPresets = Array.isArray(mprSlabPresetMm)
		? mprSlabPresetMm
		: [1, 3, 5, 10, 20];
	const safeSliceNudge = Array.isArray(mprSliceNudgeSteps)
		? mprSliceNudgeSteps
		: [-10, -1, 1, 10];
	const safeSliceFractions = Array.isArray(mprSlicePresetFractions)
		? mprSlicePresetFractions
		: [];
	const safeClinicalPresets = Array.isArray(mprClinicalPresets)
		? mprClinicalPresets
		: [];
	const safeWindowLabels =
		mprWindowPresetLabels && typeof mprWindowPresetLabels === "object"
			? mprWindowPresetLabels
			: ({} as Record<MprWindowPreset, string>);

	return (
		<div className="mpr-control-panel">
			<div className="mpr-toggle-row">
				{safeProjections.map((projection) => (
					<button
						className={mprProjection === projection ? "active" : ""}
						key={projection}
						type="button"
						onClick={() => setMprProjection(projection)}
						disabled={!mprControlsReady}
						aria-pressed={mprProjection === projection}
					>
						{mprProjectionLabels?.[projection] ?? projection}
					</button>
				))}
			</div>
			<label>
				Угол оси: {mprAxisDeg}°
				<input
					aria-valuetext={mprAxisRangeValue}
					disabled={!mprControlsReady}
					min={mprAxisBounds?.min ?? -45}
					max={mprAxisBounds?.max ?? 45}
					step="1"
					type="range"
					value={mprAxisDeg}
					onChange={(event: InputChangeEvent) =>
						setMprAxisDeg(clampMprAxisDeg(Number(event.target.value)))
					}
				/>
			</label>
			<div
				role="toolbar"
				className="mpr-stepper-row"
				data-testid="ct-mpr-axis-nudge"
				aria-label="Точная правка угла КТ-срезов"
			>
				{safeAxisNudge.map((delta) => (
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
			</div>
			<div
				role="toolbar"
				className="mpr-preset-row"
				aria-label="Быстрые углы КТ-срезов"
			>
				{safeAxisPresets.map((angle) => (
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
			</div>
			<label>
				Толщина слоя: {mprSlabMm} мм
				<input
					aria-valuetext={mprSlabRangeValue}
					disabled={!mprControlsReady}
					min={mprSlabBounds?.min ?? 1}
					max={mprSlabBounds?.max ?? 30}
					step="1"
					type="range"
					value={mprSlabMm}
					onChange={(event: InputChangeEvent) =>
						setMprSlabMm(clampMprSlabMm(Number(event.target.value)))
					}
				/>
			</label>
			<div
				role="toolbar"
				className="mpr-stepper-row"
				data-testid="ct-mpr-slab-nudge"
				aria-label="Точная правка толщины слоя КТ-срезов"
			>
				{safeSlabNudge.map((delta) => (
					<button
						key={delta}
						type="button"
						onClick={() => setMprSlabMm(clampMprSlabMm(mprSlabMm + delta))}
						disabled={!mprControlsReady}
						aria-label={`Изменить толщину слоя КТ-срезов на ${formatSignedMprStep(delta, " мм")}`}
					>
						{formatSignedMprStep(delta, " мм")}
					</button>
				))}
			</div>
			<div
				role="toolbar"
				className="mpr-preset-row"
				aria-label="Быстрая толщина слоя КТ-срезов"
			>
				{safeSlabPresets.map((slab) => (
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
			</div>
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
					onChange={(event: InputChangeEvent) =>
						setMprSliceIndex(
							clampMprSliceIndex(
								Number(event.target.value),
								mprSliceMaxIndex,
							),
						)
					}
				/>
			</label>
			<div
				role="toolbar"
				className="mpr-manual-grid"
				data-testid="ct-mpr-manual-inputs"
				aria-label="Точные числовые настройки КТ-срезов"
			>
				<label>
					Угол, °
					<input
						disabled={!mprControlsReady}
						inputMode="numeric"
						max={mprAxisBounds?.max ?? 45}
						min={mprAxisBounds?.min ?? -45}
						step="1"
						type="number"
						value={mprAxisDeg}
						onChange={(event: InputChangeEvent) =>
							setMprAxisDeg(clampMprAxisDeg(Number(event.target.value)))
						}
					/>
				</label>
				<label>
					Слой, мм
					<input
						disabled={!mprControlsReady}
						inputMode="numeric"
						max={mprSlabBounds?.max ?? 30}
						min={mprSlabBounds?.min ?? 1}
						step="1"
						type="number"
						value={mprSlabMm}
						onChange={(event: InputChangeEvent) =>
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
						onChange={(event: InputChangeEvent) =>
							setMprSliceIndex(
								clampMprSliceIndex(
									Number(event.target.value) - 1,
									mprSliceMaxIndex,
								),
							)
						}
					/>
				</label>
			</div>
			<div
				role="toolbar"
				className="mpr-stepper-row"
				data-testid="ct-mpr-slice-nudge"
				aria-label="Точная навигация по КТ-срезам"
			>
				{safeSliceNudge.map((delta) => (
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
			</div>
			<div
				role="toolbar"
				className="mpr-preset-row"
				aria-label="Опорные КТ-срезы"
			>
				{safeSliceFractions.map((preset) => {
					const targetIndex = mprSliceIndexFromFraction(
						preset.fraction,
						mprSliceMaxIndex,
					);
					return (
						<button
							className={
								mprSafeSliceIndex === targetIndex ? "active" : ""
							}
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
			</div>
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
			<div
				role="toolbar"
				className="mpr-clinical-preset-grid"
				data-testid="ct-mpr-clinical-presets"
				aria-label="Клинические протоколы КТ-срезов"
			>
				{safeClinicalPresets.map((preset) => {
					const projectionFallbackNote =
						mprControlsReady && describeMprClinicalPresetProjectionFallback
							? describeMprClinicalPresetProjectionFallback(
									preset.projection,
									safeProjections,
									mprProjectionLabels,
								)
							: null;
					return (
						<button
							className={mprClinicalPresetButtonClass(preset)}
							key={preset.id}
							type="button"
							onClick={() => applyMprClinicalPreset(preset)}
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
			</div>
			<div className="mpr-toggle-row">
				{(Object.keys(safeWindowLabels) as MprWindowPreset[]).map(
					(preset) => (
						<button
							className={mprWindowPreset === preset ? "active" : ""}
							key={preset}
							type="button"
							onClick={() => setMprWindowPreset(preset)}
							disabled={!mprControlsReady}
							aria-pressed={mprWindowPreset === preset}
						>
							{safeWindowLabels[preset]}
						</button>
					),
				)}
			</div>
			<div className="mpr-check-row">
				<label>
					<input
						checked={mprCrosshairEnabled}
						disabled={!mprControlsReady}
						type="checkbox"
						className="toggle-switch"
						onChange={(event: InputChangeEvent) =>
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
						className="toggle-switch"
						onChange={(event: InputChangeEvent) =>
							setMprLinkedPlanesEnabled(event.target.checked)
						}
					/>
					Связанные плоскости
				</label>
			</div>
			{!mprControlsReady ? (
				<p className="mpr-control-disabled-note" role="status">
					Сначала нажмите «Проверить серии» и выберите готовую
					КЛКТ/КТ-серию. После этого включатся оси, толщина слоя и
					связанные плоскости.
				</p>
			) : null}
		</div>
	);
}
