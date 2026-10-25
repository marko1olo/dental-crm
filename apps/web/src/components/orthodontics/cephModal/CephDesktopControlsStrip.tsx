import React from "react";
import { Sparkles } from "lucide-react";
import type { LandmarkMap } from "../cephalometricMath";
import { CephalometricPresetsBar } from "./CephalometricReportTab";

export interface CephDesktopControlsStripProps {
	readonly onApplyPreset: (preset: LandmarkMap, label: string) => void;
	readonly onResetLandmarks: () => void;
	readonly onRunAiAutoPlacement: () => void;
	readonly isAiInferring: boolean;
	readonly aiBackendLabel: string;
	readonly aiBackendBadge: string;
}

export function CephDesktopControlsStrip({
	onApplyPreset,
	onResetLandmarks,
	onRunAiAutoPlacement,
	isAiInferring,
	aiBackendLabel,
	aiBackendBadge,
}: CephDesktopControlsStripProps) {
	return (
		<div className="hidden lg:flex items-center justify-between px-4 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0" style={{ backgroundColor: "var(--paper-soft)", borderColor: "var(--line)" }}>
			<div className="flex items-center gap-2">
				<CephalometricPresetsBar variant="header" onApplyPreset={onApplyPreset} onResetLandmarks={onResetLandmarks} />
				<div className="h-5 w-[1px] bg-slate-800 mx-1" />
				<button
					type="button"
					onClick={onRunAiAutoPlacement}
					disabled={isAiInferring}
					data-testid="header-ai-autoplacement-btn"
					className={`h-7 px-2.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap shadow-xs ${
						isAiInferring ? "animate-pulse" : "hover:brightness-110"
					}`}
					style={{
						backgroundColor: isAiInferring ? "#134e4a" : "#0d9488",
						color: "#ffffff",
						borderColor: "rgba(45, 212, 191, 0.6)",
					}}
					title={`Анатомический шаблон (${aiBackendLabel})`}
				>
					<Sparkles size={13} className={isAiInferring ? "animate-spin text-amber-300" : "text-amber-300 shrink-0"} />
					<span style={{ color: "#ffffff" }}>{isAiInferring ? "Калибровка..." : "Анатомический шаблон"}</span>
					<span className="text-[10px] px-1 rounded bg-black/50 font-mono text-teal-200 border border-teal-400/40">
						[{aiBackendBadge}]
					</span>
				</button>
			</div>
			<div className="text-xs text-slate-400 font-medium hidden md:flex items-center gap-2 shrink-0 ml-4">
				<span className="text-teal-400 font-bold hidden xl:inline">16 анатомических ориентиров</span>
				<span className="hidden xl:inline">·</span>
				<span>Steiner (SNA, SNB, ANB)</span>
				<span>·</span>
				<span>Tweed / Downs</span>
			</div>
		</div>
	);
}
