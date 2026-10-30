import type { Appointment, Dashboard } from "@dental/shared";
import { AlertTriangle } from "lucide-react";
import React from "react";
import { generateAppointmentWhatsAppMessage } from "../../generateAppointmentWhatsAppMessage";
import { ScheduleMobileSheetPatientContact } from "./ScheduleMobileSheetPatientContact";

export interface ScheduleMobileSheetPatientInfoProps {
	selectedMobileAppt: Appointment;
	mPatName: string;
	mPatObj?: Dashboard["patients"][number] | null | undefined;
	mDocObj?: Dashboard["clinicSettings"]["staff"][number] | null | undefined;
	mChairObj?: { id: string; name: string; color?: string | null | undefined } | null | undefined;
	mBalance: number | null;
	mAllergyAlert: string | null;
	mTeeth: string[];
	dashboard: Dashboard;
}

export const ScheduleMobileSheetPatientInfo: React.FC<
	ScheduleMobileSheetPatientInfoProps
> = ({
	selectedMobileAppt,
	mPatName,
	mPatObj,
	mDocObj,
	mChairObj,
	mBalance,
	mAllergyAlert,
	mTeeth,
	dashboard,
}) => {
	const getReminderText = () =>
		generateAppointmentWhatsAppMessage({
			patientName: mPatName,
			doctorName: mDocObj?.fullName,
			doctorSpecialty: mDocObj?.role,
			appointmentStartsAt: selectedMobileAppt.startsAt,
			clinicName: dashboard.clinicSettings?.profile?.clinicName,
			clinicAddress: dashboard.clinicSettings?.profile?.address,
			clinicPhone: dashboard.clinicSettings?.profile?.phone,
			treatmentReason: selectedMobileAppt.reason,
		});

	return (
		<>
			<ScheduleMobileSheetPatientContact
				phone={mPatObj?.phone}
				balance={mBalance}
				getReminderText={getReminderText}
			/>

			{mAllergyAlert && (
				<div className="p-3 rounded-xl bg-amber-500/15 border-2 border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-black flex items-center gap-2">
					<AlertTriangle
						size={16}
						className="text-amber-600 shrink-0 animate-bounce"
					/>
					<span>{mAllergyAlert}</span>
				</div>
			)}

			{mTeeth.length > 0 && (
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5">
					<div className="font-bold text-[var(--muted)]">Список зубов:</div>
					<div className="flex items-center gap-1.5 flex-wrap">
						{mTeeth.map((t) => (
							<span
								key={t}
								className="px-2 py-1 rounded-lg bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/30 text-xs font-black font-mono"
							>
								Зуб {t}
							</span>
						))}
					</div>
				</div>
			)}

			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-1.5 text-xs text-[var(--ink)]">
				<div className="flex items-center justify-between gap-2 min-w-0">
					<span className="text-[var(--muted)] shrink-0">Врач:</span>
					<span
						className="font-bold truncate"
						title={mDocObj?.fullName || "Не назначен"}
					>
						{mDocObj?.fullName || "Не назначен"}
					</span>
				</div>
				<div className="flex items-center justify-between gap-2 min-w-0">
					<span className="text-[var(--muted)] shrink-0">Кабинет:</span>
					<span className="font-mono font-semibold">
						{mChairObj?.name || "Кабинет 1"}
					</span>
				</div>
			</div>
		</>
	);
};
