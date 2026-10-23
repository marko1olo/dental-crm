/**
 * ClinicalImagingModals — Модалки визиографа, экспорта снимков и КЛКТ (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { lazyWithRetry } from "../../../lib/lazyWithRetry";
import { VisiographComparisonModal } from "../../visiograph/VisiographComparisonModal";
import { ImagingExportModal } from "../../imaging/ImagingExportModal";

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
					patient={{ fullName: "Чухрова Лариса Павловна", medicalCardNumber: "20190621_101042" }}
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
						patientName="Захаров Иван Дмитриевич (Демо 3D КЛКТ 312 срезов)"
						patientId="demo_cbct_patient"
						autoLoadDemo={true}
					/>
				</Suspense>
			)}
		</>
	);
}
