import React from "react";
import { RotateCcw } from "lucide-react";
import { AnatomicalToothSVG } from "../../../odontogram/AnatomicalToothSVG";
import { ToothSurfacesButtons } from "./ToothSurfacesButtons";

export interface ToothSurfacesSelectorProps {
	code: string;
	selectedSurfaces: string[];
	onSelectSurface?: ((surface: string) => void) | undefined;
	onClearSurfaces?: (() => void) | undefined;
}

export function ToothSurfacesSelector({
	code,
	selectedSurfaces,
	onSelectSurface,
	onClearSurfaces,
}: ToothSurfacesSelectorProps) {
	const toothNum = Number(code) || 16;

	return (
		<div className="_ccm-surfaces-selector-block mb-3 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="flex items-center justify-between mb-2">
				<span className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
					<span>Анатомические поверхности (MODBL) · Зуб {code}</span>
					{selectedSurfaces.length > 0 && (
						<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--teal-subtle)] text-[var(--teal)] font-bold">
							[{selectedSurfaces.join("")}]
						</span>
					)}
				</span>
				{selectedSurfaces.length > 0 && onClearSurfaces && (
					<button
						type="button"
						onClick={onClearSurfaces}
						className="text-[11px] text-[var(--muted)] hover:text-red-500 flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
						title="Сбросить выбранные поверхности"
						aria-label="Сбросить выбранные поверхности"
					>
						<RotateCcw className="w-3 h-3" />
						<span>Сброс</span>
					</button>
				)}
			</div>

			<div className="flex items-center justify-center p-2 mb-2.5 bg-[var(--paper)] rounded-xl border border-[var(--line)] shadow-inner">
				<div className="w-[120px] h-[130px] flex items-center justify-center overflow-hidden">
					<AnatomicalToothSVG
						number={toothNum}
						state="Healthy"
						scale={0.88}
						useSurfaces={true}
						surfaces={selectedSurfaces}
						showPeriodontalBoneLoss={false}
						showPulpAndCanals={false}
						showPeriapicalHalos={false}
						onClick={(_e, _num, surf) => {
							if (surf && onSelectSurface) onSelectSurface(surf);
						}}
					/>
				</div>
			</div>

			<ToothSurfacesButtons
				selectedSurfaces={selectedSurfaces}
				onSelectSurface={onSelectSurface}
			/>
		</div>
	);
}
