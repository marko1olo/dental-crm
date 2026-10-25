import React from "react";
import type {
	AngleClass,
	SagittalAnomaly,
	VerticalAnomaly,
	TransversalAnomaly,
	TmjStatus,
} from "@dental/shared";
import { AngleClassCard } from "./diagnosticsSection/AngleClassCard";
import { OcclusionAnomaliesCard } from "./diagnosticsSection/OcclusionAnomaliesCard";
import { TmjStatusCard } from "./diagnosticsSection/TmjStatusCard";

export interface OrthoDiagnosticsSectionProps {
	readonly angleClass: AngleClass;
	readonly setAngleClass: (c: AngleClass) => void;
	readonly onSetAngleClassNorm: () => void;
	readonly sagittalAnomaly: SagittalAnomaly;
	readonly setSagittalAnomaly: (s: SagittalAnomaly) => void;
	readonly sagittalGapMm: number;
	readonly setSagittalGapMm: (mm: number) => void;
	readonly verticalAnomaly: VerticalAnomaly;
	readonly setVerticalAnomaly: (v: VerticalAnomaly) => void;
	readonly transversalAnomaly: TransversalAnomaly;
	readonly setTransversalAnomaly: (t: TransversalAnomaly) => void;
	readonly onSetOcclusionNorm: () => void;
	readonly tmjStatus: TmjStatus;
	readonly setTmjStatus: (s: TmjStatus) => void;
	readonly onSetTmjNorm: () => void;
}

export const OrthoDiagnosticsSection: React.FC<OrthoDiagnosticsSectionProps> = (props) => {
	return (
		<div className="space-y-4" data-testid="ortho-diagnostics-section">
			<AngleClassCard
				angleClass={props.angleClass}
				setAngleClass={props.setAngleClass}
				onSetAngleClassNorm={props.onSetAngleClassNorm}
			/>

			<OcclusionAnomaliesCard
				sagittalAnomaly={props.sagittalAnomaly}
				setSagittalAnomaly={props.setSagittalAnomaly}
				sagittalGapMm={props.sagittalGapMm}
				setSagittalGapMm={props.setSagittalGapMm}
				verticalAnomaly={props.verticalAnomaly}
				setVerticalAnomaly={props.setVerticalAnomaly}
				transversalAnomaly={props.transversalAnomaly}
				setTransversalAnomaly={props.setTransversalAnomaly}
				onSetOcclusionNorm={props.onSetOcclusionNorm}
			/>

			<TmjStatusCard
				tmjStatus={props.tmjStatus}
				setTmjStatus={props.setTmjStatus}
				onSetTmjNorm={props.onSetTmjNorm}
			/>
		</div>
	);
};
