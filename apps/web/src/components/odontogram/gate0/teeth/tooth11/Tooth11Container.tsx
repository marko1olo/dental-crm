import React from "react";
import { Tooth11CariesOverlay } from "./Tooth11CariesOverlay";
import { Tooth46InlayOnlayOverlay } from "../../Tooth46InlayOnlayOverlay";
import { Tooth46PathologyOverlay } from "../../Tooth46PathologyOverlay";
import { ToothAdaptivePeriapicalArea } from "../../ToothAdaptivePeriapicalArea";
import { Tooth46ShaderDefs } from "../../Tooth46ShaderDefs";
import { Tooth46SurgeryOverlay } from "../../Tooth46SurgeryOverlay";
import { ToothStatusBadge } from "../../ToothStatusBadge";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46ContainerProps } from "../../tooth46Types";
import { Tooth11EnamelCrown } from "./Tooth11EnamelCrown";
import { Tooth11EndoCanals } from "./Tooth11EndoCanals";
import { Tooth11RestorationOverlay } from "./Tooth11RestorationOverlay";
import { Tooth11Roots } from "./Tooth11Roots";
import { TOOTH11_GEOMETRY } from "./tooth11Geometry";

export const Tooth11Container: React.FC<Tooth46ContainerProps> = ({
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH46_LAYERS,
	presetId,
	className,
	style,
	badgeRadius = 18.5,
	badgeCy,
	showBadge = true,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	if (showBadge === false) a.showBadge = false;
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const isEndo = Boolean(a.canals || a.pulp);
	const noCrown = Boolean(a.implant && (a.implantStage === "pure" || a.implantStage === "healing_abutment"));
	const cariesType = layers.cariesType && layers.cariesType !== "class1" ? layers.cariesType : "class3";
	const cariesDepth = layers.cariesDepth ?? "media";
	a.cariesType = cariesType; a.cariesDepth = cariesDepth;
	const isDestruct = Boolean(a.caries && cariesDepth === "destructive");
	const r = badgeRadius ?? 18.5;
	const cy = badgeCy ?? (r > 10 ? 194.5 : 172);
	const baseHeight = r > 10 ? 218 : 190;
	const viewBox = `0 0 100 ${baseHeight}`;

	return (
		<svg
			viewBox={viewBox}
			width={100 * zoom}
			height={baseHeight * zoom}
			{...(className ? { className } : {})}
			style={{ display: "block", overflow: "visible", ...(style ?? {}) }}
			aria-label="Анатомический верхний центральный резец 11 (широкая лопатообразная коронка, 90° мезиальный угол, мощный прямой корень)"
			role="img"
		>
			<Tooth46ShaderDefs />
			<ToothAdaptivePeriapicalArea
				toothId="11"
				apices={TOOTH11_GEOMETRY.apices}
				condition={a.periapicalCondition}
				halo={a.periapicalHalo}
				isDark={isDark}
			/>
			{a.roots && !a.implant && (
				<Tooth11Roots isEndo={isEndo} isDark={isDark} />
			)}
			{a.implant && <Tooth46SurgeryOverlay showImplant implantStage={a.implantStage} isDark={isDark} />}
			{a.crown && !noCrown && (
				<Tooth11EnamelCrown
					stroke={stroke}
					crownOpacity="1.0"
					isDark={isDark}
					destructive={isDestruct}
					cariesType={cariesType}
					cariesDepth={cariesDepth}
					cariesSurface={layers.cariesSurface}
				/>
			)}
			{isEndo && !a.implant && (
				<Tooth11EndoCanals
					showPulp={Boolean(a.pulp)}
					showCanals={Boolean(a.canals)}
					showGuttaPercha={Boolean(a.guttaPercha)}
					canalCondition={a.canalCondition ?? "vital"}
					isDark={isDark}
				/>
			)}
			{a.caries && !a.zirconiaCrown && (
				<Tooth11CariesOverlay
					cariesType={cariesType}
					chronicity={a.cariesChronicity}
					cariesDepth={cariesDepth}
					cariesSurface={layers.cariesSurface}
					isDark={isDark}
				/>
			)}
			{a.inlayOnlay && !a.zirconiaCrown && <Tooth46InlayOnlayOverlay type={a.inlayOnlay} isDark={isDark} />}
			{(a.composite || a.zirconiaCrown) && (
				<Tooth11RestorationOverlay
					showComposite={Boolean(a.composite)}
					showZirconiaCrown={Boolean(a.zirconiaCrown)}
					crownMaterial={a.crownMaterial ?? "zirconia"}
					compositeCondition={a.compositeCondition ?? "adequate"}
					crownCondition={a.crownCondition ?? "adequate"}
					translucent={Boolean(a.zirconiaCrown && (isEndo || a.postCore || a.implant))}
					isDark={isDark}
					isImplant={Boolean(a.implant)}
				/>
			)}
			{a.implant && a.implantStage === "crown_screw" && (
				<Tooth46SurgeryOverlay showImplant implantStage="crown_screw" renderScrewAccessOnly isDark={isDark} />
			)}
			<Tooth46PathologyOverlay
				showAbfraction={Boolean(a.abfraction)} showPostCore={Boolean(a.postCore)} postCoreType={a.postCoreType ?? "fiber"}
				showCalculus={Boolean(a.calculus)} showCrack={Boolean(a.crack)} resorcinolFormalin={Boolean(a.resorcinolFormalin)}
				calciumHydroxide={Boolean(a.calciumHydroxide)} attrition={Boolean(a.attrition)}
				rootPerforation={Boolean(a.rootPerforation)} canalLedge={Boolean(a.canalLedge)} rootFracture={Boolean(a.rootFracture)}
				isDark={isDark}
			/>
			{a.missing && <Tooth46SurgeryOverlay showMissing />}
			{a.showBadge !== false && <ToothStatusBadge presetId={presetId} layers={a} r={r} cy={cy} toothNumber={11} />}
		</svg>
	);
};
