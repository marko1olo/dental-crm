import { Clock, UserCheck, Pause, Syringe } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import {
	formatTimerSeconds,
	type DoctorChairSession,
	type ChairSessionStatus,
} from "./clinicalVisitWorkflow";

export interface VisitTimerProps {
	readonly createdAt?: string | null | undefined;
	readonly chairSession?: DoctorChairSession | null | undefined;
	readonly chairId?: string | undefined;
	readonly chairName?: string | undefined;
	readonly isDoctorPresent?: boolean | undefined;
	readonly status?: ChairSessionStatus | undefined;
	readonly anesthesiaStartedAt?: string | null | undefined;
	readonly anesthesiaDurationMinutes?: number | undefined;
	readonly doctorActiveSeconds?: number | undefined;
	readonly showDualMetrics?: boolean | undefined;
	readonly onToggleDoctorPresence?: ((isPresent: boolean) => void) | undefined;
}

export function VisitTimer({
	createdAt,
	chairSession,
	chairId,
	chairName,
	isDoctorPresent: propDoctorPresent,
	status: propStatus,
	anesthesiaStartedAt: propAnesthesiaStartedAt,
	anesthesiaDurationMinutes: propAnesthesiaDurationMinutes,
	doctorActiveSeconds: propDoctorActiveSeconds,
	showDualMetrics = false,
	onToggleDoctorPresence,
}: VisitTimerProps) {
	// Effective initial start time
	const effectiveStartTime = chairSession?.startedAt || createdAt || null;

	const [isDoctorHere, setIsDoctorHere] = useState<boolean>(() => {
		if (propDoctorPresent !== undefined) return propDoctorPresent;
		if (chairSession) return chairSession.isDoctorPresent;
		return true;
	});

	const [internalStatus, setInternalStatus] = useState<ChairSessionStatus>(() => {
		if (propStatus) return propStatus;
		if (chairSession) return chairSession.status;
		return "active";
	});

	// Sync with props
	useEffect(() => {
		if (propDoctorPresent !== undefined) {
			setIsDoctorHere(propDoctorPresent);
		} else if (chairSession) {
			setIsDoctorHere(chairSession.isDoctorPresent);
		}
	}, [propDoctorPresent, chairSession]);

	useEffect(() => {
		if (propStatus) {
			setInternalStatus(propStatus);
		} else if (chairSession) {
			setInternalStatus(chairSession.status);
		}
	}, [propStatus, chairSession]);

	// Accumulated doctor active seconds before current presence slice
	const [doctorWorkSec, setDoctorWorkSec] = useState<number>(() => {
		if (propDoctorActiveSeconds !== undefined) return propDoctorActiveSeconds;
		if (chairSession) return chairSession.doctorWorkSeconds;
		return 0;
	});

	const [chairElapsed, setChairElapsed] = useState<string>(() => {
		if (!effectiveStartTime || typeof effectiveStartTime !== "string") return "";
		const start = new Date(effectiveStartTime).getTime();
		if (!Number.isFinite(start) || Number.isNaN(start)) return "";
		const diffSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
		return formatTimerSeconds(diffSec);
	});

	const [doctorElapsed, setDoctorElapsed] = useState<string>(() => {
		const base = chairSession?.doctorWorkSeconds ?? propDoctorActiveSeconds ?? 0;
		return formatTimerSeconds(base);
	});

	const [anesthesiaCountdown, setAnesthesiaCountdown] = useState<string | null>(null);

	const effectiveAnesthesiaStartedAt =
		propAnesthesiaStartedAt ?? chairSession?.anesthesiaStartedAt ?? null;
	const effectiveAnesthesiaDurationMin =
		propAnesthesiaDurationMinutes ?? chairSession?.anesthesiaDurationMinutes ?? 8;

	// Timer calculation loop
	useEffect(() => {
		if (!effectiveStartTime || typeof effectiveStartTime !== "string") {
			setChairElapsed("");
			return;
		}
		const start = new Date(effectiveStartTime).getTime();
		if (!Number.isFinite(start) || Number.isNaN(start)) {
			setChairElapsed("");
			return;
		}

		const activeDoctorSliceStart = Date.now();

		const updateClocks = () => {
			if (typeof document !== "undefined" && document.hidden) return;
			const now = Date.now();

			// 1. Total chair elapsed time (always ticks)
			const chairDiffSec = Math.max(0, Math.floor((now - start) / 1000));
			setChairElapsed(formatTimerSeconds(chairDiffSec));

			// 2. Active doctor time (only ticks when doctor is present)
			if (isDoctorHere) {
				const currentSliceSec = Math.max(0, Math.floor((now - activeDoctorSliceStart) / 1000));
				const totalDoctorSec = doctorWorkSec + currentSliceSec;
				setDoctorElapsed(formatTimerSeconds(totalDoctorSec));
			} else {
				// Doctor is absent: freeze doctor timer at accumulated seconds
				setDoctorElapsed(formatTimerSeconds(doctorWorkSec));
			}

			// 3. Anesthesia countdown
			if (effectiveAnesthesiaStartedAt) {
				const anesMs = new Date(effectiveAnesthesiaStartedAt).getTime();
				const targetSec = effectiveAnesthesiaDurationMin * 60;
				const anesElapsedSec = Math.max(0, Math.floor((now - anesMs) / 1000));
				const remSec = targetSec - anesElapsedSec;
				if (remSec > 0) {
					const remMin = Math.ceil(remSec / 60);
					setAnesthesiaCountdown(`${remMin} мин`);
				} else {
					setAnesthesiaCountdown("Готово");
				}
			} else {
				setAnesthesiaCountdown(null);
			}
		};

		updateClocks();
		const interval = setInterval(updateClocks, 1000);

		const handleVisibilityChange = () => {
			if (typeof document !== "undefined" && !document.hidden) {
				updateClocks();
			}
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}

		return () => {
			clearInterval(interval);
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", handleVisibilityChange);
			}
		};
	}, [
		effectiveStartTime,
		isDoctorHere,
		doctorWorkSec,
		effectiveAnesthesiaStartedAt,
		effectiveAnesthesiaDurationMin,
	]);

	// Toggle doctor presence (allows solo doctor to pause direct work time when stepping away)
	const handleTogglePresence = useCallback(() => {
		const nextState = !isDoctorHere;
		setIsDoctorHere(nextState);
		if (onToggleDoctorPresence) {
			onToggleDoctorPresence(nextState);
		}
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

	if (!effectiveStartTime || !chairElapsed) return null;

	const isMultiChairActive = Boolean(
		chairSession || showDualMetrics || propDoctorPresent !== undefined || effectiveAnesthesiaStartedAt,
	);

	return (
		<div
			role="timer"
			className="visit-timer whitespace-nowrap tabular-nums shrink-0"
			data-testid="visit-timer-container"
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: "6px",
				color: "var(--muted)",
				fontSize: "13px",
				fontWeight: 500,
				whiteSpace: "nowrap",
				fontVariantNumeric: "tabular-nums",
				flexShrink: 0,
			}}
			aria-label="Время приёма"
		>
			{/* Базовый таймер или Общее время в кресле */}
			<div
				className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-soft)] shrink-0"
				title="Общее время пациента в кресле"
				data-testid="chair-total-time-badge"
			>
				<Clock size={14} className="shrink-0 text-[var(--muted)]" />
				<span className="whitespace-nowrap tabular-nums font-semibold text-[var(--ink)]">
					{isMultiChairActive ? `В кресле: ${chairElapsed}` : chairElapsed}
				</span>
			</div>

			{/* Раздельный таймер: Время непосредственной работы врача */}
			{isMultiChairActive && (
				<button
					type="button"
					onClick={handleTogglePresence}
					data-testid="btn-toggle-doctor-presence"
					className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all shrink-0 ${
						isDoctorHere
							? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
							: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
					}`}
					title={
						isDoctorHere
							? "Врач у кресла (нажмите, чтобы поставить работу на паузу при переходе)"
							: "Врач отошёл (таймер работы врача на паузе; нажмите для возобновления)"
					}
				>
					{isDoctorHere ? (
						<>
							<UserCheck size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
							<span>Врач: {doctorElapsed}</span>
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
						</>
					) : (
						<>
							<Pause size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
							<span>Врач (пауза): {doctorElapsed}</span>
						</>
					)}
				</button>
			)}

			{/* Индикатор ожидания анестезии */}
			{anesthesiaCountdown && (
				<div
					data-testid="chair-anesthesia-countdown-badge"
					className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold shrink-0 ${
						anesthesiaCountdown === "Готово"
							? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
							: "bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300 animate-pulse"
					}`}
					title="Ожидание наступления действия анестезии"
				>
					<Syringe size={13} className="shrink-0 text-purple-600 dark:text-purple-400" />
					<span>
						{anesthesiaCountdown === "Готово" ? "Анестезия готова" : `Анестезия: ${anesthesiaCountdown}`}
					</span>
				</div>
			)}
		</div>
	);
}
