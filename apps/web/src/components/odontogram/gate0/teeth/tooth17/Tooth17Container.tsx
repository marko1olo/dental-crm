import React from "react";
import { Tooth17ShaderDefs } from "./Tooth17ShaderDefs";
import { Tooth17Roots } from "./Tooth17Roots";
import { Tooth17EnamelCrown } from "./Tooth17EnamelCrown";
import { Tooth17EndoCanals } from "./Tooth17EndoCanals";
import { Tooth17CariesOverlay } from "./Tooth17CariesOverlay";
import { Tooth17RestorationOverlay } from "./Tooth17RestorationOverlay";
import { Tooth17PeriapicalArea } from "./Tooth17PeriapicalArea";
import { ToothStatusBadge } from "../../ToothStatusBadge";
import { ToothUpperSurgeryOverlay } from "../../ToothUpperSurgeryOverlay";
import { ToothNumberContext } from "../../OdontogramSharedDefsContext";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46ContainerProps } from "../../tooth46Types";
import {
	toUpperMolarCariesDepth,
	toUpperMolarCariesType,
	toUpperMolarCrownMaterial,
	toUpperMolarInlayOnlay,
} from "../toothUpperMolarHelpers";

export interface Tooth17ContainerProps extends Tooth46ContainerProps {
	toothNumber?: number | undefined;
	isFlipped?: boolean | undefined;
}

export const Tooth17Container: React.FC<Tooth17ContainerProps> = ({
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH46_LAYERS,
	presetId,
	className,
	style,
	badgeRadius,
	badgeCy,
	showBadge = true,
	toothNumber = 17,
	isFlipped: isFlippedProp,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	if (showBadge === false) a.showBadge = false;
	const num = toothNumber ?? 17;
	const isFlipped = isFlippedProp ?? (num >= 21 && num <= 38);
	const stroke = isDark ? "rgba(203, 213, 225, 0.70)" : "rgba(71, 85, 105, 0.45)";
	const isEndo = Boolean(a.canals || a.pulp);
	const noCrown = Boolean(a.implant && (a.implantStage === "pure" || a.implantStage === "healing_abutment"));
	const r = badgeRadius ?? 8.5;
	const isUpper = num < 30 || (num >= 50 && num < 70);
	const cy = badgeCy ?? (isUpper ? (r > 10 ? 24.0 : 20.0) : (r > 14 ? 194.5 : (r > 10 ? 176.0 : 160.0)));
	const baseHeight = 218;
	const viewBox = "0 0 100 218";

	return (
		<ToothNumberContext.Provider value={num}>
			<svg
				viewBox={viewBox}
				width={100 * zoom}
				height={baseHeight * zoom}
				{...(className ? { className } : {})}
				style={{ display: "block", overflow: "visible", ...(style ?? {}) }}
				aria-label={`Анатомический верхний второй моляр ${num}`}
				role="img"
			>
				<Tooth17ShaderDefs toothNumber={num} />
				<g transform={isFlipped ? "translate(100, 0) scale(-1, 1)" : undefined}>
					<Tooth17PeriapicalArea condition={a.periapicalCondition} isDark={isDark} />
					{a.roots && !a.implant && (
						<Tooth17Roots showGrooves={a.grooves ?? true} showCej={a.cej ?? true} isEndo={isEndo} isDark={isDark} />
					)}
					{a.implant && <ToothUpperSurgeryOverlay showImplant implantStage={a.implantStage} isDark={isDark} />}
					{a.crown && !a.zirconiaCrown && !noCrown && (
						<Tooth17EnamelCrown
							stroke={stroke}
							crownOpacity={isEndo ? "0.85" : "1.0"}
							showCusps={a.cusps ?? true}
							showFissures={a.fissures ?? true}
							showAbfraction={Boolean(a.abfraction)}
							isDark={isDark}
						/>
					)}
					{isEndo && !a.implant && (
						<Tooth17EndoCanals
							showPulp={Boolean(a.pulp ?? true)}
							showCanals={Boolean(a.canals ?? true)}
							showGuttaPercha={Boolean(a.guttaPercha)}
							canalCondition={a.canalCondition ?? "vital"}
							isDark={isDark}
						/>
					)}
					<Tooth17RestorationOverlay
						showComposite={Boolean(a.composite)}
						showInlayOnlay={toUpperMolarInlayOnlay(a.inlayOnlay)}
						showZirconiaCrown={Boolean(a.zirconiaCrown)}
						crownMaterial={toUpperMolarCrownMaterial(a.crownMaterial)}
						translucent={Boolean(a.zirconiaCrown && (isEndo || a.postCore))}
						showPostCore={Boolean(a.postCore)}
						showAbfraction={Boolean(a.abfraction)}
						isDark={isDark}
					/>
					{a.caries && !a.zirconiaCrown && !noCrown && (
						<Tooth17CariesOverlay
							cariesType={toUpperMolarCariesType(a.cariesType)}
							cariesDepth={toUpperMolarCariesDepth(a.cariesDepth)}
							chronicity={a.cariesChronicity}
							showCervical={Boolean(a.cervicalCaries || a.showCervical)}
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
		</ToothNumberContext.Provider>
	);
};
