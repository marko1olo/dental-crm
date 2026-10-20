import React, { type FC } from "react";
import type { BenchmarkToothProps } from "./tournamentTypes";
import { getBioPalette, INCISOR_11_PATHS, PREMOLAR_14_PATHS, MOLAR_46_PATHS, IMPLANT_PATHS } from "./Candidate06_Paths";
import { Candidate06Defs } from "./Candidate06_Defs";

export const Candidate06_Incisor: FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const effectiveTheme: "light" | "dark" = theme === "dark" ? "dark" : "light";
	const pal = getBioPalette(effectiveTheme);
	return (
		<svg viewBox="0 0 100 160" width={86 * scale} height={148 * scale} className={`transition-all duration-300 ${className}`}>
			<Candidate06Defs theme={effectiveTheme} prefix="c06-inc" />
			<path d={INCISOR_11_PATHS.root} fill="url(#c06-inc-root-grad)" stroke={pal.outline} strokeWidth="1.2" />
			<path d={INCISOR_11_PATHS.rootCanalShadow} stroke={pal.cervicalA2} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
			<path d={INCISOR_11_PATHS.crown} fill="url(#c06-inc-enamel-grad)" stroke={pal.outline} strokeWidth="1.2" />
			<path d={INCISOR_11_PATHS.cejCurve} stroke={pal.outlineSoft} strokeWidth="1" fill="none" />
			<path d={INCISOR_11_PATHS.mamelonGrooveMesial} stroke={pal.outlineSoft} strokeWidth="0.8" fill="none" />
			<path d={INCISOR_11_PATHS.mamelonGrooveDistal} stroke={pal.outlineSoft} strokeWidth="0.8" fill="none" />
			<path d={INCISOR_11_PATHS.matteHighlight} fill="#FFFFFF" opacity={effectiveTheme === "dark" ? 0.22 : 0.38} filter="url(#c06-inc-satin-blur)" />
		</svg>
	);
};

export const Candidate06_Premolar: FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const effectiveTheme: "light" | "dark" = theme === "dark" ? "dark" : "light";
	const pal = getBioPalette(effectiveTheme);
	return (
		<svg viewBox="0 0 100 160" width={86 * scale} height={148 * scale} className={`transition-all duration-300 ${className}`}>
			<Candidate06Defs theme={effectiveTheme} prefix="c06-pre" />
			<path d={PREMOLAR_14_PATHS.rootPalatal} fill="url(#c06-pre-root-grad)" stroke={pal.outline} strokeWidth="1.1" />
			<path d={PREMOLAR_14_PATHS.rootBuccal} fill="url(#c06-pre-root-grad)" stroke={pal.outline} strokeWidth="1.2" />
			<path d={PREMOLAR_14_PATHS.canalPalatal} stroke={pal.guttaGlow} strokeWidth="4" strokeLinecap="round" fill="none" />
			<path d={PREMOLAR_14_PATHS.canalBuccal} stroke={pal.guttaGlow} strokeWidth="4" strokeLinecap="round" fill="none" />
			<path d={PREMOLAR_14_PATHS.canalPalatal} stroke="url(#c06-pre-gutta-grad)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
			<path d={PREMOLAR_14_PATHS.canalBuccal} stroke="url(#c06-pre-gutta-grad)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
			<path d={PREMOLAR_14_PATHS.pulpChamber} fill={pal.pulpChamber} />
			<path d={PREMOLAR_14_PATHS.crownBackgroundPalatalCusp} fill={pal.enamelDark} opacity={0.65} />
			<path d={PREMOLAR_14_PATHS.crown} fill="url(#c06-pre-enamel-grad)" stroke={pal.outline} strokeWidth="1.2" />
			<path d={PREMOLAR_14_PATHS.cejCurve} stroke={pal.outlineSoft} strokeWidth="1" fill="none" />
			<path d={PREMOLAR_14_PATHS.buccalCrest} stroke={pal.outlineSoft} strokeWidth="0.8" fill="none" />
			<path d={PREMOLAR_14_PATHS.matteHighlight} fill="#FFFFFF" opacity={effectiveTheme === "dark" ? 0.2 : 0.36} filter="url(#c06-pre-satin-blur)" />
		</svg>
	);
};

