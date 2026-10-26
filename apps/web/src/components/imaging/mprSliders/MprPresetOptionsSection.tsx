/**
 * MprPresetOptionsSection.tsx — Клинические протоколы, память видов и переключатели (Мандат 8b <= 120 строк).
 */

import React from "react";
import { History, RefreshCw } from "lucide-react";
import type { MprWindowPreset } from "../types";
import type { ImagingMprSlidersProps } from "./types";

type Props = Pick<
	ImagingMprSlidersProps,
	| "resetMprControls"
	| "mprControlsReady"
	| "mprWorkbenchLocalSavedAt"
	| "formatTime"
	| "mprWorkbenchDraftRestored"
	| "restoreMprWorkbenchLocalDraft"
	| "mprClinicalPresets"
	| "describeMprClinicalPresetProjectionFallback"
	| "cbctWorkbenchProjections"
	| "mprProjectionLabels"
	| "mprClinicalPresetButtonClass"
	| "applyMprClinicalPreset"
	| "mprNearestClinicalPreset"
	| "mprWindowPresetLabels"
	| "mprWindowPreset"
	| "setMprWindowPreset"
	| "mprCrosshairEnabled"
	| "setMprCrosshairEnabled"
	| "mprLinkedPlanesEnabled"
	| "setMprLinkedPlanesEnabled"
>;

export const MprPresetOptionsSection: React.FC<Props> = ({
	resetMprControls, mprControlsReady, mprWorkbenchLocalSavedAt, formatTime,
	mprWorkbenchDraftRestored, restoreMprWorkbenchLocalDraft, mprClinicalPresets,
	describeMprClinicalPresetProjectionFallback, cbctWorkbenchProjections,
	mprProjectionLabels, mprClinicalPresetButtonClass, applyMprClinicalPreset,
	mprNearestClinicalPreset, mprWindowPresetLabels, mprWindowPreset,
	setMprWindowPreset, mprCrosshairEnabled, setMprCrosshairEnabled,
	mprLinkedPlanesEnabled, setMprLinkedPlanesEnabled,
}) => {
	return (
		<>
			<button className="mpr-reset-button" type="button" onClick={resetMprControls} disabled={!mprControlsReady}>
				<RefreshCw aria-hidden="true" /> Сбросить КТ-срезы
			</button>
			<div className="mpr-memory-strip" data-testid="ct-mpr-memory-strip">
				<div>
					<strong>{mprWorkbenchLocalSavedAt ? `Последний вид ${formatTime(mprWorkbenchLocalSavedAt)}` : "Последний вид появится после настройки"}</strong>
					<span>{mprWorkbenchDraftRestored ? "Серия открыта с сохраненными осями, окном и толщиной слоя." : "Ось, толщина слоя, окно, курсор и плоскости запоминаются для этой КТ-серии."}</span>
				</div>
				<button type="button" onClick={restoreMprWorkbenchLocalDraft} disabled={!mprControlsReady || !mprWorkbenchLocalSavedAt}>
					<History aria-hidden="true" /> Вернуть вид
				</button>
			</div>
			<fieldset className="mpr-clinical-preset-grid" data-testid="ct-mpr-clinical-presets" aria-label="Клинические протоколы КТ-срезов">
				{(mprClinicalPresets || []).map((preset: any) => {
					const fallbackNote = mprControlsReady ? describeMprClinicalPresetProjectionFallback(preset.projection, cbctWorkbenchProjections, mprProjectionLabels) : null;
					return (
						<button
							className={typeof mprClinicalPresetButtonClass === "function" ? mprClinicalPresetButtonClass(preset) : ""}
							key={preset.id}
							type="button"
							onClick={() => applyMprClinicalPreset?.(preset)}
							aria-current={mprNearestClinicalPreset?.exact && mprNearestClinicalPreset?.title === preset.title ? "true" : undefined}
							disabled={!mprControlsReady}
						>
							<strong>{preset.title}</strong>
							<span>{preset.detail}</span>
							{fallbackNote ? <small>{fallbackNote}</small> : null}
						</button>
					);
				})}
			</fieldset>
			<div className="mpr-toggle-row">
				{(Object.keys(mprWindowPresetLabels) as MprWindowPreset[]).map((preset) => (
					<button className={mprWindowPreset === preset ? "active" : ""} key={preset} type="button" onClick={() => setMprWindowPreset(preset)} disabled={!mprControlsReady} aria-pressed={mprWindowPreset === preset}>
						{mprWindowPresetLabels[preset]}
					</button>
				))}
			</div>
			<div className="mpr-check-row">
				<label>
					<input checked={mprCrosshairEnabled} disabled={!mprControlsReady} type="checkbox" onChange={(e) => setMprCrosshairEnabled(e.target.checked)} />
					Синхронный курсор
				</label>
				<label>
					<input checked={mprLinkedPlanesEnabled} disabled={!mprControlsReady} type="checkbox" onChange={(e) => setMprLinkedPlanesEnabled(e.target.checked)} />
					Связанные плоскости
				</label>
			</div>
			{!mprControlsReady ? (
				<p className="mpr-control-disabled-note" role="status">
					Сначала откройте готовую КЛКТ/КТ-серию. После этого включатся оси, толщина слоя и связанные плоскости.
				</p>
			) : null}
		</>
	);
};
