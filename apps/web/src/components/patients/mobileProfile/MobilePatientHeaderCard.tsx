/**
 * DENTE CRM — Mobile Patient Header Card & HUD
 * (Apple HIG & Anti-Desktop-Squeeze Mandate, 390x844 Screen Ergonomics)
 */

import type { Appointment, Dashboard, Patient } from "@dental/shared";
import React, { useMemo } from "react";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { MobilePatientCommGrid } from "./MobilePatientCommGrid";
import { MobilePatientFamilySection } from "./MobilePatientFamilySection";
import { MobilePatientHeroInfo } from "./MobilePatientHeroInfo";
import { MobilePatientSafetyAlertsSection } from "./MobilePatientSafetyAlertsSection";
import { MobilePatientTopBar } from "./MobilePatientTopBar";
import { formatPatientBirthAndAge } from "./types";
import { useMobilePatientSafetyAlerts } from "./useMobilePatientSafetyAlerts";

export interface MobilePatientHeaderCardProps {
	patient: Patient;
	dashboard?: Dashboard | null | undefined;
	onBack: () => void;
	onSelectPatient: (patientId: string) => void;
	money: (amountRub: number) => string;
	patientCoreDraft?: any;
	updatePatientCoreDraft?: ((field: any, value: any) => void) | undefined;
	savePatientCore?: (() => Promise<any> | void) | undefined;
	patientCoreDirty?: boolean | undefined;
	patientCoreSaveState?: ("idle" | "saving" | "saved" | "error") | undefined;
	onStartVisit: () => void;
	onOpenCardTab?: () => void;
}

export const MobilePatientHeaderCard: React.FC<MobilePatientHeaderCardProps> = ({
	patient,
	dashboard: propDashboard,
	onBack,
	onSelectPatient,
	money,
	updatePatientCoreDraft,
	savePatientCore,
	patientCoreDirty = false,
	patientCoreSaveState = "idle",
	onStartVisit,
	onOpenCardTab,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const dashboard = propDashboard ?? appLogic?.dashboard;

	const fullName = patient.fullName || "Пациент без имени";
	const initials = useMemo(() => {
		return fullName.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "П";
	}, [fullName]);

	const phone = patient.phone || "";
	const cleanPhone = phone.replace(/\D/g, "");
	const birthDateStr = formatPatientBirthAndAge(patient.birthDate);
	const balanceRub = Number(patient.balanceRub ?? 0);

	const isCurrentlyInVisit = dashboard?.activeVisit?.patientId === patient.id;

	const upcomingAppointment = useMemo(() => {
		const now = Date.now();
		const list = (dashboard?.appointments ?? []).filter((a: Appointment) => a?.patientId === patient.id);
		const upcoming = list.filter((a) => a.status !== "cancelled" && a.startsAt && new Date(a.startsAt).getTime() >= now - 3600000);
		return upcoming.sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime())[0] || null;
	}, [dashboard?.appointments, patient.id]);

	const { allergyText, somaticRiskFlags } = useMobilePatientSafetyAlerts(patient);

	return (
		<>
			<MobilePatientTopBar
				onBack={onBack}
				patientCoreDirty={patientCoreDirty}
				patientCoreSaveState={patientCoreSaveState}
				savePatientCore={savePatientCore}
				onStartVisit={onStartVisit}
			/>

			<section className="mobile-patient-hud-card" data-testid="mobile-patient-hud-card">
				<MobilePatientHeroInfo
					patient={patient}
					fullName={fullName}
					initials={initials}
					birthDateStr={birthDateStr}
					isCurrentlyInVisit={isCurrentlyInVisit}
					upcomingAppointment={upcomingAppointment}
				/>

				<MobilePatientCommGrid phone={phone} cleanPhone={cleanPhone} fullName={fullName} />
			</section>

			<MobilePatientSafetyAlertsSection
				allergyText={allergyText}
				somaticRiskFlags={somaticRiskFlags}
				updatePatientCoreDraft={updatePatientCoreDraft}
			/>

			<MobilePatientFamilySection
				patient={patient}
				balanceRub={balanceRub}
				money={money}
				onSelectPatient={onSelectPatient}
				onOpenCardTab={onOpenCardTab}
			/>
		</>
	);
};
