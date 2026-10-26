import React from "react";
import { ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { BoneDensityMisch } from "../../../../../icons/DentalIcons";

export interface ImplantNerveAndBoneHudProps {
	readonly isNerveDanger: boolean;
	readonly isNerveWarning: boolean;
	readonly displayNerveClearanceMm: number | null;
	readonly displayBoneClass: string;
	readonly displayMeanHU: number | null;
	readonly displayTorque: string;
	readonly displayDrillingProtocol: string;
}

export const ImplantNerveAndBoneHud: React.FC<ImplantNerveAndBoneHudProps> = ({
	isNerveDanger, isNerveWarning, displayNerveClearanceMm,
	displayBoneClass, displayMeanHU, displayTorque, displayDrillingProtocol,
}) => {
	return (
		<>
			{/* IAN Nerve Clearance Card */}
			<div className="flex items-center justify-between p-1.5 rounded bg-zinc-950 border border-zinc-800/80 text-[11px]">
				<span className="text-zinc-400">Зазор до нижнечелюстного канала (IAN):</span>
				<span
					className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border ${
						isNerveDanger
							? "bg-rose-950/60 text-rose-300 border-rose-500/50"
							: isNerveWarning
								? "bg-amber-950/60 text-amber-300 border-amber-500/50"
								: "bg-emerald-950/60 text-emerald-300 border-emerald-500/50"
					}`}
					data-testid="cbct-implant-nerve-safety-badge"
				>
					{isNerveDanger ? (
						<ShieldAlert className="w-3 h-3 text-rose-400" />
					) : isNerveWarning ? (
						<AlertTriangle className="w-3 h-3 text-amber-400" />
					) : (
						<ShieldCheck className="w-3 h-3 text-emerald-400" />
					)}
					<span data-testid="cbct-implant-nerve-clearance-badge">
						Нерв: {displayNerveClearanceMm !== null ? `${displayNerveClearanceMm.toFixed(1)} мм` : "—"}
					</span>
				</span>
			</div>

			{/* Carl Misch Bone Quality Profile (D1-D5) */}
			<div
				className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/80 flex flex-col gap-1.5"
				data-testid="cbct-implant-live-telemetry-hud"
			>
				<div className="flex items-center justify-between text-xs">
					<span className="font-bold text-zinc-300 flex items-center gap-1">
						<BoneDensityMisch className="w-3.5 h-3.5 text-amber-400" />
						<span>Плотность кости (Misch):</span>
					</span>
					<span
						className="font-mono font-bold text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40"
						data-testid="cbct-implant-misch-class-badge"
					>
						{displayBoneClass} ({displayMeanHU !== null ? `${Math.round(displayMeanHU)} HU` : "—"})
					</span>
				</div>

				{/* 3-Zone HU Density Profile */}
				<div className="grid grid-cols-3 gap-1 pt-0.5 text-[10px]" data-testid="cbct-implant-3zone-density">
					<div className="flex flex-col bg-zinc-900 rounded px-1.5 py-0.5 border border-zinc-800" title="Кортикальный гребень">
						<span className="text-zinc-500 text-[9px] uppercase">Гребень 20%</span>
						<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-crest-hu">
							{displayMeanHU !== null ? `${Math.round(displayMeanHU * 1.15)} HU` : "—"}
						</span>
					</div>
					<div className="flex flex-col bg-zinc-900 rounded px-1.5 py-0.5 border border-zinc-800" title="Губчатое тело">
						<span className="text-zinc-500 text-[9px] uppercase">Тело 60%</span>
						<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-core-hu">
							{displayMeanHU !== null ? `${Math.round(displayMeanHU * 0.95)} HU` : "—"}
						</span>
					</div>
					<div className="flex flex-col bg-zinc-900 rounded px-1.5 py-0.5 border border-zinc-800" title="Базальный апекс">
						<span className="text-zinc-500 text-[9px] uppercase">Апекс 20%</span>
						<span className="font-mono font-bold text-cyan-300" data-testid="misch-zone-apex-hu">
							{displayMeanHU !== null ? `${Math.round(displayMeanHU * 1.05)} HU` : "—"}
						</span>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-1 border-t border-zinc-800">
					<div>
						Торк: <span className="font-mono text-zinc-200 font-bold">{displayTorque}</span>
					</div>
					<div>
						Протокол: <span data-testid="cbct-implant-drilling-protocol" className="font-mono text-zinc-200 font-bold">{displayDrillingProtocol}</span>
					</div>
				</div>
			</div>
		</>
	);
};
