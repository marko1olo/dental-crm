/**
 * PatientSectionSelectedCard.tsx — Compact card for an already selected patient with phone & allergies.
 */

import React from "react";
import { AlertTriangle, Phone, User, UserCheck } from "lucide-react";
import type { Patient } from "@dental/shared";
import { initiateOutboundCall } from "../../../telephony/initiateOutboundCall";

interface PatientSectionSelectedCardProps {
	selectedPatient: Patient;
	patientId: string;
	setPatientId: (id: string) => void;
	setPatientSearchQuery: (q: string) => void;
	allDisplayPatients: Patient[];
	allergyList: string[];
}

export function PatientSectionSelectedCard({
	selectedPatient,
	patientId,
	setPatientId,
	setPatientSearchQuery,
	allDisplayPatients,
	allergyList,
}: PatientSectionSelectedCardProps) {
	const initials = selectedPatient.fullName
		? selectedPatient.fullName.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()
		: "";

	return (
		<div className="px-3 py-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-strong)] flex items-center justify-between gap-3 shadow-2xs">
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-9 h-9 rounded-xl bg-[var(--teal)]/15 text-[var(--teal)] border border-[var(--teal)]/30 flex items-center justify-center font-bold text-xs shrink-0">
					{initials || <User size={16} />}
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h4 className="m-0 text-sm sm:text-base font-extrabold text-[var(--ink)] truncate leading-tight">
							{selectedPatient.fullName || "Пациент"}
						</h4>
						<span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider shrink-0 inline-flex items-center gap-1">
							<UserCheck size={11} className="text-emerald-600 dark:text-emerald-400" />
							<span>Прикреплен</span>
						</span>
					</div>
					<div className="flex items-center gap-3 mt-0.5 text-xs text-[var(--muted)]">
						{selectedPatient.phone ? (
							<button
								type="button"
								onClick={() => initiateOutboundCall({
									phone: selectedPatient.phone!,
									patientId: selectedPatient.id,
									patientName: selectedPatient.fullName,
								})}
								className="flex items-center gap-1 font-mono font-medium text-[var(--ink)] hover:text-[var(--teal)] hover:underline cursor-pointer group min-h-[32px]"
								title="Позвонить пациенту (IP-телефония АТС)"
								aria-label={`Позвонить пациенту ${selectedPatient.phone}`}
								data-testid="appointment-patient-phone-call-btn"
							>
								<Phone size={11} className="text-[var(--teal)] shrink-0 transition-transform group-hover:scale-110" />
								<span>{selectedPatient.phone}</span>
							</button>
						) : (
							<span className="text-[var(--muted)]">Телефон не указан</span>
						)}
					</div>

					{allergyList.length > 0 && (
						<div className="flex items-center gap-1.5 flex-wrap mt-1" data-testid="patient-allergies-badges">
							{allergyList.map((allergy, idx) => (
								<span
									key={`${allergy}-${idx}`}
									className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1"
									title="Клиническое предупреждение: аллергический статус"
								>
									<AlertTriangle size={10} className="shrink-0 text-rose-600 dark:text-rose-400" />
									<span>Аллергия: {allergy}</span>
								</span>
							))}
						</div>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={() => { setPatientId(""); setPatientSearchQuery(""); }}
					className="h-8 min-h-[44px] px-3 rounded-lg border border-[var(--line-strong)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
					title="Сменить прикрепленного пациента"
				>
					<User size={13} className="text-[var(--teal)]" />
					<span>Сменить</span>
				</button>
			</div>

			<select
				value={patientId}
				onChange={(e) => setPatientId(e.target.value)}
				className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="select-appointment-patient"
			>
				<option value="">-- Выберите пациента --</option>
				{allDisplayPatients.map((p) => (
					<option key={p.id} value={p.id}>{p.fullName} {p.phone ? `(${p.phone})` : ""}</option>
				))}
			</select>
		</div>
	);
}
