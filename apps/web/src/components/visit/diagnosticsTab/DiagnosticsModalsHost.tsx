import React from "react";
import { EMPTY_DIARY } from "../../../lib/protocols/protocolTypes";
import {
	type ClinicalPhotoAttachment,
	generatePhotoProtocolAttachmentsStatement,
} from "../../../lib/clinicalProtocols";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { routeOpenCbctPopout } from "../../../utils/runtimeRouter";
import type { DiagnosticStudy } from "./types";

import { ClinicalPhotoProtocolModal } from "../../photography/ClinicalPhotoProtocolModal";
import { RadiologyReferralModal } from "../../radiology/RadiologyReferralModal";
import { DirectRvgCaptureModal } from "../../radiology/DirectRvgCaptureModal";
import { DicomViewerModal } from "../../imaging/DicomViewerModal";
import { HotFolderIntakeModal } from "../../radiology/HotFolderIntakeModal";
import { CephalometricAnalysisModal } from "../../radiology/CephalometricAnalysisModal";
import { RadiologyReportStudioModal } from "../../radiology/RadiologyReportStudioModal";
import { CtSelectorModal } from "../../radiology/CtSelectorModal";
import { IntraoralScan3DViewerModal } from "../../radiology/IntraoralScan3DViewerModal";
import { RadiologyConsultationSplit } from "../../radiology/RadiologyConsultationSplit";
import type { RadiologyFilmstripItem } from "../../radiology/filmstrip/filmstripTypes";

export interface DiagnosticsPatientContext {
	readonly id?: string | undefined;
	readonly fullName?: string | undefined;
	readonly name?: string | undefined;
	readonly cardNumber?: string | undefined;
	readonly medCardNumber?: string | undefined;
	readonly [key: string]: unknown;
}

export interface DiagnosticsDashboardContext {
	readonly activeDoctor?: { fullName?: string | undefined; [key: string]: unknown } | undefined;
	readonly clinicSettings?: { profile?: { brandName?: string | undefined; [key: string]: unknown } | undefined; [key: string]: unknown } | undefined;
	readonly activeVisit?: { id?: string | undefined; [key: string]: unknown } | null | undefined;
	readonly [key: string]: unknown;
}

export interface DiagnosticsVisitContext {
	readonly auth?: { currentUser?: { name?: string | undefined; [key: string]: unknown } | undefined; [key: string]: unknown } | undefined;
	readonly dashboard?: { activeVisit?: { id?: string | undefined; [key: string]: unknown } | null | undefined; [key: string]: unknown } | null | undefined;
	readonly appendToTranscript?: ((text: string) => void) | undefined;
	readonly [key: string]: unknown;
}

