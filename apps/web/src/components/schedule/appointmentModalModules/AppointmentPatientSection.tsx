import React from "react";
import { AlertCircle, Clock, User } from "lucide-react";
import { isTechnicalBreakAppointment, type AppointmentPatientSectionProps } from "./appointmentModalTypes";
import { PatientSectionFreeSlotBlock } from "./patientSection/PatientSectionFreeSlotBlock";
import { PatientSectionHeaderActions } from "./patientSection/PatientSectionHeaderActions";
import { PatientSectionSelectedCard } from "./patientSection/PatientSectionSelectedCard";
import { PatientSectionInlineForm } from "./patientSection/PatientSectionInlineForm";
import { PatientSectionSearchDropdown } from "./patientSection/PatientSectionSearchDropdown";

export type { AppointmentPatientSectionProps };

export function AppointmentPatientSection({ appointment, dashboard, state }: AppointmentPatientSectionProps) {
	const {
		patientId, setPatientId, patientSearchQuery, setPatientSearchQuery,
		isInlineNewPatient, setIsInlineNewPatient, newPatientFullName, setNewPatientFullName,
		newPatientPhone, setNewPatientPhone, isCreatingInlinePatient, handleCreateInlinePatient,
		allDisplayPatients, reason, comment, hasOpenVisit, handleConvertToCito,
	} = state;

	const selectedPatient = allDisplayPatients.find((p) => p.id === patientId) ||
		dashboard?.patients?.find((p) => p.id === patientId);

	const isTechnicalBreak = isTechnicalBreakAppointment({ reason, comment });
	const rawAllergies = (selectedPatient as any)?.allergies || (selectedPatient as any)?.medicalAlerts;
	const allergyList: string[] = Array.isArray(rawAllergies) ? rawAllergies
		: typeof rawAllergies === "string" && rawAllergies.trim() ? [rawAllergies.trim()] : [];

	return (
		<>
			<PatientSectionFreeSlotBlock appointment={appointment} dashboard={dashboard} patientName={selectedPatient?.fullName} />

			<div className="sm:col-span-2">
				<div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
					<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
						<User size={13} className="text-[var(--teal)]" />
						<span>Пациент {isTechnicalBreak ? "(не требуется)" : "*"}</span>
					</label>
					<PatientSectionHeaderActions
						patientId={patientId} isInlineNewPatient={isInlineNewPatient}
						setIsInlineNewPatient={setIsInlineNewPatient} handleConvertToCito={handleConvertToCito}
						handleCreateInlinePatient={handleCreateInlinePatient}
					/>
				</div>

				{isTechnicalBreak && !patientId && (
					<div
						className="mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between gap-2 min-h-[44px]"
						data-testid="technical-break-patient-free-banner"
					>
						<div className="flex items-center gap-2">
							<Clock size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
							<span>
								<strong>Служебный перерыв:</strong> Слот забронирован для перерыва врача ({reason || "Перерыв"}). Выбор пациента не требуется.
							</span>
						</div>
					</div>
				)}

				{patientId && selectedPatient && !isInlineNewPatient ? (
					<PatientSectionSelectedCard
						selectedPatient={selectedPatient} patientId={patientId}
						setPatientId={setPatientId} setPatientSearchQuery={setPatientSearchQuery}
						allDisplayPatients={allDisplayPatients} allergyList={allergyList}
					/>
				) : isInlineNewPatient ? (
					<PatientSectionInlineForm
						newPatientFullName={newPatientFullName} setNewPatientFullName={setNewPatientFullName}
						newPatientPhone={newPatientPhone} setNewPatientPhone={setNewPatientPhone}
						isCreatingInlinePatient={isCreatingInlinePatient}
						handleCreateInlinePatient={handleCreateInlinePatient}
						setIsInlineNewPatient={setIsInlineNewPatient}
					/>
				) : (
					<PatientSectionSearchDropdown
						patientId={patientId} setPatientId={setPatientId}
						patientSearchQuery={patientSearchQuery} setPatientSearchQuery={setPatientSearchQuery}
						allDisplayPatients={allDisplayPatients} isTechnicalBreak={isTechnicalBreak}
						setNewPatientFullName={setNewPatientFullName} setNewPatientPhone={setNewPatientPhone}
						setIsInlineNewPatient={setIsInlineNewPatient}
					/>
				)}

				{hasOpenVisit && (
					<div
						className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 mt-2 w-full min-h-[44px]"
						data-testid="appointment-open-visit-warning"
					>
						<AlertCircle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
						<span>По приему есть активный визит. При смене пациента визит будет сохранен в новую карту</span>
					</div>
				)}
			</div>
		</>
	);
}
