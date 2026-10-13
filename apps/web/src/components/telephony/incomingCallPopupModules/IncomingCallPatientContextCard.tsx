import React from "react";
import { IncomingCallerCard } from "../IncomingCallerCard";
import type { IncomingCallPatientContextCardProps } from "./types";

export function IncomingCallPatientContextCard({
	ctrl,
}: IncomingCallPatientContextCardProps): React.JSX.Element | null {
	const {
		currentCall,
		activeLineId,
		secondaryLine,
		callerName,
		formattedPhone,
		initials,
		avatarColors,
		isKnownPatient,
		patientCategory,
		financialSummary,
		somaticAlerts,
		upcomingAppointment,
		lastVisitSummary,
		activeTreatmentPlan,
		callAttribution,
		handleSwitchAndAnswerSecondaryLine,
		handleResumeSecondaryLine,
	} = ctrl;

	if (!currentCall) return null;

	return (
		<>
			{/* Two-Line Concurrency Secondary Call Banner (Anti-Matryoshka) */}
			{secondaryLine?.call && secondaryLine.state === "ringing" && (
				<div
					className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 w-full"
					data-testid="incoming-secondary-line-banner"
				>
					<div className="flex items-center gap-1.5 min-w-0">
						<span className="relative flex h-2 w-2 shrink-0">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
						</span>
						<span className="font-bold shrink-0">Л{secondaryLine.lineId} звонит:</span>
						<span className="truncate">{secondaryLine.call.patientName || secondaryLine.call.phone}</span>
					</div>
					<button
						type="button"
						onClick={() => handleSwitchAndAnswerSecondaryLine("expanded")}
						className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shrink-0 transition-all active:scale-95 cursor-pointer shadow-xs min-h-[32px]"
						data-testid="answer-secondary-line-btn"
						title={`Ответить со 2-й линии с удержанием Линии ${activeLineId}`}
					>
						Ответить (Hold Л{activeLineId})
					</button>
				</div>
			)}

			{secondaryLine?.call && secondaryLine.state === "held" && (
				<div
					className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-lg bg-slate-500/10 border border-slate-500/20 text-xs text-[var(--muted,#64748b)] w-full"
					data-testid="secondary-line-held-banner"
				>
					<div className="flex items-center gap-1.5 min-w-0">
						<span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" />
						<span className="font-bold shrink-0">Л{secondaryLine.lineId} [Hold]:</span>
						<span className="truncate">{secondaryLine.call.patientName || secondaryLine.call.phone}</span>
					</div>
					<button
						type="button"
						onClick={handleResumeSecondaryLine}
						className="px-2 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] hover:bg-[var(--paper-subtle,#e2e8f0)] text-[var(--ink,#0f172a)] text-[11px] font-bold shrink-0 transition-all active:scale-95 cursor-pointer min-h-[32px]"
						data-testid="resume-secondary-line-btn"
						title={`Вернуться к Линии ${secondaryLine.lineId}`}
					>
						Вернуться к Л{secondaryLine.lineId}
					</button>
				</div>
			)}

			{/* Caller Identity and Clinical / Financial Snapshot */}
			<IncomingCallerCard
				callerName={callerName}
				formattedPhone={formattedPhone}
				rawPhone={currentCall.phone}
				initials={initials}
				avatarColors={avatarColors}
				isKnownPatient={isKnownPatient}
				patientCategory={patientCategory}
				financialSummary={financialSummary}
				somaticAlerts={somaticAlerts}
				upcomingAppointment={upcomingAppointment}
				lastVisitSummary={lastVisitSummary}
				activeTreatmentPlan={activeTreatmentPlan}
				callAttribution={callAttribution}
				compact={true}
			/>
		</>
	);
}
