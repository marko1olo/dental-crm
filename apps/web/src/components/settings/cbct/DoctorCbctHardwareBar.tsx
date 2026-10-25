import type { HardwareTier } from "@dental/shared";
import { BatteryLow, Cpu, RotateCw, Sparkles, Zap } from "lucide-react";
import React from "react";
import type { HardwareAdaptiveSettings, HardwareProfile } from "../../../lib/hardwareCapabilities";

interface DoctorCbctHardwareBarProps {
	hwProfile: HardwareProfile;
	hwAdaptive: HardwareAdaptiveSettings;
	overrideTier: HardwareTier | null;
	isReevaluating: boolean;
	onReevaluate: () => void;
	onSelectTier: (tier: HardwareTier | null) => void;
}

const TIER_OPTIONS = [
	{ key: null, label: "Авто" },
	{ key: "potato" as const, label: "Potato" },
	{ key: "low" as const, label: "Low" },
	{ key: "balanced" as const, label: "Balanced" },
	{ key: "ultra" as const, label: "Ultra" },
];

export function DoctorCbctHardwareBar({
	hwProfile, hwAdaptive, overrideTier, isReevaluating, onReevaluate, onSelectTier,
}: DoctorCbctHardwareBarProps) {
	const tierBadgeColor = hwProfile.tier === "ultra" ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
		: hwProfile.tier === "balanced" ? "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30"
		: hwProfile.tier === "low" ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
		: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";

	return (
		<div className="pt-3 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-3 text-xs" data-testid="cbct-hardware-auto-adaptation-bar">
			<div className="flex items-center gap-2.5">
				<div className="w-7 h-7 rounded-lg bg-teal-500/15 text-[var(--teal)] flex items-center justify-center shrink-0 border border-teal-500/30">
					<Cpu size={15} />
				</div>
				<div>
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="font-semibold text-[var(--ink)]">Аппаратная адаптация КТ:</span>
						<span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase border ${tierBadgeColor}`} data-testid="cbct-hardware-tier-badge">
							{hwProfile.tier} ({hwProfile.score}/100)
						</span>
						{hwProfile.isHybridGraphics ? (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30" data-testid="cbct-hybrid-gpu-badge">
								<Sparkles size={11} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
								<span>Гибридная графика: {hwProfile.discreteGpuRenderer || "NVIDIA dGPU"}</span>
							</span>
						) : hwProfile.gpuType === "discrete" ? (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30" data-testid="cbct-discrete-gpu-badge">
								<Zap size={11} className="shrink-0 text-purple-600 dark:text-purple-400" />
								<span>Дискретный GPU: {hwProfile.gpuRenderer || "dGPU"}</span>
							</span>
						) : (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30" data-testid="cbct-integrated-gpu-badge">
								<Cpu size={11} className="shrink-0 text-slate-500" />
								<span>{hwProfile.gpuRenderer || "Базовый iGPU (Intel)"}</span>
							</span>
						)}
						{hwProfile.isBatterySaving && (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30" data-testid="cbct-battery-saving-badge">
								<BatteryLow size={12} className="shrink-0" />
								<span>Батарея ≤ 20% (30 FPS)</span>
							</span>
						)}
					</div>
					<div className="text-[11px] text-[var(--muted)] mt-0.5">
						Даунскейл 3D: <strong className="font-mono text-[var(--ink)]">{hwAdaptive.ctDownsampleFactor}x</strong> • Пакет срезов: <strong className="font-mono text-[var(--ink)]">{hwAdaptive.ctSliceBatchSize}</strong>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button" onClick={onReevaluate} disabled={isReevaluating}
					className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[11px] font-semibold text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
					data-testid="button-reevaluate-hardware"
				>
					<RotateCw size={12} className={isReevaluating ? "animate-spin" : ""} />
					<span>Переоценить</span>
				</button>
				<div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--paper)] p-0.5 text-[11px] gap-0.5">
					{TIER_OPTIONS.map((item) => {
						const isSelected = item.key === null ? overrideTier === null : overrideTier === item.key;
						return (
							<button
								key={item.label} type="button" onClick={() => onSelectTier(item.key)}
								className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
									isSelected ? "bg-[var(--teal)] text-white shadow-2xs" : "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
								data-testid={`cbct-tier-btn-${item.label.toLowerCase()}`}
							>
								{item.label}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}
