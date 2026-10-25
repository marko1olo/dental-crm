import React from "react";
import type { Tooth46ContainerProps } from "./tooth46Types";
import { Tooth46CariesOverlay } from "./Tooth46CariesOverlay";
import { Tooth46EnamelCrown } from "./Tooth46EnamelCrown";
import { Tooth46EndoCanals } from "./Tooth46EndoCanals";
import { Tooth46InlayOnlayOverlay } from "./Tooth46InlayOnlayOverlay";
import { Tooth46PathologyOverlay } from "./Tooth46PathologyOverlay";
import { Tooth46PeriapicalArea } from "./Tooth46PeriapicalArea";
import { Tooth46RestorationOverlay } from "./Tooth46RestorationOverlay";
import { Tooth46Roots } from "./Tooth46Roots";
import { Tooth46ShaderDefs } from "./Tooth46ShaderDefs";
import { ToothStatusBadge } from "./ToothStatusBadge";
import { Tooth46SurgeryOverlay } from "./Tooth46SurgeryOverlay";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";
import { DEFAULT_TOOTH46_LAYERS } from "./tooth46Types";

export type { Tooth46ContainerProps } from "./tooth46Types";

export const Tooth46Container: React.FC<Tooth46ContainerProps> = ({
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH46_LAYERS,
	presetId,
	className,
	style,
	badgeRadius,
	badgeCy,
	showBadge = true,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	if (showBadge === false) a.showBadge = false;
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const isEndo = Boolean(a.canals || a.pulp);
	const noCrown = Boolean(a.implant && (a.implantStage === "pure" || a.implantStage === "healing_abutment"));
	const r = badgeRadius ?? 8.5;
	const cy = badgeCy ?? (r > 10 ? 162 + r : 160);
	const baseHeight = r > 10 ? Math.ceil(cy + r + 5) : 170;
	const viewBox = r > 10 ? `0 0 100 ${baseHeight}` : TOOTH46_GEOMETRY.viewBox;

	return (
		<svg
			viewBox={viewBox}
			width={100 * zoom}
			height={baseHeight * zoom}
			{...(className ? { className } : {})}
			style={{ display: "block", overflow: "visible", ...(style ?? {}) }}
			aria-label="Анатомический нижний первый моляр 46"
			role="img"
		>
			<Tooth46ShaderDefs />
			<Tooth46PeriapicalArea condition={a.periapicalCondition} halo={a.periapicalHalo} isDark={isDark} />
			{a.roots && !a.implant && (
				<Tooth46Roots showGrooves={a.grooves ?? true} showCej={a.cej ?? true} isEndo={isEndo} isDark={isDark} />
			)}
			{a.implant && <Tooth46SurgeryOverlay showImplant implantStage={a.implantStage} isDark={isDark} />}
			{a.crown && !noCrown && (
				<Tooth46EnamelCrown
					stroke={stroke}
					crownOpacity="1.0"
					showCusps={a.cusps ?? true}
					showFissures={a.fissures ?? true}
					showAbfraction={Boolean(a.abfraction)}
					isDark={isDark}
				/>
			)}
			{isEndo && !a.implant && (
				<Tooth46EndoCanals
					showPulp={Boolean(a.pulp)}
					showCanals={Boolean(a.canals)}
					showGuttaPercha={Boolean(a.guttaPercha)}
					canalCondition={a.canalCondition ?? "vital"}
					isDark={isDark}
				/>
			)}
			{a.caries && !a.zirconiaCrown && (
				<Tooth46CariesOverlay cariesType={a.cariesType} chronicity={a.cariesChronicity} isDark={isDark} />
			)}
			{a.inlayOnlay && !a.zirconiaCrown && <Tooth46InlayOnlayOverlay type={a.inlayOnlay} isDark={isDark} />}
			{(a.composite || a.zirconiaCrown) && (
				<Tooth46RestorationOverlay
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
				showAbfraction={Boolean(a.abfraction)}
				showPostCore={Boolean(a.postCore)}
				postCoreType={a.postCoreType ?? "fiber"}
				showCalculus={Boolean(a.calculus)}
				showCrack={Boolean(a.crack)}
				resorcinolFormalin={Boolean(a.resorcinolFormalin)}
				calciumHydroxide={Boolean(a.calciumHydroxide)}
				attrition={Boolean(a.attrition)}
				rootPerforation={Boolean(a.rootPerforation)}
				canalLedge={Boolean(a.canalLedge)}
				rootFracture={Boolean(a.rootFracture)}
				isDark={isDark}
			/>
			{a.missing && <Tooth46SurgeryOverlay showMissing />}
			{a.showBadge !== false && <ToothStatusBadge presetId={presetId} layers={a} r={r} cy={cy} />}
		</svg>
	);
};