export const Candidate06_Molar: FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const effectiveTheme: "light" | "dark" = theme === "dark" ? "dark" : "light";
	const pal = getBioPalette(effectiveTheme);
	return (
		<svg viewBox="0 0 100 160" width={92 * scale} height={148 * scale} className={`transition-all duration-300 ${className}`}>
			<Candidate06Defs theme={effectiveTheme} prefix="c06-mol" />
			<path d={MOLAR_46_PATHS.granulomaOuter} fill="url(#c06-mol-granuloma-radial)" filter="url(#c06-mol-granuloma-glow)" />
			<circle cx="34" cy="142" r="5" fill={pal.granulomaCore} opacity={0.85} />
			<path d={MOLAR_46_PATHS.rootDistal} fill="url(#c06-mol-root-grad)" stroke={pal.outline} strokeWidth="1.2" />
			<path d={MOLAR_46_PATHS.rootMesial} fill="url(#c06-mol-root-grad)" stroke={pal.outline} strokeWidth="1.2" />
			<path d={MOLAR_46_PATHS.furcationShadow} fill={pal.aoShadow} filter="url(#c06-mol-ao-blur)" />
			<path d={MOLAR_46_PATHS.furcationArch} stroke={pal.outlineSoft} strokeWidth="1" fill="none" />
			<path d={MOLAR_46_PATHS.crownBackgroundLingual} fill={pal.enamelDark} opacity={0.75} />
			<path d={MOLAR_46_PATHS.crown} fill="url(#c06-mol-molar-enamel-grad)" stroke={pal.outline} strokeWidth="1.2" />
			<path d={MOLAR_46_PATHS.fissureOcclusal} stroke={pal.outline} strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.7} />
			<path d={MOLAR_46_PATHS.fissureBuccal} stroke={pal.outlineSoft} strokeWidth="0.9" strokeLinecap="round" fill="none" />
			<path d={MOLAR_46_PATHS.cejCurve} stroke={pal.outlineSoft} strokeWidth="1" fill="none" />
			<path d={MOLAR_46_PATHS.matteHighlight} fill="#FFFFFF" opacity={effectiveTheme === "dark" ? 0.22 : 0.38} filter="url(#c06-mol-satin-blur)" />
		</svg>
	);
};

export const Candidate06_Implant: FC<BenchmarkToothProps> = ({ theme = "light", scale = 1, className = "" }) => {
	const effectiveTheme: "light" | "dark" = theme === "dark" ? "dark" : "light";
	const pal = getBioPalette(effectiveTheme);
	return (
		<svg viewBox="0 0 100 160" width={86 * scale} height={148 * scale} className={`transition-all duration-300 ${className}`}>
			<Candidate06Defs theme={effectiveTheme} prefix="c06-imp" />
			<path d={IMPLANT_PATHS.fixtureCore} fill="url(#c06-imp-ti-satin)" stroke={pal.outline} strokeWidth="1.2" />
			{IMPLANT_PATHS.microThreads.map((d, i) => (
				<path key={`mt-${i}`} d={d} stroke={pal.tiSatinDark} strokeWidth="0.8" opacity={0.65} />
			))}
			{IMPLANT_PATHS.threads.map((d, i) => (
				<path key={`th-${i}`} d={d} stroke={pal.tiSatinDark} strokeWidth="1.4" strokeLinecap="round" fill="none" />
			))}
			<path d={IMPLANT_PATHS.apicalReliefLeft} stroke={pal.tiSatinDark} strokeWidth="1.2" strokeLinecap="round" />
			<path d={IMPLANT_PATHS.apicalReliefRight} stroke={pal.tiSatinDark} strokeWidth="1.2" strokeLinecap="round" />
			<path d={IMPLANT_PATHS.matteHighlight} fill="#FFFFFF" opacity={effectiveTheme === "dark" ? 0.15 : 0.28} filter="url(#c06-imp-satin-blur)" />
			<path d={IMPLANT_PATHS.abutmentBody} fill="url(#c06-imp-abutment-grad)" stroke={pal.outline} strokeWidth="1.2" />
			<path d={IMPLANT_PATHS.abutmentBevel} fill={pal.abutmentLight} stroke={pal.outline} strokeWidth="0.8" />
			<path d={IMPLANT_PATHS.abutmentDriverHex} fill={pal.tiSatinDark} opacity={0.8} />
		</svg>
	);
};
