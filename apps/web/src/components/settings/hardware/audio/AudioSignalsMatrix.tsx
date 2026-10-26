import React from "react";
import { Volume2 } from "lucide-react";
import type { ProceduralSignalType } from "../../../../services/audio/clinicalProceduralAudio.js";
import { SIGNAL_LABELS } from "./audioConstants.js";

interface Props {
	activeSignal: ProceduralSignalType | null;
	onTestSignal: (signal: ProceduralSignalType) => void;
}

export const AudioSignalsMatrix: React.FC<Props> = ({ activeSignal, onTestSignal }) => {
	const signalKeys = Object.keys(SIGNAL_LABELS) as ProceduralSignalType[];

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider m-0">
					Тестирование клинических процедурных сигналов
				</h4>
				<span className="text-[11px] text-[var(--muted)]">
					ADSR огибающие • 0 ms задержка • Без обращения к диску
				</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{signalKeys.map((signalKey) => {
					const sig = SIGNAL_LABELS[signalKey];
					const Icon = sig.icon;
					const isPlaying = activeSignal === signalKey;

					return (
						<div
							key={signalKey}
							className={`p-3.5 rounded-xl bg-[var(--paper)] border transition-all flex flex-col justify-between gap-3 ${
								isPlaying
									? "border-teal-500 shadow-xs ring-1 ring-teal-500/30"
									: "border-[var(--line)] hover:border-slate-300 dark:hover:border-slate-700"
							}`}
							data-testid={`hw-audio-signal-card-${signalKey}`}
						>
							<div className="space-y-1.5">
								<div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
									<div className="flex items-center gap-2 min-w-0">
										<div className="w-6 h-6 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-center text-[var(--teal)] shrink-0">
											<Icon className="w-3.5 h-3.5" />
										</div>
										<span className="text-xs font-bold text-[var(--ink)] whitespace-nowrap">{sig.title}</span>
									</div>
									<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">
										{sig.freq}
									</span>
								</div>
								<p className="text-[11.5px] text-[var(--muted)] m-0 leading-relaxed">
									{sig.desc}
								</p>
							</div>

							<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between">
								<span className="text-[10.5px] text-[var(--muted)]">
									{isPlaying ? "Воспроизведение..." : "Готов к синтезу"}
								</span>
								<button
									type="button"
									onClick={() => onTestSignal(signalKey)}
									className={`min-h-[30px] px-3 py-1 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
										isPlaying
											? "bg-[var(--teal)] text-white shadow-xs"
											: "bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--ink)] border border-[var(--line)]"
									}`}
									data-testid={`hw-audio-btn-test-${signalKey}`}
								>
									<Volume2 size={13} className={isPlaying ? "animate-bounce" : ""} />
									<span>Воспроизвести</span>
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
