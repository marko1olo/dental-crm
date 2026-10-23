/**
 * SurgeryLaunchers — Хирургические лаунчеры (ИДС, экстренная помощь, фотопротокол) (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { AppLoadingState } from "../../../../../AppBootState";
import { InformedConsentModal } from "../../../../consents/InformedConsentModal";
import { EmergencyRescueModal } from "../../../../emergency/EmergencyRescueModal";
import type { StandaloneLaunchersProps } from "../../modalsContainerTypes";

const ClinicalPhotoProtocolModal = lazyWithRetry(() =>
	import("../../../../photography/ClinicalPhotoProtocolModal").then((m) => ({ default: m.ClinicalPhotoProtocolModal })),
);

export function renderSurgeryLaunchers(props: StandaloneLaunchersProps): React.ReactElement | null {
	const { isConsentDirectModalOpen, setIsConsentDirectModalOpen, isEmergencyDirectModalOpen, setIsEmergencyDirectModalOpen } = props;
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	if (isConsentDirectModalOpen) {
		return (
			<InformedConsentModal
				isOpen={true}
				onClose={() => {
					setIsConsentDirectModalOpen?.(false);
					const u = new URL(window.location.href);
					u.searchParams.delete("consent");
					window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("consent") ? "" : u.hash));
				}}
				initialMode="packages"
				initialPackageKey="PACKAGE_PRIMARY_VISIT"
				initialVerificationMethod="tablet_stylus"
				patient={{
					fullName: "Ковалёв Роман Станиславович",
					birthDate: "12.04.1988",
					passport: "45 10 № 884721",
					phone: "+7 (999) 888-77-66",
					address: "г. Москва, ул. Арбат, д. 24, кв. 12",
				}}
				doctorName="Д-р Воронов Алексей Владимирович"
				doctorSpecialty="Стоматолог-терапевт"
				diagnosisIcd="K02.1 Кариес дентина"
				toothNumbers="3.6"
			/>
		);
	}

	const isEmergency =
		Boolean(isEmergencyDirectModalOpen) ||
		s.includes("emergency") ||
		s.includes("rescue") ||
		h.includes("emergency") ||
		h.includes("rescue");

	if (isEmergency) {
		return (
			<EmergencyRescueModal
				isOpen={true}
				onClose={() => {
					setIsEmergencyDirectModalOpen?.(false);
					const u = new URL(window.location.href);
					u.searchParams.delete("emergency");
					u.searchParams.delete("rescue");
					window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("emergency") ? "" : u.hash));
				}}
				initialPatientName="Захаров Иван Дмитриевич"
				initialPatientAgeYears={38}
				doctorFullName="Д-р Воронов Алексей Владимирович"
				medCardNumber="2026-EMERGENCY-01"
			/>
		);
	}

	const isPhoto =
		!h.includes("ortho") &&
		!s.includes("ortho") &&
		(s.includes("photo-protocol") || s.includes("photo") || h.includes("photo-protocol") || h.includes("photo"));

	if (isPhoto) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка фотопротокола..." />}>
				<ClinicalPhotoProtocolModal
					isOpen={true}
					onClose={() => {
						const u = new URL(window.location.href);
						u.searchParams.delete("photo-protocol");
						u.searchParams.delete("photo");
						window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("photo") ? "" : u.hash));
					}}
					patientName="Ковалев Дмитрий Сергеевич"
					patientCardNumber="К-8492"
					doctorName="Д-р Смирнова Е. В."
				/>
			</Suspense>
		);
	}

	return null;
}
