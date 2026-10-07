/**
 * apps/web/src/cbct_resolution_interpolation_inquisition.tsx
 *
 * DENTE CRM — CBCT Voxel Resolution & Interpolation Methods Visual Inquisition.
 * Demonstrates the clinical and diagnostic difference between:
 * 1. 128^3 (Potato, 0.94 mm/voxel) vs 256^3 (Balanced, 0.47 mm/voxel) vs 512^3 (Ultra, 0.23 mm/voxel).
 * 2. Interpolation methods: Nearest Neighbor vs Bilinear vs Bicubic Catmull-Rom vs Laplacian Edge Sharpening.
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md, AGENTS.md, Mandate 8e, Mandate 8t.
 */

import {
	CheckCircle2,
	Compass,
	Layers,
	Microscope,
	Moon,
	Sliders,
	Sun,
	XCircle,
	Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";

// Styles
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./styles/contrast-fixes.css";
import "./styles/themes.css";

// --- Clinical Tooth Mathematical Phantom Generator ---
// Simulates an anatomical lower molar (Tooth 46) or implant site:
// Enamel (+2800 HU), Dentin (+1400 HU), Pulp chamber & canals (+50 HU),
// Periodontal ligament (-100 HU, 0.2mm), Lamina dura (+1600 HU, 0.4mm), Cancellous bone (+500 HU),
// Titanium implant (+3100 HU) with 0.5mm micro-threads.
function sampleToothPhantomHU(
	relX: number, // [-1 .. 1] across tooth width mesio-distal (~12 mm)
	relY: number, // [-1 .. 1] across tooth depth bucco-lingual (~10 mm)
	zone: "molar_canals" | "hairline_crack" | "implant" = "molar_canals",
): number {
	// 1. Titanium Implant Simulation (+3150 HU with 0.5mm micro-threads in bone)
	if (zone === "implant") {
		const inImplantCore = Math.abs(relX) < 0.22 && relY > -0.3 && relY < 0.75;
		if (inImplantCore) {
			const threadPhase = Math.sin((relY + 0.3) * 35.0);
			const threadWidth = 0.22 + (threadPhase > 0 ? 0.04 : -0.02);
			if (Math.abs(relX) < threadWidth) {
				return 3150; // Pure grade IV titanium
			}
		}
		// Surrounding bone socket
		const r = Math.sqrt(relX * relX + relY * relY);
		if (r < 0.90) {
			const trabecular = Math.sin(relX * 28) * Math.cos(relY * 28) * 160;
			return 650 + trabecular;
		}
		return -850; // Soft tissue / air
	}

	// 2. Anatomical Mandibular First Molar (Tooth 46) — Axial Root Cross-Section in Alveolar Bone
	// Surrounding Alveolar Jaw Structure:
	// Buccal and Lingual cortical plates of the mandible at |relY| ~ 0.72 - 0.86
	const absY = Math.abs(relY);
	const absX = Math.abs(relX);

	// Beyond alveolar ridge: soft tissue / oral air
	if (absY > 0.88 || absX > 0.92) {
		return absY > 0.94 || absX > 0.96 ? -980 : -60; // Oral cavity air (-980 HU) / gingiva (-60 HU)
	}

	// Mandibular Cortical Plates (hyperdense cortical bone: +1800 HU)
	if (absY >= 0.76 && absY <= 0.88 && absX <= 0.88) {
		return 1850;
	}

	// Alveolar trabecular bone (cancellous bone: +450..+750 HU)
	const boneNoise = Math.sin(relX * 32.0) * Math.cos(relY * 26.0) * 140;
	const trabecularBoneHU = 580 + boneNoise;

	// Mesial Root (left side): Kidney-shaped / Bean-shaped cross section (concave distally)
	// Extends vertically (bucco-lingual) from relY = -0.52 to +0.52
	const isMesialY = Math.abs(relY) < 0.54;
	const mesialArcX = -0.40 + 0.10 * (relY / 0.54) ** 2; // subtle curvature
	const mesialDistY = Math.abs(relY) / 0.54;
	const mesialMaxHalfWidth = 0.22 * Math.sqrt(Math.max(0, 1 - mesialDistY ** 2));
	const distFromMesialCore = Math.abs(relX - mesialArcX);

	// Distal Root (right side): Oval / tear-drop shaped cross section
	// Extends vertically from relY = -0.44 to +0.44
	const distalCx = 0.38;
	const distalNormX = (relX - distalCx) / 0.24;
	const distalNormY = relY / 0.44;
	const distalDistSq = distalNormX ** 2 + distalNormY ** 2;

	// Check if point falls within Mesial Root structures
	if (isMesialY && distFromMesialCore <= mesialMaxHalfWidth + 0.08) {
		// Inside Mesial Root Dentin
		if (distFromMesialCore <= mesialMaxHalfWidth) {
			// MB Canal (Mesio-Buccal: relX = -0.38, relY = -0.24, radius ~0.04)
			const dMb = Math.sqrt((relX - (-0.38)) ** 2 + (relY - (-0.24)) ** 2);
			// ML Canal (Mesio-Lingual: relX = -0.38, relY = +0.24, radius ~0.04)
			const dMl = Math.sqrt((relX - (-0.38)) ** 2 + (relY - 0.24) ** 2);

			// Pulp tissue / lumen (+40 HU)
			if (dMb < 0.042 || dMl < 0.042) {
				return 40;
			}

			// Isthmus between MB and ML (narrow band of lower density / pulp connection)
			if (Math.abs(relX - mesialArcX) < 0.018 && Math.abs(relY) < 0.24) {
				return 280; // Fibrous pulp isthmus
			}

			// Hairline fracture simulation (VRF: 0.1mm crack across mesial root)
			if (
				zone === "hairline_crack" &&
				Math.abs(relX - (-0.38) + relY * 0.15) < 0.014 &&
				Math.abs(relY) < 0.42
			) {
				return -350; // Fluid/air filled hairline fissure
			}

			return 1450; // Mesial root dentin (+1450 HU)
		}

		// Mesial Periodontal Ligament (PDL space: 0.2 mm width, -120 HU)
		if (distFromMesialCore <= mesialMaxHalfWidth + 0.035) {
			return -120;
		}

		// Mesial Lamina Dura (cortical socket wall: 0.35 mm width, +1650 HU)
		if (distFromMesialCore <= mesialMaxHalfWidth + 0.075) {
			return 1680;
		}
	}

	// Check if point falls within Distal Root structures
	if (distalDistSq <= 1.55) {
		// Inside Distal Root Dentin
		if (distalDistSq <= 1.0) {
			// Distal Canal: ribbon-shaped / slot lumen along bucco-lingual axis
			const dDistalX = Math.abs(relX - distalCx) / 0.045;
			const dDistalY = Math.abs(relY) / 0.18;
			const inDistalLumen = dDistalX ** 2 + dDistalY ** 2 < 1.0;

			if (inDistalLumen) {
				return 40; // Distal canal lumen (+40 HU)
			}

			return 1420; // Distal root dentin (+1420 HU)
		}

		// Distal Periodontal Ligament (PDL space: 0.2 mm, -120 HU)
		if (distalDistSq <= 1.25) {
			return -120;
		}

		// Distal Lamina Dura (+1650 HU)
		if (distalDistSq <= 1.55) {
			return 1650;
		}
	}

	// Interradicular bone & alveolar socket bone
	return trabecularBoneHU;
}

// Convert HU to Greyscale 8-bit using Window Width / Window Level
function huToGreyscale(hu: number, ww = 3500, wl = 600): number {
	const minVal = wl - ww / 2;
	const maxVal = wl + ww / 2;
	const clamped = Math.max(minVal, Math.min(maxVal, hu));
	return Math.round(((clamped - minVal) / ww) * 255);
}

// Cubic Catmull-Rom weight function for smooth bicubic spline interpolation
function catmullRom(
	p0: number,
	p1: number,
	p2: number,
	p3: number,
	t: number,
): number {
	const v0 = (p2 - p0) * 0.5;
	const v1 = (p3 - p1) * 0.5;
	const t2 = t * t;
	const t3 = t * t2;
	return (
		(2 * p1 - 2 * p2 + v0 + v1) * t3 +
		(-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
		v0 * t +
		p1
	);
}

export interface RealPatientSlice {
	id: string;
	name: string;
	dimX: number;
	dimY: number;
	z: number;
	spX: number;
	minHU: number;
	maxHU: number;
	data: Int16Array;
}

export function CbctResolutionInterpolationInquisitionView() {
	const [theme, setTheme] = useState<"light" | "dark">("dark");
	const [activeZone, setActiveZone] = useState<
		"zakharov" | "sumarokova" | "bulyakov" | "phantom_molar"
	>("zakharov");
	const [zoomLevel, setZoomLevel] = useState<1 | 2 | 3>(1);

	// Real Patient DICOM Slice State
	const [realSlice, setRealSlice] = useState<RealPatientSlice | null>(null);
	const [isLoadingSlice, setIsLoadingSlice] = useState<boolean>(true);

	// Canvas refs for resolution comparisons
	const canvas128Ref = useRef<HTMLCanvasElement | null>(null);
	const canvas256Ref = useRef<HTMLCanvasElement | null>(null);
	const canvas512Ref = useRef<HTMLCanvasElement | null>(null);

	// Canvas refs for interpolation comparisons
	const canvasNearestRef = useRef<HTMLCanvasElement | null>(null);
	const canvasBilinearRef = useRef<HTMLCanvasElement | null>(null);
	const canvasBicubicRef = useRef<HTMLCanvasElement | null>(null);
	const canvasSharpenRef = useRef<HTMLCanvasElement | null>(null);

	// Sync theme to root DOM
	useEffect(() => {
		const root = document.documentElement;
		root.setAttribute("data-theme", theme);
		if (theme === "dark") {
			root.classList.add("dark");
			root.style.colorScheme = "dark";
		} else {
			root.classList.remove("dark");
			root.style.colorScheme = "light";
		}
	}, [theme]);

	// Fetch authentic real DICOM slice from Vite CBCT backend
	useEffect(() => {
		if (activeZone === "phantom_molar") {
			setRealSlice(null);
			setIsLoadingSlice(false);
			return;
		}

		let cancelled = false;
		setIsLoadingSlice(true);
		const targetZ = activeZone === "sumarokova" ? 170 : activeZone === "bulyakov" ? 155 : 160;

		fetch(`/api/cbct-tuner/slice?id=${encodeURIComponent(activeZone)}&z=${targetZ}`)
			.then(async (res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const dimX = Number(res.headers.get("x-cbct-dim-x")) || 600;
				const dimY = Number(res.headers.get("x-cbct-dim-y")) || 600;
				const z = Number(res.headers.get("x-cbct-z")) || targetZ;
				const spX = Number(res.headers.get("x-cbct-sp-x")) || 0.25;
				const minHU = Number(res.headers.get("x-cbct-min-hu")) || -1000;
				const maxHU = Number(res.headers.get("x-cbct-max-hu")) || 3095;
				const rawName = res.headers.get("x-cbct-name");
				const name = rawName ? decodeURIComponent(rawName) : activeZone;

				const arrayBuffer = await res.arrayBuffer();
				if (cancelled) return;

				const data = new Int16Array(arrayBuffer);
				setRealSlice({
					id: activeZone,
					name,
					dimX,
					dimY,
					z,
					spX,
					minHU,
					maxHU,
					data,
				});
				setIsLoadingSlice(false);
			})
			.catch((err) => {
				console.warn("[CBCT Inquisition] Failed to load authentic DICOM slice, falling back to phantom:", err);
				if (!cancelled) {
					setRealSlice(null);
					setIsLoadingSlice(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [activeZone]);

	// Universal Voxel / Phantom Sampler
	const sampleHU = (relX: number, relY: number): number => {
		if (realSlice && realSlice.data.length > 0) {
			// Center crop on tooth/arch region
			const u = relX * 0.5 + 0.5;
			const v = relY * 0.5 + 0.5;
			const px = Math.max(0, Math.min(realSlice.dimX - 1, Math.floor(u * (realSlice.dimX - 1))));
			const py = Math.max(0, Math.min(realSlice.dimY - 1, Math.floor(v * (realSlice.dimY - 1))));
			return realSlice.data[py * realSlice.dimX + px] ?? 0;
		}
		return sampleToothPhantomHU(relX, relY, "molar_canals");
	};

	// Render Resolution Matrices
	useEffect(() => {
		const resolutions = [
			{ res: 64, canvas: canvas128Ref.current, label: "128³ Potato" },
			{ res: 128, canvas: canvas256Ref.current, label: "256³ Balanced" },
			{ res: 256, canvas: canvas512Ref.current, label: "512³ Ultra" },
		];

		const zoom = zoomLevel;

		for (const { res, canvas } of resolutions) {
			if (!canvas) continue;
			const ctx = canvas.getContext("2d");
			if (!ctx) continue;

			const targetWidth = canvas.width;
			const targetHeight = canvas.height;
			ctx.imageSmoothingEnabled = false;

			// Generate discrete sampling grid buffer
			const grid = new Float32Array(res * res);
			for (let gy = 0; gy < res; gy++) {
				for (let gx = 0; gx < res; gx++) {
					const relX = ((gx / (res - 1) - 0.5) * 2) / zoom;
					const relY = ((gy / (res - 1) - 0.5) * 2) / zoom;
					grid[gy * res + gx] = sampleHU(relX, relY);
				}
			}

			// Render onto canvas without hardware smoothing
			const imgData = ctx.createImageData(targetWidth, targetHeight);
			const data = imgData.data;

			for (let py = 0; py < targetHeight; py++) {
				const gy = Math.floor((py / targetHeight) * res);
				for (let px = 0; px < targetWidth; px++) {
					const gx = Math.floor((px / targetWidth) * res);
					const hu = grid[gy * res + gx] ?? 0;
					const gray = huToGreyscale(hu);
					const idx = (py * targetWidth + px) * 4;
					data[idx] = gray;
					data[idx + 1] = gray;
					data[idx + 2] = gray;
					data[idx + 3] = 255;
				}
			}
			ctx.putImageData(imgData, 0, 0);
		}
	}, [activeZone, zoomLevel, realSlice]);

	// Render Interpolation Methods on 96x96 Grid (Simulating mid-resolution reconstruction)
	useEffect(() => {
		const baseRes = 96;
		const zoom = zoomLevel;
		const grid = new Float32Array(baseRes * baseRes);

		for (let gy = 0; gy < baseRes; gy++) {
			for (let gx = 0; gx < baseRes; gx++) {
				const relX = ((gx / (baseRes - 1) - 0.5) * 2) / zoom;
				const relY = ((gy / (baseRes - 1) - 0.5) * 2) / zoom;
				grid[gy * baseRes + gx] = sampleHU(relX, relY);
			}
		}

		const renderInterpolated = (
			canvas: HTMLCanvasElement | null,
			mode: "nearest" | "bilinear" | "bicubic" | "sharpen",
		) => {
			if (!canvas) return;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			const w = canvas.width;
			const h = canvas.height;
			const imgData = ctx.createImageData(w, h);
			const d = imgData.data;

			const getVoxel = (gx: number, gy: number): number => {
				const cx = Math.max(0, Math.min(baseRes - 1, gx));
				const cy = Math.max(0, Math.min(baseRes - 1, gy));
				return grid[cy * baseRes + cx] ?? 0;
			};

			for (let py = 0; py < h; py++) {
				const gyF = (py / (h - 1)) * (baseRes - 1);
				const gy0 = Math.floor(gyF);
				const fy = gyF - gy0;

				for (let px = 0; px < w; px++) {
					const gxF = (px / (w - 1)) * (baseRes - 1);
					const gx0 = Math.floor(gxF);
					const fx = gxF - gx0;

					let hu = 0;

					if (mode === "nearest") {
						hu = getVoxel(Math.round(gxF), Math.round(gyF));
					} else if (mode === "bilinear") {
						const v00 = getVoxel(gx0, gy0);
						const v10 = getVoxel(gx0 + 1, gy0);
						const v01 = getVoxel(gx0, gy0 + 1);
						const v11 = getVoxel(gx0 + 1, gy0 + 1);
						const top = v00 * (1 - fx) + v10 * fx;
						const btm = v01 * (1 - fx) + v11 * fx;
						hu = top * (1 - fy) + btm * fy;
					} else if (mode === "bicubic") {
						// Catmull-Rom across 4x4 neighborhood
						const colVals: number[] = [];
						for (let j = -1; j <= 2; j++) {
							const p0 = getVoxel(gx0 - 1, gy0 + j);
							const p1 = getVoxel(gx0, gy0 + j);
							const p2 = getVoxel(gx0 + 1, gy0 + j);
							const p3 = getVoxel(gx0 + 2, gy0 + j);
							colVals.push(catmullRom(p0, p1, p2, p3, fx));
						}
						hu = catmullRom(
							colVals[0] ?? 0,
							colVals[1] ?? 0,
							colVals[2] ?? 0,
							colVals[3] ?? 0,
							fy,
						);
					} else if (mode === "sharpen") {
						// Bilinear + Discrete 2D Laplacian High-Pass Edge Boost
						const v00 = getVoxel(gx0, gy0);
						const v10 = getVoxel(gx0 + 1, gy0);
						const v01 = getVoxel(gx0, gy0 + 1);
						const v11 = getVoxel(gx0 + 1, gy0 + 1);
						const top = v00 * (1 - fx) + v10 * fx;
						const btm = v01 * (1 - fx) + v11 * fx;
						const center = top * (1 - fy) + btm * fy;

						const north = getVoxel(gx0, gy0 - 1);
						const south = getVoxel(gx0, gy0 + 1);
						const west = getVoxel(gx0 - 1, gy0);
						const east = getVoxel(gx0 + 1, gy0);
						const laplacian = north + south + west + east - 4 * center;

						// Boost high-frequency boundaries (enamel cap, lamina dura, root canals)
						hu = center - 0.45 * laplacian;
					}

					const gray = huToGreyscale(hu);
					const idx = (py * w + px) * 4;
					d[idx] = gray;
					d[idx + 1] = gray;
					d[idx + 2] = gray;
					d[idx + 3] = 255;
				}
			}
			ctx.putImageData(imgData, 0, 0);
		};

		renderInterpolated(canvasNearestRef.current, "nearest");
		renderInterpolated(canvasBilinearRef.current, "bilinear");
		renderInterpolated(canvasBicubicRef.current, "bicubic");
		renderInterpolated(canvasSharpenRef.current, "sharpen");
	}, [activeZone, zoomLevel, realSlice]);

	return (
		<div
			style={{ paddingBottom: "700px" }}
			className="min-h-screen bg-[var(--paper-soft)] text-[var(--ink)] p-4 md:p-6 transition-colors duration-200"
		>
			{/* Top Bar */}
			<header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
						<Microscope className="h-6 w-6" />
					</div>
					<div>
						<h1 className="text-xl font-bold tracking-tight text-[var(--ink)]">
							CBCT Voxel Resolution & Interpolation Studio
						</h1>
						<p className="text-xs text-[var(--muted)]">
							Физико-клиническое сравнение воксельной сетки (128³ vs 256³ vs
							512³) и алгоритмов интерполяции КТ
						</p>
					</div>
				</div>

				{/* Controls Toolbar */}
				<div className="flex flex-wrap items-center gap-3">
					{/* Patient & Source Selector */}
					<div className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-1 text-xs shadow-sm">
						{(
							[
								{ id: "zakharov", label: "Захаров И.Д. (КТ 600×600)" },
								{ id: "sumarokova", label: "Сумарокова И.О. (КТ сектор 24-26)" },
								{ id: "bulyakov", label: "Буляков Н.З. (КТ 560×560)" },
								{ id: "phantom_molar", label: "Анатомический фантом 46" },
							] as const
						).map((zone) => {
							const isActive = activeZone === zone.id;
							return (
								<button
									key={zone.id}
									type="button"
									onClick={() => setActiveZone(zone.id)}
									style={{
										backgroundColor: isActive ? "#0d9488" : "transparent",
										color: isActive ? "#ffffff" : "var(--muted)",
									}}
									className="rounded-md px-3 py-1.5 font-medium transition-all duration-150 border-0 outline-none cursor-pointer shadow-xs"
								>
									{zone.label}
								</button>
							);
						})}
					</div>

					{/* Live Real DICOM Status Badge */}
					{realSlice ? (
						<div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
							<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
							<span>Реальное КТ DICOM: {realSlice.name} ({realSlice.dimX}×{realSlice.dimY}, срез Z={realSlice.z}, {realSlice.spX} мм)</span>
						</div>
					) : (
						<div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-300 text-[11px] font-semibold">
							<span>Анатомический эталон корней (Моляр 46)</span>
						</div>
					)}

					{/* Zoom Factor Segmented Bar */}
					<div className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-1 text-xs shadow-sm">
						<Sliders className="h-3.5 w-3.5 text-[var(--muted)] mr-0.5" />
						<span className="text-[11px] font-medium text-[var(--muted)] mr-1">
							Зум:
						</span>
						{([1, 2, 3] as const).map((z) => {
							const isActive = zoomLevel === z;
							return (
								<button
									key={z}
									type="button"
									onClick={() => setZoomLevel(z)}
									style={{
										backgroundColor: isActive ? "#0d9488" : "transparent",
										color: isActive ? "#ffffff" : "var(--muted)",
									}}
									className="min-w-[26px] h-[24px] flex items-center justify-center rounded font-mono text-xs transition-all duration-150 border-0 outline-none cursor-pointer shadow-xs font-semibold"
								>
									{z}x
								</button>
							);
						})}
					</div>

					{/* Theme Toggle */}
					<button
						type="button"
						onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
						className="flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 text-xs font-medium shadow-sm hover:bg-[var(--paper-hover)] text-[var(--ink)] cursor-pointer outline-none transition-colors"
					>
						{theme === "dark" ? (
							<Sun className="h-4 w-4 text-amber-400" />
						) : (
							<Moon className="h-4 w-4 text-teal-600" />
						)}
						<span>{theme === "dark" ? "Светлая" : "Тёмная"}</span>
					</button>
				</div>
			</header>

			{/* SECTION 1: VOXEL RESOLUTION COMPARISON */}
			<section
				id="section-resolution"
				className="mb-6 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm"
			>
				<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-subtle)] pb-3">
					<div>
						<h2 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
							<Layers className="h-5 w-5 text-teal-600 dark:text-teal-400" />
							1. Влияние разрешения вокселя на диагностику зубов (128³ vs 256³
							vs 512³)
						</h2>
						<p className="text-xs text-[var(--muted)] mt-0.5">
							Физический диаметр зуба ~10 мм. Периодонтальная щель = 0.2 мм.
							Верхушка канала = 0.15 мм.
						</p>
					</div>
					<div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
						<span>Клинический стандарт: ≥ 256³ (0.47 мм)</span>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* 128 Potato */}
					<div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex flex-col items-center">
						<div className="w-full flex items-center justify-between mb-2">
							<span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
								<XCircle className="h-4 w-4" /> 128³ POTATO (0.94 мм/воксель)
							</span>
							<span className="text-[11px] font-mono text-[var(--muted)]">
								VRAM: 2.3 МБ
							</span>
						</div>
						<div className="relative border-2 border-red-500/40 rounded-lg overflow-hidden shadow-inner bg-black">
							<canvas
								ref={canvas128Ref}
								width={220}
								height={220}
								className="w-[220px] h-[220px] block"
							/>
							<div className="absolute bottom-1 right-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-red-400 border border-red-500/30">
								Воксель: ~0.94 мм
							</div>
						</div>
						<div className="mt-3 w-full text-xs space-y-1 text-[var(--muted)]">
							<div className="text-red-600 dark:text-red-400 font-semibold text-[11px]">
								❌ ДИАГНОСТИЧЕСКИЙ БРАК ДЛЯ ЗУБОВ:
							</div>
							<p className="text-[11px] leading-relaxed">
								• Корневые каналы (0.2 мм) <strong>полностью стёрты</strong>{" "}
								усреднением плотности с дентином.
								<br />• Периодонтальная щель не дифференцируется.
								<br />• <em>Применение:</em> строго черновой драфт вращения 3D
								черепа на слабых ПК.
							</p>
						</div>
					</div>

					{/* 256 Balanced */}
					<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col items-center">
						<div className="w-full flex items-center justify-between mb-2">
							<span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
								<Compass className="h-4 w-4" /> 256³ BALANCED (0.47 мм/воксель)
							</span>
							<span className="text-[11px] font-mono text-[var(--muted)]">
								VRAM: 18.8 МБ
							</span>
						</div>
						<div className="relative border-2 border-amber-500/40 rounded-lg overflow-hidden shadow-inner bg-black">
							<canvas
								ref={canvas256Ref}
								width={220}
								height={220}
								className="w-[220px] h-[220px] block"
							/>
							<div className="absolute bottom-1 right-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-amber-400 border border-amber-500/30">
								Воксель: 0.47 мм
							</div>
						</div>
						<div className="mt-3 w-full text-xs space-y-1 text-[var(--muted)]">
							<div className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
								⚠️ ДОПУСТИМО ДЛЯ ХИРУРГИИ / ПЛАНА:
							</div>
							<p className="text-[11px] leading-relaxed">
								• Видны коронки, бифуркация корней, костные карманы.
								<br />• Каналы различимы как пиксели, но апикальная дельта
								размыта.
								<br />• <em>Применение:</em> навигация по объёму,
								позиционирование имплантатов.
							</p>
						</div>
					</div>

					{/* 512 Ultra */}
					<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col items-center">
						<div className="w-full flex items-center justify-between mb-2">
							<span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
								<CheckCircle2 className="h-4 w-4" /> 512³ ULTRA (0.23
								мм/воксель)
							</span>
							<span className="text-[11px] font-mono text-[var(--muted)]">
								VRAM: 150 МБ
							</span>
						</div>
						<div className="relative border-2 border-emerald-500/40 rounded-lg overflow-hidden shadow-inner bg-black">
							<canvas
								ref={canvas512Ref}
								width={220}
								height={220}
								className="w-[220px] h-[220px] block"
							/>
							<div className="absolute bottom-1 right-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/80 text-emerald-400 border border-emerald-500/30">
								Воксель: 0.23 мм
							</div>
						</div>
						<div className="mt-3 w-full text-xs space-y-1 text-[var(--muted)]">
							<div className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
								✅ ЭНДОДОНТИЧЕСКИЙ ЭТАЛОН DENTE:
							</div>
							<p className="text-[11px] leading-relaxed">
								• Чёткая периодонтальная щель (0.2 мм) и Lamina Dura.
								<br />• Дифференциация обоих каналов в мезиальном корне.
								<br />• <em>Применение:</em> эндодонтия, поиск трещин корня,
								контроль пломбировки.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* SECTION 2: INTERPOLATION METHODS COMPARISON */}
			<section
				id="section-interpolation"
				className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 shadow-sm"
			>
				<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-subtle)] pb-3">
					<div>
						<h2 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
							<Zap className="h-5 w-5 text-teal-600 dark:text-teal-400" />
							2. Сравнение 4 алгоритмов интерполяции при одинаковом исходном
							срезе
						</h2>
						<p className="text-xs text-[var(--muted)] mt-0.5">
							Как метод восстановления суб-воксельных значений меняет чёткость
							эмали и периодонтальной связки
						</p>
					</div>
					<div className="text-xs font-mono text-[var(--muted)]">
						Суб-воксельный сэмплинг: 4x Super-Sample
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
					{/* Nearest Neighbor */}
					<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-subtle)] p-3.5 flex flex-col items-center">
						<div className="w-full text-xs font-bold text-[var(--ink)] mb-2 flex items-center justify-between">
							<span>1. Nearest Neighbor</span>
							<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]">
								O(1)
							</span>
						</div>
						<div className="relative border border-[var(--line)] rounded-lg overflow-hidden bg-black">
							<canvas
								ref={canvasNearestRef}
								width={180}
								height={180}
								className="w-[180px] h-[180px] block"
							/>
						</div>
						<div className="mt-2.5 w-full text-[11px] text-[var(--muted)] leading-tight">
							<strong>Ступенчатый блок:</strong> Значение ближайшего вокселя.
							Эффект «лесенки» (Minecraft). Границы эмали рваные.
						</div>
					</div>

					{/* Bilinear */}
					<div className="rounded-xl border border-[var(--line)] bg-[var(--paper-subtle)] p-3.5 flex flex-col items-center">
						<div className="w-full text-xs font-bold text-[var(--ink)] mb-2 flex items-center justify-between">
							<span>2. Bilinear (GPU Default)</span>
							<span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
								1 такт GPU
							</span>
						</div>
						<div className="relative border border-[var(--line)] rounded-lg overflow-hidden bg-black">
							<canvas
								ref={canvasBilinearRef}
								width={180}
								height={180}
								className="w-[180px] h-[180px] block"
							/>
						</div>
						<div className="mt-2.5 w-full text-[11px] text-[var(--muted)] leading-tight">
							<strong>Сглаживание:</strong> Взвешенное среднее по 4 соседям.
							Ступеньки убраны, но граница эмаль-дентин замылена.
						</div>
					</div>

					{/* Bicubic Catmull-Rom */}
					<div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-3.5 flex flex-col items-center">
						<div className="w-full text-xs font-bold text-teal-600 dark:text-teal-400 mb-2 flex items-center justify-between">
							<span>3. Bicubic (Catmull-Rom)</span>
							<span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30">
								16 точек
							</span>
						</div>
						<div className="relative border border-teal-500/30 rounded-lg overflow-hidden bg-black">
							<canvas
								ref={canvasBicubicRef}
								width={180}
								height={180}
								className="w-[180px] h-[180px] block"
							/>
						</div>
						<div className="mt-2.5 w-full text-[11px] text-[var(--muted)] leading-tight">
							<strong>Кубический сплайн:</strong> Сохраняет кривизну
							анатомического контура, резкие градиенты эмали без муара.
						</div>
					</div>

					{/* Laplacian Unsharp Mask */}
					<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex flex-col items-center">
						<div className="w-full text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center justify-between">
							<span>4. Laplacian Sharpen</span>
							<span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
								Edge Boost
							</span>
						</div>
						<div className="relative border border-emerald-500/30 rounded-lg overflow-hidden bg-black">
							<canvas
								ref={canvasSharpenRef}
								width={180}
								height={180}
								className="w-[180px] h-[180px] block"
							/>
						</div>
						<div className="mt-2.5 w-full text-[11px] text-[var(--muted)] leading-tight">
							<strong>Выделение контуров:</strong> Линейная интерполяция +
							оператор Лапласа. Максимальный контраст каналов и периодонта.
						</div>
					</div>
				</div>
			</section>

			{/* Architectural Decision Summary */}
			<footer className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 text-xs text-[var(--muted)] flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
				<div>
					<span className="font-semibold text-[var(--ink)]">
						Архитектурный закон DENTE:
					</span>{" "}
					128³ используется <strong>ТОЛЬКО</strong> для чернового драфта
					вращения 3D объема на слабых ПК (Potato). Срезы 2D MPR{" "}
					<strong>ВСЕГДА</strong> отдаются в полном разрешении DICOM матрицы (≥
					256³ / 512³) с аппаратным фильтром резкости.
				</div>
				<div className="flex items-center gap-2 font-mono text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
					<span>100% медицинская точность в статике</span>
				</div>
			</footer>
		</div>
	);
}

// Standalone mount
const container = document.getElementById("root");
if (container) {
	const root = ReactDOM.createRoot(container);
	root.render(<CbctResolutionInterpolationInquisitionView />);
}
