import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import { VisiographComparisonModal } from "../../visiograph/VisiographComparisonModal";
import { ImagingExportModal } from "../../imaging/ImagingExportModal";
import { InformedConsentModal } from "../../consents/InformedConsentModal";
import type { ClinicalModalsSubcontainerProps } from "./modalsContainerTypes";

const CbctTunerPlayground = lazyWithRetry(() =>
	import("../../radiology/tuner/CbctTunerPlayground").then((module) => ({
		default: module.CbctTunerPlayground,
	})),
);

const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("../../radiology/CbctMprImplantStudioModal").then((module) => ({
		default: module.CbctMprImplantStudioModal,
	})),
);

const EgiszRemdHubModal = lazyWithRetry(() =>
	import("../../egisz/EgiszRemdHubModal").then((module) => ({
		default: module.EgiszRemdHubModal,
	})),
);

export function ClinicalModalsSubcontainer({
	isGlobalVisiographOpen,
	setIsGlobalVisiographOpen,
	isGlobalImagingExportOpen,
	setIsGlobalImagingExportOpen,
	isCbctTunerOpen,
	setIsCbctTunerOpen,
	isCbctDirectModalOpen,
	setIsCbctDirectModalOpen,
	isConsentDirectModalOpen,
	setIsConsentDirectModalOpen,
	isEgiszRemdModalOpen,
	setIsEgiszRemdModalOpen,
	activeStaffUser,
}: ClinicalModalsSubcontainerProps) {
	return (
		<>
			{isGlobalVisiographOpen && (
				<VisiographComparisonModal
					isOpen={isGlobalVisiographOpen}
					onClose={() => setIsGlobalVisiographOpen(false)}
					patientName="Чухрова Лариса Павловна"
					patientCardNumber="20190621_101042"
					patientAge="58Y"
					activeToothFdi="36"
				/>
			)}
			{isGlobalImagingExportOpen && (
				<ImagingExportModal
					isOpen={isGlobalImagingExportOpen}
					onClose={() => setIsGlobalImagingExportOpen(false)}
					study={{
						id: "study-rvg-36",
						title: "Прицельный снимок визиографа (зуб 36, эндодонтия)",
						capturedAt: new Date().toISOString(),
						date: new Date().toISOString(),
						kind: "rvg",
					} as any}
					patient={{
						fullName: "Чухрова Лариса Павловна",
						medicalCardNumber: "20190621_101042",
					}}
					doctorName={activeStaffUser?.name || "Д-р Барабаш С. В."}
					clinicName="Клиника Инновационной Стоматологии ДЕНТЕ"
				/>
			)}
			{isCbctTunerOpen && (
				<Suspense fallback={null}>
					<CbctTunerPlayground
						isOpen={true}
						onClose={() => {
							setIsCbctTunerOpen(false);
							const url = new URL(window.location.href);
							url.searchParams.delete("cbct");
							window.history.replaceState(
								{},
								"",
								url.pathname +
									(url.search ? url.search : "") +
									(url.hash && !url.hash.includes("cbct") ? url.hash : ""),
							);
						}}
					/>
				</Suspense>
			)}
			{isCbctDirectModalOpen && (
				<Suspense fallback={null}>
					<CbctMprImplantStudioModal
						isOpen={true}
						onClose={() => {
							setIsCbctDirectModalOpen(false);
							const url = new URL(window.location.href);
							url.searchParams.delete("cbct");
							window.history.replaceState(
								{},
								"",
								url.pathname +
									(url.search ? url.search : "") +
									(url.hash && !url.hash.includes("cbct") ? url.hash : ""),
							);
						}}
						patientName="Захаров Иван Дмитриевич (Демо 3D КЛКТ 312 срезов)"
						patientId="demo_cbct_patient"
						autoLoadDemo={true}
					/>
				</Suspense>
			)}
			{isConsentDirectModalOpen && (
				<InformedConsentModal
					isOpen={true}
					onClose={() => {
						setIsConsentDirectModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("consent");
						window.history.replaceState(
							{},
							"",
							url.pathname +
								(url.search ? url.search : "") +
								(url.hash && !url.hash.includes("consent") ? url.hash : ""),
						);
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
							const url = new URL(window.location.href);
							url.searchParams.delete("egisz");
							url.searchParams.delete("remd");
							url.searchParams.delete("semd");
							window.history.replaceState(
								{},
								"",
								url.pathname +
									(url.search ? url.search : "") +
									(url.hash && !url.hash.includes("egisz") && !url.hash.includes("remd") ? url.hash : ""),
							);
						}}
						initialDocType="cda_semd"
						initialTab={
							((typeof window !== "undefined"
								? new URLSearchParams(window.location.search).get("tab")
								: null) as any) ?? "signature"
						}
					/>
				</Suspense>
			)}
		</>
	);
}
