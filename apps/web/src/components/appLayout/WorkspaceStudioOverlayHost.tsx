/**
 * WorkspaceStudioOverlayHost.tsx — Плоский хост наложенных студий (глубина depth = 1).
 *
 * Заменяет 35 постоянно смонтированных <Direct*Launcher /> в AppShell.tsx
 * и StandaloneLaunchers.tsx. Монтируется внутри живого ClinicWorkspaceShell.
 * Гарантирует:
 * - Keyed Remount при смене пациента (Мандат 8bn)
 * - Честный выбор пациента вместо подставных демо-ФИО (Мандат 8wy)
 * - Единую шину clinicEventBus и URL-синхронизацию через routeResolver
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { UserCheck, Users, X } from "lucide-react";
import type { WorkspaceOverlayStudio } from "@dental/shared";
import { lazyWithRetry } from "../../lib/lazyWithRetry.js";
import {
	subscribeLegacyStudioEvents,
	useClinicEvent,
} from "../../lib/clinicEventBus.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";
import {
	clearStudioFromBrowserUrl,
	resolveClinicRoute,
} from "../../router/routeResolver.js";
import { useAppStore } from "../../store/appStore.js";
import { usePatientStore } from "../../store/patientStore.js";
import { useVisitStore } from "../../store/visitStore.js";
import { createOfflineFallbackDashboard, getCachedClinicDashboard } from "../../lib/offlineStorage.js";
import type { DocumentTemplateKey } from "../documents/types.js";
import { normalizeConsentDocId } from "../consents/consentCatalogData.js";
import type { PatientCardTab } from "../patients/patientCardModalModules/patientCardModalTypes.js";
import type { RecordTabType } from "../emr/types/recordDataTypes.js";
import type { ClinicalGuideTab } from "../help/index.js";

const PatientCardModal = lazyWithRetry(() =>
	import("../patients/PatientCardModal.js").then((m) => ({ default: m.PatientCardModal })),
);
const CashRegisterStudioModal = lazyWithRetry(() =>
	import("../cashbox/CashRegisterStudioModal.js").then((m) => ({ default: m.CashRegisterStudioModal })),
);
const QuickBookingDrawer = lazyWithRetry(() =>
	import("../schedule/QuickBookingDrawer.js").then((m) => ({ default: m.QuickBookingDrawer })),
);
const MedicalRecordStudioModal = lazyWithRetry(() =>
	import("../emr/MedicalRecordStudioModal.js").then((m) => ({ default: m.MedicalRecordStudioModal })),
);
const OdontogramModule = lazyWithRetry(() =>
	import("../odontogram/OdontogramModule.js").then((m) => ({ default: m.OdontogramModule })),
);
const PerioStudioModal = lazyWithRetry(() =>
	import("../perio/PerioStudioModal.js").then((m) => ({ default: m.PerioStudioModal })),
);
const EndodonticStudioModal = lazyWithRetry(() =>
	import("../endo/EndodonticStudioModal.js").then((m) => ({ default: m.EndodonticStudioModal })),
);
const ChairsideSurgeryHubModal = lazyWithRetry(() =>
	import("../surgery/ChairsideSurgeryHubModal.js").then((m) => ({ default: m.ChairsideSurgeryHubModal })),
);
const OrthopedicsChairsidePanel = lazyWithRetry(() =>
	import("../orthopedics/OrthopedicsChairsidePanel.js").then((m) => ({ default: m.OrthopedicsChairsidePanel })),
);
const OrthodonticsStudioModal = lazyWithRetry(() =>
	import("../orthodontics/OrthodonticsStudioModal.js").then((m) => ({ default: m.OrthodonticsStudioModal })),
);
const HygieneStudioModal = lazyWithRetry(() =>
	import("../hygiene/HygieneStudioModal.js").then((m) => ({ default: m.HygieneStudioModal })),
);
const PediatricMixedDentitionModal = lazyWithRetry(() =>
	import("../odontogram/PediatricMixedDentitionModal.js").then((m) => ({ default: m.PediatricMixedDentitionModal })),
);
const PediatricBraveryDiplomaModal = lazyWithRetry(() =>
	import("../pediatric/PediatricBraveryDiplomaModal.js").then((m) => ({ default: m.PediatricBraveryDiplomaModal })),
);
const ClinicalPhotoProtocolModal = lazyWithRetry(() =>
	import("../photography/ClinicalPhotoProtocolModal.js").then((m) => ({ default: m.ClinicalPhotoProtocolModal })),
);
const ChairsidePhotoQrBridgeModal = lazyWithRetry(() =>
	import("../photography/ChairsidePhotoQrBridgeModal.js").then((m) => ({ default: m.ChairsidePhotoQrBridgeModal })),
);
const DsdAestheticStudioModal = lazyWithRetry(() =>
	import("../photography/dsd/DsdAestheticStudioModal.js").then((m) => ({ default: m.DsdAestheticStudioModal })),
);
const DirectRvgCaptureModal = lazyWithRetry(() =>
	import("../radiology/DirectRvgCaptureModal.js").then((m) => ({ default: m.DirectRvgCaptureModal })),
);
const CashShiftClosingModal = lazyWithRetry(() =>
	import("../shift/CashShiftClosingModal.js").then((m) => ({ default: m.CashShiftClosingModal })),
);
const CopilotStudioModal = lazyWithRetry(() =>
	import("../copilot/CopilotStudioModal.js").then((m) => ({ default: m.CopilotStudioModal })),
);
const PrescriptionStudioModal = lazyWithRetry(() =>
	import("../prescriptions/PrescriptionStudioModal.js").then((m) => ({ default: m.PrescriptionStudioModal })),
);
const PatientRecallsHubModal = lazyWithRetry(() =>
	import("../recalls/PatientRecallsHubModal.js").then((m) => ({ default: m.PatientRecallsHubModal })),
);
const WarrantyPassportModal = lazyWithRetry(() =>
	import("../warranty/WarrantyPassportModal.js").then((m) => ({ default: m.WarrantyPassportModal })),
);
const DocumentsStudioModal = lazyWithRetry(() =>
	import("../documents/DocumentsStudioModal.js").then((m) => ({ default: m.DocumentsStudioModal })),
);
const UkepDocumentSigningModal = lazyWithRetry(() =>
	import("../documents/ukep/UkepDocumentSigningModal.js").then((m) => ({ default: m.UkepDocumentSigningModal })),
);
const DmsStudioModal = lazyWithRetry(() =>
	import("../insurance/DmsStudioModal.js").then((m) => ({ default: m.DmsStudioModal })),
);
const LoyaltyStudioModal = lazyWithRetry(() =>
	import("../loyalty/LoyaltyStudioModal.js").then((m) => ({ default: m.LoyaltyStudioModal })),
);
const SterilizationBatchCycleModal = lazyWithRetry(() =>
	import("../sanpin/SterilizationBatchCycleModal.js").then((m) => ({ default: m.SterilizationBatchCycleModal })),
);
const TelephonyStudioModal = lazyWithRetry(() =>
	import("../telephony/TelephonyStudioModal.js").then((m) => ({ default: m.TelephonyStudioModal })),
);
const KnowledgeBaseHubModal = lazyWithRetry(() =>
	import("../knowledge/KnowledgeBaseHubModal.js").then((m) => ({ default: m.KnowledgeBaseHubModal })),
);
const WaitlistMatchesBlock = lazyWithRetry(() =>
	import("../schedule/waitlist/WaitlistMatchesBlock.js").then((m) => ({ default: m.WaitlistMatchesBlock })),
);
const TomorrowRemindersModal = lazyWithRetry(() =>
	import("../schedule/TomorrowRemindersModal.js").then((m) => ({ default: m.TomorrowRemindersModal })),
);
const StandaloneClinicalBundlesHost = lazyWithRetry(() =>
	import("./modalsContainerModules/standalone/clinical/StandaloneClinicalBundlesHost.js").then((m) => ({
		default: m.StandaloneClinicalBundlesHost,
	})),
);
const DoctorPayrollStudioModal = lazyWithRetry(() =>
	import("../payroll/DoctorPayrollStudioModal.js").then((m) => ({ default: m.DoctorPayrollStudioModal })),
);
const PublicBookingWidget = lazyWithRetry(() =>
	import("../booking/PublicBookingWidget.js").then((m) => ({ default: m.PublicBookingWidget })),
);
const DemoCaseViewerModal = lazyWithRetry(() =>
	import("../demo/DemoCaseViewerModal").then((m) => ({ default: m.DemoCaseViewerModal })),
);

const PATIENT_BOUND_STUDIOS = new Set<WorkspaceOverlayStudio["kind"]>([
	"emr_record",
	"odontogram_fullscreen",
	"perio",
	"endo",
	"surgery",
	"orthopedics",
	"orthodontics",
	"hygiene",
	"warranty",
	"prescriptions",
	"loyalty",
]);

function readStudioFromLocation(): WorkspaceOverlayStudio | null {
	if (typeof window === "undefined") return null;
	return resolveClinicRoute(window.location.search, window.location.hash).studio;
}

const OverlayLoadingFallback: React.FC = () => (
	<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
		<div className="px-5 py-3 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-sm text-[var(--ink)] shadow-lg">
			Открытие модуля…
		</div>
	</div>
);

interface HonestPatientPickerProps {
	readonly title: string;
	readonly onClose: () => void;
	readonly onSelectPatient: (patientId: string, fullName: string) => void;
}

const HonestStudioPatientPicker: React.FC<HonestPatientPickerProps> = ({
	title,
	onClose,
	onSelectPatient,
}) => {
	const patients = useAppStore((s) => s.dashboard?.patients ?? []);
	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xl overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between">
					<h2 className="text-base font-semibold text-[var(--ink)] m-0">{title}</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Закрыть выбор пациента"
						className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					>
						<X className="w-4 h-4 shrink-0" />
					</button>
				</div>
				<div className="p-6 space-y-4">
					{patients.length === 0 ? (
						<div className="py-6 flex flex-col items-center text-center gap-2.5">
							<Users className="w-10 h-10 text-[var(--ink-muted)]" />
							<p className="text-sm text-[var(--ink-muted)] m-0">
								Выберите пациента в картотеке или расписании для работы с клинической студией.
							</p>
						</div>
					) : (
						<div className="space-y-2 max-h-64 overflow-y-auto">
							{patients.slice(0, 8).map((p) => (
								<button
									key={p.id}
									type="button"
									onClick={() => onSelectPatient(p.id, p.fullName)}
									className="w-full h-11 px-3.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-between text-sm font-medium text-left"
								>
									<span className="truncate">{p.fullName}</span>
									<UserCheck className="w-4 h-4 shrink-0 text-[var(--primary)]" />
								</button>
							))}
						</div>
					)}
				</div>
				<div className="h-16 px-6 border-t border-[var(--line)] bg-[var(--paper-soft)]/50 flex items-center justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						className="h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={() => {
							onClose();
							if (typeof window !== "undefined") {
								window.location.hash = "#patients";
							}
						}}
						className="h-9 px-3.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm"
					>
						Открыть пациентов
					</button>
				</div>
			</div>
		</div>
	);
};

export const WorkspaceStudioOverlayHost: React.FC = () => {
	const [studio, setStudio] = useState<WorkspaceOverlayStudio | null>(readStudioFromLocation);

	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const patientCoreFullName = usePatientStore((s) => s.patientCoreDraft.fullName);
	const dashboard = useAppStore((s) => s.dashboard);
	const appActivePatientId = useAppStore((s) => s.activePatientId);
	const activeDoctorName = useAppStore((s) => s.activeDoctorName);
	const activeToothNumber = useVisitStore((s) => s.activeToothNumber);

	const handleClose = useCallback(() => {
		setStudio(null);
		clearStudioFromBrowserUrl();
	}, []);

	useClinicEvent("studio:open", ({ studio: nextStudio }) => {
		setStudio(nextStudio);
	});

	useClinicEvent("studio:close", () => {
		handleClose();
	});

	useEffect(() => {
		const syncFromUrl = () => {
			setStudio(readStudioFromLocation());
		};
		const unsubscribeLegacy = subscribeLegacyStudioEvents(
			(nextStudio) => setStudio(nextStudio),
			() => setStudio(null),
		);
		window.addEventListener("hashchange", syncFromUrl);
		window.addEventListener("popstate", syncFromUrl);
		return () => {
			unsubscribeLegacy();
			window.removeEventListener("hashchange", syncFromUrl);
			window.removeEventListener("popstate", syncFromUrl);
		};
	}, []);

	const studioPatientIdFromPayload =
		studio && "patientId" in studio ? studio.patientId : undefined;
	const resolvedPatientId =
		studioPatientIdFromPayload ||
		selectedPatientId ||
		appActivePatientId ||
		dashboard?.activeVisit?.patientId ||
		undefined;

	const resolvedPatient = useMemo(() => {
		if (!resolvedPatientId) return undefined;
		return dashboard?.patients?.find((p) => p.id === resolvedPatientId);
	}, [dashboard?.patients, resolvedPatientId]);

	const resolvedPatientName =
		(studio && "patientName" in studio && studio.patientName) ||
		resolvedPatient?.fullName ||
		patientCoreFullName?.trim() ||
		undefined;

	const doctorName = activeDoctorName?.trim() || "Лечащий врач";
	const clinicName = dashboard?.clinicSettings?.profile?.clinicName || "Клиника ДЕНТЕ";
	const organizationId = dashboard?.clinicSettings?.profile?.organizationId || "default";

	if (!studio) return null;

	const requiresPatient =
		PATIENT_BOUND_STUDIOS.has(studio.kind) ||
		(studio.kind === "patient_card" && studio.mode !== "create");

	if (requiresPatient && !resolvedPatientId && !isDemoShowcaseMode()) {
		return (
			<HonestStudioPatientPicker
				title="Выберите пациента"
				onClose={handleClose}
				onSelectPatient={(patientId, fullName) => {
					usePatientStore.getState().setSelectedPatientId(patientId);
					useAppStore.getState().setActivePatientId(patientId);
					setStudio({ ...studio, patientId } as WorkspaceOverlayStudio);
					void fullName;
				}}
			/>
		);
	}

	const remountKey = `${studio.kind}:${resolvedPatientId ?? "none"}`;

	return (
		<Suspense fallback={<OverlayLoadingFallback />}>
			{studio.kind === "patient_card" && (
				<PatientCardModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId ?? null}
					mode={studio.mode ?? "view"}
					initialTab={(studio.initialTab as PatientCardTab | undefined) ?? "general"}
				/>
			)}
			{studio.kind === "cashbox" && (
				<CashRegisterStudioModal
					key={`${remountKey}:${studio.invoiceId ?? "noinv"}`}
					isOpen={true}
					onClose={handleClose}
					mode={studio.mode ?? "studio"}
					initialTab={studio.mode === "shift" ? "drawer" : "checkout"}
					totalDueKopecks={studio.amountKopecks}
					patientId={resolvedPatientId}
					patientName={resolvedPatientName}
					invoiceId={studio.invoiceId}
					doctorFullName={studio.doctorName ?? doctorName}
					serviceTitle={studio.serviceTitle}
					onSuccess={handleClose}
				/>
			)}
			{studio.kind === "quick_booking" && (
				<QuickBookingDrawer
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					initialSlot={{
						startsAt: studio.slotIso ?? new Date().toISOString(),
						durationMinutes: 30,
						...(studio.chairId ? { chairId: studio.chairId } : {}),
						...(studio.doctorId ? { doctorUserId: studio.doctorId } : {}),
						...(resolvedPatientId ? { patientId: resolvedPatientId } : {}),
						...(resolvedPatientName ? { patientName: resolvedPatientName } : {}),
						...(studio.emergency ? { isCitoEmergency: true } : {}),
					}}
				/>
			)}
			{studio.kind === "emr_record" && (
				<MedicalRecordStudioModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId}
					visitId={studio.visitId}
					initialTab={(studio.initialTab as RecordTabType | undefined) ?? "overview"}
				/>
			)}
			{studio.kind === "odontogram_fullscreen" && resolvedPatientId && (
				<div
					key={remountKey}
					className="fixed inset-0 z-[100] bg-[var(--paper)] text-[var(--ink)] flex flex-col overflow-hidden"
					role="dialog"
					aria-modal="true"
					data-testid="odontogram-fullscreen-studio"
				>
					<div className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0">
						<h2 className="text-base font-semibold m-0">
							Зубная формула{resolvedPatientName ? ` · ${resolvedPatientName}` : ""}
						</h2>
						<button
							type="button"
							onClick={handleClose}
							className="h-9 px-3.5 rounded-lg text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center gap-2"
						>
							<X className="w-4 h-4 shrink-0" />
							<span>Закрыть</span>
						</button>
					</div>
					<div className="flex-1 min-h-0 overflow-y-auto p-4">
						<OdontogramModule
							patientId={resolvedPatientId}
							dentitionMode={studio.dentitionMode}
						/>
					</div>
				</div>
			)}
			{studio.kind === "perio" && (
				<PerioStudioModal
					key={remountKey}
					isOpen={true}
					isModal={true}
					onClose={handleClose}
					patientId={resolvedPatientId}
					patientName={resolvedPatientName ?? "Пациент приёма"}
				/>
			)}
			{studio.kind === "endo" && (
				<EndodonticStudioModal
					key={`${remountKey}:${studio.toothFdi ?? activeToothNumber ?? 16}`}
					isOpen={true}
					onClose={handleClose}
					toothNumber={studio.toothFdi ?? activeToothNumber ?? 16}
					patientId={resolvedPatientId}
					patientName={resolvedPatientName}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}
			{studio.kind === "surgery" && (
				<ChairsideSurgeryHubModal
					key={`${remountKey}:${studio.toothFdi ?? activeToothNumber ?? 46}`}
					isOpen={true}
					onClose={handleClose}
					{...(resolvedPatientId ? { patientId: resolvedPatientId } : {})}
					{...(resolvedPatientName ? { patientName: resolvedPatientName } : {})}
					doctorName={doctorName}
					initialTooth={studio.toothFdi ?? activeToothNumber ?? 46}
					initialScenario={studio.scenario ?? "implant"}
					initialTab={studio.initialTab ?? "protocol"}
				/>
			)}
			{studio.kind === "orthopedics" && (
				<div
					key={remountKey}
					className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/55 backdrop-blur-xs"
					role="dialog"
					aria-modal="true"
					onClick={handleClose}
				>
					<div
						className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-[var(--paper)] text-[var(--ink)] rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0">
							<h2 className="text-base font-semibold m-0">Ортопедия и зуботехническая лаборатория</h2>
							<button
								type="button"
								onClick={handleClose}
								aria-label="Закрыть ортопедию"
								className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							>
								<X className="w-4 h-4 shrink-0" />
							</button>
						</div>
						<div className="flex-1 min-h-0 overflow-y-auto p-6">
							<OrthopedicsChairsidePanel
								patientId={resolvedPatientId}
								patientName={resolvedPatientName}
								doctorName={doctorName}
								activeToothFdi={studio.toothFdi ?? activeToothNumber ?? 16}
							/>
						</div>
					</div>
				</div>
			)}
			{studio.kind === "orthodontics" && (
				<OrthodonticsStudioModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId}
					patientName={resolvedPatientName}
					doctorName={doctorName}
				/>
			)}
			{studio.kind === "hygiene" && (
				<HygieneStudioModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId}
					visitId={studio.visitId}
					patientName={resolvedPatientName}
					doctorName={doctorName}
				/>
			)}
			{studio.kind === "pediatric" && studio.mode === "diploma" && (
				<PediatricBraveryDiplomaModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId}
					patientName={resolvedPatientName}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}
			{studio.kind === "pediatric" && studio.mode !== "diploma" && (
				<PediatricMixedDentitionModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId}
					patientName={resolvedPatientName}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}
			{studio.kind === "photo_protocol" && studio.mode === "dsd" && (
				<DsdAestheticStudioModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId}
					patientName={resolvedPatientName}
				/>
			)}
			{studio.kind === "photo_protocol" && studio.mode === "qr" && resolvedPatientId && (
				<ChairsidePhotoQrBridgeModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId}
					patientName={resolvedPatientName}
				/>
			)}
			{studio.kind === "photo_protocol" && studio.mode !== "dsd" && (studio.mode !== "qr" || !resolvedPatientId) && (
				<ClinicalPhotoProtocolModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId}
					patientName={resolvedPatientName}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}
			{studio.kind === "rvg_capture" && (
				<DirectRvgCaptureModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientName={resolvedPatientName ?? "Пациент приёма"}
					patientCardNumber={resolvedPatientId ? `ЭМК №${resolvedPatientId.slice(0, 8)}` : undefined}
					doctorName={doctorName}
					initialToothFdi={
						studio.toothFdi ? String(studio.toothFdi) : activeToothNumber ? String(activeToothNumber) : undefined
					}
				/>
			)}
			{studio.kind === "shift_close" && (
				<CashShiftClosingModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					cashierFullName={doctorName}
				/>
			)}
			{studio.kind === "copilot" && (
				<CopilotStudioModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId ?? null}
					patientName={resolvedPatientName ?? null}
					activeTooth={activeToothNumber ?? null}
					initialTab={studio.initialTab}
				/>
			)}
			{studio.kind === "prescriptions" && (
				<PrescriptionStudioModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patient={
						resolvedPatient
							? {
									id: resolvedPatient.id,
									fullName: resolvedPatient.fullName,
									...(resolvedPatient.birthDate ? { birthDate: resolvedPatient.birthDate } : {}),
							  }
							: null
					}
					patientName={resolvedPatientName}
					doctorName={doctorName}
					clinicName={clinicName}
				/>
			)}
			{studio.kind === "recalls" && (
				<PatientRecallsHubModal key={remountKey} isOpen={true} onClose={handleClose} clinicName={clinicName} />
			)}
			{studio.kind === "warranty" && (
				<WarrantyPassportModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patient={
						resolvedPatient
							? {
									id: resolvedPatient.id,
									fullName: resolvedPatient.fullName,
									phone: resolvedPatient.phone,
									birthDate: resolvedPatient.birthDate ?? undefined,
							  }
							: undefined
					}
				/>
			)}
			{studio.kind === "consents" && (
				<DocumentsStudioModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId}
					patientName={resolvedPatientName}
					initialTemplate={"informed_consent" as DocumentTemplateKey}
					initialDocId={studio.docId ? normalizeConsentDocId(studio.docId) : "therapy"}
				/>
			)}
			{studio.kind === "ukep" && (
				<UkepDocumentSigningModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patientId={resolvedPatientId}
					patientFullName={resolvedPatientName}
					onPrintPaper={() => window.print()}
				/>
			)}
			{studio.kind === "dms" && (
				<DmsStudioModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					patient={
						resolvedPatient
							? { id: resolvedPatient.id, fullName: resolvedPatient.fullName }
							: undefined
					}
				/>
			)}
			{studio.kind === "loyalty" && (
				<LoyaltyStudioModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					clinicName={clinicName}
					patientId={resolvedPatientId}
					patientName={resolvedPatientName}
				/>
			)}
			{studio.kind === "sanpin" && (
				<SterilizationBatchCycleModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					initialTab={studio.initialTab}
				/>
			)}
			{studio.kind === "telephony" && (
				<TelephonyStudioModal key={remountKey} isOpen={true} onClose={handleClose} />
			)}
			{studio.kind === "knowledge_base" && (
				<KnowledgeBaseHubModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					initialTab={(studio.initialTab as ClinicalGuideTab | undefined) ?? "schedule"}
				/>
			)}
			{studio.kind === "waitlist_matches" && (
				<div
					key={remountKey}
					className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
					role="dialog"
					aria-modal="true"
					onClick={handleClose}
				>
					<div
						className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[var(--paper)] text-[var(--ink)] rounded-2xl border border-[var(--line)] shadow-2xl overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="h-14 px-6 border-b border-[var(--line)] flex items-center justify-between shrink-0">
							<h2 className="text-base font-semibold m-0">Лист ожидания и свободные окна</h2>
							<button
								type="button"
								onClick={handleClose}
								aria-label="Закрыть лист ожидания"
								className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							>
								<X className="w-4 h-4 shrink-0" />
							</button>
						</div>
						<div className="flex-1 min-h-0 overflow-y-auto p-6">
							<WaitlistMatchesBlock />
						</div>
					</div>
				</div>
			)}
			{studio.kind === "tomorrow_reminders" && (
				<TomorrowRemindersModal
					key={remountKey}
					dashboard={
						dashboard ||
						getCachedClinicDashboard() ||
						createOfflineFallbackDashboard({ scale: "solo", hasDemoData: false })
					}
					isOpen={true}
					onClose={handleClose}
				/>
			)}
			{studio.kind === "clinical_bundles" && (
				<div className="fixed inset-0 z-[100] bg-[var(--paper)] text-[var(--ink)] overflow-y-auto">
					<StandaloneClinicalBundlesHost onClose={handleClose} />
				</div>
			)}
			{studio.kind === "doctor_payroll" && (
				<DoctorPayrollStudioModal
					key={remountKey}
					isOpen={true}
					onClose={handleClose}
					clinicName={clinicName}
				/>
			)}
			{studio.kind === "public_booking" && (
				<div
					key={remountKey}
					className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
					role="dialog"
					aria-modal="true"
					onClick={handleClose}
				>
					<div
						className="w-full max-w-4xl max-h-[92vh] bg-[var(--paper)] text-[var(--ink)] rounded-2xl border border-[var(--line)] shadow-2xl overflow-y-auto relative"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							type="button"
							onClick={handleClose}
							aria-label="Закрыть онлайн-запись"
							className="h-8 w-8 rounded-lg inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] absolute top-4 right-4 z-10"
						>
							<X className="w-4 h-4 shrink-0" />
						</button>
						<PublicBookingWidget compact={false} />
					</div>
				</div>
			)}
			{studio.kind === "demo_cases" && (
				<DemoCaseViewerModal
					key={remountKey}
					isOpen={true}
					activeRoleKey="surgeon"
					onClose={handleClose}
				/>
			)}
		</Suspense>
	);
};

export default WorkspaceStudioOverlayHost;
