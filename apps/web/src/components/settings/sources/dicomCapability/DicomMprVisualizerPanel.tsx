import type { DicomMprVisualizerPanelProps } from "./types";

export function DicomMprVisualizerPanel({
	mprControlsReady,
	mprAxisVisualizerStyle,
	mprAxisVisualizerLabel,
	handleMprKeyboardNavigation,
	mprProjectionCompass,
	mprCrosshairEnabled,
	mprAxisAngleBadge,
	mprSlabBadge,
	mprSliceBadge,
	mprActiveProjectionLabel,
	mprActiveProjectionOrientation,
	mprAxisDirectionLabel,
	mprSlabMm,
	mprSliceLabel,
	mprAxisGuidance,
	mprWorkbenchSummaryText,
	mprLinkedPlanesEnabled,
	mprNearestClinicalPreset,
	applyNearestMprClinicalPreset,
}: DicomMprVisualizerPanelProps) {
	return (
		<div
			className={`mpr-axis-visualizer ${mprControlsReady ? "" : "disabled"}`}
			data-testid="ct-mpr-axis-visualizer"
			style={mprAxisVisualizerStyle}
			role="img"
			aria-label={mprAxisVisualizerLabel}
			aria-describedby="ct-mpr-keyboard-help"
			aria-disabled={!mprControlsReady}
			aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown Home End"
			tabIndex={mprControlsReady ? 0 : -1}
			onKeyDown={handleMprKeyboardNavigation}
		>
			<span className="visually-hidden" id="ct-mpr-keyboard-help">
				Стрелки влево и вправо меняют угол оси, стрелки вверх и вниз
				меняют срез, PageUp и PageDown меняют толщину слоя, Home и End
				переходят к началу и концу серии.
			</span>
			<div className="mpr-axis-board" aria-hidden="true">
				<span className="mpr-axis-label mpr-axis-label-top">
					{mprProjectionCompass.top}
				</span>
				<span className="mpr-axis-label mpr-axis-label-right">
					{mprProjectionCompass.right}
				</span>
				<span className="mpr-axis-label mpr-axis-label-bottom">
					{mprProjectionCompass.bottom}
				</span>
				<span className="mpr-axis-label mpr-axis-label-left">
					{mprProjectionCompass.left}
				</span>
				<span className="mpr-axis-slab" />
				<span className="mpr-axis-slice-marker" />
				<span className="mpr-axis-line mpr-axis-line-primary" />
				<span className="mpr-axis-line mpr-axis-line-secondary" />
				<span
					className={`mpr-axis-crosshair ${mprCrosshairEnabled ? "active" : ""}`}
				/>
				<span className="mpr-axis-angle-badge">{mprAxisAngleBadge}</span>
				<span className="mpr-axis-slab-badge">{mprSlabBadge}</span>
				<span className="mpr-axis-slice-badge">{mprSliceBadge}</span>
			</div>
			<div className="mpr-axis-facts">
				<strong>{mprActiveProjectionLabel}</strong>
				<span>{mprActiveProjectionOrientation}</span>
				<span>{mprProjectionCompass.summary}</span>
				<span>{mprAxisDirectionLabel}</span>
				<span>слой {mprSlabMm} мм</span>
				<span>{mprSliceLabel}</span>
				<div
					className="mpr-axis-guidance"
					data-testid="ct-mpr-axis-guidance"
				>
					<span>{mprAxisGuidance.tiltLabel}</span>
					<span>{mprAxisGuidance.slabLabel}</span>
					<span>{mprAxisGuidance.sliceLabel}</span>
				</div>
				<small
					className="mpr-workbench-summary"
					data-testid="ct-mpr-workbench-summary"
					aria-live="polite"
				>
					{mprWorkbenchSummaryText}
				</small>
				<small>
					{mprControlsReady
						? `${mprLinkedPlanesEnabled ? "плоскости связаны" : "плоскости отдельно"} · ${mprCrosshairEnabled ? "курсор включен" : "курсор скрыт"}`
						: "нажмите «Проверить серии» и выберите готовую КЛКТ/КТ-серию"}
				</small>
				<div
					className={`mpr-preset-fit ${mprNearestClinicalPreset.exact ? "exact" : ""}`}
					data-testid="ct-mpr-preset-fit"
				>
					<span>{mprNearestClinicalPreset.label}</span>
					<button
						type="button"
						onClick={applyNearestMprClinicalPreset}
						disabled={
							!mprControlsReady ||
							!mprNearestClinicalPreset.deltas.length ||
							!mprNearestClinicalPreset.title
						}
						aria-label={`Подогнать КТ-срезы под ближайший клинический протокол: ${mprNearestClinicalPreset.label}`}
						title={`Подогнать под протокол: ${mprNearestClinicalPreset.label}`}
					>
						Подогнать
					</button>
				</div>
			</div>
		</div>
	);
}
