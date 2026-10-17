import React, { useMemo } from "react";
import type {
	PediatricToothItem,
	ToothClinicalFinding,
	ToothSurfaceCode,
} from "./pediatricTeethTypes";
import type { ResorptionStagePercent } from "../../odontogram/pediatricDentitionEngine";
import { RESORPTION_STAGE_DEFINITIONS } from "../../odontogram/pediatricDentitionEngine";

interface PediatricTeethMobileQuadrantProps {
	readonly activeTooth?: number | null | undefined;
	readonly onSelectTooth?: ((t: number) => void) | undefined;
	readonly toothFindings: Readonly<Record<number, ToothClinicalFinding>>;
	readonly resorptionStages?: Readonly<Record<number, ResorptionStagePercent>> | undefined;
	readonly toothSurfaces?: Readonly<Record<number, readonly ToothSurfaceCode[]>> | undefined;
	readonly q5Teeth: readonly PediatricToothItem[];
	readonly q6Teeth: readonly PediatricToothItem[];
	readonly q7Teeth: readonly PediatricToothItem[];
	readonly q8Teeth: readonly PediatricToothItem[];
	readonly isPermanent: boolean;
}

export const PediatricTeethMobileQuadrant: React.FC<PediatricTeethMobileQuadrantProps> = ({
	activeTooth,
	onSelectTooth,
	toothFindings,
	resorptionStages,
	toothSurfaces,
	q5Teeth,
	q6Teeth,
	q7Teeth,
	q8Teeth,
	isPermanent,
}) => {
	const [activeQuadrant, setActiveQuadrant] = React.useState<"q5" | "q6" | "q7" | "q8">(() => {
		if (!activeTooth) return "q5";
		const q = Math.floor(activeTooth / 10);
		if (q === 1 || q === 5) return "q5";
		if (q === 2 || q === 6) return "q6";
		if (q === 3 || q === 7) return "q7";
		return "q8";
	});

	const meta = useMemo(() => [
		{ key: "q5" as const, label: isPermanent ? "Q1 Верх-Право" : "Q5 Верх-Право", short: isPermanent ? "Q1 В/П" : "Q5 В/П", teeth: q5Teeth },
		{ key: "q6" as const, label: isPermanent ? "Q2 Верх-Лево" : "Q6 Верх-Лево", short: isPermanent ? "Q2 В/Л" : "Q6 В/Л", teeth: q6Teeth },
		{ key: "q7" as const, label: isPermanent ? "Q3 Низ-Лево" : "Q7 Низ-Лево", short: isPermanent ? "Q3 Н/Л" : "Q7 Н/Л", teeth: q7Teeth },
		{ key: "q8" as const, label: isPermanent ? "Q4 Низ-Право" : "Q8 Низ-Право", short: isPermanent ? "Q4 Н/П" : "Q8 Н/П", teeth: q8Teeth },
	], [isPermanent, q5Teeth, q6Teeth, q7Teeth, q8Teeth]);

	const currentQuad = meta.find((m) => m.key === activeQuadrant) ?? meta[0]!;

	return (
		<div className="sm:hidden mb-2" data-testid="pediatric-mobile-quadrant-view">
			<div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-[var(--muted,#64748b)]">
				<span>Квадрант детского прикуса:</span>
				<span className="font-extrabold text-[var(--ink,#0f172a)]">{currentQuad.label}</span>
			</div>
			<div className="grid grid-cols-2 gap-1.5 mb-2.5" data-testid="pediatric-quadrants-selector">
				{meta.map((q) => {
					const isQActive = activeQuadrant === q.key;
					return (
						<button
							key={q.key}
							type="button"
							onClick={() => {
								setActiveQuadrant(q.key);
								const first = q.teeth[0]?.toothNumber;
								if (first && onSelectTooth) onSelectTooth(first);
							}}
							className={`min-h-[44px] h-[44px] px-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-between cursor-pointer touch-manipulation select-none active:scale-[0.98] ${
								isQActive ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-soft,#f8fafc)]"
							}`}
							data-testid={`pediatric-quadrant-btn-${q.key}`}
						>
							<span className="font-extrabold truncate">{q.short}</span>
							<span className="text-[10px] font-mono shrink-0 ml-1 opacity-90">{q.teeth.length} з.</span>
						</button>
					);
				})}
			</div>
			<div className="rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-2">
				<div
					className={`grid gap-1.5 justify-center ${currentQuad.teeth.length >= 6 ? "grid-cols-6" : "grid-cols-5"}`}
					data-testid="pediatric-mobile-teeth-grid"
				>
					{currentQuad.teeth.map((t) => {
						const isSelected = activeTooth === t.toothNumber;
						const finding = toothFindings[t.toothNumber] ?? "Healthy";
						const res = t.isPrimary && resorptionStages ? resorptionStages[t.toothNumber] : undefined;
						return (
							<button
								key={`mob-${t.toothNumber}`}
								type="button"
								onClick={() => onSelectTooth?.(t.toothNumber)}
								className={`relative flex flex-col items-center justify-center rounded-xl border transition-all select-none cursor-pointer touch-manipulation active:scale-95 min-w-[50px] min-h-[56px] py-1.5 px-1 ${
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
								<span className="font-mono font-black text-sm">{t.label}</span>
								{finding !== "Healthy" && <span className="text-[8px] font-bold truncate">{finding}</span>}
								{t.isPrimary && typeof res === "number" && res > 0 && (
									<span className="text-[8px] font-mono text-rose-600 font-bold" data-testid={`tooth-resorption-badge-${t.toothNumber}`}>{`R${res}%`}</span>
								)}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
