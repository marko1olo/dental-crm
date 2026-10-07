/**
 * apps/web/src/cbct_2click_nerve_preview.tsx
 *
 * Standalone Zero-Flake Preview Stand for 2-Click Mandibular Nerve (IAN) Tracing:
 * URL: http://127.0.0.1:5173/cbct_2click_nerve_preview.html?step=1 | 2&theme=dark | light
 *
 * Mandate 8b: Strictly <= 800 lines.
 */

import React, { useEffect, useMemo } from "react";
import ReactDOM from "react-dom/client";

// Canonical Styles
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/themes.css";
import "./styles/theme-overrides.css";
import "./components/radiology/tuner/cbctTunerStyles.css";

import { CbctMprImplantStudioModal } from "./components/radiology/CbctMprImplantStudioModal";
import { DEFAULT_RIGHT_IAN_NERVE_POINTS } from "./components/radiology/mpr/cbctStudioTypes";
import type { CbctVoxelVolume, Point3D } from "./components/radiology/cbctMprMath";

function createCalibratedMandibleVolume(): CbctVoxelVolume {
	const dimX = 128, dimY = 128, dimZ = 64;
	const totalVoxels = dimX * dimY * dimZ;
	const data = new Int16Array(totalVoxels);
	data.fill(-600); // Air / soft tissue boundary

	// Create mandible dental arch & mandibular canal structure
	for (let z = 10; z < 55; z++) {
		for (let y = 20; y < 110; y++) {
			for (let x = 20; x < 110; x++) {
				const nx = (x - 64) / 45;
				const ny = (y - 30) / 75;
				const dist = Math.abs(ny - nx * nx * 0.85);
				if (dist < 0.20 && ny >= -0.05 && ny <= 0.95) {
					const idx = x + y * dimX + z * dimX * dimY;
					data[idx] = 650; // Cortical / cancellous bone
				}
			}
		}
	}

	return {
		id: "calibrated-mandible-preview",
		dimensions: { width: dimX, height: dimY, depth: dimZ },
		spacingMm: { x: 0.4, y: 0.4, z: 0.4 },
		originMm: {
			x: -(dimX * 0.4) / 2,
			y: -(dimY * 0.4) / 2,
			z: -(dimZ * 0.4) / 2,
		},
		data,
		minHU: -1000,
		maxHU: 2500,
		physicalSizeMm: { x: dimX * 0.4, y: dimY * 0.4, z: dimZ * 0.4 },
		isDisposed: false,
	};
}

function CbctNervePreviewApp() {
	const params = new URLSearchParams(window.location.search);
	const step = params.get("step") || "1";
	const theme = params.get("theme") || "dark";

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		document.body.setAttribute("data-theme", theme);
		const isDark = theme === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.classList.toggle("dark", isDark);
		document.body.classList.toggle("light", !isDark);
	}, [theme]);

	const volume = useMemo(() => createCalibratedMandibleVolume(), []);

	// In Step 1: Only Seed 1 (Foramen mentale) is placed
	// In Step 2: Full Fast Marching trajectory with multiple control nodes
	const initialNervePoints: Point3D[] =
		step === "1"
			? [DEFAULT_RIGHT_IAN_NERVE_POINTS[0]!]
			: [...DEFAULT_RIGHT_IAN_NERVE_POINTS];

	return (
		<div className="w-screen h-screen overflow-hidden bg-zinc-950">
			<CbctMprImplantStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Захаров Иван Дмитриевич (3D КЛКТ)"
				patientId="demo_cbct_patient"
				initialVolume={volume}
				autoLoadDemo={false}
				initialStudioMode="diagnostic"
				initialTool="nerve"
				initialNervePoints={initialNervePoints}
			/>
		</div>
	);
}

const rootEl = document.getElementById("root");
if (rootEl) {
	ReactDOM.createRoot(rootEl).render(<CbctNervePreviewApp />);
}
