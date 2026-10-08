import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";
import "./components/radiology/rvgCapture.css";
import "./components/radiology/rvgCaptureControls.css";

import { RadiologyStudiesArchive } from "./components/radiology/archive/RadiologyStudiesArchive";
import { DirectRvgCaptureModal } from "./components/radiology/DirectRvgCaptureModal";
import { CbctVolume3DViewport } from "./components/radiology/mpr/CbctVolume3DViewport";
import type { CbctVoxelVolume } from "./components/radiology/cbctMprMath";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import { Layers, Camera, Box, Sun, Moon } from "lucide-react";

function createPreviewVolume(width = 64, height = 64, depth = 48): CbctVoxelVolume {
	const count = width * height * depth;
	const data = new Int16Array(count);
	for (let i = 0; i < count; i++) {
		const z = Math.floor(i / (width * height));
		const rem = i % (width * height);
		const y = Math.floor(rem / width);
		const x = rem % width;
		const dx = (x - width / 2) / (width / 2);
		const dy = (y - height / 2) / (height / 2);
		const dz = (z - depth / 2) / (depth / 2);
		const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
		if (r < 0.6) {
			data[i] = 950; // bone
		} else if (r < 0.75 && y > height / 2) {
			data[i] = 1650; // teeth enamel
		} else {
			data[i] = -1000; // air
		}
	}
	return {
		id: "cbct-preview-vol-live",
		dimensions: { width, height, depth },
		spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
		originMm: { x: -(width * 0.25) / 2, y: -(height * 0.25) / 2, z: -(depth * 0.25) / 2 },
		physicalSizeMm: { x: width * 0.25, y: height * 0.25, z: depth * 0.25 },
		data,
		minHU: -1000,
		maxHU: 2500,
		isDisposed: false,
	};
}

export function RadiologyInquisitionPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const initialTheme = (params.get("theme") as ThemeMode) || "dark";
	const initialView = (params.get("view") as "archive" | "rvg" | "cbct3d") || "archive";

	const [theme, setTheme] = useState<ThemeMode>(initialTheme);
	const [activeView, setActiveView] = useState<"archive" | "rvg" | "cbct3d">(initialView);
	const [isRvgModalOpen, setIsRvgModalOpen] = useState<boolean>(initialView === "rvg");

	useEffect(() => {
		const resolved = resolveTheme(theme, theme === "dark");
		applyThemeToRoot(document.documentElement, resolved);
	}, [theme]);

	const previewVolume = useMemo(() => createPreviewVolume(), []);

	return (
		<div className="h-screen w-screen overflow-hidden bg-[var(--paper)] text-[var(--ink)] flex flex-col font-sans select-none">
			{/* Top Bar for Switcher */}
			<header className="h-11 px-4 bg-[var(--paper-soft)] border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0 z-30">
				<div className="flex items-center gap-3">
					<div className="flex items-center gap-1.5 font-bold text-xs tracking-wide uppercase text-[var(--ink)]">
						<Layers className="w-4 h-4 text-teal-500" />
						<span>Радиология DENTE · Red Team Viewport</span>
					</div>

					<div className="h-4 w-[1px] bg-[var(--line)]" />

					{/* Navigation tabs */}
					<div className="dente-segmented-bar">
						<button
							type="button"
							onClick={() => {
								setActiveView("archive");
								setIsRvgModalOpen(false);
							}}
							className={`dente-segmented-item ${activeView === "archive" && !isRvgModalOpen ? "active" : ""}`}
							data-testid="preview-tab-archive"
						>
							<Layers className="w-3.5 h-3.5" />
							<span>Архив снимков</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setActiveView("rvg");
								setIsRvgModalOpen(true);
							}}
							className={`dente-segmented-item ${isRvgModalOpen ? "active" : ""}`}
							data-testid="preview-tab-rvg"
						>
							<Camera className="w-3.5 h-3.5" />
							<span>Прицельный RVG (1-ряд фильтры)</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setActiveView("cbct3d");
								setIsRvgModalOpen(false);
							}}
							className={`dente-segmented-item ${activeView === "cbct3d" && !isRvgModalOpen ? "active" : ""}`}
							data-testid="preview-tab-cbct3d"
						>
							<Box className="w-3.5 h-3.5" />
							<span>3D КЛКТ Череп (8 проекций)</span>
						</button>
					</div>
				</div>

				{/* Theme switcher */}
				<div className="flex items-center gap-1.5">
					<span className="text-[11px] font-medium text-[var(--muted)]">Тема:</span>
					<button
						type="button"
						onClick={() => setTheme("light")}
						className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
							theme === "light"
								? "bg-teal-600 text-white shadow-xs"
								: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
						}`}
						data-testid="btn-theme-light"
					>
						<Sun className="w-3.5 h-3.5" />
						<span>Светлая</span>
					</button>

					<button
						type="button"
						onClick={() => setTheme("dark")}
						className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
							theme === "dark"
								? "bg-teal-600 text-white shadow-xs"
								: "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
						}`}
						data-testid="btn-theme-dark"
					>
						<Moon className="w-3.5 h-3.5" />
						<span>Тёмная</span>
					</button>
				</div>
			</header>

			{/* Main Workspace Area */}
			<main className="flex-1 overflow-hidden relative flex flex-col">
				{activeView === "archive" && !isRvgModalOpen && (
					<div className="w-full h-full flex flex-col overflow-hidden">
						<RadiologyStudiesArchive
							onOpenDirectRvgCapture={() => setIsRvgModalOpen(true)}
							onOpenStudio={() => setActiveView("cbct3d")}
							onUploadNew={() => setIsRvgModalOpen(true)}
						/>
					</div>
				)}

				{activeView === "cbct3d" && !isRvgModalOpen && (
					<div className="w-full h-full flex flex-col overflow-hidden p-3 bg-black">
						<div className="w-full h-full rounded-xl overflow-hidden border border-zinc-800 shadow-2xl relative">
							<CbctVolume3DViewport
								volume={previewVolume}
								isActive={true}
								switcherSlot={
									<div className="h-7 px-2 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-1 text-[11px] font-bold text-cyan-300">
										<Box className="w-3.5 h-3.5 text-cyan-400" />
										<span>3D-реконструкция челюсти</span>
									</div>
								}
							/>
						</div>
					</div>
				)}

				{/* RVG Capture Modal */}
				<DirectRvgCaptureModal
					isOpen={isRvgModalOpen}
					onClose={() => {
						setIsRvgModalOpen(false);
						setActiveView("archive");
					}}
					patientName="Воронова Екатерина Сергеевна"
					patientCardNumber="043/у-2026/891"
					doctorName="Д-р Воронов А.В."
					initialToothFdi="16"
					initialImageUrl="/radiology/sample_rvg_tooth16.jpg"
				/>
			</main>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<RadiologyInquisitionPreviewApp />);
}
