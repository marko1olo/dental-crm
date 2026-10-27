import React from "react";
import { Tooth18ShaderDefs } from "./Tooth18ShaderDefs";
import { Tooth18Roots } from "./Tooth18Roots";
import { Tooth18EnamelCrown } from "./Tooth18EnamelCrown";
import { Tooth18EndoCanals } from "./Tooth18EndoCanals";
import { Tooth18CariesOverlay } from "./Tooth18CariesOverlay";
import { Tooth18RestorationOverlay } from "./Tooth18RestorationOverlay";
import { Tooth18PeriapicalArea } from "./Tooth18PeriapicalArea";
import { ToothStatusBadge } from "../../ToothStatusBadge";
import { ToothUpperSurgeryOverlay } from "../../ToothUpperSurgeryOverlay";
import { TOOTH18_GEOMETRY } from "./tooth18GeometryConstants";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46ContainerProps } from "../../tooth46Types";

export interface Tooth18ContainerProps extends Tooth46ContainerProps {
	toothNumber?: number | undefined;
}

export const Tooth18Container: React.FC<Tooth18ContainerProps> = ({
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH46_LAYERS,
	presetId,
	className,
	style,
	badgeRadius,
	badgeCy,
	showBadge = true,
	toothNumber = 18,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	if (showBadge === false) a.showBadge = false;
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const isEndo = Boolean(a.canals || a.pulp);
	const noCrown = Boolean(a.implant && (a.implantStage === "pure" || a.implantStage === "healing_abutment"));
	const r = badgeRadius ?? 8.5;
	const cy = badgeCy ?? (r > 10 ? 194.5 : 160);
	const baseHeight = r > 10 ? 218 : 170;
	const viewBox = r > 10 ? `0 0 100 ${baseHeight}` : TOOTH18_GEOMETRY.viewBox;

	return (
		<svg
			viewBox={viewBox}
			width={100 * zoom}
			height={baseHeight * zoom}
			{...(className ? { className } : {})}
			style={{ display: "block", overflow: "visible", ...(style ?? {}) }}
			aria-label="Анатомический верхний третий моляр 18"
			role="img"
		>
			<Tooth18ShaderDefs />
			<Tooth18PeriapicalArea condition={a.periapicalCondition} isDark={isDark} />
			{a.roots && !a.implant && (
				<Tooth18Roots showGrooves={a.grooves ?? true} showCej={a.cej ?? true} isEndo={isEndo} isDark={isDark} />
			)}
			{a.implant && <ToothUpperSurgeryOverlay showImplant implantStage={a.implantStage} isDark={isDark} />}
			{a.crown && !a.zirconiaCrown && !noCrown && (
				<Tooth18EnamelCrown
					stroke={stroke}
					crownOpacity={isEndo ? "0.85" : "1.0"}
					showCusps={a.cusps ?? true}
					showFissures={a.fissures ?? true}
					showAbfraction={Boolean(a.abfraction)}
					isDark={isDark}
				/>
			)}
			{isEndo && !a.implant && (
				<Tooth18EndoCanals
					showPulp={Boolean(a.pulp ?? true)}
					showCanals={Boolean(a.canals ?? true)}
					showGuttaPercha={Boolean(a.guttaPercha)}
					canalCondition={a.canalCondition ?? "vital"}
					isDark={isDark}
				/>
			)}
			<Tooth18RestorationOverlay
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
				<Tooth18CariesOverlay
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
			{a.showBadge !== false && (
				<ToothStatusBadge presetId={presetId} layers={a} r={r} cy={cy} toothNumber={toothNumber} />
			)}
		</svg>
	);
};
