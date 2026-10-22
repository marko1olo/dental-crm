/**
 * Emergency Timers & Clipboard Feedback Hook (Layer 3)
 */

import { useState, useEffect, useRef } from 'react';

export function useEmergencyTimers(isOpen: boolean) {
	const [adrenalineTimerSeconds, setAdrenalineTimerSeconds] = useState<number>(300);
	const [isAdrenalineTimerRunning, setIsAdrenalineTimerRunning] = useState<boolean>(false);
	const [isAdrenalineDue, setIsAdrenalineDue] = useState<boolean>(false);

	const [isCopiedCheatSheet, setIsCopiedCheatSheet] = useState<boolean>(false);
	const [isCopiedAct, setIsCopiedAct] = useState<boolean>(false);
	const [isCopiedRelative, setIsCopiedRelative] = useState<boolean>(false);

	const copyCheatSheetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const copyActTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const copyRelativeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (copyCheatSheetTimeoutRef.current) clearTimeout(copyCheatSheetTimeoutRef.current);
			if (copyActTimeoutRef.current) clearTimeout(copyActTimeoutRef.current);
			if (copyRelativeTimeoutRef.current) clearTimeout(copyRelativeTimeoutRef.current);
		};
	}, []);

	useEffect(() => {
		if (!isOpen) {
			setIsAdrenalineTimerRunning(false);
			return;
		}
		let intervalId: ReturnType<typeof setInterval> | null = null;
		if (isAdrenalineTimerRunning) {
			intervalId = setInterval(() => {
				setAdrenalineTimerSeconds((prev) => {
					if (prev <= 1) {
						setIsAdrenalineTimerRunning(false);
						setIsAdrenalineDue(true);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => {
			if (intervalId) clearInterval(intervalId);
		};
	}, [isOpen, isAdrenalineTimerRunning]);

	const handleStartAdrenalineTimer = (seconds = 300) => {
		setAdrenalineTimerSeconds(seconds);
		setIsAdrenalineTimerRunning(true);
		setIsAdrenalineDue(false);
	};

	const handleResetAdrenalineTimer = () => {
		setIsAdrenalineTimerRunning(false);
		setIsAdrenalineDue(false);
		setAdrenalineTimerSeconds(300);
	};

	return {
		adrenalineTimerSeconds,
		isAdrenalineTimerRunning,
		isAdrenalineDue,
		handleStartAdrenalineTimer,
		handleResetAdrenalineTimer,
		isCopiedCheatSheet,
		setIsCopiedCheatSheet,
		isCopiedAct,
		setIsCopiedAct,
		isCopiedRelative,
		setIsCopiedRelative,
		copyCheatSheetTimeoutRef,
		copyActTimeoutRef,
		copyRelativeTimeoutRef,
	};
}
