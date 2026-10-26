import React from "react";
import { Sparkles, Vibrate, Volume2, VolumeX } from "lucide-react";
import type { ProceduralSignalEvent, ProceduralSignalType } from "../../../../services/audio/clinicalProceduralAudio.js";
import { SIGNAL_LABELS } from "./audioConstants.js";

interface Props {
	soundEnabled: boolean;
	volume: number;
	hapticsEnabled: boolean;
	lastSignal: ProceduralSignalEvent | null;
	activeSignal: ProceduralSignalType | null;
	onToggleSound: (enabled: boolean) => void;
	onVolumeChange: (volume: number) => void;
	onToggleHaptics: (enabled: boolean) => void;
}

export const AudioControlsCard: React.FC<Props> = ({
	soundEnabled,
	volume,
	hapticsEnabled,
	lastSignal,
	activeSignal,
	onToggleSound,
	onVolumeChange,
	onToggleHaptics,
}) => {
	const activeInfo = activeSignal ? SIGNAL_LABELS[activeSignal] : null;
	const lastInfo = lastSignal ? SIGNAL_LABELS[lastSignal.signal] : null;

	return (
		<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-4">
				<div className="flex items-center gap-4">
					<label className="flex items-center gap-2.5 cursor-pointer select-none">
						<input
							type="checkbox"
							checked={soundEnabled}
							onChange={(e) => onToggleSound(e.target.checked)}
							className="rounded border-[var(--line)] text-[var(--teal)] focus:ring-[var(--teal)]"
							data-testid="hw-audio-sound-enabled-toggle"
						/>
						<div className="flex items-center gap-1.5">
							{soundEnabled ? (
								<Volume2 size={16} className="text-[var(--teal)]" />
							) : (
								<VolumeX size={16} className="text-[var(--muted)]" />
							)}
							<span className="text-xs font-bold text-[var(--ink)]">Звуковые сигналы интерфейса</span>
						</div>
					</label>

					<label className="flex items-center gap-2.5 cursor-pointer select-none">
						<input
							type="checkbox"
							checked={hapticsEnabled}
							onChange={(e) => onToggleHaptics(e.target.checked)}
							className="rounded border-[var(--line)] text-[var(--teal)] focus:ring-[var(--teal)]"
							data-testid="hw-audio-haptics-enabled-toggle"
						/>
						<div className="flex items-center gap-1.5">
							<Vibrate size={16} className="text-amber-500" />
							<span className="text-xs font-bold text-[var(--ink)]">Тактильная вибрация (Haptics)</span>
						</div>
					</label>
				</div>

				<div className="flex items-center gap-3 min-w-[200px]">
					<span className="text-xs text-[var(--muted)] shrink-0">Громкость:</span>
					<input
						type="range"
						min="0"
						max="1"
						step="0.05"
						value={volume}
						disabled={!soundEnabled}
						onChange={(e) => onVolumeChange(Number.parseFloat(e.target.value))}
						className="w-full accent-[var(--teal)] cursor-pointer disabled:opacity-40"
						data-testid="hw-audio-volume-slider"
					/>
					<span className="text-xs font-mono font-bold text-[var(--ink)] w-9 text-right shrink-0">
						{Math.round(volume * 100)}%
					</span>
				</div>
			</div>

			<div
				className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
					activeSignal
						? "bg-teal-50 dark:bg-teal-950/40 border-teal-400 text-teal-900 dark:text-teal-200"
						: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)]"
				}`}
				data-testid="hw-audio-live-monitor"
			>
				<div className="flex items-center gap-2 min-w-0">
					<Sparkles size={15} className={activeSignal ? "text-[var(--teal)] animate-spin" : "text-[var(--muted)]"} />
					<span className="text-xs font-medium truncate">
						{activeInfo
							? `Синтез сигнала: ${activeInfo.title} (${activeInfo.freq})`
							: lastInfo
								? `Последний сигнал: ${lastInfo.title} (${new Date(lastSignal?.timestamp || 0).toLocaleTimeString()})`
								: "Монитор аудио-сигналов в режиме ожидания событий"}
					</span>
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<span className={`w-2 h-2 rounded-full ${activeSignal ? "bg-[var(--teal)] animate-ping" : "bg-slate-300 dark:bg-slate-700"}`} />
					<span className="text-[11px] font-mono">{activeSignal ? "DSP ACTIVE" : "IDLE"}</span>
				</div>
			</div>
		</div>
	);
};
