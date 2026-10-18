import type React from "react";
import type { ToothVisualProps } from "../ToothColors";

export interface ToothRootsGraphicProps {
	geom: any;
	colors: ToothVisualProps;
	showPeriapicalHalos?: boolean | undefined;
	isPeriodontitis: boolean;
	resorptionVisual?: any | undefined;
	boneLossInfo?: { readonly boneLine: string; readonly resorptionArea: string } | null | undefined;
}

export const ToothRootsGraphic: React.FC<ToothRootsGraphicProps> = ({
	geom,
	colors,
	showPeriapicalHalos,
	isPeriodontitis,
	resorptionVisual,
	boneLossInfo,
}) => {
	return (
		<>
			{/* Periapical Inflammatory Granuloma / Cyst Halo at Root Apex */}
			{showPeriapicalHalos &&
				isPeriodontitis &&
				geom.apex?.map((pt: { x: number; y: number }, idx: number) => (
					<g key={`halo-${idx}`} className="periapical-halo-group" filter="url(#periapical-feather-blur)">
						<circle cx={pt.x} cy={pt.y} r="15" fill="url(#periapical-lesion-gradient)" />
						<circle cx={pt.x} cy={pt.y} r="7.5" fill="#ea580c" opacity="0.75" />
						<circle cx={pt.x} cy={pt.y} r="3" fill="#fef08a" opacity="0.9" />
					</g>
				))}

			{/* Anatomical Root */}
			<path
				d={geom.root}
				fill={colors.rootFill}
				stroke={colors.isMissing ? "var(--tooth-root-stroke, #94a3b8)" : "var(--tooth-root-stroke, #64748b)"}
				strokeWidth={colors.isMissing ? "1.4" : "1.8"}
				strokeDasharray={resorptionVisual?.rootStrokeDasharray ?? (colors.isMissing ? "4 3" : undefined)}
				strokeLinejoin="round"
				opacity={resorptionVisual ? resorptionVisual.rootOpacity : (colors.isMissing ? "0.12" : "1")}
				className="tooth-root-path"
			/>

			{/* Primary Tooth Root Resorption Hatch Pattern Area */}
			{resorptionVisual && resorptionVisual.stage >= 50 && resorptionVisual.stage < 100 && (
				<path
					d={geom.root}
					fill="url(#resorption-hatch-pattern)"
					opacity="0.65"
					pointerEvents="none"
				/>
			)}

			{/* Periodontal Bone Loss Resorption Area & Crest Line */}
			{boneLossInfo && (
				<g className="periodontal-bone-loss-layer">
					<path d={boneLossInfo.resorptionArea} fill="url(#bone-loss-hatch)" opacity="0.85" />
					<path
						d={boneLossInfo.boneLine}
						fill="none"
						stroke="#ef4444"
						strokeWidth="1.6"
						strokeDasharray="3 2"
						strokeLinecap="round"
					/>
				</g>
			)}
		</>
	);
};
