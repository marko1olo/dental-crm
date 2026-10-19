import type React from "react";
import { DENTE_SHADER_IDS } from "./shaderConstants";

/**
 * Backward-Compatibility SVG Gradient Aliases: Pulp, Pathologies, Restorations & Surgery.
 * Mandate 8b <= 120 lines.
 */
export const DenteShaderAliasesSurgical: React.FC = () => {
	const s = DENTE_SHADER_IDS;
	return (
		<>
			{/* Endodontic Pulp & Canals */}
			<linearGradient
				id="dente-pulp-vital"
				href={`#${s.pulpVital}`}
				xlinkHref={`#${s.pulpVital}`}
			/>
			<linearGradient
				id="dente-guttapercha-cone"
				href={`#${s.guttaperchaCone}`}
				xlinkHref={`#${s.guttaperchaCone}`}
			/>
			<linearGradient
				id="dente-guttapercha-sheath"
				href={`#${s.guttaperchaSheath}`}
				xlinkHref={`#${s.guttaperchaSheath}`}
			/>

			{/* Caries & Periapical Pathologies */}
			<radialGradient
				id="dente-caries-demin"
				href={`#${s.cariesDemin}`}
				xlinkHref={`#${s.cariesDemin}`}
			/>
			<radialGradient
				id="dente-caries-lesion"
				href={`#${s.cariesLesion}`}
				xlinkHref={`#${s.cariesLesion}`}
			/>
			<radialGradient
				id="dente-caries-necrotic"
				href={`#${s.cariesNecrotic}`}
				xlinkHref={`#${s.cariesNecrotic}`}
			/>
			<radialGradient
				id="dente-periapical-halo"
				href={`#${s.periapicalHalo}`}
				xlinkHref={`#${s.periapicalHalo}`}
			/>

			{/* Restorations & Surgical Elements */}
			<linearGradient
				id="dente-composite-body"
				href={`#${s.compositeBody}`}
				xlinkHref={`#${s.compositeBody}`}
			/>
			<linearGradient
				id="dente-composite-edge"
				href={`#${s.compositeEdge}`}
				xlinkHref={`#${s.compositeEdge}`}
			/>
			<linearGradient
				id="dente-abfraction-dentin"
				href={`#${s.abfractionDentin}`}
				xlinkHref={`#${s.abfractionDentin}`}
			/>
			<linearGradient
				id="dente-fiber-post"
				href={`#${s.fiberPost}`}
				xlinkHref={`#${s.fiberPost}`}
			/>
			<linearGradient
				id="dente-composite-core"
				href={`#${s.compositeCore}`}
				xlinkHref={`#${s.compositeCore}`}
			/>
			<linearGradient
				id="dente-calculus-supra"
				href={`#${s.calculusSupra}`}
				xlinkHref={`#${s.calculusSupra}`}
			/>
			<linearGradient
				id="dente-calculus-sub"
				href={`#${s.calculusSub}`}
				xlinkHref={`#${s.calculusSub}`}
			/>
			<linearGradient
				id="dente-titanium-body"
				href={`#${s.titaniumBody}`}
				xlinkHref={`#${s.titaniumBody}`}
			/>
			<linearGradient
				id="dente-titanium-collar"
				href={`#${s.titaniumCollar}`}
				xlinkHref={`#${s.titaniumCollar}`}
			/>
			<linearGradient
				id="dente-titanium-abutment"
				href={`#${s.titaniumAbutment}`}
				xlinkHref={`#${s.titaniumAbutment}`}
			/>
		</>
	);
};
