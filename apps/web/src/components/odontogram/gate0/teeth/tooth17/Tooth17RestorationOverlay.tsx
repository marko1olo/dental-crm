import React from "react";
import { TOOTH17_RESTORATION_GEOMETRY } from "./tooth17RestorationGeometry";
import { scopeOdontogramId, useOdontogramIdPrefix, useToothNumber } from "../../OdontogramSharedDefsContext";

export interface Tooth17RestorationOverlayProps {
	showComposite?: boolean | undefined;
	showInlayOnlay?: "inlay" | "onlay" | undefined;
	showZirconiaCrown?: boolean | undefined;
	crownMaterial?: "zirconia" | "metal_ceramic" | "gold" | undefined;
	translucent?: boolean | undefined;
	showPostCore?: boolean | undefined;
	showAbfraction?: boolean | undefined;
	isDark?: boolean | undefined;
	className?: string | undefined;
}

export const Tooth17RestorationOverlay: React.FC<Tooth17RestorationOverlayProps> = ({
	showComposite = false,
	showInlayOnlay,
	showZirconiaCrown = false,
	crownMaterial = "zirconia",
	translucent = false,
	showPostCore = false,
	showAbfraction = false,
	isDark = false,
	className,
}) => {
	const tNum = useToothNumber() ?? 17;
	const prefix = useOdontogramIdPrefix();
	const sid = (id: string) => scopeOdontogramId(prefix, id);
	const r = TOOTH17_RESTORATION_GEOMETRY;
	const postCore: { palatalShaft: string; coreStump: string; mesialPin?: string | undefined } = r.postCore;

	const compositeFill = `url(#${sid(isDark ? "dente-composite-filling-dark" : "dente-composite-filling")})`;
	const ceramicFill = `url(#${sid(isDark ? "dente-inlay-ceramic-dark" : "dente-inlay-ceramic")})`;
	const crownFill = `url(#${sid(
		crownMaterial === "gold"
			? "dente-crown-gold"
			: crownMaterial === "metal_ceramic"
				? "dente-crown-metal-ceramic"
				: `dente-zirconia-ceramic-${tNum}`,
	)})`;

	const glazeColor = isDark ? "rgba(255, 255, 255, 0.70)" : "rgba(255, 255, 255, 0.85)";
	const fissureColor = isDark ? "rgba(148, 163, 184, 0.55)" : "rgba(100, 116, 139, 0.50)";

	return (
		<g id={sid(`tooth${tNum}-restorations`)} className={className}>
			{/* 1. Palatal Post & Core with Ferrule and Prepared Stump */}
			{showPostCore && (
				<g id={sid(`tooth${tNum}-post-core`)}>
					<path d={r.ferruleCollar} fill={`url(#${sid(`dente-root-dentin-${tNum}`)})`} stroke={isDark ? "#64748b" : "#94a3b8"} strokeWidth="0.7" />
					<path d={r.chamferMarginLine} fill="none" stroke={isDark ? "#94a3b8" : "#64748b"} strokeWidth="0.6" />
					<path d={r.postCore.palatalShaft} fill={`url(#${sid("dente-fiber-post")})`} stroke="#94a3b8" strokeWidth="0.6" />
					{postCore.mesialPin && (
						<path d={postCore.mesialPin} fill={`url(#${sid("dente-fiber-post")})`} stroke="#94a3b8" strokeWidth="0.5" />
					)}
					<path d={r.postCore.coreStump} fill={`url(#${sid(`dente-core-composite-${tNum}`)})`} stroke={isDark ? "rgba(245, 158, 11, 0.85)" : "rgba(180, 83, 9, 0.85)"} strokeWidth="0.75" strokeLinejoin="round" />
				</g>
			)}

			{/* 2. Milled Anatomical Zirconia / Ceramic Crown with Glaze and Slopes */}
			{showZirconiaCrown && (
				<g id={sid(`tooth${tNum}-zirconia-crown`)}>
					<path
						id={sid(`tooth${tNum}-crown-shell`)}
						d={r.crownShell}
						fill={crownFill}
						fillOpacity={translucent ? 0.86 : 1.0}
						stroke={isDark ? "rgba(255,255,255,0.75)" : "rgba(71,85,105,0.65)"}
						strokeWidth="0.85"
						strokeLinejoin="round"
					/>
					<path
						d={r.crownShell}
						fill={`url(#${sid(isDark ? "dente-proximal-contour-dark" : "dente-proximal-contour")})`}
						vectorEffect="non-scaling-stroke"
						pointerEvents="none"
					/>
					<path d={r.cervicalShoulder} fill={`url(#${sid("dente-zirconia-chamfer")})`} stroke="none" />
					{r.milledFissures.map((f) => (
						<path key={f.id} d={f.d} fill="none" stroke={fissureColor} strokeWidth="0.6" strokeLinecap="round" />
					))}
					{r.glazeHighlights.map((g) => (
						<path key={g.id} d={g.d} fill="none" stroke={glazeColor} strokeWidth="0.8" strokeLinecap="round" />
					))}
				</g>
			)}

			{/* 3. Inlay / Onlay */}
			{showInlayOnlay === "inlay" && (
				<path d={r.inlay} fill={ceramicFill} stroke="#94a3b8" strokeWidth="0.5" clipPath={`url(#${sid(`tooth${tNum}-crown-clip`)})`} />
			)}
			{showInlayOnlay === "onlay" && (
				<path d={r.onlay} fill={ceramicFill} stroke="#94a3b8" strokeWidth="0.6" clipPath={`url(#${sid(`tooth${tNum}-crown-clip`)})`} />
			)}

			{/* 4. Composite Filling */}
			{showComposite && (
				<path d={r.compositeFilling} fill={compositeFill} stroke="rgba(130, 95, 55, 0.65)" strokeWidth="0.6" clipPath={`url(#${sid(`tooth${tNum}-crown-clip`)})`} />
			)}

			{/* 5. Cervical Abfraction */}
			{showAbfraction && (
				<path d={r.abfractionDefect} fill={isDark ? "#0f172a" : "#78350f"} fillOpacity="0.85" stroke="#451a03" strokeWidth="0.5" />
			)}
		</g>
	);
};
