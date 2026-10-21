import React from "react";
import { PatientHeaderContactRow } from "./PatientHeaderContactRow";
import { PatientHeaderDocBadges } from "./PatientHeaderDocBadges";

export interface PatientHeaderIdentityProps {
	readonly resolvedPatient: any;
	readonly fullName: string;
	readonly initials: string;
	readonly birthDateStr: string;
	readonly phone: string;
	readonly diagnosisText: string;
	readonly isActiveVisit: boolean;
	readonly nextAppointment: { id: string; startsAt?: string; status?: string; reason?: string } | null;
	readonly contractStatus?: "issued" | "draft" | "none";
	readonly consentStatus?: "issued" | "draft" | "none";
}

export const PatientHeaderIdentity: React.FC<PatientHeaderIdentityProps> = ({
	resolvedPatient, fullName, initials, birthDateStr, phone, diagnosisText,
	isActiveVisit, nextAppointment, contractStatus, consentStatus,
}) => {
	const cStatus = contractStatus ?? (resolvedPatient?.hasSignedContract || resolvedPatient?.contractStatus === "issued" ? "issued" : resolvedPatient?.contractStatus === "draft" ? "draft" : "none");
	const iStatus = consentStatus ?? (resolvedPatient?.hasSignedConsent || resolvedPatient?.consentStatus === "issued" ? "issued" : resolvedPatient?.consentStatus === "draft" ? "draft" : "none");

	return (
		<div className="flex items-center gap-2.5 min-w-0 flex-1">
			<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--teal-dark,#0d9488)] to-cyan-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-xs ring-1 ring-[var(--teal,#0d9488)]/30" title={fullName}>
				{initials}
			</div>

			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5 flex-wrap min-w-0">
					<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] leading-tight">{fullName}</h2>
					{isActiveVisit && (
						<span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold inline-flex items-center gap-1 shrink-0" title="Пациент в данный момент находится на приёме">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
							В клинике
						</span>
					)}
					<PatientHeaderDocBadges contractStatus={cStatus} consentStatus={iStatus} nextAppointment={nextAppointment} diagnosisText={diagnosisText} />
				</div>

				<PatientHeaderContactRow
					resolvedPatient={resolvedPatient}
					fullName={fullName}
					birthDateStr={birthDateStr}
					phone={phone}
				/>
			</div>
		</div>
	);
};
