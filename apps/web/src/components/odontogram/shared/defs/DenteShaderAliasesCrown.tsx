import type React from "react";
import { DENTE_SHADER_IDS } from "./shaderConstants";

/**
 * Backward-Compatibility SVG Gradient Aliases: Crown & Anatomy.
 * Mandate 8b <= 120 lines.
 */
export const DenteShaderAliasesCrown: React.FC = () => {
	const s = DENTE_SHADER_IDS;
	return (
		<>
			{/* Enamel, Dentin & Occlusal Shadows */}
			<linearGradient
				id="dente-enamel-porcelain"
				href={`#${s.enamelPorcelain}`}
				xlinkHref={`#${s.enamelPorcelain}`}
			/>
			<linearGradient
				id="dente-root-dentin"
				href={`#${s.rootDentin}`}
				xlinkHref={`#${s.rootDentin}`}
			/>
			<linearGradient
				id="dente-root-sulcus-shadow"
				href={`#${s.rootSulcusShadow}`}
				xlinkHref={`#${s.rootSulcusShadow}`}
			/>
			<radialGradient
				id="dente-furcation-shadow"
				href={`#${s.furcationShadow}`}
				xlinkHref={`#${s.furcationShadow}`}
			/>
			<radialGradient
				id="dente-fossa-shadow"
				href={`#${s.fossaShadow}`}
				xlinkHref={`#${s.fossaShadow}`}
			/>
			<linearGradient
				id="dente-cervical-ridge"
				href={`#${s.cervicalRidge}`}
				xlinkHref={`#${s.cervicalRidge}`}
			/>
			<linearGradient
				id="dente-ridge-highlight"
				href={`#${s.ridgeHighlight}`}
				xlinkHref={`#${s.ridgeHighlight}`}
			/>

			{/* 6 Crown Materials */}
			<linearGradient
				id="dente-zirconia-ceramic"
				href={`#${s.zirconiaCeramic}`}
				xlinkHref={`#${s.zirconiaCeramic}`}
			/>
			<linearGradient
				id="dente-zirconia-glaze"
				href={`#${s.zirconiaGlaze}`}
				xlinkHref={`#${s.zirconiaGlaze}`}
			/>
			<linearGradient
				id="dente-zirconia-chamfer"
				href={`#${s.zirconiaChamfer}`}
				xlinkHref={`#${s.zirconiaChamfer}`}
			/>
			<linearGradient
				id="dente-crown-pfm"
				href={`#${s.crownPfm}`}
				xlinkHref={`#${s.crownPfm}`}
			/>
			<linearGradient
				id="dente-pfm-metal-collar"
				href={`#${s.pfmMetalCollar}`}
				xlinkHref={`#${s.pfmMetalCollar}`}
			/>
			<linearGradient
				id="dente-crown-emax"
				href={`#${s.crownEmax}`}
				xlinkHref={`#${s.crownEmax}`}
			/>
			<linearGradient
				id="dente-emax-opalescent"
				href={`#${s.emaxOpalescent}`}
				xlinkHref={`#${s.emaxOpalescent}`}
			/>
			<linearGradient
				id="dente-crown-gold"
				href={`#${s.crownGold}`}
				xlinkHref={`#${s.crownGold}`}
			/>
			<linearGradient
				id="dente-gold-specular"
				href={`#${s.goldSpecular}`}
				xlinkHref={`#${s.goldSpecular}`}
			/>
			<linearGradient
				id="dente-crown-metal"
				href={`#${s.crownMetal}`}
				xlinkHref={`#${s.crownMetal}`}
			/>
			<linearGradient
				id="dente-metal-sheen"
				href={`#${s.metalSheen}`}
				xlinkHref={`#${s.metalSheen}`}
			/>
			<linearGradient
				id="dente-crown-pmma"
				href={`#${s.crownPmma}`}
				xlinkHref={`#${s.crownPmma}`}
			/>
		</>
	);
};
