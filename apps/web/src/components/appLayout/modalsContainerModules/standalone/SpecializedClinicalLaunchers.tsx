import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../../lib/lazyWithRetry";
import { AppLoadingState } from "../../../../AppBootState";
import { InformedConsentModal } from "../../../consents/InformedConsentModal";
import { EmergencyRescueModal } from "../../../emergency/EmergencyRescueModal";
import { parseCbctStudioRoute } from "../../../../utils/runtimeRouter";
import { isPatientPresentationRoute } from "../../../photography/presentationSyncProtocol";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";

const CbctTunerPlayground = lazyWithRetry(() =>
	import("../../../radiology/tuner/CbctTunerPlayground").then((module) => ({
		default: module.CbctTunerPlayground,
	})),
);

const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("../../../radiology/CbctMprImplantStudioModal").then((module) => ({
		default: module.CbctMprImplantStudioModal,
	})),
);

const CbctStandaloneStudioView = lazyWithRetry(() =>
	import("../../../radiology/CbctStandaloneStudioView").then((module) => ({
		default: module.CbctStandaloneStudioView,
	})),
);

const PatientPresentationStandaloneView = lazyWithRetry(() =>
	import("../../../photography/PatientPresentationStandaloneView").then((module) => ({
		default: module.PatientPresentationStandaloneView,
	})),
);

const CephalometricAnalysisModal = lazyWithRetry(() =>
	import("../../../orthodontics/CephalometricAnalysisModal").then((module) => ({
		default: module.CephalometricAnalysisModal,
	})),
);

const SmartOpgViewerModal = lazyWithRetry(() =>
	import("../../../orthodontics/SmartOpgViewerModal").then((module) => ({
		default: module.SmartOpgViewerModal,
	})),
);

const CtSelectorModal = lazyWithRetry(() =>
	import("../../../radiology/CtSelectorModal").then((module) => ({
		default: module.CtSelectorModal,
	})),
);

import { PeriodontogramChart } from "../../../perio/PeriodontogramChart";

