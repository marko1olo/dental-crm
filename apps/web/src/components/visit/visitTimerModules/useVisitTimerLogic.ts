import { useCallback, useEffect, useState } from "react";
import type {
	ChairSessionStatus,
	DoctorChairSession,
} from "../clinicalVisitWorkflow";
import {
	computeChairElapsed,
	computeDoctorElapsed,
} from "./visitTimerClockEngine";

export interface UseVisitTimerLogicParams {
	readonly createdAt?: string | null | undefined;
	readonly chairSession?: DoctorChairSession | null | undefined;
	readonly chairId?: string | undefined;
	readonly isDoctorPresent?: boolean | undefined;
	readonly status?: ChairSessionStatus | undefined;
	readonly anesthesiaStartedAt?: string | null | undefined;
	readonly anesthesiaDurationMinutes?: number | undefined;
	readonly doctorActiveSeconds?: number | undefined;
	readonly onToggleDoctorPresence?: ((isPresent: boolean) => void) | undefined;
}

export function useVisitTimerLogic(params: UseVisitTimerLogicParams) {
	const {
		createdAt,
		chairSession,
		chairId,
		isDoctorPresent: propDoctorPresent,
		status: propStatus,
		anesthesiaStartedAt: _propAnesthesiaStartedAt,
		anesthesiaDurationMinutes: _propAnesthesiaDurationMinutes,
		doctorActiveSeconds: propDoctorActiveSeconds,
		onToggleDoctorPresence,
	} = params;

	const effectiveStartTime = chairSession?.startedAt || createdAt || null;
	const [isDoctorHere, setIsDoctorHere] = useState<boolean>(() => {
		if (propDoctorPresent !== undefined) return propDoctorPresent;
		if (chairSession) return chairSession.isDoctorPresent;
		return true;
	});

	const [internalStatus, setInternalStatus] = useState<ChairSessionStatus>(
		() => {
			if (propStatus) return propStatus;
			if (chairSession) return chairSession.status;
			return "active";
		},
	);

	useEffect(() => {
		if (propDoctorPresent !== undefined) setIsDoctorHere(propDoctorPresent);
		else if (chairSession) setIsDoctorHere(chairSession.isDoctorPresent);
	}, [propDoctorPresent, chairSession]);

	useEffect(() => {
		if (propStatus) setInternalStatus(propStatus);
		else if (chairSession) setInternalStatus(chairSession.status);
	}, [propStatus, chairSession]);

	const doctorWorkSec =
		propDoctorActiveSeconds ?? chairSession?.doctorWorkSeconds ?? 0;
	const [chairElapsed, setChairElapsed] = useState<string>(() =>
		computeChairElapsed(effectiveStartTime),
	);
	const [doctorElapsed, setDoctorElapsed] = useState<string>(() =>
		computeDoctorElapsed(false, doctorWorkSec, 0),
	);
	const [anesthesiaCountdown] = useState<string | null>(null);

	useEffect(() => {
		if (!effectiveStartTime) {
			setChairElapsed("");
			return;
		}
		const sliceStartMs = Date.now();
		const updateClocks = () => {
			if (typeof document !== "undefined" && document.hidden) return;
			setChairElapsed(computeChairElapsed(effectiveStartTime));
			setDoctorElapsed(
				computeDoctorElapsed(isDoctorHere, doctorWorkSec, sliceStartMs),
			);
		};

		updateClocks();
		const interval = setInterval(updateClocks, 1000);
		const onVisChange = () => {
			if (typeof document !== "undefined" && !document.hidden) updateClocks();
		};
		if (typeof document !== "undefined")
			document.addEventListener("visibilitychange", onVisChange);

		return () => {
			clearInterval(interval);
			if (typeof document !== "undefined")
				document.removeEventListener("visibilitychange", onVisChange);
		};
	}, [effectiveStartTime, isDoctorHere, doctorWorkSec]);

	const handleTogglePresence = useCallback(() => {
		const nextState = !isDoctorHere;
		setIsDoctorHere(nextState);
		onToggleDoctorPresence?.(nextState);
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-toggle-doctor-presence", {
					detail: {
						chairId: chairId || chairSession?.chairId,
						isDoctorPresent: nextState,
					},
				}),
			);
		}
	}, [isDoctorHere, onToggleDoctorPresence, chairId, chairSession]);

	return {
		effectiveStartTime,
		chairElapsed,
		doctorElapsed,
		isDoctorHere,
		anesthesiaCountdown,
		internalStatus,
		handleTogglePresence,
	};
}
