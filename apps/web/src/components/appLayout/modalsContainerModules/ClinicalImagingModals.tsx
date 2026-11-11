/**
 * ClinicalImagingModals — Модалки визиографа, экспорта снимков и КЛКТ (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import { VisiographComparisonModal } from "../../radiology/VisiographComparisonModal";
import { ImagingExportModal } from "../../imaging/ImagingExportModal";
import { usePatientStore } from "../../../store/patientStore";
import { useVisitStore } from "../../../store/visitStore";
import { useDocumentBrandingStore } from "../../../store/documentBrandingStore";

const CbctTunerPlayground = lazyWithRetry(() =>
	import("../../radiology/tuner/CbctTunerPlayground").then((m) => ({ default: m.CbctTunerPlayground })),
);
const CbctMprImplantStudioModal = lazyWithRetry(() =>
	import("../../radiology/CbctMprImplantStudioModal").then((m) => ({ default: m.CbctMprImplantStudioModal })),
);

export interface ClinicalImagingModalsProps {
	isGlobalVisiographOpen: boolean;
	setIsGlobalVisiographOpen: (open: boolean) => void;
	isGlobalImagingExportOpen: boolean;
	setIsGlobalImagingExportOpen: (open: boolean) => void;
	isCbctTunerOpen: boolean;
	setIsCbctTunerOpen: (open: boolean) => void;
	isCbctDirectModalOpen: boolean;
	setIsCbctDirectModalOpen: (open: boolean) => void;
	activeStaffUser?: any;
}

export function ClinicalImagingModals({
	isGlobalVisiographOpen,
	setIsGlobalVisiographOpen,
	isGlobalImagingExportOpen,
	setIsGlobalImagingExportOpen,
	isCbctTunerOpen,
	setIsCbctTunerOpen,
	isCbctDirectModalOpen,
	setIsCbctDirectModalOpen,
	activeStaffUser,
}: ClinicalImagingModalsProps) {
	const selectedPatientId = usePatientStore((s) => s.selectedPatientId);
	const patientCoreDraft = usePatientStore((s) => s.patientCoreDraft);
	const activeToothNumber = useVisitStore((s) => s.activeToothNumber);
	const clinicName = useDocumentBrandingStore((s) => s.clinicName) || "Стоматологическая клиника";

	const effectivePatientName = patientCoreDraft?.fullName?.trim() || (selectedPatientId ? `Пациент #${selectedPatientId.slice(0, 8)}` : "");
	const effectiveCardNumber = (patientCoreDraft as any)?.cardNumber || (patientCoreDraft as any)?.medicalCardNumber || "";
	const effectiveToothFdi = activeToothNumber ? String(activeToothNumber) : undefined;

	return (
		<>
			{isGlobalVisiographOpen && (
				<VisiographComparisonModal
					isOpen={isGlobalVisiographOpen}
					onClose={() => setIsGlobalVisiographOpen(false)}
					patientName={effectivePatientName || undefined}
					patientCardNumber={effectiveCardNumber || undefined}
					activeToothFdi={effectiveToothFdi}
				/>
			)}

			{isGlobalImagingExportOpen && (
				<ImagingExportModal
					isOpen={isGlobalImagingExportOpen}
					onClose={() => setIsGlobalImagingExportOpen(false)}
					study={{
						id: effectiveToothFdi ? `study-rvg-${effectiveToothFdi}` : "study-rvg-current",
						title: effectiveToothFdi ? `Прицельный снимок визиографа (зуб ${effectiveToothFdi})` : "Прицельный снимок визиографа",
						capturedAt: new Date().toISOString(),
						date: new Date().toISOString(),
						kind: "rvg",
					} as any}
					patient={{
						fullName: effectivePatientName || "Пациент не выбран",
						medicalCardNumber: effectiveCardNumber,
					}}
					doctorName={activeStaffUser?.name || "Лечащий врач"}
					clinicName={clinicName}
				/>
			)}

			{isCbctTunerOpen && (
				<Suspense fallback={null}>
					<CbctTunerPlayground
						isOpen={true}
						onClose={() => {
							setIsCbctTunerOpen(false);
							const u = new URL(window.location.href);
							u.searchParams.delete("cbct");
							window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("cbct") ? "" : u.hash));
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
							const u = new URL(window.location.href);
							u.searchParams.delete("cbct");
							window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("cbct") ? "" : u.hash));
						}}
						patientName={effectivePatientName || undefined}
						patientId={selectedPatientId || undefined}
						autoLoadDemo={false}
					/>
				</Suspense>
			)}
		</>
	);
}
