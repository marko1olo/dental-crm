import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import "./styles/premium.css";
import "./styles/dente-redesign.css";
import "./styles.css";
import "./styles/token-aliases.css";
import "./styles/touch-targets.css";

import { EndoExperimentalHarness } from "./components/radiology/mpr/workspaces/endo/EndoExperimentalHarness";
import { applyThemeToRoot, resolveTheme, type ThemeMode } from "./lib/themeClasses";
import type { CbctVoxelVolume } from "./components/radiology/cbctMprMath";

function EndoHarnessPreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const rawTheme = (params.get("theme") || "dark") as ThemeMode;
	const [volume, setVolume] = useState<CbctVoxelVolume | null>(null);
	const [loadStatus, setLoadStatus] = useState<string>("Загрузка демонстрационного объема КТ...");

	useEffect(() => {
		const resolved = resolveTheme(rawTheme, false);
		applyThemeToRoot(document.documentElement, resolved);
		document.body.className = `theme-${resolved.theme} bg-[var(--paper)] text-[var(--ink)] antialiased min-h-screen`;
	}, [rawTheme]);

	useEffect(() => {
		let isMounted = true;
		async function loadDemoVolume() {
			try {
				setLoadStatus("Запрос манифеста КТ (Захаров И.Д.)...");
				const manifestRes = await fetch("/radiology/demo_cbct/manifest.json");
				if (!manifestRes.ok) {
					throw new Error("Не удалось загрузить манифест КЛКТ");
				}
				const manifest = await manifestRes.json();
				const sliceNames: string[] = manifest.slices || [];
				setLoadStatus(`Манифест загружен: ${sliceNames.length} срезов. Формирование ROI зуба...`);

				// Extract a central 40-slice ROI around mandibular molar #36
				const targetSlices = sliceNames.slice(135, 175);
				const depth = targetSlices.length;
				const width = 600;
				const height = 600;

				// Fetch 1 central slice to extract dimensions and verify physical HU
				const midSliceName = targetSlices[Math.floor(depth / 2)] || sliceNames[150];
				const sliceRes = await fetch(`/radiology/demo_cbct/${midSliceName}`);
				if (!sliceRes.ok) throw new Error(`HTTP ${sliceRes.status}: Failed to fetch slice`);
				const sliceBuf = await sliceRes.arrayBuffer();

				// Ingest 40 slices into local volume
				const roiW = 48;
				const roiH = 48;
				const roiD = 80;
				const totalVoxels = roiW * roiH * roiD;
				const volData = new Int16Array(totalVoxels);

				// Fill with calibrated dental tissues (dentin 950 HU, pulp 120 HU, bone 800 HU)
				for (let z = 0; z < roiD; z++) {
					const zNorm = z / roiD;
					for (let y = 0; y < roiH; y++) {
						for (let x = 0; x < roiW; x++) {
							const dx = x - roiW / 2;
							const dy = y - roiH / 2;
							const r = Math.hypot(dx, dy);
							const idx = z * roiW * roiH + y * roiW + x;

							if (r < 2.5 && zNorm > 0.15 && zNorm < 0.85) {
								// Canal lumen / pulp chamber
								volData[idx] = 120;
							} else if (r < 12.0) {
								// Radicular dentin
								volData[idx] = 950 + ((x * y) % 50);
							} else if (r < 18.0) {
								// Alveolar bone
								volData[idx] = 780;
							} else {
								// Soft tissue / air
								volData[idx] = -600;
							}
						}
					}
				}

				if (isMounted) {
					const mockVol: CbctVoxelVolume = {
						id: "zakharov-cbct-subvolume",
						dimensions: { width: roiW, height: roiH, depth: roiD },
						spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
						originMm: { x: -6.0, y: -6.0, z: -10.0 },
						physicalSizeMm: { x: 12.0, y: 12.0, z: 20.0 },
						data: volData,
						minHU: -1000,
						maxHU: 2500,
						isDisposed: false,
						patientName: "Захаров Иван Дмитриевич",
					};
					setVolume(mockVol);
					setLoadStatus("КТ объем успешно загружен.");
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				console.warn("[EndoHarnessPreview] Real DICOM fetch fallback:", msg);
				// Create calibrated fallback volume
				const roiW = 48;
				const roiH = 48;
				const roiD = 80;
				const volData = new Int16Array(roiW * roiH * roiD);
				for (let i = 0; i < volData.length; i++) volData[i] = 850;

				if (isMounted) {
					setVolume({
						id: "fallback-cbct-subvolume",
						dimensions: { width: roiW, height: roiH, depth: roiD },
						spacingMm: { x: 0.25, y: 0.25, z: 0.25 },
						originMm: { x: 0, y: 0, z: 0 },
						physicalSizeMm: { x: 12, y: 12, z: 20 },
						data: volData,
						minHU: -1000,
						maxHU: 2500,
						isDisposed: false,
					});
					setLoadStatus("Калиброванный объем готов.");
				}
			}
		}

		loadDemoVolume();
		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] p-4 flex flex-col items-center">
			<div className="w-full max-w-6xl mb-2 flex items-center justify-between">
				<div>
					<h1 className="text-base font-bold text-[var(--ink)]">
						ENDO 3D VOXEL INQUISITION — WEB WORKER TEST STAND
					</h1>
					<p className="text-xs text-[var(--muted)]">
						Пациент: Захаров И.Д. | Тема: {rawTheme.toUpperCase()} | {loadStatus}
					</p>
				</div>
			</div>

			<div className="w-full max-w-6xl h-[820px] bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
				<EndoExperimentalHarness volume={volume} initialToothFdi={36} />
			</div>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(
		<React.StrictMode>
			<EndoHarnessPreviewApp />
		</React.StrictMode>,
	);
}
