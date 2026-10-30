import React from "react";
import {
	type FdiToothRecord,
	type ToothClinicalStatusCode,
	type ToothSurface,
	toothStatusCodeShortMap,
} from "@dental/shared";
import { SURFACES } from "./types";

export interface OdontogramToothSurfaceEditorProps {
	readonly selectedTooth: number;
	readonly currentToothRecord?: FdiToothRecord | undefined;
	readonly activeStatus: ToothClinicalStatusCode;
	readonly effectiveDisabled: boolean;
	readonly handleToothStatusSet: (
		toothNumber: number,
		code: ToothClinicalStatusCode,
	) => void;
	readonly handleSurfaceToggle: (
		toothNumber: number,
		surface: ToothSurface,
	) => void;
}

export const OdontogramToothSurfaceEditor: React.FC<OdontogramToothSurfaceEditorProps> = ({
	selectedTooth,
	currentToothRecord,
	activeStatus,
	effectiveDisabled,
	handleToothStatusSet,
	handleSurfaceToggle,
}) => {
	if (!selectedTooth) return null;

	return (
		<div className="tooth-surface-editor mt-4 p-3 border border-[var(--line,#e2e8f0)] rounded-xl bg-[var(--paper-soft,rgba(0,0,0,0.02))]">
			<div className="flex items-center justify-between flex-wrap gap-2 mb-2">
				<h5 className="m-0 text-sm font-bold text-[var(--ink,#0f172a)]">
					Зуб #{selectedTooth}: Клинический статус и анатомические грани
				</h5>
			</div>

			<div className="flex gap-2 my-2 flex-wrap items-center">
				<button
					type="button"
					className="btn btn-sm btn-outline-primary text-xs font-semibold"
					onClick={() => handleToothStatusSet(selectedTooth, activeStatus)}
					disabled={effectiveDisabled}
				>
					Применить статус ({toothStatusCodeShortMap[activeStatus]})
				</button>
				<button
					type="button"
					className="btn btn-sm btn-outline-danger text-xs font-semibold"
					onClick={() => handleToothStatusSet(selectedTooth, "extracted_absent")}
					disabled={effectiveDisabled}
				>
					Удален (A)
				</button>
				<button
					type="button"
					className="btn btn-sm btn-outline-success text-xs font-semibold"
					onClick={() => handleToothStatusSet(selectedTooth, "healthy")}
					disabled={effectiveDisabled}
				>
					Здоров (Norm)
				</button>
			</div>

			<div className="mt-3">
				<label className="text-xs font-semibold block mb-1 text-[var(--ink-secondary,#64748b)]">
					Пораженные поверхности (5 анатомических поверхностей по FDI):
				</label>
				<div className="flex gap-2 flex-wrap">
					{SURFACES.map((s) => {
						const active = Boolean(
							currentToothRecord?.surfaces?.includes(s.key),
						);
						return (
							<button
								key={s.key}
								type="button"
								className={`btn btn-sm text-xs py-1 px-2.5 rounded-md font-medium transition-colors ${
									active
										? "btn-warning font-bold shadow-xs"
										: "btn-outline-secondary opacity-80 hover:opacity-100"
								}`}
								onClick={() => handleSurfaceToggle(selectedTooth, s.key)}
								disabled={effectiveDisabled}
							>
								{s.label}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
