import type React from "react";
import { FamilyWalletModal } from "./family/FamilyWalletModal";
import { PatientHeaderAllergiesAlert } from "./headerModules/PatientHeaderAllergiesAlert";
import { PatientHeaderBalanceBadge } from "./headerModules/PatientHeaderBalanceBadge";
import { PatientHeaderIdentity } from "./headerModules/PatientHeaderIdentity";
import { PatientHeaderQuickActions } from "./headerModules/PatientHeaderQuickActions";
import {
	formatPatientBirthAndAge,
	type PatientHeaderCardProps,
} from "./headerModules/patientHeaderTypes";
import { usePatientHeaderCardLogic } from "./headerModules/usePatientHeaderCardLogic";

export type { PatientHeaderCardProps };
export { formatPatientBirthAndAge };

export const PatientHeaderCard: React.FC<PatientHeaderCardProps> = ({
	patientId,
	patient: propPatient,
	onEditPatient,
	onOpenAnamnesis,
	className = "",
}) => {
	const {
		dashboard,
		resolvedPatient,
		isFamilyWalletOpen,
		setIsFamilyWalletOpen,
		allergyText,
		criticalSomaticFlags,
		diagnosisText,
		nextAppointment,
		contractStatus,
		consentStatus,
	} = usePatientHeaderCardLogic(patientId, propPatient);

	if (!resolvedPatient) {
		return null;
	}

	const fullName = resolvedPatient.fullName || "Пациент без имени";
	const initials =
		fullName
			.split(" ")
			.map((part: string) => part[0])
			.filter(Boolean)
			.slice(0, 2)
			.join("")
			.toUpperCase() || "П";

	const balance = Number(
		resolvedPatient.balanceRub ?? resolvedPatient.balance ?? 0,
	);
	const phone = resolvedPatient.phone || "";
	const birthDateStr = formatPatientBirthAndAge(
		resolvedPatient.birthDate || resolvedPatient.birthDateIso,
	);
	const isActiveVisit =
		dashboard?.activeVisit?.patientId === resolvedPatient.id;

	return (
		<div
			className={`patient-header-card p-2 sm:p-2.5 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xs transition-colors flex flex-col gap-1.5 ${className}`}
			data-testid="patient-header-card"
		>
			<div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap min-w-0">
				<PatientHeaderIdentity
					resolvedPatient={resolvedPatient}
					fullName={fullName}
					initials={initials}
					birthDateStr={birthDateStr}
					phone={phone}
					diagnosisText={diagnosisText}
					isActiveVisit={isActiveVisit}
					nextAppointment={nextAppointment}
					contractStatus={contractStatus}
					consentStatus={consentStatus}
				/>

				<div className="flex items-center gap-2 shrink-0">
					<PatientHeaderBalanceBadge
						patientId={resolvedPatient.id}
						patientFullName={fullName}
						balance={balance}
					/>
					<PatientHeaderQuickActions
						resolvedPatient={resolvedPatient}
						fullName={fullName}
						phone={phone}
						clinicLegalName={dashboard?.clinicSettings?.profile?.legalName}
						onOpenAnamnesis={onOpenAnamnesis}
						onEditPatient={onEditPatient}
						onOpenFamilyWallet={() => setIsFamilyWalletOpen(true)}
						isActiveVisit={isActiveVisit}
						nextAppointment={nextAppointment}
					/>
				</div>
			</div>

			<PatientHeaderAllergiesAlert
				allergyText={allergyText}
				criticalSomaticFlags={criticalSomaticFlags}
			/>

			{isFamilyWalletOpen && (
				<FamilyWalletModal
					patientId={resolvedPatient.id}
					patientFullName={fullName}
					onClose={() => setIsFamilyWalletOpen(false)}
				/>
			)}
		</div>
	);
};
