import { AlertOctagon, ShieldCheck } from "lucide-react";
import { PatientAvatar } from "../../../PatientAvatar";
import { SoftPresenceIndicator } from "../../../presence/SoftPresenceIndicator";
import { VisitTimer } from "../../VisitTimer";
import type {
	VisitAppointmentEntity,
	VisitPatientEntity,
} from "../VisitViewProps";
import type { SoftPeerPresence } from "../../../../hooks/useSoftPresence";
import type { VisitCriticalBadge } from "../visitCriticalBadges";

export interface PatientAvatarAndInfoSectionProps {
	activePatient: VisitPatientEntity | null | undefined;
	patientAge: string | null;
	activeAppointment?: VisitAppointmentEntity | null | undefined;
	activePeers: readonly SoftPeerPresence[];
	summaryText: string | null;
	activePatientCriticalBadges: readonly VisitCriticalBadge[];
	consolidatedAllergyChip: string | null;
}

export function PatientAvatarAndInfoSection({
	activePatient,
	patientAge,
	activeAppointment,
	activePeers,
	summaryText,
	activePatientCriticalBadges,
	consolidatedAllergyChip,
}: PatientAvatarAndInfoSectionProps) {
	const fullName = activePatient?.fullName || activePatient?.name || "";
	const parts = fullName.trim().split(/\s+/);
	const shortName = parts.length >= 2
		? `${parts[0]} ${parts.slice(1).map((p) => (p[0] ? `${p[0]}.` : "")).join("")}`
		: fullName;

	return (
		<div className="flex items-center gap-1.5 shrink-0 min-w-0">
			<PatientAvatar
				fullName={activePatient?.fullName}
				size={22}
				className="!w-5 !h-5 sm:!w-[26px] sm:!h-[26px] shrink-0"
			/>
			<span
				className="font-bold text-xs sm:text-sm text-[var(--ink)] shrink-0 flex-shrink-0 whitespace-nowrap"
				title={fullName}
			>
				<span className="sm:hidden font-bold">{shortName}</span>
				<span className="hidden sm:inline truncate max-w-[160px] xl:max-w-[240px]">{fullName}</span>
			</span>
			{patientAge && (
				<span className="text-xs text-[var(--muted)] shrink-0 hidden xs:inline">
					· {patientAge}
				</span>
			)}
			<span className="hidden sm:inline-flex shrink-0">
				<VisitTimer
					createdAt={
						activeAppointment?.startTime ||
						activeAppointment?.startAt ||
						activeAppointment?.createdAt ||
						null
					}
				/>
			</span>
			<SoftPresenceIndicator
				activePeers={activePeers}
				summaryText={summaryText}
				className="hidden sm:inline-flex shrink-0"
			/>
			{activePatientCriticalBadges.length > 0 ? (
				<span
					className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-600/15 border border-rose-600 text-rose-950 dark:text-rose-100 font-bold text-xs shadow-xs shrink-0 whitespace-nowrap animate-pulse"
					data-testid="visit-focus-allergy-alert"
					role="alert"
					title={activePatientCriticalBadges.map((b) => b.title).join(" | ")}
				>
					<AlertOctagon size={13} className="text-rose-600 dark:text-rose-400 shrink-0" />
					<span className="sm:hidden text-[10px] whitespace-nowrap">
						{consolidatedAllergyChip || activePatientCriticalBadges[0]?.shortLabel}
					</span>
					<span className="hidden sm:inline whitespace-nowrap truncate max-w-[200px] xl:max-w-[320px]">
						{consolidatedAllergyChip || activePatientCriticalBadges[0]?.fullLabel}
					</span>
				</span>
			) : (
				<span
					className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-medium text-xs shadow-xs shrink-0 whitespace-nowrap"
					data-testid="visit-focus-allergy-clean"
					title="Отягощенный аллергоанамнез не выявлен"
				>
					<ShieldCheck size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span className="text-[11px] whitespace-nowrap">
						<span className="sr-only">Аллергии не выявлены</span>
						<span>Аллергий нет</span>
					</span>
				</span>
			)}
			<span className="sr-only" aria-hidden="true">
				{activePatientCriticalBadges.map((badge) => (
					<span key={badge.id} data-testid={badge.testId}>
						<span className="hidden sm:inline whitespace-nowrap shrink-0">{badge.fullLabel}</span>
					</span>
				))}
			</span>
		</div>
	);
}
