import React from "react";
import { Tooth48CariesOverlay } from "./Tooth48CariesOverlay";
import { Tooth46InlayOnlayOverlay } from "../../Tooth46InlayOnlayOverlay";
import { Tooth46PathologyOverlay } from "../../Tooth46PathologyOverlay";
import { ToothAdaptivePeriapicalArea } from "../../ToothAdaptivePeriapicalArea";
import { Tooth46ShaderDefs } from "../../Tooth46ShaderDefs";
import { Tooth46SurgeryOverlay } from "../../Tooth46SurgeryOverlay";
import { ToothStatusBadge } from "../../ToothStatusBadge";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46ContainerProps } from "../../tooth46Types";
import { Tooth48EnamelCrown } from "./Tooth48EnamelCrown";
import { Tooth48EndoCanals } from "./Tooth48EndoCanals";
import { Tooth48RestorationOverlay } from "./Tooth48RestorationOverlay";
import { Tooth48Roots } from "./Tooth48Roots";
import { TOOTH48_GEOMETRY } from "./tooth48Geometry";

export const Tooth48Container: React.FC<Tooth46ContainerProps> = ({
	isDark = false, zoom = 1, layers = DEFAULT_TOOTH46_LAYERS,
	presetId, className, style, badgeRadius = 18.5, badgeCy, showBadge = true,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	if (showBadge === false) a.showBadge = false;
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const isEndo = Boolean(a.canals || a.pulp);
	const noCrown = Boolean(a.implant && (a.implantStage === "pure" || a.implantStage === "healing_abutment"));
	const cariesType = a.cariesType ?? "class1";
	const cariesDepth = a.cariesDepth ?? "media";
	const isDestruct = Boolean(a.caries && cariesDepth === "destructive");
	const r = badgeRadius ?? 18.5;
	const cy = badgeCy ?? (r > 10 ? 194.5 : 160);
	const baseHeight = r > 10 ? 218 : 170;
	const viewBox = `0 0 100 ${baseHeight}`;

	return (
		<svg
			viewBox={viewBox}
			width={100 * zoom}
			height={baseHeight * zoom}
			{...(className ? { className } : {})}
			style={{ display: "block", overflow: "visible", ...(style ?? {}) }}
			aria-label="Анатомический нижний третий моляр 48 (4 бугра, сросшиеся корни с загибом)"
			role="img"
		>
			<Tooth46ShaderDefs />
			<ToothAdaptivePeriapicalArea
				toothId="48"
				apices={TOOTH48_GEOMETRY.apices}
				condition={a.periapicalCondition}
				halo={a.periapicalHalo}
				isDark={isDark}
			/>
			{a.roots && !a.implant && (
				<Tooth48Roots showGrooves={a.grooves ?? true} showCej={a.cej ?? true} isEndo={isEndo} isDark={isDark} />
			)}
			{a.implant && <Tooth46SurgeryOverlay showImplant implantStage={a.implantStage} isDark={isDark} />}
			{a.crown && !noCrown && (
				<Tooth48EnamelCrown
					stroke={stroke}
					crownOpacity="1.0"
					showCusps={a.cusps ?? true}
					showFissures={a.fissures ?? true}
					showAbfraction={Boolean(a.abfraction)}
					isDark={isDark}
					destructive={isDestruct}
					cariesType={cariesType}
				/>
			)}
			{isEndo && !a.implant && (
				<Tooth48EndoCanals
					showPulp={Boolean(a.pulp)}
					showCanals={Boolean(a.canals)}
					showGuttaPercha={Boolean(a.guttaPercha)}
					canalCondition={a.canalCondition ?? "vital"}
					isDark={isDark}
				/>
			)}
			{a.caries && !a.zirconiaCrown && (
				<Tooth48CariesOverlay
					cariesType={cariesType}
					chronicity={a.cariesChronicity}
					cariesDepth={cariesDepth}
					isDark={isDark}
				/>
			)}
			{a.inlayOnlay && !a.zirconiaCrown && <Tooth46InlayOnlayOverlay type={a.inlayOnlay} isDark={isDark} />}
			{(a.composite || a.fiberPost || a.coreBuildUp || a.postCore || a.zirconiaCrown) && (
				<Tooth48RestorationOverlay
					showComposite={Boolean(a.composite)}
					showPost={Boolean(a.postCore || a.fiberPost)}
					showCore={Boolean(a.postCore || a.coreBuildUp)}
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
				showAbfraction={Boolean(a.abfraction)}
				showCalculus={Boolean(a.calculus)} showCrack={Boolean(a.crack)} resorcinolFormalin={Boolean(a.resorcinolFormalin)}
				calciumHydroxide={Boolean(a.calciumHydroxide)} attrition={Boolean(a.attrition)}
				rootPerforation={Boolean(a.rootPerforation)} canalLedge={Boolean(a.canalLedge)} rootFracture={Boolean(a.rootFracture)}
				isDark={isDark}
			/>
			{a.missing && <Tooth46SurgeryOverlay showMissing />}
			{a.showBadge !== false && <ToothStatusBadge presetId={presetId} layers={a} r={r} cy={cy} toothNumber={48} />}
		</svg>
	);
};
