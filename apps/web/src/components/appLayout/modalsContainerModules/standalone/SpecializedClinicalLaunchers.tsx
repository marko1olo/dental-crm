import React, { Suspense, useState } from "react";
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

const ClinicalPhotoProtocolModal = lazyWithRetry(() =>
	import("../../../photography/ClinicalPhotoProtocolModal").then((module) => ({
		default: module.ClinicalPhotoProtocolModal,
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

const FastCheckoutModal = lazyWithRetry(() =>
	import("../../../finance/FastCheckoutModal").then((module) => ({
		default: module.FastCheckoutModal,
	})),
);

import { PeriodontogramChart } from "../../../perio/PeriodontogramChart";
import { PerioChartModal } from "../../../perio/PerioChartModal";
import { EmkPerioSection } from "../../../visit/emk/EmkPerioSection";
import { HygieneIndicesPanel } from "../../../hygiene/HygieneIndicesPanel";
import { PatientRecallsHubModal } from "../../../recalls/PatientRecallsHubModal";
import { AnesthesiaStandaloneWorkspace } from "../../../anesthesia/AnesthesiaStandaloneWorkspace";

function PerioStandaloneWorkspaceContent() {
	const [diaryForm, setDiaryForm] = React.useState<Record<string, string>>({
		objectiveStatus: "",
		diagnosis: "",
		treatmentPlan: "",
	});

	return (
		<div className="w-full max-w-7xl mx-auto space-y-4">
			<EmkPerioSection
				visitNoteForm={diaryForm as any}
				updateVisitNoteField={(field, value) =>
					setDiaryForm((prev) => ({ ...prev, [field]: value }))
				}
				patientId="demo_perio_patient"
				patientName="Смирнова Анна Сергеевна (Пародонтограмма)"
				activeTooth={16}
			/>
			<PeriodontogramChart
				patientId="demo_perio_patient"
				patientName="Смирнова Анна Сергеевна (Пародонтограмма)"
				doctorName="Д-р Соколов А. В."
			/>
		</div>
	);
}

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
	// CHAIRSIDE ANESTHESIA COCKPIT & MRD CALIPER (?anesthesia=1, ?anesthesia=demo, #anesthesia)
	const isAnesthesiaDirect =
		typeof window !== "undefined" &&
		(new URLSearchParams(window.location.search).has("anesthesia") ||
			window.location.hash.toLowerCase().includes("anesthesia"));
	if (isAnesthesiaDirect) {
		return <AnesthesiaStandaloneWorkspace />;
	}

	// HYGIENE & INDICES COCKPIT (?hygiene=1, ?hygiene=demo, #hygiene)
	const isHygieneDirect =
		typeof window !== "undefined" &&
		(new URLSearchParams(window.location.search).has("hygiene") ||
			window.location.hash.toLowerCase().includes("hygiene"));
	if (isHygieneDirect) {
		return (
			<div
				className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto"
				data-testid="hygiene-standalone-workspace"
			>
				<HygieneIndicesPanel
					patientName="Смирнова Анна Сергеевна"
					doctorName="Д-р Воронов А. В."
				/>
			</div>
		);
	}

	// PERIODONTAL CHARTING & FLORIDA PROBE COCKPIT (?perio=1, ?perio=demo, #perio)
	const isPerioDirect =
		typeof window !== "undefined" &&
		(new URLSearchParams(window.location.search).has("perio") ||
			window.location.hash.toLowerCase().includes("perio"));
	if (isPerioDirect) {
		const isModalMode =
			typeof window !== "undefined" &&
			new URLSearchParams(window.location.search).get("perio") === "modal";

		if (isModalMode) {
			return (
				<PerioChartModal
					isOpen={true}
					onClose={() => {
						const url = new URL(window.location.href);
						url.searchParams.delete("perio");
						const cleanHash = url.hash.includes("perio") ? "" : url.hash;
						window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
					}}
					patientId="demo_perio_patient"
					patientName="Смирнова Анна Сергеевна (Пародонтограмма)"
					doctorName="Д-р Соколов А. В."
				/>
			);
		}

		return (
			<div
				className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto"
				data-testid="perio-standalone-workspace"
			>
				<PerioStandaloneWorkspaceContent />
			</div>
		);
	}

	// PATIENT RECALLS & RETENTION KANBAN (?recalls=1, ?recalls=demo, #recalls)
	const isRecallsDirect =
		typeof window !== "undefined" &&
		(new URLSearchParams(window.location.search).has("recalls") ||
			window.location.hash.toLowerCase().includes("recalls"));
	if (isRecallsDirect) {
		return (
			<div
				className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto"
				data-testid="recalls-standalone-workspace"
			>
				<PatientRecallsHubModal
					isOpen={true}
					onClose={() => {}}
					initialCandidates={[
						{ id: "rec-1", patientId: "pat-1", fullName: "Иванов Иван Иванович", phone: "+7 (916) 123-45-67", cycleType: "standard_prophylaxis", attendingDoctorId: "doc-1", attendingDoctorName: "Д-р Воронов А. В.", lastVisitDate: "2026-04-10", dueDate: "2026-10-10", daysOverdue: 4, urgencyStatus: "due_now", status: "due_now" },
						{ id: "rec-2", patientId: "pat-2", fullName: "Смирнова Анна Сергеевна", phone: "+7 (925) 987-65-43", cycleType: "implant_monitoring", attendingDoctorId: "doc-2", attendingDoctorName: "Д-р Соколов А. В.", lastVisitDate: "2025-10-14", dueDate: "2026-10-14", daysOverdue: 0, urgencyStatus: "due_now", status: "invited" },
						{ id: "rec-3", patientId: "pat-3", fullName: "Кузнецов Дмитрий Павлович", phone: "+7 (903) 555-44-33", cycleType: "orthodontic_retention", attendingDoctorId: "doc-1", attendingDoctorName: "Д-р Воронов А. В.", lastVisitDate: "2026-07-01", dueDate: "2026-09-01", daysOverdue: 43, urgencyStatus: "overdue_30", status: "due_now" },
						{ id: "rec-4", patientId: "pat-4", fullName: "Федорова Елена Николаевна", phone: "+7 (985) 111-22-33", cycleType: "periodontal_maintenance", attendingDoctorId: "doc-2", attendingDoctorName: "Д-р Соколов А. В.", lastVisitDate: "2026-06-15", dueDate: "2026-09-15", daysOverdue: 29, urgencyStatus: "due_now", status: "scheduled" },
					]}
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
	const isEmergencyDirect =
		Boolean(isEmergencyDirectModalOpen) ||
		(typeof window !== "undefined" &&
			(new URLSearchParams(window.location.search).has("emergency") ||
				new URLSearchParams(window.location.search).has("rescue") ||
				window.location.hash.toLowerCase().includes("emergency") ||
				window.location.hash.toLowerCase().includes("rescue")));

	if (isEmergencyDirect) {
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

	// CLINICAL PHOTO PROTOCOL & BEFORE/AFTER STANDALONE LAUNCHER (?photo-protocol=demo, #photo-protocol, #photo)
	const isPhotoProtocolDirect =
		typeof window !== "undefined" &&
		(new URLSearchParams(window.location.search).has("photo-protocol") ||
			new URLSearchParams(window.location.search).has("photo") ||
			window.location.hash.toLowerCase().includes("photo-protocol") ||
			window.location.hash.toLowerCase().includes("photo"));

	if (isPhotoProtocolDirect) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка фотопротокола..." />}>
				<ClinicalPhotoProtocolModal
					isOpen={true}
					onClose={() => {
						const url = new URL(window.location.href);
						url.searchParams.delete("photo-protocol");
						url.searchParams.delete("photo");
						const cleanHash = url.hash.includes("photo") ? "" : url.hash;
						window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
					}}
					patientName="Ковалев Дмитрий Сергеевич"
					patientCardNumber="К-8492"
					doctorName="Д-р Смирнова Е. В."
				/>
			</Suspense>
		);
	}

	// FAST CHECKOUT & 54-FZ FISCAL CASHIER STANDALONE LAUNCHER (?fast_checkout=1, ?checkout=1, #checkout)
	const isFastCheckoutDirect =
		typeof window !== "undefined" &&
		(new URLSearchParams(window.location.search).has("fast_checkout") ||
			new URLSearchParams(window.location.search).has("checkout") ||
			window.location.hash.toLowerCase().includes("fast_checkout") ||
			window.location.hash.toLowerCase().includes("checkout"));

	if (isFastCheckoutDirect) {
		return (
			<Suspense fallback={<AppLoadingState message="Загрузка кассы 54-ФЗ..." />}>
				<FastCheckoutModal
					isOpen={true}
					onClose={() => {
						const url = new URL(window.location.href);
						url.searchParams.delete("fast_checkout");
						url.searchParams.delete("checkout");
						const cleanHash = url.hash.includes("checkout") ? "" : url.hash;
						window.history.replaceState({}, "", url.pathname + (url.search || "") + cleanHash);
					}}
					totalBillRub={14500}
					patientName="Иванова Мария Сергеевна"
					patientPhone="+7 (999) 123-45-67"
					patientDepositRub={5000}
					patientFamilyBalanceRub={12000}
					familyPayerName="Иванов Сергей Петрович"
					orderId="ORD-2026-88"
					cashierFullName="Кассир-администратор Смирнова А.В."
					initialPaymentMethod="sbp_qr"
					initialSimpleCashierMode={false}
				/>
			</Suspense>
		);
	}

	return null;
}

