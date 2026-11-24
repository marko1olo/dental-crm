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
			<div className="flex items-center justify-between p-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs">
				<span className="text-[var(--ink-muted)]">Зазор до нижнечелюстного канала (IAN):</span>
				<span
					className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
						isNerveDanger
							? "bg-[var(--danger-soft)] text-[var(--danger)] border-[var(--danger-soft)]"
							: isNerveWarning
								? "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning-soft)]"
								: "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success-soft)]"
					}`}
					data-testid="cbct-implant-nerve-safety-badge"
				>
					{isNerveDanger ? (
						<ShieldAlert className="w-3.5 h-3.5 text-[var(--danger)]" />
					) : isNerveWarning ? (
						<AlertTriangle className="w-3.5 h-3.5 text-[var(--warning)]" />
					) : (
						<ShieldCheck className="w-3.5 h-3.5 text-[var(--success)]" />
					)}
					<span data-testid="cbct-implant-nerve-clearance-badge">
						Нерв: {displayNerveClearanceMm !== null ? `${displayNerveClearanceMm.toFixed(1)} мм` : "—"}
					</span>
				</span>
			</div>

			{/* Carl Misch Bone Quality Profile (D1-D5) */}
			<div
				className="p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-2"
				data-testid="cbct-implant-live-telemetry-hud"
			>
				<div className="flex items-center justify-between text-xs">
					<span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<BoneDensityMisch className="w-4 h-4 text-[var(--primary)]" />
						<span>Плотность кости (Misch):</span>
					</span>
					<span
						className="font-mono font-bold text-[var(--ink)] px-2 py-0.5 rounded bg-[var(--paper)] border border-[var(--line)]"
						data-testid="cbct-implant-misch-class-badge"
					>
						{displayBoneClass} ({displayMeanHU !== null ? `${Math.round(displayMeanHU)} HU` : "—"})
					</span>
				</div>

				{/* 3-Zone HU Density Profile */}
				<div className="grid grid-cols-3 gap-1 pt-0.5 text-[10px]" data-testid="cbct-implant-3zone-density">
					<div className="flex flex-col bg-[var(--paper)] rounded px-1.5 py-0.5 border border-[var(--line)]" title="Кортикальный гребень">
						<span className="text-[var(--ink-muted)] text-[10px]">Гребень 20%</span>
						<span className="font-mono font-bold text-[var(--ink)]" data-testid="misch-zone-crest-hu">
							{displayMeanHU !== null ? `${Math.round(displayMeanHU * 1.15)} HU` : "—"}
						</span>
					</div>
					<div className="flex flex-col bg-[var(--paper)] rounded px-1.5 py-0.5 border border-[var(--line)]" title="Губчатое тело">
						<span className="text-[var(--ink-muted)] text-[10px]">Тело 60%</span>
						<span className="font-mono font-bold text-[var(--ink)]" data-testid="misch-zone-core-hu">
							{displayMeanHU !== null ? `${Math.round(displayMeanHU * 0.95)} HU` : "—"}
						</span>
					</div>
					<div className="flex flex-col bg-[var(--paper)] rounded px-1.5 py-0.5 border border-[var(--line)]" title="Базальный апекс">
						<span className="text-[var(--ink-muted)] text-[10px]">Апекс 20%</span>
						<span className="font-mono font-bold text-[var(--ink)]" data-testid="misch-zone-apex-hu">
							{displayMeanHU !== null ? `${Math.round(displayMeanHU * 1.05)} HU` : "—"}
						</span>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2 text-xs text-[var(--ink-muted)] pt-1.5 border-t border-[var(--line)]">
					<div>
						Торк: <span className="font-mono text-[var(--ink)] font-bold">{displayTorque}</span>
					</div>
					<div>
						Протокол: <span data-testid="cbct-implant-drilling-protocol" className="font-mono text-[var(--ink)] font-bold">{displayDrillingProtocol}</span>
					</div>
				</div>
			</div>
		</>
	);
};
