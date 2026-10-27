import React from "react";
import { Tooth13ShaderDefs } from "./Tooth13ShaderDefs";
import { Tooth13Roots } from "./Tooth13Roots";
import { Tooth13EnamelCrown } from "./Tooth13EnamelCrown";
import { Tooth13EndoCanals } from "./Tooth13EndoCanals";
import { Tooth13CariesOverlay } from "./Tooth13CariesOverlay";
import { Tooth13RestorationOverlay } from "./Tooth13RestorationOverlay";
import { Tooth13PeriapicalArea } from "./Tooth13PeriapicalArea";
import { ToothStatusBadge } from "../../ToothStatusBadge";
import { ToothUpperSurgeryOverlay } from "../../ToothUpperSurgeryOverlay";
import { TOOTH13_GEOMETRY } from "./tooth13GeometryConstants";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46ContainerProps } from "../../tooth46Types";

export interface Tooth13ContainerProps extends Tooth46ContainerProps {
	toothNumber?: number | undefined;
}

/**
 * Master SVG Component for Upper Canine Tooth 13 (Wheeler Ch. 8).
 * Features: Longest root in dentition (apex Y=4.5), spear-shaped 47px crown, shorter mesial slope.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth13Container: React.FC<Tooth13ContainerProps> = ({
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH46_LAYERS,
	presetId,
	className,
	style,
	badgeRadius,
	badgeCy,
	showBadge = true,
	toothNumber = 13,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	if (showBadge === false) a.showBadge = false;
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const isEndo = Boolean(a.canals || a.pulp);
	const noCrown = Boolean(a.implant && (a.implantStage === "pure" || a.implantStage === "healing_abutment"));
	const r = badgeRadius ?? 8.5;
	const cy = badgeCy ?? (r > 10 ? 194.5 : 160);
	const baseHeight = r > 10 ? 218 : 170;
	const viewBox = r > 10 ? `0 0 100 ${baseHeight}` : TOOTH13_GEOMETRY.viewBox;

	return (
		<svg
			viewBox={viewBox}
			width={100 * zoom}
			height={baseHeight * zoom}
			{...(className ? { className } : {})}
			style={{ display: "block", overflow: "visible", ...(style ?? {}) }}
			aria-label="Анатомический верхний клык 13"
			role="img"
		>
			<Tooth13ShaderDefs />
			<Tooth13PeriapicalArea condition={a.periapicalCondition} isDark={isDark} />
			{a.roots && !a.implant && (
				<Tooth13Roots showGrooves={a.grooves ?? true} showCej={a.cej ?? true} isEndo={isEndo} isDark={isDark} />
			)}
			{a.implant && <ToothUpperSurgeryOverlay showImplant implantStage={a.implantStage} isDark={isDark} />}
			{a.crown && !a.zirconiaCrown && !noCrown && (
				<Tooth13EnamelCrown
					stroke={stroke}
					crownOpacity={isEndo ? "0.85" : "1.0"}
					showCusps={a.cusps ?? true}
					showFissures={a.fissures ?? true}
					showAbfraction={Boolean(a.abfraction)}
					isDark={isDark}
				/>
			)}
			{isEndo && !a.implant && (
				<Tooth13EndoCanals
					showPulp={Boolean(a.pulp ?? true)}
					showCanals={Boolean(a.canals ?? true)}
					showGuttaPercha={Boolean(a.guttaPercha)}
					canalCondition={a.canalCondition ?? "vital"}
					isDark={isDark}
				/>
			)}
			{a.caries && !noCrown && (
				<Tooth13CariesOverlay
					cariesType={a.cariesType as any ?? "class1"}
					cariesDepth={a.cariesDepth as any ?? "media"}
					isDark={isDark}
				/>
			)}
			{(a.composite || a.fiberPost || a.coreBuildUp || a.zirconiaCrown) && (
				<Tooth13RestorationOverlay
					showComposite={Boolean(a.composite)}
					showPost={Boolean(a.fiberPost)}
					showCore={Boolean(a.coreBuildUp)}
					showCrown={Boolean(a.zirconiaCrown)}
					isDark={isDark}
				/>
			)}
			{a.implant && a.implantStage === "crown_screw" && (
				<ToothUpperSurgeryOverlay showImplant implantStage="crown_screw" renderScrewAccessOnly isDark={isDark} />
			)}
			{a.missing && <ToothUpperSurgeryOverlay showMissing isDark={isDark} />}
			{a.showBadge && (
				<ToothStatusBadge presetId={presetId} isDark={isDark} cx={50} cy={cy} r={r} toothNumber={toothNumber} />
			)}
		</svg>
	);
};
