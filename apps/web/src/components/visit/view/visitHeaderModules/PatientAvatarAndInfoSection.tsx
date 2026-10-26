import { AlertTriangle, HeartPulse, ShieldCheck } from "lucide-react";
import { PatientAvatar } from "../../../PatientAvatar";
import { SoftPresenceIndicator } from "../../../presence/SoftPresenceIndicator";
import { VisitTimer } from "../../VisitTimer";
import type {
	VisitAppointmentEntity,
	VisitPatientEntity,
} from "../VisitViewProps";
import type { SoftPeerPresence } from "../../../../hooks/useSoftPresence";
import type { VisitCriticalBadge } from "../visitCriticalBadges";
import {
	ALLERGY_BADGE_IDS,
	SOMATIC_BADGE_IDS,
} from "../viewStateModules/visitCriticalChipsBuilder";

export interface PatientAvatarAndInfoSectionProps {
	activePatient: VisitPatientEntity | null | undefined;
	patientAge: string | null;
	activeAppointment?: VisitAppointmentEntity | null | undefined;
	activePeers: readonly SoftPeerPresence[];
	summaryText: string | null;
	activePatientCriticalBadges: readonly VisitCriticalBadge[];
	consolidatedAllergyChip: string | null;
	consolidatedSomaticChip?: string | null;
}

export function PatientAvatarAndInfoSection({
	activePatient,
	patientAge,
	activeAppointment,
	activePeers,
	summaryText,
	activePatientCriticalBadges,
	consolidatedAllergyChip,
	consolidatedSomaticChip,
}: PatientAvatarAndInfoSectionProps) {
	const fullName = activePatient?.fullName || activePatient?.name || "";
	const parts = fullName.trim().split(/\s+/);
	const shortName = parts.length >= 2
		? `${parts[0]} ${parts.slice(1).map((p) => (p[0] ? `${p[0]}.` : "")).join("")}`
		: fullName;

	const allergyBadges = activePatientCriticalBadges.filter((b) => ALLERGY_BADGE_IDS.has(b.id));
	const somaticBadges = activePatientCriticalBadges.filter((b) => SOMATIC_BADGE_IDS.has(b.id));
	const hasAllergy = Boolean(consolidatedAllergyChip || allergyBadges.length > 0);
	const allergyText = consolidatedAllergyChip || (allergyBadges[0] ? `Аллергия: ${allergyBadges[0].shortLabel}` : "Аллергия");
	const somaticText = consolidatedSomaticChip || (somaticBadges[0] ? `Риск: ${somaticBadges[0].shortLabel}` : null);

	return (
		<div className="flex items-center gap-1.5 shrink-0 min-w-0">
			<PatientAvatar
				fullName={activePatient?.fullName}
				size={22}
				className="!w-5 !h-5 sm:!w-[26px] sm:!h-[26px] shrink-0"
			/>
			<span className="font-bold text-xs sm:text-sm text-[var(--ink)] shrink-0 whitespace-nowrap" title={fullName}>
				<span className="sm:hidden font-bold">{shortName}</span>
				<span className="hidden sm:inline truncate max-w-[150px] xl:max-w-[220px]">{fullName}</span>
			</span>
			{patientAge && <span className="text-xs text-[var(--muted)] shrink-0 hidden xs:inline">· {patientAge}</span>}
			<span className="hidden sm:inline-flex shrink-0">
				<VisitTimer createdAt={activeAppointment?.startTime || activeAppointment?.startAt || activeAppointment?.createdAt || null} />
			</span>
			<SoftPresenceIndicator activePeers={activePeers} summaryText={summaryText} className="hidden sm:inline-flex shrink-0" />

			{/* 1. Суверенный бейдж аллергии: ТОЛЬКО реальные аллергены */}
			{hasAllergy ? (
				<span
					className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 font-medium text-xs shadow-xs shrink-0 whitespace-nowrap"
					data-testid="visit-focus-allergy-alert"
					role="alert"
					title={allergyBadges.map((b) => b.title).join(" | ") || "Отягощенный аллергоанамнез"}
				>
					<AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
					<span className="sm:hidden text-[10px] whitespace-nowrap">{allergyText.replace(/^Аллергия:\s*/i, "")}</span>
					<span className="hidden sm:inline whitespace-nowrap truncate max-w-[160px] xl:max-w-[220px]">{allergyText}</span>
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

			{/* 2. Суверенный бейдж соматического риска (АГ, ССЗ, ЭКС, СД, Астма, Беременность) */}
			{somaticText && (
				<span
					className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 font-medium text-xs shadow-xs shrink-0 whitespace-nowrap"
					data-testid="visit-focus-somatic-alert"
					role="alert"
					title={somaticBadges.map((b) => b.title).join(" | ") || "Соматический статус"}
				>
					<HeartPulse size={13} className="text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
					<span className="sm:hidden text-[10px] whitespace-nowrap">{somaticText.replace(/^Риск:\s*/i, "")}</span>
					<span className="hidden sm:inline whitespace-nowrap truncate max-w-[150px] xl:max-w-[200px]">{somaticText}</span>
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
