import type React from "react";
import { Tooth16CariesOverlay } from "./Tooth16CariesOverlay";
import { Tooth16EndoCanals } from "./Tooth16EndoCanals";
import { Tooth16OcclusalCusps } from "./Tooth16OcclusalCusps";
import { Tooth16PathologyOverlay } from "./Tooth16PathologyOverlay";
import { Tooth16PeriapicalHalo } from "./Tooth16PeriapicalHalo";
import { Tooth16RestorationOverlay } from "./Tooth16RestorationOverlay";
import { Tooth16Roots } from "./Tooth16Roots";
import { Tooth16ShaderDefs } from "./Tooth16ShaderDefs";
import { Tooth16SurgeryOverlay } from "./Tooth16SurgeryOverlay";
import { TOOTH16_GEOMETRY } from "./tooth16GeometryConstants";
import { DEFAULT_TOOTH16_LAYERS } from "./tooth16LayerConstants";
import type { Tooth16LayerFlags, Tooth16Number } from "./tooth16Types";

export interface Tooth16ContainerProps {
	toothNumber?: Tooth16Number;
	isDark?: boolean;
	zoom?: number;
	layers?: Tooth16LayerFlags;
	className?: string;
	style?: React.CSSProperties;
}

/**
 * DENTE Dental CRM — Monolithic Sculpture Container for Upper Molars 16 / 26
 * Mandate 8b <= 120 lines.
 */
export const Tooth16Container: React.FC<Tooth16ContainerProps> = ({
	toothNumber = 16,
	isDark = false,
	zoom = 1,
	layers = DEFAULT_TOOTH16_LAYERS,
	className,
	style,
}) => {
	const a = { ...DEFAULT_TOOTH16_LAYERS, ...layers };
	const isFlipped = toothNumber === 26;
	const stroke = isDark
		? "rgba(203, 213, 225, 0.70)"
		: "rgba(71, 85, 105, 0.45)";

	return (
		<svg
			viewBox={TOOTH16_GEOMETRY.viewBox}
			width={100 * zoom}
			height={160 * zoom}
			className={className}
			style={{ display: "block", ...style }}
			aria-label={`Анатомический верхний первый моляр ${toothNumber}`}
			role="img"
		>
			<Tooth16ShaderDefs />
			<g transform={isFlipped ? "translate(100, 0) scale(-1, 1)" : undefined}>
				{a.periapicalHalo && <Tooth16PeriapicalHalo />}
				{a.roots && !a.implant && (
					<Tooth16Roots
						showGrooves={a.grooves ?? true}
						showCej={a.cej ?? true}
						isDark={isDark}
					/>
				)}
				{a.implant && <Tooth16SurgeryOverlay showImplant />}
				{a.crown && (
					<path
						id="tooth16-crown-monolith"
						d={TOOTH16_GEOMETRY.crownMonolithPath}
						fill="url(#dente16-enamel-porcelain)"
						stroke={stroke}
						strokeWidth="0.8"
						strokeLinejoin="round"
					/>
				)}
				{(a.canals || a.pulp) && !a.implant && (
					<Tooth16EndoCanals
						showPulp={Boolean(a.pulp)}
						showCanals={Boolean(a.canals)}
						showGuttaPercha={Boolean(a.guttaPercha)}
						isDark={isDark}
					/>
				)}
				{a.crown && (
					<Tooth16OcclusalCusps
						showCusps={a.cusps ?? true}
						showFissures={a.fissures ?? true}
						showCristaObliqua={a.cristaObliqua ?? true}
						showCarabelli={a.carabelli ?? true}
						isDark={isDark}
					/>
				)}
				{a.caries && !a.zirconiaCrown && (
					<Tooth16CariesOverlay isDark={isDark} />
				)}
				{(a.composite || a.zirconiaCrown) && (
					<Tooth16RestorationOverlay
						showComposite={Boolean(a.composite)}
						showZirconiaCrown={Boolean(a.zirconiaCrown)}
						crownMaterial={a.crownMaterial ?? "zirconia"}
						compositeCondition={a.compositeCondition ?? "adequate"}
						crownCondition={a.crownCondition ?? "adequate"}
						isDark={isDark}
					/>
				)}
				<Tooth16PathologyOverlay
					showAbfraction={Boolean(a.abfraction)}
					showPostCore={Boolean(a.postCore)}
					showCalculus={Boolean(a.calculus)}
					showCrack={Boolean(a.crack)}
					isDark={isDark}
				/>
				{a.missing && <Tooth16SurgeryOverlay showMissing />}
			</g>
		</svg>
	);
};
