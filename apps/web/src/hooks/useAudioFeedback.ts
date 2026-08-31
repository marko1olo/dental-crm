/**
 * useAudioFeedback.ts — React-хук для воспроизведения аппаратных звуковых эффектов и тактильной отдачи.
 *
 * Предоставляет 1-клик доступ к звуковому и гаптическому подтверждению действий врача:
 * - Включение/выключение микрофона (playMicStart / playMicStop)
 * - Детекция речи VAD (playSpeechCaptured)
 * - Успешное выполнение команды/сохранение формулы (playActionSuccess)
 * - Предупреждения и клинические аллерго-алерты (playWarningAlert)
 */

import { useCallback, useEffect, useState } from "react";
import {
	SoundFeedbackService,
	type SoundEffectType,
	soundFeedback,
} from "../services/audio/SoundFeedbackService";

export interface UseAudioFeedbackReturn {
	playMicStart: () => Promise<void>;
	playMicStop: () => Promise<void>;
	playSpeechCaptured: () => Promise<void>;
	playActionSuccess: () => Promise<void>;
	playWarningAlert: () => Promise<void>;
	playSound: (type: SoundEffectType) => Promise<void>;
	isEnabled: boolean;
	setEnabled: (enabled: boolean) => void;
	toggleEnabled: () => void;
	volume: number;
	setVolume: (volume: number) => void;
	hapticsEnabled: boolean;
	setHapticsEnabled: (enabled: boolean) => void;
	isSupported: boolean;
}

export function useAudioFeedback(): UseAudioFeedbackReturn {
	const [isEnabled, setIsEnabledState] = useState<boolean>(() =>
		soundFeedback.isEnabled(),
	);
	const [volume, setVolumeState] = useState<number>(() =>
		soundFeedback.getVolume(),
	);
	const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(() =>
		soundFeedback.isHapticsEnabled(),
	);
	const [isSupported, setIsSupported] = useState<boolean>(false);

	useEffect(() => {
		setIsSupported(soundFeedback.isAudioSupported());
	}, []);

	const setEnabled = useCallback((enabled: boolean) => {
		soundFeedback.setEnabled(enabled);
		setIsEnabledState(enabled);
	}, []);

	const toggleEnabled = useCallback(() => {
		const next = !soundFeedback.isEnabled();
		soundFeedback.setEnabled(next);
		setIsEnabledState(next);
	}, []);

	const setVolume = useCallback((val: number) => {
		soundFeedback.setVolume(val);
		setVolumeState(soundFeedback.getVolume());
	}, []);

	const setHapticsEnabled = useCallback((enabled: boolean) => {
		soundFeedback.setHapticsEnabled(enabled);
		setHapticsEnabledState(enabled);
	}, []);

	const playMicStart = useCallback(() => soundFeedback.playMicStart(), []);
	const playMicStop = useCallback(() => soundFeedback.playMicStop(), []);
	const playSpeechCaptured = useCallback(
		() => soundFeedback.playSpeechCaptured(),
		[],
	);
	const playActionSuccess = useCallback(
		() => soundFeedback.playActionSuccess(),
		[],
	);
	const playWarningAlert = useCallback(
		() => soundFeedback.playWarningAlert(),
		[],
	);
	const playSound = useCallback(
		(type: SoundEffectType) => soundFeedback.playSound(type),
		[],
	);

	return {
		playMicStart,
		playMicStop,
		playSpeechCaptured,
		playActionSuccess,
		playWarningAlert,
		playSound,
		isEnabled,
		setEnabled,
		toggleEnabled,
		volume,
		setVolume,
		hapticsEnabled,
		setHapticsEnabled,
		isSupported,
	};
}
