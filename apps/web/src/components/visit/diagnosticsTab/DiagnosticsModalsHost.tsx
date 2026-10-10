import React from "react";
import { EMPTY_DIARY } from "../../useVisitDiaryLogic";
import {
	type ClinicalPhotoAttachment,
	generatePhotoProtocolAttachmentsStatement,
} from "../../../lib/clinicalProtocols043";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { routeOpenCbctPopout } from "../../../utils/runtimeRouter";
import type { DiagnosticStudy } from "./types";

const ClinicalPhotoProtocolModal = React.lazy(() =>
	import("../../photography/ClinicalPhotoProtocolModal").then((m) => ({
		default: m.ClinicalPhotoProtocolModal,
	})),
);
const RadiologyReferralModal = React.lazy(() =>
	import("../../radiology/RadiologyReferralModal").then((m) => ({
		default: m.RadiologyReferralModal,
	})),
);
const DirectRvgCaptureModal = React.lazy(() =>
	import("../../radiology/DirectRvgCaptureModal").then((m) => ({
		default: m.DirectRvgCaptureModal,
	})),
);
const DicomViewerModal = React.lazy(() =>
	import("../../imaging/DicomViewerModal").then((m) => ({
		default: m.DicomViewerModal,
	})),
);
const HotFolderIntakeModal = React.lazy(() =>
	import("../../radiology/HotFolderIntakeModal").then((m) => ({
		default: m.HotFolderIntakeModal,
	})),
);
const CephalometricAnalysisModal = React.lazy(() =>
	import("../../radiology/CephalometricAnalysisModal").then((m) => ({
		default: m.CephalometricAnalysisModal,
	})),
);
const RadiologyReportStudioModal = React.lazy(() =>
	import("../../radiology/RadiologyReportStudioModal").then((m) => ({
		default: m.RadiologyReportStudioModal,
	})),
);
const CtSelectorModal = React.lazy(() =>
	import("../../radiology/CtSelectorModal").then((m) => ({
		default: m.CtSelectorModal,
	})),
);
const IntraoralScan3DViewerModal = React.lazy(() =>
	import("../../radiology/IntraoralScan3DViewerModal").then((m) => ({
		default: m.IntraoralScan3DViewerModal,
	})),
);

export interface DiagnosticsModalsHostProps {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	activePatient: any;
	visitPatientId: string | null;
	visitPatientName: string | null;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	ctx: any;
	dashboard: any;
	initialToothNumber: number;
	patientStudies: DiagnosticStudy[];
	photoAttachments: ClinicalPhotoAttachment[];
	setPhotoAttachments: React.Dispatch<React.SetStateAction<ClinicalPhotoAttachment[]>>;
	onInsertToProtocol?: (text: string) => void;

	// Modal states & setters
	isCephModalOpen: boolean;
	setIsCephModalOpen: (open: boolean) => void;
	isRadiologyModalOpen: boolean;
	setIsRadiologyModalOpen: (open: boolean) => void;
	isReportStudioModalOpen: boolean;
	setIsReportStudioModalOpen: (open: boolean) => void;
	isPhotoProtocolModalOpen: boolean;
	setIsPhotoProtocolModalOpen: (open: boolean) => void;
	isCtSelectorModalOpen: boolean;
	setIsCtSelectorModalOpen: (open: boolean) => void;
	isDirectRvgModalOpen: boolean;
	setIsDirectRvgModalOpen: (open: boolean) => void;
	isDicomViewerModalOpen: boolean;
	setIsDicomViewerModalOpen: (open: boolean) => void;
	selectedDicomImageSrc?: string;
	setSelectedDicomImageSrc: (src?: string) => void;
	selected3DScanModelUrl: string | null;
	setSelected3DScanModelUrl: (url: string | null) => void;
	selected3DScanTitle?: string;
	isHotFolderModalOpen: boolean;
	setIsHotFolderModalOpen: (open: boolean) => void;
}

