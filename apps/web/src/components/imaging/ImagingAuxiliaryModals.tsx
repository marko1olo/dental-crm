import React, { Suspense } from "react";
import { lazyWithRetry } from "../../lib/lazyWithRetry";
import { RadiologyModule } from "../radiology/RadiologyModule.js";
import { ImagingExportModal } from "./ImagingExportModal";
import { VisiographComparisonModal } from "../visiograph/VisiographComparisonModal";

const PanoramicRendererWindow = lazyWithRetry(() =>
	import("../dicom/PanoramicRendererWindow").then((m) => ({
		default: m.PanoramicRendererWindow,
	})),
);

export interface ImagingAuxiliaryModalsProps {
	isPanoramicWindowOpen: boolean;
	setIsPanoramicWindowOpen: (open: boolean) => void;
	isRadiologyModuleOpen: boolean;
	setIsRadiologyModuleOpen: (open: boolean) => void;
	isExportModalOpen: boolean;
	setIsExportModalOpen: (open: boolean) => void;
	isComparisonOpen?: boolean;
	setIsComparisonOpen?: (open: boolean) => void;
	activeImagingStudies?: any[];
	selectedImagingStudy?: any;
	activePatient?: any;
	activeAppointment?: any;
	authClinicName?: string | undefined;
	effectivePreviewUrl?: string | null | undefined;
	selectedStudySummary?: string | null | undefined;
}

function createDemoPanoramicVolume(): any {
	const width = 128;
	const height = 128;
	const depth = 64;
	const scalarData = new Float32Array(width * height * depth);
	scalarData.fill(-1000);

	const cx = Math.floor(width / 2);
	const cy = Math.floor(height / 2);
	const rx = Math.floor(width * 0.35);
	const ry = Math.floor(height * 0.28);

	for (let z = 0; z < depth; z++) {
		const zSlice = z * width * height;
		const zFactor = 1 - Math.abs(z - depth / 2) / (depth / 2);

		for (let x = 10; x < width - 10; x++) {
			const normX = (x - cx) / rx;
			if (Math.abs(normX) > 1) continue;
			const archY = Math.round(cy - ry * (1 - normX * normX * 0.8));

			for (let y = Math.max(0, archY - 6); y <= Math.min(height - 1, archY + 6); y++) {
				const idx = zSlice + y * width + x;
				const distFromArch = Math.abs(y - archY);
				if (distFromArch <= 2) {
					scalarData[idx] = z > depth * 0.6 ? 2200 : 750 + Math.round(zFactor * 200);
				} else if (distFromArch <= 5) {
					scalarData[idx] = 1400;
				} else {
					scalarData[idx] = 400;
				}
			}
		}
	}

	const identityDirection = new Float32Array([
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1,
	]);

	return {
		scalarData,
		dimensions: [width, height, depth],
		origin: [0, 0, 0],
		direction: identityDirection,
		spacing: [0.3, 0.3, 0.3],
	};
}

function getActivePanoramicVolume(): any {
	if (typeof window !== "undefined") {
		const win = window as unknown as {
			__cbctActiveVolume?: any;
			__cbctDemoVolume?: any;
			__panoramicVolume?: any;
		};
		if (win.__panoramicVolume) return win.__panoramicVolume;
		const activeVol = win.__cbctActiveVolume || win.__cbctDemoVolume;
		if (activeVol && activeVol.data) {
			const { width, height, depth } = activeVol.dimensions;
			const scalarData = new Float32Array(activeVol.data.length);
			for (let i = 0; i < activeVol.data.length; i++) {
				scalarData[i] = activeVol.data[i];
			}
			const identityDirection = new Float32Array([
				1, 0, 0, 0,
				0, 1, 0, 0,
				0, 0, 1, 0,
				0, 0, 0, 1,
			]);
			return {
				scalarData,
				dimensions: [width, height, depth],
				origin: [activeVol.originMm?.x ?? 0, activeVol.originMm?.y ?? 0, activeVol.originMm?.z ?? 0],
				direction: identityDirection,
				spacing: [activeVol.spacingMm?.x ?? 0.25, activeVol.spacingMm?.y ?? 0.25, activeVol.spacingMm?.z ?? 0.25],
			};
		}
	}
	return createDemoPanoramicVolume();
}

export function ImagingAuxiliaryModals({
	isPanoramicWindowOpen,
	setIsPanoramicWindowOpen,
	isRadiologyModuleOpen,
	setIsRadiologyModuleOpen,
	isExportModalOpen,
	setIsExportModalOpen,
	isComparisonOpen,
	setIsComparisonOpen,
	activeImagingStudies,
	selectedImagingStudy,
	activePatient,
	activeAppointment,
	authClinicName,
	effectivePreviewUrl,
	selectedStudySummary,
}: ImagingAuxiliaryModalsProps) {
	return (
		<>
			{isPanoramicWindowOpen && (
				<Suspense
					fallback={
						<div className="panoramic-recon-window-modal fixed inset-0 z-[100060] flex items-center justify-center bg-black/80">
							<div className="w-8 h-8 border-4 border-[var(--teal)] border-t-transparent rounded-full animate-spin" />
						</div>
					}
				>
					<PanoramicRendererWindow
						splinePoints={[]}
						volume={getActivePanoramicVolume()}
						patientId={activePatient?.id}
						onClose={() => setIsPanoramicWindowOpen(false)}
					/>
				</Suspense>
			)}

			{isRadiologyModuleOpen && (
				<div
					className="radiology-module-modal fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4"
					onClick={() => setIsRadiologyModuleOpen(false)}
				>
					<div
						className="w-full max-w-7xl h-[92vh] overflow-hidden rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col"
						onClick={(e) => e.stopPropagation()}
					>
						<RadiologyModule
							patient={
								activePatient
									? {
											id: activePatient.id,
											fullName: activePatient.fullName || activePatient.name,
											birthDate: activePatient.birthDate,
											phone: activePatient.phone,
											cardNumber: activePatient.cardNumber,
											medicalCardNumber: activePatient.medicalCardNumber,
										}
									: null
							}
							doctorName={activeAppointment?.doctorName}
							clinicName={authClinicName || "ООО «ДЕНТЕ»"}
							onClose={() => setIsRadiologyModuleOpen(false)}
						/>
					</div>
				</div>
			)}

			<ImagingExportModal
				isOpen={isExportModalOpen}
				onClose={() => setIsExportModalOpen(false)}
				study={selectedImagingStudy}
				patient={activePatient}
				doctorName={activeAppointment?.doctorName}
				clinicName={authClinicName}
				previewUrl={effectivePreviewUrl}
				reportSummary={selectedStudySummary ?? null}
			/>

			<VisiographComparisonModal
				isOpen={Boolean(isComparisonOpen)}
				onClose={() => setIsComparisonOpen?.(false)}
				patientName={activePatient?.fullName || activePatient?.name}
				patientCardNumber={activePatient?.cardNumber || activePatient?.medicalCardNumber}
				currentStudy={selectedImagingStudy}
				historyStudies={activeImagingStudies}
			/>
		</>
	);
}
