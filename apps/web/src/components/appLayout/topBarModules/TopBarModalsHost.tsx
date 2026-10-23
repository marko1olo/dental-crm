/**
 * TopBarModalsHost — Ленивый хост модальных окон онбординга и смены врача (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { DoctorMobileShiftModal } from "../../doctor-portal/DoctorMobileShiftModal";
import { OnboardingWizardModal } from "../../onboarding/OnboardingWizardModal";
import type { AppTopBarProps } from "../types/topBarTypes";

export function TopBarModalsHost(props: AppTopBarProps) {
	const {
		isDoctorShiftCockpitOpen,
		closeDoctorShiftCockpit,
		activeDoctor,
		dashboard,
		showFullOnboardingGuide,
	} = props;

	return (
		<>
			{isDoctorShiftCockpitOpen && (
				<Suspense fallback={null}>
					<DoctorMobileShiftModal
						isOpen={isDoctorShiftCockpitOpen}
						onClose={closeDoctorShiftCockpit}
						initialDoctorId={activeDoctor?.id || "doc-1"}
						initialDoctorName={activeDoctor?.fullName || "Лечащий врач"}
						initialDoctorSpecialty={activeDoctor?.specialty || "Терапевт-ортопед"}
						initialShiftDateIso={dashboard?.todayIso || "2026-08-29"}
						rawAppointments={dashboard?.appointments}
						patients={dashboard?.patients}
						chairs={dashboard?.clinicSettings?.chairs}
					/>
				</Suspense>
			)}

			{showFullOnboardingGuide && (
				<Suspense fallback={null}>
					<OnboardingWizardModal {...(props as any)} />
				</Suspense>
			)}
		</>
	);
}
