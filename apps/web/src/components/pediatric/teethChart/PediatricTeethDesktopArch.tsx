import React from "react";
import type {
	PediatricToothItem,
	ToothClinicalFinding,
	ToothSurfaceCode,
} from "./pediatricTeethTypes";
import type { ResorptionStagePercent } from "../../odontogram/pediatricDentitionEngine";

interface PediatricTeethDesktopArchProps {
	readonly activeTooth?: number | null | undefined;
	readonly onSelectTooth?: ((t: number) => void) | undefined;
	readonly toothFindings: Readonly<Record<number, ToothClinicalFinding>>;
	readonly resorptionStages?: Readonly<Record<number, ResorptionStagePercent>> | undefined;
	readonly toothSurfaces?: Readonly<Record<number, readonly ToothSurfaceCode[]>> | undefined;
	readonly upperTeeth: readonly PediatricToothItem[];
	readonly lowerTeeth: readonly PediatricToothItem[];
	readonly isMixed: boolean;
}

export const PediatricTeethDesktopArch: React.FC<PediatricTeethDesktopArchProps> = ({
	activeTooth,
	onSelectTooth,
	toothFindings,
	resorptionStages,
	toothSurfaces,
	upperTeeth,
	lowerTeeth,
	isMixed,
}) => {
	const renderTooth = (t: PediatricToothItem) => {
		const isSelected = activeTooth === t.toothNumber;
		const finding = toothFindings[t.toothNumber] ?? "Healthy";
		const res = t.isPrimary && resorptionStages ? resorptionStages[t.toothNumber] : undefined;
		const surfaces = toothSurfaces?.[t.toothNumber] || [];

		return (
			<button
				key={`arch-${t.toothNumber}`}
				type="button"
				onClick={() => onSelectTooth?.(t.toothNumber)}
				className={`relative flex flex-col items-center justify-center rounded-xl border transition-all select-none cursor-pointer touch-manipulation min-w-[42px] min-h-[50px] p-1 ${
					isSelected
						? "border-teal-600 bg-teal-50/90 text-teal-950 ring-2 ring-teal-500/40 font-extrabold"
						: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:border-teal-400"
				}`}
				data-testid={`pediatric-tooth-btn-${t.toothNumber}`}
			>
				{!t.isPrimary && (
					<span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded bg-sky-600 px-1 text-[8px] font-black uppercase text-white tracking-tighter">
						Пост
					</span>
				)}
				<span className="font-mono font-black text-xs">{t.label}</span>
				{finding !== "Healthy" && <span className="text-[8px] font-bold truncate max-w-[40px]">{finding}</span>}
				{surfaces.length > 0 && <span className="text-[7px] font-mono text-teal-600 font-bold">{surfaces.join("")}</span>}
				{t.isPrimary && typeof res === "number" && res > 0 && (
					<span className="text-[8px] font-mono text-rose-600 font-bold" data-testid={`tooth-resorption-badge-${t.toothNumber}`}>{`R${res}%`}</span>
				)}
			</button>
		);
	};

	return (
		<div className="hidden sm:block space-y-2">
			<div>
				<div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase text-[var(--muted,#64748b)]">
					<span>Правый верх (Q5 / Q1)</span>
					<span className="text-[11px] font-extrabold text-[var(--ink,#0f172a)]">Верхняя челюсть</span>
					<span>Левый верх (Q6 / Q2)</span>
				</div>
				<div
					className={`grid gap-1.5 justify-center ${isMixed ? "grid-cols-12 min-w-[520px]" : "grid-cols-10 min-w-[440px]"}`}
					data-testid="pediatric-upper-arch"
				>
					{upperTeeth.map(renderTooth)}
				</div>
			</div>
			<div className="relative my-2 flex items-center justify-center">
				<div className="w-full border-t border-dashed border-[var(--line,#e2e8f0)]" />
				<span className="absolute bg-[var(--paper-soft,#f8fafc)] px-2 text-[10px] font-mono font-bold uppercase text-[var(--muted,#64748b)]">
					Окклюзионная плоскость
				</span>
			</div>
			<div>
				<div
					className={`grid gap-1.5 justify-center ${isMixed ? "grid-cols-12 min-w-[520px]" : "grid-cols-10 min-w-[440px]"}`}
					data-testid="pediatric-lower-arch"
				>
					{lowerTeeth.map(renderTooth)}
				</div>
				<div className="mt-1 flex items-center justify-between text-[10px] font-bold uppercase text-[var(--muted,#64748b)]">
					<span>Правый низ (Q8 / Q4)</span>
					<span className="text-[11px] font-extrabold text-[var(--ink,#0f172a)]">Нижняя челюсть</span>
					<span>Левый низ (Q7 / Q3)</span>
				</div>
			</div>
		</div>
	);
};
