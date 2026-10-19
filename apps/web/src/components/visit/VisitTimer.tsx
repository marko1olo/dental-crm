import { Clock } from "lucide-react";
import type {
	ChairSessionStatus,
	DoctorChairSession,
} from "./clinicalVisitWorkflow";
import { useVisitTimerLogic } from "./visitTimerModules/useVisitTimerLogic";
import { VisitDoctorPresenceButton } from "./visitTimerModules/VisitDoctorPresenceButton";

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

export function VisitTimer(props: VisitTimerProps) {
	const {
		effectiveStartTime,
		chairElapsed,
		doctorElapsed,
		isDoctorHere,
		handleTogglePresence,
	} = useVisitTimerLogic(props);

	if (!effectiveStartTime || !chairElapsed) return null;

	const isMultiChairActive = Boolean(
		props.chairSession ||
			props.showDualMetrics ||
			props.isDoctorPresent !== undefined ||
			props.anesthesiaStartedAt,
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
				<VisitDoctorPresenceButton
					isDoctorHere={isDoctorHere}
					doctorElapsed={doctorElapsed}
					onTogglePresence={handleTogglePresence}
				/>
			)}
		</div>
	);
}