export function DiagnosticsModalsHost({
	activePatient,
	visitPatientId,
	visitPatientName,
	ctx,
	dashboard,
	initialToothNumber,
	patientStudies,
	photoAttachments,
	setPhotoAttachments,
	onInsertToProtocol,
	isCephModalOpen,
	setIsCephModalOpen,
	isRadiologyModalOpen,
	setIsRadiologyModalOpen,
	isReportStudioModalOpen,
	setIsReportStudioModalOpen,
	isPhotoProtocolModalOpen,
	setIsPhotoProtocolModalOpen,
	isCtSelectorModalOpen,
	setIsCtSelectorModalOpen,
	isDirectRvgModalOpen,
	setIsDirectRvgModalOpen,
	isDicomViewerModalOpen,
	setIsDicomViewerModalOpen,
	selectedDicomImageSrc,
	setSelectedDicomImageSrc,
	selected3DScanModelUrl,
	setSelected3DScanModelUrl,
	selected3DScanTitle,
	isHotFolderModalOpen,
	setIsHotFolderModalOpen,
}: DiagnosticsModalsHostProps) {
	return (
		<React.Suspense fallback={null}>
			{/* Orthodontic Cephalometric Modal */}
			<CephalometricAnalysisModal
				isOpen={isCephModalOpen}
				onClose={() => setIsCephModalOpen(false)}
				patientId={visitPatientId ?? activePatient?.id}
				patientName={visitPatientName ?? activePatient?.fullName}
				onInsertToProtocol={(text) => {
					if (onInsertToProtocol) {
						onInsertToProtocol(text);
					} else if (typeof ctx?.appendToTranscript === "function") {
						ctx.appendToTranscript(`\n\n${text}`);
					}
				}}
			/>

			{/* Dental Radiology Referral Printable Modal */}
			{isRadiologyModalOpen && (
				<RadiologyReferralModal
					isOpen={isRadiologyModalOpen}
					onClose={() => setIsRadiologyModalOpen(false)}
					patient={activePatient}
					diary={EMPTY_DIARY}
					doctorName={ctx?.auth?.currentUser?.name || "Лечащий врач стоматолог"}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
				/>
			)}

			{/* Clinical 12/8/6/3-Slot Photo Protocol Studio Modal */}
			{isPhotoProtocolModalOpen && (
				<ClinicalPhotoProtocolModal
					isOpen={isPhotoProtocolModalOpen}
					onClose={() => setIsPhotoProtocolModalOpen(false)}
					patientId={visitPatientId ?? activePatient?.id}
					patientName={visitPatientName ?? activePatient?.fullName}
					doctorName={ctx?.auth?.currentUser?.name || "Лечащий врач стоматолог"}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
					onSaveProtocol={(slots) => {
						const newAttachments: ClinicalPhotoAttachment[] = Object.entries(slots)
							.filter(([_, rec]) => typeof rec.imageUrl === "string" && rec.imageUrl.length > 0)
							.map(([slotId, rec]) => ({
								id: `photo-slot-${slotId}-${Date.now()}`,
								photoType: rec.stage === "after" ? "after" : "before",
								photoUrl: rec.imageUrl || "",
								description: `Слот: ${slotId}`,
								capturedAtIso: rec.uploadedAt ?? new Date().toISOString(),
							}));
						if (newAttachments.length > 0) {
							const updated = [...photoAttachments, ...newAttachments];
							setPhotoAttachments(updated);
							const statement = generatePhotoProtocolAttachmentsStatement(updated);
							if (onInsertToProtocol) {
								onInsertToProtocol(statement);
							} else {
								try {
									window.dispatchEvent(
										new CustomEvent("dente-apply-soap-protocol", {
											detail: {
												soap: {
													treatmentDescription: statement,
												},
												mode: "smart_append",
											},
										}),
									);
								} catch {
									// ignore
								}
							}
						}
						setIsPhotoProtocolModalOpen(false);
					}}
				/>
			)}

			{/* Radiology Report Studio Modal */}
			{isReportStudioModalOpen && (
				<RadiologyReportStudioModal
					isOpen={isReportStudioModalOpen}
					onClose={() => setIsReportStudioModalOpen(false)}
					patientName={visitPatientName ?? activePatient?.fullName}
					patientCardNumber={activePatient?.cardNumber || activePatient?.medCardNumber}
					doctorName={dashboard?.activeDoctor?.fullName || ctx?.auth?.currentUser?.name}
					clinicName={dashboard?.clinicSettings?.profile?.brandName || "Клиника ДЕНТЕ"}
					initialImages={patientStudies
						.filter((s) => s.previewUrl || s.viewerUrl)
						.map((s) => ({
							imageUrl: (s.previewUrl || s.viewerUrl)!,
							toothFdi: s.toothCode || undefined,
							modalityLabel: s.kind === "cbct" ? "3D КЛКТ" : s.kind === "cephalometric" ? "ТРГ" : "Рентген RVG",
							dapDoseDgyCm2: (s.effectiveDoseMicrosv || 2) * 0.05,
							capturedAt: s.capturedAt,
						} as any))}
				/>
			)}

			{/* Direct Visiograph (RVG) Sensor Capture Modal */}
			{isDirectRvgModalOpen && (
				<DirectRvgCaptureModal
					isOpen={isDirectRvgModalOpen}
					onClose={() => {
						setIsDirectRvgModalOpen(false);
						setSelectedDicomImageSrc(undefined);
					}}
					patientId={visitPatientId ?? activePatient?.id}
					patientName={visitPatientName ?? activePatient?.fullName}
					patientCardNumber={activePatient?.cardNumber || activePatient?.medCardNumber}
					doctorName={dashboard?.activeDoctor?.fullName || "Врач-стоматолог"}
					initialToothFdi={initialToothNumber ? String(initialToothNumber) : undefined}
					initialImageUrl={selectedDicomImageSrc}
					onSaveToEmr={(study) => {
						const toothStr = study.teethFdi?.[0] || (initialToothNumber ? String(initialToothNumber) : "—");
						const logText = `[Визиограф RVG] Снимок зуба #${toothStr}: доза ${study.effectiveDoseMicrosv || 0} мкЗв. Сохранен в ЭМК.`;
						if (onInsertToProtocol) {
							onInsertToProtocol(logText);
						} else if (typeof ctx?.appendToTranscript === "function") {
							ctx.appendToTranscript(`\n\n${logText}`);
						}
					}}
				/>
			)}

			{/* DICOM / CT Series Examination Modal */}
			{isDicomViewerModalOpen && (
				<DicomViewerModal
					isOpen={isDicomViewerModalOpen}
					onClose={() => {
						setIsDicomViewerModalOpen(false);
						setSelectedDicomImageSrc(undefined);
					}}
					imageSrc={
						selectedDicomImageSrc ??
						(isDemoShowcaseMode() || isDemoPatientId(visitPatientId ?? activePatient?.id)
							? (initialToothNumber === 16
								? "/radiology/sample_rvg_tooth16.jpg"
								: "/radiology/sample_rvg_tooth36_periapical.jpg")
							: undefined)
					}
					patientName={visitPatientName ?? activePatient?.fullName}
					patientId={visitPatientId ?? activePatient?.id}
					toothFdiCode={initialToothNumber ? String(initialToothNumber) : "36"}
					onConnectRvg={() => {
						setIsDicomViewerModalOpen(false);
						setIsDirectRvgModalOpen(true);
					}}
					onReferToRadiology={() => {
						setIsDicomViewerModalOpen(false);
						setIsRadiologyModalOpen(true);
					}}
					onInsertToProtocol={(text) => {
						if (onInsertToProtocol) {
							onInsertToProtocol(text);
						} else if (typeof ctx?.appendToTranscript === "function") {
							ctx.appendToTranscript(`\n\n${text}`);
						}
					}}
				/>
			)}

			{/* Hot Folder Radiology Auto-Intake Modal */}
			{isHotFolderModalOpen && (
				<HotFolderIntakeModal
					isOpen={isHotFolderModalOpen}
					onClose={() => setIsHotFolderModalOpen(false)}
					patientId={visitPatientId ?? activePatient?.id}
					patientName={visitPatientName ?? activePatient?.fullName}
					patientCardNumber={activePatient?.cardNumber || activePatient?.medCardNumber}
					doctorName={dashboard?.activeDoctor?.fullName || "Врач-стоматолог"}
					onAttachToEmr={({ study, teethFdi, protocolNote, doseMicrosv }) => {
						const logText = `[Автоимпорт] Импортирован снимок ${study.modalityLabel || "Рентген"}: ${teethFdi.join(", ") || "б/о"}, доза ${doseMicrosv} мкЗв. ${protocolNote}`;
						if (onInsertToProtocol) {
							onInsertToProtocol(logText);
						} else if (typeof ctx?.appendToTranscript === "function") {
							ctx.appendToTranscript(`\n\n${logText}`);
						}
					}}
				/>
			)}

			{/* Clinical CT Selector Modal */}
			{isCtSelectorModalOpen && (
				<CtSelectorModal
					isOpen={isCtSelectorModalOpen}
					onClose={() => setIsCtSelectorModalOpen(false)}
					patientId={visitPatientId ?? activePatient?.id}
					patientName={visitPatientName ?? activePatient?.fullName}
					cardNumber={activePatient?.cardNumber || activePatient?.medCardNumber}
					studies={patientStudies}
					onSelectStudy={(study, launchMode) => {
						setIsCtSelectorModalOpen(false);
						if (launchMode === "crm_window" || launchMode === "standalone_window") {
							routeOpenCbctPopout({
								patientId: visitPatientId ?? activePatient?.id,
								patientName: visitPatientName ?? activePatient?.fullName,
								studyId: study?.id,
								mode: "mpr",
							});
						}
					}}
					onOpenCbctStudio={(study) => {
						setIsCtSelectorModalOpen(false);
						routeOpenCbctPopout({
							patientId: visitPatientId ?? activePatient?.id,
							patientName: visitPatientName ?? activePatient?.fullName,
							studyId: study?.id,
							mode: "mpr",
						});
					}}
					onImagesLoaded={(_imageIds, studyMeta) => {
						setIsCtSelectorModalOpen(false);
						routeOpenCbctPopout({
							patientId: visitPatientId ?? activePatient?.id,
							patientName: visitPatientName ?? activePatient?.fullName,
							studyId: studyMeta?.id,
							mode: "mpr",
						});
					}}
				/>
			)}

			{/* 3D Intraoral Scan Viewer Modal */}
			{selected3DScanModelUrl && (
				<IntraoralScan3DViewerModal
					isOpen={Boolean(selected3DScanModelUrl)}
					onClose={() => setSelected3DScanModelUrl(null)}
					modelUrl={selected3DScanModelUrl}
					patientName={visitPatientName ?? activePatient?.fullName}
					scanTitle={selected3DScanTitle || "Интраоральный 3D-скан (STL/PLY)"}
				/>
			)}
		</React.Suspense>
	);
}
