import React from "react";
import { CheckCircle2, Layers } from "lucide-react";
import type { SagittalAnomaly, VerticalAnomaly, TransversalAnomaly } from "@dental/shared";
import { SagittalAnomalySelector } from "./SagittalAnomalySelector";
import { VerticalTransversalSelector } from "./VerticalTransversalSelector";

export interface OcclusionAnomaliesCardProps {
	readonly sagittalAnomaly: SagittalAnomaly;
	readonly setSagittalAnomaly: (s: SagittalAnomaly) => void;
	readonly sagittalGapMm: number;
	readonly setSagittalGapMm: (mm: number) => void;
	readonly verticalAnomaly: VerticalAnomaly;
	readonly setVerticalAnomaly: (v: VerticalAnomaly) => void;
	readonly transversalAnomaly: TransversalAnomaly;
	readonly setTransversalAnomaly: (t: TransversalAnomaly) => void;
	readonly onSetOcclusionNorm: () => void;
}

export const OcclusionAnomaliesCard: React.FC<OcclusionAnomaliesCardProps> = ({
	sagittalAnomaly,
	setSagittalAnomaly,
	sagittalGapMm,
	setSagittalGapMm,
	verticalAnomaly,
	setVerticalAnomaly,
	transversalAnomaly,
	setTransversalAnomaly,
	onSetOcclusionNorm,
}) => {
	return (
		<div
			data-testid="ortho-occlusion-anomaly-selector"
			className="bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] flex flex-col gap-2.5"
		>
			<div className="flex items-center justify-between flex-wrap gap-1.5">
				<span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
					<Layers size={14} className="text-[var(--primary)]" />
					Резцовые и окклюзионные соотношения
				</span>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onSetOcclusionNorm}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--primary)] transition shadow-xs cursor-pointer min-h-[36px]"
						data-testid="occlusion-norm-1click-btn"
						title="Физиологическая окклюзия резцов и моляров (Норма)"
					>
						<CheckCircle2 size={13} />
						<span>Норма окклюзии</span>
					</button>
				</div>
			</div>

			<SagittalAnomalySelector
				sagittalAnomaly={sagittalAnomaly}
				setSagittalAnomaly={setSagittalAnomaly}
				sagittalGapMm={sagittalGapMm}
				setSagittalGapMm={setSagittalGapMm}
			/>

			<VerticalTransversalSelector
				verticalAnomaly={verticalAnomaly}
				setVerticalAnomaly={setVerticalAnomaly}
				transversalAnomaly={transversalAnomaly}
				setTransversalAnomaly={setTransversalAnomaly}
			/>
		</div>
	);
};
