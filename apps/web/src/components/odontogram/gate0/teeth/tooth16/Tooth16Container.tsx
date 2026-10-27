import React from "react";
import { Tooth16ShaderDefs } from "./Tooth16ShaderDefs";
import { Tooth16Roots } from "./Tooth16Roots";
import { Tooth16EnamelCrown } from "./Tooth16EnamelCrown";
import { Tooth16EndoCanals } from "./Tooth16EndoCanals";
import { Tooth16CariesOverlay } from "./Tooth16CariesOverlay";
import { Tooth16RestorationOverlay } from "./Tooth16RestorationOverlay";
import { Tooth16PeriapicalArea } from "./Tooth16PeriapicalArea";
import { ToothStatusBadge } from "../../ToothStatusBadge";
import { ToothUpperSurgeryOverlay } from "../../ToothUpperSurgeryOverlay";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46ContainerProps } from "../../tooth46Types";

export interface Tooth16ContainerProps extends Tooth46ContainerProps {
	toothNumber?: number | undefined;
	isFlipped?: boolean | undefined;
}

export const Tooth16Container: React.FC<Tooth16ContainerProps> = ({
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH46_LAYERS,
	presetId,
	className,
	style,
	badgeRadius,
	badgeCy,
	showBadge = true,
	toothNumber = 16,
	isFlipped: isFlippedProp,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	if (showBadge === false) a.showBadge = false;
	const num = toothNumber ?? 16;
	const isFlipped = isFlippedProp ?? (num >= 21 && num <= 38);
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const isEndo = Boolean(a.canals || a.pulp);
	const noCrown = Boolean(a.implant && (a.implantStage === "pure" || a.implantStage === "healing_abutment"));
	const r = badgeRadius ?? 8.5;
	const cy = badgeCy ?? (r > 10 ? 194.5 : 160);
	const baseHeight = r > 10 ? 218 : 170;
	const viewBox = r > 10 ? `0 0 100 ${baseHeight}` : TOOTH16_GEOMETRY.viewBox;

	return (
		<svg
			viewBox={viewBox}
			width={100 * zoom}
			height={baseHeight * zoom}
			{...(className ? { className } : {})}
			style={{ display: "block", overflow: "visible", ...(style ?? {}) }}
			aria-label={`Анатомический верхний первый моляр ${num}`}
			role="img"
		>
			<Tooth16ShaderDefs />
			<g transform={isFlipped ? "translate(100, 0) scale(-1, 1)" : undefined}>
				<Tooth16PeriapicalArea condition={a.periapicalCondition} isDark={isDark} />
				{a.roots && !a.implant && (
					<Tooth16Roots showGrooves={a.grooves ?? true} showCej={a.cej ?? true} isEndo={isEndo} isDark={isDark} />
				)}
				{a.implant && <ToothUpperSurgeryOverlay showImplant implantStage={a.implantStage} isDark={isDark} />}
				{a.crown && !a.zirconiaCrown && !noCrown && (
					<Tooth16EnamelCrown
						stroke={stroke}
						crownOpacity={isEndo ? "0.85" : "1.0"}
						showCusps={a.cusps ?? true}
						showFissures={a.fissures ?? true}
						showAbfraction={Boolean(a.abfraction)}
						isDark={isDark}
					/>
				)}
				{isEndo && !a.implant && (
					<Tooth16EndoCanals
						showPulp={Boolean(a.pulp ?? true)}
						showCanals={Boolean(a.canals ?? true)}
						showGuttaPercha={Boolean(a.guttaPercha)}
						canalCondition={a.canalCondition ?? "vital"}
						isDark={isDark}
					/>
				)}
				<Tooth16RestorationOverlay
					showComposite={Boolean(a.composite)}
					showInlayOnlay={a.inlayOnlay as any}
					showZirconiaCrown={Boolean(a.zirconiaCrown)}
					crownMaterial={a.crownMaterial as any}
					translucent={Boolean(a.zirconiaCrown && (isEndo || a.postCore))}
					showPostCore={Boolean(a.postCore)}
					showAbfraction={Boolean(a.abfraction)}
					isDark={isDark}
				/>
				{a.caries && !a.zirconiaCrown && !noCrown && (
					<Tooth16CariesOverlay
						cariesType={a.cariesType as any}
						cariesDepth={a.cariesDepth as any}
						chronicity={a.cariesChronicity as any}
						showCervical={Boolean((a as any).cervicalCaries || (a as any).showCervical)}
						isDark={isDark}
					/>
				)}
				{a.implant && a.implantStage === "crown_screw" && (
					<ToothUpperSurgeryOverlay showImplant implantStage="crown_screw" renderScrewAccessOnly isDark={isDark} />
				)}
				{a.missing && <ToothUpperSurgeryOverlay showMissing isDark={isDark} />}
			</g>
			{a.showBadge !== false && (
				<ToothStatusBadge presetId={presetId} layers={a} r={r} cy={cy} toothNumber={num} />
			)}
		</svg>
	);
};
