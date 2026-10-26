import React, { useState, useEffect } from "react";
import {
	clinicalProceduralAudio,
	type ProceduralSignalType,
	type ProceduralSignalEvent,
} from "../../../services/audio/clinicalProceduralAudio.js";
import { AudioHeaderAndTelemetry } from "./audio/AudioHeaderAndTelemetry.js";
import { AudioControlsCard } from "./audio/AudioControlsCard.js";
import { AudioSignalsMatrix } from "./audio/AudioSignalsMatrix.js";

export const HardwareAudioSection: React.FC = () => {
	const [soundEnabled, setSoundEnabled] = useState(() => clinicalProceduralAudio.isEnabled());
	const [volume, setVolume] = useState(() => clinicalProceduralAudio.getVolume());
	const [hapticsEnabled, setHapticsEnabled] = useState(() => clinicalProceduralAudio.isHapticsEnabled());
	const [lastSignal, setLastSignal] = useState<ProceduralSignalEvent | null>(null);
	const [activeSignal, setActiveSignal] = useState<ProceduralSignalType | null>(null);

	useEffect(() => {
		const unsubscribe = clinicalProceduralAudio.subscribe((event) => {
			setLastSignal(event);
			setActiveSignal(event.signal);
			const timer = setTimeout(() => {
				setActiveSignal((current) => (current === event.signal ? null : current));
			}, Math.max(event.durationMs + 100, 300));
			return () => clearTimeout(timer);
		});
		return unsubscribe;
	}, []);

	const handleToggleSound = (enabled: boolean) => {
		clinicalProceduralAudio.setEnabled(enabled);
		setSoundEnabled(enabled);
	};

	const handleVolumeChange = (newVol: number) => {
		clinicalProceduralAudio.setVolume(newVol);
		setVolume(newVol);
	};

	const handleToggleHaptics = (enabled: boolean) => {
		clinicalProceduralAudio.setHapticsEnabled(enabled);
		setHapticsEnabled(enabled);
	};

	const handleTestSignal = (signal: ProceduralSignalType) => {
		switch (signal) {
			case "scanner_beep":
				void clinicalProceduralAudio.playScannerBeep();
				break;
			case "cashier_kaching":
				void clinicalProceduralAudio.playCashierKaching();
				break;
			case "autosave_whisper":
				void clinicalProceduralAudio.playAutosaveWhisper();
				break;
			case "somatic_danger_chord":
				void clinicalProceduralAudio.playSomaticDangerChord();
				break;
		}
	};

	return (
		<div className="p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-5" data-testid="hardware-audio-section">
			<AudioHeaderAndTelemetry />
			<AudioControlsCard
				soundEnabled={soundEnabled}
				volume={volume}
				hapticsEnabled={hapticsEnabled}
				lastSignal={lastSignal}
				activeSignal={activeSignal}
				onToggleSound={handleToggleSound}
				onVolumeChange={handleVolumeChange}
				onToggleHaptics={handleToggleHaptics}
			/>
			<AudioSignalsMatrix activeSignal={activeSignal} onTestSignal={handleTestSignal} />
		</div>
	);
};
