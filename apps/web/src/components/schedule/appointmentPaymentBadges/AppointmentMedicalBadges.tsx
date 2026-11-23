import { AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import React from "react";

export { AppointmentBalanceBadge } from "./AppointmentBalanceBadge";

export function AppointmentAlertBadges({
	isCito,
	collisionMessage,
	hasOpenVisit,
}: {
	isCito: boolean;
	collisionMessage: string | null;
	hasOpenVisit: boolean;
}) {
	return (
		<>
			{isCito && (
				<span
					className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-[var(--danger-soft)] text-[var(--danger)] border border-[var(--danger-line)] ring-2 ring-[var(--danger)]/30 shadow-xs flex items-center gap-1 animate-pulse shrink-0"
					title="Срочный приём (острая боль)"
					data-testid="appointment-cito-badge"
				>
					<Zap
						size={13}
						className="text-[var(--danger)] fill-[var(--danger)]"
					/>
					<span>СРОЧНО</span>
				</span>
			)}
			{collisionMessage ? (
				<span
					className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/50 shadow-xs flex items-center gap-1 animate-pulse shrink-0"
					title={collisionMessage}
					data-testid="appointment-collision-badge"
				>
					{collisionMessage}
				</span>
			) : null}
			{hasOpenVisit ? (
				<span
					className="handoff-lock text-xs break-words"
					title="Открыт прием: пациент закреплен"
				>
					Открыт прием: пациент закреплен
				</span>
			) : null}
		</>
	);
}

export function AppointmentMedicalBadges({
	cardTeeth = [],
	allergyAlert = null,
	somaticAlert = null,
	labReadinessAlert = null,
}: {
	cardTeeth?: string[] | undefined;
	allergyAlert?: string | null | undefined;
	somaticAlert?: string | null | undefined;
	labReadinessAlert?: string | null | undefined;
}) {
	return (
		<>
			{cardTeeth.length > 0 && (
				<span
					className="px-1.5 py-0.5 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--line)] text-[11px] font-bold font-mono shrink-0"
					title={`Зубы: ${cardTeeth.join(", ")}`}
					data-testid="appointment-teeth-badge"
				>
					Зуб {cardTeeth.join(", ")}
				</span>
			)}
			{labReadinessAlert && (
				<span
					className="px-1.5 py-0.5 rounded-lg bg-[var(--success-soft)] text-[var(--success-ink)] border border-[var(--success-line)] text-[10px] font-bold flex items-center gap-1 shrink-0"
					title={labReadinessAlert}
					data-testid="appointment-lab-readiness-badge"
				>
					<CheckCircle2
						size={11}
						className="text-[var(--success)] shrink-0 stroke-[2.5]"
					/>
					<span>{labReadinessAlert}</span>
				</span>
			)}
			{allergyAlert && (
				<span
					className="px-1.5 py-0.5 rounded-lg bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[var(--warning-line)] text-[11px] font-black flex items-center gap-1 shrink-0"
					title={allergyAlert}
					data-testid="appointment-card-allergy-badge"
				>
					<AlertTriangle size={11} className="text-[var(--warning)] shrink-0" />
					<span className="truncate max-w-[160px]">{allergyAlert}</span>
				</span>
			)}
			{somaticAlert && (
				<span
					className="px-1.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-800 dark:text-purple-200 border border-purple-500/30 text-[11px] font-bold shrink-0"
					title={somaticAlert}
					data-testid="appointment-somatic-badge"
				>
					<span className="truncate max-w-[160px]">{somaticAlert}</span>
				</span>
			)}
		</>
	);
}