export interface DiagnosticsModalsHostProps {
	activePatient: DiagnosticsPatientContext | null | undefined;
	visitPatientId: string | null;
	visitPatientName: string | null;
	ctx?: DiagnosticsVisitContext | null | undefined;
	dashboard?: DiagnosticsDashboardContext | null | undefined;
	initialToothNumber: number;
	patientStudies: DiagnosticStudy[];
	photoAttachments: ClinicalPhotoAttachment[];
	setPhotoAttachments: React.Dispatch<React.SetStateAction<ClinicalPhotoAttachment[]>>;
	onInsertToProtocol?: ((text: string) => void) | undefined;

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
	selectedDicomImageSrc?: string | undefined;
	setSelectedDicomImageSrc: (src?: string) => void;
	selected3DScanModelUrl: string | null;
	setSelected3DScanModelUrl: (url: string | null) => void;
	selected3DScanTitle?: string | undefined;
	isHotFolderModalOpen: boolean;
	setIsHotFolderModalOpen: (open: boolean) => void;
	isComparisonModalOpen?: boolean | undefined;
	setIsComparisonModalOpen?: ((open: boolean) => void) | undefined;
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
	isComparisonModalOpen,
	setIsComparisonModalOpen,
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
					diary={undefined}
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
					visitId={dashboard?.activeVisit?.id || ctx?.dashboard?.activeVisit?.id || undefined}
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
							modalityLabel: s.kind === "cbct" ? "3D КЛКТ" : s.kind === "cephalometric" ? "ТРГ" : "Рентген RVG",
							dapDoseDgyCm2: (s.effectiveDoseMicrosv || 2) * 0.05,
							...(s.toothCode ? { toothFdi: s.toothCode } : {}),
							...(s.capturedAt ? { capturedAt: s.capturedAt } : {}),
						}))}
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
						(isDemoShowcaseMode()
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
						const sId =
							typeof study === "object" && study !== null && "id" in study
								? String((study as { id: unknown }).id)
								: undefined;
						if (launchMode === "crm_window" || launchMode === "standalone_window") {
							routeOpenCbctPopout({
								patientId: visitPatientId ?? activePatient?.id,
								patientName: visitPatientName ?? activePatient?.fullName,
								studyId: sId,
								mode: "mpr",
							});
						}
					}}
					onOpenCbctStudio={(study) => {
						setIsCtSelectorModalOpen(false);
						const sId =
							typeof study === "object" && study !== null && "id" in study
								? String((study as { id: unknown }).id)
								: undefined;
						routeOpenCbctPopout({
							patientId: visitPatientId ?? activePatient?.id,
							patientName: visitPatientName ?? activePatient?.fullName,
							studyId: sId,
							mode: "mpr",
						});
					}}
					onImagesLoaded={(_imageIds, studyMeta) => {
						setIsCtSelectorModalOpen(false);
						const mId =
							typeof studyMeta === "object" && studyMeta !== null && "id" in studyMeta
								? String((studyMeta as { id: unknown }).id)
								: undefined;
						routeOpenCbctPopout({
							patientId: visitPatientId ?? activePatient?.id,
							patientName: visitPatientName ?? activePatient?.fullName,
							studyId: mId,
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

			{/* Visiograph Dual-View Comparison Modal (EzDent-i Pre/Post Op) */}
			{isComparisonModalOpen && (
				<RadiologyConsultationSplit
					isOpen={Boolean(isComparisonModalOpen)}
					asModal={true}
					onClose={() => setIsComparisonModalOpen?.(false)}
					patientName={visitPatientName ?? activePatient?.fullName ?? activePatient?.name}
					patientCardNumber={activePatient?.cardNumber ?? activePatient?.medCardNumber}
					activeToothFdi={initialToothNumber}
					currentStudy={
						patientStudies[0]
							? {
									id: patientStudies[0].id,
									title: patientStudies[0].title,
									modality: patientStudies[0].modality || patientStudies[0].kind || "intraoral_rvg",
									modalityLabel:
										patientStudies[0].kind === "cbct"
											? "3D КЛКТ"
											: patientStudies[0].kind === "cephalometric"
												? "ТРГ"
												: "Рентген RVG",
									studyDate: patientStudies[0].capturedAt || new Date().toISOString(),
									teethFdi: patientStudies[0].toothCode ? [String(patientStudies[0].toothCode)] : undefined,
									imageUrl: patientStudies[0].previewUrl || patientStudies[0].viewerUrl,
									thumbnailUrl: patientStudies[0].previewUrl || patientStudies[0].viewerUrl,
									effectiveDoseMicrosv: patientStudies[0].effectiveDoseMicrosv,
								}
							: undefined
					}
					historyStudies={patientStudies.map((s) => ({
						id: s.id,
						title: s.title,
						modality: s.modality || s.kind || "intraoral_rvg",
						modalityLabel:
							s.kind === "cbct"
								? "3D КЛКТ"
								: s.kind === "cephalometric"
									? "ТРГ"
									: "Рентген RVG",
						studyDate: s.capturedAt || new Date().toISOString(),
						teethFdi: s.toothCode ? [String(s.toothCode)] : undefined,
						imageUrl: s.previewUrl || s.viewerUrl,
						thumbnailUrl: s.previewUrl || s.viewerUrl,
						effectiveDoseMicrosv: s.effectiveDoseMicrosv,
					}))}
					onInsertProtocol={onInsertToProtocol}
				/>
			)}
		</React.Suspense>
	);
}