export function renderSpecializedClinicalLaunchers({
	isCbctTunerOpen,
	setIsCbctTunerOpen,
	isCbctDirectModalOpen,
	setIsCbctDirectModalOpen,
	isConsentDirectModalOpen,
	setIsConsentDirectModalOpen,
	isCephDirectModalOpen,
	setIsCephDirectModalOpen,
	isSmartOpgDirectModalOpen,
	setIsSmartOpgDirectModalOpen,
	isCtSelectorDirectModalOpen,
	setIsCtSelectorDirectModalOpen,
	isEmergencyDirectModalOpen,
	setIsEmergencyDirectModalOpen,
}: StandaloneLaunchersProps): React.ReactElement | null {
	// PERIODONTAL CHARTING & FLORIDA PROBE COCKPIT (?perio=1, ?perio=demo, #perio)
	const isPerioDirect =
		typeof window !== "undefined" &&
		(new URLSearchParams(window.location.search).has("perio") ||
			window.location.hash.toLowerCase().includes("perio"));
	if (isPerioDirect) {
		return (
			<div
				className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto"
				data-testid="perio-standalone-workspace"
			>
				<PeriodontogramChart
					patientId="demo_perio_patient"
					patientName="Смирнова Анна Сергеевна (Пародонтограмма)"
					doctorName="Д-р Соколов А. В."
				/>
			</div>
		);
	}

	// 3D CBCT CONTRAST & SLICE TUNER PLAYGROUND (?cbct=tuner)
	if (isCbctTunerOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка интерактивного тюнера КЛКТ..." />}>
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
		);
	}

	// 3D CBCT STANDALONE STUDIO WINDOW (?view=cbct-studio, /cbct-studio)
	const cbctStudioRoute =
		typeof window !== "undefined" ? parseCbctStudioRoute() : { isCbctStudio: false };
	if (cbctStudioRoute.isCbctStudio) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка автономной 3D КЛКТ Студии..." />}>
				<CbctStandaloneStudioView
					studyId={cbctStudioRoute.studyId}
					patientId={cbctStudioRoute.patientId}
					patientName={cbctStudioRoute.patientName}
					initialStudioMode={cbctStudioRoute.mode as any}
					autoLoadDemo={cbctStudioRoute.isDemo}
				/>
			</Suspense>
		);
	}

	// CHAIRSIDE PATIENT PRESENTATION SCREEN (?view=patient-presentation, #presentation)
	if (typeof window !== "undefined" && isPatientPresentationRoute()) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка экрана презентации для пациента..." />}>
				<PatientPresentationStandaloneView
					onClose={() => {
						const url = new URL(window.location.href);
						url.searchParams.delete("view");
						url.searchParams.delete("presentation");
						window.history.replaceState(
							{},
							"",
							url.pathname +
								(url.search ? url.search : "") +
								(url.hash && !url.hash.includes("presentation") ? url.hash : ""),
						);
						window.location.reload();
					}}
				/>
			</Suspense>
		);
	}

	// 3D CBCT STANDALONE LAUNCHER (?cbct=demo, ?cbct=1, #cbct)
	if (isCbctDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка 3D КЛКТ Захарова (312 срезов)..." />}>
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
					patientName="Захаров Иван Дмитриевич (312 срезов КЛКТ)"
					patientId="demo_cbct_patient"
					autoLoadDemo={true}
				/>
			</Suspense>
		);
	}

	// CLINICAL CT SELECTOR & VIEWER LAUNCHER (?ct-selector=1, ?ct=selector, #ct-selector)
	if (isCtSelectorDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка клинического КТ-селектора..." />}>
				<CtSelectorModal
					isOpen={true}
					onClose={() => {
						setIsCtSelectorDirectModalOpen?.(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("ct-selector");
						url.searchParams.delete("ct");
						window.history.replaceState(
							{},
							"",
							url.pathname +
								(url.search ? url.search : "") +
								(url.hash && !url.hash.includes("ct-selector") ? url.hash : ""),
						);
					}}
					patientName="Захаров Иван Дмитриевич"
					patientId="demo_cbct_patient"
					cardNumber="CR-8472"
				/>
			</Suspense>
		);
	}

	// MOBILE CHAIRSIDE INFORMED CONSENT STANDALONE LAUNCHER (?consent=demo, #consent, #ids)
	if (isConsentDirectModalOpen) {
		return (
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
		);
	}

	// ORTHODONTIC CEPHALOMETRIC TRG STANDALONE LAUNCHER (?ceph=demo, ?trg=demo, #ceph, #trg)
	if (isCephDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка цефалометрического анализа ТРГ..." />}>
				<CephalometricAnalysisModal
					isOpen={true}
					onClose={() => {
						setIsCephDirectModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("ceph");
						url.searchParams.delete("trg");
						const cleanHash = url.hash.includes("ceph") || url.hash.includes("trg") ? "" : url.hash;
						window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
					}}
					patientName="Смирнова Екатерина Андреевна (ТРГ боковая)"
					patientId="demo_ceph_patient"
					initialImageUrl="/radiology/sample_trg_cephalogram.jpg"
					initialTab={
						((typeof window !== "undefined"
							? new URLSearchParams(window.location.search).get("tab")
							: null) as ("landmarks" | "metrics" | "report") | null) ?? "metrics"
					}
				/>
			</Suspense>
		);
	}

	// SMART OPG PANORAMIC AI STANDALONE LAUNCHER (?opg=demo, ?opg=1, #opg)
	if (isSmartOpgDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка панорамного анализа ОПТГ AI..." />}>
				<SmartOpgViewerModal
					isOpen={true}
					onClose={() => {
						if (setIsSmartOpgDirectModalOpen) setIsSmartOpgDirectModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("opg");
						const cleanHash = url.hash.includes("opg") ? "" : url.hash;
						window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
					}}
					patientName="Темур (Консультация ОПТГ)"
					patientId="demo_opg_patient"
				/>
			</Suspense>
		);
	}

	// EMERGENCY RESCUE PROTOCOLS & RESUSCITATION HUD (?emergency=1, ?rescue=1, #emergency, #rescue)
	if (isEmergencyDirectModalOpen) {
		return (
			<EmergencyRescueModal
				isOpen={true}
				onClose={() => {
					if (setIsEmergencyDirectModalOpen) setIsEmergencyDirectModalOpen(false);
					const url = new URL(window.location.href);
					url.searchParams.delete("emergency");
					url.searchParams.delete("rescue");
					const cleanHash = url.hash.includes("emergency") || url.hash.includes("rescue") ? "" : url.hash;
					window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
				}}
				initialPatientName="Захаров Иван Дмитриевич"
				initialPatientAgeYears={38}
				doctorFullName="Д-р Воронов Алексей Владимирович"
				medCardNumber="2026-EMERGENCY-01"
			/>
		);
	}

	return null;
}
