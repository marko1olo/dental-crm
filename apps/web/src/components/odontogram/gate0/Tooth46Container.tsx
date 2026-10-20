import type React from "react";
import { Tooth46CariesOverlay } from "./Tooth46CariesOverlay";
import { Tooth46EnamelCrown } from "./Tooth46EnamelCrown";
import { Tooth46EndoCanals } from "./Tooth46EndoCanals";
import { Tooth46PathologyOverlay } from "./Tooth46PathologyOverlay";
import { Tooth46PeriapicalArea } from "./Tooth46PeriapicalArea";
import { Tooth46RestorationOverlay } from "./Tooth46RestorationOverlay";
import { Tooth46Roots } from "./Tooth46Roots";
import { Tooth46ShaderDefs } from "./Tooth46ShaderDefs";
import { Tooth46SurgeryOverlay } from "./Tooth46SurgeryOverlay";
import { TOOTH46_GEOMETRY } from "./tooth46GeometryConstants";
import { DEFAULT_TOOTH46_LAYERS } from "./tooth46Types";

export type { Tooth46ContainerProps } from "./tooth46Types";

export const Tooth46Container: React.FC<Tooth46ContainerProps> = ({
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH46_LAYERS,
	className,
	style,
}) => {
	const a = { ...DEFAULT_TOOTH46_LAYERS, ...layers };
	const stroke = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.45)";
	const isEndo = Boolean(a.canals || a.pulp);
	const crownOpacity = isEndo && !a.zirconiaCrown ? "0.48" : "1.0";
	const noCrown = Boolean(
		a.implant &&
			(a.implantStage === "pure" || a.implantStage === "healing_abutment"),
	);

	return (
		<svg
			viewBox={TOOTH46_GEOMETRY.viewBox}
			width={100 * zoom}
			height={170 * zoom}
			className={className}
			style={{ display: "block", ...style }}
			aria-label="Анатомический нижний первый моляр 46"
			role="img"
		>
			<Tooth46ShaderDefs />
			<Tooth46PeriapicalArea
				condition={a.periapicalCondition}
				halo={a.periapicalHalo}
				isDark={isDark}
			/>
			{a.roots && !a.implant && (
				<Tooth46Roots
					showGrooves={a.grooves ?? true}
					showCej={a.cej ?? true}
					isEndo={isEndo}
					isDark={isDark}
				/>
			)}
			{a.implant && (
				<Tooth46SurgeryOverlay
					showImplant
					implantStage={a.implantStage}
					isDark={isDark}
				/>
			)}
			{a.crown && !noCrown && (
				<Tooth46EnamelCrown
					stroke={stroke}
					crownOpacity={crownOpacity}
					showCusps={a.cusps ?? true}
					showFissures={a.fissures ?? true}
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
			{a.caries && !a.zirconiaCrown && <Tooth46CariesOverlay isDark={isDark} />}
			{(a.composite || a.zirconiaCrown) && (
				<Tooth46RestorationOverlay
					showComposite={Boolean(a.composite)}
					showZirconiaCrown={Boolean(a.zirconiaCrown)}
					crownMaterial={a.crownMaterial ?? "zirconia"}
					compositeCondition={a.compositeCondition ?? "adequate"}
					crownCondition={a.crownCondition ?? "adequate"}
					translucent={Boolean(
						a.zirconiaCrown && (isEndo || a.postCore || a.implant),
					)}
					isDark={isDark}
					isImplant={Boolean(a.implant)}
				/>
			)}
			{a.implant && a.implantStage === "crown_screw" && (
				<Tooth46SurgeryOverlay
					showImplant
					implantStage="crown_screw"
					renderScrewAccessOnly
					isDark={isDark}
				/>
			)}
			<Tooth46PathologyOverlay
				showAbfraction={Boolean(a.abfraction)}
				showPostCore={Boolean(a.postCore)}
				postCoreType={a.postCoreType ?? "fiber"}
				showCalculus={Boolean(a.calculus)}
				showCrack={Boolean(a.crack)}
				isDark={isDark}
			/>
			{a.missing && <Tooth46SurgeryOverlay showMissing />}
		</svg>
	);
};
