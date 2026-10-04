/**
 * DENTE CRM — Consultation & Treatment Dynamics Bone Gain HUD (ConsultationDynamicsHud)
 *
 * Implements:
 * 1. Synchronized Slice Z-scroll telemetry (with slice thickness compensation)
 * 2. Pre-op vs Post-op Alveolar Ridge Bone Delta Calculator (Height, Width, HU)
 * 3. Clinical Osteointegration / Peri-implantitis diagnostic status
 * 4. 1-Click Form 043/u Protocol Injection:
 *    «Прирост костной ткани в обл. 16 зуба: +4.2 мм. Имплантат остеоинтегрирован без периимплантита»
 *
 * Standards: Mandate 8b (<= 300 lines); Mandate 8e (Doctor Autonomy).
 */

import React from "react";
import {
	Activity,
	ArrowDown,
	ArrowUp,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	FileText,
	Layers,
	Link2,
	Link2Off,
	Sparkles,
	Zap,
} from "lucide-react";
import {
	calculateBoneDynamicsDelta,
	generateBoneDynamics043Protocol,
	type BoneDimensionPoint,
	type SynchronizedSliceState,
} from "./cbctComparisonMath.js";

export interface ConsultationDynamicsHudProps {
	readonly toothFdi: string | number;
	readonly onChangeToothFdi?: (tooth: string) => void;
	readonly baselineBone: BoneDimensionPoint;
	readonly followupBone: BoneDimensionPoint;
	readonly onChangeBaselineBone: (bone: BoneDimensionPoint) => void;
	readonly onChangeFollowupBone: (bone: BoneDimensionPoint) => void;
	readonly sliceSyncState: SynchronizedSliceState;
	readonly isSyncSlices: boolean;
	readonly onToggleSyncSlices: () => void;
	readonly onStepSliceZ: (deltaZMm: number) => void;
	readonly onInsertDynamicsProtocol: (protocolText: string) => void;
	readonly baselineStudyDate?: string | undefined;
	readonly followupStudyDate?: string | undefined;
}

