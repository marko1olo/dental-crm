/**
 * apps/web/src/components/imaging/dental3d/dental3dTypes.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UNIVERSAL DENTAL 3D INTRAORAL SCAN VIEWER — TYPES & DOMAIN CONTRACTS
 * ═══════════════════════════════════════════════════════════════════════════
 * Multi-layer dual arch support (Upper, Lower, Bite, Prep, Scanbody),
 * PBR TrueColor vertex rendering, dynamic occlusion distance heatmaps,
 * crown preparation undercut inspection, 3D micrometer caliper, and
 * dental laboratory work order integration.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type DentalArchLayer = "upper" | "lower" | "bite" | "prep" | "scanbody";

export type DentalMaterialMode = "truecolor" | "occlusion" | "undercut" | "wireframe";

export interface CaliperPoint {
	x: number;
	y: number;
	z: number;
}

export interface CaliperMeasurement {
	pointA: CaliperPoint;
	pointB: CaliperPoint;
	distanceMm: number;
}

export interface DentalScanModelSource {
	readonly layer: DentalArchLayer;
	readonly name: string;
	readonly format: "ply" | "stl" | "obj";
	readonly url?: string;
	readonly buffer?: ArrayBuffer;
	readonly fileName?: string;
}

export interface DentalUniversal3DViewerProps {
	/** Intraoral scan session ID from backend (/api/v1/scans/sessions/:id) */
	readonly sessionId?: string | undefined;
	/** Single fallback or generic model URL (auto-mapped to upper or lower) */
	readonly modelUrl?: string | undefined;
	/** Model format for modelUrl ('stl' | 'obj' | 'ply') */
	readonly modelFormat?: ("stl" | "obj" | "ply") | undefined;
	/** URL of upper arch model (.ply, .stl, .obj) */
	readonly upperArchUrl?: string | undefined;
	/** URL of lower arch model (.ply, .stl, .obj) */
	readonly lowerArchUrl?: string | undefined;
	/** URL of bite registration / occlusion model */
	readonly biteRegistrationUrl?: string | undefined;
	/** URL of prep/stump model */
	readonly prepUrl?: string | undefined;
	/** URL of scanbody / implant scan model */
	readonly scanbodyUrl?: string | undefined;
	/** 4x4 column-major occlusion matrix (16 floats) to align lower arch to upper */
	readonly occlusionMatrix?: number[] | undefined;
	/** Patient display name */
	readonly patientName?: string | undefined;
	/** Specific FDI tooth code (e.g. 16, 21, 46) */
	readonly toothCode?: (string | number) | undefined;
	/** Active list of teeth in current clinical focus */
	readonly activeTeeth?: string[] | undefined;
	/** Callback when doctor clicks "В лабораторию" to create a lab work order */
	readonly onOpenLabOrder?: ((info: { teeth: string[]; scanSummary?: string | undefined }) => void) | undefined;
	/** Callback when doctor triggers popout to second monitor */
	readonly onPopout?: (() => void) | undefined;
	/** Callback to close modal/view if inside an overlay */
	readonly onClose?: (() => void) | undefined;
	/** Initial active material mode */
	readonly initialMaterialMode?: DentalMaterialMode | undefined;
	/** Custom CSS class names */
	readonly className?: string | undefined;
	/** Custom height or style */
	readonly style?: React.CSSProperties | undefined;
	/** Whether the viewer runs in standalone popout window mode */
	readonly isStandalone?: boolean | undefined;
}

export interface LayerVisibilityState {
	upper: boolean;
	lower: boolean;
	bite: boolean;
	prep: boolean;
	scanbody: boolean;
}

export interface OcclusionContactStats {
	hardContactCount: number; // <50 um
	optimalContactCount: number; // 50-150 um
	clearanceCount: number; // 150-350 um
	minDistanceUm: number;
	averageContactUm: number;
}
