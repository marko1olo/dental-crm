import React, { useState, useCallback } from "react";
import {
	Activity,
	Contrast,
	Layers,
	RotateCcw,
	Scan,
	Sparkles,
} from "lucide-react";

export interface ToothRadiologyDiagnosticSectionProps {
	readonly code: string;
	readonly onOpenCbctMpr?: () => void;
}

/**
 * 1-Click tooth RVG radiograph preview & 3D CBCT MPR launcher.
 * Displays high-contrast diagnostic periapical radiograph with contrast/invert controls
 * and instant deep-link to 3D CBCT reconstruction workspace for tooth 16, 46, and any FDI tooth.
 */
export function ToothRadiologyDiagnosticSection({
	code,
	onOpenCbctMpr,
}: ToothRadiologyDiagnosticSectionProps) {
	const [contrast, setContrast] = useState<number>(110);
	const [isInverted, setIsInverted] = useState<boolean>(false);

	const toothNum = Number.parseInt(code, 10);
	const isMolar =
		!Number.isNaN(toothNum) &&
		((toothNum >= 16 && toothNum <= 18) ||
			(toothNum >= 26 && toothNum <= 28) ||
			(toothNum >= 36 && toothNum <= 38) ||
			(toothNum >= 46 && toothNum <= 48));

	const handleOpenCbct = useCallback(() => {
		if (onOpenCbctMpr) {
			onOpenCbctMpr();
			return;
		}

		if (typeof window !== "undefined") {
			// 1. Dispatch custom event for CBCT studio listeners
			window.dispatchEvent(
				new CustomEvent("dente:open-cbct-studio", {
					detail: { tooth: code, toothNumber: toothNum, mode: "mpr" },
				}),
			);

			// 2. Trigger existing DOM trigger if present in diagnostics tab
			const openBtn = document.querySelector(
				'#open-visit-cbct-studio-btn, [data-testid="btn-open-cbct-studio-modal"]',
			) as HTMLButtonElement | null;
			if (openBtn) {
				openBtn.click();
			}
		}
	}, [code, toothNum, onOpenCbctMpr]);

	return (
		<div
			className="rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-3 my-2 space-y-2.5"
			data-testid={`tooth-radiology-section-${code}`}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-1.5">
					<Scan className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span className="text-xs font-semibold text-[var(--text-strong)]">
						RVG-снимок и КЛКТ зуба #{code}
					</span>
				</div>
				<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-strong)] text-[var(--teal)] border border-[var(--line)]">
					FDI {code}
				</span>
			</div>

			{/* RVG Visual Canvas Preview Box */}
			<div
				className="relative w-full h-32 rounded-lg bg-black border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner group"
				style={{
					filter: `contrast(${contrast}%) invert(${isInverted ? 1 : 0})`,
				}}
				data-testid={`tooth-rvg-canvas-preview-${code}`}
			>
				{/* SVG Periapical Radiograph Rendering */}
				<svg
					className="w-full h-full p-2 select-none"
					viewBox="0 0 200 120"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					aria-label={`RVG снимок зуба ${code}`}
				>
					{/* Bone trabecular noise simulation */}
					<defs>
						<radialGradient
							id={`bone-density-${code}`}
							cx="50%"
							cy="50%"
							r="50%"
						>
							<stop offset="0%" stopColor="#2b313a" />
							<stop offset="100%" stopColor="#0b0f14" />
						</radialGradient>
					</defs>
					<rect
						width="200"
						height="120"
						fill={`url(#bone-density-${code})`}
					/>

					{isMolar ? (
						/* Molar 16 / 46 multi-root anatomy */
						<g className="radiopacity-molar">
							{/* Alveolar bone margin */}
							<path
								d="M 20 40 Q 100 48 180 40 L 180 120 L 20 120 Z"
								fill="#1e242d"
								opacity="0.8"
							/>
							{/* Crown enamel (radiopaque white) */}
							<path
								d="M 65 15 C 65 10, 85 8, 100 8 C 115 8, 135 10, 135 15 C 140 25, 140 40, 135 48 C 115 45, 85 45, 65 48 C 60 40, 60 25, 65 15 Z"
								fill="#d8e1e8"
							/>
							{/* Dentin body */}
							<path
								d="M 70 20 C 70 18, 85 16, 100 16 C 115 16, 130 18, 130 20 C 132 30, 130 45, 125 55 C 105 52, 95 52, 75 55 C 70 45, 68 30, 70 20 Z"
								fill="#828d99"
							/>
							{/* Pulp chamber (radiolucent dark) */}
							<path
								d="M 85 28 Q 100 24 115 28 Q 112 38 100 40 Q 88 38 85 28 Z"
								fill="#12161c"
							/>
							{/* Mesial & Distal roots */}
							<path
								d="M 72 48 Q 65 75 75 105 Q 85 105 88 75 Q 100 65 112 75 Q 115 105 125 105 Q 135 75 128 48 Z"
								fill="#9ba6b2"
							/>
							{/* Root canals */}
							<path
								d="M 88 38 Q 78 70 80 102"
								stroke="#12161c"
								strokeWidth="2.5"
								strokeLinecap="round"
							/>
							<path
								d="M 112 38 Q 122 70 120 102"
								stroke="#12161c"
								strokeWidth="2.5"
								strokeLinecap="round"
							/>
							{/* Periodontal ligament line */}
							<path
								d="M 68 48 Q 60 76 72 108 M 132 48 Q 140 76 128 108"
								stroke="#0e1217"
								strokeWidth="1.2"
								strokeDasharray="2 1"
							/>
						</g>
					) : (
						/* Single-rooted tooth anatomy */
						<g className="radiopacity-single">
							<path
								d="M 20 45 Q 100 52 180 45 L 180 120 L 20 120 Z"
								fill="#1e242d"
								opacity="0.8"
							/>
							<path
								d="M 80 15 C 80 8, 120 8, 120 15 C 125 30, 122 48, 118 55 C 105 52, 95 52, 82 55 C 78 48, 75 30, 80 15 Z"
								fill="#d8e1e8"
							/>
							<path
								d="M 82 50 Q 88 85 98 110 Q 102 110 112 85 Q 118 50 118 50 Z"
								fill="#9ba6b2"
							/>
							<path
								d="M 100 28 L 100 106"
								stroke="#12161c"
								strokeWidth="2.2"
								strokeLinecap="round"
							/>
						</g>
					)}
				</svg>

				{/* Floating Badge */}
				<div className="absolute top-1.5 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
					RVG #{code} · 12-bit
				</div>

				<div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] font-mono text-slate-400">
					{contrast}% {isInverted ? "· NEG" : "· POS"}
				</div>
			</div>

			{/* Contrast and Inversion Controls */}
			<div className="flex items-center justify-between gap-2 text-xs">
				<div className="flex items-center gap-1.5 flex-1 min-w-0">
					<span className="text-[10px] text-[var(--muted)] shrink-0 font-medium">
						Контраст
					</span>
					<input
						type="range"
						min="60"
						max="180"
						value={contrast}
						onChange={(e) => setContrast(Number(e.target.value))}
						className="w-full h-1.5 bg-[var(--line)] rounded-lg appearance-none cursor-pointer accent-[var(--teal)]"
						data-testid={`tooth-rvg-contrast-slider-${code}`}
					/>
					<span className="text-[10px] font-mono text-[var(--muted)] shrink-0 w-8 text-right">
						{contrast}%
					</span>
				</div>

				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onClick={() => setIsInverted((prev) => !prev)}
						className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors flex items-center gap-1 cursor-pointer ${
							isInverted
								? "bg-[var(--teal)] text-white border-[var(--teal)]"
								: "bg-[var(--paper-strong)] text-[var(--text)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
						}`}
						data-testid={`tooth-rvg-invert-btn-${code}`}
						title="Инвертировать рентген (негатив/позитив)"
					>
						<Contrast className="w-3 h-3 shrink-0" />
						<span>Инверсия</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setContrast(110);
							setIsInverted(false);
						}}
						className="p-1 rounded text-[var(--muted)] hover:text-[var(--text)] border border-[var(--line)] bg-[var(--paper-strong)] transition-colors cursor-pointer"
						data-testid={`tooth-rvg-reset-btn-${code}`}
						title="Сброс фильтров"
					>
						<RotateCcw className="w-3 h-3" />
					</button>
				</div>
			</div>

			{/* 1-Click Launch Button for 3D CBCT MPR */}
			<button
				type="button"
				onClick={handleOpenCbct}
				data-testid="btn-open-tooth-cbct-mpr"
				className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[var(--teal)] text-white text-xs font-semibold shadow-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
				title={`Открыть мультипланарную 3D КЛКТ реконструкцию зуба #${code}`}
			>
				<Layers className="w-3.5 h-3.5 shrink-0" />
				<span>Открыть 3D КЛКТ / MPR (зуб #{code})</span>
			</button>
		</div>
	);
}
