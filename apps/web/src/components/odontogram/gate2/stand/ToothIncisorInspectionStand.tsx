import type React from "react";
import { ToothIncisorPresetBar } from "./ToothIncisorPresetBar";
import { ToothIncisorStage } from "./ToothIncisorStage";
import { ToothIncisorStandHeader } from "./ToothIncisorStandHeader";
import { ToothIncisorStandHud } from "./ToothIncisorStandHud";
import { ToothIncisorStandToggles } from "./ToothIncisorStandToggles";
import { useToothIncisorStandState } from "./useToothIncisorStandState";

/**
 * DENTE Dental CRM — Master Incisor Inspection Stand (Gate 2)
 * Wheeler's Dental Anatomy Ch. 8 (Upper: 11, 21, 12, 22) & Ch. 9 (Lower: 31, 41, 32, 42).
 * Apple HIG mobile touch ergonomics, true OLED dark mode, strictly <= 120 lines.
 */
export const ToothIncisorInspectionStand: React.FC = () => {
	const s = useToothIncisorStandState();

	return (
		<div
			data-testid="tooth-incisor-gate2-stand"
			className="min-h-screen w-full p-2.5 sm:p-4 flex flex-col items-center select-none overflow-x-clip max-w-[100vw] bg-[var(--paper)] text-[var(--ink)]"
		>
			<ToothIncisorStandHeader
				toothNumber={s.toothNumber}
				onToothNumberChange={s.setToothNumber}
				zoom={s.zoom}
				onZoomChange={s.setZoom}
				isDark={s.isDark}
				onToggleTheme={() => s.setIsDark((d) => !d)}
			/>
			<div className="w-full max-w-5xl flex flex-col gap-1.5 py-2">
				<ToothIncisorPresetBar
					activePreset={s.activePreset}
					onApplyPreset={s.applyPreset}
				/>
				<ToothIncisorStandToggles
					layers={s.layers}
					toothNumber={s.toothNumber}
					onToggle={s.toggleLayer}
				/>
			</div>
			<main className="flex-1 w-full max-w-5xl rounded-2xl border border-[var(--line)] p-3 sm:p-6 flex flex-col items-center justify-center relative overflow-auto min-h-[420px]">
				<ToothIncisorStandHud
					toothNumber={s.toothNumber}
					zoom={s.zoom}
					activePresetTitle={s.activePresetTitle}
					isDark={s.isDark}
				/>
				<div className="p-4 sm:p-8 pt-8 pb-40 transition-transform duration-200">
					<ToothIncisorStage
						toothNumber={s.toothNumber}
						zoom={s.zoom}
						isDark={s.isDark}
						layers={s.layers}
					/>
				</div>
			</main>
		</div>
	);
};
