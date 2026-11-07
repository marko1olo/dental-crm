/**
 * @file LiveCallAudioVisualizer.tsx
 * @description Real-time WebRTC audio waveform and volume equalizer component for Clinical Softphone.
 * Displays live speech frequency bars, mic/speaker levels, and WebRTC telemetry (Mandate 8b, Apple HIG).
 */

import React, { useEffect, useState, useRef } from "react";
import { Mic, MicOff, Volume2, Activity, Wifi, AlertCircle } from "lucide-react";
import { getSharedTelephonyAudioStreamManager } from "../../store/telephonyModules/telephonyAudioStreamManager";
import type { TelephonyAudioStreamStats } from "../../store/telephonyModules/telephonyClinicalTypes";

export interface LiveCallAudioVisualizerProps {
	isCallActive: boolean;
	isMuted?: boolean;
	volume?: number;
	className?: string;
	showStats?: boolean;
}

export function LiveCallAudioVisualizer({
	isCallActive,
	isMuted = false,
	volume = 1.0,
	className = "",
	showStats = true,
}: LiveCallAudioVisualizerProps): React.JSX.Element | null {
	const [waveform, setWaveform] = useState<number[]>([
		0.1, 0.15, 0.2, 0.35, 0.5, 0.65, 0.5, 0.35, 0.2, 0.15, 0.1, 0.08,
	]);
	const [stats, setStats] = useState<TelephonyAudioStreamStats>({
		inputLevel: 0.75,
		outputLevel: 1.0,
		jitterMs: 12,
		packetsLost: 0,
		roundTripTimeMs: 25,
		codecName: "opus/48000/2",
	});
	const [micError, setMicError] = useState<string | null>(null);
	const animFrameRef = useRef<number | null>(null);

	useEffect(() => {
		if (!isCallActive) return;

		const manager = getSharedTelephonyAudioStreamManager();
		manager.ensureAudioContext();

		let isRunning = true;
		const updateMeters = () => {
			if (!isRunning) return;
			const currentStats = manager.getAudioStats();
			const bars = manager.getAudioWaveform(14);
			setStats(currentStats);
			setWaveform(bars);
			setMicError(manager.getMicrophoneError());
			animFrameRef.current = requestAnimationFrame(updateMeters);
		};

		animFrameRef.current = requestAnimationFrame(updateMeters);

		return () => {
			isRunning = false;
			if (animFrameRef.current !== null) {
				cancelAnimationFrame(animFrameRef.current);
			}
		};
	}, [isCallActive]);

	if (!isCallActive) return null;

	const formatCodec = (rawCodec?: string) => {
		if (!rawCodec) return "Opus HD";
		const lower = rawCodec.toLowerCase();
		if (lower.includes("opus")) return "Opus 48k";
		if (lower.includes("g711") || lower.includes("pcmu") || lower.includes("pcma")) return "G.711";
		return rawCodec.split("/")[0] || "VoIP HD";
	};

	return (
		<div
			className={`rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-2.5 flex flex-col gap-2 transition-all ${className}`}
			data-testid="live-call-audio-visualizer"
		>
			{micError && (
				<div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
					<AlertCircle size={14} className="shrink-0" />
					<span className="truncate">{micError}</span>
				</div>
			)}

			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
					{isMuted ? (
						<MicOff size={13} className="text-rose-500" />
					) : (
						<Mic size={13} className="text-[var(--teal,#0d9488)]" />
					)}
					<span className="font-medium">
						{isMuted ? "Микрофон выкл." : "Звук разговора"}
					</span>
				</div>

				{showStats && (
					<div className="flex items-center gap-2 text-[11px] font-mono text-[var(--ink-muted)] shrink-0">
						<span className="flex items-center gap-1" title="Задержка RTT">
							<Wifi size={11} className="text-emerald-500" />
							<span>{stats.roundTripTimeMs ?? 25} мс</span>
						</span>
						<span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[var(--paper-strong)] border border-[var(--line)] text-[10px]">
							{formatCodec(stats.codecName)}
						</span>
					</div>
				)}
			</div>

			{/* Frequency Waveform Equalizer */}
			<div
				className="h-7 w-full flex items-center justify-between gap-[3px] px-1 select-none overflow-hidden"
				aria-label="Эквалайзер звукового потока"
			>
				{waveform.map((barAmp, idx) => {
					const heightPx = Math.max(4, Math.round(barAmp * 24));
					const isPeak = barAmp > 0.6;
					return (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed spectrum bars
							key={idx}
							style={{ height: `${heightPx}px` }}
							className={`flex-1 rounded-full transition-all duration-75 ${
								isMuted
									? "bg-[var(--line-strong,#94a3b8)] opacity-40"
									: isPeak
									? "bg-[var(--teal,#0d9488)] shadow-[0_0_6px_rgba(13,148,136,0.4)]"
									: "bg-[var(--teal,#0d9488)]/70"
							}`}
						/>
					);
				})}
			</div>

			{/* Volume Indicators */}
			<div className="flex items-center justify-between gap-2 text-[10px] text-[var(--ink-muted)] font-mono pt-0.5 border-t border-[var(--line-subtle,#f1f5f9)]">
				<div className="flex items-center gap-1">
					<Activity size={10} className="text-[var(--teal,#0d9488)]" />
					<span>Вход: {isMuted ? "0%" : `${Math.round(stats.inputLevel * 100)}%`}</span>
				</div>
				<div className="flex items-center gap-1">
					<Volume2 size={10} />
					<span>Выход: {Math.round(volume * 100)}%</span>
				</div>
			</div>
		</div>
	);
}
