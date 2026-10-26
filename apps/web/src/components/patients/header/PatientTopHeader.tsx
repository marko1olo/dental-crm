import React, { useMemo } from "react";
import { PatientTopHeaderIdentity } from "./PatientTopHeaderIdentity";
import { PatientTopHeaderActions } from "./PatientTopHeaderActions";
import { formatPatientBirthAndAge } from "../headerModules/patientHeaderTypes";

export interface PatientTopHeaderProps {
	readonly selectedPatient: any;
	readonly patientBalance: number;
	readonly patientCoreDraft: any;
	readonly patientCoreSaveState: string;
	readonly patientCoreDirty: boolean;
	readonly onSavePatientCore: () => void;
	readonly onOpenVisit: () => void;
	readonly onBookAppointment: () => void;
	readonly onOpenPatientCardModal: () => void;
	readonly onOpenLoyaltyModal: () => void;
	readonly onExecuteSomaticNorm: () => void;
	readonly savePillNode?: React.ReactNode;
}

export function PatientTopHeader({
	selectedPatient,
	patientBalance,
	patientCoreDraft,
	patientCoreSaveState,
	patientCoreDirty,
	onSavePatientCore,
	onOpenVisit,
	onBookAppointment,
	onOpenPatientCardModal,
	onOpenLoyaltyModal,
	onExecuteSomaticNorm,
	savePillNode,
}: PatientTopHeaderProps) {
	if (!selectedPatient) return null;

	const fullName = patientCoreDraft?.fullName || selectedPatient.fullName || "Пациент без имени";
	const initials =
		fullName
			.split(" ")
			.map((p: string) => p[0])
			.filter(Boolean)
			.slice(0, 2)
			.join("")
			.toUpperCase() || "П";

	const birthDateStr = formatPatientBirthAndAge(
		patientCoreDraft?.birthDate || selectedPatient.birthDate || selectedPatient.birthDateIso,
	);
	const phone = patientCoreDraft?.phone || selectedPatient.phone || "";
	const cardNumber = selectedPatient.cardNumber
		? `Карта № ${selectedPatient.cardNumber}`
		: selectedPatient.medicalCardNumber
			? `Карта № ${selectedPatient.medicalCardNumber}`
			: selectedPatient.id && !selectedPatient.id.includes("-")
				? `Карта № ${selectedPatient.id}`
				: "Карта № К-101";

	const allergyText = useMemo(() => {
		const raw = selectedPatient.allergies || selectedPatient.anamnesis?.allergies || "";
		return typeof raw === "string" && raw.trim() && !raw.toLowerCase().includes("нет") ? raw.trim() : null;
	}, [selectedPatient]);

	return (
		<div
			className="patient-top-header p-4 rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xs flex flex-col gap-3 w-full min-w-0"
			data-testid="patient-top-header"
		>
			<PatientTopHeaderIdentity
				fullName={fullName}
				initials={initials}
				birthDateStr={birthDateStr}
				phone={phone}
				cardNumber={cardNumber}
				allergyText={allergyText}
			/>

			<div className="flex items-center justify-between gap-2.5 flex-wrap pt-2.5 border-t border-[var(--line)]">
				<div
					className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold shrink-0 shadow-2xs ${
						patientBalance < 0
							? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
							: patientBalance > 0
								? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
								: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)]"
					}`}
					title={`Баланс пациента: ${patientBalance.toLocaleString("ru-RU")} ₽`}
					data-testid="patient-workspace-balance-badge"
				>
					Баланс: {patientBalance > 0 ? "+" : ""}{patientBalance.toLocaleString("ru-RU")} ₽
				</div>

				<PatientTopHeaderActions
					phone={phone}
					fullName={fullName}
					onBookAppointment={onBookAppointment}
					onOpenVisit={onOpenVisit}
					onSavePatientCore={onSavePatientCore}
					onOpenPatientCardModal={onOpenPatientCardModal}
					onOpenLoyaltyModal={onOpenLoyaltyModal}
					onExecuteSomaticNorm={onExecuteSomaticNorm}
					isDirty={patientCoreDirty}
					saveState={patientCoreSaveState}
					selectedPatient={selectedPatient}
					savePillNode={savePillNode}
				/>
			</div>
		</div>
	);
}
