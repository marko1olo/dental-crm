import type React from "react";
import type {
	CanalObturationMaterial,
	PostCoreType,
	RestorativeMaterialKey,
} from "../anatomicalToothGeometries";
import type { ToothState } from "./toothChartTypes";
import type { ToothVisualProps } from "./ToothColors";
import { ToothRootsGraphic } from "./standard/ToothRootsGraphic";
import { ToothEndoGraphic } from "./standard/ToothEndoGraphic";
import { ToothCrownGraphic } from "./standard/ToothCrownGraphic";
import { ToothSurfacesLayer } from "./standard/ToothSurfacesLayer";

export interface ToothStandardGraphicProps {
	number: number;
	state: ToothState;
	scaledWidth: string;
	scaledHeight: string;
	transform: string;
	cfg: { viewX: number; viewWidth: number; viewHeight: number };
	geom: any;
	colors: ToothVisualProps;
	isTop: boolean;
	showPeriapicalHalos?: boolean | undefined;
	isPeriodontitis: boolean;
	resorptionVisual?: any | undefined;
	isEndoTreated: boolean;
	material?: RestorativeMaterialKey | undefined;
	canalObturation?: CanalObturationMaterial | undefined;
	showPulpAndCanals?: boolean | undefined;
	hasPost?: boolean | undefined;
	postType?: PostCoreType | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	boneLossInfo?: { readonly boneLine: string; readonly resorptionArea: string } | null | undefined;
	effectivePocketDepth?: number | undefined;
	surfaces?: readonly string[] | undefined;
	useSurfaces?: boolean | undefined;
	handleSurfaceClick: (e: React.MouseEvent<SVGGElement>) => void;
	handleSurfaceKeyDown: (e: React.KeyboardEvent<SVGGElement>) => void;
}

export const ToothStandardGraphic: React.FC<ToothStandardGraphicProps> = ({
	number,
	state,
	scaledWidth,
	scaledHeight,
	transform,
	cfg,
	geom,
	colors,
	isTop,
	showPeriapicalHalos,
	isPeriodontitis,
	resorptionVisual,
	isEndoTreated,
	material,
	canalObturation,
	showPulpAndCanals,
	hasPost,
	postType,
	boneLossInfo,
	surfaces,
	useSurfaces,
	handleSurfaceClick,
	handleSurfaceKeyDown,
}) => (
	<svg
		width={scaledWidth}
		height={scaledHeight}
		style={{ transform }}
		viewBox={`${cfg.viewX} 0 ${cfg.viewWidth} ${cfg.viewHeight}`}
		preserveAspectRatio="none"
		className={`tooth-svg-element ${colors.isPulsing ? "animate-pulse stroke-[2.5px]" : ""}`}
	>
		<title>{`Схема зуба ${number}`}</title>
		<g className="tooth-group-standard">
			<ToothRootsGraphic
				geom={geom}
				colors={colors}
				showPeriapicalHalos={showPeriapicalHalos}
				isPeriodontitis={isPeriodontitis}
				resorptionVisual={resorptionVisual}
				boneLossInfo={boneLossInfo}
			/>

			<ToothCrownGraphic
				geom={geom}
				state={state}
				colors={colors}
				material={material}
				isTop={isTop}
				cfg={cfg}
			/>

			<ToothEndoGraphic
				geom={geom}
				state={state}
				showPulpAndCanals={showPulpAndCanals}
				isEndoTreated={isEndoTreated}
				hasPost={hasPost}
				postType={postType}
				canalObturation={canalObturation}
				isTop={isTop}
			/>

			{useSurfaces && (
				<ToothSurfacesLayer
					number={number}
					state={state}
					surfaces={surfaces}
					isTop={isTop}
					cfg={cfg}
					handleSurfaceClick={handleSurfaceClick}
					handleSurfaceKeyDown={handleSurfaceKeyDown}
				/>
			)}
		</g>
	</svg>
);
ToothStandardGraphic.displayName = "ToothStandardGraphic";
