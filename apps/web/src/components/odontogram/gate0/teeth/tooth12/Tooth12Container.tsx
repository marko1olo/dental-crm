import React from "react";
import { Tooth12ShaderDefs } from "./Tooth12ShaderDefs";
import { Tooth12Roots } from "./Tooth12Roots";
import { Tooth12EnamelCrown } from "./Tooth12EnamelCrown";
import { Tooth12EndoCanals } from "./Tooth12EndoCanals";
import { Tooth12CariesOverlay } from "./Tooth12CariesOverlay";
import { Tooth12RestorationOverlay } from "./Tooth12RestorationOverlay";
import { Tooth12PeriapicalArea } from "./Tooth12PeriapicalArea";
import { ToothStatusBadge } from "../../ToothStatusBadge";
import { ToothUpperSurgeryOverlay } from "../../ToothUpperSurgeryOverlay";
import { TOOTH12_GEOMETRY } from "./tooth12GeometryConstants";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46ContainerProps } from "../../tooth46Types";

export interface Tooth12ContainerProps extends Tooth46ContainerProps {
	toothNumber?: number | undefined;
	isFlipped?: boolean | undefined;
}

/**
 * Master SVG Component for Upper Lateral Incisor 12 (Wheeler Ch. 7).
 * Features: Slender root with distal hook (apex Y=14.0), narrow 42px crown, sharp mesial 90° / rounded distal angle.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */
export const Tooth12Container: React.FC<Tooth12ContainerProps> = ({
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH46_LAYERS,
	presetId,
	className,
	style,
	badgeRadius,
	badgeCy,
	showBadge = true,
	toothNumber = 12,
	isFlipped: isFlippedProp,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	if (showBadge === false) a.showBadge = false;
	const num = toothNumber ?? 12;
	const isFlipped = isFlippedProp ?? (num >= 21 && num <= 38);
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const isEndo = Boolean(a.canals || a.pulp);
	const noCrown = Boolean(a.implant && (a.implantStage === "pure" || a.implantStage === "healing_abutment"));
	const r = badgeRadius ?? 8.5;
	const cy = badgeCy ?? (r > 10 ? 194.5 : 160);
	const baseHeight = r > 10 ? 218 : 170;
	const viewBox = r > 10 ? `0 0 100 ${baseHeight}` : TOOTH12_GEOMETRY.viewBox;

	return (
		<svg
			viewBox={viewBox}
			width={100 * zoom}
			height={baseHeight * zoom}
			{...(className ? { className } : {})}
			style={{ display: "block", overflow: "visible", ...(style ?? {}) }}
			aria-label={`Анатомический верхний латеральный резец ${num}`}
			role="img"
		>
			<Tooth12ShaderDefs />
			<g transform={isFlipped ? "translate(100, 0) scale(-1, 1)" : undefined}>
				<Tooth12PeriapicalArea condition={a.periapicalCondition} isDark={isDark} />
				{a.roots && !a.implant && (
					<Tooth12Roots showGrooves={a.grooves ?? true} showCej={a.cej ?? true} isEndo={isEndo} isDark={isDark} />
				)}
				{a.implant && <ToothUpperSurgeryOverlay showImplant implantStage={a.implantStage} isDark={isDark} />}
				{a.crown && !a.zirconiaCrown && !noCrown && (
					<Tooth12EnamelCrown
						stroke={stroke}
						crownOpacity={isEndo ? "0.85" : "1.0"}
						showCusps={a.cusps ?? true}
						showFissures={a.fissures ?? true}
						showAbfraction={Boolean(a.abfraction)}
						isDark={isDark}
					/>
				)}
				{isEndo && !a.implant && (
					<Tooth12EndoCanals
						showPulp={Boolean(a.pulp ?? true)}
						showCanals={Boolean(a.canals ?? true)}
						showGuttaPercha={Boolean(a.guttaPercha)}
						canalCondition={a.canalCondition ?? "vital"}
						isDark={isDark}
					/>
				)}
				{a.caries && !noCrown && (
					<Tooth12CariesOverlay
						cariesType={a.cariesType as any ?? "class1"}
						cariesDepth={a.cariesDepth as any ?? "media"}
						isDark={isDark}
					/>
				)}
				{(a.composite || a.fiberPost || a.coreBuildUp || a.postCore || a.zirconiaCrown) && (
					<Tooth12RestorationOverlay
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
