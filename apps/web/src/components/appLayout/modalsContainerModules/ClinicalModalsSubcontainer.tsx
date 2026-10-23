/**
 * ClinicalModalsSubcontainer — Подконтейнер клинических модальных окон (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import { InformedConsentModal } from "../../consents/InformedConsentModal";
import { ClinicalImagingModals } from "./ClinicalImagingModals";
import type { ClinicalModalsSubcontainerProps } from "./modalsContainerTypes";

const EgiszRemdHubModal = lazyWithRetry(() =>
	import("../../egisz/EgiszRemdHubModal").then((m) => ({ default: m.EgiszRemdHubModal })),
);

export function ClinicalModalsSubcontainer(props: ClinicalModalsSubcontainerProps) {
	const {
		isConsentDirectModalOpen,
		setIsConsentDirectModalOpen,
		isEgiszRemdModalOpen,
		setIsEgiszRemdModalOpen,
	} = props;

	return (
		<>
			<ClinicalImagingModals {...props} />

			{isConsentDirectModalOpen && (
				<InformedConsentModal
					isOpen={true}
					onClose={() => {
						setIsConsentDirectModalOpen(false);
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
			)}

			{isEgiszRemdModalOpen && (
				<Suspense fallback={null}>
					<EgiszRemdHubModal
						isOpen={true}
						onClose={() => {
							setIsEgiszRemdModalOpen(false);
							const u = new URL(window.location.href);
							u.searchParams.delete("egisz");
							u.searchParams.delete("remd");
							u.searchParams.delete("semd");
							window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("egisz") && !u.hash.includes("remd") ? u.hash : ""));
						}}
						initialDocType="cda_semd"
						initialTab="signature"
					/>
				</Suspense>
			)}
		</>
	);
}
