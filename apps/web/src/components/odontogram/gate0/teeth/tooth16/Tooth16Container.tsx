import React from "react";
import { ToothAdaptivePeriapicalArea } from "../../ToothAdaptivePeriapicalArea";
import { Tooth46PathologyOverlay } from "../../Tooth46PathologyOverlay";
import { Tooth46ShaderDefs } from "../../Tooth46ShaderDefs";
import { Tooth46SurgeryOverlay } from "../../Tooth46SurgeryOverlay";
import { ToothStatusBadge } from "../../ToothStatusBadge";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46ContainerProps } from "../../tooth46Types";
import { Tooth16CariesOverlay } from "./Tooth16CariesOverlay";
import { Tooth16EnamelCrown } from "./Tooth16EnamelCrown";
import { Tooth16EndoCanals } from "./Tooth16EndoCanals";
import { TOOTH16_GEOMETRY } from "./tooth16Geometry";
import { Tooth16RestorationOverlay } from "./Tooth16RestorationOverlay";
import { Tooth16Roots } from "./Tooth16Roots";

export const Tooth16Container: React.FC<Tooth46ContainerProps> = ({
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
	const cariesType = a.cariesType ?? "class1";
	const cariesDepth = a.cariesDepth ?? "media";
	const isDestruct = Boolean(a.caries && cariesDepth === "destructive");
	const r = badgeRadius ?? 18.5;
	const cy = badgeCy ?? (r > 10 ? 194.5 : 176);
	const baseHeight = r > 10 ? 218 : 170;
	const viewBox = `0 0 100 ${baseHeight}`;

	return (
		<svg
			viewBox={viewBox}
			width={100 * zoom}
			height={baseHeight * zoom}
			{...(className ? { className } : {})}
			style={{ display: "block", overflow: "visible", ...(style ?? {}) }}
			aria-label="Анатомический верхний первый моляр 16 (Бугорок Карабелли, трифуркация)"
			role="img"
		>
			<Tooth46ShaderDefs />
			<ToothAdaptivePeriapicalArea
				toothId="16"
				apices={TOOTH16_GEOMETRY.apices}
				condition={a.periapicalCondition}
				halo={a.periapicalHalo}
				isDark={isDark}
			/>
			{a.roots && !a.implant && (
				<Tooth16Roots showGrooves={a.grooves ?? true} showCej={a.cej ?? true} isEndo={isEndo} isDark={isDark} />
			)}
			{a.implant && <Tooth46SurgeryOverlay showImplant implantStage={a.implantStage} isDark={isDark} />}
			{a.crown && !noCrown && (
				<Tooth16EnamelCrown
					stroke={stroke}
					crownOpacity="1.0"
					showCusps={a.cusps ?? true}
					showFissures={a.fissures ?? true}
					showAbfraction={Boolean(a.abfraction)}
					showCristaObliqua={(a as any).cristaObliqua ?? true}
					showCarabelli={(a as any).carabelli ?? true}
					isDark={isDark}
					destructive={isDestruct}
				/>
			)}
			{isEndo && !a.implant && (
				<Tooth16EndoCanals
					showPulp={Boolean(a.pulp)}
					showCanals={Boolean(a.canals)}
					showGuttaPercha={Boolean(a.guttaPercha)}
					canalCondition={a.canalCondition ?? "vital"}
					isDark={isDark}
				/>
			)}
			{a.caries && !a.zirconiaCrown && (
				<Tooth16CariesOverlay
					cariesType={cariesType}
					chronicity={a.cariesChronicity}
					cariesDepth={cariesDepth}
					isDark={isDark}
				/>
			)}
			{(a.composite || a.zirconiaCrown) && (
				<Tooth16RestorationOverlay
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
			<Tooth46PathologyOverlay
				showAbfraction={Boolean(a.abfraction)} showPostCore={Boolean(a.postCore)} postCoreType={a.postCoreType ?? "fiber"}
				showCalculus={Boolean(a.calculus)} showCrack={Boolean(a.crack)} resorcinolFormalin={Boolean(a.resorcinolFormalin)}
				calciumHydroxide={Boolean(a.calciumHydroxide)} attrition={Boolean(a.attrition)}
				rootPerforation={Boolean(a.rootPerforation)} canalLedge={Boolean(a.canalLedge)} rootFracture={Boolean(a.rootFracture)}
				isDark={isDark}
			/>
			{a.missing && <Tooth46SurgeryOverlay showMissing />}
			{a.showBadge !== false && <ToothStatusBadge presetId={presetId} layers={a} r={r} cy={cy} toothNumber={16} />}
		</svg>
	);
};
