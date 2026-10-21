import type { Appointment, Dashboard } from "@dental/shared";
import { AlertCircle, Clock } from "lucide-react";
import React from "react";
import { CancelledWaitlistBanner } from "./appointmentModalPatient/CancelledWaitlistBanner";
import { InlineQuickPatientForm } from "./appointmentModalPatient/InlineQuickPatientForm";
import { PatientSearchSelector } from "./appointmentModalPatient/PatientSearchSelector";
import { PatientSectionHeader } from "./appointmentModalPatient/PatientSectionHeader";
import { SelectedPatientCard } from "./appointmentModalPatient/SelectedPatientCard";

export interface AppointmentModalPatientSectionProps {
	appointment: Appointment;
	dashboard: Dashboard;
	patientId: string;
	setPatientId: (id: string) => void;
	patientSearchQuery: string;
	setPatientSearchQuery: (q: string) => void;
	isInlineNewPatient: boolean;
	setIsInlineNewPatient: (val: boolean) => void;
	newPatientFullName: string;
	setNewPatientFullName: (val: string) => void;
	newPatientPhone: string;
	setNewPatientPhone: (val: string) => void;
	isCreatingInlinePatient: boolean;
	handleCreateInlinePatient: (override?: {
		fullName?: string;
		phone?: string | null;
	}) => Promise<{ id: string; fullName: string; phone?: string | null } | null>;
	allDisplayPatients: Array<{
		id: string;
		fullName: string;
		phone?: string | null;
	}>;
	isTechnicalBreak: boolean;
	reason: string;
	hasOpenVisit: boolean;
	activeLabOrders: any[];
	startsAtLocal: string;
	setStartsAtLocal: (val: string) => void;
	setEndsAtLocal: (val: string) => void;
	handleConvertToCito: () => void;
}

export function AppointmentModalPatientSection({
	appointment,
	dashboard,
	patientId,
	setPatientId,
	patientSearchQuery,
	setPatientSearchQuery,
	isInlineNewPatient,
	setIsInlineNewPatient,
	newPatientFullName,
	setNewPatientFullName,
	newPatientPhone,
	setNewPatientPhone,
	isCreatingInlinePatient,
	handleCreateInlinePatient,
	allDisplayPatients,
	isTechnicalBreak,
	reason,
	hasOpenVisit,
	handleConvertToCito,
}: AppointmentModalPatientSectionProps) {
	const selectedPatient =
		allDisplayPatients.find((p) => p.id === patientId) ||
		dashboard?.patients?.find((p) => p.id === patientId);

	return (
		<>
			{(appointment.status === "cancelled" ||
				appointment.status === "no_show") && (
				<CancelledWaitlistBanner
					appointment={appointment}
					dashboard={dashboard}
					selectedPatientName={selectedPatient?.fullName}
				/>
			)}

			<div className="sm:col-span-2">
				<PatientSectionHeader
					isTechnicalBreak={isTechnicalBreak}
					patientId={patientId}
					isInlineNewPatient={isInlineNewPatient}
					setIsInlineNewPatient={setIsInlineNewPatient}
					handleConvertToCito={handleConvertToCito}
					handleCreateInlinePatient={handleCreateInlinePatient}
				/>

				{isTechnicalBreak && !patientId && (
					<div
						className="mb-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center gap-2"
						data-testid="technical-break-patient-free-banner"
					>
						<Clock
							size={15}
							className="text-amber-600 dark:text-amber-400 shrink-0"
						/>
						<span>
							<strong>Служебный перерыв:</strong> Слот забронирован для перерыва
							врача ({reason || "Перерыв"}). Выбор пациента не требуется.
						</span>
					</div>
				)}

				{patientId && selectedPatient && !isInlineNewPatient ? (
					<SelectedPatientCard
						patientId={patientId}
						selectedPatient={selectedPatient}
						allDisplayPatients={allDisplayPatients}
						onClearPatient={() => {
							setPatientId("");
							setPatientSearchQuery("");
						}}
						onSetPatientId={setPatientId}
					/>
				) : isInlineNewPatient ? (
					<InlineQuickPatientForm
						newPatientFullName={newPatientFullName}
						setNewPatientFullName={setNewPatientFullName}
						newPatientPhone={newPatientPhone}
						setNewPatientPhone={setNewPatientPhone}
						isCreatingInlinePatient={isCreatingInlinePatient}
						onCancel={() => setIsInlineNewPatient(false)}
						onSubmit={handleCreateInlinePatient}
					/>
				) : (
					<PatientSearchSelector
						patientId={patientId}
						setPatientId={setPatientId}
						patientSearchQuery={patientSearchQuery}
						setPatientSearchQuery={setPatientSearchQuery}
						allDisplayPatients={allDisplayPatients}
						isTechnicalBreak={isTechnicalBreak}
						onOpenQuickCreate={(q) => {
							const isPhone = /^[0-9+()-\s]+$/.test(q);
							if (isPhone) {
								setNewPatientPhone(q);
								setNewPatientFullName("");
							} else {
								setNewPatientFullName(q);
								setNewPatientPhone("");
							}
							setIsInlineNewPatient(true);
						}}
					/>
				)}

				{hasOpenVisit && (
					<div
						className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 mt-2 w-full"
						data-testid="appointment-open-visit-warning"
					>
						<AlertCircle
							size={14}
							className="shrink-0 text-amber-600 dark:text-amber-400"
						/>
						<span>
							По приему есть активный визит. При смене пациента визит будет
							сохранен в новую карту.
						</span>
					</div>
				)}
			</div>
		</>
	);
}
