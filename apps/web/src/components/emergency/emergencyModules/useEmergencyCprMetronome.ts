/**
 * CPR 30:2 Metronome Hook (Layer 3)
 * Provides 110 bpm audio/visual compression cadence and 30:2 breath cycle tracker.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { cprMetronomeAudio } from '../engine/emergencyCprMetronomeEngine';

export function useEmergencyCprMetronome(isOpen: boolean) {
	const [isMetronomeActive, setIsMetronomeActive] = useState(false);
	const [bpm, setBpm] = useState(110);
	const [compressionCount, setCompressionCount] = useState(0);
	const [isBreathPhase, setIsBreathPhase] = useState(false);
	const [cycleCount, setCycleCount] = useState(0);
	const [isVisualPulse, setIsVisualPulse] = useState(false);

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const stopMetronome = useCallback(() => {
		setIsMetronomeActive(false);
		setCompressionCount(0);
		setIsBreathPhase(false);
		if (intervalRef.current) clearInterval(intervalRef.current);
		intervalRef.current = null;
	}, []);

	useEffect(() => {
		if (!isOpen && isMetronomeActive) {
			stopMetronome();
		}
	}, [isOpen, isMetronomeActive, stopMetronome]);

	useEffect(() => {
		if (!isMetronomeActive) {
			if (intervalRef.current) clearInterval(intervalRef.current);
			intervalRef.current = null;
			return;
		}

		const beatIntervalMs = Math.round(60000 / bpm);

		intervalRef.current = setInterval(() => {
			setIsVisualPulse(true);
			setTimeout(() => setIsVisualPulse(false), 120);

			setCompressionCount((prev) => {
				const next = prev + 1;
				if (next <= 30) {
					cprMetronomeAudio.playClick(false);
					setIsBreathPhase(false);
					return next;
				}
				if (next === 31 || next === 32) {
					cprMetronomeAudio.playClick(true);
					setIsBreathPhase(true);
					return next;
				}
				// Cycle finished -> next cycle
				cprMetronomeAudio.playClick(false);
				setIsBreathPhase(false);
				setCycleCount((c) => c + 1);
				return 1;
			});
		}, beatIntervalMs);

		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [isMetronomeActive, bpm]);

	const toggleMetronome = () => {
		if (isMetronomeActive) {
			stopMetronome();
		} else {
			setCompressionCount(0);
			setIsBreathPhase(false);
			setIsMetronomeActive(true);
		}
	};

	return {
		isMetronomeActive,
		toggleMetronome,
		stopMetronome,
		bpm,
		setBpm,
		compressionCount: Math.min(30, compressionCount),
		isBreathPhase,
		cycleCount,
		isVisualPulse,
	};
}
