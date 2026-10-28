import React from "react";
import { Tooth14ShaderDefs } from "./Tooth14ShaderDefs";
import { Tooth14Roots } from "./Tooth14Roots";
import { Tooth14EnamelCrown } from "./Tooth14EnamelCrown";
import { Tooth14EndoCanals } from "./Tooth14EndoCanals";
import { Tooth14CariesOverlay } from "./Tooth14CariesOverlay";
import { Tooth14RestorationOverlay } from "./Tooth14RestorationOverlay";
import { Tooth14PeriapicalArea } from "./Tooth14PeriapicalArea";
import { ToothStatusBadge } from "../../ToothStatusBadge";
import { ToothUpperSurgeryOverlay } from "../../ToothUpperSurgeryOverlay";
import { TOOTH14_GEOMETRY } from "./tooth14GeometryConstants";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46ContainerProps } from "../../tooth46Types";

export interface Tooth14ContainerProps extends Tooth46ContainerProps {
	toothNumber?: number | undefined;
	isFlipped?: boolean | undefined;
}

/**
 * Master SVG Component for Upper First Premolar Tooth 14 (Wheeler Ch. 9).
 * Features: Bifurcated roots (Buccal + Palatal), 2 root canals, longer mesial cusp slope, 54px crown.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth14Container: React.FC<Tooth14ContainerProps> = ({
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH46_LAYERS,
	presetId,
	className,
	style,
	badgeRadius,
	badgeCy,
	showBadge = true,
	toothNumber = 14,
	isFlipped: isFlippedProp,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	if (showBadge === false) a.showBadge = false;
	const num = toothNumber ?? 14;
	const isFlipped = isFlippedProp ?? (num >= 21 && num <= 38);
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const isEndo = Boolean(a.canals || a.pulp);
	const noCrown = Boolean(a.implant && (a.implantStage === "pure" || a.implantStage === "healing_abutment"));
	const r = badgeRadius ?? 8.5;
	const cy = badgeCy ?? (r > 10 ? 194.5 : 160);
	const baseHeight = r > 10 ? 218 : 170;
	const viewBox = r > 10 ? `0 0 100 ${baseHeight}` : TOOTH14_GEOMETRY.viewBox;

	return (
		<svg
			viewBox={viewBox}
			width={100 * zoom}
			height={baseHeight * zoom}
			{...(className ? { className } : {})}
			style={{ display: "block", overflow: "visible", ...(style ?? {}) }}
			aria-label={`Анатомический верхний первый премоляр ${num}`}
			role="img"
		>
			<Tooth14ShaderDefs />
			<g transform={isFlipped ? "translate(100, 0) scale(-1, 1)" : undefined}>
				<Tooth14PeriapicalArea condition={a.periapicalCondition} isDark={isDark} />
				{a.roots && !a.implant && (
					<Tooth14Roots showGrooves={a.grooves ?? true} showCej={a.cej ?? true} isEndo={isEndo} isDark={isDark} />
				)}
				{a.implant && <ToothUpperSurgeryOverlay showImplant implantStage={a.implantStage} isDark={isDark} />}
				{a.crown && !a.zirconiaCrown && !noCrown && (
					<Tooth14EnamelCrown
						stroke={stroke}
						crownOpacity={isEndo ? "0.85" : "1.0"}
						showCusps={a.cusps ?? true}
						showFissures={a.fissures ?? true}
						showAbfraction={Boolean(a.abfraction)}
						isDark={isDark}
					/>
				)}
				{isEndo && !a.implant && (
					<Tooth14EndoCanals
						showPulp={Boolean(a.pulp ?? true)}
						showCanals={Boolean(a.canals ?? true)}
						showGuttaPercha={Boolean(a.guttaPercha)}
						canalCondition={a.canalCondition ?? "vital"}
						isDark={isDark}
					/>
				)}
				{a.caries && !noCrown && (
					<Tooth14CariesOverlay
						cariesType={a.cariesType as any ?? "class1"}
						cariesDepth={a.cariesDepth as any ?? "media"}
						cariesSurface={a.cariesSurface}
						chronicity={a.cariesChronicity}
						isDark={isDark}
					/>
				)}
				{(a.composite || a.fiberPost || a.coreBuildUp || a.postCore || a.zirconiaCrown) && (
					<Tooth14RestorationOverlay
						showComposite={Boolean(a.composite)}
						showPost={Boolean(a.postCore || a.fiberPost)}
						showCore={Boolean(a.postCore || a.coreBuildUp)}
						showCrown={Boolean(a.zirconiaCrown)}
						isDark={isDark}
					/>
				)}
				{a.implant && a.implantStage === "crown_screw" && (
					<ToothUpperSurgeryOverlay showImplant implantStage="crown_screw" renderScrewAccessOnly isDark={isDark} />
				)}
				{a.missing && <ToothUpperSurgeryOverlay showMissing isDark={isDark} />}
			</g>
			{a.showBadge !== false && (
				<ToothStatusBadge presetId={presetId} layers={a} isDark={isDark} cx={50} cy={cy} r={r} toothNumber={num} />
			)}
		</svg>
	);
};
