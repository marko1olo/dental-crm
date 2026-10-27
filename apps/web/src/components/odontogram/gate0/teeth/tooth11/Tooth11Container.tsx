import React from "react";
import { Tooth11ShaderDefs } from "./Tooth11ShaderDefs";
import { Tooth11Roots } from "./Tooth11Roots";
import { Tooth11EnamelCrown } from "./Tooth11EnamelCrown";
import { Tooth11EndoCanals } from "./Tooth11EndoCanals";
import { Tooth11CariesOverlay } from "./Tooth11CariesOverlay";
import { Tooth11RestorationOverlay } from "./Tooth11RestorationOverlay";
import { Tooth11PeriapicalArea } from "./Tooth11PeriapicalArea";
import { ToothStatusBadge } from "../../ToothStatusBadge";
import { ToothUpperSurgeryOverlay } from "../../ToothUpperSurgeryOverlay";
import { TOOTH11_GEOMETRY } from "./tooth11GeometryConstants";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46ContainerProps } from "../../tooth46Types";

export interface Tooth11ContainerProps extends Tooth46ContainerProps {
	toothNumber?: number | undefined;
}

/**
 * Master SVG Component for Upper Central Incisor 11 (Wheeler Ch. 6).
 * Features: Symmetrical conical root (apex Y=12.5), 50px aesthetic crown, strict 90° mesio-incisal midline corner.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth11Container: React.FC<Tooth11ContainerProps> = ({
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH46_LAYERS,
	presetId,
	className,
	style,
	badgeRadius,
	badgeCy,
	showBadge = true,
	toothNumber = 11,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	if (showBadge === false) a.showBadge = false;
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const isEndo = Boolean(a.canals || a.pulp);
	const noCrown = Boolean(a.implant && (a.implantStage === "pure" || a.implantStage === "healing_abutment"));
	const r = badgeRadius ?? 8.5;
	const cy = badgeCy ?? (r > 10 ? 194.5 : 160);
	const baseHeight = r > 10 ? 218 : 170;
	const viewBox = r > 10 ? `0 0 100 ${baseHeight}` : TOOTH11_GEOMETRY.viewBox;

	return (
		<svg
			viewBox={viewBox}
			width={100 * zoom}
			height={baseHeight * zoom}
			{...(className ? { className } : {})}
			style={{ display: "block", overflow: "visible", ...(style ?? {}) }}
			aria-label="Анатомический верхний центральный резец 11"
			role="img"
		>
			<Tooth11ShaderDefs />
			<Tooth11PeriapicalArea condition={a.periapicalCondition} isDark={isDark} />
			{a.roots && !a.implant && (
				<Tooth11Roots showGrooves={a.grooves ?? true} showCej={a.cej ?? true} isEndo={isEndo} isDark={isDark} />
			)}
			{a.implant && <ToothUpperSurgeryOverlay showImplant implantStage={a.implantStage} isDark={isDark} />}
			{a.crown && !a.zirconiaCrown && !noCrown && (
				<Tooth11EnamelCrown
					stroke={stroke}
					crownOpacity={isEndo ? "0.85" : "1.0"}
					showCusps={a.cusps ?? true}
					showFissures={a.fissures ?? true}
					showAbfraction={Boolean(a.abfraction)}
					isDark={isDark}
				/>
			)}
			{isEndo && !a.implant && (
				<Tooth11EndoCanals
					showPulp={Boolean(a.pulp ?? true)}
					showCanals={Boolean(a.canals ?? true)}
					showGuttaPercha={Boolean(a.guttaPercha)}
					canalCondition={a.canalCondition ?? "vital"}
					isDark={isDark}
				/>
			)}
			{a.caries && !noCrown && (
				<Tooth11CariesOverlay
					cariesType={a.cariesType as any ?? "class1"}
					cariesDepth={a.cariesDepth as any ?? "media"}
					isDark={isDark}
				/>
			)}
			{(a.composite || a.fiberPost || a.coreBuildUp || a.postCore || a.zirconiaCrown) && (
				<Tooth11RestorationOverlay
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
			{a.showBadge && (
				<ToothStatusBadge presetId={presetId} isDark={isDark} cx={50} cy={cy} r={r} toothNumber={toothNumber} />
			)}
		</svg>
	);
};
