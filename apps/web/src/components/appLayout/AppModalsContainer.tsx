import React, { Suspense } from "react";
import type { AppModalsContainerProps } from "./types";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { InformedConsentModal } from "../consents/InformedConsentModal";
import { DoctorPrivacyShield } from "../auth/DoctorPrivacyShield";
import {
	DENTE_PRIVACY_SHIELD_LOCKED_KEY,
	safeLocalStorageRemoveItem,
} from "../../lib/safeLocalStorage";
import { AppLoadingState } from "../../AppBootState";

const CbctTunerPlayground = lazyWithRetry(() =>
	import("../radiology/tuner/CbctTunerPlayground").then((module) => ({
		default: module.CbctTunerPlayground,
	})),
);

const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("../radiology/CbctMprImplantStudioModal").then((module) => ({
		default: module.CbctMprImplantStudioModal,
	})),
);

const CbctStandaloneStudioView = lazyWithRetry(() =>
	import("../radiology/CbctStandaloneStudioView").then((module) => ({
		default: module.CbctStandaloneStudioView,
	})),
);
import { parseCbctStudioRoute } from "../../utils/runtimeRouter";

const CephalometricAnalysisModal = lazyWithRetry(() =>
	import("../orthodontics/CephalometricAnalysisModal").then((module) => ({
		default: module.CephalometricAnalysisModal,
	})),
);

const EgiszRemdHubModal = lazyWithRetry(() =>
	import("../egisz/EgiszRemdHubModal").then((module) => ({
		default: module.EgiszRemdHubModal,
	})),
);

const SmartSlotRecoveryPopover = lazyWithRetry(() =>
	import("../schedule/SmartSlotRecoveryPopover").then((module) => ({
		default: module.SmartSlotRecoveryPopover,
	})),
);

const SmartOpgViewerModal = lazyWithRetry(() =>
	import("../orthodontics/SmartOpgViewerModal").then((module) => ({
		default: module.SmartOpgViewerModal,
	})),
);

export interface StandaloneLaunchersProps {
	isCbctTunerOpen: boolean;
	setIsCbctTunerOpen: (open: boolean) => void;
	isCbctDirectModalOpen: boolean;
	setIsCbctDirectModalOpen: (open: boolean) => void;
	isConsentDirectModalOpen: boolean;
	setIsConsentDirectModalOpen: (open: boolean) => void;
	isCephDirectModalOpen: boolean;
	setIsCephDirectModalOpen: (open: boolean) => void;
	isEgiszRemdModalOpen: boolean;
	setIsEgiszRemdModalOpen: (open: boolean) => void;
	isSmartSlotRecoveryDemoOpen: boolean;
	setIsSmartSlotRecoveryDemoOpen: (open: boolean) => void;
	isSmartOpgDirectModalOpen?: boolean;
	setIsSmartOpgDirectModalOpen?: (open: boolean) => void;
}

