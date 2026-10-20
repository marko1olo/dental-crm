/**
 * Candidate06_Defs.tsx
 * Shared SVG Gradients and Ambient Occlusion Filters for Style #6 (Scandinavian Bio).
 */

import React, { type FC } from "react";
import { getBioPalette } from "./Candidate06_Paths";

export interface Candidate06DefsProps {
	readonly theme?: "light" | "dark";
	readonly prefix: string;
}

export const Candidate06Defs: FC<Candidate06DefsProps> = ({ theme, prefix }) => {
	const effectiveTheme: "light" | "dark" = theme === "dark" ? "dark" : "light";
	const pal = getBioPalette(effectiveTheme);

	return (
		<defs>
			{/* Ambient Occlusion Soft Blur */}
			<filter id={`${prefix}-ao-blur`} x="-20%" y="-20%" width="140%" height="140%">
				<feGaussianBlur stdDeviation="1.8" result="blur" />
			</filter>

			{/* Soft Satin Highlight Blur */}
			<filter id={`${prefix}-satin-blur`} x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="1.2" />
			</filter>

			{/* Periapical Granuloma Diffusion */}
			<filter id={`${prefix}-granuloma-glow`} x="-40%" y="-40%" width="180%" height="180%">
				<feGaussianBlur stdDeviation="2.4" />
			</filter>

			{/* Enamel Gradient: Cervical A2 honey to Incisal B1 ivory */}
			<linearGradient id={`${prefix}-enamel-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor={pal.cervicalA2} />
				<stop offset="35%" stopColor={pal.enamelMid} />
				<stop offset="100%" stopColor={pal.enamelLight} />
			</linearGradient>

			{/* Molar Enamel Gradient (Inverted: Occlusal on Top) */}
			<linearGradient id={`${prefix}-molar-enamel-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor={pal.enamelLight} />
				<stop offset="65%" stopColor={pal.enamelMid} />
				<stop offset="100%" stopColor={pal.cervicalA2} />
			</linearGradient>

			{/* Root Cementum Gradient */}
			<linearGradient id={`${prefix}-root-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor={pal.rootDark} />
				<stop offset="50%" stopColor={pal.rootLight} />
				<stop offset="100%" stopColor={pal.cervicalA2} />
			</linearGradient>

			{/* Titanium Satin Metal Gradient */}
			<linearGradient id={`${prefix}-ti-satin`} x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor={pal.tiSatinDark} />
				<stop offset="25%" stopColor={pal.tiSatinMid} />
				<stop offset="50%" stopColor={pal.tiSatinLight} />
				<stop offset="75%" stopColor={pal.tiSatinMid} />
				<stop offset="100%" stopColor={pal.tiSatinDark} />
			</linearGradient>

			{/* Healing Abutment Biocompatible Tone */}
			<linearGradient id={`${prefix}-abutment-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stopColor={pal.abutmentMid} />
				<stop offset="50%" stopColor={pal.abutmentLight} />
				<stop offset="100%" stopColor={pal.abutmentMid} />
			</linearGradient>

			{/* Gutta-Percha Canal Gradient */}
			<linearGradient id={`${prefix}-gutta-grad`} x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" stopColor={pal.guttaPercha} />
				<stop offset="100%" stopColor={pal.pulpChamber} />
			</linearGradient>

			{/* Granuloma Halo Radial Gradient */}
			<radialGradient id={`${prefix}-granuloma-radial`} cx="50%" cy="50%" r="50%">
				<stop offset="0%" stopColor={pal.granulomaCore} stopOpacity="0.85" />
				<stop offset="60%" stopColor={pal.granulomaCore} stopOpacity="0.45" />
				<stop offset="100%" stopColor={pal.granulomaHalo} stopOpacity="0" />
			</radialGradient>
		</defs>
	);
};