export const ConsultationDynamicsHud: React.FC<ConsultationDynamicsHudProps> = ({
	toothFdi,
	onChangeToothFdi,
	baselineBone,
	followupBone,
	onChangeBaselineBone,
	onChangeFollowupBone,
	sliceSyncState,
	isSyncSlices,
	onToggleSyncSlices,
	onStepSliceZ,
	onInsertDynamicsProtocol,
	baselineStudyDate = "12.01.2024",
	followupStudyDate = "15.07.2024",
}) => {
	const deltaResult = calculateBoneDynamicsDelta({
		baseline: baselineBone,
		followup: followupBone,
		toothFdi,
		isImplantPlaced: true,
	});

	const signH = deltaResult.deltaHeightMm > 0 ? `+${deltaResult.deltaHeightMm.toFixed(1)}` : deltaResult.deltaHeightMm.toFixed(1);
	const signW = deltaResult.deltaWidthMm > 0 ? `+${deltaResult.deltaWidthMm.toFixed(1)}` : deltaResult.deltaWidthMm.toFixed(1);

	const handleCommitTo043 = () => {
		const statement = generateBoneDynamics043Protocol(deltaResult, false);
		onInsertDynamicsProtocol(statement);
	};

	return (
		<div
			data-testid="consultation-dynamics-hud"
			className="flex flex-col bg-[#070b14]/95 border border-[#1e293b] rounded-lg p-2.5 text-xs text-slate-200 shadow-xl backdrop-blur-md gap-2"
		>
			{/* Top Bar: Title, FDI Tooth selector & Sync Slices Toggle */}
			<div className="flex items-center justify-between gap-2 border-b border-[#1e293b] pb-2">
				<div className="flex items-center gap-2">
					<span className="p-1 rounded bg-[#064e3b] text-[#34d399] border border-[#00C853]/40">
						<Activity size={14} />
					</span>
					<span className="font-bold text-[12px] text-white">
						Динамика остеоинтеграции (До / После)
					</span>
					<div className="flex items-center gap-1 bg-[#0f172a] px-2 py-0.5 rounded border border-[#334155]">
						<span className="text-[10px] text-slate-400">Зуб:</span>
						<strong className="text-[#38bdf8] font-mono text-[11px]">#{toothFdi}</strong>
					</div>
				</div>

				{/* Synchronized Slice Scrolling Control */}
				<div className="flex items-center gap-1.5 bg-[#0f172a] px-2 py-1 rounded border border-[#334155]">
					<button
						type="button"
						onClick={onToggleSyncSlices}
						className={`px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
							isSyncSlices
								? "bg-[#064e3b] text-[#34d399] border border-[#00C853]"
								: "text-slate-400 hover:text-white"
						}`}
						data-testid="btn-toggle-sync-slices"
						title={isSyncSlices ? "Синхронный скролл срезов активен" : "Раздельный скролл срезов"}
					>
						{isSyncSlices ? <Link2 size={11} /> : <Link2Off size={11} />}
						<span>Срезы Z: {isSyncSlices ? "Синхронно" : "Раздельно"}</span>
					</button>

					<div className="flex items-center gap-1 text-[11px] font-mono text-cyan-300">
						<span>Z={sliceSyncState.physicalZMm.toFixed(1)} мм</span>
						<span className="text-slate-500">|</span>
						<span className="text-emerald-400 text-[10px]">
							С1: #{sliceSyncState.baselineIndex + 1}/{sliceSyncState.baselineMaxIndex + 1}
						</span>
						<span className="text-cyan-400 text-[10px]">
							С2: #{sliceSyncState.followupIndex + 1}/{sliceSyncState.followupMaxIndex + 1}
						</span>
					</div>

					<div className="flex items-center gap-0.5 ml-1">
						<button
							type="button"
							onClick={() => onStepSliceZ(-1.0)}
							className="p-1 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-300 cursor-pointer"
							title="Сместить срез вверх (-1.0 мм)"
							data-testid="btn-step-slice-up"
						>
							<ChevronLeft size={12} />
						</button>
						<button
							type="button"
							onClick={() => onStepSliceZ(1.0)}
							className="p-1 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-300 cursor-pointer"
							title="Сместить срез вниз (+1.0 мм)"
							data-testid="btn-step-slice-down"
						>
							<ChevronRight size={12} />
						</button>
					</div>
				</div>
			</div>

			{/* Middle Row: Measurement Inputs (Pre vs Post) & Live Delta Calculation */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
				{/* Column 1: Baseline (Pre-op) */}
				<div className="flex flex-col gap-1 p-2 rounded bg-[#0f172a] border border-[#1e293b]">
					<div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
						<span className="text-emerald-400">ДО ОПЕРАЦИИ (Базовое)</span>
						<span className="font-mono">{baselineStudyDate}</span>
					</div>
					<div className="grid grid-cols-3 gap-1.5 pt-1">
						<div>
							<label className="text-[9px] text-slate-500 block">Высота (H)</label>
							<div className="flex items-center gap-0.5">
								<input
									type="number"
									step="0.1"
									value={baselineBone.heightMm}
									onChange={(e) =>
										onChangeBaselineBone({
											...baselineBone,
											heightMm: Number.parseFloat(e.target.value) || 0,
										})
									}
									className="w-full bg-[#1e293b] border border-[#334155] rounded px-1.5 py-0.5 text-xs text-white font-mono"
									data-testid="input-baseline-height"
								/>
								<span className="text-[10px] text-slate-500">мм</span>
							</div>
						</div>
						<div>
							<label className="text-[9px] text-slate-500 block">Ширина (W)</label>
							<div className="flex items-center gap-0.5">
								<input
									type="number"
									step="0.1"
									value={baselineBone.widthMm}
									onChange={(e) =>
										onChangeBaselineBone({
											...baselineBone,
											widthMm: Number.parseFloat(e.target.value) || 0,
										})
									}
									className="w-full bg-[#1e293b] border border-[#334155] rounded px-1.5 py-0.5 text-xs text-white font-mono"
									data-testid="input-baseline-width"
								/>
								<span className="text-[10px] text-slate-500">мм</span>
							</div>
						</div>
						<div>
							<label className="text-[9px] text-slate-500 block">Плотность</label>
							<div className="flex items-center gap-0.5">
								<input
									type="number"
									step="10"
									value={baselineBone.densityHU ?? 420}
									onChange={(e) =>
										onChangeBaselineBone({
											...baselineBone,
											densityHU: Number.parseInt(e.target.value, 10) || 0,
										})
									}
									className="w-full bg-[#1e293b] border border-[#334155] rounded px-1.5 py-0.5 text-xs text-white font-mono"
									data-testid="input-baseline-density"
								/>
								<span className="text-[10px] text-slate-500">HU</span>
							</div>
						</div>
					</div>
				</div>

				{/* Column 2: Followup (Post-op) */}
				<div className="flex flex-col gap-1 p-2 rounded bg-[#0f172a] border border-[#1e293b]">
					<div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
						<span className="text-cyan-400">ПОСЛЕ ОПЕРАЦИИ (Контроль)</span>
						<span className="font-mono">{followupStudyDate}</span>
					</div>
					<div className="grid grid-cols-3 gap-1.5 pt-1">
						<div>
							<label className="text-[9px] text-slate-500 block">Высота (H)</label>
							<div className="flex items-center gap-0.5">
								<input
									type="number"
									step="0.1"
									value={followupBone.heightMm}
									onChange={(e) =>
										onChangeFollowupBone({
											...followupBone,
											heightMm: Number.parseFloat(e.target.value) || 0,
										})
									}
									className="w-full bg-[#1e293b] border border-[#334155] rounded px-1.5 py-0.5 text-xs text-white font-mono"
									data-testid="input-followup-height"
								/>
								<span className="text-[10px] text-slate-500">мм</span>
							</div>
						</div>
						<div>
							<label className="text-[9px] text-slate-500 block">Ширина (W)</label>
							<div className="flex items-center gap-0.5">
								<input
									type="number"
									step="0.1"
									value={followupBone.widthMm}
									onChange={(e) =>
										onChangeFollowupBone({
											...followupBone,
											widthMm: Number.parseFloat(e.target.value) || 0,
										})
									}
									className="w-full bg-[#1e293b] border border-[#334155] rounded px-1.5 py-0.5 text-xs text-white font-mono"
									data-testid="input-followup-width"
								/>
								<span className="text-[10px] text-slate-500">мм</span>
							</div>
						</div>
						<div>
							<label className="text-[9px] text-slate-500 block">Плотность</label>
							<div className="flex items-center gap-0.5">
								<input
									type="number"
									step="10"
									value={followupBone.densityHU ?? 840}
									onChange={(e) =>
										onChangeFollowupBone({
											...followupBone,
											densityHU: Number.parseInt(e.target.value, 10) || 0,
										})
									}
									className="w-full bg-[#1e293b] border border-[#334155] rounded px-1.5 py-0.5 text-xs text-white font-mono"
									data-testid="input-followup-density"
								/>
								<span className="text-[10px] text-slate-500">HU</span>
							</div>
						</div>
					</div>
				</div>

				{/* Column 3: Delta Highlights & Action Button */}
				<div className="flex flex-col justify-between p-2 rounded bg-[#061e17] border border-[#00C853]/40 h-full">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
							<CheckCircle2 size={11} />
							<span>Δ ПРИРОСТ КОСТИ</span>
						</span>
						<span className="font-mono text-xs font-bold text-[#34d399]">
							{signH} мм ({deltaResult.heightGainPercent > 0 ? `+${deltaResult.heightGainPercent}` : deltaResult.heightGainPercent}%)
						</span>
					</div>

					<div className="text-[10px] text-slate-300 py-1 flex items-center justify-between font-mono">
						<span>Δ Ширина: <strong className="text-white">{signW} мм</strong></span>
						{deltaResult.deltaDensityHU !== null && (
							<span>Δ Плотность: <strong className="text-white">+{deltaResult.deltaDensityHU} HU</strong></span>
						)}
					</div>

					<button
						type="button"
						onClick={handleCommitTo043}
						className="w-full mt-1 px-2.5 py-1 rounded font-bold text-[11px] bg-[#00C853] hover:bg-[#00b048] text-[#022c15] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md"
						data-testid="btn-insert-dynamics-protocol"
						title="Внести подтвержденный протокол остеоинтеграции и прироста кости в медицинскую карту"
					>
						<Zap size={12} className="fill-current" />
						<span>Внести в карту</span>
					</button>
				</div>
			</div>

			{/* Bottom Bar: Canonical Clinical Conclusion Preview */}
			<div className="flex items-center justify-between bg-[#0f172a] px-2.5 py-1 rounded border border-[#1e293b] text-[11px]">
				<div className="flex items-center gap-1.5 text-slate-300 truncate">
					<Sparkles size={12} className="text-[#00C853] shrink-0" />
					<span className="font-medium truncate">{deltaResult.clinicalSummaryRu}</span>
				</div>
				<span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-[#064e3b]/80 border border-[#00C853]/40 shrink-0 ml-2">
					{deltaResult.osteointegrationStatus === "osteointegrated"
						? "ОСТЕОИНТЕГРИРОВАН"
						: "КОНСОЛИДАЦИЯ ГРАФТА"}
				</span>
			</div>
		</div>
	);
};