export function renderStandaloneLaunchers({
	isCbctTunerOpen,
	setIsCbctTunerOpen,
	isCbctDirectModalOpen,
	setIsCbctDirectModalOpen,
	isConsentDirectModalOpen,
	setIsConsentDirectModalOpen,
	isCephDirectModalOpen,
	setIsCephDirectModalOpen,
	isEgiszRemdModalOpen,
	setIsEgiszRemdModalOpen,
	isSmartSlotRecoveryDemoOpen,
	setIsSmartSlotRecoveryDemoOpen,
	isSmartOpgDirectModalOpen,
	setIsSmartOpgDirectModalOpen,
}: StandaloneLaunchersProps): React.ReactElement | null {
	// 3D CBCT CONTRAST & SLICE TUNER PLAYGROUND (?cbct=tuner)
	// Must be rendered at the ABSOLUTE TOP before ANY auth, unlock, error, or dashboard guards!
	if (isCbctTunerOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка интерактивного тюнера КЛКТ..." />}>
				<CbctTunerPlayground
					isOpen={true}
					onClose={() => {
						setIsCbctTunerOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("cbct");
						window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("cbct") ? url.hash : ""));
					}}
				/>
			</Suspense>
		);
	}

	// 3D CBCT STANDALONE STUDIO WINDOW (?view=cbct-studio, /cbct-studio)
	// Autonomous dark cockpit on secondary display
	const cbctStudioRoute = typeof window !== "undefined" ? parseCbctStudioRoute() : { isCbctStudio: false };
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

	// 3D CBCT STANDALONE LAUNCHER (?cbct=demo, ?cbct=1, #cbct)
	// Must be rendered at the ABSOLUTE TOP before ANY auth, unlock, error, or dashboard guards!
	if (isCbctDirectModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка 3D КЛКТ Захарова (312 срезов)..." />}>
				<CbctMprImplantStudioModal
					isOpen={true}
					onClose={() => {
						setIsCbctDirectModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("cbct");
						window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("cbct") ? url.hash : ""));
					}}
					patientName="Захаров Иван Дмитриевич (312 срезов КЛКТ)"
					patientId="demo_cbct_patient"
					autoLoadDemo={true}
				/>
			</Suspense>
		);
	}

	// MOBILE CHAIRSIDE INFORMED CONSENT STANDALONE LAUNCHER (?consent=demo, #consent, #ids)
	// Must be rendered at the absolute top for instant chairside finger signing on smartphone/tablet!
	if (isConsentDirectModalOpen) {
		return (
			<InformedConsentModal
				isOpen={true}
				onClose={() => {
					setIsConsentDirectModalOpen(false);
					const url = new URL(window.location.href);
					url.searchParams.delete("consent");
					window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("consent") ? url.hash : ""));
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
	// Must be rendered at the absolute top for instant orthodontic TRG analysis!
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
						window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("ceph") && !url.hash.includes("trg") ? url.hash : ""));
					}}
					patientName="Смирнова Екатерина Андреевна (ТРГ боковая)"
					patientId="demo_ceph_patient"
					initialImageUrl="/radiology/sample_trg_cephalogram.jpg"
					initialTab={((typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null) as ("landmarks" | "metrics" | "report") | null) ?? "metrics"}
				/>
			</Suspense>
		);
	}

	// EGISZ REMD & ORDER 947N CDA R2 XML STANDALONE LAUNCHER (?egisz=demo, ?remd=demo, #egisz, #remd)
	// Must be rendered at the absolute top for instant clinical EGISZ signing and journal access!
	if (isEgiszRemdModalOpen) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка хаба ЕГИСЗ РЭМД..." />}>
				<EgiszRemdHubModal
					isOpen={true}
					onClose={() => {
						setIsEgiszRemdModalOpen(false);
						const url = new URL(window.location.href);
						url.searchParams.delete("egisz");
						url.searchParams.delete("remd");
						url.searchParams.delete("semd");
						window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("egisz") && !url.hash.includes("remd") ? url.hash : ""));
					}}
					initialDocType="cda_semd"
					initialTab={((typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null) as any) ?? "signature"}
				/>
			</Suspense>
		);
	}

	// SMART SLOT RECOVERY STANDALONE LAUNCHER (?smart_slot=demo, ?recovery=demo, #recovery, #smart-slot)
	if (isSmartSlotRecoveryDemoOpen) {
		const demoDate = new Date();
		demoDate.setHours(demoDate.getHours() + 2, 0, 0, 0);
		const demoEndDate = new Date(demoDate);
		demoEndDate.setMinutes(demoEndDate.getMinutes() + 45);

		return (
			<Suspense fallback={<AppLoadingState message="Загрузка умного подбора слота..." />}>
				<div className="w-screen h-screen flex items-center justify-center bg-[var(--paper-soft)] p-4">
					<SmartSlotRecoveryPopover
						isOpen={true}
						onClose={() => {
							setIsSmartSlotRecoveryDemoOpen(false);
							const url = new URL(window.location.href);
							url.searchParams.delete("smart_slot");
							url.searchParams.delete("recovery");
							window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
						}}
						slot={{
							appointmentId: "demo-cancelled-slot-1",
							startsAt: demoDate.toISOString(),
							endsAt: demoEndDate.toISOString(),
							doctorId: "doc-1",
							doctorName: "Д-р Смирнов А.П.",
							chairId: "chair-1",
							chairName: "Кресло №1 (Терапия)",
							freedBecause: "Отмена пациентом за 2 часа (ОРВИ)",
							patientName: "Алексеев Владимир Сергеевич",
						}}
						clinicName="Стоматология DENTE"
					/>
				</div>
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
						window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("opg") ? url.hash : ""));
					}}
					patientName="Темур (Консультация ОПТГ)"
					patientId="demo_opg_patient"
				/>
			</Suspense>
		);
	}

	return null;
}

export function AppModalsContainer({
	isCbctTunerOpen,
	setIsCbctTunerOpen,
	isCbctDirectModalOpen,
	setIsCbctDirectModalOpen,
	isConsentDirectModalOpen,
	setIsConsentDirectModalOpen,
	isCephDirectModalOpen: _isCephDirectModalOpen,
	setIsCephDirectModalOpen: _setIsCephDirectModalOpen,
	isEgiszRemdModalOpen,
	setIsEgiszRemdModalOpen,
	isSmartSlotRecoveryDemoOpen: _isSmartSlotRecoveryDemoOpen,
	setIsSmartSlotRecoveryDemoOpen: _setIsSmartSlotRecoveryDemoOpen,
	isPrivacyShieldActive,
	setIsPrivacyShieldActive,
	activeStaffUser,
	setActiveStaffUser,
	handleClinicLogout,
	handleFullStaffLock,
}: AppModalsContainerProps) {
	return (
		<>
			{isCbctTunerOpen && (
				<Suspense fallback={null}>
					<CbctTunerPlayground
						isOpen={true}
						onClose={() => {
							setIsCbctTunerOpen(false);
							const url = new URL(window.location.href);
							url.searchParams.delete("cbct");
							window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("cbct") ? url.hash : ""));
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
							window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("cbct") ? url.hash : ""));
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
						window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("consent") ? url.hash : ""));
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
							window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + (url.hash && !url.hash.includes("egisz") && !url.hash.includes("remd") ? url.hash : ""));
						}}
						initialDocType="cda_semd"
						initialTab={((typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null) as any) ?? "signature"}
					/>
				</Suspense>
			)}
			<DoctorPrivacyShield
				isOpen={isPrivacyShieldActive}
				doctor={activeStaffUser}
				onUnlock={(unlockedUser) => {
					if (unlockedUser) {
						setActiveStaffUser(unlockedUser);
					}
					setIsPrivacyShieldActive(false);
					safeLocalStorageRemoveItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY);
				}}
				onClinicLogout={handleClinicLogout}
				onFullLock={handleFullStaffLock}
			/>
		</>
	);
}
